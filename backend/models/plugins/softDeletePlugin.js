/**
 * Soft Delete Plugin for Mongoose Schemas
 * Provides consistent soft delete functionality across all models
 * Automatically filters out deleted documents in queries
 */

/**
 * Soft delete plugin that adds soft delete functionality to Mongoose schemas
 * @param {Schema} schema - The Mongoose schema to apply the plugin to
 * @param {Object} options - Plugin options
 * @param {string} options.deletedFieldName - Name of the deleted flag field (default: 'isDeleted')
 * @param {string} options.deletedAtFieldName - Name of the deleted timestamp field (default: 'deletedAt')
 * @param {string} options.deletedByFieldName - Name of the deleted by user field (default: 'deletedBy')
 * @param {boolean} options.overrideMethods - Whether to override default methods (default: true)
 */
export const softDeletePlugin = (schema, options = {}) => {
  // Configuration
  const deletedFieldName = options.deletedFieldName || 'isDeleted';
  const deletedAtFieldName = options.deletedAtFieldName || 'deletedAt';
  const deletedByFieldName = options.deletedByFieldName || 'deletedBy';
  const overrideMethods = options.overrideMethods !== false;

  // Add fields to schema if they don't exist
  if (!schema.path(deletedFieldName)) {
    schema.add({
      [deletedFieldName]: {
        type: Boolean,
        default: false,
        index: true
      }
    });
  }

  if (!schema.path(deletedAtFieldName)) {
    schema.add({
      [deletedAtFieldName]: {
        type: Date
      }
    });
  }

  if (!schema.path(deletedByFieldName)) {
    schema.add({
      [deletedByFieldName]: {
        type: schema.mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    });
  }

  // Pre-find hooks to filter out deleted documents
  schema.pre('find', function() {
    const query = this.getQuery();
    // Only filter if not explicitly querying for deleted documents
    if (query && query[deletedFieldName] === undefined) {
      this.where({ [deletedFieldName]: { $ne: true } });
    }
  });

  schema.pre('findOne', function() {
    const query = this.getQuery();
    if (query && query[deletedFieldName] === undefined) {
      this.where({ [deletedFieldName]: { $ne: true } });
    }
  });

  schema.pre('countDocuments', function() {
    const query = this.getQuery();
    if (query && query[deletedFieldName] === undefined) {
      this.where({ [deletedFieldName]: { $ne: true } });
    }
  });

  schema.pre('findOneAndUpdate', function() {
    const query = this.getQuery();
    if (query && query[deletedFieldName] === undefined) {
      this.where({ [deletedFieldName]: { $ne: true } });
    }
  });

  schema.pre('deleteOne', function() {
    // Convert hard delete to soft delete
    const query = this.getQuery();
    if (query && query[deletedFieldName] === undefined) {
      this.where({ [deletedFieldName]: { $ne: true } });
    }
  });

  // Instance method: Soft delete the document
  schema.methods.softDelete = async function(userId) {
    this[deletedFieldName] = true;
    this[deletedAtFieldName] = new Date();
    if (userId) {
      this[deletedByFieldName] = userId;
    }
    return this.save();
  };

  // Instance method: Restore the document
  schema.methods.restore = async function() {
    this[deletedFieldName] = false;
    this[deletedAtFieldName] = undefined;
    this[deletedByFieldName] = undefined;
    return this.save();
  };

  // Instance method: Check if document is deleted
  schema.methods.isDeleted = function() {
    return !!this[deletedFieldName];
  };

  // Static method: Find only deleted documents
  schema.statics.findDeleted = function(filter = {}) {
    return this.find({
      ...filter,
      [deletedFieldName]: true
    });
  };

  // Static method: Find only non-deleted documents (same as default find)
  schema.statics.findActive = function(filter = {}) {
    return this.find({
      ...filter,
      [deletedFieldName]: { $ne: true }
    });
  };

  // Static method: Count only active documents
  schema.statics.countActive = function(filter = {}) {
    return this.countDocuments({
      ...filter,
      [deletedFieldName]: { $ne: true }
    });
  };

  // Static method: Count only deleted documents
  schema.statics.countDeleted = function(filter = {}) {
    return this.countDocuments({
      ...filter,
      [deletedFieldName]: true
    });
  };

  // Static method: Permanently delete documents (hard delete)
  schema.statics.hardDelete = function(filter) {
    return this.deleteMany(filter);
  };

  // Static method: Restore multiple documents
  schema.statics.restoreMany = async function(filter) {
    return this.updateMany(
      {
        ...filter,
        [deletedFieldName]: true
      },
      {
        $unset: {
          [deletedFieldName]: '',
          [deletedAtFieldName]: '',
          [deletedByFieldName]: ''
        }
      }
    );
  };

  // Override deleteOne if requested
  if (overrideMethods) {
    schema.statics.deleteOne = async function(filter, userId) {
      const updateData = {
        [deletedFieldName]: true,
        [deletedAtFieldName]: new Date()
      };

      if (userId) {
        updateData[deletedByFieldName] = userId;
      }

      return this.updateOne(filter, { $set: updateData });
    };
  }
};

/**
 * Helper function to add soft delete to existing schema
 * @param {Schema} schema - The Mongoose schema
 * @param {Object} options - Plugin options
 */
export const addSoftDelete = (schema, options) => {
  schema.plugin(softDeletePlugin, options);
};

export default softDeletePlugin;
