/**
 * API Response Utilities for REST APIs
 * Standardized response formatting with pagination support
 */

/**
 * Success Response Builder
 *
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {Object} pagination - Optional pagination metadata
 * @returns {Object} Standardized success response
 */
export const successResponse = (data, message = 'Success', pagination = null) => {
  const response = {
    success: true,
    data,
  };

  if (message && message !== 'Success') {
    response.message = message;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

/**
 * Error Response Builder
 *
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array} details - Optional error details array
 * @returns {Object} Standardized error response
 */
export const errorResponse = (code, message, statusCode = 400, details = []) => {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
};

/**
 * Created Response (201)
 */
export const createdResponse = (data, message = 'Resource created successfully') => {
  return successResponse(data, message);
};

/**
 * Updated Response
 */
export const updatedResponse = (data, message = 'Resource updated successfully') => {
  return successResponse(data, message);
};

/**
 * Deleted Response
 */
export const deletedResponse = (message = 'Resource deleted successfully') => {
  return successResponse(null, message);
};

/**
 * Pagination Metadata Builder
 *
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
export const buildPagination = (page, limit, total) => {
  const pages = Math.ceil(total / limit);

  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
};

/**
 * Paginated Response Builder
 *
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Response with pagination metadata
 */
export const paginatedResponse = (data, page, limit, total) => {
  return successResponse(data, null, buildPagination(page, limit, total));
};

/**
 * Filter and Paginate Helper
 * Processes MongoDB queries with filtering, sorting, and pagination
 *
 * @param {Model} model - Mongoose model
 * @param {Object} filter - MongoDB filter object
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Result with data and pagination metadata
 */
export const filterAndPaginate = async (model, filter = {}, options = {}) => {
  const { page = 1, limit = 20, sort = { createdAt: -1 }, populate = [], select = null } = options;

  // Build query
  let query = model.find(filter);

  // Apply populate
  if (populate.length > 0) {
    populate.forEach((pop) => {
      query = query.populate(pop);
    });
  }

  // Apply select
  if (select) {
    query = query.select(select);
  }

  // Get total count
  const total = await model.countDocuments(filter);

  // Apply pagination and sorting
  const data = await query
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

/**
 * Search Helper
 * Creates text search filter for MongoDB
 *
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Fields to search in
 * @returns {Object} MongoDB filter
 */
export const buildSearchFilter = (searchTerm, fields = ['name', 'email']) => {
  if (!searchTerm || searchTerm.trim() === '') {
    return {};
  }

  const orConditions = fields.map((field) => ({
    [field]: { $regex: searchTerm, $options: 'i' },
  }));

  return { $or: orConditions };
};

/**
 * Date Range Filter Builder
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {string} field - Date field name (default: 'createdAt')
 * @returns {Object} MongoDB date filter
 */
export const buildDateRangeFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};

  if (startDate) {
    filter[field] = { ...filter[field], $gte: new Date(startDate) };
  }

  if (endDate) {
    // Include the entire end date by setting to end of day
    const endDateEndOfDay = new Date(endDate);
    endDateEndOfDay.setHours(23, 59, 59, 999);
    filter[field] = { ...filter[field], $lte: endDateEndOfDay };
  }

  return filter;
};

/**
 * Sanitize Projection
 * Removes sensitive fields from query results
 *
 * @param {Array<string>} fields - Fields to exclude
 * @returns {Object} MongoDB projection object
 */
export const sanitizeProjection = (fields = ['password', '__v']) => {
  const projection = {};
  fields.forEach((field) => {
    projection[field] = 0;
  });
  return projection;
};

/**
 * Extract User Info from Request
 *
 * @param {Object} req - Express request object
 * @returns {Object} User information
 */
export const extractUser = (req) => {
  return {
    userId: req.user?.userId,
    companyId: req.user?.companyId,
    employeeId: req.user?.employeeId,
    role: req.user?.role,
    email: req.user?.email,
  };
};

/**
 * Build Audit Fields
 * Creates audit fields for create/update operations
 *
 * @param {string} userId - User ID performing the action
 * @param {boolean} isUpdate - Whether this is an update operation
 * @returns {Object} Audit fields object
 */
export const buildAuditFields = (userId, isUpdate = false) => {
  const timestamp = new Date();

  if (isUpdate) {
    return {
      updatedAt: timestamp,
      updatedBy: userId,
    };
  }

  return {
    createdAt: timestamp,
    createdBy: userId,
    updatedAt: timestamp,
    updatedBy: userId,
  };
};

/**
 * Request ID Extractor
 * Gets or generates request ID for tracing
 *
 * @param {Object} req - Express request object
 * @returns {string} Request ID
 */
export const getRequestId = (req) => {
  return req.id || req.headers['x-request-id'] || 'no-id';
};

/**
 * Format Response Helper
 * Combines response builder with request ID
 *
 * @param {Object} res - Express response object
 * @param {Object} responseData - Response data from builders
 * @param {number} statusCode - HTTP status code
 */
export const sendResponse = (res, responseData, statusCode = 200) => {
  // Add request ID if not present
  if (!responseData.requestId && responseData.error) {
    responseData.error.requestId = res.getHeader('X-Request-ID') || 'no-id';
  }

  return res.status(statusCode).json(responseData);
};

/**
 * Success Response Sender
 */
export const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return sendResponse(res, successResponse(data, message), statusCode);
};

/**
 * Created Response Sender
 */
export const sendCreated = (res, data, message = 'Resource created successfully') => {
  return sendResponse(res, createdResponse(data, message), 201);
};

/**
 * Error Response Sender
 */
export const sendError = (res, code, message, statusCode = 400, details = []) => {
  return sendResponse(res, errorResponse(code, message, statusCode, details), statusCode);
};

/**
 * No Content Response (204)
 */
export const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Bulk Operation Response
 * Formats response for bulk create/update/delete operations
 *
 * @param {number} successCount - Number of successful operations
 * @param {number} failureCount - Number of failed operations
 * @param {Array} errors - Array of errors from failed operations
 * @returns {Object} Bulk operation response
 */
export const bulkOperationResponse = (successCount, failureCount, errors = []) => {
  return successResponse(
    {
      successCount,
      failureCount,
      total: successCount + failureCount,
      errors: errors.length > 0 ? errors : undefined,
    },
    `Bulk operation completed: ${successCount} succeeded, ${failureCount} failed`
  );
};

/**
 * Stats Response Builder
 * Formats statistical data response
 *
 * @param {Object} stats - Statistics object
 * @param {string} period - Time period for stats (e.g., 'month', 'year')
 * @returns {Object} Stats response
 */
export const statsResponse = (stats, period = 'all') => {
  return successResponse(
    {
      ...stats,
      period,
      generatedAt: new Date().toISOString(),
    },
    'Statistics retrieved successfully'
  );
};

/**
 * Export to Excel/CSV Response Builder
 * Formats response for data export requests
 *
 * @param {string} fileUrl - URL to download the exported file
 * @param {number} recordCount - Number of records exported
 * @param {string} format - Export format (excel, csv)
 * @returns {Object} Export response
 */
export const exportResponse = (fileUrl, recordCount, format = 'excel') => {
  return successResponse(
    {
      fileUrl,
      recordCount,
      format,
      exportedAt: new Date().toISOString(),
    },
    `Data exported successfully as ${format.toUpperCase()}`
  );
};

export default {
  // Response builders
  successResponse,
  errorResponse,
  createdResponse,
  updatedResponse,
  deletedResponse,
  paginatedResponse,
  bulkOperationResponse,
  statsResponse,
  exportResponse,

  // Pagination helpers
  buildPagination,
  filterAndPaginate,

  // Filter builders
  buildSearchFilter,
  buildDateRangeFilter,
  sanitizeProjection,

  // Request helpers
  extractUser,
  buildAuditFields,
  getRequestId,

  // Senders
  sendResponse,
  sendSuccess,
  sendCreated,
  sendError,
  sendNoContent,
};
