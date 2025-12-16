import * as taskService from '../../services/task/task.services.js';
import { ObjectId } from 'mongodb';

const taskController = (socket, io) => {

  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[Task] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[Task] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(`[Task] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  const isAuthorized = socket.userMetadata?.role === "admin" || socket.userMetadata?.role === "hr";
  console.log("[Task] Authorization check", { role: socket.userMetadata?.role, isAuthorized });

  
  socket.on("task:create", async (data) => {
    try {
      console.log("[Task] task:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);

      if (!data.title || !data.projectId) {
        throw new Error("Title and projectId are required");
      }

      const result = await taskService.createTask(companyId, { ...data, companyId });
      if (!result.done) {
        console.error("[Task] Failed to create task", { error: result.error });
      }
      socket.emit("task:create-response", result);

      
      io.to(`company_${companyId}`).emit("task:task-created", result);
    } catch (error) {
      console.error("[Task] Error in task:create", { error: error.message });
      socket.emit("task:create-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getAll", async (filters = {}) => {
    try {
      console.log("[Task] task:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTasks(companyId, filters);
      if (!result.done) {
        console.error("[Task] Failed to get tasks", { error: result.error });
      }
      socket.emit("task:getAll-response", result);
    } catch (error) {
      console.error("[Task] Error in task:getAll", { error: error.message });
      socket.emit("task:getAll-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getById", async (taskId) => {
    try {
      console.log("[Task] task:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, taskId });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskById(companyId, taskId);
      if (!result.done) {
        console.error("[Task] Failed to get task", { error: result.error });
      }
      socket.emit("task:getById-response", result);
    } catch (error) {
      console.error("[Task] Error in task:getById", { error: error.message });
      socket.emit("task:getById-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getByProject", async ({ projectId, filters = {} }) => {
    try {
      console.log("[Task] task:getByProject event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId, filters });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTasksByProject(companyId, projectId, filters);
      if (!result.done) {
        console.error("[Task] Failed to get project tasks", { error: result.error });
      }
      socket.emit("task:getByProject-response", result);
    } catch (error) {
      console.error("[Task] Error in task:getByProject", { error: error.message });
      socket.emit("task:getByProject-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:update", async ({ taskId, update }) => {
    try {
      console.log("[Task] task:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, taskId, update });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.updateTask(companyId, taskId, update);
      if (!result.done) {
        console.error("[Task] Failed to update task", { error: result.error });
      }
      socket.emit("task:update-response", result);

      
      io.to(`company_${companyId}`).emit("task:task-updated", result);
    } catch (error) {
      console.error("[Task] Error in task:update", { error: error.message });
      socket.emit("task:update-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:delete", async ({ taskId }) => {
    try {
      console.log("[Task] task:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, taskId });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.deleteTask(companyId, taskId);
      if (!result.done) {
        console.error("[Task] Failed to delete task", { error: result.error });
      }
      socket.emit("task:delete-response", result);

      
      io.to(`company_${companyId}`).emit("task:task-deleted", result);
    } catch (error) {
      console.error("[Task] Error in task:delete", { error: error.message });
      socket.emit("task:delete-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getStats", async (projectId = null) => {
    try {
      console.log("[Task] task:getStats event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId });
      const companyId = validateCompanyAccess(socket);
      const result = await taskService.getTaskStats(companyId, projectId);
      if (!result.done) {
        console.error("[Task] Failed to get task stats", { error: result.error });
      }
      socket.emit("task:getStats-response", result);
    } catch (error) {
      console.error("[Task] Error in task:getStats", { error: error.message });
      socket.emit("task:getStats-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getAllData", async (filters = {}) => {
    try {
      console.log("[Task] task:getAllData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, filters });
      const companyId = validateCompanyAccess(socket);

      const [tasks, stats] = await Promise.all([
        taskService.getTasks(companyId, filters),
        taskService.getTaskStats(companyId)
      ]);

      socket.emit("task:getAllData-response", {
        done: true,
        data: {
          tasks: tasks.data || [],
          stats: stats.data || { total: 0, pending: 0, inprogress: 0, completed: 0, onhold: 0 }
        }
      });
    } catch (error) {
      console.error("[Task] Error in task:getAllData", { error: error.message });
      socket.emit("task:getAllData-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:getKanbanData", async (data = {}) => {
    try {
      console.log("[Task] task:getKanbanData event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      const companyId = validateCompanyAccess(socket);
      const { projectId, filters = {} } = data;

      const result = await taskService.getTasksForKanban(companyId, projectId, filters);

      if (!result.done) {
        console.error("[Task] Failed to get kanban data", { error: result.error });
      }

      socket.emit("task:getKanbanData-response", result);
    } catch (error) {
      console.error("[Task] Error in task:getKanbanData", { error: error.message });
      socket.emit("task:getKanbanData-response", { done: false, error: error.message });
    }
  });

  
  socket.on("task:updateStatus", async (data) => {
    try {
      console.log("[Task] task:updateStatus event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      const companyId = validateCompanyAccess(socket);
      const { taskId, newStatus } = data;

      if (!taskId || !newStatus) {
        throw new Error("Task ID and new status are required");
      }

      
      if (!ObjectId.isValid(taskId)) {
        throw new Error("Invalid task ID format");
      }

      const result = await taskService.updateTaskStatus(companyId, taskId, newStatus);

      if (!result.done) {
        console.error("[Task] Failed to update task status", { error: result.error });
      }

      socket.emit("task:updateStatus-response", result);

      
      io.to(`company_${companyId}`).emit("task:status-updated", {
        taskId,
        newStatus,
        updatedBy: socket.user?.sub
      });
    } catch (error) {
      console.error("[Task] Error in task:updateStatus", { error: error.message });
      socket.emit("task:updateStatus-response", { done: false, error: error.message });
    }
  });
};

export default taskController;
