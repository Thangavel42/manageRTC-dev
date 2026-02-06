/**
 * Project REST Controller
 * Handles all Project CRUD operations via REST API
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import Employee from '../../models/employee/employee.schema.js';
import Project from '../../models/project/project.schema.js';
import Task from '../../models/task/task.schema.js';
import {
  buildDateRangeFilter,
  buildSearchFilter,
  extractUser,
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';
import { generateProjectId } from '../../utils/idGenerator.js';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';
import { broadcastProjectEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

/**
 * Helper function to get tenant-specific Project model
 */
const getProjectModel = (companyId) => {
  if (!companyId) {
    return Project;
  }
  return getTenantModel(companyId, 'Project', Project.schema);
};

/**
 * @desc    Get all projects with pagination and filtering
 * @route   GET /api/projects
 * @access  Private (Admin, HR, Superadmin, Employee)
 */
export const getProjects = asyncHandler(async (req, res) => {
  const { limit, search, status, priority, client, sortBy, order, dateFrom, dateTo } = req.query;
  const user = extractUser(req);

  // Get tenant-specific Project model
  const ProjectModel = user.companyId
    ? getTenantModel(user.companyId, 'Project', Project.schema)
    : Project;

  // Build filter - in multi-tenant architecture, database isolation handles tenant separation
  // Only filter by isDeleted (or missing field for backward compatibility)
  let filter = {
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  // Debug logging - lightweight
  console.log('[getProjects] Using database:', user.companyId || 'default');
  console.log('[getProjects] User object:', JSON.stringify(user, null, 2));
  console.log('[getProjects] User role:', user.role);
  console.log('[getProjects] User employeeId:', user.employeeId);
  console.log('[getProjects] Initial filter:', JSON.stringify(filter));

  // For employee role, filter projects where they are assigned as team member, leader, or manager
  if (user.role === 'employee') {
    console.log('[getProjects] Employee role detected, applying filter');
    const collections = getTenantCollections(user.companyId);

    // Find employee's MongoDB _id using their employeeId or clerkUserId
    const employee = await collections.employees.findOne({
      $or: [{ clerkUserId: user.userId }, { 'account.userId': user.userId }],
      isDeleted: { $ne: true },
    });

    console.log('[getProjects] Employee lookup result:', employee ? 'Found' : 'Not found');

    if (employee) {
      const employeeMongoId = employee._id;
      const employeeMongoIdStr = employee._id.toString();
      console.log('[getProjects] Employee filtering enabled');
      console.log('[getProjects] Employee MongoDB _id:', employeeMongoIdStr);
      console.log('[getProjects] Employee clerkUserId:', employee.clerkUserId);
      console.log('[getProjects] Employee employeeId:', employee.employeeId);

      // Use $and to combine isDeleted check with employee assignment check
      // Check both ObjectId and string formats for backward compatibility
      filter = {
        $and: [
          {
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
          },
          {
            $or: [
              { teamMembers: employeeMongoId },
              { teamMembers: employeeMongoIdStr },
              { teamLeader: employeeMongoId },
              { teamLeader: employeeMongoIdStr },
              { projectManager: employeeMongoId },
              { projectManager: employeeMongoIdStr },
            ],
          },
        ],
      };
      console.log('[getProjects] Employee filter applied:', JSON.stringify(filter, null, 2));
    } else {
      console.log('[getProjects] Employee not found for userId:', user.userId);
      console.log('[getProjects] Searched with clerkUserId and account.userId');
    }
  } else {
    console.log('[getProjects] Not employee role, no filtering applied');
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

  // Apply client filter
  if (client) {
    if (filter.$and) {
      filter.$and.push({ client });
    } else {
      filter.client = client;
    }
  }

  // Apply search filter
  if (search && search.trim()) {
    const searchFilter = buildSearchFilter(search, ['name', 'description', 'client']);
    if (filter.$and) {
      filter.$and.push(searchFilter);
    } else {
      filter = { ...filter, ...searchFilter };
    }
  }

  // Apply date range filter
  if (dateFrom || dateTo) {
    const dateFilter = buildDateRangeFilter(dateFrom, dateTo, 'startDate');
    if (filter.$and) {
      filter.$and.push(dateFilter);
    } else {
      filter = { ...filter, ...dateFilter };
    }
  }

  // Build sort option
  const sort = {};
  if (sortBy) {
    sort[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  // Simplified query - bypass filterAndPaginate due to timeout issues
  // console.log('[getProjects] Fetching projects with filter:', JSON.stringify(filter));

  const projects = await ProjectModel.find(filter)
    .sort(sort)
    .limit(parseInt(limit) || 50)
    .lean();

  console.log('[getProjects] Found', projects.length, 'projects');

  // Debug: If no projects found, check without filters
  if (projects.length === 0) {
    const totalInDb = await ProjectModel.countDocuments({});
    console.log('[getProjects] Total projects in DB (no filter):', totalInDb);

    const deletedCount = await ProjectModel.countDocuments({ isDeleted: true });
    console.log('[getProjects] Deleted projects:', deletedCount);

    const withCompanyId = await ProjectModel.countDocuments({ companyId: user.companyId });
    console.log('[getProjects] Projects with matching companyId:', withCompanyId);

    // Sample documents
    const samples = await ProjectModel.find({}).limit(2).lean();
    console.log(
      '[getProjects] Sample documents:',
      samples.map((p) => ({
        _id: p._id,
        name: p.name,
        companyId: p.companyId,
        isDeleted: p.isDeleted,
        hasIsDeleted: p.hasOwnProperty('isDeleted'),
      }))
    );
  }

  // Get tenant-specific Task model for task counts
  const TaskModel = user.companyId ? getTenantModel(user.companyId, 'Task', Task.schema) : Task;
  const EmployeeModel = user.companyId
    ? getTenantModel(user.companyId, 'Employee', Employee.schema)
    : Employee;

  // Add overdue flag, task counts, and populate team leader to each project
  const result = await Promise.all(
    projects.map(async (project) => {
      const isOverdue =
        project.status !== 'Completed' && project.dueDate && new Date(project.dueDate) < new Date();

      // Get task counts for this project
      const totalTasks = await TaskModel.countDocuments({
        projectId: project._id,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      });

      const completedTasks = await TaskModel.countDocuments({
        projectId: project._id,
        status: { $regex: /^completed$/i },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      });

      // Populate teamLeader with employee details
      let teamLeader = project.teamLeader;
      if (project.teamLeader) {
        try {
          const leaders = Array.isArray(project.teamLeader)
            ? project.teamLeader
            : [project.teamLeader];
          const leaderIds = leaders.map((id) =>
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
          );
          teamLeader = await EmployeeModel.find({ _id: { $in: leaderIds } })
            .select('firstName lastName employeeId _id')
            .lean();
        } catch (err) {
          console.error('[getProjects] Error populating teamLeader:', err);
        }
      }

      return {
        ...project,
        isOverdue,
        taskCount: totalTasks,
        completedTaskCount: completedTasks,
        teamLeader,
      };
    })
  );

  return sendSuccess(res, result, 'Projects retrieved successfully');
});

/**
 * @desc    Get single project by ID
 * @route   GET /api/projects/:id
 * @access  Private (All authenticated users)
 */
export const getProjectById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid project ID format');
  }

  // Build filter - in tenant-specific database, no need to filter by companyId
  const filter = {
    _id: id,
    $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
  };

  // Get tenant-specific models
  const ProjectModel = getProjectModel(user.companyId);
  const EmployeeModel = getTenantModel(user.companyId, 'Employee', Employee.schema);

  // Find project
  const project = await ProjectModel.findOne(filter).lean();

  if (!project) {
    throw buildNotFoundError('Project', id);
  }

  console.log('[getProjectById] Project tags:', project.tags);

  // Manually fetch employee details from tenant-specific Employee collection
  try {
    if (project.teamLeader) {
      const leaders = Array.isArray(project.teamLeader) ? project.teamLeader : [project.teamLeader];
      const leaderIds = leaders.map((id) =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
      project.teamLeader = await EmployeeModel.find({ _id: { $in: leaderIds } })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (project.teamMembers && project.teamMembers.length > 0) {
      const memberIds = project.teamMembers.map((id) =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
      project.teamMembers = await EmployeeModel.find({ _id: { $in: memberIds } })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (project.projectManager) {
      const managers = Array.isArray(project.projectManager)
        ? project.projectManager
        : [project.projectManager];
      const managerIds = managers.map((id) =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );
      project.projectManager = await EmployeeModel.find({ _id: { $in: managerIds } })
        .select('firstName lastName employeeId _id')
        .lean();
    }
  } catch (employeeError) {
    console.error('[getProjectById] Error fetching employee details:', employeeError);
    // Continue with the response even if employee fetching fails
  }

  // Add overdue flag
  const result = {
    ...project,
    isOverdue:
      project.status !== 'Completed' && project.dueDate && new Date(project.dueDate) < new Date(),
  };

  return sendSuccess(res, result);
});

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Admin, HR, Superadmin)
 */
export const createProject = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const projectData = req.body;

  // Generate project ID
  if (!projectData.projectId) {
    projectData.projectId = await generateProjectId(user.companyId);
  }

  // Add company and audit fields
  projectData.companyId = user.companyId;
  projectData.createdBy = user.userId;
  projectData.updatedBy = user.userId;

  // Get tenant-specific models
  const ProjectModel = getProjectModel(user.companyId);
  const EmployeeModel = getTenantModel(user.companyId, 'Employee', Employee.schema);

  // Create project
  const project = await ProjectModel.create(projectData);
  const projectObj = project.toObject ? project.toObject() : project;

  // Manually fetch employee details from tenant-specific Employee collection
  try {
    if (projectObj.teamLeader) {
      const leaderIds = (
        Array.isArray(projectObj.teamLeader) ? projectObj.teamLeader : [projectObj.teamLeader]
      ).map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

      projectObj.teamLeader = await EmployeeModel.find({
        _id: { $in: leaderIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (projectObj.teamMembers && projectObj.teamMembers.length > 0) {
      const memberIds = projectObj.teamMembers.map((id) =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );

      projectObj.teamMembers = await EmployeeModel.find({
        _id: { $in: memberIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (projectObj.projectManager) {
      const managerIds = (
        Array.isArray(projectObj.projectManager)
          ? projectObj.projectManager
          : [projectObj.projectManager]
      ).map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

      projectObj.projectManager = await EmployeeModel.find({
        _id: { $in: managerIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }
  } catch (employeeError) {
    console.error('[createProject] Error fetching employee details:', employeeError);
    // Continue with the response even if employee fetching fails
    // The project is already created, so we should still return success
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastProjectEvents.created(io, user.companyId, projectObj);
  }

  return sendCreated(res, projectObj, 'Project created successfully');
});

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;
  // console.log('[updateProject] Update data received:', updateData);
  // console.log('[updateProject] User:', user);
  // console.log('[updateProject] Project ID to update:', id);
  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid project ID format');
  }

  // Build filter - superadmins can access any project
  const filter = {
    _id: id,
    isDeleted: false,
  };

  // Only filter by companyId for non-superadmin users (case-insensitive)
  // if (user.role?.toLowerCase() !== 'superadmin') {
  //   filter.companyId = user.companyId;
  // }

  // Get tenant-specific models
  const ProjectModel = getProjectModel(user.companyId);
  const EmployeeModel = getTenantModel(user.companyId, 'Employee', Employee.schema);

  // Find project
  const project = await ProjectModel.findOne(filter);

  if (!project) {
    // console.log('[updateProject] Project not found with filter:', filter);
    throw buildNotFoundError('Project', id);
  }
  // console.log('[updateProject] Found project to update:', project);
  // Update audit fields
  updateData.updatedBy = user.userId;
  updateData.updatedAt = new Date();

  // Update project
  Object.assign(project, updateData);
  await project.save();

  // const projectObj = project.toObject();

  // Manually fetch employee details from tenant-specific Employee collection
  try {
    if (project.teamLeader) {
      const leaderIds = (
        Array.isArray(project.teamLeader) ? project.teamLeader : [project.teamLeader]
      ).map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

      project.teamLeader = await EmployeeModel.find({
        _id: { $in: leaderIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (project.teamMembers && project.teamMembers.length > 0) {
      const memberIds = project.teamMembers.map((id) =>
        typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
      );

      project.teamMembers = await EmployeeModel.find({
        _id: { $in: memberIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }

    if (project.projectManager) {
      const managerIds = (
        Array.isArray(project.projectManager) ? project.projectManager : [project.projectManager]
      ).map((id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id));

      project.projectManager = await EmployeeModel.find({
        _id: { $in: managerIds },
      })
        .select('firstName lastName employeeId _id')
        .lean();
    }
  } catch (employeeError) {
    console.error('[updateProject] Error fetching employee details:', employeeError);
    // Continue with the response even if employee fetching fails
    // The project is already saved, so we should still return success
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastProjectEvents.updated(io, user.companyId, project);
  }

  return sendSuccess(res, project, 'Project updated successfully');
});

/**
 * @desc    Delete project (soft delete)
 * @route   DELETE /api/projects/:id
 * @access  Private (Admin, Superadmin only)
 */
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid project ID format');
  }

  // Build filter - superadmins can access any project
  const filter = {
    _id: id,
    isDeleted: false,
  };

  // Only filter by companyId for non-superadmin users (case-insensitive)
  if (user.role?.toLowerCase() !== 'superadmin') {
    filter.companyId = user.companyId;
  }

  // Get tenant-specific model
  const ProjectModel = getProjectModel(user.companyId);

  // Find project
  const project = await ProjectModel.findOne(filter);

  if (!project) {
    throw buildNotFoundError('Project', id);
  }

  // Check if project has active tasks
  const TaskModel = user.companyId ? getTenantModel(user.companyId, 'Task', Task.schema) : Task;

  const activeTaskCount = await TaskModel.countDocuments({
    projectId: id,
    status: { $in: ['Pending', 'Inprogress'] },
    isDeleted: false,
  });

  if (activeTaskCount > 0) {
    throw buildValidationError(
      'project',
      `Cannot delete project with ${activeTaskCount} active tasks`
    );
  }

  // Soft delete
  project.isDeleted = true;
  project.updatedBy = user.userId;
  await project.save();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastProjectEvents.deleted(io, user.companyId, project.projectId, user.userId);
  }

  return sendSuccess(
    res,
    {
      _id: project._id,
      projectId: project.projectId,
      isDeleted: true,
    },
    'Project deleted successfully'
  );
});

/**
 * @desc    Get project statistics
 * @route   GET /api/projects/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getProjectStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  // Get tenant-specific model
  const ProjectModel = getProjectModel(user.companyId);

  // Build match filter - superadmins see stats for all projects
  const matchFilter = {
    isDeleted: false,
  };

  // Only filter by companyId for non-superadmin users (case-insensitive)
  if (user.role?.toLowerCase() !== 'superadmin') {
    matchFilter.companyId = user.companyId;
  }

  const stats = await ProjectModel.aggregate([
    {
      $match: matchFilter,
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] },
        },
        onHold: {
          $sum: { $cond: [{ $eq: ['$status', 'On Hold'] }, 1, 0] },
        },
        totalValue: { $sum: '$projectValue' },
        highPriority: {
          $sum: { $cond: [{ $eq: ['$priority', 'High'] }, 1, 0] },
        },
      },
    },
  ]);

  // Build overdue filter - superadmins see all overdue projects
  const overdueFilter = {
    status: { $ne: 'Completed' },
    dueDate: { $lt: new Date() },
    isDeleted: false,
  };

  // Only filter by companyId for non-superadmin users (case-insensitive)
  if (user.role?.toLowerCase() !== 'superadmin') {
    overdueFilter.companyId = user.companyId;
  }

  const overdueProjects = await ProjectModel.countDocuments(overdueFilter);

  const result = stats[0] || {
    total: 0,
    active: 0,
    completed: 0,
    onHold: 0,
    totalValue: 0,
    highPriority: 0,
  };

  result.overdue = overdueProjects;

  return sendSuccess(res, result, 'Project statistics retrieved successfully');
});

/**
 * @desc    Get my projects (projects where user is a team member or leader)
 * @route   GET /api/projects/my
 * @access  Private (All authenticated users)
 */
export const getMyProjects = asyncHandler(async (req, res) => {
  const { status, page, limit } = req.query;
  const user = extractUser(req);

  // Get tenant-specific models
  const ProjectModel = getProjectModel(user.companyId);
  const EmployeeModel = user.companyId
    ? getTenantModel(user.companyId, 'Employee', Employee.schema)
    : Employee;

  // Find the Employee record for this user
  const employee = await EmployeeModel.findOne({ clerkUserId: user.userId });

  if (!employee) {
    return sendSuccess(res, [], 'No projects found');
  }

  // Build filter - projects where user is team member or leader
  let filter = {
    companyId: user.companyId,
    isDeleted: false,
    $or: [
      { teamMembers: employee._id },
      { teamLeader: employee._id },
      { projectManager: employee._id },
    ],
  };

  if (status) {
    filter.status = status;
  }

  const projects = await ProjectModel.find(filter)
    .populate('teamLeader', 'firstName lastName fullName employeeId Id')
    .populate('teamMembers', 'firstName lastName fullName employeeId Id')
    .populate('projectManager', 'firstName lastName fullName employeeId Id')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit) || 50);

  const result = projects.map((project) => {
    const proj = project.toObject ? project.toObject() : project;
    proj.isOverdue = project.isOverdue;
    return proj;
  });

  return sendSuccess(res, result, 'My projects retrieved successfully');
});

/**
 * @desc    Update project progress
 * @route   PATCH /api/projects/:id/progress
 * @access  Private (Admin, HR, Superadmin, Team Leaders)
 */
export const updateProjectProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { progress } = req.body;
  const user = extractUser(req);

  // Validate progress
  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    throw buildValidationError('progress', 'Progress must be between 0 and 100');
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid project ID format');
  }

  // Get tenant-specific model
  const ProjectModel = getProjectModel(user.companyId);

  // Build filter - superadmins can access any project
  const filter = {
    _id: id,
    isDeleted: false,
  };

  // Only filter by companyId for non-superadmin users (case-insensitive)
  if (user.role?.toLowerCase() !== 'superadmin') {
    filter.companyId = user.companyId;
  }

  // Find project
  const project = await ProjectModel.findOne(filter);

  if (!project) {
    throw buildNotFoundError('Project', id);
  }

  // Update progress
  project.progress = progress;
  project.updatedBy = user.userId;

  // Auto-update status based on progress
  if (progress === 100) {
    project.status = 'Completed';
  } else if (project.status === 'Completed') {
    project.status = 'Active';
  }

  await project.save();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastProjectEvents.progressUpdated(io, user.companyId, project);
  }

  return sendSuccess(
    res,
    {
      _id: project._id,
      projectId: project.projectId,
      progress: project.progress,
      status: project.status,
    },
    'Project progress updated successfully'
  );
});

export default {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats,
  getMyProjects,
  updateProjectProgress,
};
