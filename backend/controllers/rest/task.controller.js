/**
 * Task REST Controller
 * Handles all Task CRUD operations via REST API
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildForbiddenError,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import Task from '../../models/task/task.schema.js';
import TaskStatus from '../../models/task/taskstatus.schema.js';
import {
  buildSearchFilter,
  extractUser,
  filterAndPaginate,
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';
import { generateTaskId } from '../../utils/idGenerator.js';
import { devLog, devWarn } from '../../utils/logger.js';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';
import { broadcastTaskEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

/**
 * Helper function to get tenant-specific Task model
 */
const getTaskModel = (companyId) => {
  if (!companyId) {
    return Task;
  }
  return getTenantModel(companyId, 'Task', Task.schema);
};

/**
 * Helper function to get tenant-specific TaskStatus model
 */
const getTaskStatusModel = (companyId) => {
  if (!companyId) {
    return TaskStatus;
  }
  return getTenantModel(companyId, 'TaskStatus', TaskStatus.schema);
};

const getProjectModel = (companyId) => {
  if (!companyId) {
    return mongoose.model('Project');
  }
  return getTenantModel(companyId, 'Project', mongoose.model('Project').schema);
};

const getEmployeeModel = (companyId) => {
  if (!companyId) {
    return mongoose.model('Employee');
  }
  return getTenantModel(companyId, 'Employee', mongoose.model('Employee').schema);
};

/**
 * @desc    Get all tasks with pagination and filtering
 * @route   GET /api/tasks
 * @access  Private (Admin, HR, Superadmin, Employee)
 */
export const getTasks = asyncHandler(async (req, res) => {
  const { page, limit, search, project, assignee, status, priority, sortBy, order } = req.query;
  const user = extractUser(req);

  // Get tenant-specific model
  const TaskModel = getTaskModel(user.companyId);

  // Build filter - in tenant-specific database, handle missing fields
  let filter = {
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  // ✅ SECURITY FIX - Phase 2: Apply employee-based filtering for restricted roles
  if (['employee', 'manager'].includes(user.role?.toLowerCase())) {
    const EmployeeModel = getEmployeeModel(user.companyId);

    // Find employee's MongoDB _id
    const employee = await collections.employees.findOne({
      $or: [{ clerkUserId: user.userId }, { 'account.userId': user.userId }],
      isDeleted: { $ne: true },
    });

    if (!employee) {
      // ✅ SECURITY FIX: If employee record not found, return empty results
      console.warn(
        `[Security] Employee record not found for user ${user.userId} (role: ${user.role}). ` +
          `Denying access to all tasks. RequestId: ${req.id}`
      );

      return sendSuccess(res, [], 'No tasks accessible', {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: parseInt(limit) || 20,
      });
    }

    // Filter tasks where employee is assigned
    const employeeMongoId = employee._id;
    const employeeMongoIdStr = employee._id.toString();

    filter = {
      $and: [
        {
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
        {
          $or: [
            { assignee: employeeMongoId },
            { assignee: { $in: [employeeMongoIdStr] } },
            { 'assignees.employee': employeeMongoId },
            { 'assignees.employee': employeeMongoIdStr },
            { createdBy: employee.clerkUserId },
          ],
        },
      ],
    };
  }

  // Apply project filter
  if (project) {
    if (filter.$and) {
      filter.$and.push({ projectId: project });
    } else {
      filter.projectId = project;
    }
  }

  // Apply assignee filter - resolve employeeId string to MongoDB ObjectId
  if (assignee) {
    let assigneeId = assignee;

    // If assignee is a string (not an ObjectId format), look up employee's MongoDB _id
    if (typeof assignee === 'string' && !mongoose.Types.ObjectId.isValid(assignee)) {
      const EmployeeModel = getEmployeeModel(user.companyId);
      const employee = await EmployeeModel.findOne({
        $or: [
          { employeeId: assignee },  // String employeeId like "EMP-1234"
          { clerkUserId: assignee }, // Or clerkUserId
        ],
        isDeleted: { $ne: true },
      });

      if (employee) {
        assigneeId = employee._id;
      } else {
        // If employee not found, filter will return no results (expected behavior)
        assigneeId = new mongoose.Types.ObjectId('000000000000000000000000'); // Invalid ObjectId = no match
      }
    }

    // Convert to ObjectId if it's a valid string representation
    if (typeof assigneeId === 'string' && mongoose.Types.ObjectId.isValid(assigneeId)) {
      assigneeId = new mongoose.Types.ObjectId(assigneeId);
    }

    if (filter.$and) {
      filter.$and.push({ assignee: { $in: [assigneeId] } });
    } else {
      filter.assignee = { $in: [assigneeId] };
    }
  }

  // Apply status filter
  if (status) {
    if (filter.$and) {
      filter.$and.push({ status });
    } else {
      filter.status = status;
    }
  }

  // Apply priority filter
  if (priority) {
    if (filter.$and) {
      filter.$and.push({ priority });
    } else {
      filter.priority = priority;
    }
  }

  // Apply search filter
  if (search && search.trim()) {
    const searchFilter = buildSearchFilter(search, ['title', 'description']);
    filter = { ...filter, ...searchFilter };
  }

  // Build sort option
  const sort = {};
  if (sortBy) {
    sort[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  // Get paginated results
  const result = await filterAndPaginate(TaskModel, filter, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    sort,
    populate: [
      {
        path: 'projectId',
        select: 'name projectId status progress',
      },
      {
        path: 'assignee',
        select: 'firstName lastName fullName employeeId',
      },
    ],
  });

  return sendSuccess(res, result.data, 'Tasks retrieved successfully', 200, result.pagination);
});

/**
 * @desc    Get single task by ID
 * @route   GET /api/tasks/:id
 * @access  Private (All authenticated users)
 */
export const getTaskById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Get tenant-specific model
  const TaskModel = getTaskModel(user.companyId);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid task ID format');
  }

  // Find task
  const task = await TaskModel.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate('projectId', 'name projectId status progress')
    .populate('assignee', 'firstName lastName fullName employeeId');

  if (!task) {
    throw buildNotFoundError('Task', id);
  }

  return sendSuccess(res, task);
});

/**
 * @desc    Create new task
 * @route   POST /api/tasks
 * @access  Private (Admin, HR, Superadmin, Project Managers)
 */
export const createTask = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const taskData = req.body;

  // Get tenant-specific models
  const TaskModel = getTaskModel(user.companyId);
  const ProjectModel = getProjectModel(user.companyId);
  const { employees: EmployeeModel } = getTenantCollections(user.companyId);

  // Verify project exists
  const project = await ProjectModel.findOne({
    _id: taskData.projectId,
    isDeleted: false,
  });

  if (!project) {
    throw buildNotFoundError('Project', taskData.projectId);
  }

  // Permission check: Admin/HR can create tasks, employees must be team lead or project manager on this project
  const userRole = user.role?.toLowerCase();
  if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'superadmin') {
    // Employee - check if they're a team lead or project manager on this project
    const employee = await EmployeeModel.findOne({
      clerkUserId: user.userId,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      throw buildForbiddenError('Employee record not found');
    }

    const employeeId = employee._id.toString();
    const isProjectManager = project.projectManager?.some(
      (manager) => manager.toString() === employeeId
    );
    const isTeamLead = project.teamLeader?.some((lead) => lead.toString() === employeeId);

    if (!isProjectManager && !isTeamLead) {
      throw buildForbiddenError(
        'Only project managers and team leads can create tasks on this project'
      );
    }
  }

  // Generate task ID
  if (!taskData.taskId) {
    taskData.taskId = await generateTaskId(taskData.projectId);
  }

  // Add audit fields
  taskData.createdBy = user.userId;

  // Create task
  const task = await TaskModel.create(taskData);

  // Populate references for response
  await task.populate('projectId', 'name projectId status progress');
  await task.populate('assignee', 'firstName lastName fullName employeeId');

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTaskEvents.created(io, user.companyId, task);
  }

  return sendCreated(res, task, 'Task created successfully');
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private (Admin, HR, Superadmin, Project Managers, Team Leads)
 */
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  // Get tenant-specific models
  const TaskModel = getTaskModel(user.companyId);
  const ProjectModel = getProjectModel(user.companyId);
  const { employees: EmployeeModel } = getTenantCollections(user.companyId);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid task ID format');
  }

  // Find task
  const task = await TaskModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw buildNotFoundError('Task', id);
  }

  // Get project to check permissions
  const project = await ProjectModel.findOne({
    _id: task.projectId,
    isDeleted: false,
  });

  if (!project) {
    throw buildNotFoundError('Project', task.projectId);
  }

  // Permission check: Admin/HR can update tasks, employees must be team lead or project manager on this project
  const userRole = user.role?.toLowerCase();
  if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'superadmin') {
    // Employee - check if they're a team lead or project manager on this project
    const employee = await EmployeeModel.findOne({
      clerkUserId: user.userId,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      throw buildForbiddenError('Employee record not found');
    }

    const employeeId = employee._id.toString();
    const isProjectManager = project.projectManager?.some(
      (manager) => manager.toString() === employeeId
    );
    const isTeamLead = project.teamLeader?.some((lead) => lead.toString() === employeeId);

    if (!isProjectManager && !isTeamLead) {
      throw buildForbiddenError(
        'Only project managers and team leads can update tasks on this project'
      );
    }
  }

  // Update task
  Object.assign(task, updateData);
  await task.save();

  // Populate references for response
  await task.populate('projectId', 'name projectId status progress');
  await task.populate('assignee', 'firstName lastName fullName employeeId');

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTaskEvents.updated(io, user.companyId, task);
  }

  return sendSuccess(res, task, 'Task updated successfully');
});

/**
 * @desc    Delete task (soft delete)
 * @route   DELETE /api/tasks/:id
 * @access  Private (Admin, Superadmin, Project Managers)
 */
export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Get tenant-specific models
  const TaskModel = getTaskModel(user.companyId);
  const ProjectModel = getProjectModel(user.companyId);
  const { employees: EmployeeModel } = getTenantCollections(user.companyId);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid task ID format');
  }

  // Find task
  const task = await TaskModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw buildNotFoundError('Task', id);
  }

  // Get project to check permissions
  const project = await ProjectModel.findOne({
    _id: task.projectId,
    isDeleted: false,
  });

  if (!project) {
    throw buildNotFoundError('Project', task.projectId);
  }

  // Permission check: Admin/HR can delete tasks, employees must be team lead or project manager on this project
  const userRole = user.role?.toLowerCase();
  if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'superadmin') {
    // Employee - check if they're a team lead or project manager on this project
    const employee = await EmployeeModel.findOne({
      clerkUserId: user.userId,
      isDeleted: { $ne: true },
    });

    if (!employee) {
      throw buildForbiddenError('Employee record not found');
    }

    const employeeId = employee._id.toString();
    const isProjectManager = project.projectManager?.some(
      (manager) => manager.toString() === employeeId
    );
    const isTeamLead = project.teamLeader?.some((lead) => lead.toString() === employeeId);

    if (!isProjectManager && !isTeamLead) {
      throw buildForbiddenError(
        'Only project managers and team leads can delete tasks on this project'
      );
    }
  }

  // Soft delete
  task.isDeleted = true;
  await task.save();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io && task.projectId) {
    broadcastTaskEvents.deleted(io, user.companyId, task.taskId, task.projectId);
  }

  return sendSuccess(
    res,
    {
      _id: task._id,
      taskId: task.taskId,
      isDeleted: true,
    },
    'Task deleted successfully'
  );
});

/**
 * @desc    Get my tasks (tasks assigned to current user)
 * @route   GET /api/tasks/my
 * @access  Private (All authenticated users)
 */
export const getMyTasks = asyncHandler(async (req, res) => {
  const { status, project, page, limit } = req.query;
  const user = extractUser(req);

  // Get tenant-specific models
  const TaskModel = getTaskModel(user.companyId);
  const EmployeeModel = getEmployeeModel(user.companyId);

  // Find the Employee record for this user
  const employee = await EmployeeModel.findOne({ clerkUserId: user.userId });

  if (!employee) {
    return sendSuccess(res, [], 'No tasks found');
  }

  // Build filter - tasks where user is assigned
  let filter = {
    assignee: employee._id,
    isDeleted: false,
  };

  if (status) {
    filter.status = status;
  }

  if (project) {
    filter.projectId = project;
  }

  const tasks = await TaskModel.find(filter)
    .populate('projectId', 'name projectId status progress')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 50);

  return sendSuccess(res, tasks, 'My tasks retrieved successfully');
});

/**
 * @desc    Get tasks by project
 * @route   GET /api/tasks/project/:projectId
 * @access  Private (All authenticated users)
 */
export const getTasksByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status } = req.query;
  const user = extractUser(req);

  devLog('[getTasksByProject] ProjectId:', projectId, 'CompanyId:', user.companyId);

  // Get tenant-specific model
  const TaskModel = getTaskModel(user.companyId);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw buildValidationError('projectId', 'Invalid project ID format');
  }

  // Convert projectId to ObjectId for querying
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  // Build filter - in tenant-specific database, handle missing fields
  let filter = {
    projectId: projectObjectId,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  if (status) {
    filter.status = status;
  }

  devLog('[getTasksByProject] Filter:', JSON.stringify(filter));

  const tasks = await TaskModel.find(filter)
    .populate('assignee', 'firstName lastName fullName employeeId')
    .sort({ createdAt: -1 });

  devLog('[getTasksByProject] Found', tasks.length, 'tasks');

  // Debug: If no tasks found, check without filters
  if (tasks.length === 0) {
    const totalInDb = await TaskModel.countDocuments({});
    devLog('[getTasksByProject] Total tasks in DB (no filter):', totalInDb);

    const withProjectId = await TaskModel.countDocuments({ projectId: projectObjectId });
    devLog('[getTasksByProject] Tasks with matching projectId (ObjectId):', withProjectId);

    const withProjectIdString = await TaskModel.countDocuments({ projectId: projectId });
    devLog('[getTasksByProject] Tasks with matching projectId (string):', withProjectIdString);

    const samples = await TaskModel.find({}).limit(3).lean();
    devLog(
      '[getTasksByProject] Sample documents:',
      samples.map((t) => ({
        _id: t._id,
        title: t.title,
        projectId: t.projectId,
        projectIdType: typeof t.projectId,
        isDeleted: t.isDeleted,
        hasProjectId: t.hasOwnProperty('projectId'),
      }))
    );
  }

  return sendSuccess(res, tasks, 'Project tasks retrieved successfully');
});

/**
 * @desc    Get employee's tasks for a specific project
 * @route   GET /api/tasks/my/project/:projectId
 * @access  Private (Employee, HR, Admin, Superadmin)
 */
export const getEmployeeProjectTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status } = req.query;
  const user = extractUser(req);

  console.log(
    '[getEmployeeProjectTasks] ProjectId:',
    projectId,
    'User:',
    user.userId,
    'CompanyId:',
    user.companyId
  );

  // Get tenant-specific models
  const TaskModel = getTaskModel(user.companyId);
  const EmployeeModel = getEmployeeModel(user.companyId);

  // Find the Employee record for this user
  const employee = await EmployeeModel.findOne({ clerkUserId: user.userId });

  if (!employee) {
    console.log('[getEmployeeProjectTasks] No employee found for user:', user.userId);
    return sendSuccess(res, [], 'No tasks found');
  }

  console.log('[getEmployeeProjectTasks] Found employee:', {
    _id: employee._id,
    employeeId: employee.employeeId,
    name: `${employee.firstName} ${employee.lastName}`,
  });

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw buildValidationError('projectId', 'Invalid project ID format');
  }

  // Convert projectId to ObjectId for querying
  const projectObjectId = new mongoose.Types.ObjectId(projectId);

  // Build filter - tasks where user is assigned AND project matches
  let filter = {
    projectId: projectObjectId,
    assignee: employee._id,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  if (status) {
    filter.status = status;
  }

  console.log('[getEmployeeProjectTasks] Filter:', JSON.stringify(filter));

  const tasks = await TaskModel.find(filter)
    .populate('projectId', 'name projectId status progress')
    .populate('assignee', 'firstName lastName fullName employeeId')
    .sort({ createdAt: -1 });

  console.log('[getEmployeeProjectTasks] Found', tasks.length, 'tasks for employee');

  return sendSuccess(res, tasks, 'Employee project tasks retrieved successfully');
});

/**
 * @desc    Update task status
 * @route   PATCH /api/tasks/:id/status
 * @access  Private (Admin, HR, Superadmin, Project Managers, Assignees)
 */
export const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const user = extractUser(req);

  // Get tenant-specific model
  const TaskModel = getTaskModel(user.companyId);

  // Validate status
  const validStatuses = ['Pending', 'Inprogress', 'Completed', 'Onhold'];
  if (!validStatuses.includes(status)) {
    throw buildValidationError(
      'status',
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid task ID format');
  }

  // Find task
  const task = await TaskModel.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!task) {
    throw buildNotFoundError('Task', id);
  }

  // Update status
  task.status = status;
  await task.save();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTaskEvents.statusChanged(io, user.companyId, task);
  }

  return sendSuccess(
    res,
    {
      _id: task._id,
      taskId: task.taskId,
      status: task.status,
    },
    'Task status updated successfully'
  );
});

/**
 * @desc    Get task statistics
 * @route   GET /api/tasks/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getTaskStats = asyncHandler(async (req, res) => {
  const { projectId } = req.query;
  const user = extractUser(req);

  // Get tenant-specific model
  const TaskModel = getTaskModel(user.companyId);

  // Build match filter
  let matchFilter = { isDeleted: false };

  if (projectId) {
    matchFilter.projectId = new mongoose.Types.ObjectId(projectId);
  }

  const stats = await TaskModel.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ['$status', 'Inprogress'] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
        },
        onHold: {
          $sum: { $cond: [{ $eq: ['$status', 'Onhold'] }, 1, 0] },
        },
        highPriority: {
          $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] },
        },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' },
      },
    },
  ]);

  const result = stats[0] || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    onHold: 0,
    highPriority: 0,
    totalEstimatedHours: 0,
    totalActualHours: 0,
  };

  return sendSuccess(res, result, 'Task statistics retrieved successfully');
});

/**
 * @desc    Get all task status boards
 * @route   GET /api/tasks/statuses
 * @access  Private
 */
export const getTaskStatuses = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[getTaskStatuses] CompanyId:', user.companyId);

  // Get tenant-specific TaskStatus model
  const TaskStatusModel = getTaskStatusModel(user.companyId);

  // Only fetch active task statuses (exclude soft-deleted ones)
  const statuses = await TaskStatusModel.find({ active: true }).sort({ order: 1 }).lean();

  console.log('[getTaskStatuses] Found', statuses.length, 'active task statuses');

  // If no statuses found, provide debug info
  if (statuses.length === 0) {
    devWarn(
      '[getTaskStatuses] No task statuses found in database. Consider creating default statuses.'
    );

    // Check if collection exists
    const collections = await TaskStatusModel.db.listCollections().toArray();
    devLog(
      '[getTaskStatuses] Available collections:',
      collections.map((c) => c.name)
    );
  } else {
    devLog(
      '[getTaskStatuses] Status keys:',
      statuses.map((s) => s.key)
    );
  }

  return sendSuccess(res, statuses, 'Task statuses retrieved successfully');
});

/**
 * @desc    Create a new task status board
 * @route   POST /api/tasks/statuses
 * @access  Private (Admin, Superadmin)
 */
export const createTaskStatus = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { name, colorName, colorHex } = req.body;

  // Get tenant-specific TaskStatus model
  const TaskStatusModel = getTaskStatusModel(user.companyId);

  // Generate order (last + 1)
  const lastStatus = await TaskStatusModel.findOne().sort({ order: -1 });
  const order = (lastStatus?.order || 0) + 1;

  // Create normalized key from name
  const key = name.toLowerCase().replace(/\s+/g, '');

  const newStatus = await TaskStatusModel.create({
    key,
    name,
    colorName: colorName || 'purple',
    colorHex: colorHex || '#6f42c1',
    order,
    companyId: user.companyId,
  });

  return sendCreated(res, newStatus, 'Task status created successfully');
});

/**
 * @desc    Update task status board
 * @route   PUT /api/tasks/statuses/:id
 * @access  Private (Admin, Superadmin)
 */
export const updateTaskStatusBoard = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { id } = req.params;
  const { name, colorName, colorHex, order } = req.body;

  // Get tenant-specific TaskStatus model
  const TaskStatusModel = getTaskStatusModel(user.companyId);

  const status = await TaskStatusModel.findById(id);

  if (!status) {
    throw buildNotFoundError('Task status not found');
  }

  // Update fields
  if (name) {
    status.name = name;
    status.key = name.toLowerCase().replace(/\s+/g, '');
  }
  if (colorName) status.colorName = colorName;
  if (colorHex) status.colorHex = colorHex;
  if (typeof order === 'number') status.order = order;

  await status.save();

  return sendSuccess(res, status, 'Task status updated successfully');
});

/**
 * @desc    Delete task status board (soft delete)
 * @route   DELETE /api/tasks/statuses/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteTaskStatusBoard = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { id } = req.params;

  // Get tenant-specific TaskStatus model
  const TaskStatusModel = getTaskStatusModel(user.companyId);

  const status = await TaskStatusModel.findById(id);

  if (!status) {
    throw buildNotFoundError('Task status not found');
  }

  // Soft delete - set active to false
  status.active = false;
  await status.save();

  return sendSuccess(res, { id: status._id }, 'Task status deleted successfully');
});

export default {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getMyTasks,
  getTasksByProject,
  getEmployeeProjectTasks,
  updateTaskStatus,
  getTaskStats,
  getTaskStatuses,
  createTaskStatus,
  updateTaskStatusBoard,
  deleteTaskStatusBoard,
};
