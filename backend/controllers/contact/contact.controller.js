import { authenticateUser } from "../socialfeed/socialFeed.controller.js";
import { validateCompanyAccess } from "../socialfeed/validation.middleware.js";
import {
  createContact,
  listContacts,
  getContactById,
  updateContact,
  deleteContact,
  exportContacts,
} from "../../services/contact/contact.services.js";

/**
 * Helper function to check if user has required role
 * @param {Object} req - Request object
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if user has access
 */
const ensureRole = (req, allowedRoles = []) => {
  const role = req.user?.publicMetadata?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

/**
 * Helper function to send 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to access this resource') => {
  return res.status(403).json({
    done: false,
    error: message
  });
};

export const contactsMiddleware = [authenticateUser, validateCompanyAccess];

export const ContactsController = {
  create: async (req, res) => {
    try {
      // Role check: Employee cannot create contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to create contacts');
      }
      const result = await createContact(req.contactId, req.body || {});
      if (!result.done) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
  list: async (req, res) => {
    try {
      // Role check: Employee cannot access contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to access contacts');
      }
      const { page, limit, search, status, sortBy, sortOrder } = req.query;
      const result = await listContacts(req.contactId, {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
      });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
  getById: async (req, res) => {
    try {
      // Role check: Employee cannot access contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to access contacts');
      }
      const result = await getContactById(req.contactId, req.params.id);
      if (!result.done) return res.status(404).json(result);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
  update: async (req, res) => {
    try {
      // Role check: Employee cannot update contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to update contacts');
      }
      const result = await updateContact(req.contactId, req.params.id, req.body || {});
      if (!result.done) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
  remove: async (req, res) => {
    try {
      // Role check: Employee cannot delete contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to delete contacts');
      }
      const result = await deleteContact(req.contactId, req.params.id);
      if (!result.done) return res.status(404).json(result);
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
  export: async (req, res) => {
    try {
      // Role check: Employee cannot export contacts
      if (!ensureRole(req, ['admin', 'hr', 'manager', 'superadmin'])) {
        return sendForbidden(res, 'You do not have permission to export contacts');
      }
      const { format } = req.query;
      if (!format || !['pdf', 'excel'].includes(format)) {
        return res.status(400).json({
          done: false,
          error: "Invalid format. Supported formats: pdf, excel"
        });
      }

      const result = await exportContacts(req.contactId, format);
      if (!result.done) return res.status(400).json(result);

      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="contacts.${format}"`);
      return res.send(result.data);
    } catch (e) {
      return res.status(500).json({ done: false, error: e.message });
    }
  },
};