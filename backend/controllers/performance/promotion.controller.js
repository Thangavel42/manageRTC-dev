import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import * as promotionService from '../../services/performance/promotion.services.js';

const toErr = (e) => ({ done: false, error: e?.message || String(e) });

/**
 * Register all promotion socket event handlers
 */
const promotionController = (socket, io) => {
  const companyId = socket.companyId;

  /**
   * Create a new promotion
   * Event: "promotion:create"
   */
  socket.on('promotion:create', async (data) => {
    try {
      devLog('[PromotionController] promotion:create received', { socketId: socket.id, data });

      const result = await promotionService.createPromotion(companyId, data);

      if (result.done) {
        // Broadcast to all clients in the company room
        socket.to(companyId).emit('promotion:created', result.data);
      }

      socket.emit('promotion:create:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:create', { error: error.message });
      socket.emit('promotion:create:response', toErr(error));
    }
  });

  /**
   * Get all promotions with optional filters
   * Event: "promotion:getAll"
   */
  socket.on('promotion:getAll', async (filters = {}) => {
    try {
      devLog('[PromotionController] promotion:getAll received', {
        socketId: socket.id,
        filters,
      });

      const result = await promotionService.getAllPromotions(companyId, filters);

      socket.emit('promotion:getAll:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getAll', { error: error.message });
      socket.emit('promotion:getAll:response', toErr(error));
    }
  });

  /**
   * Get promotion by ID
   * Event: "promotion:getById"
   */
  socket.on('promotion:getById', async (promotionId) => {
    try {
      devLog('[PromotionController] promotion:getById received', {
        socketId: socket.id,
        promotionId,
      });

      const result = await promotionService.getPromotionById(companyId, promotionId);

      socket.emit('promotion:getById:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getById', { error: error.message });
      socket.emit('promotion:getById:response', toErr(error));
    }
  });

  /**
   * Update promotion
   * Event: "promotion:update"
   */
  socket.on('promotion:update', async ({ promotionId, update }) => {
    try {
      devLog('[PromotionController] promotion:update received', {
        socketId: socket.id,
        promotionId,
        update,
      });

      const result = await promotionService.updatePromotion(companyId, promotionId, update);

      if (result.done) {
        // Broadcast to all clients in the company room
        socket.to(companyId).emit('promotion:updated', result.data);
      }

      socket.emit('promotion:update:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:update', { error: error.message });
      socket.emit('promotion:update:response', toErr(error));
    }
  });

  /**
   * Delete promotion
   * Event: "promotion:delete"
   */
  socket.on('promotion:delete', async ({ promotionId }) => {
    try {
      devLog('[PromotionController] promotion:delete received', {
        socketId: socket.id,
        promotionId,
      });

      const result = await promotionService.deletePromotion(companyId, promotionId);

      if (result.done) {
        // Broadcast to all clients in the company room
        socket.to(companyId).emit('promotion:deleted', { promotionId });
      }

      socket.emit('promotion:delete:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:delete', { error: error.message });
      socket.emit('promotion:delete:response', toErr(error));
    }
  });

  /**
   * Get departments list for promotion selection
   * Event: "promotion:getDepartments"
   */
  socket.on('promotion:getDepartments', async () => {
    try {
      devLog('[PromotionController] promotion:getDepartments received', {
        socketId: socket.id,
      });

      const result = await promotionService.getDepartments(companyId);

      socket.emit('promotion:getDepartments:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getDepartments', {
        error: error.message,
      });
      socket.emit('promotion:getDepartments:response', toErr(error));
    }
  });

  /**
   * Get employees by department for promotion selection
   * Event: "promotion:getEmployeesByDepartment"
   */
  socket.on('promotion:getEmployeesByDepartment', async (departmentId) => {
    try {
      devLog(
        '[PromotionController] promotion:getEmployeesByDepartment received with departmentId:',
        departmentId,
        'type:',
        typeof departmentId
      );

      const result = await promotionService.getEmployeesByDepartment(companyId, departmentId);

      devLog(
        '[PromotionController] Sending promotion:getEmployeesByDepartment:response:',
        result.data?.length,
        'records'
      );
      socket.emit('promotion:getEmployeesByDepartment:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getEmployeesByDepartment', {
        error: error.message,
      });
      socket.emit('promotion:getEmployeesByDepartment:response', toErr(error));
    }
  });

  /**
   * Get employees list for promotion selection (kept for backward compatibility)
   * Event: "promotion:getEmployees"
   */
  socket.on('promotion:getEmployees', async () => {
    try {
      devLog('[PromotionController] promotion:getEmployees received', { socketId: socket.id });

      const result = await promotionService.getEmployeesForPromotion(companyId);

      socket.emit('promotion:getEmployees:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getEmployees', {
        error: error.message,
      });
      socket.emit('promotion:getEmployees:response', toErr(error));
    }
  });

  /**
   * Get designations list for promotion selection
   * Event: "promotion:getDesignations"
   */
  socket.on('promotion:getDesignations', async () => {
    try {
      devLog('[PromotionController] promotion:getDesignations received', {
        socketId: socket.id,
      });

      const result = await promotionService.getDesignationsForPromotion(companyId);

      socket.emit('promotion:getDesignations:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getDesignations', {
        error: error.message,
      });
      socket.emit('promotion:getDesignations:response', toErr(error));
    }
  });

  /**
   * Get designations by department for promotion selection
   * Event: "promotion:getDesignationsByDepartment"
   */
  socket.on('promotion:getDesignationsByDepartment', async (departmentId) => {
    try {
      devLog(
        '[PromotionController] promotion:getDesignationsByDepartment received with departmentId:',
        departmentId,
        'type:',
        typeof departmentId
      );

      const result = await promotionService.getDesignationsByDepartment(companyId, departmentId);

      devLog(
        '[PromotionController] Sending promotion:getDesignationsByDepartment:response:',
        result.data?.length,
        'records'
      );
      socket.emit('promotion:getDesignationsByDepartment:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getDesignationsByDepartment', {
        error: error.message,
      });
      socket.emit('promotion:getDesignationsByDepartment:response', toErr(error));
    }
  });

  /**
   * Get employee details (including department) for viewing promotion
   * Event: "promotion:getEmployeeDetails"
   */
  socket.on('promotion:getEmployeeDetails', async ({ employeeId }) => {
    try {
      devLog(
        '[PromotionController] promotion:getEmployeeDetails received with employeeId:',
        employeeId
      );

      const result = await promotionService.getEmployeeDetails(companyId, employeeId);

      devLog('[PromotionController] Sending promotion:getEmployeeDetails:response');
      socket.emit('promotion:getEmployeeDetails:response', result);
    } catch (error) {
      devError('[PromotionController] Error in promotion:getEmployeeDetails', {
        error: error.message,
      });
      socket.emit('promotion:getEmployeeDetails:response', toErr(error));
    }
  });
};

export default promotionController;
