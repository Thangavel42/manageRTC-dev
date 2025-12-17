import * as trainingListService from "../../services/hr/trainingList.services.js";

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const trainingListController = (socket, io) => {
  const companyId = socket.companyId;
  
  const Broadcast = async () => {
    const res = await trainingListService.getTrainingListStats(companyId);
    io.to(`company_${companyId}`).emit("hr/trainingList/trainingList-details-response", res);
  };

  // READ
  socket.on("hr/trainingList/trainingList-details", async () => {
    try {
      const res = await trainingListService.getTrainingListStats(companyId);
      socket.emit("hr/trainingList/trainingList-details-response", res);
    } catch (error) {
      socket.emit("hr/trainingList/trainingList-details-response", toErr(error));
    }
  });

  socket.on("hr/trainingList/trainingListlist", async (args) => {
    try {
      const res = await trainingListService.getTrainingList(companyId, args || {});
      socket.emit("hr/trainingList/trainingListlist-response", res);
    } catch (error) {
      socket.emit("hr/trainingList/trainingListlist-response", toErr(error));
    }
  });

  socket.on("hr/trainingList/get-employeeDetails", async () => {
    try {
      const res = await trainingListService.getEmployeeDetails(companyId);
      socket.emit("hr/trainingList/get-employeeDetails-response", res);
    } catch (error) {
      socket.emit("hr/trainingList/get-employeeDetails-response", toErr(error));
    }
  });

  socket.on("hr/trainingList/get-trainingList", async (trainingId) => {
    try {
      const res = await trainingListService.getSpecificTrainingList(companyId, trainingId);
      socket.emit("hr/trainingList/get-trainingList-response", res);
    } catch (error) {
      socket.emit("hr/trainingList/get-trainingList-response", toErr(error));
    }
  });

  // WRITE
  socket.on("hr/trainingList/add-trainingList", async (training) => {
    try {
      // trainingList should contain created_by if needed
      const res = await trainingListService.addTrainingList(companyId, training);
      socket.emit("hr/trainingList/add-trainingList-response", res);
      if (res.done) {
        const updatedList = await trainingListService.getTrainingList(companyId, {});
        io.to(`company_${companyId}`).emit("hr/trainingList/trainingListlist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingList/add-trainingList-response", toErr(error));
    }
  });

  socket.on("hr/trainingList/update-trainingList", async (training) => {
    try {
      const res = await trainingListService.updateTrainingList(companyId, training);
      socket.emit("hr/trainingList/update-trainingList-response", res);
      if (res.done) {
        const updatedList = await trainingListService.getTrainingList(companyId, {});
        io.to(`company_${companyId}`).emit("hr/trainingList/trainingListlist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingList/update-trainingList-response", toErr(error));
    }
  });

  socket.on("hr/trainingList/delete-trainingList", async (trainingIds) => {
    try {
      const res = await trainingListService.deleteTrainingList(companyId, trainingIds);
      socket.emit("hr/trainingList/delete-trainingList-response", res);
      if (res.done) {
        const updatedList = await trainingListService.getTrainingList(companyId, {});
        io.to(`company_${companyId}`).emit("hr/trainingList/trainingListlist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingList/delete-trainingList-response", toErr(error));
    }
  });
};

export default trainingListController;

