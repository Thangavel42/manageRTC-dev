import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import packageController from "./package.controller.js";
import companiesController from "./companies.controller.js";
import subscriptionsController from "./subscription.controller.js";
import dashboardController from "./dashboard.controller.js";

const superAdminController = (socket, io) => {
  devLog("Setting up superadmin controllers...");

  // Attach all superadmin controllers immediately
  devLog("Attaching superadmin packages controller...");
  packageController(socket, io);

  devLog("Attaching superadmin companies controller...");
  companiesController(socket, io);

  devLog("Attaching superadmin dashboard controller...");
  dashboardController(socket, io);

  devLog("Attaching superadmin subscriptions controller...");
  subscriptionsController(socket, io);
};

export default superAdminController;
