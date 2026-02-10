# Profile Image Upload - Quick Reference Guide

## For Users

### How to Upload a Profile Image:

1. **Open Employee Details** → Click "Edit Profile Image" button
2. **Select Image** → Click "Upload" button, choose JPG, JPEG, or PNG file
3. **Validate** → System checks:
   - ✓ File type: JPG, JPEG, PNG only
   - ✓ File size: Maximum 2MB
4. **Preview** → Image appears immediately in the profile card
5. **Save** → Click "Save" to persist changes
6. **Verify** → Image remains after page refresh

### Replace or Remove:

- **Replace**: Upload new image (automatically replaces old one)
- **Remove**: Click "Remove" button to delete image

### Error Messages:

| Error | Cause | Solution |
|-------|-------|----------|
| "File size must be less than 2MB" | File too large | Compress image or resize |
| "Please upload image file only (JPG, JPEG, PNG)" | Wrong format | Convert to JPG, JPEG, or PNG |
| "Failed to upload image" | Network issue | Check connection and retry |

---

## For Developers

### Key Components:

#### 1. Frontend Image Upload (`employeedetails.tsx`)
```typescript
// Validation
- Max size: 2MB
- Allowed formats: JPG, JPEG, PNG
- Uploads to Cloudinary (third-party service)

// State Management
const [imageUpload, setImageUpload] = useState(false);
const [editFormData, setEditFormData] = useState({
  avatarUrl: '',      // For display
  profileImage: '',   // For backend
});

// On upload success
setEditFormData(prev => ({
  ...prev,
  avatarUrl: data.secure_url,
  profileImage: data.secure_url
}));
```

#### 2. Form Submission (`handleEditSubmit`)
```typescript
const payload = {
  // ... other fields
  profileImage: editFormData.avatarUrl || editFormData.profileImage || ""
};

await employeesREST.updateEmployee(employeeId, payload);
```

#### 3. Backend Validation (middleware/validate.js)
```javascript
profileImage: Joi.string().uri().allow('').optional(),
avatarUrl: Joi.string().uri().allow('').optional(),
```

#### 4. Backend Storage (controllers/rest/employee.controller.js)
```javascript
// MongoDB stores profileImage as URL string
const result = await collections.employees.updateOne(
  { _id: new ObjectId(id) },
  { $set: updateData }  // updateData contains profileImage
);

// Returns full employee document
return sendSuccess(res, updatedEmployee, 'Employee updated successfully');
```

#### 5. API Response Normalization (hooks/useEmployeesREST.ts)
```typescript
// Ensures consistent avatarUrl access
if (!employee.avatarUrl && employee.profileImage) {
  employee.avatarUrl = employee.profileImage;
}
```

---

### Data Flow Diagram

```
┌─────────────────────┐
│  User Select File   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Frontend Validation │ ✓ Type: JPG/JPEG/PNG
│ ✓ Size ≤ 2MB       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Upload to Cloudinary│ POST secure_url
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Store in State      │ avatarUrl + profileImage
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display Preview     │ Shows in form immediately
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ User Submits Form   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Backend Validation  │ Joi schema checks
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Store in MongoDB    │ profileImage: URL
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Return Updated      │ Includes profileImage
│ Employee            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Normalize Response  │ avatarUrl = profileImage
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display in UI       │ Image shows, persists
└─────────────────────┘
```

---

### Testing Commands

#### Frontend Console Tests
```javascript
// Check if imageUpload state works
const uploadBtn = document.querySelector('.drag-upload-btn');
console.log(uploadBtn.disabled); // Should be false initially

// Check image preview
const img = document.querySelector('.avatar-xxl img');
console.log(img?.src); // Should show image URL

// Check form data
editFormData = {
  avatarUrl: 'https://res.cloudinary.com/...',
  profileImage: 'https://res.cloudinary.com/...'
};
```

#### Backend API Tests
```bash
# Test validation schema
curl -X PUT http://localhost:5000/api/employees/EMP-1445 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "profileImage": "https://example.com/image.jpg",
    "firstName": "John"
  }'

# Expected Response: 200 OK with updated employee
```

#### Database Verification
```javascript
// MongoDB - Check profile image storage
db.employees.findOne(
  { employeeId: "EMP-1445" },
  { profileImage: 1 }
);

// Should return:
// { _id: ObjectId(...), profileImage: "https://..." }
```

---

### Configuration

**Cloudinary Setup**:
- Account: dwc3b5zfe
- Upload Preset: amasqis
- API URL: https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload

**Validation Rules**:
- Max File Size: 2MB (2097152 bytes)
- Allowed MIME Types: image/jpeg, image/png, image/jpg
- Allowed Extensions: .jpg, .jpeg, .png

**Database Field**:
```javascript
profileImage: {
  type: String,  // Stores URL, not binary data
  default: undefined
}
```

---

### Common Issues & Solutions

#### Issue: Image doesn't display after upload
**Solution**: Check browser console for errors, verify Cloudinary URL is valid

#### Issue: "Validation failed" error on save
**Solution**: Ensure profileImage is valid URL format in payload

#### Issue: Image lost after page refresh
**Solution**: Check MongoDB has profileImage stored, verify API returns it

#### Issue: Old image doesn't show on edit
**Solution**: Check employee.profileImage fallback is working

#### Issue: Upload button disabled after failed attempt
**Solution**: Check imageUpload state is being reset in catch block

---

### Best Practices

1. **Always validate file type and size** on frontend before upload
2. **Use URLs instead of binary data** for image storage (like Cloudinary)
3. **Provide clear error messages** to users
4. **Show loading state** during upload
5. **Cache images** on frontend for better performance
6. **Use CDN** for image delivery (Cloudinary)
7. **Set reasonable size limits** (2MB is good balance)
8. **Support common formats** (JPG, JPEG, PNG)

---

### Performance Considerations

- **Upload to CDN**: Cloudinary handles storage, scaling, caching
- **Direct DB Storage**: Avoid storing binary data in MongoDB
- **Image Optimization**: Cloudinary auto-optimizes images
- **Bandwidth**: CDN reduces server load
- **Latency**: Global CDN ensures fast delivery

---

**Last Updated**: February 4, 2026
**Status**: Production Ready ✅
