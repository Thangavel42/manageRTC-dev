import * as trainersService from "../../services/hr/trainers.services.js";

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const trainersController = (socket, io) => {
  const Broadcast = async () => {
    const res = await trainersService.getTrainersStats();
    io.to("hr_room").emit("hr/trainers/trainers-details-response", res);
  };

  // READ
  socket.on("hr/trainers/trainers-details", async () => {
    try {
      const res = await trainersService.getTrainersStats();
      socket.emit("hr/trainers/trainers-details-response", res);
    } catch (error) {
      socket.emit("hr/trainers/trainers-details-response", toErr(error));
    }
  });

  socket.on("hr/trainers/trainerslist", async (args) => {
    try {
      const res = await trainersService.getTrainers(args || {});
      socket.emit("hr/trainers/trainerslist-response", res);
    } catch (error) {
      socket.emit("hr/trainers/trainerslist-response", toErr(error));
    }
  });

  socket.on("hr/trainers/get-trainers", async (trainerId) => {
    try {
      const res = await trainersService.getSpecificTrainers(trainerId);
      socket.emit("hr/trainers/get-trainers-response", res);
    } catch (error) {
      socket.emit("hr/trainers/get-trainers-response", toErr(error));
    }
  });

  // WRITE
  socket.on("hr/trainers/add-trainers", async (trainer) => {
    try {
      // trainers should contain created_by if needed
      const res = await trainersService.addTrainers(trainer);
      socket.emit("hr/trainers/add-trainers-response", res);
      if (res.done) {
        const updatedList = await trainersService.getTrainers({});
        io.to("hr_room").emit("hr/trainers/trainerslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainers/add-trainers-response", toErr(error));
    }
  });

  socket.on("hr/trainers/update-trainers", async (trainer) => {
    try {
      const res = await trainersService.updateTrainers(trainer);
      socket.emit("hr/trainers/update-trainers-response", res);
      if (res.done) {
        const updatedList = await trainersService.getTrainers({});
        io.to("hr_room").emit("hr/trainers/trainerslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainers/update-trainers-response", toErr(error));
    }
  });

  socket.on("hr/trainers/delete-trainers", async (trainerIds) => {
    try {
      const res = await trainersService.deleteTrainers(trainerIds);
      socket.emit("hr/trainers/delete-trainers-response", res);
      if (res.done) {
        const updatedList = await trainersService.getTrainers({});
        io.to("hr_room").emit("hr/trainers/trainerslist-response", updatedList);
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/trainers/delete-trainers-response", toErr(error));
    }
  });
};

export default trainersController;

