/**
 * ID Generator Utility
 * Generates unique IDs for various entities
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../config/db.js';
import Project from '../models/project/project.schema.js';
import { getTenantModel } from './mongooseMultiTenant.js';

/**
 * generateEmployeeId - Generate unique employee ID
 * Format: EMP-YYYY-NNNN (e.g., EMP-2026-0001)
 *
 * @param {string} companyId - Company ID
 * @param {Date} joiningDate - Employee joining date
 * @returns {Promise<string>} Generated employee ID
 */
export const generateEmployeeId = async (companyId, joiningDate = new Date()) => {
  const Employee = mongoose.model('Employee');
  const year = new Date(joiningDate).getFullYear();

  // Find the highest employee ID for this company and year
  const lastEmployee = await Employee.findOne({
    companyId,
    employeeId: new RegExp(`^EMP-${year}-`),
  }).sort({ employeeId: -1 });

  let sequence = 1;

  if (lastEmployee && lastEmployee.employeeId) {
    const lastSequence = parseInt(lastEmployee.employeeId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  // Pad sequence to 4 digits
  const paddedSequence = String(sequence).padStart(4, '0');

  return `EMP-${year}-${paddedSequence}`;
};

/**
 * generateProjectId - Generate unique project ID
 * Format: PRJ-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated project ID
 */
export const generateProjectId = async (companyId) => {
  // Use tenant-specific model to avoid conflicts across tenants
  const ProjectModel = companyId
    ? getTenantModel(companyId, 'Project', Project.schema)
    : mongoose.model('Project');

  const year = new Date().getFullYear();

  const lastProject = await ProjectModel.findOne({
    projectId: new RegExp(`^PRJ-${year}-`),
  }).sort({ projectId: -1 });

  let sequence = 1;

  if (lastProject && lastProject.projectId) {
    const lastSequence = parseInt(lastProject.projectId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `PRJ-${year}-${paddedSequence}`;
};

/**
 * generateTaskId - Generate unique task ID
 * Format: TSK-YYYY-NNNN
 *
 * @param {string} projectId - Project ID
 * @returns {Promise<string>} Generated task ID
 */
export const generateTaskId = async (projectId) => {
  const Task = mongoose.model('Task');
  const year = new Date().getFullYear();

  const lastTask = await Task.findOne({
    project: projectId,
    taskId: new RegExp(`^TSK-${year}-`),
  }).sort({ taskId: -1 });

  let sequence = 1;

  if (lastTask && lastTask.taskId) {
    const lastSequence = parseInt(lastTask.taskId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `TSK-${year}-${paddedSequence}`;
};

/**
 * generateLeaveId - Generate unique leave request ID
 * Format: LEA-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated leave ID
 */
export const generateLeaveId = async (companyId) => {
  const Leave = mongoose.model('Leave');
  const year = new Date().getFullYear();

  const lastLeave = await Leave.findOne({
    companyId,
    leaveId: new RegExp(`^LEA-${year}-`),
  }).sort({ leaveId: -1 });

  let sequence = 1;

  if (lastLeave && lastLeave.leaveId) {
    const lastSequence = parseInt(lastLeave.leaveId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `LEA-${year}-${paddedSequence}`;
};

/**
 * generateLeadId - Generate unique lead ID
 * Format: LD-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated lead ID
 */
export const generateLeadId = async (companyId) => {
  const Lead = mongoose.model('Lead');
  const year = new Date().getFullYear();

  const lastLead = await Lead.findOne({
    companyId,
    leadId: new RegExp(`^LD-${year}-`),
  }).sort({ leadId: -1 });

  let sequence = 1;

  if (lastLead && lastLead.leadId) {
    const lastSequence = parseInt(lastLead.leadId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `LD-${year}-${paddedSequence}`;
};

/**
 * generateClientId - Generate unique client ID
 * Format: CLI-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated client ID
 */
export const generateClientId = async (companyId) => {
  const Client = mongoose.model('Client');
  const year = new Date().getFullYear();

  const lastClient = await Client.findOne({
    companyId,
    clientId: new RegExp(`^CLI-${year}-`),
  }).sort({ clientId: -1 });

  let sequence = 1;

  if (lastClient && lastClient.clientId) {
    const lastSequence = parseInt(lastClient.clientId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `CLI-${year}-${paddedSequence}`;
};

/**
 * generateAttendanceId - Generate unique attendance ID
 * Format: ATT-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated attendance ID
 */
export const generateAttendanceId = async (companyId) => {
  const Attendance = mongoose.model('Attendance');
  const year = new Date().getFullYear();

  const lastAttendance = await Attendance.findOne({
    companyId,
    attendanceId: new RegExp(`^ATT-${year}-`),
  }).sort({ attendanceId: -1 });

  let sequence = 1;

  if (lastAttendance && lastAttendance.attendanceId) {
    const lastSequence = parseInt(lastAttendance.attendanceId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `ATT-${year}-${paddedSequence}`;
};

/**
 * generateOvertimeId - Generate unique overtime request ID
 * Format: OVT-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @param {Date} date - Overtime date
 * @returns {Promise<string>} Generated overtime ID
 */
export const generateOvertimeId = async (companyId, date = new Date()) => {
  const OvertimeRequest = mongoose.model('OvertimeRequest');
  const year = new Date(date).getFullYear();

  const lastOvertime = await OvertimeRequest.findOne({
    companyId,
    overtimeId: new RegExp(`^OVT-${year}-`),
  }).sort({ overtimeId: -1 });

  let sequence = 1;

  if (lastOvertime && lastOvertime.overtimeId) {
    const lastSequence = parseInt(lastOvertime.overtimeId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `OVT-${year}-${paddedSequence}`;
};

/**
 * generateShiftId - Generate unique shift ID
 * Format: SHF-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated shift ID
 */
export const generateShiftId = async (companyId) => {
  const Shift = mongoose.model('Shift');
  const year = new Date().getFullYear();

  const lastShift = await Shift.findOne({
    companyId,
    shiftId: new RegExp(`^SHF-${year}-`),
  }).sort({ shiftId: -1 });

  let sequence = 1;

  if (lastShift && lastShift.shiftId) {
    const lastSequence = parseInt(lastShift.shiftId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `SHF-${year}-${paddedSequence}`;
};

/**
 * generateAssetId - Generate unique asset ID
 * Format: AST-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated asset ID
 */
export const generateAssetId = async (companyId) => {
  const { assets } = getTenantCollections(companyId);
  const year = new Date().getFullYear();

  const lastAsset = await assets
    .find({
      assetId: new RegExp(`^AST-${year}-`),
    })
    .sort({ assetId: -1 })
    .limit(1)
    .toArray();

  let sequence = 1;

  if (lastAsset && lastAsset.length > 0 && lastAsset[0].assetId) {
    const lastSequence = parseInt(lastAsset[0].assetId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `AST-${year}-${paddedSequence}`;
};

/**
 * generateTrainingId - Generate unique training ID
 * Format: TRN-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated training ID
 */
export const generateTrainingId = async (companyId) => {
  const Training = mongoose.model('Training');
  const year = new Date().getFullYear();

  const lastTraining = await Training.findOne({
    companyId,
    trainingId: new RegExp(`^TRN-${year}-`),
  }).sort({ trainingId: -1 });

  let sequence = 1;

  if (lastTraining && lastTraining.trainingId) {
    const lastSequence = parseInt(lastTraining.trainingId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `TRN-${year}-${paddedSequence}`;
};

/**
 * generateActivityId - Generate unique activity ID
 * Format: ACT-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated activity ID
 */
export const generateActivityId = async (companyId) => {
  const Activity = mongoose.model('Activity');
  const year = new Date().getFullYear();

  const lastActivity = await Activity.findOne({
    companyId,
    activityId: new RegExp(`^ACT-${year}-`),
  }).sort({ activityId: -1 });

  let sequence = 1;

  if (lastActivity && lastActivity.activityId) {
    const lastSequence = parseInt(lastActivity.activityId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `ACT-${year}-${paddedSequence}`;
};

/**
 * generatePipelineId - Generate unique pipeline ID
 * Format: PLN-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated pipeline ID
 */
export const generatePipelineId = async (companyId) => {
  const Pipeline = mongoose.model('Pipeline');
  const year = new Date().getFullYear();

  const lastPipeline = await Pipeline.findOne({
    companyId,
    pipelineId: new RegExp(`^PLN-${year}-`),
  }).sort({ pipelineId: -1 });

  let sequence = 1;

  if (lastPipeline && lastPipeline.pipelineId) {
    const lastSequence = parseInt(lastPipeline.pipelineId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `PLN-${year}-${paddedSequence}`;
};

/**
 * generateId - Generic ID generator
 * Format: PREFIX-TIMESTAMP-RANDOM
 *
 * @param {string} prefix - ID prefix (e.g., 'HLD', 'DOC')
 * @param {string} companyId - Company ID (optional, for consistency)
 * @returns {string} Generated ID
 */
export const generateId = (prefix, companyId = '') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * generateBatchId - Generate unique batch ID
 * Format: BCH-YYYY-NNNN
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated batch ID
 */
export const generateBatchId = async (companyId) => {
  const Batch = mongoose.model('Batch');
  const year = new Date().getFullYear();

  const lastBatch = await Batch.findOne({
    companyId,
    batchId: new RegExp(`^BCH-${year}-`),
  }).sort({ batchId: -1 });

  let sequence = 1;

  if (lastBatch && lastBatch.batchId) {
    const lastSequence = parseInt(lastBatch.batchId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const paddedSequence = String(sequence).padStart(4, '0');

  return `BCH-${year}-${paddedSequence}`;
};

export default {
  generateEmployeeId,
  generateProjectId,
  generateTaskId,
  generateLeaveId,
  generateLeadId,
  generateClientId,
  generateAttendanceId,
  generateOvertimeId,
  generateShiftId,
  generateBatchId,
  generateAssetId,
  generateTrainingId,
  generateActivityId,
  generatePipelineId,
  generateId,
};
