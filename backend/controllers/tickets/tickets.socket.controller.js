import { getTenantCollections } from '../../config/db.js';
import * as ticketCategoriesService from '../../services/tickets/ticketCategories.service.js';
import * as ticketsService from '../../services/tickets/tickets.services.js';
import { devError, devLog, devWarn } from '../../utils/logger.js';

const ticketsSocketController = (socket, io) => {
  // Get current employee data (for ticket creation)
  socket.on('tickets/get-current-employee', async () => {
    try {
      const collections = getTenantCollections(socket.companyId);
      const clerkUserId = socket.userId;
      const userEmail = socket.clerkUser?.primaryEmailAddress?.emailAddress;
      const userRole = socket.role || 'employee';

      devLog('Fetching current employee for clerkUserId:', clerkUserId);
      devLog('User email:', userEmail);
      devLog('User role:', userRole);
      devLog('Socket companyId:', socket.companyId);

      // Try multiple lookup strategies to find the employee
      let employee = null;

      // Strategy 1: Find by clerkUserId (preferred method)
      employee = await collections.employees.findOne(
        { clerkUserId: clerkUserId },
        { projection: { _id: 1, employeeId: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1, avatar: 1, department: 1 } }
      );

      // Strategy 2: If not found by clerkUserId, try by email
      if (!employee && userEmail) {
        devWarn('Employee not found by clerkUserId, trying email lookup:', userEmail);
        employee = await collections.employees.findOne(
          { email: userEmail },
          { projection: { _id: 1, employeeId: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1, avatar: 1, department: 1 } }
        );

        // If found by email, update the employee record with clerkUserId for future lookups
        if (employee) {
          devLog('Employee found by email, updating clerkUserId field');
          await collections.employees.updateOne(
            { _id: employee._id },
            { $set: { clerkUserId: clerkUserId } }
          );
          devLog('Updated employee record with clerkUserId:', clerkUserId);
        }
      }

      // Strategy 3: For admin/superadmin users without employee records, auto-create one
      const isAdmin = ['admin', 'superadmin'].includes(userRole);
      if (!employee && isAdmin && userEmail) {
        devLog('Admin/Superadmin user without employee record. Creating placeholder employee...');

        // Get user info from Clerk
        const clerkFirstName = socket.clerkUser?.firstName || 'Admin';
        const clerkLastName = socket.clerkUser?.lastName || 'User';
        const clerkAvatar = socket.clerkUser?.imageUrl || null;

        // Generate a unique employee ID
        const employeeId = `ADM-${Date.now().toString().slice(-6)}`;

        // Create placeholder employee record
        const placeholderEmployee = {
          employeeId: employeeId,
          clerkUserId: clerkUserId,
          firstName: clerkFirstName,
          lastName: clerkLastName,
          email: userEmail,
          avatarUrl: clerkAvatar,
          avatar: clerkAvatar,
          role: userRole,
          account: {
            role: userRole,
            userName: userEmail,
          },
          employmentType: 'Full-time',
          employmentStatus: 'Active',
          status: 'Active',
          joiningDate: new Date(),
          companyId: socket.companyId,
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await collections.employees.insertOne(placeholderEmployee);
        employee = {
          _id: result.insertedId,
          ...placeholderEmployee,
        };
        devLog('✅ Created placeholder employee for admin user:', employeeId);
      }

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
        devError('Employee not found for clerkUserId:', clerkUserId, 'or email:', userEmail);
        socket.emit('tickets/get-current-employee-response', {
          done: false,
          error: `Employee record not found. Please contact your administrator to link your account (${userEmail || clerkUserId})`
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
      const userEmail = socket.clerkUser?.primaryEmailAddress?.emailAddress;
      const userRole = socket.role || 'employee';
      const isAdmin = ['admin', 'superadmin'].includes(userRole);

      // Try multiple lookup strategies
      let currentEmployee = await collections.employees.findOne(
        { clerkUserId: socket.userId },
        { projection: { _id: 1 } }
      );

      // Fallback to email lookup if clerkUserId not found
      if (!currentEmployee && userEmail) {
        devWarn('Current employee not found by clerkUserId, trying email lookup:', userEmail);
        currentEmployee = await collections.employees.findOne(
          { email: userEmail },
          { projection: { _id: 1 } }
        );

        // Update clerkUserId if found by email
        if (currentEmployee) {
          await collections.employees.updateOne(
            { _id: currentEmployee._id },
            { $set: { clerkUserId: socket.userId } }
          );
        }
      }

      // For admin/superadmin users without employee records, auto-create one
      if (!currentEmployee && isAdmin && userEmail) {
        devLog('Admin/Superadmin user without employee record. Creating placeholder employee...');

        const clerkFirstName = socket.clerkUser?.firstName || 'Admin';
        const clerkLastName = socket.clerkUser?.lastName || 'User';
        const clerkAvatar = socket.clerkUser?.imageUrl || null;
        const employeeId = `ADM-${Date.now().toString().slice(-6)}`;

        const placeholderEmployee = {
          employeeId: employeeId,
          clerkUserId: socket.userId,
          firstName: clerkFirstName,
          lastName: clerkLastName,
          email: userEmail,
          avatarUrl: clerkAvatar,
          avatar: clerkAvatar,
          role: userRole,
          account: {
            role: userRole,
            userName: userEmail,
          },
          employmentType: 'Full-time',
          employmentStatus: 'Active',
          status: 'Active',
          joiningDate: new Date(),
          companyId: socket.companyId,
          isActive: true,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await collections.employees.insertOne(placeholderEmployee);
        currentEmployee = { _id: result.insertedId, ...placeholderEmployee };
        devLog('✅ Created placeholder employee for admin user:', employeeId);
      }

      if (!currentEmployee) {
        socket.emit('tickets/assign-ticket-response', {
          done: false,
          error: `Current employee not found. Please contact administrator to link your account (${userEmail || socket.userId})`,
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
      const userEmail = socket.clerkUser?.primaryEmailAddress?.emailAddress;

      devLog('Getting tickets for user:', { userId, userEmail, userRole, data });

      const result = await ticketsService.getTicketsByUser(
        socket.companyId,
        userRole,
        userId,
        userEmail,
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
      const userEmail = socket.clerkUser?.primaryEmailAddress?.emailAddress;

      const result = await ticketsService.getTicketTabCounts(
        socket.companyId,
        userRole,
        userId,
        userEmail
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
