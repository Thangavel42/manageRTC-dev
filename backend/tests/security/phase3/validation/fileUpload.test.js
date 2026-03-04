/**
 * Unit Tests for File Upload Validation Middleware
 * Tests Phase 3, Task 3.5
 *
 * @jest-environment node
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { validateFile, validateFiles } from '../../../../middleware/validation/validate.js';

describe('File Upload Validation - Unit Tests', () => {

  // ============================================================================
  // VALIDATE SINGLE FILE
  // ============================================================================

  describe('validateFile middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { file: null, user: { userId: 'test-user' } };
      res = {};
      next = jest.fn();
    });

    test('should accept valid file upload', () => {
      req.file = {
        originalname: 'test.pdf',
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf',
        filename: 'test-123.pdf'
      };

      const middleware = validateFile({
        required: false,
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject file exceeding size limit', () => {
      req.file = {
        originalname: 'large.pdf',
        size: 6 * 1024 * 1024, // 6MB
        mimetype: 'application/pdf'
      };

      const middleware = validateFile({
        maxSize: 5 * 1024 * 1024 // 5MB limit
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File size exceeds')
      }));
    });

    test('should reject invalid MIME type', () => {
      req.file = {
        originalname: 'test.exe',
        size: 1024,
        mimetype: 'application/x-msdownload'
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf', 'image/jpeg']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File type')
      }));
    });

    test('should reject invalid file extension', () => {
      req.file = {
        originalname: 'test.exe',
        size: 1024,
        mimetype: 'application/pdf' // Misleading MIME type
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File extension')
      }));
    });

    test('should require file when required=true', () => {
      req.file = null;

      const middleware = validateFile({ required: true });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File is required')
      }));
    });

    test('should allow missing file when required=false', () => {
      req.file = null;

      const middleware = validateFile({ required: false });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should accept image/jpeg', () => {
      req.file = {
        originalname: 'photo.jpg',
        size: 500 * 1024,
        mimetype: 'image/jpeg'
      };

      const middleware = validateFile({
        allowedTypes: ['image/jpeg', 'image/png'],
        allowedExtensions: ['.jpg', '.jpeg', '.png']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should accept image/png', () => {
      req.file = {
        originalname: 'screenshot.png',
        size: 800 * 1024,
        mimetype: 'image/png'
      });

      const middleware = validateFile({
        allowedTypes: ['image/jpeg', 'image/png'],
        allowedExtensions: ['.jpg', '.png']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should handle case-insensitive extensions', () => {
      req.file = {
        originalname: 'test.PDF', // Uppercase extension
        size: 1024,
        mimetype: 'application/pdf'
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should use default max size of 5MB', () => {
      req.file = {
        originalname: 'test.pdf',
        size: 4 * 1024 * 1024, // 4MB
        mimetype: 'application/pdf'
      };

      const middleware = validateFile();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject file > 5MB default', () => {
      req.file = {
        originalname: 'large.pdf',
        size: 6 * 1024 * 1024, // 6MB
        mimetype: 'application/pdf'
      };

      const middleware = validateFile(); // Default 5MB

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File size exceeds')
      }));
    });
  });

  // ============================================================================
  // VALIDATE MULTIPLE FILES
  // ============================================================================

  describe('validateFiles middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = { files: [], user: { userId: 'test-user' } };
      res = {};
      next = jest.fn();
    });

    test('should accept valid multiple files', () => {
      req.files = [
        {
          originalname: 'doc1.pdf',
          size: 1024 * 1024,
          mimetype: 'application/pdf'
        },
        {
          originalname: 'doc2.pdf',
          size: 1024 * 1024,
          mimetype: 'application/pdf'
        }
      ];

      const middleware = validateFiles({
        maxFiles: 5,
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject too many files', () => {
      req.files = new Array(6).fill({
        originalname: 'doc.pdf',
        size: 1024,
        mimetype: 'application/pdf'
      });

      const middleware = validateFiles({
        maxFiles: 5
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Cannot upload more than 5 files')
      }));
    });

    test('should validate each file size', () => {
      req.files = [
        {
          originalname: 'small.pdf',
          size: 1 * 1024 * 1024, // 1MB
          mimetype: 'application/pdf'
        },
        {
          originalname: 'large.pdf',
          size: 6 * 1024 * 1024, // 6MB - Exceeds limit
          mimetype: 'application/pdf'
        }
      ];

      const middleware = validateFiles({
        maxSize: 5 * 1024 * 1024
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('large.pdf')
      }));
    });

    test('should validate each file MIME type', () => {
      req.files = [
        {
          originalname: 'doc.pdf',
          size: 1024,
          mimetype: 'application/pdf'
        },
        {
          originalname: 'virus.exe',
          size: 1024,
          mimetype: 'application/x-msdownload'
        }
      ];

      const middleware = validateFiles({
        allowedTypes: ['application/pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('virus.exe')
      }));
    });

    test('should validate each file extension', () => {
      req.files = [
        {
          originalname: 'doc.pdf',
          size: 1024,
          mimetype: 'application/pdf'
        },
        {
          originalname: 'script.js',
          size: 1024,
          mimetype: 'application/pdf' // Misleading
        }
      ];

      const middleware = validateFiles({
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('script.js')
      }));
    });

    test('should require files when required=true', () => {
      req.files = [];

      const middleware = validateFiles({ required: true });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Files are required')
      }));
    });

    test('should allow missing files when required=false', () => {
      req.files = [];

      const middleware = validateFiles({ required: false });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should handle null files array when required=false', () => {
      req.files = null;

      const middleware = validateFiles({ required: false });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should use default max files of 5', () => {
      req.files = new Array(5).fill({
        originalname: 'doc.pdf',
        size: 1024,
        mimetype: 'application/pdf'
      });

      const middleware = validateFiles();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject > 5 files default', () => {
      req.files = new Array(6).fill({
        originalname: 'doc.pdf',
        size: 1024,
        mimetype: 'application/pdf'
      });

      const middleware = validateFiles(); // Default 5 files

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('Cannot upload more than 5 files')
      }));
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================

  describe('File Upload Security', () => {
    let req, res, next;

    beforeEach(() => {
      req = { file: null, user: { userId: 'test-user' } };
      res = {};
      next = jest.fn();
    });

    test('should block executable files', () => {
      req.file = {
        originalname: 'virus.exe',
        size: 1024,
        mimetype: 'application/x-msdownload'
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf', 'image/jpeg'],
        allowedExtensions: ['.pdf', '.jpg']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File type')
      }));
    });

    test('should block script files', () => {
      req.file = {
        originalname: 'malicious.js',
        size: 1024,
        mimetype: 'application/javascript'
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf'],
        allowedExtensions: ['.pdf']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File type')
      }));
    });

    test('should block double extension bypass attempt', () => {
      req.file = {
        originalname: 'image.jpg.exe',
        size: 1024,
        mimetype: 'image/jpeg' // Misleading
      };

      const middleware = validateFile({
        allowedTypes: ['image/jpeg'],
        allowedExtensions: ['.jpg']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File extension')
      }));
    });

    test('should block MIME type spoofing', () => {
      req.file = {
        originalname: 'malware.exe',
        size: 1024,
        mimetype: 'image/jpeg' // Spoofed MIME type
      };

      const middleware = validateFile({
        allowedTypes: ['image/jpeg'],
        allowedExtensions: ['.jpg', '.jpeg']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File extension')
      }));
    });

    test('should enforce size limits to prevent DoS', () => {
      req.file = {
        originalname: 'huge.pdf',
        size: 100 * 1024 * 1024, // 100MB
        mimetype: 'application/pdf'
      };

      const middleware = validateFile({
        maxSize: 5 * 1024 * 1024
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File size exceeds')
      }));
    });
  });

  // ============================================================================
  // LEAVE ATTACHMENT SPECIFIC TESTS
  // ============================================================================

  describe('Leave Attachment Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = { file: null, user: { userId: 'test-user' } };
      res = {};
      next = jest.fn();
    });

    test('should accept PDF attachment', () => {
      req.file = {
        originalname: 'medical_certificate.pdf',
        size: 2 * 1024 * 1024,
        mimetype: 'application/pdf'
      };

      const middleware = validateFile({
        required: true,
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should accept JPEG image attachment', () => {
      req.file = {
        originalname: 'doctor_note.jpg',
        size: 1 * 1024 * 1024,
        mimetype: 'image/jpeg'
      };

      const middleware = validateFile({
        required: true,
        maxSize: 5 * 1024 * 1024,
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject unsupported file type for leave', () => {
      req.file = {
        originalname: 'document.docx',
        size: 1 * 1024 * 1024,
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      const middleware = validateFile({
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        allowedExtensions: ['.pdf', '.jpg', '.png']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File type')
      }));
    });
  });

  // ============================================================================
  // EMPLOYEE PROFILE IMAGE SPECIFIC TESTS
  // ============================================================================

  describe('Employee Profile Image Validation', () => {
    let req, res, next;

    beforeEach(() => {
      req = { file: null, user: { userId: 'test-user' } };
      res = {};
      next = jest.fn();
    });

    test('should accept JPEG profile image', () => {
      req.file = {
        originalname: 'profile.jpg',
        size: 500 * 1024,
        mimetype: 'image/jpeg'
      };

      const middleware = validateFile({
        required: true,
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should accept PNG profile image', () => {
      req.file = {
        originalname: 'avatar.png',
        size: 800 * 1024,
        mimetype: 'image/png'
      };

      const middleware = validateFile({
        required: true,
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.png', '.webp']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should accept WebP profile image', () => {
      req.file = {
        originalname: 'photo.webp',
        size: 400 * 1024,
        mimetype: 'image/webp'
      };

      const middleware = validateFile({
        required: true,
        maxSize: 2 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.png', '.webp']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    test('should reject image > 2MB for profile', () => {
      req.file = {
        originalname: 'large_photo.jpg',
        size: 3 * 1024 * 1024, // 3MB
        mimetype: 'image/jpeg'
      };

      const middleware = validateFile({
        maxSize: 2 * 1024 * 1024
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File size exceeds')
      }));
    });

    test('should reject PDF for profile image', () => {
      req.file = {
        originalname: 'document.pdf',
        size: 1 * 1024 * 1024,
        mimetype: 'application/pdf'
      };

      const middleware = validateFile({
        allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.png', '.webp']
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('File type')
      }));
    });
  });
});
