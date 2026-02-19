import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import { getTenantCollections } from '../../config/db.js';
import * as ticketsService from '../../services/tickets/tickets.services.js';
import * as ticketCategoriesService from '../../services/tickets/ticketCategories.service.js';

const ticketsSocketController = (socket, io) => {
  // Get current employee data (for ticket creation)
  socket.on('tickets/get-current-employee', async () => {
    try {
      const collections = getTenantCollections(socket.companyId);
      const clerkUserId = socket.userId;

      devLog('Fetching current employee for clerkUserId:', clerkUserId);
      devLog('Socket companyId:', socket.companyId);

      // Find employee by clerkUserId
      const employee = await collections.employees.findOne(
        { clerkUserId: clerkUserId },
        { projection: { _id: 1, employeeId: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1, avatar: 1, department: 1 } }
      );

      devLog('Found employee:', employee);

      if (employee) {
        // Convert _id to string for JSON serialization
        const employeeData = {
          ...employee,
          _id: employee._id.toString()
        };
        devLog('Sending employee data:', employeeData);
        socket.emit('tickets/get-current-employee-response', {
          done: true,
          data: employeeData
        });
      } else {
        devError('Employee not found for clerkUserId:', clerkUserId);
        socket.emit('tickets/get-current-employee-response', {
          done: false,
          error: 'Employee not found'
        });
      }
    } catch (error) {
      devError('Error getting current employee:', error);
      socket.emit('tickets/get-current-employee-response', {
        done: false,
        error: error.message,
      });
    }
  });

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
      // Note: Categories from superadmin DB, but need tenantDbName to get ticket counts
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
              _id: '$assignedTo',
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

  // Get all employees for assignment (HR/Admin)
  socket.on('tickets/employees/get-all-list', async () => {
    try {
      const collections = getTenantCollections(socket.companyId);

      const employees = await collections.employees
        .find({ status: { $in: ['Active', 'active'] } })
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
              _id: '$assignedTo',
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

      socket.emit('tickets/employees/get-all-list-response', { done: true, data: list });
    } catch (error) {
      devError('Error fetching all employees:', error);
      socket.emit('tickets/employees/get-all-list-response', {
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
      // Note: Categories stored in superadmin DB, no tenantDbName needed
      const result = await ticketsService.addTicketCategory(data, createdBy);

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
      // Note: Categories stored in superadmin DB, no tenantDbName needed
      const result = await ticketsService.updateTicketCategory(
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
      // Note: Categories from superadmin DB, but need tenantDbName to check for tickets using category
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

  // ===== NEW: Category/Subcategory Events =====

  // Get all main categories with subcategories
  // Note: Categories are stored in the superadmin database as system-wide configuration
  socket.on('tickets/categories/get-main-categories', async () => {
    try {
      const result = await ticketCategoriesService.getMainCategories();
      socket.emit('tickets/categories/get-main-categories-response', result);
    } catch (error) {
      devError('Error getting main categories:', error);
      socket.emit('tickets/categories/get-main-categories-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // Get subcategories for a specific category
  socket.on('tickets/categories/get-subcategories', async (data) => {
    try {
      const { categoryName } = data;
      const result = await ticketCategoriesService.getSubCategories(categoryName);
      socket.emit('tickets/categories/get-subcategories-response', result);
    } catch (error) {
      devError('Error getting subcategories:', error);
      socket.emit('tickets/categories/get-subcategories-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // ===== NEW: HR Assignment Events =====

  // Assign ticket to employee (HR/Admin only)
  socket.on('tickets/assign-ticket', async (data) => {
    try {
      const { ticketId, assigneeId } = data;

      // Get current employee _id from clerkUserId
      const collections = getTenantCollections(socket.companyId);
      const currentEmployee = await collections.employees.findOne(
        { clerkUserId: socket.userId },
        { projection: { _id: 1 } }
      );

      if (!currentEmployee) {
        socket.emit('tickets/assign-ticket-response', {
          done: false,
          error: 'Current employee not found',
        });
        return;
      }

      const assignedBy = currentEmployee._id.toString();

      const result = await ticketsService.assignTicket(
        socket.companyId,
        ticketId,
        assigneeId,
        assignedBy
      );

      if (result.done) {
        // Broadcast to company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/ticket-assigned', result);
      }

      socket.emit('tickets/assign-ticket-response', result);
    } catch (error) {
      devError('Error assigning ticket:', error);
      socket.emit('tickets/assign-ticket-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // ===== NEW: Role-Based Ticket List =====

  // Get tickets for current user (based on role)
  socket.on('tickets/get-my-tickets', async (data) => {
    try {
      const userRole = socket.role || 'employee';
      const userId = socket.userId;

      devLog('Getting tickets for user:', { userId, userRole, data });

      const result = await ticketsService.getTicketsByUser(
        socket.companyId,
        userRole,
        userId,
        data
      );

      socket.emit('tickets/get-my-tickets-response', result);
    } catch (error) {
      devError('Error getting my tickets:', error);
      socket.emit('tickets/get-my-tickets-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // ===== NEW: Get Tab Counts =====

  // Get ticket counts for each tab
  socket.on('tickets/get-tab-counts', async () => {
    try {
      const userRole = socket.role || 'employee';
      const userId = socket.userId;

      const result = await ticketsService.getTicketTabCounts(
        socket.companyId,
        userRole,
        userId
      );

      socket.emit('tickets/get-tab-counts-response', result);
    } catch (error) {
      devError('Error getting tab counts:', error);
      socket.emit('tickets/get-tab-counts-response', {
        done: false,
        error: error.message,
      });
    }
  });

  // ===== NEW: Update Ticket Status =====

  // Update ticket status with validation
  socket.on('tickets/update-status', async (data) => {
    try {
      const { ticketId, status } = data;
      const userId = socket.userId;

      const result = await ticketsService.updateTicketStatus(
        socket.companyId,
        ticketId,
        status,
        userId
      );

      if (result.done) {
        // Broadcast to company room
        const companyRoom = `company_${socket.companyId}`;
        io.to(companyRoom).emit('tickets/ticket-status-updated', result);
      }

      socket.emit('tickets/update-status-response', result);
    } catch (error) {
      devError('Error updating ticket status:', error);
      socket.emit('tickets/update-status-response', {
        done: false,
        error: error.message,
      });
    }
  });
};

export default ticketsSocketController;
