// backend/controllers/assets/asset.socket.controller.js
import {
  getAssets,
  addAsset,
  updateAsset,
  deleteAsset,
} from "../../services/assets/assets.services.js";
import { getAllEmployees } from "../../services/employee/employee.services.js";

const authorize = (socket, allowed = []) => {
  const role = (socket.role || "").toLowerCase();
  if (!allowed.includes(role)) throw new Error("Forbidden");
};

const roomForCompany = (companyId) => `company:${companyId}`;

const assetSocketController = (socket, io) => {
  console.log(`✅ asset.socket.controller active for ${socket.id}`);

  // Ensure socket joined company room (router may already do this)
  if (socket.companyId) {
    socket.join(roomForCompany(socket.companyId));
  }

  // GET (paginated + filters)
  socket.on("admin/assets/get", async (params = {}) => {
    try {
      authorize(socket, ["admin", "hr"]);
      const companyId = socket.companyId;
      const res = await getAssets(companyId, params);
      socket.emit("admin/assets/get-response", res);
    } catch (err) {
      socket.emit("admin/assets/get-response", { done: false, error: err.message });
    }
  });

  // CREATE
  socket.on("admin/assets/create", async (payload) => {
    try {
      authorize(socket, ["admin"]);
      const companyId = socket.companyId;
      const { employeeId, asset } = payload;
      const res = await addAsset(companyId, employeeId, asset);

      // Broadcast refreshed page (Option A) to company room
      try {
        const fresh = await getAssets(companyId, { page: 1, pageSize: 10, filters: {} });
        io.to(roomForCompany(companyId)).emit("admin/assets/list-update", fresh);
      } catch (e) {
        console.error("Failed to broadcast refreshed asset list:", e);
      }

      // Ack to creator
      socket.emit("admin/assets/create-response", res);
    } catch (err) {
      socket.emit("admin/assets/create-response", { done: false, error: err.message });
    }
  });

  // UPDATE
  socket.on("admin/assets/update", async (payload) => {
    try {
      authorize(socket, ["admin"]);
      const companyId = socket.companyId;
      const { assetId, updateData } = payload;
      await updateAsset(companyId, assetId, updateData);

      // Broadcast refreshed list
      try {
        const fresh = await getAssets(companyId, { page: 1, pageSize: 10, filters: {} });
        io.to(roomForCompany(companyId)).emit("admin/assets/list-update", fresh);
      } catch (e) {
        console.error("Failed to broadcast refreshed asset list after update:", e);
      }

      socket.emit("admin/assets/update-response", { done: true });
    } catch (err) {
      socket.emit("admin/assets/update-response", { done: false, error: err.message });
    }
  });

  // DELETE (hard)
  socket.on("admin/assets/delete", async ({ assetId }) => {
    try {
      authorize(socket, ["admin"]);
      const companyId = socket.companyId;
      await deleteAsset(companyId, assetId);

      // Broadcast refreshed list
      try {
        const fresh = await getAssets(companyId, { page: 1, pageSize: 10, filters: {} });
        io.to(roomForCompany(companyId)).emit("admin/assets/list-update", fresh);
      } catch (e) {
        console.error("Failed to broadcast refreshed asset list after delete:", e);
      }

      socket.emit("admin/assets/delete-response", { done: true });
    } catch (err) {
      socket.emit("admin/assets/delete-response", { done: false, error: err.message });
    }
  });

  // Provide employee list for selects (if admin UI asks)
  socket.on("admin/employees/get-list", async () => {
    try {
      authorize(socket, ["admin", "hr"]);
      const companyId = socket.companyId;
      const emps = await getAllEmployees(companyId);
      
      // Simplify employee payload - include both _id and employeeId
      const list = (emps || []).map((e) => ({
        _id: String(e._id),
        employeeId: e.employeeId ? String(e.employeeId) : String(e._id), // Use employeeId if exists, fallback to _id
        firstName: e.firstName,
        lastName: e.lastName,
        avatar: e.avatarUrl || e.avatar || null, // Use avatarUrl field, fallback to avatar
      }));

      console.log("Sending employee list response:", list.length);
      socket.emit("admin/employees/get-list-response", { done: true, data: list });
    } catch (err) {
      console.error("Error fetching employees:", err);
      socket.emit("admin/employees/get-list-response", { done: false, error: err.message });
    }
  });
};

export default assetSocketController;
