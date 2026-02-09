// backend/controllers/assets/assetCategory.socket.controller.js
import {
  createAssetCategory,
  deleteAssetCategory,
  getAssetCategories,
  updateAssetCategory,
} from '../../services/assets/assetCategory.services.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const authorize = (socket, allowed = []) => {
  const role = (socket.role || '').toLowerCase();
  if (!allowed.includes(role)) throw new Error('Forbidden');
};

const roomForCompany = (companyId) => `company:${companyId}`;

const assetCategorySocketController = (socket, io) => {
  // Ensure socket joined company room
  if (socket.companyId) {
    socket.join(roomForCompany(socket.companyId));
  }

  // GET all categories
  socket.on('admin/asset-categories/get', async (params = {}) => {
    try {
      authorize(socket, ['admin', 'hr']);
      const companyId = socket.companyId;
      const res = await getAssetCategories(companyId, params);
      socket.emit('admin/asset-categories/get-response', res);
    } catch (err) {
      socket.emit('admin/asset-categories/get-response', {
        done: false,
        error: err.message,
      });
    }
  });

  // CREATE category
  socket.on('admin/asset-categories/create', async (payload) => {
    try {
      authorize(socket, ['admin']);
      const companyId = socket.companyId;
      const res = await createAssetCategory(companyId, payload);

      // Broadcast refreshed list
      try {
        const fresh = await getAssetCategories(companyId, {
          page: 1,
          pageSize: 100,
          filters: {},
        });
        io.to(roomForCompany(companyId)).emit('admin/asset-categories/list-update', fresh);
      } catch (e) {
        devError('Failed to broadcast refreshed category list:', e);
      }

      socket.emit('admin/asset-categories/create-response', res);
    } catch (err) {
      socket.emit('admin/asset-categories/create-response', {
        done: false,
        error: err.message,
      });
    }
  });

  // UPDATE category
  socket.on('admin/asset-categories/update', async (payload) => {
    try {
      authorize(socket, ['admin']);
      const companyId = socket.companyId;
      const { categoryId, updateData } = payload;
      await updateAssetCategory(companyId, categoryId, updateData);

      // Broadcast refreshed list
      try {
        const fresh = await getAssetCategories(companyId, {
          page: 1,
          pageSize: 100,
          filters: {},
        });
        io.to(roomForCompany(companyId)).emit('admin/asset-categories/list-update', fresh);
      } catch (e) {
        devError('Failed to broadcast refreshed category list after update:', e);
      }

      socket.emit('admin/asset-categories/update-response', { done: true });
    } catch (err) {
      socket.emit('admin/asset-categories/update-response', {
        done: false,
        error: err.message,
      });
    }
  });

  // DELETE category
  socket.on('admin/asset-categories/delete', async ({ categoryId }) => {
    try {
      authorize(socket, ['admin']);
      const companyId = socket.companyId;
      await deleteAssetCategory(companyId, categoryId);

      // Broadcast refreshed list
      try {
        const fresh = await getAssetCategories(companyId, {
          page: 1,
          pageSize: 100,
          filters: {},
        });
        io.to(roomForCompany(companyId)).emit('admin/asset-categories/list-update', fresh);
      } catch (e) {
        devError('Failed to broadcast refreshed category list after delete:', e);
      }

      socket.emit('admin/asset-categories/delete-response', { done: true });
    } catch (err) {
      socket.emit('admin/asset-categories/delete-response', {
        done: false,
        error: err.message,
      });
    }
  });
};

export default assetCategorySocketController;
