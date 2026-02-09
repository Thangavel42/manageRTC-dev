/**
 * Soft Delete Plugin for Mongoose Schemas
 *
 * This plugin adds soft delete functionality to Mongoose schemas:
 * - Automatically filters out soft-deleted documents in find/findOne queries
 * - Adds softDelete() instance method
 * - Adds restore() instance method
 * - Adds isDeleted field with index
 *
 * @module models/plugins/softDelete
 */

/**
 * Soft delete plugin function
 * @param {Object} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
export const softDeletePlugin = (schema, options = {}) => {
  const { deletedAt = true, deletedBy = true, overrideMethods = true } = options;

  // Add isDeleted field if not already defined
  if (!schema.path('isDeleted')) {
    schema.add({
      isDeleted: {
        type: Boolean,
        default: false,
        index: true
      }
    });
  }

  // Add deletedAt field if option is enabled
  if (deletedAt && !schema.path('deletedAt')) {
    schema.add({
      deletedAt: {
        type: Date,
        default: null
      }
    });
  }

  // Add deletedBy field if option is enabled
  if (deletedBy && !schema.path('deletedBy')) {
    schema.add({
      deletedBy: {
        type: String, // or ObjectId if referencing User
        default: null
      }
    });
  }

  // Pre-find hook to filter out soft-deleted documents
  if (overrideMethods !== false) {
    schema.pre('find', function() {
      const conditions = this.getFilter();
      // Only add isDeleted filter if not explicitly querying for deleted documents
      if (!conditions.hasOwnProperty('isDeleted') && !conditions.hasOwnProperty('$or')) {
        this.where({ isDeleted: { $ne: true } });
      }
    });

    schema.pre('findOne', function() {
      const conditions = this.getFilter();
      // Only add isDeleted filter if not explicitly querying for deleted documents
      if (!conditions.hasOwnProperty('isDeleted') && !conditions.hasOwnProperty('$or')) {
        this.where({ isDeleted: { $ne: true } });
      }
    });

    schema.pre('countDocuments', function() {
      const conditions = this.getFilter();
      // Only add isDeleted filter if not explicitly querying for deleted documents
      if (!conditions.hasOwnProperty('isDeleted') && !conditions.hasOwnProperty('$or')) {
        this.where({ isDeleted: { $ne: true } });
      }
    });

    schema.pre('aggregate', function() {
      // Add $match stage to filter out soft-deleted documents
      // Check if the first stage is already a $match on isDeleted
      const pipeline = this.pipeline();
      const firstStage = pipeline[0];

      if (!firstStage || !firstStage.$match || !firstStage.$match.hasOwnProperty('isDeleted')) {
        this.pipeline().unshift({
          $match: { isDeleted: { $ne: true } }
        });
      }
    });
  }

  /**
   * Instance method: Soft delete the document
   * @param {String} userId - ID of the user performing the deletion
   * @returns {Promise} Saved document
   */
  schema.methods.softDelete = async function(userId) {
    this.isDeleted = true;

    if (deletedAt) {
      this.deletedAt = new Date();
    }

    if (deletedBy) {
      this.deletedBy = userId;
    }

    return this.save();
  };

  /**
   * Instance method: Restore a soft-deleted document
   * @returns {Promise} Saved document
   */
  schema.methods.restore = async function() {
    this.isDeleted = false;

    if (deletedAt) {
      this.deletedAt = null;
    }

    if (deletedBy) {
      this.deletedBy = null;
    }

    return this.save();
  };

  /**
   * Static method: Find only soft-deleted documents
   * @param {Object} query - Mongoose query
   * @returns {Promise} Query result
   */
  schema.statics.findDeleted = function(query = {}) {
    return this.find({ ...query, isDeleted: true });
  };

  /**
   * Static method: Find only non-deleted documents (explicit)
   * @param {Object} query - Mongoose query
   * @returns {Promise} Query result
   */
  schema.statics.findActive = function(query = {}) {
    return this.find({ ...query, isDeleted: { $ne: true } });
  };

  /**
   * Static method: Permanently delete soft-deleted documents
   * @param {Object} query - Mongoose query
   * @returns {Promise} Delete result
   */
  schema.statics.hardDelete = function(query = {}) {
    return this.deleteMany({ ...query, isDeleted: true });
  };

  /**
   * Static method: Permanently delete all soft-deleted documents
   * @returns {Promise} Delete result
   */
  schema.statics.purgeDeleted = function() {
    return this.deleteMany({ isDeleted: true });
  };

  /**
   * Static method: Restore soft-deleted documents
   * @param {Object} query - Mongoose query
   * @returns {Promise} Update result
   */
  schema.statics.restoreDeleted = function(query = {}) {
    const update = { isDeleted: false };

    if (deletedAt) {
      update.deletedAt = null;
    }

    if (deletedBy) {
      update.deletedBy = null;
    }

    return this.updateMany(
      { ...query, isDeleted: true },
      { $set: update }
    );
  };

  /**
   * Static method: Count soft-deleted documents
   * @param {Object} query - Mongoose query
   * @returns {Promise} Count result
   */
  schema.statics.countDeleted = function(query = {}) {
    return this.countDocuments({ ...query, isDeleted: true });
  };

  /**
   * Static method: Count active (non-deleted) documents
   * @param {Object} query - Mongoose query
   * @returns {Promise} Count result
   */
  schema.statics.countActive = function(query = {}) {
    return this.countDocuments({ ...query, isDeleted: { $ne: true } });
  };
};

/**
 * Mixin for schemas that need soft delete with audit trail
 * Adds additional audit fields
 */
export const softDeleteWithAudit = (schema) => {
  // Apply base soft delete plugin
  softDeletePlugin(schema, { deletedAt: true, deletedBy: true });

  // Add additional audit fields if not already defined
  if (!schema.path('deletedByName')) {
    schema.add({
      deletedByName: {
        type: String,
        default: null
      }
    });
  }

  if (!schema.path('deleteReason')) {
    schema.add({
      deleteReason: {
        type: String,
        default: null
      }
    });
  }

  // Override softDelete to include audit info
  const originalSoftDelete = schema.methods.softDelete;
  schema.methods.softDelete = async function(userId, deleteReason = null, userName = null) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;

    if (deleteReason) {
      this.deleteReason = deleteReason;
    }

    if (userName) {
      this.deletedByName = userName;
    }

    return this.save();
  };
};

export default softDeletePlugin;
