import { 
  createAddInvoice, 
  getAddInvoices, 
  updateAddInvoice, 
  deleteAddInvoice 
} from "../../services/addInvoice/addInvoice.services.js";

const authorize = (socket, allowed = []) => {
  const role = (socket.role || "").toLowerCase();
  if (!allowed.includes(role)) throw new Error("Forbidden");
};

const roomForCompany = (companyId) => `company:${companyId}`;

const addInvoiceSocketController = (socket, io) => {
  console.log(`✅ addInvoice.socket.controller active for ${socket.id}`);

  if (socket.companyId) {
    socket.join(roomForCompany(socket.companyId));
  }

  // GET
  socket.on("admin/invoices/get", async () => {
    try {
      authorize(socket, ["admin", "hr"]);
      const data = await getAddInvoices(socket.companyId);
      socket.emit("admin/invoices/get-response", { done: true, data });
    } catch (err) {
      socket.emit("admin/invoices/get-response", { done: false, error: err.message });
    }
  });

  // CREATE
  socket.on("admin/invoices/create", async (payload, callback) => {

    try {
      authorize(socket, ["admin"]);
      await createAddInvoice(socket.companyId, payload);
      const data = await getAddInvoices(socket.companyId);
      io.to(roomForCompany(socket.companyId)).emit("admin/invoices/list-update", { done: true, data });
      callback?.({ done: true });

    } catch (err) {
      callback?.({ done: false, error: err.message });
    }
  });

  // UPDATE
  socket.on("admin/invoices/update", async ({ invoiceId, updatedData }) => {
    try {
      authorize(socket, ["admin"]);
      await updateAddInvoice(socket.companyId, invoiceId, updatedData);
      const data = await getAddInvoices(socket.companyId);
      io.to(roomForCompany(socket.companyId)).emit("admin/invoices/list-update", { done: true, data });
      socket.emit("admin/invoices/update-response", { done: true });
    } catch (err) {
      socket.emit("admin/invoices/update-response", { done: false, error: err.message });
    }
  });

  // DELETE
  socket.on("admin/invoices/delete", async ({ invoiceId }) => {
    try {
      authorize(socket, ["admin"]);
      await deleteAddInvoice(socket.companyId, invoiceId);
      const data = await getAddInvoices(socket.companyId);
      io.to(roomForCompany(socket.companyId)).emit("admin/invoices/list-update", { done: true, data });
      socket.emit("admin/invoices/delete-response", { done: true });
    } catch (err) {
      socket.emit("admin/invoices/delete-response", { done: false, error: err.message });
    }
  });
};

export default addInvoiceSocketController;
