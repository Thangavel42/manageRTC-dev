import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import dashboardController from "./dashboard.controller.js";
import notesController from "./notes.controller.js";

const employeeController = (socket, io) => {
  devLog("Setting up employee controllers...");

  // Attach all superadmin controllers immediately
  devLog("Attaching employee dashboard controller...");
  dashboardController(socket, io);

  devLog("Attaching employee notes controller...");
  notesController(socket, io);

};

export default employeeController;
