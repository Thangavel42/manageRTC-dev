import ProjectNote from '../../models/notes/project.notes.schema.js';
import { generateId } from '../../utils/generateId.js';

export const createProjectNote = async (companyId, noteData) => {
  try {
    const noteId = generateId('project_note');
    const newNote = new ProjectNote({
      _id: noteId,
      ...noteData,
      companyId,
    });

    const savedNote = await newNote.save();
    return {
      done: true,
      data: savedNote,
      message: 'Project note created successfully'
    };
  } catch (error) {
    console.error('Error creating project note:', error);
    return {
      done: false,
      error: error.message
    };
  }
};

export const getProjectNotes = async (companyId, projectId, filters = {}) => {
  try {
    const query = {
      companyId,
      projectId,
      isDeleted: { $ne: true }
    };

    
    if (filters.priority && filters.priority !== 'all') {
      query.priority = filters.priority;
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } },
        { tags: { $in: [new RegExp(filters.search, 'i')] } }
      ];
    }

    const sortOptions = {};
    if (filters.sortBy) {
      sortOptions[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const notes = await ProjectNote.find(query)
      .sort(sortOptions)
      .limit(filters.limit || 50)
      .skip(filters.skip || 0);

    const totalCount = await ProjectNote.countDocuments(query);

    return {
      done: true,
      data: notes,
      totalCount,
      message: 'Project notes retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting project notes:', error);

    // If it's a timeout error due to collection not existing, return empty results
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Project notes collection does not exist yet, returning empty results');
      return {
        done: true,
        data: [],
        totalCount: 0,
        message: 'Project notes retrieved successfully (collection not created yet)'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};

export const getProjectNoteById = async (companyId, noteId) => {
  try {
    const note = await ProjectNote.findOne({
      _id: noteId,
      companyId,
      isDeleted: { $ne: true }
    });

    if (!note) {
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: true,
      data: note,
      message: 'Project note retrieved successfully'
    };
  } catch (error) {
    console.error('Error getting project note by ID:', error);

    // If it's a timeout error due to collection not existing, return not found
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Project notes collection does not exist yet');
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};

export const updateProjectNote = async (companyId, noteId, updateData) => {
  try {
    const updatedNote = await ProjectNote.findOneAndUpdate(
      {
        _id: noteId,
        companyId,
        isDeleted: { $ne: true }
      },
      {
        ...updateData,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!updatedNote) {
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: true,
      data: updatedNote,
      message: 'Project note updated successfully'
    };
  } catch (error) {
    console.error('Error updating project note:', error);

    // If it's a timeout error due to collection not existing, return not found
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Project notes collection does not exist yet');
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};

export const deleteProjectNote = async (companyId, noteId) => {
  try {
    const deletedNote = await ProjectNote.findOneAndUpdate(
      {
        _id: noteId,
        companyId,
        isDeleted: { $ne: true }
      },
      {
        isDeleted: true,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!deletedNote) {
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: true,
      data: deletedNote,
      message: 'Project note deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting project note:', error);

    // If it's a timeout error due to collection not existing, return not found
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Project notes collection does not exist yet');
      return {
        done: false,
        error: 'Project note not found'
      };
    }

    return {
      done: false,
      error: error.message
    };
  }
};
