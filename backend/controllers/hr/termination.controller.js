import * as terminationService from "../../services/hr/termination.services.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const terminationController = (socket, io) => {
  const Broadcast = async () => {
    const res = await terminationService.getTerminationStats();
    io.to("hr_room").emit("hr/termination/termination-details-response", res);
  };

  const companyId = socket.companyId;

  // READ
  socket.on("hr/termination/termination-details", async () => {
    try {
      const res = await terminationService.getTerminationStats(companyId);
      socket.emit("hr/termination/termination-details-response", res);
    } catch (error) {
      socket.emit("hr/termination/termination-details-response", toErr(error));
    }
  });

  socket.on("hr/termination/terminationlist", async (args) => {
    try {
      const res = await terminationService.getTerminations(
        companyId,
        args || {}
      );
      socket.emit("hr/termination/terminationlist-response", res);
    } catch (error) {
      socket.emit("hr/termination/terminationlist-response", toErr(error));
    }
  });

  socket.on("hr/termination/get-termination", async (terminationId) => {
    try {
      const res = await terminationService.getSpecificTermination(
        companyId,
        terminationId
      );
      socket.emit("hr/termination/terminationlist-response", res);
    } catch (error) {
      socket.emit("hr/termination/terminationlist-response", toErr(error));
    }
  });

  // WRITE
  socket.on("hr/termination/add-termination", async (termination) => {
    try {
      // termination should contain created_by if needed
      const res = await terminationService.addTermination(
        companyId,
        termination,
        socket.user?.sub
      );

      if (res.done) {
        const updatedList = await terminationService.getTerminations(
          companyId,
          {}
        );
        // Send success response to the requesting socket
        socket.emit("hr/termination/add-termination-response", res);
        socket.emit("hr/termination/termination-details-response", res);
        io.to("hr_room").emit(
          "hr/termination/terminationlist-response",
          updatedList
        );
        await Broadcast();
      } else {
        // Send failure response if service returned done: false
        socket.emit("hr/termination/add-termination-response", res);
      }
    } catch (error) {
      socket.emit("hr/termination/add-termination-response", toErr(error));
    }
  });

  socket.on("hr/termination/update-termination", async (termination) => {
    try {
      const res = await terminationService.updateTermination(
        companyId,
        termination
      );

      if (res.done) {
        const updatedList = await terminationService.getTerminations(
          companyId,
          {}
        );
        devLog("updatessssss", updatedList);
        // Send success response to the requesting socket
        socket.emit("hr/termination/update-termination-response", res);
        socket.emit("hr/termination/terminationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/termination/terminationlist-response",
          updatedList
        );
        await Broadcast();
      } else {
        // Send failure response if service returned done: false
        socket.emit("hr/termination/update-termination-response", res);
      }
    } catch (error) {
      socket.emit("hr/termination/update-termination-response", toErr(error));
    }
  });

  socket.on("hr/termination/delete-termination", async (terminationIds) => {
    try {
      const res = await terminationService.deleteTermination(
        companyId,
        terminationIds
      );
      
      // Emit delete response (success or failure)
      socket.emit("hr/termination/delete-termination-response", res);
      
      if (res.done) {
        const updatedList = await terminationService.getTerminations(
          companyId,
          {}
        );
        socket.emit("hr/termination/terminationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/termination/terminationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/termination/delete-termination-response", toErr(error));
    }
  });

  // Process termination
  socket.on("hr/termination/process-termination", async (payload) => {
    try {
      const { terminationId, userId } = payload;
      const res = await terminationService.processTermination(
        companyId,
        terminationId,
        userId || socket.user?.sub
      );
      socket.emit("hr/termination/process-termination-response", res);
      if (res.done) {
        const updatedList = await terminationService.getTerminations(
          companyId,
          {}
        );
        socket.emit("hr/termination/terminationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/termination/terminationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/termination/process-termination-response", toErr(error));
    }
  });

  // Cancel termination
  socket.on("hr/termination/cancel-termination", async (payload) => {
    try {
      const { terminationId, userId, reason } = payload;
      const res = await terminationService.cancelTermination(
        companyId,
        terminationId,
        userId || socket.user?.sub,
        reason
      );
      socket.emit("hr/termination/cancel-termination-response", res);
      if (res.done) {
        const updatedList = await terminationService.getTerminations(
          companyId,
          {}
        );
        socket.emit("hr/termination/terminationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/termination/terminationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/termination/cancel-termination-response", toErr(error));
    }
  });
};

export default terminationController;
