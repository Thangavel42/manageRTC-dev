/**
 * Module Service
 * Handles module and page-related business logic
 */

import mongoose from 'mongoose';
import Module from '../../models/rbac/module.schema.js';
import Page from '../../models/rbac/page.schema.js';

/**
 * Get all modules
 */
export async function getAllModules(filters = {}) {
  try {
    const { isActive } = filters;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const modules = await Module.find(query)
      .populate('pages.pageId')
      .sort({ sortOrder: 1 })
      .lean();

    // Add page counts
    return {
      success: true,
      data: modules.map(mod => ({
        ...mod,
        pageCount: mod.pages?.length || 0,
        activePageCount: mod.pages?.filter(p => p.isActive).length || 0,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get module by ID with pages
 */
export async function getModuleById(moduleId) {
  try {
    const mod = await Module.findById(moduleId)
      .populate('pages.pageId')
      .lean();

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    return {
      success: true,
      data: {
        ...mod,
        pageCount: mod.pages?.length || 0,
        activePageCount: mod.pages?.filter(p => p.isActive).length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get module by name
 */
export async function getModuleByName(name) {
  try {
    const mod = await Module.findOne({ name })
      .populate('pages.pageId')
      .lean();

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    return {
      success: true,
      data: mod,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a new module
 */
export async function createModule(moduleData, userId = null) {
  try {
    // Check if module with same name exists
    const existing = await Module.findOne({ name: moduleData.name });
    if (existing) {
      return {
        success: false,
        error: 'Module with this name already exists',
      };
    }

    const mod = new Module({
      ...moduleData,
      pages: [],
      createdBy: userId,
    });
    await mod.save();

    return {
      success: true,
      data: mod,
      message: 'Module created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a module
 */
export async function updateModule(moduleId, updateData) {
  try {
    const mod = await Module.findByIdAndUpdate(
      moduleId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('pages.pageId');

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    return {
      success: true,
      data: mod,
      message: 'Module updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete a module (soft delete)
 */
export async function deleteModule(moduleId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    if (mod.isSystem) {
      return {
        success: false,
        error: 'Cannot delete system module',
      };
    }

    mod.isActive = false;
    await mod.save();

    return {
      success: true,
      data: mod,
      message: 'Module deactivated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Toggle module active status
 */
export async function toggleModuleStatus(moduleId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    if (mod.isSystem && mod.isActive) {
      return {
        success: false,
        error: 'Cannot deactivate system module',
      };
    }

    mod.isActive = !mod.isActive;
    await mod.save();

    return {
      success: true,
      data: mod,
      message: `Module ${mod.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get module statistics
 */
export async function getModuleStats() {
  try {
    const stats = await Module.aggregate([
      {
        $facet: {
          totalModules: [{ $count: 'count' }],
          activeModules: [{ $match: { isActive: true } }, { $count: 'count' }],
          systemModules: [{ $match: { isSystem: true } }, { $count: 'count' }],
          totalFeatures: [
            { $unwind: '$pages' },
            { $count: 'count' },
          ],
          byAccessLevel: [
            { $group: { _id: '$accessLevel', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const result = stats[0];

    return {
      success: true,
      data: {
        totalModules: result.totalModules[0]?.count || 0,
        activeModules: result.activeModules[0]?.count || 0,
        systemModules: result.systemModules[0]?.count || 0,
        totalFeatures: result.totalFeatures[0]?.count || 0,
        byAccessLevel: result.byAccessLevel,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get menu structure for sidebar
 */
export async function getMenuStructure(userModuleAccess = []) {
  try {
    const menuStructure = await Module.getMenuStructure(userModuleAccess);

    return {
      success: true,
      data: menuStructure,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ==================== PAGE MANAGEMENT ====================

/**
 * Get all pages
 */
export async function getAllPages(filters = {}) {
  try {
    const { isActive, moduleCategory } = filters;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (moduleCategory) query.moduleCategory = moduleCategory;

    const pages = await Page.find(query)
      .sort({ moduleCategory: 1, sortOrder: 1 })
      .lean();

    return {
      success: true,
      data: pages,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pages grouped by module category
 */
export async function getPagesGroupedByCategory() {
  try {
    const grouped = await Page.getGroupedByModule();

    return {
      success: true,
      data: grouped,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get available pages not in module
 */
export async function getAvailablePagesForModule(moduleId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    const assignedPageIds = mod.pages.map(p => p.pageId);

    const availablePages = await Page.find({
      _id: { $nin: assignedPageIds },
      isActive: true,
      parentPage: null
    }).sort({ moduleCategory: 1, sortOrder: 1 }).lean();

    return {
      success: true,
      data: {
        module: {
          _id: mod._id,
          name: mod.name,
          displayName: mod.displayName,
        },
        availablePages,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Add page to module
 */
export async function addPageToModule(moduleId, pageData) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    // Get page details
    const page = await Page.findById(pageData.pageId);
    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    // Check if page already exists in module
    const existingIndex = mod.pages.findIndex(
      p => p.pageId.toString() === pageData.pageId
    );

    if (existingIndex >= 0) {
      return {
        success: false,
        error: 'Page already exists in this module',
      };
    }

    // Add page to module
    mod.pages.push({
      pageId: page._id,
      name: page.name,
      displayName: page.displayName,
      route: page.route,
      icon: page.icon,
      sortOrder: pageData.sortOrder ?? mod.pages.length,
      isActive: pageData.isActive ?? true,
    });

    await mod.save();

    return {
      success: true,
      data: await Module.findById(moduleId).populate('pages.pageId'),
      message: 'Page added to module successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove page from module
 */
export async function removePageFromModule(moduleId, pageId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    const pageIndex = mod.pages.findIndex(
      p => p.pageId.toString() === pageId
    );

    if (pageIndex === -1) {
      return {
        success: false,
        error: 'Page not found in module',
      };
    }

    mod.pages.splice(pageIndex, 1);
    await mod.save();

    return {
      success: true,
      data: await Module.findById(moduleId).populate('pages.pageId'),
      message: 'Page removed from module successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update page order in module
 */
export async function updatePageOrder(moduleId, pageOrders) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    // Update sort order for each page
    pageOrders.forEach(({ pageId, sortOrder }) => {
      const page = mod.pages.find(
        p => p.pageId.toString() === pageId
      );
      if (page) {
        page.sortOrder = sortOrder;
      }
    });

    await mod.save();

    return {
      success: true,
      data: await Module.findById(moduleId).populate('pages.pageId'),
      message: 'Page order updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Toggle page active status in module
 */
export async function togglePageInModule(moduleId, pageId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    const page = mod.pages.find(
      p => p.pageId.toString() === pageId
    );

    if (!page) {
      return {
        success: false,
        error: 'Page not found in module',
      };
    }

    page.isActive = !page.isActive;
    await mod.save();

    return {
      success: true,
      data: await Module.findById(moduleId).populate('pages.pageId'),
      message: `Page ${page.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Configure all pages for a module (replaces all pages)
 */
export async function configureModulePages(moduleId, pages) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    // Get page details for all pages
    const pageIds = pages.map(p => p.pageId);
    const pageRecords = await Page.find({
      _id: { $in: pageIds },
      isActive: true
    });

    const pageMap = new Map(pageRecords.map(p => [p._id.toString(), p]));

    // Build pages array
    const modulePages = pages.map((pageData, index) => {
      const page = pageMap.get(pageData.pageId.toString());
      if (!page) return null;

      return {
        pageId: page._id,
        name: page.name,
        displayName: page.displayName,
        route: page.route,
        icon: page.icon,
        sortOrder: pageData.sortOrder ?? index,
        isActive: pageData.isActive ?? true,
      };
    }).filter(p => p !== null);

    mod.pages = modulePages;
    await mod.save();

    return {
      success: true,
      data: await Module.findById(moduleId).populate('pages.pageId'),
      message: `Configured ${modulePages.length} pages for module`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getAllModules,
  getModuleById,
  getModuleByName,
  createModule,
  updateModule,
  deleteModule,
  toggleModuleStatus,
  getModuleStats,
  getMenuStructure,
  getAllPages,
  getPagesGroupedByCategory,
  getAvailablePagesForModule,
  addPageToModule,
  removePageFromModule,
  updatePageOrder,
  togglePageInModule,
  configureModulePages,
};
