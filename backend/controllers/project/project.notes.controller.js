import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import * as projectNotesService from '../../services/project/project.notes.services.js';

const projectNotesController = (socket, io) => {
  const validateCompanyAccess = (socket) => {
    if (!socket.companyId) {
      devError('[ProjectNotes] Company ID not found in user metadata', {
        user: socket.user?.sub,
      });
      throw new Error('Company ID not found in user metadata');
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      devError(`[ProjectNotes] Invalid company ID format: ${socket.companyId}`);
      throw new Error('Invalid company ID format');
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      devError(
        `[ProjectNotes] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
      );
      throw new Error('Unauthorized: Company ID mismatch');
    }
    return socket.companyId;
  };

  const isAuthorized = socket.userMetadata?.role?.toLowerCase() === 'admin' || socket.userMetadata?.role?.toLowerCase() === 'hr';

  socket.on('project/notes:create', async (data) => {
    try {
      devLog('[ProjectNotes] project/notes:create event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        projectId: data.projectId,
        title: data.title,
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);

      if (!data.title || !data.content || !data.projectId) {
        throw new Error('Title, content, and projectId are required');
      }

      // Add createdBy from socket user information (don't add companyId to noteData)
      const noteData = {
        projectId: data.projectId,
        title: data.title,
        content: data.content,
        priority: data.priority,
        tags: data.tags,
        createdBy: socket.user?.sub || socket.userMetadata?.userId || 'unknown',
      };

      devLog('[ProjectNotes] Creating note with data:', {
        projectId: noteData.projectId,
        title: noteData.title,
      });
      const result = await projectNotesService.createProjectNote(companyId, noteData);
      devLog('[ProjectNotes] Create result:', {
        done: result.done,
        error: result.error,
        noteId: result.data?._id,
      });

      if (!result.done) {
        devError('[ProjectNotes] Failed to create project note', { error: result.error });
      }
      socket.emit('project/notes:create-response', result);

      io.to(`company_${companyId}`).emit('project/notes:note-created', result);
    } catch (error) {
      devError('[ProjectNotes] Error in project/notes:create', {
        error: error.message,
        stack: error.stack,
      });
      socket.emit('project/notes:create-response', { done: false, error: error.message });
    }
  });

  socket.on('project/notes:getAll', async ({ projectId, filters = {} }) => {
    try {
      devLog('[ProjectNotes] project/notes:getAll event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        projectId,
        filters,
      });
      const companyId = validateCompanyAccess(socket);

      if (!projectId) {
        throw new Error('projectId is required');
      }

      const result = await projectNotesService.getProjectNotes(companyId, projectId, filters);
      if (!result.done) {
        devError('[ProjectNotes] Failed to get project notes', { error: result.error });
      }
      socket.emit('project/notes:getAll-response', result);
    } catch (error) {
      devError('[ProjectNotes] Error in project/notes:getAll', { error: error.message });
      socket.emit('project/notes:getAll-response', { done: false, error: error.message });
    }
  });

  socket.on('project/notes:getById', async (noteId) => {
    try {
      devLog('[ProjectNotes] project/notes:getById event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        noteId,
      });
      const companyId = validateCompanyAccess(socket);
      const result = await projectNotesService.getProjectNoteById(companyId, noteId);
      if (!result.done) {
        devError('[ProjectNotes] Failed to get project note', { error: result.error });
      }
      socket.emit('project/notes:getById-response', result);
    } catch (error) {
      devError('[ProjectNotes] Error in project/notes:getById', { error: error.message });
      socket.emit('project/notes:getById-response', { done: false, error: error.message });
    }
  });

  socket.on('project/notes:update', async ({ noteId, update }) => {
    try {
      devLog('[ProjectNotes] project/notes:update event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        noteId,
        updateFields: Object.keys(update),
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);

      devLog('[ProjectNotes] Updating note:', { noteId, title: update.title });
      const result = await projectNotesService.updateProjectNote(companyId, noteId, update);
      devLog('[ProjectNotes] Update result:', { done: result.done, error: result.error });

      if (!result.done) {
        devError('[ProjectNotes] Failed to update project note', { error: result.error });
      }
      socket.emit('project/notes:update-response', result);

      io.to(`company_${companyId}`).emit('project/notes:note-updated', result);
    } catch (error) {
      devError('[ProjectNotes] Error in project/notes:update', { error: error.message });
      socket.emit('project/notes:update-response', { done: false, error: error.message });
    }
  });

  socket.on('project/notes:delete', async ({ noteId }) => {
    try {
      devLog('[ProjectNotes] project/notes:delete event', {
        user: socket.user?.sub,
        role: socket.userMetadata?.role,
        companyId: socket.companyId,
        noteId,
      });
      if (!isAuthorized) throw new Error('Unauthorized: Admin or HR only');
      const companyId = validateCompanyAccess(socket);

      devLog('[ProjectNotes] Deleting note:', { noteId });
      const result = await projectNotesService.deleteProjectNote(companyId, noteId);
      devLog('[ProjectNotes] Delete result:', { done: result.done, error: result.error });

      if (!result.done) {
        devError('[ProjectNotes] Failed to delete project note', { error: result.error });
      }
      socket.emit('project/notes:delete-response', result);

      io.to(`company_${companyId}`).emit('project/notes:note-deleted', result);
    } catch (error) {
      devError('[ProjectNotes] Error in project/notes:delete', { error: error.message });
      socket.emit('project/notes:delete-response', { done: false, error: error.message });
    }
  });
};

export default projectNotesController;
