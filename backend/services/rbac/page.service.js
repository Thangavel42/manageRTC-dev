/**
 * Page Service
 * Handles page-related business logic
 */

import Page from '../../models/rbac/page.schema.js';

// Simple in-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCache(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(pattern = null) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

/**
 * Get all pages with optional filtering
 */
export async function getAllPages(filters = {}) {
  try {
    const { isActive, moduleCategory, search } = filters;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (moduleCategory) query.moduleCategory = moduleCategory;
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { route: { $regex: search, $options: 'i' } }
      ];
    }

    const pages = await Page.find(query)
      .select('_id name displayName description route icon moduleCategory sortOrder isSystem isActive availableActions')
      .sort({ moduleCategory: 1, sortOrder: 1 })
      .lean()
      .maxTimeMS(5000); // 5 second timeout

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
 * Get pages grouped by category (with caching)
 */
export async function getPagesGroupedByCategory() {
  try {
    const cacheKey = 'pages:grouped';
    const cached = getCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const grouped = await Page.getGroupedByModule();
    setCache(cacheKey, grouped);

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
 * Get page by ID
 */
export async function getPageById(pageId) {
  try {
    const page = await Page.findById(pageId)
      .select('_id name displayName description route icon moduleCategory sortOrder isSystem isActive availableActions')
      .lean();

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    return {
      success: true,
      data: page,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get page by name
 */
export async function getPageByName(pageName) {
  try {
    const page = await Page.findOne({ name: pageName }).lean();

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    return {
      success: true,
      data: page,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pages by module category
 */
export async function getPagesByModule(moduleCategory) {
  try {
    const pages = await Page.getByModule(moduleCategory);

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
 * Create a new page
 */
export async function createPage(pageData, userId = null) {
  try {
    // Check if page name already exists
    const existingPage = await Page.findOne({ name: pageData.name });
    if (existingPage) {
      return {
        success: false,
        error: 'Page with this name already exists',
      };
    }

    const page = new Page({
      ...pageData,
      createdBy: userId,
      updatedBy: userId,
    });
    await page.save();

    // Clear cache after create
    clearCache('pages');

    return {
      success: true,
      data: page,
      message: 'Page created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a page
 */
export async function updatePage(pageId, updateData, userId = null) {
  try {
    const page = await Page.findById(pageId);

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    // Prevent modifying system pages' critical fields
    if (page.isSystem && updateData.name && updateData.name !== page.name) {
      return {
        success: false,
        error: 'Cannot modify system page name',
      };
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== page.name) {
      const nameExists = await Page.findOne({ name: updateData.name, _id: { $ne: pageId } });
      if (nameExists) {
        return {
          success: false,
          error: 'Page with this name already exists',
        };
      }
    }

    const updatedPage = await Page.findByIdAndUpdate(
      pageId,
      {
        $set: {
          ...updateData,
          updatedBy: userId,
        },
      },
      { new: true, runValidators: true }
    );

    // Clear cache after update
    clearCache('pages');

    return {
      success: true,
      data: updatedPage,
      message: 'Page updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete a page
 */
export async function deletePage(pageId) {
  try {
    const page = await Page.findById(pageId);

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    if (page.isSystem) {
      return {
        success: false,
        error: 'Cannot delete system pages',
      };
    }

    await Page.findByIdAndDelete(pageId);

    // Clear cache after delete
    clearCache('pages');

    return {
      success: true,
      data: { _id: pageId },
      message: 'Page deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Toggle page status
 */
export async function togglePageStatus(pageId) {
  try {
    const page = await Page.findById(pageId);

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    // Prevent deactivating system pages
    if (page.isSystem && page.isActive) {
      return {
        success: false,
        error: 'Cannot deactivate system pages',
      };
    }

    page.isActive = !page.isActive;
    await page.save();

    // Clear cache after toggle
    clearCache('pages');

    return {
      success: true,
      data: page,
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
 * Get page statistics (with caching)
 */
export async function getPageStats() {
  try {
    const cacheKey = 'pages:stats';
    const cached = getCache(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const stats = await Page.aggregate([
      {
        $facet: {
          totalPages: [{ $count: 'count' }],
          activePages: [{ $match: { isActive: true } }, { $count: 'count' }],
          systemPages: [{ $match: { isSystem: true } }, { $count: 'count' }],
          customPages: [{ $match: { isSystem: false } }, { $count: 'count' }],
          byCategory: [
            {
              $group: {
                _id: '$moduleCategory',
                count: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const result = stats[0];
    const data = {
      totalPages: result.totalPages[0]?.count || 0,
      activePages: result.activePages[0]?.count || 0,
      systemPages: result.systemPages[0]?.count || 0,
      customPages: result.customPages[0]?.count || 0,
      byCategory: result.byCategory || []
    };

    setCache(cacheKey, data);

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Batch update page sort orders
 */
export async function updatePageOrders(pageOrders) {
  try {
    const updatePromises = pageOrders.map(({ pageId, sortOrder }) =>
      Page.findByIdAndUpdate(pageId, { sortOrder })
    );

    await Promise.all(updatePromises);

    // Clear cache after update
    clearCache('pages');

    return {
      success: true,
      message: 'Page orders updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getAllPages,
  getPagesGroupedByCategory,
  getPageById,
  getPageByName,
  getPagesByModule,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
  getPageStats,
  updatePageOrders,
};
