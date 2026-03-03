import { getTenantCollections } from '../../config/db.js';
import { ObjectId } from 'mongodb';

// Helper function to generate next time entry ID
const generateNextTimeEntryId = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    const lastEntry = await collections.timeEntries.findOne(
      {},
      { sort: { createdAt: -1 } }
    );

    let nextId = 1;
    if (lastEntry && lastEntry.timeEntryId) {
      const lastIdNumber = parseInt(lastEntry.timeEntryId.replace('TME-', ''));
      nextId = lastIdNumber + 1;
    }

    const timeEntryId = `TME-${String(nextId).padStart(4, '0')}`;
    return timeEntryId;
  } catch (error) {
    console.error('Error generating time entry ID:', error);
    throw error;
  }
};

// Helper function to parse date strings
const parseDateFromString = (dateString) => {
  if (!dateString) return undefined;
  try {
    const parsed = new Date(dateString);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  } catch (error) {
    console.error('[TimeTrackingService] Error parsing date:', { dateString, error });
    return undefined;
  }
};

/**
 * Create a new time entry
 */
export const createTimeEntry = async (companyId, timeEntryData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] createTimeEntry', { companyId, timeEntryData });

    // Generate time entry ID
    const timeEntryId = await generateNextTimeEntryId(companyId);

    const newTimeEntry = {
      ...timeEntryData,
      timeEntryId,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: timeEntryData.status || 'Draft',
      billable: timeEntryData.billable !== undefined ? timeEntryData.billable : true,
      billRate: timeEntryData.billRate || 0,
      duration: timeEntryData.duration || 0,
      isDeleted: false,
      date: parseDateFromString(timeEntryData.date),
      startTime: timeEntryData.startTime ? parseDateFromString(timeEntryData.startTime) : null,
      endTime: timeEntryData.endTime ? parseDateFromString(timeEntryData.endTime) : null,
    };

    // Convert projectId to ObjectId
    if (timeEntryData.projectId) {
      if (!ObjectId.isValid(timeEntryData.projectId)) {
        return { done: false, error: 'Invalid projectId format' };
      }
      newTimeEntry.projectId = new ObjectId(timeEntryData.projectId);
    }

    // Convert taskId to ObjectId if provided
    if (timeEntryData.taskId) {
      if (!ObjectId.isValid(timeEntryData.taskId)) {
        return { done: false, error: 'Invalid taskId format' };
      }
      newTimeEntry.taskId = new ObjectId(timeEntryData.taskId);
    }

    // Convert milestoneId to ObjectId if provided
    if (timeEntryData.milestoneId) {
      if (!ObjectId.isValid(timeEntryData.milestoneId)) {
        return { done: false, error: 'Invalid milestoneId format' };
      }
      newTimeEntry.milestoneId = new ObjectId(timeEntryData.milestoneId);
    }

    // Resolve and store employee MongoDB ObjectId for fast _id-based lookups
    if (timeEntryData.userId) {
      const emp = await collections.employees.findOne(
        { clerkUserId: timeEntryData.userId },
        { projection: { _id: 1, firstName: 1, lastName: 1, employeeId: 1, profileImage: 1 } }
      );
      if (emp) {
        newTimeEntry.employeeObjectId = emp._id;
      }
    }

    const result = await collections.timeEntries.insertOne(newTimeEntry);
    console.log('[TimeTrackingService] insertOne result', { result });

    if (result.insertedId) {
      const inserted = await collections.timeEntries.findOne({
        _id: result.insertedId,
      });
      console.log('[TimeTrackingService] inserted time entry', { inserted });
      return { done: true, data: inserted };
    } else {
      console.error('[TimeTrackingService] Failed to insert time entry');
      return { done: false, error: 'Failed to insert time entry' };
    }
  } catch (error) {
    console.error('[TimeTrackingService] Error in createTimeEntry', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get time entries by user
 * @param {string} companyId - Company ID
 * @param {string} userIdOrEmployeeId - Clerk userId or employeeId (EMP-XXXX format)
 * @param {object} filters - Query filters
 */
export const getTimeEntriesByUser = async (companyId, userIdOrEmployeeId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] getTimeEntriesByUser', { companyId, userIdOrEmployeeId, filters });

    // Determine if this is a userId (Clerk) or employeeId (EMP-XXXX)
    const isEmployeeId = userIdOrEmployeeId?.startsWith('EMP-');

    let query = {
      isDeleted: { $ne: true }
    };

    // Handle both userId (Clerk) and employeeId (EMP-XXXX) cases
    if (isEmployeeId) {
      // This is an employeeId - look up the user first
      const employee = await collections.employees.findOne({
        employeeId: userIdOrEmployeeId,
        isDeleted: { $ne: true }
      });

      if (!employee) {
        console.warn('[TimeTrackingService] Employee not found:', userIdOrEmployeeId);
        return { done: true, data: [] };
      }

      // Use the employee's Clerk userId for the lookup
      query.userId = employee.clerkUserId;
    } else {
      // This is a userId (Clerk) - use directly
      query.userId = userIdOrEmployeeId;
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Apply project filter
    if (filters.projectId && ObjectId.isValid(filters.projectId)) {
      query.projectId = new ObjectId(filters.projectId);
    }

    // Apply task filter
    if (filters.taskId && ObjectId.isValid(filters.taskId)) {
      query.taskId = new ObjectId(filters.taskId);
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    const sort = filters.sortBy ? { [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1 } : { date: -1 };

    const timeEntries = await collections.timeEntries
      .find(query)
      .sort(sort)
      .toArray();

    // Populate userDetails — prefer _id lookup via employeeObjectId stored on entries
    // (all new entries have employeeObjectId; fall back to clerkUserId for older entries)
    let employee = null;
    const sampleEntry = timeEntries.find(e => e.employeeObjectId);
    if (sampleEntry) {
      employee = await collections.employees.findOne(
        { _id: sampleEntry.employeeObjectId },
        { projection: { _id: 1, firstName: 1, lastName: 1, employeeId: 1, clerkUserId: 1, profileImage: 1 } }
      );
    }
    if (!employee && query.userId) {
      // Fallback: clerkUserId lookup for entries created before employeeObjectId was added
      employee = await collections.employees.findOne(
        { clerkUserId: query.userId },
        { projection: { _id: 1, firstName: 1, lastName: 1, employeeId: 1, clerkUserId: 1, profileImage: 1 } }
      );
    }

    const userDetails = employee ? {
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeId: employee.employeeId,
      userId: employee.clerkUserId,
      avatar: employee.profileImage || null
    } : null;

    // Populate projectDetails for all entries
    const projectIds = [...new Set(timeEntries
      .filter(entry => entry.projectId)
      .map(entry => entry.projectId.toString())
    )];

    const projects = await collections.projects.find({
      _id: { $in: projectIds.map(id => new ObjectId(id)) }
    }).toArray();

    const projectMap = new Map(
      projects.map(project => [project._id.toString(), {
        projectId: project.projectId,
        name: project.name
      }])
    );

    // Populate taskDetails for all entries
    const taskIds = [...new Set(timeEntries
      .filter(entry => entry.taskId)
      .map(entry => entry.taskId.toString())
    )];

    const tasks = await collections.tasks?.find({
      _id: { $in: taskIds.map(id => new ObjectId(id)) }
    }).toArray() || [];

    const taskMap = new Map(
      tasks.map(task => [task._id.toString(), {
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        priority: task.priority
      }])
    );

    // Enrich time entries with userDetails, projectDetails, and taskDetails
    const enrichedEntries = timeEntries.map(entry => ({
      ...entry,
      userDetails,
      projectDetails: entry.projectId ? projectMap.get(entry.projectId.toString()) : undefined,
      taskDetails: entry.taskId ? taskMap.get(entry.taskId.toString()) : undefined
    }));

    return { done: true, data: enrichedEntries };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeEntriesByUser', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get time entries by project
 */
export const getTimeEntriesByProject = async (companyId, projectId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] getTimeEntriesByProject', { companyId, projectId, filters });

    if (!ObjectId.isValid(projectId)) {
      return { done: false, error: 'Invalid project ID format' };
    }

    const query = {
      projectId: new ObjectId(projectId),
      isDeleted: { $ne: true }
    };

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Apply user filter
    if (filters.userId) {
      query.userId = filters.userId;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    const sort = { date: -1 };

    const timeEntries = await collections.timeEntries
      .find(query)
      .sort(sort)
      .toArray();

    // Populate userDetails — use employeeObjectId (_id) when available, fallback to clerkUserId
    const empObjectIds = [...new Set(
      timeEntries.filter(e => e.employeeObjectId).map(e => e.employeeObjectId.toString())
    )];
    const fallbackClerkIds = [...new Set(
      timeEntries.filter(e => !e.employeeObjectId && e.userId).map(e => e.userId)
    )];

    const empQuery = { $or: [] };
    if (empObjectIds.length > 0) {
      empQuery.$or.push({ _id: { $in: empObjectIds.map(id => new ObjectId(id)) } });
    }
    if (fallbackClerkIds.length > 0) {
      empQuery.$or.push({ clerkUserId: { $in: fallbackClerkIds } });
    }

    const employees = empQuery.$or.length > 0
      ? await collections.employees.find(empQuery).toArray()
      : [];

    const employeeByObjectId = new Map(
      employees.map(emp => [emp._id.toString(), {
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeId: emp.employeeId,
        userId: emp.clerkUserId,
        avatar: emp.profileImage || null
      }])
    );
    const employeeByClerkId = new Map(
      employees.map(emp => [emp.clerkUserId, {
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeId: emp.employeeId,
        userId: emp.clerkUserId,
        avatar: emp.profileImage || null
      }])
    );

    // Get project details
    const project = await collections.projects.findOne({
      _id: new ObjectId(projectId)
    });

    const projectDetails = project ? {
      projectId: project.projectId,
      name: project.name
    } : null;

    // Enrich time entries with userDetails and projectDetails
    const enrichedEntries = timeEntries.map(entry => ({
      ...entry,
      userDetails: entry.employeeObjectId
        ? employeeByObjectId.get(entry.employeeObjectId.toString())
        : employeeByClerkId.get(entry.userId),
      projectDetails
    }));

    return { done: true, data: enrichedEntries };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeEntriesByProject', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get time entries by task
 */
export const getTimeEntriesByTask = async (companyId, taskId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    if (!ObjectId.isValid(taskId)) {
      return { done: false, error: 'Invalid task ID format' };
    }

    const query = {
      taskId: new ObjectId(taskId),
      isDeleted: { $ne: true }
    };

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    const timeEntries = await collections.timeEntries
      .find(query)
      .sort({ date: -1 })
      .toArray();

    return { done: true, data: timeEntries };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeEntriesByTask', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get all time entries with filters
 */
export const getTimeEntries = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const query = { isDeleted: { $ne: true } };

    // Apply user filter
    if (filters.userId) {
      query.userId = filters.userId;
    }

    // Apply project filter — single projectId or array of projectIds (for PM/TL scope)
    if (filters.projectIds && Array.isArray(filters.projectIds) && filters.projectIds.length > 0) {
      query.projectId = { $in: filters.projectIds.map(id => new ObjectId(id)) };
    } else if (filters.projectId && ObjectId.isValid(filters.projectId)) {
      query.projectId = new ObjectId(filters.projectId);
    }

    // Apply task filter
    if (filters.taskId && ObjectId.isValid(filters.taskId)) {
      query.taskId = new ObjectId(filters.taskId);
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Apply billable filter
    if (filters.billable !== undefined) {
      query.billable = filters.billable === 'true' || filters.billable === true;
    }

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }

    // Apply search filter
    if (filters.search) {
      query.$or = [
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const sort = filters.sortBy ? { [filters.sortBy]: filters.sortOrder === 'asc' ? 1 : -1 } : { date: -1 };

    const timeEntries = await collections.timeEntries
      .find(query)
      .sort(sort)
      .toArray();

    // Populate userDetails — use employeeObjectId (_id lookup) when available,
    // fall back to clerkUserId string match for older entries without employeeObjectId
    const employeeObjectIds = [...new Set(
      timeEntries
        .filter(e => e.employeeObjectId)
        .map(e => e.employeeObjectId.toString())
    )];
    const clerkUserIds = [...new Set(
      timeEntries
        .filter(e => !e.employeeObjectId && e.userId)
        .map(e => e.userId)
    )];

    const employeeQuery = { $or: [] };
    if (employeeObjectIds.length > 0) {
      employeeQuery.$or.push({ _id: { $in: employeeObjectIds.map(id => new ObjectId(id)) } });
    }
    if (clerkUserIds.length > 0) {
      employeeQuery.$or.push({ clerkUserId: { $in: clerkUserIds } });
    }

    const employees = employeeQuery.$or.length > 0
      ? await collections.employees.find(employeeQuery).toArray()
      : [];

    // Build two maps: by ObjectId string and by clerkUserId
    const employeeByObjectId = new Map(
      employees.map(emp => [emp._id.toString(), {
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeId: emp.employeeId,
        userId: emp.clerkUserId,
        avatar: emp.profileImage || null
      }])
    );
    const employeeByClerkId = new Map(
      employees.map(emp => [emp.clerkUserId, {
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeId: emp.employeeId,
        userId: emp.clerkUserId,
        avatar: emp.profileImage || null
      }])
    );

    // Populate projectDetails for all entries
    const projectIds = [...new Set(timeEntries
      .filter(entry => entry.projectId)
      .map(entry => entry.projectId.toString())
    )];

    const projects = await collections.projects.find({
      _id: { $in: projectIds.map(id => new ObjectId(id)) }
    }).toArray();

    const projectMap = new Map(
      projects.map(project => [project._id.toString(), {
        projectId: project.projectId,
        name: project.name
      }])
    );

    // Populate taskDetails for all entries
    const taskIds = [...new Set(timeEntries
      .filter(entry => entry.taskId)
      .map(entry => entry.taskId.toString())
    )];

    const tasks = await collections.tasks?.find({
      _id: { $in: taskIds.map(id => new ObjectId(id)) }
    }).toArray() || [];

    const taskMap = new Map(
      tasks.map(task => [task._id.toString(), {
        taskId: task.taskId,
        title: task.title,
        status: task.status,
        priority: task.priority
      }])
    );

    // Enrich time entries with userDetails, projectDetails, and taskDetails
    const enrichedEntries = timeEntries.map(entry => ({
      ...entry,
      userDetails: entry.employeeObjectId
        ? employeeByObjectId.get(entry.employeeObjectId.toString())
        : employeeByClerkId.get(entry.userId),
      projectDetails: entry.projectId ? projectMap.get(entry.projectId.toString()) : undefined,
      taskDetails: entry.taskId ? taskMap.get(entry.taskId.toString()) : undefined
    }));

    return { done: true, data: enrichedEntries };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeEntries', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get time entry by ID
 */
export const getTimeEntryById = async (companyId, timeEntryId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] getTimeEntryById', { companyId, timeEntryId });

    if (!ObjectId.isValid(timeEntryId)) {
      return { done: false, error: 'Invalid time entry ID format' };
    }

    const timeEntry = await collections.timeEntries.findOne({
      _id: new ObjectId(timeEntryId),
      isDeleted: { $ne: true }
    });

    if (!timeEntry) {
      return { done: false, error: 'Time entry not found' };
    }

    // Populate user details
    const employee = await collections.employees.findOne({
      userId: timeEntry.userId
    });
    if (employee) {
      timeEntry.userDetails = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        userId: employee.userId
      };
    }

    // Populate project details
    if (timeEntry.projectId) {
      const project = await collections.projects.findOne({
        _id: timeEntry.projectId,
        isDeleted: { $ne: true }
      });
      if (project) {
        timeEntry.projectDetails = {
          projectId: project.projectId,
          name: project.name
        };
      }
    }

    // Populate task details
    if (timeEntry.taskId) {
      const task = await collections.tasks?.findOne({
        _id: timeEntry.taskId,
        isDeleted: { $ne: true }
      });
      if (task) {
        timeEntry.taskDetails = {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          priority: task.priority
        };
      }
    }

    return { done: true, data: timeEntry };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeEntryById', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Update time entry
 */
export const updateTimeEntry = async (companyId, timeEntryId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] updateTimeEntry', {
      companyId,
      timeEntryId,
      updateData,
    });

    if (!ObjectId.isValid(timeEntryId)) {
      return { done: false, error: 'Invalid time entry ID format' };
    }

    const existingEntry = await collections.timeEntries.findOne({
      _id: new ObjectId(timeEntryId),
    });

    if (!existingEntry) {
      return { done: false, error: 'Time entry not found' };
    }

    // Check if time entry is editable
    if (existingEntry.status !== 'Draft' && existingEntry.status !== 'Rejected') {
      return { done: false, error: 'Cannot edit time entry that has been submitted' };
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date(),
    };

    // Parse dates if provided
    if (updateData.date) {
      updateFields.date = parseDateFromString(updateData.date);
    }
    if (updateData.startTime) {
      updateFields.startTime = parseDateFromString(updateData.startTime);
    }
    if (updateData.endTime) {
      updateFields.endTime = parseDateFromString(updateData.endTime);
    }

    // Convert references to ObjectId if provided
    if (updateData.projectId && ObjectId.isValid(updateData.projectId)) {
      updateFields.projectId = new ObjectId(updateData.projectId);
    }
    if (updateData.taskId && ObjectId.isValid(updateData.taskId)) {
      updateFields.taskId = new ObjectId(updateData.taskId);
    }
    if (updateData.milestoneId && ObjectId.isValid(updateData.milestoneId)) {
      updateFields.milestoneId = new ObjectId(updateData.milestoneId);
    }

    const result = await collections.timeEntries.updateOne(
      { _id: new ObjectId(timeEntryId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: 'Time entry not found' };
    }

    const updatedEntry = await collections.timeEntries.findOne({
      _id: new ObjectId(timeEntryId),
    });

    return { done: true, data: updatedEntry };
  } catch (error) {
    console.error('[TimeTrackingService] Error in updateTimeEntry', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Delete time entry (soft delete)
 */
export const deleteTimeEntry = async (companyId, timeEntryId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] deleteTimeEntry', { companyId, timeEntryId });

    if (!ObjectId.isValid(timeEntryId)) {
      return { done: false, error: 'Invalid time entry ID format' };
    }

    const existingEntry = await collections.timeEntries.findOne({
      _id: new ObjectId(timeEntryId),
      companyId,
      isDeleted: { $ne: true },
    });

    if (!existingEntry) {
      return { done: false, error: 'Time entry not found' };
    }

    // Check if time entry is editable
    if (existingEntry.status !== 'Draft' && existingEntry.status !== 'Rejected') {
      return { done: false, error: 'Cannot delete time entry that has been submitted' };
    }

    const result = await collections.timeEntries.updateOne(
      { _id: new ObjectId(timeEntryId), companyId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: 'Time entry not found' };
    }

    return { done: true, data: existingEntry };
  } catch (error) {
    console.error('[TimeTrackingService] Error in deleteTimeEntry', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Submit timesheet for approval
 */
export const submitTimesheet = async (companyId, userId, timeEntryIds = []) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] submitTimesheet', { companyId, userId, timeEntryIds });

    // Build query for time entries to submit
    const query = {
      userId,
      status: 'Draft',
      isDeleted: { $ne: true }
    };

    // If specific entries provided, only submit those
    if (timeEntryIds && timeEntryIds.length > 0) {
      query._id = { $in: timeEntryIds.map(id => new ObjectId(id)) };
    }

    const result = await collections.timeEntries.updateMany(
      query,
      {
        $set: {
          status: 'Submitted',
          updatedAt: new Date()
        }
      }
    );

    return {
      done: true,
      data: {
        submittedCount: result.modifiedCount
      },
      message: `Submitted ${result.modifiedCount} time entries`
    };
  } catch (error) {
    console.error('[TimeTrackingService] Error in submitTimesheet', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Approve timesheet
 */
export const approveTimesheet = async (companyId, userId, timeEntryIds = [], approverId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] approveTimesheet', { companyId, userId, timeEntryIds, approverId });

    const query = {
      userId,
      status: 'Submitted',
      isDeleted: { $ne: true }
    };

    // If specific entries provided, only approve those
    if (timeEntryIds && timeEntryIds.length > 0) {
      query._id = { $in: timeEntryIds.map(id => new ObjectId(id)) };
    }

    const result = await collections.timeEntries.updateMany(
      query,
      {
        $set: {
          status: 'Approved',
          approvedBy: approverId,
          approvedDate: new Date(),
          updatedAt: new Date()
        }
      }
    );

    return {
      done: true,
      data: {
        approvedCount: result.modifiedCount
      },
      message: `Approved ${result.modifiedCount} time entries`
    };
  } catch (error) {
    console.error('[TimeTrackingService] Error in approveTimesheet', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Reject timesheet
 */
export const rejectTimesheet = async (companyId, userId, timeEntryIds = [], reviewerId, reason) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] rejectTimesheet', { companyId, userId, timeEntryIds, reviewerId, reason });

    const query = {
      userId,
      status: 'Submitted',
      isDeleted: { $ne: true }
    };

    // If specific entries provided, only reject those
    if (timeEntryIds && timeEntryIds.length > 0) {
      query._id = { $in: timeEntryIds.map(id => new ObjectId(id)) };
    }

    const result = await collections.timeEntries.updateMany(
      query,
      {
        $set: {
          status: 'Rejected',
          approvedBy: reviewerId,
          approvedDate: new Date(),
          rejectionReason: reason || '',
          updatedAt: new Date()
        }
      }
    );

    return {
      done: true,
      data: {
        rejectedCount: result.modifiedCount
      },
      message: `Rejected ${result.modifiedCount} time entries`
    };
  } catch (error) {
    console.error('[TimeTrackingService] Error in rejectTimesheet', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get time tracking statistics
 */
export const getTimeTrackingStats = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log('[TimeTrackingService] getTimeTrackingStats', { companyId, filters });

    const matchQuery = {
      companyId,
      isDeleted: { $ne: true }
    };

    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      matchQuery.date = {};
      if (filters.startDate) {
        matchQuery.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchQuery.date.$lte = new Date(filters.endDate);
      }
    }

    // Apply user filter
    if (filters.userId) {
      matchQuery.userId = filters.userId;
    }

    // Apply project filter
    if (filters.projectId && ObjectId.isValid(filters.projectId)) {
      matchQuery.projectId = new ObjectId(filters.projectId);
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$duration' },
          billableHours: {
            $sum: {
              $cond: ['$billable', '$duration', 0]
            }
          },
          totalEntries: { $sum: 1 },
          draftEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] }
          },
          submittedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'Submitted'] }, 1, 0] }
          },
          approvedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
          },
          rejectedEntries: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          },
          totalBilledAmount: {
            $sum: {
              $cond: [
                '$billable',
                { $multiply: ['$duration', '$billRate'] },
                0
              ]
            }
          }
        }
      }
    ];

    const stats = await collections.timeEntries.aggregate(pipeline).toArray();
    const result = stats[0] || {
      totalHours: 0,
      billableHours: 0,
      totalEntries: 0,
      draftEntries: 0,
      submittedEntries: 0,
      approvedEntries: 0,
      rejectedEntries: 0,
      totalBilledAmount: 0
    };

    // Get top users by hours
    const topUsersPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$userId',
          totalHours: { $sum: '$duration' },
          entryCount: { $sum: 1 }
        }
      },
      { $sort: { totalHours: -1 } },
      { $limit: 10 }
    ];

    const topUsers = await collections.timeEntries
      .aggregate(topUsersPipeline)
      .toArray();

    return {
      done: true,
      data: {
        ...result,
        topUsers
      }
    };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimeTrackingStats', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

/**
 * Get timesheet for a user (for approval/viewing)
 */
export const getTimesheet = async (companyId, userId, startDate, endDate) => {
  try {
    const collections = getTenantCollections(companyId);

    const query = {
      userId,
      isDeleted: { $ne: true }
    };

    // Apply date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const timeEntries = await collections.timeEntries
      .find(query)
      .sort({ date: -1 })
      .toArray();

    // Group by date
    const groupedByDate = {};
    timeEntries.forEach(entry => {
      const dateKey = new Date(entry.date).toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(entry);
    });

    // Calculate totals
    const totals = {
      totalHours: 0,
      billableHours: 0,
      totalEntries: timeEntries.length,
      billedAmount: 0
    };

    timeEntries.forEach(entry => {
      totals.totalHours += entry.duration || 0;
      if (entry.billable) {
        totals.billableHours += entry.duration || 0;
        totals.billedAmount += (entry.duration || 0) * (entry.billRate || 0);
      }
    });

    return {
      done: true,
      data: {
        entries: timeEntries,
        groupedByDate,
        totals
      }
    };
  } catch (error) {
    console.error('[TimeTrackingService] Error in getTimesheet', {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};
