import Task from '../../models/task/task.schema.js';
import { generateId } from '../../utils/generateId.js';
import { getTenantCollections } from '../../config/db.js';
import { ObjectId } from 'mongodb';

export const createTask = async (companyId, taskData) => {
  try {
    const taskId = generateId('task');
    const newTask = new Task({
      _id: taskId,
      ...taskData,
      companyId,
    });

    const savedTask = await newTask.save();
    return {
      done: true,
      data: savedTask,
      message: 'Task created successfully'
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return {
      done: false,
      error: error.message
    };
  }
};

export const getTasks = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const query = {
      isDeleted: { $ne: true }
    };


    if (filters.projectId) {
      query.projectId = filters.projectId;
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    if (filters.assignee) {
      query.assignee = { $in: [filters.assignee] };
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $elemMatch: { $regex: searchRegex } } },
        { assignee: { $elemMatch: { $regex: searchRegex } } },
        { _id: { $regex: searchRegex } }
      ];
    }

    const sortOptions = {};
    if (filters.sortBy) {
      sortOptions[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const tasks = await collections.tasks
      .find(query)
      .sort(sortOptions)
      .limit(filters.limit || 50)
      .skip(filters.skip || 0)
      .toArray();

    const totalCount = await collections.tasks.countDocuments(query);

    return {
      done: true,
      data: tasks,
      totalCount,
      message: 'Tasks retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting tasks:', error);

    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet, returning empty results');
      return {
        done: true,
        data: [],
        totalCount: 0,
        message: 'Tasks retrieved successfully (collection not created yet)'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};


export const getTaskById = async (companyId, taskId) => {
  try {
    const collections = getTenantCollections(companyId);

    const task = await collections.tasks.findOne({
      _id: new ObjectId(taskId),
      isDeleted: { $ne: true }
    });

    if (!task) {
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: true,
      data: task,
      message: 'Task retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting task by ID:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet');
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};



export const updateTask = async (companyId, taskId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);

    const updatedTask = await collections.tasks.findOneAndUpdate(
      {
        _id: new ObjectId(taskId),
        isDeleted: { $ne: true }
      },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!updatedTask) {
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: true,
      data: updatedTask,
      message: 'Task updated successfully'
    };
  } catch (error) {
    console.error('Error updating task:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet');
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};



export const deleteTask = async (companyId, taskId) => {
  try {
    const collections = getTenantCollections(companyId);

    const deletedTask = await collections.tasks.findOneAndUpdate(
      {
        _id: new ObjectId(taskId),
        isDeleted: { $ne: true }
      },
      {
        $set: {
          isDeleted: true,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!deletedTask) {
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: true,
      data: deletedTask,
      message: 'Task deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting task:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet');
      return {
        done: false,
        error: 'Task not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};



export const getTasksByProject = async (companyId, projectId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const query = {
      projectId,
      isDeleted: { $ne: true }
    };


    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    if (filters.assignee) {
      query.assignee = { $in: [filters.assignee] };
    }

    const tasks = await collections.tasks.find(query).sort({ createdAt: -1 }).toArray();

    return {
      done: true,
      data: tasks,
      message: 'Project tasks retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting project tasks:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet, returning empty results');
      return {
        done: true,
        data: [],
        message: 'Project tasks retrieved successfully (collection not created yet)'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};



export const getTaskStats = async (companyId, projectId = null) => {
  try {
    const collections = getTenantCollections(companyId);

    const matchQuery = {
      isDeleted: { $ne: true }
    };

    if (projectId) {
      matchQuery.projectId = projectId;
    }

    const stats = await collections.tasks.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'Pending'] }, { $eq: ['$status', 'pending'] }] },
                1,
                0
              ]
            }
          },
          inprogress: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$status', 'Inprogress'] },
                  { $eq: ['$status', 'inprogress'] },
                  { $eq: ['$status', 'In Progress'] }
                ] },
                1,
                0
              ]
            }
          },
          completed: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ['$status', 'Completed'] }, { $eq: ['$status', 'completed'] }] },
                1,
                0
              ]
            }
          },
          onhold: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ['$status', 'Onhold'] },
                  { $eq: ['$status', 'onhold'] },
                  { $eq: ['$status', 'On Hold'] }
                ] },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      total: 0,
      pending: 0,
      inprogress: 0,
      completed: 0,
      onhold: 0
    };

    return {
      done: true,
      data: result,
      message: 'Task stats retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting task stats:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Tasks collection does not exist yet, returning empty stats');
      return {
        done: true,
        data: {
          total: 0,
          pending: 0,
          inprogress: 0,
          completed: 0,
          onhold: 0
        },
        message: 'Task stats retrieved successfully (collection not created yet)'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};




export const getTasksForKanban = async (companyId, projectId = null, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);

    const matchQuery = {
      isDeleted: { $ne: true }
    };

    if (projectId) {
      matchQuery.projectId = projectId;
    }

    
    if (filters.priority && filters.priority !== "all") {
      matchQuery.priority = filters.priority;
    }

    if (filters.status && filters.status !== "all") {
      matchQuery.status = filters.status;
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      matchQuery.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $elemMatch: { $regex: searchRegex } } },
        { assignee: { $elemMatch: { $regex: searchRegex } } },
        { _id: { $regex: searchRegex } }
      ];
    }

    
    if (filters.createdDate) {
      const createdDate = new Date(filters.createdDate);
      const nextDay = new Date(createdDate);
      nextDay.setDate(nextDay.getDate() + 1);

      matchQuery.createdAt = {
        $gte: createdDate,
        $lt: nextDay
      };
    }

    if (filters.dueDate) {
      const dueDate = new Date(filters.dueDate);
      const nextDay = new Date(dueDate);
      nextDay.setDate(nextDay.getDate() + 1);

      matchQuery.dueDate = {
        $gte: dueDate,
        $lt: nextDay
      };
    }

    const tasks = await collections.tasks
      .find(matchQuery)
      .sort({ createdAt: -1 })
      .toArray();

    
    const groupedTasks = {
      todo: tasks.filter(task => task.status === "Pending" || task.status === "pending"),
      inprogress: tasks.filter(task => task.status === "Inprogress" || task.status === "inprogress" || task.status === "In Progress"),
      completed: tasks.filter(task => task.status === "Completed" || task.status === "completed"),
      onhold: tasks.filter(task => task.status === "Onhold" || task.status === "onhold" || task.status === "On Hold")
    };

    return {
      done: true,
      data: groupedTasks,
      message: "Tasks retrieved successfully for kanban board"
    };
  } catch (error) {
    console.error("Error getting tasks for kanban:", error);
    return {
      done: false,
      error: error.message
    };
  }
};


export const updateTaskStatus = async (companyId, taskId, newStatus) => {
  try {
    const collections = getTenantCollections(companyId);

    const result = await collections.tasks.findOneAndUpdate(
      {
        _id: new ObjectId(taskId),
        isDeleted: { $ne: true }
      },
      {
        $set: {
          status: newStatus,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    if (!result) {
      return {
        done: false,
        error: "Task not found"
      };
    }

    return {
      done: true,
      data: result,
      message: "Task status updated successfully"
    };
  } catch (error) {
    console.error("Error updating task status:", error);
    return {
      done: false,
      error: error.message
    };
  }
};

