/**
 * Validation Middleware and Schemas Export
 * Central export point for all validation functionality
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

// Export validation middleware
export {
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  validateFiles,
  validate
} from './validate.js';

// Export query sanitization middleware
export {
  sanitizeQuery,
  validateQueryStrict,
  blockMongoOperators,
  validateObjectIdParams,
  sanitizeObject,
  convertBooleans,
  removeEmpty
} from './sanitizeQuery.js';

// Export common schemas
export {
  objectIdSchema,
  paginationSchema,
  dateRangeSchema,
  futureDateRangeSchema,
  searchSchema,
  sortSchema,
  statusSchema,
  emailSchema,
  phoneSchema,
  nameSchema,
  descriptionSchema,
  urlSchema,
  filePathSchema,
  positiveNumberSchema,
  percentageSchema,
  booleanSchema,
  addressSchema,
  queryParamsSchema
} from './schemas/common.schema.js';

// Export leave schemas
export {
  createLeaveSchema,
  updateLeaveSchema,
  leaveActionSchema,
  managerActionSchema,
  cancelLeaveSchema,
  leaveAttachmentSchema,
  leaveQuerySchema,
  leaveBalanceQuerySchema,
  carryForwardConfigSchema,
  leaveEncashmentSchema,
  leaveLedgerInitSchema,
  leaveSyncAttendanceSchema
} from './schemas/leave.schema.js';

// Export attendance schemas
export {
  createAttendanceSchema,
  bulkAttendanceSchema,
  updateAttendanceSchema,
  attendanceRegularizationSchema,
  regularizationActionSchema,
  attendanceQuerySchema,
  attendanceReportSchema,
  employeeAttendanceReportSchema
} from './schemas/attendance.schema.js';

// Export overtime schemas
export {
  createOvertimeSchema,
  updateOvertimeSchema,
  overtimeActionSchema,
  overtimeManagerActionSchema,
  cancelOvertimeSchema,
  overtimeQuerySchema,
  overtimeSummarySchema,
  processOvertimeSchema
} from './schemas/overtime.schema.js';

// Export employee schemas
export {
  createEmployeeSchema,
  updateEmployeeSchema,
  employeeSelfUpdateSchema,
  employeeQuerySchema,
  employeeStatusUpdateSchema,
  employeeImageUploadSchema
} from './schemas/employee.schema.js';

// Export HR management schemas
export {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentQuerySchema,
  createDesignationSchema,
  updateDesignationSchema,
  designationQuerySchema,
  createHolidaySchema,
  updateHolidaySchema,
  holidayQuerySchema,
  validateHolidaySchema,
  calculateWorkingDaysSchema,
  createPolicySchema,
  updatePolicySchema,
  policyQuerySchema
} from './schemas/hr.schema.js';
