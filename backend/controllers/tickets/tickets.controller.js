import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';
import * as ticketsService from '../../services/tickets/tickets.services.js';

// Get tickets dashboard statistics
const getTicketsStats = async (req, res) => {
  try {
    const { tenantDbName } = req.params;
    const result = await ticketsService.getTicketsStats(tenantDbName);
    res.json(result);
  } catch (error) {
    devError('Error getting tickets stats:', error);
    res.json({ done: false, error: error.message });
  }
};

// Get tickets list
const getTicketsList = async (req, res) => {
  try {
    const { tenantDbName } = req.params;
    const options = req.query;
    const result = await ticketsService.getTicketsList(tenantDbName, options);
    res.json(result);
  } catch (error) {
    devError('Error getting tickets list:', error);
    res.json({ done: false, error: error.message });
  }
};

// Get single ticket details
const getTicketDetails = async (req, res) => {
  try {
    const { tenantDbName, ticketId } = req.params;
    const result = await ticketsService.getTicketDetails(tenantDbName, ticketId);
    res.json(result);
  } catch (error) {
    devError('Error getting ticket details:', error);
    res.json({ done: false, error: error.message });
  }
};

// Create new ticket
const createTicket = async (req, res) => {
  try {
    const { tenantDbName } = req.params;
    const ticketData = req.body;
    const result = await ticketsService.createTicket(tenantDbName, ticketData);
    res.json(result);
  } catch (error) {
    devError('Error creating ticket:', error);
    res.json({ done: false, error: error.message });
  }
};

// Update ticket
const updateTicket = async (req, res) => {
  try {
    const { tenantDbName, ticketId } = req.params;
    const updateData = req.body;
    const result = await ticketsService.updateTicket(tenantDbName, ticketId, updateData);
    res.json(result);
  } catch (error) {
    devError('Error updating ticket:', error);
    res.json({ done: false, error: error.message });
  }
};

// Add comment to ticket
const addComment = async (req, res) => {
  try {
    const { tenantDbName, ticketId } = req.params;
    const commentData = req.body;
    const result = await ticketsService.addComment(tenantDbName, ticketId, commentData);
    res.json(result);
  } catch (error) {
    devError('Error adding comment:', error);
    res.json({ done: false, error: error.message });
  }
};

// Delete ticket
const deleteTicket = async (req, res) => {
  try {
    const { tenantDbName, ticketId } = req.params;
    const result = await ticketsService.deleteTicket(tenantDbName, ticketId);
    res.json(result);
  } catch (error) {
    devError('Error deleting ticket:', error);
    res.json({ done: false, error: error.message });
  }
};

// Bulk delete tickets
const bulkDeleteTickets = async (req, res) => {
  try {
    const { tenantDbName } = req.params;
    const { ticketIds } = req.body;
    const result = await ticketsService.bulkDeleteTickets(tenantDbName, ticketIds);
    res.json(result);
  } catch (error) {
    devError('Error bulk deleting tickets:', error);
    res.json({ done: false, error: error.message });
  }
};

export {
  getTicketsStats,
  getTicketsList,
  getTicketDetails,
  createTicket,
  updateTicket,
  addComment,
  deleteTicket,
  bulkDeleteTickets
};
