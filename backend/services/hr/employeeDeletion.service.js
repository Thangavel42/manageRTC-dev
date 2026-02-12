import { clerkClient } from '@clerk/clerk-sdk-node';
import { ObjectId } from 'mongodb';
import { client, getTenantCollections } from '../../config/db.js';
import {
  AppError,
  buildNotFoundError,
  buildValidationError
} from '../../middleware/errorHandler.js';
import { logSecurityEvent } from '../../utils/logger.js';

const buildDependentRecordsError = (details) => {
  const err = new AppError(
    'Dependent records exist. Reassignment is required before deletion.',
    409,
    'DEPENDENT_RECORDS'
  );
  err.details = [{ requiresReassign: true, ...details }];
  return err;
};

const isClerkNotFoundError = (error) => {
  const status = error?.status || error?.statusCode;
  const code = error?.errors?.[0]?.code || error?.code;
  return status === 404 || code === 'resource_not_found';
};

const resolveClerkUserId = async (employee) => {
  if (employee?.clerkUserId) return employee.clerkUserId;
  const email = employee?.contact?.email || employee?.email;
  if (!email) return null;

  try {
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });
    return users?.data?.[0]?.id || null;
  } catch (error) {
    return null;
  }
};

const normalizeRole = (role) => {
  if (!role) return '';
  const normalized = String(role).trim().toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('hr')) return 'hr';
  if (normalized.includes('employee')) return 'employee';
  return normalized;
};

const canDeleteTargetRole = (requesterRole, targetRole) => {
  if (!requesterRole || !targetRole) return false;
  if (targetRole === 'admin') return false;
  if (requesterRole === 'admin' || requesterRole === 'superadmin') {
    return targetRole === 'hr' || targetRole === 'employee';
  }
  if (requesterRole === 'hr') {
    return targetRole === 'employee';
  }
  return false;
};

const countDependencies = async (collections, oldId, oldIdStr) => {
  const [
    tasks,
    projects,
    leads,
    tickets,
    trainings
  ] = await Promise.all([
    collections.tasks.countDocuments({
      assignee: { $in: [oldId, oldIdStr] }
    }),
    collections.projects.countDocuments({
      $or: [
        { teamMembers: oldId },
        { teamMembers: oldIdStr },
        { teamLeader: oldId },
        { teamLeader: oldIdStr },
        { projectManager: oldId },
        { projectManager: oldIdStr }
      ]
    }),
    collections.leads.countDocuments({
      $or: [
        { owner: oldId },
        { owner: oldIdStr },
        { assignee: oldId },
        { assignee: oldIdStr }
      ]
    }),
    collections.tickets.countDocuments({
      'assignedTo._id': { $in: [oldId, oldIdStr] }
    }),
    collections.trainings.countDocuments({ instructor: { $in: [oldId, oldIdStr] } })
  ]);

  return { tasks, projects, leads, tickets, trainings };
};

export const deleteEmployeeHard = async ({
  companyId,
  employeeId,
  reassignTo = null,
  requesterRole = null,
  requesterId = null
}) => {
  if (!companyId || !employeeId) {
    throw buildValidationError('employeeId', 'Employee ID is required');
  }

  if (!ObjectId.isValid(employeeId)) {
    throw buildValidationError('employeeId', 'Invalid employee ID format');
  }

  const collections = getTenantCollections(companyId);
  const oldId = new ObjectId(employeeId);

  const employee = await collections.employees.findOne({ _id: oldId });
  if (!employee) {
    throw buildNotFoundError('Employee', employeeId);
  }

  const oldIdStr = oldId.toString();
  const clerkUserId = await resolveClerkUserId(employee);
  const targetRole = normalizeRole(employee.account?.role || employee.role);
  const requesterRoleNormalized = normalizeRole(requesterRole);

  logSecurityEvent('permissions_delete_attempt', {
    companyId,
    requesterId,
    requesterRole: requesterRoleNormalized,
    targetRole,
    employeeId: oldIdStr,
    timestamp: new Date().toISOString()
  });

  if (!canDeleteTargetRole(requesterRoleNormalized, targetRole)) {
    logSecurityEvent('permissions_delete_denied', {
      companyId,
      requesterId,
      requesterRole: requesterRoleNormalized,
      targetRole,
      employeeId: oldIdStr,
      timestamp: new Date().toISOString()
    });
    throw new AppError('You do not have permission to delete this role.', 403, 'FORBIDDEN');
  }

  const dependencyCounts = await countDependencies(collections, oldId, oldIdStr);
  const hasDependencies = Object.values(dependencyCounts).some((count) => count > 0);

  if (hasDependencies && !reassignTo) {
    throw buildDependentRecordsError(dependencyCounts);
  }

  let reassignee = null;
  let newId = null;
  if (reassignTo) {
    if (!ObjectId.isValid(reassignTo)) {
      throw buildValidationError('reassignTo', 'Invalid reassignment employee ID format');
    }
    if (reassignTo === oldIdStr) {
      throw buildValidationError('reassignTo', 'Reassignment employee must be different from the employee being deleted');
    }

    newId = new ObjectId(reassignTo);
    reassignee = await collections.employees.findOne({
      _id: newId,
      isDeleted: { $ne: true }
    });

    if (!reassignee) {
      throw buildValidationError('reassignTo', 'Reassignment employee not found or inactive');
    }

    if (String(reassignee.departmentId || '') !== String(employee.departmentId || '')) {
      throw buildValidationError('reassignTo', 'Reassignment employee must be from the same department');
    }
    if (String(reassignee.designationId || '') !== String(employee.designationId || '')) {
      throw buildValidationError('reassignTo', 'Reassignment employee must have the same designation');
    }
  }

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (reassignTo && newId && reassignee) {
        await collections.tasks.updateMany(
          { assignee: { $in: [oldId, oldIdStr] } },
          { $pull: { assignee: { $in: [oldId, oldIdStr] } }, $addToSet: { assignee: newId } },
          { session }
        );

        await collections.projects.updateMany(
          { teamMembers: { $in: [oldId, oldIdStr] } },
          { $pull: { teamMembers: { $in: [oldId, oldIdStr] } }, $addToSet: { teamMembers: newId } },
          { session }
        );
        await collections.projects.updateMany(
          { teamLeader: { $in: [oldId, oldIdStr] } },
          { $pull: { teamLeader: { $in: [oldId, oldIdStr] } }, $addToSet: { teamLeader: newId } },
          { session }
        );
        await collections.projects.updateMany(
          { projectManager: { $in: [oldId, oldIdStr] } },
          { $pull: { projectManager: { $in: [oldId, oldIdStr] } }, $addToSet: { projectManager: newId } },
          { session }
        );

        await collections.leads.updateMany(
          { owner: { $in: [oldId, oldIdStr] } },
          { $set: { owner: newId } },
          { session }
        );
        await collections.leads.updateMany(
          { assignee: { $in: [oldId, oldIdStr] } },
          { $set: { assignee: newId } },
          { session }
        );

        const reassignedToPayload = {
          _id: newId,
          firstName: reassignee.firstName || '',
          lastName: reassignee.lastName || '',
          avatar:
            reassignee.avatar ||
            reassignee.avatarUrl ||
            reassignee.profileImage ||
            'assets/img/profiles/avatar-01.jpg',
          email: reassignee.contact?.email || reassignee.email || '',
          role: reassignee.role || reassignee.account?.role || 'IT Support Specialist'
        };

        await collections.tickets.updateMany(
          { 'assignedTo._id': { $in: [oldId, oldIdStr] } },
          { $set: { assignedTo: reassignedToPayload } },
          { session }
        );

        await collections.trainings.updateMany(
          { instructor: { $in: [oldId, oldIdStr] } },
          { $set: { instructor: newId } },
          { session }
        );
      }

      await collections.employees.updateMany(
        { $or: [{ reportingTo: oldIdStr }, { reportingTo: oldId }] },
        { $set: { reportingTo: null } },
        { session }
      );

      await collections.trainings.updateMany(
        { 'participants.employee': { $in: [oldId, oldIdStr] } },
        { $pull: { participants: { employee: { $in: [oldId, oldIdStr] } } } },
        { session }
      );

      await collections.assets.updateMany(
        { assignedTo: { $in: [oldId, oldIdStr] } },
        {
          $set: {
            assignedTo: null,
            status: 'inactive',
            assignedDate: null,
            assignmentType: null
          }
        },
        { session }
      );

      await collections.tickets.updateMany(
        { 'createdBy._id': { $in: [oldId, oldIdStr] } },
        { $set: { 'createdBy._id': null } },
        { session }
      );
      await collections.tickets.updateMany(
        { 'comments.author._id': { $in: [oldId, oldIdStr] } },
        { $set: { 'comments.$[comment].author._id': null } },
        { arrayFilters: [{ 'comment.author._id': { $in: [oldId, oldIdStr] } }], session }
      );
      await collections.tickets.updateMany(
        { 'attachments.uploadedBy': { $in: [oldId, oldIdStr] } },
        { $set: { 'attachments.$[attachment].uploadedBy': null } },
        { arrayFilters: [{ 'attachment.uploadedBy': { $in: [oldId, oldIdStr] } }], session }
      );

      await Promise.all([
        collections.attendance.deleteMany(
          {
            $or: [
              { employee: oldId },
              { employeeId: employee.employeeId },
              { employeeId: oldIdStr }
            ]
          },
          { session }
        ),
        collections.payroll.deleteMany({ employeeId: oldId }, { session }),
        collections.leaves.deleteMany({ employee: oldId }, { session }),
        collections.overtimeRequests.deleteMany(
          {
            $or: [
              { employee: oldId },
              { employeeId: employee.employeeId },
              { employeeId: oldIdStr }
            ]
          },
          { session }
        ),
        clerkUserId
          ? collections.timeEntries.deleteMany({ userId: clerkUserId }, { session })
          : Promise.resolve(),
        clerkUserId
          ? collections.timeEntries.updateMany(
              { approvedBy: clerkUserId },
              { $set: { approvedBy: null } },
              { session }
            )
          : Promise.resolve(),
        collections.promotions.deleteMany({ employeeId: oldIdStr }, { session }),
        collections.performanceReviews.deleteMany(
          {
            $or: [
              { employeeId: oldIdStr },
              { 'employeeInfo.empId': employee.employeeId }
            ]
          },
          { session }
        ),
        collections.performanceAppraisals.deleteMany(
          { $or: [{ employeeId: oldIdStr }, { employeeId: employee.employeeId }] },
          { session }
        ),
        collections.resignation.deleteMany({ employeeId: oldIdStr }, { session }),
        collections.termination.deleteMany({ employeeId: oldIdStr }, { session }),
        collections.skills.deleteMany(
          {
            $or: [
              clerkUserId ? { userId: clerkUserId } : null,
              { employeeId: oldId },
              { employeeId: oldIdStr }
            ].filter(Boolean)
          },
          { session }
        ),
        collections.salaryHistory.deleteMany({ empId: oldId }, { session }),
        collections.notifications.deleteMany(
          {
            $or: [
              { createdBy: oldId },
              { employeeId: oldId },
              clerkUserId ? { userId: clerkUserId } : null
            ].filter(Boolean)
          },
          { session }
        ),
        collections.permissions.deleteMany({ employeeId: oldId }, { session })
      ]);

      const deleteResult = await collections.employees.deleteOne({ _id: oldId }, { session });
      if (deleteResult.deletedCount === 0) {
        throw new AppError('Failed to delete employee', 500, 'DELETE_FAILED');
      }

      if (clerkUserId) {
        try {
          await clerkClient.users.deleteUser(clerkUserId);
        } catch (error) {
          if (!isClerkNotFoundError(error)) {
            throw error;
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return {
    employeeId: oldIdStr,
    clerkUserId,
    dependencies: dependencyCounts
  };
};

export default {
  deleteEmployeeHard
};
