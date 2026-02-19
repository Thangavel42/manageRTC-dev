import { ObjectId } from "mongodb";
import { devLog, devError } from "../../utils/logger.js";

/**
 * Get all main ticket categories
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const getMainCategories = async () => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    const categories = await collections.ticketCategories
      .find({ isActive: true })
      .project({ name: 1, description: 1, icon: 1, subCategories: 1 })
      .sort({ name: 1 })
      .toArray();

    return {
      done: true,
      data: categories.map(cat => ({
        _id: cat._id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        subCategories: cat.subCategories?.filter(sub => sub.isActive) || []
      }))
    };
  } catch (error) {
    devError('Error getting main categories:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Get subcategories for a specific main category
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const getSubCategories = async (categoryName) => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    const category = await collections.ticketCategories.findOne({
      name: categoryName,
      isActive: true
    });

    if (!category) {
      return { done: false, error: 'Category not found' };
    }

    const activeSubCategories = category.subCategories?.filter(sub => sub.isActive) || [];

    return {
      done: true,
      data: {
        categoryName: category.name,
        subCategories: activeSubCategories
      }
    };
  } catch (error) {
    devError('Error getting subcategories:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Get all categories with their subcategories (for dropdowns)
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const getAllCategoriesWithSubs = async () => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    const categories = await collections.ticketCategories
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();

    return {
      done: true,
      data: categories
    };
  } catch (error) {
    devError('Error getting categories with subcategories:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Get ticket statistics by category
 * Note: Categories from superadmin DB, tickets from tenant DB
 */
export const getCategoryStats = async (tenantDbName) => {
  try {
    const superAdminCollections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());
    const tenantCollections = await import(`../../config/db.js`).then(m => m.getTenantCollections(tenantDbName));

    // Get all categories from superadmin DB
    const categories = await superAdminCollections.ticketCategories
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();

    // Get ticket counts by category from tenant DB
    const categoryStats = await tenantCollections.tickets.aggregate([
      {
        $group: {
          _id: {
            category: '$category',
            subCategory: '$subCategory'
          },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    // Map category names to their stats
    const result = categories.map(cat => {
      const catStats = categoryStats.filter(s => s._id.category === cat.name);
      const totalCount = catStats.reduce((sum, s) => sum + s.count, 0);

      return {
        _id: cat._id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        subCategories: cat.subCategories?.filter(sub => sub.isActive) || [],
        ticketCount: totalCount,
        subCategoryStats: cat.subCategories?.filter(sub => sub.isActive).map(sub => {
          const subStat = catStats.find(s => s._id.subCategory === sub.name);
          return {
            name: sub.name,
            ticketCount: subStat?.count || 0
          };
        }) || []
      };
    });

    return {
      done: true,
      data: result
    };
  } catch (error) {
    devError('Error getting category stats:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Add a new main category
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const addMainCategory = async (categoryData, userId = "System") => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    // Check if category already exists
    const existingCategory = await collections.ticketCategories.findOne({
      name: { $regex: `^${categoryData.name.trim()}$`, $options: "i" }
    });

    if (existingCategory) {
      return { done: false, error: "Category already exists" };
    }

    const newCategory = {
      name: categoryData.name.trim(),
      description: categoryData.description || '',
      icon: categoryData.icon || '',
      subCategories: categoryData.subCategories?.map(sub => ({
        name: sub.name,
        isActive: sub.isActive !== false
      })) || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await collections.ticketCategories.insertOne(newCategory);

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...newCategory
      },
      message: "Category added successfully"
    };
  } catch (error) {
    devError('Error adding main category:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Update a main category
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const updateMainCategory = async (categoryId, updateData) => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

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

    const result = await collections.ticketCategories.updateOne(
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
    devError('Error updating main category:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Delete a main category
 * Note: Categories from superadmin DB, tickets from tenant DB
 */
export const deleteMainCategory = async (tenantDbName, categoryId) => {
  try {
    const superAdminCollections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());
    const tenantCollections = await import(`../../config/db.js`).then(m => m.getTenantCollections(tenantDbName));

    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    // Check if any tickets are using this category (from tenant DB)
    const category = await superAdminCollections.ticketCategories.findOne({ _id: new ObjectId(categoryId) });

    if (!category) {
      return { done: false, error: "Category not found" };
    }

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
    devError('Error deleting main category:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Add subcategory to a main category
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const addSubCategory = async (categoryId, subCategoryName) => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    const category = await collections.ticketCategories.findOne({ _id: new ObjectId(categoryId) });

    if (!category) {
      return { done: false, error: "Category not found" };
    }

    // Check if subcategory already exists
    const existingSub = category.subCategories?.find(
      sub => sub.name.toLowerCase() === subCategoryName.trim().toLowerCase()
    );

    if (existingSub) {
      return { done: false, error: "Subcategory already exists" };
    }

    const result = await collections.ticketCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      {
        $push: {
          subCategories: {
            name: subCategoryName.trim(),
            isActive: true
          }
        },
        $set: { updatedAt: new Date() }
      }
    );

    return {
      done: true,
      message: "Subcategory added successfully"
    };
  } catch (error) {
    devError('Error adding subcategory:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Update subcategory
 * Note: Categories are stored in the superadmin (AmasQIS) database as system-wide configuration
 */
export const updateSubCategory = async (categoryId, subCategoryIndex, updateData) => {
  try {
    const collections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());

    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    const category = await collections.ticketCategories.findOne({ _id: new ObjectId(categoryId) });

    if (!category || !category.subCategories || !category.subCategories[subCategoryIndex]) {
      return { done: false, error: "Subcategory not found" };
    }

    const updateField = {};
    if (updateData.name) {
      updateField['subCategories.' + subCategoryIndex + '.name'] = updateData.name.trim();
    }
    if (updateData.isActive !== undefined) {
      updateField['subCategories.' + subCategoryIndex + '.isActive'] = updateData.isActive;
    }
    updateField['updatedAt'] = new Date();

    const result = await collections.ticketCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      { $set: updateField }
    );

    return {
      done: true,
      message: "Subcategory updated successfully"
    };
  } catch (error) {
    devError('Error updating subcategory:', error);
    return { done: false, error: error.message };
  }
};

/**
 * Delete subcategory
 * Note: Categories from superadmin DB, tickets from tenant DB
 */
export const deleteSubCategory = async (tenantDbName, categoryId, subCategoryIndex) => {
  try {
    const superAdminCollections = await import(`../../config/db.js`).then(m => m.getsuperadminCollections());
    const tenantCollections = await import(`../../config/db.js`).then(m => m.getTenantCollections(tenantDbName));

    if (!ObjectId.isValid(categoryId)) {
      return { done: false, error: "Invalid category ID" };
    }

    const category = await superAdminCollections.ticketCategories.findOne({ _id: new ObjectId(categoryId) });

    if (!category || !category.subCategories || !category.subCategories[subCategoryIndex]) {
      return { done: false, error: "Subcategory not found" };
    }

    const subCategoryName = category.subCategories[subCategoryIndex].name;

    // Check if any tickets are using this subcategory (from tenant DB)
    const ticketsUsingSub = await tenantCollections.tickets.countDocuments({
      category: category.name,
      subCategory: subCategoryName
    });

    if (ticketsUsingSub > 0) {
      return {
        done: false,
        error: `Cannot delete subcategory. ${ticketsUsingSub} ticket(s) are using this subcategory.`
      };
    }

    const result = await superAdminCollections.ticketCategories.updateOne(
      { _id: new ObjectId(categoryId) },
      {
        $unset: { ['subCategories.' + subCategoryIndex]: '' },
        $set: { updatedAt: new Date() }
      }
    );

    return {
      done: true,
      message: "Subcategory deleted successfully"
    };
  } catch (error) {
    devError('Error deleting subcategory:', error);
    return { done: false, error: error.message };
  }
};
