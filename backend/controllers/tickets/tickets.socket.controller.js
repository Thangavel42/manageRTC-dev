import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import { getTenantCollections } from '../../config/db.js';
import * as ticketsService from '../../services/tickets/tickets.services.js';

const ticketsSocketController = (socket, io) => {
  // Get tickets dashboard statistics
  socket.on('tickets/dashboard/get-stats', async (data) => {
    try {
      const result = await ticketsService.getTicketsStats(socket.companyId);
      socket.emit('tickets/dashboard/get-stats-response', result);
    } catch (error) {
      devError('Error getting tickets stats:', error);
      socket.emit('tickets/dashboard/get-stats-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Get tickets list
  socket.on('tickets/list/get-tickets', async (data) => {
    try {
      const result = await ticketsService.getTicketsList(socket.companyId, data);
      socket.emit('tickets/list/get-tickets-response', result);
    } catch (error) {
      devError('Error getting tickets list:', error);
      socket.emit('tickets/list/get-tickets-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Get single ticket details
  socket.on('tickets/details/get-ticket', async (data) => {
    try {
      const { ticketId } = data;
      const result = await ticketsService.getTicketDetails(socket.companyId, ticketId);
      socket.emit('tickets/details/get-ticket-response', result);
    } catch (error) {
      devError('Error getting ticket details:', error);
      socket.emit('tickets/details/get-ticket-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Create new ticket
  socket.on('tickets/create-ticket', async (data) => {
    try {
      devLog('Creating ticket with data:', data);
      devLog('Company ID:', socket.companyId);

      const result = await ticketsService.createTicket(socket.companyId, data);
      devLog('Create ticket result:', result);

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        devLog('📡 Broadcasting ticket-created event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-created', result);
        devLog('✅ Ticket-created event broadcasted successfully');
      }

      socket.emit('tickets/create-ticket-response', result);
    } catch (error) {
      devError('Error creating ticket:', error);
      socket.emit('tickets/create-ticket-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Update ticket
  socket.on('tickets/update-ticket', async (data) => {
    try {
      devLog('🔄 UPDATE TICKET REQUEST RECEIVED:');
      devLog('📦 Data received:', JSON.stringify(data, null, 2));
      devLog('🏢 Company ID:', socket.companyId);

      const { ticketId, updateData } = data;
      devLog('🎫 Ticket ID:', ticketId);
      devLog('📝 Update Data:', JSON.stringify(updateData, null, 2));

      const result = await ticketsService.updateTicket(socket.companyId, ticketId, updateData);
      devLog('✅ Update result:', JSON.stringify(result, null, 2));

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        devLog('📡 Broadcasting ticket-updated event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-updated', result);
        devLog('✅ Ticket-updated event broadcasted successfully');
      }

      socket.emit('tickets/update-ticket-response', result);
      devLog('📤 Sent response to client');
    } catch (error) {
      devError('❌ Error updating ticket:', error);
      socket.emit('tickets/update-ticket-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Add comment to ticket
  socket.on('tickets/add-comment', async (data) => {
    try {
      const { ticketId, text, author, isInternal = false, attachments = [] } = data;
      const commentData = { text, author, isInternal, attachments };
      const result = await ticketsService.addComment(socket.companyId, ticketId, commentData);

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/ticket-comment-added', result);
      }

      socket.emit('tickets/add-comment-response', result);
    } catch (error) {
      devError('Error adding comment:', error);
      socket.emit('tickets/add-comment-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Delete ticket
  socket.on('tickets/delete-ticket', async (data) => {
    try {
      const { ticketId } = data;
      const result = await ticketsService.deleteTicket(socket.companyId, ticketId);

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        devLog('📡 Broadcasting ticket-deleted event to company room:', companyRoom);
        io.to(companyRoom).emit('tickets/ticket-deleted', {
          done: true,
          ticketId: ticketId,
        });
        devLog('✅ Ticket-deleted event broadcasted successfully');
      }

      socket.emit('tickets/delete-ticket-response', result);
    } catch (error) {
      devError('Error deleting ticket:', error);
      socket.emit('tickets/delete-ticket-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Bulk delete tickets
  socket.on('tickets/bulk-delete-tickets', async (data) => {
    try {
      const { ticketIds } = data;
      const result = await ticketsService.bulkDeleteTickets(socket.companyId, ticketIds);

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/tickets-bulk-deleted', result);
      }

      socket.emit('tickets/bulk-delete-tickets-response', result);
    } catch (error) {
      devError('Error bulk deleting tickets:', error);
      socket.emit('tickets/bulk-delete-tickets-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Get ticket categories
  socket.on('tickets/categories/get-categories', async (data) => {
    try {
      const result = await ticketsService.getTicketCategories(socket.companyId);
      socket.emit('tickets/categories/get-categories-response', result);
    } catch (error) {
      devError('Error getting ticket categories:', error);
      socket.emit('tickets/categories/get-categories-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Get employees for assignment (IT Support department only)
  const IT_SUPPORT_DEPARTMENT_NAME = 'IT Support';

  socket.on('tickets/employees/get-list', async () => {
    try {
      const collections = getTenantCollections(socket.companyId);

      // Resolve IT Support department dynamically to avoid hardcoded ObjectId assumptions
      const itSupportDept = await collections.departments.findOne(
        { department: { $regex: `^${IT_SUPPORT_DEPARTMENT_NAME}$`, $options: 'i' } },
        { projection: { _id: 1, department: 1 } }
      );

      const deptValues = [];
      if (itSupportDept?._id) {
        deptValues.push(itSupportDept._id, String(itSupportDept._id));
      }

      const deptFilter = deptValues.length
        ? {
            $or: [
              { departmentId: { $in: deptValues } },
              { department: { $in: deptValues } },
              { departmentName: { $regex: `^${IT_SUPPORT_DEPARTMENT_NAME}$`, $options: 'i' } },
            ],
          }
        : {
            $or: [
              { department: { $regex: `^${IT_SUPPORT_DEPARTMENT_NAME}$`, $options: 'i' } },
              { departmentName: { $regex: `^${IT_SUPPORT_DEPARTMENT_NAME}$`, $options: 'i' } },
              { departmentId: IT_SUPPORT_DEPARTMENT_NAME },
            ],
          };

      const employees = await collections.employees
        .find({ status: { $in: ['Active', 'active'] }, ...deptFilter })
        .project({ firstName: 1, lastName: 1, email: 1, avatar: 1, employeeId: 1, departmentId: 1 })
        .sort({ firstName: 1, lastName: 1 })
        .toArray();

      // Get ticket counts per agent (exclude Closed and Solved tickets)
      const ticketCounts = await collections.tickets
        .aggregate([
          {
            $match: {
              status: { $nin: ['Closed', 'Solved'] },
            },
          },
          {
            $group: {
              _id: '$assignedTo._id',
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const ticketCountMap = {};
      ticketCounts.forEach((tc) => {
        if (tc._id) {
          ticketCountMap[String(tc._id)] = tc.count;
        }
      });

      const list = employees.map((e) => ({
        _id: String(e._id),
        employeeId: e.employeeId || '',
        firstName: e.firstName || '',
        lastName: e.lastName || '',
        email: e.email || '',
        avatar: e.avatar || null,
        departmentId: e.departmentId ? String(e.departmentId) : '',
        ticketCount: ticketCountMap[String(e._id)] || 0,
      }));

      socket.emit('tickets/employees/get-list-response', { done: true, data: list });
    } catch (error) {
      devError('Error fetching IT Support employees:', error);
      socket.emit('tickets/employees/get-list-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Add ticket category
  socket.on('tickets/categories/add-category', async (data) => {
    try {
      devLog('Adding ticket category with data:', data);
      const userId = socket.user?.sub || 'System';

      // Fetch employee info to get employeeId
      const collections = getTenantCollections(socket.companyId);
      const employee = await collections.employees.findOne(
        { userId: userId },
        { projection: { employeeId: 1 } }
      );

      const createdBy = employee?.employeeId || userId;
      const result = await ticketsService.addTicketCategory(socket.companyId, data, createdBy);

      if (result.done) {
        // Broadcast to all connected clients in the company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/category-created', result);
      }

      socket.emit('tickets/categories/add-category-response', result);
    } catch (error) {
      devError('Error adding ticket category:', error);
      socket.emit('tickets/categories/add-category-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Update ticket category
  socket.on('tickets/categories/update-category', async (data) => {
    try {
      const { categoryId, updateData } = data;
      const result = await ticketsService.updateTicketCategory(
        socket.companyId,
        categoryId,
        updateData
      );

      if (result.done) {
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/category-updated', result);
      }

      socket.emit('tickets/categories/update-category-response', result);
    } catch (error) {
      devError('Error updating ticket category:', error);
      socket.emit('tickets/categories/update-category-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Delete ticket category
  socket.on('tickets/categories/delete-category', async (data) => {
    try {
      const { categoryId } = data;
      const result = await ticketsService.deleteTicketCategory(socket.companyId, categoryId);

      if (result.done) {
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/category-deleted', {
          done: true,
          categoryId,
        });
      }

      socket.emit('tickets/categories/delete-category-response', result);
    } catch (error) {
      devError('Error deleting ticket category:', error);
      socket.emit('tickets/categories/delete-category-response', {
        done: false,
        error: error.message,
      });
    }
  });
};

export default ticketsSocketController;
