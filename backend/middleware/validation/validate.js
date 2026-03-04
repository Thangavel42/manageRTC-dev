/**
 * Joi Validation Middleware
 * Provides validateBody, validateQuery, and validateParams middleware
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

import { sanitizeForLogs } from '../../utils/logSanitization.js';
import { buildValidationError } from '../errorHandler.js';

/**
 * Validate request body against Joi schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export const validateBody = (schema, options = {}) => {
  return async (req, res, next) => {
    try {
      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(req.body, validationOptions);

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        console.warn(
          `[Validation] Body validation failed for ${req.method} ${req.path}`,
          sanitizeForLogs({ details, userId: req.user?.userId, requestId: req.id })
        );

        throw buildValidationError(
          'request.body',
          `Validation failed: ${details.map(d => d.message).join(', ')}`,
          { details }
        );
      }

      // Replace req.body with validated and sanitized value
      req.body = value;
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate query parameters against Joi schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema, options = {}) => {
  return async (req, res, next) => {
    try {
      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(req.query, validationOptions);

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        console.warn(
          `[Validation] Query validation failed for ${req.method} ${req.path}`,
          sanitizeForLogs({ details, userId: req.user?.userId, requestId: req.id })
        );

        throw buildValidationError(
          'request.query',
          `Query validation failed: ${details.map(d => d.message).join(', ')}`,
          { details }
        );
      }

      // Replace req.query with validated and sanitized value
      // Note: req.query is read-only in Express 4.17+, so we modify in-place
      // Clear existing properties
      for (const key in req.query) {
        delete req.query[key];
      }
      // Add validated properties
      for (const key in value) {
        req.query[key] = value[key];
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate URL parameters against Joi schema
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export const validateParams = (schema, options = {}) => {
  return async (req, res, next) => {
    try {
      const validationOptions = {
        abortEarly: false,
        stripUnknown: true,
        ...options
      };

      const { error, value } = schema.validate(req.params, validationOptions);

      if (error) {
        const details = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));

        console.warn(
          `[Validation] Params validation failed for ${req.method} ${req.path}`,
          sanitizeForLogs({ details, userId: req.user?.userId, requestId: req.id })
        );

        throw buildValidationError(
          'request.params',
          `Params validation failed: ${details.map(d => d.message).join(', ')}`,
          { details }
        );
      }

      // Replace req.params with validated and sanitized value
      // Note: req.params is read-only in Express 4.17+, so we modify in-place
      // Clear existing properties
      for (const key in req.params) {
        delete req.params[key];
      }
      // Add validated properties
      for (const key in value) {
        req.params[key] = value[key];
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate file upload
 * @param {Object} rules - Upload validation rules
 * @returns {Function} Express middleware
 */
export const validateFile = (rules = {}) => {
  const {
    required = false,
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
  } = rules;

  return (req, res, next) => {
    try {
      const file = req.file;

      // Check if file is required
      if (required && !file) {
        throw buildValidationError('file', 'File is required');
      }

      // If no file and not required, skip validation
      if (!file && !required) {
        return next();
      }

      // Validate file size
      if (file.size > maxSize) {
        throw buildValidationError(
          'file.size',
          `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
        );
      }

      // Validate MIME type
      if (!allowedTypes.includes(file.mimetype)) {
        throw buildValidationError(
          'file.type',
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
        );
      }

      // Validate file extension
      const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        throw buildValidationError(
          'file.extension',
          `File extension ${fileExt} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
        );
      }

      // Log successful validation
      console.log(
        `[Validation] File upload validated: ${file.originalname} (${file.size} bytes, ${file.mimetype})`,
        sanitizeForLogs({ userId: req.user?.userId, requestId: req.id })
      );

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Validate multiple files upload
 * @param {Object} rules - Upload validation rules
 * @returns {Function} Express middleware
 */
export const validateFiles = (rules = {}) => {
  const {
    required = false,
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024,
    allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf']
  } = rules;

  return (req, res, next) => {
    try {
      const files = req.files;

      // Check if files are required
      if (required && (!files || files.length === 0)) {
        throw buildValidationError('files', 'Files are required');
      }

      // If no files and not required, skip validation
      if ((!files || files.length === 0) && !required) {
        return next();
      }

      // Validate number of files
      if (files.length > maxFiles) {
        throw buildValidationError(
          'files.count',
          `Cannot upload more than ${maxFiles} files at once`
        );
      }

      // Validate each file
      files.forEach((file, index) => {
        // Validate file size
        if (file.size > maxSize) {
          throw buildValidationError(
            `files[${index}].size`,
            `File ${file.originalname} exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`
          );
        }

        // Validate MIME type
        if (!allowedTypes.includes(file.mimetype)) {
          throw buildValidationError(
            `files[${index}].type`,
            `File type ${file.mimetype} is not allowed for ${file.originalname}`
          );
        }

        // Validate file extension
        const fileExt = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExt)) {
          throw buildValidationError(
            `files[${index}].extension`,
            `File extension ${fileExt} is not allowed for ${file.originalname}`
          );
        }
      });

      // Log successful validation
      console.log(
        `[Validation] Multiple files validated: ${files.length} files`,
        sanitizeForLogs({ userId: req.user?.userId, requestId: req.id })
      );

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Create a combined validation middleware
 * Validates body, query, and params in a single middleware
 * @param {Object} schemas - Object containing body, query, and params schemas
 * @returns {Function} Express middleware
 */
export const validate = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      const { body, query, params } = schemas;

      // Validate body
      if (body && req.body) {
        const { error: bodyError, value: bodyValue } = body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true
        });

        if (bodyError) {
          const details = bodyError.details.map(detail => ({
            field: `body.${detail.path.join('.')}`,
            message: detail.message
          }));

          throw buildValidationError(
            'request.body',
            `Body validation failed: ${details.map(d => d.message).join(', ')}`,
            { details }
          );
        }

        req.body = bodyValue;
      }

      // Validate query
      if (query && req.query) {
        const { error: queryError, value: queryValue } = query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true
        });

        if (queryError) {
          const details = queryError.details.map(detail => ({
            field: `query.${detail.path.join('.')}`,
            message: detail.message
          }));

          throw buildValidationError(
            'request.query',
            `Query validation failed: ${details.map(d => d.message).join(', ')}`,
            { details }
          );
        }

        // Note: req.query is read-only in Express 4.17+, so we modify in-place
        // Clear existing properties
        for (const key in req.query) {
          delete req.query[key];
        }
        // Add validated properties
        for (const key in queryValue) {
          req.query[key] = queryValue[key];
        }
      }

      // Validate params
      if (params && req.params) {
        const { error: paramsError, value: paramsValue } = params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true
        });

        if (paramsError) {
          const details = paramsError.details.map(detail => ({
            field: `params.${detail.path.join('.')}`,
            message: detail.message
          }));

          throw buildValidationError(
            'request.params',
            `Params validation failed: ${details.map(d => d.message).join(', ')}`,
            { details }
          );
        }

        // Note: req.params is read-only in Express 4.17+, so we modify in-place
        // Clear existing properties
        for (const key in req.params) {
          delete req.params[key];
        }
        // Add validated properties
        for (const key in paramsValue) {
          req.params[key] = paramsValue[key];
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
