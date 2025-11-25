import * as trainingTypesService from "../../services/hr/trainingTypes.services.js";

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const trainingTypesController = (socket, io) => {
  const Broadcast = async () => {
    const res = await trainingTypesService.getTrainingTypesStats();
    io.to("hr_room").emit("hr/trainingTypes/trainingTypes-details-response", res);
  };

  // READ
  socket.on("hr/trainingTypes/trainingTypes-details", async () => {
    try {
      const res = await trainingTypesService.getTrainingTypesStats();
      socket.emit("hr/trainingTypes/trainingTypes-details-response", res);
    } catch (error) {
      socket.emit("hr/trainingTypes/trainingTypes-details-response", toErr(error));
    }
  });

  socket.on("hr/trainingTypes/trainingTypeslist", async (args) => {
    try {
      const res = await trainingTypesService.getTrainingTypes(args || {});
      socket.emit("hr/trainingTypes/trainingTypeslist-response", res);
    } catch (error) {
      socket.emit("hr/trainingTypes/trainingTypeslist-response", toErr(error));
    }
  });

  socket.on("hr/trainingTypes/get-trainingTypes", async (typeId) => {
    try {
      const res = await trainingTypesService.getSpecificTrainingTypes(typeId);
      socket.emit("hr/trainingTypes/get-trainingTypes-response", res);
    } catch (error) {
      socket.emit("hr/trainingTypes/get-trainingTypes-response", toErr(error));
    }
  });

  // WRITE
  socket.on("hr/trainingTypes/add-trainingTypes", async (trainingType) => {
    try {
      // trainingTypes should contain created_by if needed
      const res = await trainingTypesService.addTrainingTypes(trainingType);
      socket.emit("hr/trainingTypes/add-trainingTypes-response", res);
      if (res.done) {
        const updatedList = await trainingTypesService.getTrainingTypes({});
        io.to("hr_room").emit("hr/trainingTypes/trainingTypeslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingTypes/add-trainingTypes-response", toErr(error));
    }
  });

  socket.on("hr/trainingTypes/update-trainingTypes", async (trainingType) => {
    try {
      const res = await trainingTypesService.updateTrainingTypes(trainingType);
      socket.emit("hr/trainingTypes/update-trainingTypes-response", res);
      if (res.done) {
        const updatedList = await trainingTypesService.getTrainingTypes({});
        io.to("hr_room").emit("hr/trainingTypes/trainingTypeslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingTypes/update-trainingTypes-response", toErr(error));
    }
  });

  socket.on("hr/trainingTypes/delete-trainingTypes", async (typeIds) => {
    try {
      const res = await trainingTypesService.deleteTrainingTypes(typeIds);
      socket.emit("hr/trainingTypes/delete-trainingTypes-response", res);
      if (res.done) {
        const updatedList = await trainingTypesService.getTrainingTypes({});
        io.to("hr_room").emit("hr/trainingTypes/trainingTypeslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainingTypes/delete-trainingTypes-response", toErr(error));
    }
  });
};

export default trainingTypesController;

