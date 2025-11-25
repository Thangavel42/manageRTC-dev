import express from 'express';
import { getTenantCollections } from '../config/db.js';
import {
  getTicketsStats,
  getTicketsList,
  getTicketDetails,
  createTicket,
  updateTicket,
  addComment,
  deleteTicket,
  bulkDeleteTickets
} from '../controllers/tickets/tickets.controller.js';

const router = express.Router();

// Middleware to get tenant collections
const getCollections = async (req, res, next) => {
  try {
    const { tenantDbName } = req.params;
    req.collections = getTenantCollections(tenantDbName);
    next();
  } catch (error) {
    res.status(500).json({ done: false, error: 'Database connection error' });
  }
};

// Routes
router.get('/:tenantDbName/stats', getCollections, getTicketsStats);
router.get('/:tenantDbName/list', getCollections, getTicketsList);
router.get('/:tenantDbName/details/:ticketId', getCollections, getTicketDetails);
router.post('/:tenantDbName/create', getCollections, createTicket);
router.put('/:tenantDbName/update/:ticketId', getCollections, updateTicket);
router.post('/:tenantDbName/comment/:ticketId', getCollections, addComment);
router.delete('/:tenantDbName/delete/:ticketId', getCollections, deleteTicket);
router.delete('/:tenantDbName/bulk-delete', getCollections, bulkDeleteTickets);

export default router;
