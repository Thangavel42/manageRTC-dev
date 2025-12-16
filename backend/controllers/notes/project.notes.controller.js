import * as projectNotesService from '../../services/notes/project.notes.services.js';

const projectNotesController = (socket, io) => {

  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[ProjectNotes] Company ID not found in user metadata", { user: socket.user?.sub });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[ProjectNotes] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(`[ProjectNotes] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`);
      throw new Error("Unauthorized: Company ID mismatch");
    }
    return socket.companyId;
  };

  const isAuthorized = socket.userMetadata?.role === "admin" || socket.userMetadata?.role === "hr";
  console.log("[ProjectNotes] Authorization check", { role: socket.userMetadata?.role, isAuthorized });

  
  socket.on("project/notes:create", async (data) => {
    try {
      console.log("[ProjectNotes] project/notes:create event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, data });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);

      if (!data.title || !data.content || !data.projectId) {
        throw new Error("Title, content, and projectId are required");
      }

      const result = await projectNotesService.createProjectNote(companyId, { ...data, companyId });
      if (!result.done) {
        console.error("[ProjectNotes] Failed to create project note", { error: result.error });
      }
      socket.emit("project/notes:create-response", result);

      
      io.to(`company_${companyId}`).emit("project/notes:note-created", result);
    } catch (error) {
      console.error("[ProjectNotes] Error in project/notes:create", { error: error.message });
      socket.emit("project/notes:create-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project/notes:getAll", async ({ projectId, filters = {} }) => {
    try {
      console.log("[ProjectNotes] project/notes:getAll event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, projectId, filters });
      const companyId = validateCompanyAccess(socket);

      if (!projectId) {
        throw new Error("projectId is required");
      }

      const result = await projectNotesService.getProjectNotes(companyId, projectId, filters);
      if (!result.done) {
        console.error("[ProjectNotes] Failed to get project notes", { error: result.error });
      }
      socket.emit("project/notes:getAll-response", result);
    } catch (error) {
      console.error("[ProjectNotes] Error in project/notes:getAll", { error: error.message });
      socket.emit("project/notes:getAll-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project/notes:getById", async (noteId) => {
    try {
      console.log("[ProjectNotes] project/notes:getById event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, noteId });
      const companyId = validateCompanyAccess(socket);
      const result = await projectNotesService.getProjectNoteById(companyId, noteId);
      if (!result.done) {
        console.error("[ProjectNotes] Failed to get project note", { error: result.error });
      }
      socket.emit("project/notes:getById-response", result);
    } catch (error) {
      console.error("[ProjectNotes] Error in project/notes:getById", { error: error.message });
      socket.emit("project/notes:getById-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project/notes:update", async ({ noteId, update }) => {
    try {
      console.log("[ProjectNotes] project/notes:update event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, noteId, update });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await projectNotesService.updateProjectNote(companyId, noteId, update);
      if (!result.done) {
        console.error("[ProjectNotes] Failed to update project note", { error: result.error });
      }
      socket.emit("project/notes:update-response", result);

      
      io.to(`company_${companyId}`).emit("project/notes:note-updated", result);
    } catch (error) {
      console.error("[ProjectNotes] Error in project/notes:update", { error: error.message });
      socket.emit("project/notes:update-response", { done: false, error: error.message });
    }
  });

  
  socket.on("project/notes:delete", async ({ noteId }) => {
    try {
      console.log("[ProjectNotes] project/notes:delete event", { user: socket.user?.sub, role: socket.userMetadata?.role, companyId: socket.companyId, noteId });
      if (!isAuthorized) throw new Error("Unauthorized: Admin or HR only");
      const companyId = validateCompanyAccess(socket);
      const result = await projectNotesService.deleteProjectNote(companyId, noteId);
      if (!result.done) {
        console.error("[ProjectNotes] Failed to delete project note", { error: result.error });
      }
      socket.emit("project/notes:delete-response", result);

      
      io.to(`company_${companyId}`).emit("project/notes:note-deleted", result);
    } catch (error) {
      console.error("[ProjectNotes] Error in project/notes:delete", { error: error.message });
      socket.emit("project/notes:delete-response", { done: false, error: error.message });
    }
  });
};

export default projectNotesController;
