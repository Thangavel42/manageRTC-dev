import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import { Plan } from "../../models/superadmin/package.schema.js";
import * as packageService from "../../services/superadmin/packages.services.js";
const packageController = (socket, io) => {
  // Add Plan Event
  // Read Function

  // Broadcaster
  const Broadcast = async (io, socket) => {
    const res = await packageService.getplanStats(socket);
    io.to("superadmin_room").emit(
      "superadmin/packages/plan-details-response",
      res
    );
  };

  socket.on("superadmin/packages/plan-details", async () => {
    try {
      devLog("Plan det");
      let res = await packageService.getplanStats(socket);
      devLog(res);
      socket.emit("superadmin/packages/plan-details-response", res);
    } catch (error) {
      devLog(error);
      socket.emit("superadmin/packages/plan-details-response", error);
    }

    // Log here
  });

  socket.on("superadmin/packages/planlist", async (args) => {
    try {
      devLog("New request for pplan lisy");
      let res = await packageService.getplan(args);
      socket.emit("superadmin/packages/planlist-response", res);
    } catch (error) {
      socket.emit("superadmin/packages/planlist-response", error);
    }

    //Log here
  });

  socket.on("superadmin/packages/get-plan", async (planid) => {
    try {
      let res = await packageService.getSpecificPlan(planid);
      devLog(res);
      socket.emit("superadmin/packages/get-plan-response", res);
    } catch (error) {
      socket.emit("superadmin/packages/get-plan-response", error);
    }
  });

  //Write Function
  socket.on("superadmin/packages/add-plan", async (plan) => {
    devLog("Super Admin is trying to add plan");
    devLog("Received plan data:", plan); // Debugging
    try {
      const planDoc = new Plan(plan);
      await planDoc.validate(); // throws if in
    } catch (error) {
      devLog("Error in super.admin/package/addplan schema issue");
    }
    let res = await packageService.addPlan(socket.user.sub, plan); // Ensure `await` is used
    socket.emit("superadmin/packages/add-plan-response", res);
    if (res.done) {
      const updatedPlans = await packageService.getplan({});
      io.to("superadmin_room").emit(
        "superadmin/packages/planlist-response",
        updatedPlans
      );
      Broadcast(io, socket);
    }
  });

  //Update Function
  socket.on("superadmin/packages/update-plan", async (plan) => {
    try {
      devLog("Super Admin is trying to update plan");
      devLog("Received plan data:", plan); // Debugging
      // Validate the form
      try {
        const planDoc = new Plan(plan);
        await planDoc.validate(); // throws if in
      } catch (error) {
        devLog("Error in super.admin/package/updateplan schema issue");
      }
      let res = await packageService.updatePlan(plan); // Ensure `await` is used
      socket.emit("superadmin/packages/update-plan-response", res);
      if (res.done) {
        const updatedPlans = await packageService.getplan({});
        io.to("superadmin_room").emit(
          "superadmin/packages/planlist-response",
          updatedPlans
        );
        Broadcast(io, socket);
      }
    } catch (error) {
      devLog("Error in update", error);
      socket.emit("superadmin/packages/update-plan-response", error);
    }
  });

  //Delete Function
  socket.on("superadmin/packages/delete-plan", async (planids) => {
    devLog("Super Admin is trying to delete plan");
    devLog("Received delete plan id:", planids); // Debugging
    // Validate the form
    try {
      let res = await packageService.deletePlan(planids); // Ensure `await` is used
      socket.emit("superadmin/packages/delete-plan-response", res);
      if (res.done) {
        const updatedPlans = await packageService.getplan({});
        io.to("superadmin_room").emit(
          "superadmin/packages/planlist-response",
          updatedPlans
        );
        Broadcast(io, socket);
      }
    } catch (error) {
      socket.emit("superadmin/packages/delete-plan-response", error);
    }
  });
};

export default packageController;
