 import * as resignationService from "../../services/hr/resignation.services.js";

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const resignationController = (socket, io) => {
  const Broadcast = async () => {
    const res = await resignationService.getResignationStats();
    io.to("hr_room").emit("hr/resignation/resignation-details-response", res);
  };

  const companyId = socket.companyId;

  // READ
  socket.on("hr/resignation/resignation-details", async () => {
    try {
      const res = await resignationService.getResignationStats(companyId);
      socket.emit("hr/resignation/resignation-details-response", res);
    } catch (error) {
      socket.emit("hr/resignation/resignation-details-response", toErr(error));
    }
  });

  socket.on("hr/resignation/resignationlist", async (args) => {
    try {
      const res = await resignationService.getResignations(
        companyId,
        args || {}
      );
      socket.emit("hr/resignation/resignationlist-response", res);
    } catch (error) {
      socket.emit("hr/resignation/resignationlist-response", toErr(error));
    }
  });

  socket.on("hr/resignation/departmentlist", async () => {
    try {
      const res = await resignationService.getDepartments(
        companyId
      );
      socket.emit("hr/resignation/departmentlist-response", res);
    } catch (error) {
      socket.emit("hr/resignation/departmentlist-response", toErr(error));
    }
  });

  socket.on("hr/resignation/get-resignation", async (resignationId) => {
    try {
      const res = await resignationService.getSpecificResignation(
        companyId,
        resignationId
      );
      socket.emit("hr/resignation/get-resignation-response", res);
    } catch (error) {
      socket.emit("hr/resignation/get-resignation-response", toErr(error));
    }
  });

  // WRITE
  socket.on("hr/resignation/add-resignation", async (resignation) => {
    try {
      // resignation should contain created_by if needed
      const res = await resignationService.addResignation(
        companyId,
        resignation
      );
      // socket.emit("hr/resignation/add-resignation-response", res);
      if (res.done) {
        console.log("Added");
        const updatedList = await resignationService.getResignations(
          companyId,
          {}
        );
        socket.emit("hr/resignation/resignationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/resignation/resignationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/resignation/add-resignation-response", toErr(error));
    }
  });

  socket.on("hr/resignation/update-resignation", async (resignation) => {
    try {
      const res = await resignationService.updateResignation(
        companyId,
        resignation
      );
      socket.emit("hr/resignation/update-resignation-response", res);
      if (res.done) {
        const updatedList = await resignationService.getResignations(
          companyId,
          {}
        );
        socket.emit("hr/resignation/resignationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/resignation/resignationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/resignation/update-resignation-response", toErr(error));
    }
  });

  socket.on("hr/resignation/delete-resignation", async (resignationIds) => {
    try {
      const res = await resignationService.deleteResignation(
        companyId,
        resignationIds
      );
      socket.emit("hr/resignation/delete-resignation-response", res);
      if (res.done) {
        const updatedList = await resignationService.getResignations(
          companyId,
          {}
        );
        socket.emit("hr/resignation/resignationlist-response", updatedList);
        io.to("hr_room").emit(
          "hr/resignation/resignationlist-response",
          updatedList
        );
        await Broadcast();
      }
    } catch (error) {
      socket.emit("hr/resignation/delete-resignation-response", toErr(error));
    }
  });
};

export default resignationController;
