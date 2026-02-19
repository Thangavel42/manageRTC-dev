import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

// Helper to populate employee data from ObjectId
const populateEmployee = async (collections, employeeId) => {
  if (!employeeId) return null;

  try {
    let id = employeeId;
    if (typeof employeeId === 'string') {
      id = new ObjectId(employeeId);
    }

    const employee = await collections.employees.findOne(
      { _id: id },
      { projection: { employeeId: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1, avatar: 1, department: 1 } }
    );

    if (!employee) {
      console.warn(`⚠️ Employee not found with ID: ${id}`);
      return null;
    }

    // Return avatarUrl as the primary field for frontend compatibility
    const avatarUrl = employee.avatarUrl || employee.avatar || 'assets/img/profiles/avatar-01.jpg';

    return {
      _id: employee._id.toString(),
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      avatarUrl: avatarUrl,
      avatar: avatarUrl, // Keep both for compatibility
      department: employee.department || 'General'
    };
  } catch (error) {
    console.error('Error populating employee:', error);
    return null;
  }
};

// Helper to populate employees in tickets
const populateTicketEmployees = async (collections, ticket) => {
  const populated = { ...ticket };

  // Convert _id to string
  if (populated._id) {
    populated._id = populated._id.toString();
  }

  // Populate createdBy
  if (populated.createdBy) {
    populated.createdBy = await populateEmployee(collections, populated.createdBy);
  }

  // Populate assignedTo
  if (populated.assignedTo) {
    console.log(`🔍 Populating assignedTo: ${populated.assignedTo}`);
    const populatedAssignee = await populateEmployee(collections, populated.assignedTo);
    console.log(`✅ Populated assignedTo:`, populatedAssignee ? 'SUCCESS' : 'NOT FOUND');

    // Always set to either populated employee or null
    populated.assignedTo = populatedAssignee || null;

    if (!populatedAssignee) {
      console.warn(`⚠️ AssignedTo employee not found. Set to null - frontend will show placeholder.`);
    }
  }

  // Populate assignedBy
  if (populated.assignedBy) {
    populated.assignedBy = await populateEmployee(collections, populated.assignedBy);
  }

  // Populate comments authors
  if (populated.comments && populated.comments.length > 0) {
    populated.comments = await Promise.all(
      populated.comments.map(async (comment) => ({
        ...comment,
        author: await populateEmployee(collections, comment.author) || {
          _id: null,
          firstName: 'Unknown',
          lastName: 'User',
          avatarUrl: 'assets/img/profiles/avatar-01.jpg',
          avatar: 'assets/img/profiles/avatar-01.jpg'
        }
      }))
    );
  }

  // Populate statusHistory changedBy
  if (populated.statusHistory && populated.statusHistory.length > 0) {
    populated.statusHistory = await Promise.all(
      populated.statusHistory.map(async (milestone) => ({
        ...milestone,
        changedBy: await populateEmployee(collections, milestone.changedBy) || {
          _id: null,
          employeeId: null,
          firstName: 'System',
          lastName: 'User',
          avatarUrl: 'assets/img/profiles/avatar-01.jpg',
          avatar: 'assets/img/profiles/avatar-01.jpg'
        }
      }))
    );
  }

  // Populate attachments uploadedBy
  if (populated.attachments && populated.attachments.length > 0) {
    populated.attachments = await Promise.all(
      populated.attachments.map(async (attachment) => ({
        ...attachment,
        uploadedBy: attachment.uploadedBy ? await populateEmployee(collections, attachment.uploadedBy) : null
      }))
    );
  }

  return populated;
};

// Get tickets dashboard statistics
export const getTicketsStats = async (tenantDbName) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    // Get ticket counts by status
    const statusStats = await collections.tickets.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get monthly ticket trends (last 12 months)
    const monthlyTrends = await collections.tickets.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 12))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]).toArray();

    // Get category counts
    const categoryStats = await collections.tickets.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Get agent workload (populate assignedTo)
    const agentStats = await collections.tickets.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedToData'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$assignedToData.firstName', 0] },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Calculate percentage changes (current month vs previous month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const currentMonthTickets = await collections.tickets.countDocuments({
      createdAt: {
        $gte: new Date(currentYear, currentMonth, 1),
        $lt: new Date(currentYear, currentMonth + 1, 1)
      }
    });

    const previousMonthTickets = await collections.tickets.countDocuments({
      createdAt: {
        $gte: new Date(previousYear, previousMonth, 1),
        $lt: new Date(previousYear, previousMonth + 1, 1)
      }
    });

    const percentageChange = previousMonthTickets > 0
      ? ((currentMonthTickets - previousMonthTickets) / previousMonthTickets * 100).toFixed(2)
      : 0;

    // Format monthly trends to ensure we have 12 months of data
    const monthlyTrendsArray = Array(12).fill(0);
    monthlyTrends.forEach(trend => {
      const monthIndex = trend._id.month - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        monthlyTrendsArray[monthIndex] = trend.count;
      }
    });

    // Format the data
    const stats = {
      newTickets: statusStats.find(s => s._id === 'New')?.count || 0,
      openTickets: statusStats.find(s => s._id === 'Open')?.count || 0,
      solvedTickets: statusStats.find(s => s._id === 'Solved')?.count || 0,
      pendingTickets: statusStats.find(s => s._id === 'On Hold')?.count || 0,
      percentageChange: parseFloat(percentageChange),
      monthlyTrends: monthlyTrendsArray,
      categoryStats: categoryStats,
      agentStats: agentStats
    };

    return { done: true, data: stats };
  } catch (error) {
    console.error('Error getting tickets stats:', error);
    return { done: false, error: error.message };
  }
};

// Get tickets list
export const getTicketsList = async (tenantDbName, options = {}) => {
  try {
    const collections = getTenantCollections(tenantDbName);
    const {
      status,
      priority,
      category,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await collections.tickets
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .toArray();

    // Populate employee data for all tickets
    const populatedTickets = await Promise.all(
      tickets.map(ticket => populateTicketEmployees(collections, ticket))
    );

    const total = await collections.tickets.countDocuments(filter);

    return {
      done: true,
      data: populatedTickets,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    };
  } catch (error) {
    console.error('Error getting tickets list:', error);
    return { done: false, error: error.message };
  }
};

// Get single ticket details
export const getTicketDetails = async (tenantDbName, ticketId) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    const ticket = await collections.tickets.findOne({ ticketId });

    if (!ticket) {
      return { done: false, error: 'Ticket not found' };
    }

    // Populate all employee references
    const populatedTicket = await populateTicketEmployees(collections, ticket);

    return {
      done: true,
      data: populatedTicket
    };
  } catch (error) {
    console.error('Error getting ticket details:', error);
    return { done: false, error: error.message };
  }
};

// Create new ticket
export const createTicket = async (tenantDbName, ticketData) => {
  try {
    console.log('createTicket called with:', { tenantDbName, ticketData });

    const collections = getTenantCollections(tenantDbName);
    console.log('Collections retrieved:', collections);

    // Generate ticket ID with proper error handling and race condition prevention
    let ticketId;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      attempts++;
      console.log(`🎫 Generating ticket ID (attempt ${attempts})`);

      // Find the highest ticket number to avoid race conditions
      const ticketsWithNumbers = await collections.tickets.find({
        ticketId: { $regex: /^TIC-\d{3,}$/ }
      }).toArray();

      console.log(`📊 Found ${ticketsWithNumbers.length} tickets with valid IDs`);

      let maxNumber = 0;
      ticketsWithNumbers.forEach(ticket => {
        const match = ticket.ticketId.match(/^TIC-(\d+)$/);
        if (match) {
          const number = parseInt(match[1]);
          if (!isNaN(number) && number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const newNumber = maxNumber + 1;
      ticketId = `TIC-${newNumber.toString().padStart(3, '0')}`;

      console.log(`🔢 Generated ticket ID: ${ticketId} (from max: ${maxNumber})`);

      // Check if this ID already exists (race condition protection)
      const existingTicket = await collections.tickets.findOne({ ticketId });
      if (!existingTicket) {
        break; // ID is unique, we can use it
      }

      console.log(`⚠️ Ticket ID ${ticketId} already exists, trying again...`);

    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      console.error('❌ Failed to generate unique ticket ID after maximum attempts');
      return { done: false, error: 'Failed to generate unique ticket ID' };
    }

    // Validate createdBy is provided
    if (!ticketData.createdBy) {
      return { done: false, error: 'createdBy ID is required' };
    }

    // Convert createdBy to ObjectId
    let createdByObjectId;
    try {
      createdByObjectId = typeof ticketData.createdBy === 'string'
        ? new ObjectId(ticketData.createdBy)
        : ticketData.createdBy;
    } catch (e) {
      return { done: false, error: 'Invalid createdBy ID format' };
    }

    // Initialize status history with Open status - store only changedBy ObjectId
    const statusHistory = [{
      status: 'Open',
      changedAt: new Date(),
      changedBy: createdByObjectId,
      note: 'Ticket created'
    }];

    // Create ticket document
    const ticketToInsert = {
      ticketId,
      title: ticketData.title || '',
      description: ticketData.description || '',
      category: ticketData.category || '',
      subCategory: ticketData.subCategory || '',
      priority: ticketData.priority || 'Medium',
      status: 'Open',
      createdBy: createdByObjectId,
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory,
      comments: [],
      attachments: [],
      tags: [],
    };

    console.log('✅ Final ticket ID:', ticketToInsert.ticketId);

    const insertResult = await collections.tickets.insertOne(ticketToInsert);
    console.log('Insert result:', insertResult);

    // Fetch the created ticket with populated data
    const createdTicket = await getTicketDetails(tenantDbName, ticketId);

    return {
      done: true,
      data: createdTicket.data,
      message: 'Ticket created successfully'
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    return { done: false, error: error.message };
  }
};

// Update ticket
export const updateTicket = async (tenantDbName, ticketId, updateData) => {
  try {
    console.log('🔄 UPDATE TICKET SERVICE CALLED:');
    console.log('🏢 Tenant DB:', tenantDbName);
    console.log('🎫 Ticket ID:', ticketId);
    console.log('📝 Update Data:', JSON.stringify(updateData, null, 2));

    const collections = getTenantCollections(tenantDbName);
    console.log('📚 Collections retrieved:', collections);

    // First, let's check if the ticket exists and get its current state
    const existingTicket = await collections.tickets.findOne({ ticketId });
    console.log('🔍 Existing ticket found:', existingTicket ? {
      ticketId: existingTicket.ticketId,
      title: existingTicket.title,
      priority: existingTicket.priority,
      status: existingTicket.status
    } : 'NOT FOUND');

    if (!existingTicket) {
      console.log('❌ Ticket not found with ID:', ticketId);
      return { done: false, error: 'Ticket not found' };
    }

    // Build update object
    const $set = { updatedAt: new Date() };

    // Handle comments array update directly
    if (updateData.comments && Array.isArray(updateData.comments)) {
      $set.comments = updateData.comments;
    }

    // Handle statusHistory array update directly
    if (updateData.statusHistory && Array.isArray(updateData.statusHistory)) {
      $set.statusHistory = updateData.statusHistory;
    }

    // Handle dot notation updates
    Object.keys(updateData).forEach(key => {
      if (key.startsWith('comments.') || key.startsWith('statusHistory.')) {
        $set[key] = updateData[key];
      }
    });

    // Handle top-level field updates
    const fieldsToUpdate = ['title', 'description', 'category', 'subCategory', 'priority', 'status', 'assignedTo', 'dueDate', 'closedAt', 'attachments', 'tags', 'estimatedHours', 'actualHours', 'resolution', 'isPrivate', 'department', 'location', 'urgency', 'slaDeadline'];

    fieldsToUpdate.forEach(field => {
      if (updateData[field] !== undefined) {
        if (field === 'assignedTo') {
          // Handle assignedTo - if it's an ObjectId (string or ObjectId), store directly
          if (updateData[field] === null || updateData[field] === '') {
            $set[field] = null;
          } else {
            let assignedToId;
            try {
              assignedToId = typeof updateData[field] === 'string'
                ? new ObjectId(updateData[field])
                : updateData[field];
              $set[field] = assignedToId;
            } catch (e) {
              console.error('Invalid assignedTo ID:', updateData[field]);
            }
          }
        } else if (field === 'status') {
          // Validate status transitions
          const currentStatus = existingTicket.status;
          const newStatus = updateData[field];

          console.log(`🔄 Status change requested: ${currentStatus} → ${newStatus}`);

          // Basic valid transitions for all users
          const validTransitions = {
            'Open': ['Assigned', 'In Progress', 'On Hold', 'Closed'],
            'Assigned': ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened'],
            'In Progress': ['Open', 'On Hold', 'Resolved', 'Closed'],
            'On Hold': ['In Progress', 'Resolved', 'Closed', 'Reopened'],
            'Resolved': ['In Progress', 'Closed', 'Reopened'],
            'Closed': ['Reopened'],
            'Reopened': ['In Progress', 'On Hold', 'Assigned', 'Resolved', 'Closed']
          };

          const allowedTransitions = validTransitions[currentStatus] || [];

          // Allow transition if it's in the valid list
          if (!allowedTransitions.includes(newStatus)) {
            console.warn(`❌ Invalid status transition: ${currentStatus} → ${newStatus}`);
            return {
              done: false,
              error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
            };
          }

          console.log(`✅ Valid status transition: ${currentStatus} → ${newStatus}`);
          $set[field] = newStatus;

          // Track status changes in history
          if (newStatus !== currentStatus) {
            const statusHistory = existingTicket.statusHistory || [];

            // Get changedBy from updateData or use existing ticket's createdBy
            let changedBy = updateData.changedBy;
            if (!changedBy) {
              changedBy = existingTicket.createdBy;
            }

            // Convert to ObjectId if needed
            let changedByObjectId;
            try {
              changedByObjectId = typeof changedBy === 'string' || typeof changedBy?._id === 'string'
                ? new ObjectId(typeof changedBy === 'string' ? changedBy : changedBy._id)
                : changedBy;
            } catch (e) {
              console.error('Invalid changedBy ID');
              changedByObjectId = existingTicket.createdBy;
            }

            statusHistory.push({
              status: newStatus,
              changedAt: new Date(),
              changedBy: changedByObjectId,
              note: `Status changed from ${existingTicket.status} to ${updateData[field]}`
            });

            $set.statusHistory = statusHistory;
          }
        } else {
          $set[field] = updateData[field];
        }
      }
    });

    console.log('🔄 $set object:', JSON.stringify($set, null, 2));

    const ticket = await collections.tickets.findOneAndUpdate(
      { ticketId },
      { $set },
      { returnDocument: 'after' }
    );
    console.log('📄 Updated ticket:', ticket ? {
      ticketId: ticket.ticketId,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      updatedAt: ticket.updatedAt
    } : 'UPDATE FAILED');

    if (!ticket) {
      console.log('❌ Ticket update failed');
      return { done: false, error: 'Ticket update failed' };
    }

    // Populate employee data for response
    const populatedTicket = await populateTicketEmployees(collections, ticket);

    console.log('✅ Ticket updated successfully');
    return {
      done: true,
      data: populatedTicket,
      message: 'Ticket updated successfully'
    };
  } catch (error) {
    console.error('❌ Error updating ticket:', error);
    return { done: false, error: error.message };
  }
};

// Add comment to ticket
export const addComment = async (tenantDbName, ticketId, commentData) => {
  try {
    const collections = getTenantCollections(tenantDbName);
    const { text, author, isInternal = false, attachments = [] } = commentData;

    // Store only author ObjectId (not full object)
    const authorId = author?._id || author;
    if (!authorId) {
      return { done: false, error: 'Author ID is required' };
    }

    // Convert to ObjectId if it's a string
    let authorObjectId;
    try {
      authorObjectId = typeof authorId === 'string'
        ? new ObjectId(authorId)
        : authorId;
    } catch (e) {
      return { done: false, error: 'Invalid author ID format' };
    }

    const comment = {
      text,
      author: authorObjectId,
      createdAt: new Date(),
      isInternal,
      attachments
    };

    const ticket = await collections.tickets.findOneAndUpdate(
      { ticketId },
      {
        $push: { comments: comment },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: 'after' }
    );

    if (!ticket) {
      return { done: false, error: 'Ticket not found' };
    }

    // Populate the ticket for response
    const populatedTicket = await populateTicketEmployees(collections, ticket);

    return {
      done: true,
      data: populatedTicket,
      message: 'Comment added successfully'
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { done: false, error: error.message };
  }
};

// Delete ticket
export const deleteTicket = async (tenantDbName, ticketId) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    const result = await collections.tickets.deleteOne({ ticketId });

    if (result.deletedCount === 0) {
      return { done: false, error: 'Ticket not found' };
    }

    return {
      done: true,
      message: 'Ticket deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return { done: false, error: error.message };
  }
};

// Bulk delete tickets
export const bulkDeleteTickets = async (tenantDbName, ticketIds) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    const result = await collections.tickets.deleteMany({
      ticketId: { $in: ticketIds }
    });

    return {
      done: true,
      message: `${result.deletedCount} tickets deleted successfully`
    };
  } catch (error) {
    console.error('Error bulk deleting tickets:', error);
    return { done: false, error: error.message };
  }
};

// Get all ticket categories
export const getTicketCategories = async (tenantDbName) => {
  try {
    const superAdminCollections = getTenantCollections('AmasQIS');
    const tenantCollections = getTenantCollections(tenantDbName);

    const categories = await superAdminCollections.ticketCategories
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();

    // Get ticket counts for each category from tenant DB
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const ticketCount = await tenantCollections.tickets.countDocuments({
          category: category.name
        });
        return {
          ...category,
          ticketCount: ticketCount
        };
      })
    );

    return {
      done: true,
      data: categoriesWithCounts,
      message: "Categories fetched successfully"
    };
  } catch (error) {
    console.error('Error fetching ticket categories:', error);
    return { done: false, error: error.message };
  }
};

// Add new ticket category
export const addTicketCategory = async (categoryData, userId = "System") => {
  try {
    const superAdminCollections = getTenantCollections('AmasQIS');

    // Validate required fields
    if (!categoryData.name || !categoryData.name.trim()) {
      return { done: false, error: "Category name is required" };
    }

    // Check if category already exists
    const existingCategory = await superAdminCollections.ticketCategories.findOne({
      name: { $regex: `^${categoryData.name.trim()}$`, $options: "i" }
    });

    if (existingCategory) {
      return { done: false, error: "Category already exists" };
    }

    // Create new category
    const newCategory = {
      name: categoryData.name.trim(),
      description: categoryData.description || '',
      icon: categoryData.icon || '',
      subCategories: categoryData.subCategories || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await superAdminCollections.ticketCategories.insertOne(newCategory);

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...newCategory
      },
      message: "Category added successfully"
    };
  } catch (error) {
    console.error('Error adding ticket category:', error);
    return { done: false, error: error.message };
  }
};

// Update ticket category
export const updateTicketCategory = async (categoryId, updateData) => {
  try {
    const superAdminCollections = getTenantCollections('AmasQIS');

    // Validate category ID
    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    const updates = {
      updatedAt: new Date()
    };

    if (updateData.name) updates.name = updateData.name.trim();
    if (updateData.description !== undefined) updates.description = updateData.description;
    if (updateData.icon !== undefined) updates.icon = updateData.icon;
    if (updateData.isActive !== undefined) updates.isActive = updateData.isActive;

    const result = await superAdminCollections.ticketCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Category not found" };
    }

    return {
      done: true,
      message: "Category updated successfully"
    };
  } catch (error) {
    console.error('Error updating ticket category:', error);
    return { done: false, error: error.message };
  }
};

// Delete ticket category
export const deleteTicketCategory = async (tenantDbName, categoryId) => {
  try {
    const superAdminCollections = getTenantCollections('AmasQIS');
    const tenantCollections = getTenantCollections(tenantDbName);

    // Validate category ID
    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    // Get category to check for tickets using it
    const category = await superAdminCollections.ticketCategories.findOne({
      _id: new ObjectId(categoryId)
    });

    if (!category) {
      return { done: false, error: "Category not found" };
    }

    // Check if any tickets are using this category
    const ticketsUsingCategory = await tenantCollections.tickets.countDocuments({
      category: category.name
    });

    if (ticketsUsingCategory > 0) {
      return {
        done: false,
        error: `Cannot delete category. ${ticketsUsingCategory} ticket(s) are using this category.`
      };
    }

    const result = await superAdminCollections.ticketCategories.deleteOne({
      _id: new ObjectId(categoryId)
    });

    if (result.deletedCount === 0) {
      return { done: false, error: "Category not found" };
    }

    return {
      done: true,
      message: "Category deleted successfully"
    };
  } catch (error) {
    console.error('Error deleting ticket category:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Get tickets for a user based on their role
 */
export const getTicketsByUser = async (tenantDbName, userRole, userId, options = {}) => {
  try {
    const collections = getTenantCollections(tenantDbName);
    const {
      status,
      priority,
      category,
      subCategory,
      tab, // New: tab parameter for filtering
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    // Build base filter
    let filter = {};

    // Get employee MongoDB _id for the current user
    const employee = await collections.employees.findOne(
      { clerkUserId: userId },
      { projection: { _id: 1 } }
    );

    const userObjectId = employee?._id;
    const isAdmin = ['superadmin', 'admin', 'hr'].includes(userRole);

    // Tab-based filtering
    if (tab) {
      console.log(`📋 Tab filtering: ${tab}, Sub-tab: ${options.subTab}, Role: ${userRole}`);

      switch (tab) {
        case 'my-tickets':
          // Check for sub-tab filtering (assigned-to-me or created-by-me)
          if (options.subTab === 'assigned-to-me') {
            // Only tickets assigned to the user
            filter.assignedTo = userObjectId;
            console.log(`📋 Sub-tab: Assigned to Me (assignedTo: ${userObjectId})`);
          } else if (options.subTab === 'created-by-me') {
            // Only tickets created by the user
            filter.createdBy = userObjectId;
            console.log(`📋 Sub-tab: Created by Me (createdBy: ${userObjectId})`);
          } else {
            // Default: Created OR Assigned tickets (for backward compatibility)
            filter.$or = [
              { createdBy: userObjectId },
              { assignedTo: userObjectId }
            ];
          }
          // Exclude closed by default for my-tickets tab
          filter.status = { $in: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Reopened'] };
          break;

        case 'closed':
          // Normal User & Admin: Closed tickets created or assigned to user
          filter.$or = [
            { createdBy: userObjectId },
            { assignedTo: userObjectId }
          ];
          filter.status = 'Closed';
          break;

        case 'new':
          // Admin only: Open tickets (unassigned)
          if (!isAdmin) {
            return { done: false, error: 'Access denied' };
          }
          filter.status = 'Open';
          break;

        case 'active':
          // Admin only: Assigned, In Progress, On Hold, Reopened
          if (!isAdmin) {
            return { done: false, error: 'Access denied' };
          }
          filter.status = { $in: ['Assigned', 'In Progress', 'On Hold', 'Reopened'] };
          break;

        case 'resolved':
          // Admin only: Resolved tickets
          if (!isAdmin) {
            return { done: false, error: 'Access denied' };
          }
          filter.status = 'Resolved';
          break;

        default:
          // No tab specified - use default behavior
          if (!isAdmin) {
            // For non-admin users without tab, show their active tickets
            filter.$or = [
              { createdBy: userObjectId },
              { assignedTo: userObjectId }
            ];
          }
          break;
      }
    } else {
      // No tab specified - use default behavior
      if (!isAdmin) {
        // For non-admin users, filter by created or assigned
        if (userObjectId) {
          filter.$or = [
            { createdBy: userObjectId },
            { assignedTo: userObjectId }
          ];
          console.log(`🔍 Filter tickets for user ${userId} (employee _id: ${userObjectId}):`, filter);
        } else {
          console.warn(`⚠️ Employee not found with clerkUserId: ${userId}`);
          return { done: false, error: 'Employee not found' };
        }
      } else {
        console.log(`👑 Admin user (${userRole}) - showing all tickets`);
      }
    }

    // Add additional filters (but don't override status from tab)
    if (status && !filter.status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tickets = await collections.tickets
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .toArray();

    // Populate employee data for all tickets
    const populatedTickets = await Promise.all(
      tickets.map(ticket => populateTicketEmployees(collections, ticket))
    );

    const total = await collections.tickets.countDocuments(filter);

    return {
      done: true,
      data: populatedTickets,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    };
  } catch (error) {
    console.error('Error getting tickets by user:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Get ticket counts by tab for a user
 */
export const getTicketTabCounts = async (tenantDbName, userRole, userId) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    // Get employee MongoDB _id
    const employee = await collections.employees.findOne(
      { clerkUserId: userId },
      { projection: { _id: 1 } }
    );

    const userObjectId = employee?._id;
    const isAdmin = ['superadmin', 'admin', 'hr'].includes(userRole);

    const counts = {};

    // Helper function to count tickets with a filter
    const countWithFilter = async (filter) => {
      return await collections.tickets.countDocuments(filter);
    };

    if (isAdmin) {
      // Admin tabs
      counts.new = await countWithFilter({ status: 'Open' });
      counts.active = await countWithFilter({ status: { $in: ['Assigned', 'In Progress', 'On Hold', 'Reopened'] } });
      counts.resolved = await countWithFilter({ status: 'Resolved' });
      counts.closed = await countWithFilter({ status: 'Closed' });
      counts['my-tickets'] = await countWithFilter({
        $or: [
          { createdBy: userObjectId },
          { assignedTo: userObjectId }
        ],
        status: { $in: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Reopened'] }
      });
    } else {
      // Normal user tabs
      counts['my-tickets'] = await countWithFilter({
        $or: [
          { createdBy: userObjectId },
          { assignedTo: userObjectId }
        ],
        status: { $in: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Reopened'] }
      });
      counts.closed = await countWithFilter({
        $or: [
          { createdBy: userObjectId },
          { assignedTo: userObjectId }
        ],
        status: 'Closed'
      });
    }

    return {
      done: true,
      data: counts
    };
  } catch (error) {
    console.error('Error getting ticket tab counts:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Assign a ticket to an employee (HR/Admin only)
 */
export const assignTicket = async (tenantDbName, ticketId, assigneeId, assignedBy) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    // Get the ticket
    const ticket = await collections.tickets.findOne({ ticketId });

    if (!ticket) {
      return { done: false, error: 'Ticket not found' };
    }

    // Validate assigneeId
    let assigneeObjectId;
    try {
      assigneeObjectId = new ObjectId(assigneeId);
    } catch (e) {
      return { done: false, error: 'Invalid assignee ID' };
    }

    // Get assignee employee to verify they exist
    const assignee = await collections.employees.findOne(
      { _id: assigneeObjectId },
      { projection: { firstName: 1, lastName: 1, employeeId: 1 } }
    );

    if (!assignee) {
      return { done: false, error: 'Employee not found' };
    }

    // Get assigned by employee
    let assignedByObjectId;
    try {
      assignedByObjectId = new ObjectId(assignedBy);
    } catch (e) {
      return { done: false, error: 'Invalid assignedBy ID' };
    }

    // Determine new status - auto change from Open to Assigned
    const newStatus = ticket.status === 'Open' ? 'Assigned' : ticket.status;

    // Add status history milestone - store only changedBy ObjectId
    const statusHistory = ticket.statusHistory || [];
    statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: assignedByObjectId,
      note: `Ticket assigned to ${assignee.employeeId} ${assignee.firstName} ${assignee.lastName}`
    });

    // Update ticket - store only ObjectIds
    const updatedTicket = await collections.tickets.findOneAndUpdate(
      { ticketId },
      {
        $set: {
          assignedTo: assigneeObjectId,
          assignedBy: assignedByObjectId,
          assignedAt: new Date(),
          status: newStatus,
          statusHistory: statusHistory,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedTicket) {
      return { done: false, error: 'Failed to assign ticket' };
    }

    // Populate employee data for response
    const populatedTicket = await populateTicketEmployees(collections, updatedTicket);

    return {
      done: true,
      data: populatedTicket,
      message: `Ticket assigned to ${assignee.employeeId} ${assignee.firstName} ${assignee.lastName}`
    };
  } catch (error) {
    console.error('Error assigning ticket:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Update ticket status with validation
 */
export const updateTicketStatus = async (tenantDbName, ticketId, newStatus, userId) => {
  try {
    const collections = getTenantCollections(tenantDbName);

    const ticket = await collections.tickets.findOne({ ticketId });

    if (!ticket) {
      return { done: false, error: 'Ticket not found' };
    }

    // Validate status transitions
    const validTransitions = {
      'Open': ['Assigned', 'Closed'],
      'Assigned': ['In Progress', 'On Hold', 'Closed'],
      'In Progress': ['On Hold', 'Resolved', 'Closed'],
      'On Hold': ['In Progress', 'Closed'],
      'Resolved': ['Closed', 'In Progress'],
      'Closed': ['Reopened'],
      'Reopened': ['In Progress', 'On Hold', 'Closed']
    };

    const currentStatus = ticket.status;
    const allowedTransitions = validTransitions[currentStatus] || [];

    // For ticket creator, they can only reopen closed/resolved tickets
    if (ticket.createdBy && ticket.createdBy.toString() === userId && newStatus === 'Reopened' && (currentStatus === 'Closed' || currentStatus === 'Resolved')) {
      // Allow reopening
    } else if ((currentStatus === 'Closed' || currentStatus === 'Resolved') && newStatus === 'Reopened') {
      // Only ticket creator can reopen
      if (ticket.createdBy && ticket.createdBy.toString() !== userId) {
        return { done: false, error: 'Only the ticket creator can reopen a closed/resolved ticket' };
      }
    } else if (!allowedTransitions.includes(newStatus)) {
      return {
        done: false,
        error: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`
      };
    }

    // Update status and track history - store only changedBy ObjectId
    const statusHistory = ticket.statusHistory || [];

    // Get user who changed status - convert to ObjectId
    let changedByObjectId;
    try {
      changedByObjectId = new ObjectId(userId);
    } catch (e) {
      return { done: false, error: 'Invalid user ID' };
    }

    statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy: changedByObjectId,
      note: `Status changed from ${currentStatus} to ${newStatus}`
    });

    const updatedTicket = await collections.tickets.findOneAndUpdate(
      { ticketId },
      {
        $set: {
          status: newStatus,
          statusHistory: statusHistory,
          updatedAt: new Date(),
          ...(newStatus === 'Closed' ? { closedAt: new Date() } : {})
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedTicket) {
      return { done: false, error: 'Failed to update ticket status' };
    }

    // Populate employee data for response
    const populatedTicket = await populateTicketEmployees(collections, updatedTicket);

    return {
      done: true,
      data: populatedTicket,
      message: `Ticket status updated to ${newStatus}`
    };
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return { done: false, error: error.message };
  }
};
