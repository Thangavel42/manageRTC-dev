import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import { ObjectId } from 'mongodb';
import * as taskService from '../../services/task/task.services.js';

const taskController = (socket, io) => {
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      devError('[Task] Company ID not found in user metadata', { user: socket.user?.sub });
      throw new Error('Company ID not found in user metadata');
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      devError(`[Task] Invalid company ID format: ${socket.companyId}`);
      throw new Error('Invalid company ID format');
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      devError(
        `[Task] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
      );
      throw new Error('Unauthorized: Company ID mismatch');
    }
    return socket.companyId;
  };

  const isAuthorized = socket.userMetadata?.role?.toLowerCase() === 'admin' || socket.userMetadata?.role?.toLowerCase() === 'hr';

  socket.on('task:create', async (data) => {
    try {
      devLog('[Task] task:create event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        data,
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);

      if (!data.title || !data.projectId) {
        throw new Error('Title and projectId are required');
      }

      const taskData = {
        ...data,
        companyId,
        createdBy: socket.user?.sub || socket.userMetadata?.userId || 'unknown',
      };

      const result = await taskService.createTask(companyId, taskData);
      if (!result.done) {
        devError('[Task] Failed to create task', { error: result.error });
      }
      socket.emit('task:create-response', result);

      io.to(`company_${companyId}`).emit('task:task-created', result);
    } catch (error) {
      devError('[Task] Error in task:create', { error: error.message });
      socket.emit('task:create-response', { done: false, error: error.message });
    }
  });

  socket.on('task:getAll', async (filters = {}) => {
    try {
      devLog('[Task] task:getAll event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        filters,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTasks(companyId, filters);
      if (!result.done) {
        devError('[Task] Failed to get tasks', { error: result.error });
      }
      socket.emit('task:getAll-response', result);
    } catch (error) {
      devError('[Task] Error in task:getAll', { error: error.message });
      socket.emit('task:getAll-response', { done: false, error: error.message });
    }
  });

  socket.on('task:getById', async (taskId) => {
    try {
      devLog('[Task] task:getById event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        taskId,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskById(companyId, taskId);
      if (!result.done) {
        devError('[Task] Failed to get task', { error: result.error });
      }
      socket.emit('task:getById-response', result);
    } catch (error) {
      devError('[Task] Error in task:getById', { error: error.message });
      socket.emit('task:getById-response', { done: false, error: error.message });
    }
  });

  socket.on('task:getByProject', async ({ projectId, filters = {} }) => {
    try {
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTasksByProject(companyId, projectId, filters);
      if (!result.done) {
        devError('[Task] Failed to get project tasks', { error: result.error });
      }
      // Wrap tasks in data.tasks structure for frontend compatibility
      const response = result.done
        ? {
            done: true,
            data: {
              tasks: result.data || [],
            },
            message: result.message,
          }
        : result;
      socket.emit('task:getByProject-response', response);
    } catch (error) {
      devError('[Task] Error in task:getByProject', { error: error.message });
      socket.emit('task:getByProject-response', { done: false, error: error.message });
    }
  });

  socket.on('task:update', async (payload) => {
    try {
      // Support both shapes: { taskId, update } and { taskId, assignee, ... }
      const taskId = payload?.taskId;
      const update =
        payload?.update ||
        (() => {
          const { taskId: _tid, update: _up, ...rest } = payload || {};
          return rest; // treat remaining fields as update object
        })();

      devLog('[Task] task:update event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        taskId,
        update,
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);
      if (!taskId || !update || Object.keys(update).length === 0) {
        throw new Error('Invalid update payload');
      }

      const result = await taskService.updateTask(companyId, taskId, update);
      if (!result.done) {
        devError('[Task] Failed to update task', { error: result.error });
      }
      socket.emit('task:update-response', result);

      io.to(`company_${companyId}`).emit('task:task-updated', result);
    } catch (error) {
      devError('[Task] Error in task:update', { error: error.message });
      socket.emit('task:update-response', { done: false, error: error.message });
    }
  });

  socket.on('task:delete', async ({ taskId }) => {
    try {
      devLog('[Task] task:delete event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        taskId,
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.deleteTask(companyId, taskId);
      if (!result.done) {
        devError('[Task] Failed to delete task', { error: result.error });
      }
      socket.emit('task:delete-response', result);

      io.to(`company_${companyId}`).emit('task:task-deleted', result);
    } catch (error) {
      devError('[Task] Error in task:delete', { error: error.message });
      socket.emit('task:delete-response', { done: false, error: error.message });
    }
  });

  socket.on('task:getStats', async (projectId = null) => {
    try {
      devLog('[Task] task:getStats event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        projectId,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskStats(companyId, projectId);
      if (!result.done) {
        devError('[Task] Failed to get task stats', { error: result.error });
      }
      // include projectId in response to correlate on client
      socket.emit('task:getStats-response', { ...result, projectId });
    } catch (error) {
      devError('[Task] Error in task:getStats', { error: error.message });
      socket.emit('task:getStats-response', { done: false, error: error.message, projectId });
    }
  });

  socket.on('task:getKanbanData', async (data = {}) => {
    try {
      devLog('[Task] task:getKanbanData event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        data,
      });
      const companyId = validateCompanyAccess(socket);
      const { projectId, filters = {} } = data;

      const result = await taskService.getTasksForKanban(companyId, projectId, filters);

      if (!result.done) {
        devError('[Task] Failed to get kanban data', { error: result.error });
      }

      socket.emit('task:getKanbanData-response', result);
    } catch (error) {
      devError('[Task] Error in task:getKanbanData', { error: error.message });
      socket.emit('task:getKanbanData-response', { done: false, error: error.message });
    }
  });

  socket.on('task:updateStatus', async (data) => {
    try {
      devLog('[Task] task:updateStatus event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        data,
      });
      const companyId = validateCompanyAccess(socket);
      const { taskId, newStatus } = data;

      if (!taskId || !newStatus) {
        throw new Error('Task ID and new status are required');
      }

      if (!ObjectId.isValid(taskId)) {
        throw new Error('Invalid task ID format');
      }

      const result = await taskService.updateTaskStatus(companyId, taskId, newStatus);

      if (!result.done) {
        devError('[Task] Failed to update task status', { error: result.error });
      }

      socket.emit('task:updateStatus-response', result);

      io.to(`company_${companyId}`).emit('task:status-updated', {
        taskId,
        newStatus,
        updatedBy: socket.user?.sub,
      });
    } catch (error) {
      devError('[Task] Error in task:updateStatus', { error: error.message });
      socket.emit('task:updateStatus-response', { done: false, error: error.message });
    }
  });

  // Get Task Statistics
  socket.on('task:getStats', async (projectId = null) => {
    try {
      devLog('[Task] task:getStats event', {
        user: socket.user?.sub,
        companyId: socket.companyId,
        projectId,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskStats(companyId, projectId);

      if (!result.done) {
        devError('[Task] Failed to get task stats', { error: result.error });
      }

      socket.emit('task:getStats-response', result);
    } catch (error) {
      devError('[Task] Error in task:getStats', { error: error.message });
      socket.emit('task:getStats-response', { done: false, error: error.message });
    }
  });

  // Get task statuses
  socket.on('task:getStatuses', async () => {
    try {
      devLog('[Task] task:getStatuses event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskStatuses(companyId);
      if (!result.done) {
        devError('[Task] Failed to get task statuses', { error: result.error });
      }
      socket.emit('task:getStatuses-response', result);
    } catch (error) {
      devError('[Task] Error in task:getStatuses', { error: error.message });
      socket.emit('task:getStatuses-response', { done: false, error: error.message });
    }
  });

  // Create task status
  socket.on('task:addStatus', async (payload = {}) => {
    try {
      devLog('[Task] task:addStatus event', {
        user: socket.user?.sub,
        companyId: socket.companyId,
        payload,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.createTaskStatus(companyId, payload);
      if (!result.done) {
        devError('[Task] Failed to create task status', { error: result.error });
      }
      socket.emit('task:addStatus-response', result);
    } catch (error) {
      devError('[Task] Error in task:addStatus', { error: error.message });
      socket.emit('task:addStatus-response', { done: false, error: error.message });
    }
  });

  // Update task status board (the status itself, not a task's status)
  socket.on('task:updateStatusBoard', async (payload = {}) => {
    try {
      devLog('[Task] task:updateStatusBoard event', {
        user: socket.user?.sub,
        companyId: socket.companyId,
        payload,
      });
      const companyId = validateCompanyAccess(socket);
      const { statusId, ...updateData } = payload;

      if (!statusId) {
        throw new Error('Status ID is required');
      }

      const result = await taskService.updateStatusBoard(companyId, statusId, updateData);
      if (!result.done) {
        devError('[Task] Failed to update task status board', { error: result.error });
      }
      socket.emit('task:updateStatusBoard-response', result);

      // Broadcast to all connected clients in the company
      io.to(`company_${companyId}`).emit('task:statusBoard-updated', {
        statusId,
        updatedData: result.data,
        updatedBy: socket.user?.sub,
      });
    } catch (error) {
      devError('[Task] Error in task:updateStatusBoard', { error: error.message });
      socket.emit('task:updateStatusBoard-response', { done: false, error: error.message });
    }
  });
};

export default taskController;
