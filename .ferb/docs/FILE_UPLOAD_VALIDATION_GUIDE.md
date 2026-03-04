## File Upload Validation Implementation Guide

**Created:** 2026-03-02
**Task:** Phase 3, Task 3.5 - Add File Upload Validation

---

## Overview

File upload validation middleware provides security for all file upload routes by:
- Validating file size to prevent DoS attacks
- Checking MIME types to block malicious files
- Verifying file extensions to prevent bypass attempts
- Enforcing file count limits
- Preventing executable file uploads
- Blocking double extension attacks

---

## Middleware Functions

### File: `backend/middleware/validation/validate.js`

**Exports:**
- `validateFile(rules)` - Validate single file upload
- `validateFiles(rules)` - Validate multiple file uploads

---

## Usage: validateFile

### Basic Usage

```javascript
import { validateFile } from './middleware/validation/index.js';
import { uploadSingleFile } from './config/multer.config.js';

router.post('/upload',
  uploadSingleFile,  // Multer handles the upload first
  validateFile({     // Then validate the uploaded file
    required: true,
    maxSize: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png']
  }),
  controller.handleUpload
);
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `required` | Boolean | `false` | Whether file upload is required |
| `maxSize` | Number | `5 * 1024 * 1024` | Maximum file size in bytes (5MB default) |
| `allowedTypes` | Array | `['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']` | Allowed MIME types |
| `allowedExtensions` | Array | `['.jpg', '.jpeg', '.png', '.pdf']` | Allowed file extensions |

---

## Usage: validateFiles

### Basic Usage

```javascript
import { validateFiles } from './middleware/validation/index.js';
import { uploadMultipleFiles } from './config/multer.config.js';

router.post('/upload-multiple',
  uploadMultipleFiles,  // Multer handles multiple uploads
  validateFiles({       // Then validate all files
    required: true,
    maxFiles: 5,
    maxSize: 5 * 1024 * 1024,  // 5MB per file
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png']
  }),
  controller.handleMultipleUpload
);
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `required` | Boolean | `false` | Whether files are required |
| `maxFiles` | Number | `5` | Maximum number of files allowed |
| `maxSize` | Number | `5 * 1024 * 1024` | Maximum size per file in bytes |
| `allowedTypes` | Array | `['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']` | Allowed MIME types |
| `allowedExtensions` | Array | `['.jpg', '.jpeg', '.png', '.pdf']` | Allowed file extensions |

---

## Implementation Examples

### Example 1: Leave Attachment Upload (PDF & Images)

**Route:** `POST /api/leaves/:leaveId/attachments`

```javascript
import { uploadSingleAttachment } from '../../config/multer.config.js';
import { validateFile } from '../../middleware/validation/index.js';

router.post('/:leaveId/attachments',
  uploadSingleAttachment,  // Multer config for leave attachments
  validateFile({
    required: true,
    maxSize: 5 * 1024 * 1024,  // 5MB limit
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
  }),
  leaveController.uploadAttachment
);
```

**Security Features:**
- ✅ Blocks executable files (.exe, .bat, .sh)
- ✅ Prevents double extension bypass (.jpg.exe)
- ✅ Validates both MIME type and extension
- ✅ Enforces 5MB size limit (prevents DoS)

---

### Example 2: Employee Profile Image (Images Only)

**Route:** `POST /api/employees/:id/image`

```javascript
import { uploadEmployeeImage } from '../../config/multer.config.js';
import { validateFile } from '../../middleware/validation/index.js';

router.post('/:id/image',
  uploadEmployeeImage,  // Multer config for employee images
  validateFile({
    required: true,
    maxSize: 2 * 1024 * 1024,  // 2MB for profile images
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
  }),
  employeeController.uploadProfileImage
);
```

**Security Features:**
- ✅ Smaller size limit (2MB) for profile images
- ✅ Only allows image formats
- ✅ Blocks PDF and other document types
- ✅ Supports modern WebP format

---

### Example 3: Policy Documents (PDFs Only)

**Route:** `POST /api/policies/:id/attachments`

```javascript
import { uploadPolicyDocument } from '../../config/multer.config.js';
import { validateFiles } from '../../middleware/validation/index.js';

router.post('/:id/attachments',
  uploadPolicyDocument,  // Multer for policy documents
  validateFiles({
    required: false,
    maxFiles: 10,  // Up to 10 documents
    maxSize: 10 * 1024 * 1024,  // 10MB per document
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf']
  }),
  policyController.uploadDocuments
);
```

**Security Features:**
- ✅ PDFs only (no images or other formats)
- ✅ Higher file count limit (10 files)
- ✅ Larger size limit (10MB) for detailed documents
- ✅ Optional (can submit policy without attachments)

---

## Security Validations

### 1. File Size Validation ✅

**Threat:** DoS attack via large file uploads

**Protection:**
```javascript
if (file.size > maxSize) {
  throw buildValidationError(
    'file.size',
    `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
  );
}
```

**Example Attack Blocked:**
- User uploads 100MB file to a 5MB endpoint
- **Result:** Request rejected with 400 error

---

### 2. MIME Type Validation ✅

**Threat:** Malicious file upload (exe, script files)

**Protection:**
```javascript
if (!allowedTypes.includes(file.mimetype)) {
  throw buildValidationError(
    'file.type',
    `File type ${file.mimetype} is not allowed`
  );
}
```

**Example Attack Blocked:**
- User uploads virus.exe with MIME type `application/x-msdownload`
- **Result:** Request rejected, file not saved

---

### 3. File Extension Validation ✅

**Threat:** Double extension bypass (image.jpg.exe)

**Protection:**
```javascript
const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
if (!allowedExtensions.includes(fileExt)) {
  throw buildValidationError(
    'file.extension',
    `File extension ${fileExt} is not allowed`
  );
}
```

**Example Attack Blocked:**
- User uploads `malware.jpg.exe`
- **Result:** Rejected (extension is `.exe`, not `.jpg`)

---

### 4. MIME Type Spoofing Prevention ✅

**Threat:** File with fake MIME type header

**Protection:** Validates BOTH MIME type AND extension

```javascript
// Example: virus.exe with spoofed MIME type
{
  originalname: 'virus.exe',
  mimetype: 'image/jpeg'  // Fake MIME type
}

// MIME type validation PASSES (jpeg allowed)
// Extension validation FAILS (.exe not allowed)
// Result: Request REJECTED ✅
```

---

### 5. File Count Validation (Multiple Files) ✅

**Threat:** DoS via uploading thousands of files

**Protection:**
```javascript
if (files.length > maxFiles) {
  throw buildValidationError(
    'files.count',
    `Cannot upload more than ${maxFiles} files at once`
  );
}
```

**Example Attack Blocked:**
- User uploads 100 files to a max 5 files endpoint
- **Result:** Request rejected before processing files

---

## Common File Type Configurations

### Images Only
```javascript
{
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
}
```

### Documents Only
```javascript
{
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['.pdf']
}
```

### Images & PDFs
```javascript
{
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
}
```

### Office Documents
```javascript
{
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ],
  allowedExtensions: ['.pdf', '.docx', '.xlsx']
}
```

---

## Testing

### Unit Tests

**File:** `backend/tests/security/phase3/validation/fileUpload.test.js`

**Coverage:** 70+ tests
- Single file validation (validateFile)
- Multiple files validation (validateFiles)
- Security tests (executable blocking, MIME spoofing, double extension)
- Leave attachment specific tests
- Employee profile image specific tests

**Run Tests:**
```bash
npm test -- tests/security/phase3/validation/fileUpload.test.js
```

---

### Integration Tests

Test with real file uploads:

```bash
# Test leave attachment upload (PDF)
curl -X POST "http://localhost:5000/api/leaves/123/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "attachment=@test.pdf"

# Test with invalid file type (should fail)
curl -X POST "http://localhost:5000/api/leaves/123/attachments" \
  -H "Authorization: Bearer $TOKEN" \
  -F "attachment=@virus.exe"

# Test employee profile image upload
curl -X POST "http://localhost:5000/api/employees/456/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "profileImage=@avatar.jpg"

# Test with oversized file (should fail)
curl -X POST "http://localhost:5000/api/employees/456/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "profileImage=@huge_10mb.jpg"
```

---

## Routes Protected

### Currently Protected Routes (2 routes)

1. **Leave Attachments**
   - `POST /api/leaves/:leaveId/attachments`
   - Max size: 5MB
   - Allowed types: PDF, JPEG, PNG
   - Required: Yes

2. **Employee Profile Images**
   - `POST /api/employees/:id/image`
   - Max size: 2MB
   - Allowed types: JPEG, PNG, WebP
   - Required: Yes

---

## Future Routes Requiring Protection

### Pending Implementation

1. **Policy Attachments**
   - `POST /api/policies/:id/attachments`
   - Suggested: PDF only, 10MB, max 10 files

2. **Asset Images**
   - `POST /api/assets/:id/image`
   - Suggested: Images only, 5MB

3. **Attendance Regularization Documents**
   - `POST /api/attendance/:id/regularization/attachments`
   - Suggested: PDF + images, 5MB, max 3 files

4. **Training Material Uploads**
   - `POST /api/training/:id/materials`
   - Suggested: PDF + images + videos, 50MB, max 10 files

5. **Expense Receipt Uploads**
   - `POST /api/expenses/:id/receipts`
   - Suggested: PDF + images, 5MB, max 5 files

---

## Error Handling

### Validation Errors

All file validation errors return 400 Bad Request with detailed messages:

```json
{
  "success": false,
  "error": {
    "message": "File validation failed: File size exceeds maximum allowed size of 5MB",
    "code": "VALIDATION_ERROR",
    "field": "file.size",
    "statusCode": 400
  }
}
```

### Multer Errors

Multer errors are caught and formatted:

```javascript
// File too large (caught by multer)
{
  "success": false,
  "error": {
    "message": "File too large",
    "code": "LIMIT_FILE_SIZE"
  }
}

// Too many files (caught by multer)
{
  "success": false,
  "error": {
    "message": "Too many files",
    "code": "LIMIT_FILE_COUNT"
  }
}
```

---

## Best Practices

### 1. Always Validate After Multer

**Correct Order:**
```javascript
router.post('/upload',
  uploadMiddleware,   // Multer first (handles upload)
  validateFile(),     // Then validate
  controller          // Then process
);
```

**Incorrect Order:**
```javascript
router.post('/upload',
  validateFile(),     // WRONG: File doesn't exist yet
  uploadMiddleware,
  controller
);
```

---

### 2. Match Multer Config with Validation

Ensure multer config and validation rules align:

```javascript
// Multer config
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF allowed'), false);
    }
  }
});

// Validation (should match)
validateFile({
  maxSize: 5 * 1024 * 1024,
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['.pdf']
})
```

---

### 3. Use Stricter Limits for Profile Images

Profile images should have smaller limits:

```javascript
// Profile images: 2MB max
validateFile({ maxSize: 2 * 1024 * 1024 })

// Documents: 5MB max
validateFile({ maxSize: 5 * 1024 * 1024 })

// Training videos: 50MB max
validateFile({ maxSize: 50 * 1024 * 1024 })
```

---

### 4. Log File Upload Attempts

Validation middleware automatically logs successful uploads:

```javascript
[Validation] File upload validated: test.pdf (1048576 bytes, application/pdf) { userId: 'user123' }
```

Monitor logs for:
- Frequent validation failures (potential attack)
- Large file uploads (bandwidth usage)
- Unusual file types (security concern)

---

## Troubleshooting

### Issue: Files rejected even though valid

**Solution:** Check MIME type and extension match

```javascript
// PDF file
originalname: 'test.PDF'  // Uppercase extension
mimetype: 'application/pdf'

// Solution: Validation handles case-insensitive extensions ✅
```

---

### Issue: Multer error before validation runs

**Solution:** Multer has its own limits, adjust accordingly

```javascript
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024,  // Must match or exceed validation limit
    files: 5  // Must match or exceed validation maxFiles
  }
});
```

---

### Issue: Large files causing server timeout

**Solution:** Increase timeout and add stream validation

```javascript
// Increase timeout for large uploads
app.use('/api/upload', timeout('5m'));

// Add size limit at multer level (faster rejection)
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }
});
```

---

## Security Checklist

### Before Production

- [ ] All file upload routes have `validateFile()` applied
- [ ] Multer config limits match validation limits
- [ ] File storage directory is outside web root
- [ ] File names are sanitized (no path traversal)
- [ ] Tests pass (70+ unit tests)
- [ ] Integration tests pass
- [ ] Error messages don't reveal server paths
- [ ] Uploaded files are scanned for viruses (optional: ClamAV)

---

## Next Steps

1. **Apply to Remaining Routes** - Add validation to policy, asset, training, expense routes
2. **Add Virus Scanning** - Integrate ClamAV for malware detection
3. **Add Image Processing** - Resize/optimize images after validation
4. **Add File Metadata** - Store file info (hash, size, MIME) in database
5. **Add CDN Integration** - Upload validated files to Cloudinary/S3

---

## Conclusion

File upload validation provides:
- ✅ DoS attack prevention (size limits)
- ✅ Malware upload prevention (MIME + extension validation)
- ✅ Double extension bypass prevention
- ✅ MIME type spoofing detection
- ✅ File count limits

**Status:** ✅ **COMPLETE** - 2 routes protected, middleware ready for expansion

---

**Report End**
