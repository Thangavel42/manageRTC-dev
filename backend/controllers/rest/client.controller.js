/**
 * Client REST Controller
 * Handles all Client CRUD operations via REST API
 */

import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import PDFDocument from 'pdfkit';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildConflictError,
  buildNotFoundError,
  buildValidationError,
} from '../../middleware/errorHandler.js';
import Client from '../../models/client/client.schema.js';
import {
  buildSearchFilter,
  extractUser,
  filterAndPaginate,
  sendCreated,
  sendSuccess,
} from '../../utils/apiResponse.js';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * Helper function to get tenant-specific Client model
 */
const getClientModel = (companyId) => {
  if (!companyId) {
    return Client;
  }
  return getTenantModel(companyId, 'Client', Client.schema);
};

/**
 * Helper function to check if user has required role
 * @param {Object} user - User object from extractUser
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if user has access
 */
const ensureRole = (user, allowedRoles = []) => {
  const role = user?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

/**
 * Helper function to send 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to access this resource') => {
  return res.status(403).json({
    success: false,
    error: { message }
  });
};

/**
 * @desc    Get all clients with pagination and filtering
 * @route   GET /api/clients
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const getClients = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  // Use tenant collections for multi-tenant database access
  const collections = getTenantCollections(user.companyId);

  // Simple filter - just get non-deleted clients
  const filter = {
    $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
  };

  // Get all clients from tenant-specific database
  const clients = await collections.clients.find(filter).sort({ createdAt: -1 }).toArray();

  // For each client, count projects from the project collection
  const clientsWithProjects = await Promise.all(
    clients.map(async (client) => {
      // Count projects where client name matches
      const projectCount = await collections.projects.countDocuments({
        client: client.name,
        $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
      });

      return {
        ...client,
        projects: projectCount,
      };
    })
  );

  return sendSuccess(res, clientsWithProjects, 'Clients retrieved successfully');
});

/**
 * @desc    Get single client by ID
 * @route   GET /api/clients/:id
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const getClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid client ID format');
  }

  console.log('[getClientById] Fetching client:', { id, companyId: user.companyId });

  // Get tenant-specific Client model
  const ClientModel = getClientModel(user.companyId);

  // Find client
  const client = await ClientModel.findOne({
    _id: id,
    $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
  });

  if (!client) {
    console.log('[getClientById] Client not found:', id);
    throw buildNotFoundError('Client', id);
  }

  console.log('[getClientById] Client found:', { id: client._id, name: client.name });
  return sendSuccess(res, client);
});

/**
 * @desc    Create new client
 * @route   POST /api/clients
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const createClient = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const clientData = req.body;

  // Role check: Only admin, hr, manager, superadmin can create clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to create clients');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check for duplicate name
  const existingClient = await collections.clients.findOne({
    name: clientData.name,
    isDeleted: false,
  });

  if (existingClient) {
    throw buildConflictError('A client with this name already exists');
  }

  // Generate client ID using tenant-specific collection
  if (!clientData.clientId) {
    const year = new Date().getFullYear();

    // Find the highest client ID for this year in tenant database
    const lastClient = await collections.clients
      .find({ clientId: { $regex: `^CLIT-${year}-` } })
      .sort({ clientId: -1 })
      .limit(1)
      .toArray();

    let sequence = 1;
    if (lastClient && lastClient.length > 0 && lastClient[0].clientId) {
      const parts = lastClient[0].clientId.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      sequence = lastSequence + 1;
    }

    const paddedSequence = String(sequence).padStart(4, '0');
    clientData.clientId = `CLIT-${year}-${paddedSequence}`;
  }

  // Prepare client document (simplified structure)
  const clientDocument = {
    ...clientData,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Create client using native MongoDB
  const result = await collections.clients.insertOne(clientDocument);

  // Fetch the created client
  const client = await collections.clients.findOne({ _id: result.insertedId });

  return sendCreated(res, client, 'Client created successfully');
});

/**
 * @desc    Update client
 * @route   PUT /api/clients/:id
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const updateClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  // Role check: Only admin, hr, manager, superadmin can update clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to update clients');
  }

  // Debug logging
  console.log('=== UPDATE CLIENT DEBUG ===');
  console.log('Received req.body:', JSON.stringify(req.body, null, 2));
  console.log('socialLinks in req.body:', req.body.socialLinks);
  console.log('==========================');

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid client ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find client in tenant database
  const client = await collections.clients.findOne({
    _id: new mongoose.Types.ObjectId(id),
    $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
  });

  if (!client) {
    throw buildNotFoundError('Client', id);
  }

  // Check for duplicate name if name is being updated
  if (updateData.name && updateData.name !== client.name) {
    const existingClient = await collections.clients.findOne({
      name: updateData.name,
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
    });

    if (existingClient) {
      throw buildConflictError('A client with this name already exists');
    }
  }

  // Remove _id from updateData if present
  delete updateData._id;

  // Update client using native MongoDB
  const result = await collections.clients.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Client', id);
  }

  // Fetch updated client
  const updatedClient = await collections.clients.findOne({
    _id: new mongoose.Types.ObjectId(id),
  });

  console.log('=== UPDATED CLIENT FROM DB ===');
  console.log('Updated client:', JSON.stringify(updatedClient, null, 2));
  console.log('socialLinks in DB:', updatedClient.socialLinks);
  console.log('==============================');

  return sendSuccess(res, updatedClient, 'Client updated successfully');
});

/**
 * @desc    Delete client (soft delete)
 * @route   DELETE /api/clients/:id
 * @access  Private (Admin, Superadmin) - Employee, HR, Manager, Leads NOT allowed
 */
export const deleteClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Role check: Only admin and superadmin can delete clients
  if (!ensureRole(user, ['admin', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to delete clients');
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid client ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find client in tenant database
  const client = await collections.clients.findOne({
    _id: new mongoose.Types.ObjectId(id),
    $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
  });

  if (!client) {
    throw buildNotFoundError('Client', id);
  }

  // Check if client has any active/ongoing projects
  const activeProjects = await collections.projects
    .find({
      client: client.name,
      $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
      status: { $nin: ['Completed', 'Cancelled'] },
    })
    .toArray();

  if (activeProjects && activeProjects.length > 0) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `Cannot delete client. There are ${activeProjects.length} active project(s) associated with this client. Please complete or cancel all projects before deleting the client.`,
      },
    });
  }

  // Soft delete using native MongoDB
  const result = await collections.clients.updateOne(
    { _id: new mongoose.Types.ObjectId(id) },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        status: 'Inactive',
        updatedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Client', id);
  }

  return sendSuccess(
    res,
    {
      _id: client._id,
      clientId: client.clientId,
      isDeleted: true,
    },
    'Client deleted successfully'
  );
});

/**
 * @desc    Get clients by account manager
 * @route   GET /api/clients/account-manager/:managerId
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const getClientsByAccountManager = asyncHandler(async (req, res) => {
  const { managerId } = req.params;
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    throw buildValidationError('managerId', 'Invalid account manager ID format');
  }

  const clients = await Client.find({
    accountManager: managerId,
    isDeleted: false,
  })
    .populate('accountManager', 'firstName lastName fullName employeeId')
    .sort({ name: 1 });

  return sendSuccess(res, clients, 'Clients by account manager retrieved successfully');
});

/**
 * @desc    Get clients by status
 * @route   GET /api/clients/status/:status
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const getClientsByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  // Validate status
  const validStatuses = ['Active', 'Inactive', 'Prospect', 'Churned'];
  if (!validStatuses.includes(status)) {
    throw buildValidationError(
      'status',
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const clients = await Client.find({
    status,
    isDeleted: false,
  })
    .populate('accountManager', 'firstName lastName fullName employeeId')
    .sort({ name: 1 });

  return sendSuccess(res, clients, 'Clients by status retrieved successfully');
});

/**
 * @desc    Get clients by tier
 * @route   GET /api/clients/tier/:tier
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const getClientsByTier = asyncHandler(async (req, res) => {
  const { tier } = req.params;
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  // Validate tier
  const validTiers = ['Enterprise', 'Mid-Market', 'Small-Business', 'Startup'];
  if (!validTiers.includes(tier)) {
    throw buildValidationError('tier', `Invalid tier. Must be one of: ${validTiers.join(', ')}`);
  }

  const clients = await Client.find({
    tier,
    isDeleted: false,
  })
    .populate('accountManager', 'firstName lastName fullName employeeId')
    .sort({ totalValue: -1 });

  return sendSuccess(res, clients, 'Clients by tier retrieved successfully');
});

/**
 * @desc    Search clients
 * @route   GET /api/clients/search
 * @access  Private (Admin, HR, Manager, Leads, Superadmin) - Employee NOT allowed
 */
export const searchClients = asyncHandler(async (req, res) => {
  const { q, page, limit } = req.query;
  const user = extractUser(req);

  // Role check: Employee cannot access clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access clients');
  }

  if (!q || !q.trim()) {
    throw buildValidationError('q', 'Search query is required');
  }

  const searchFilter = buildSearchFilter(q, ['name', 'displayName', 'industry', 'tags']);

  const result = await filterAndPaginate(
    Client,
    {
      isDeleted: false,
      ...searchFilter,
    },
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      populate: [
        {
          path: 'accountManager',
          select: 'firstName lastName fullName employeeId',
        },
      ],
    }
  );

  return sendSuccess(res, result.data, 'Client search results', 200, result.pagination);
});

/**
 * @desc    Get client statistics
 * @route   GET /api/clients/stats
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const getClientStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  // Role check: Only admin, hr, manager, superadmin can access client stats
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to access client statistics');
  }

  // Get tenant-specific collections
  const collections = getTenantCollections(user.companyId);

  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const stats = await collections.clients
    .aggregate([
      {
        $match: {
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }, { isDeleted: null }],
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] },
          },
          new: {
            $sum: {
              $cond: [
                {
                  $and: [{ $gte: ['$createdAt', sevenDaysAgo] }, { $ne: ['$createdAt', null] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  const rawStats = stats[0] || {
    total: 0,
    active: 0,
    inactive: 0,
    new: 0,
  };

  // Map to frontend expected property names
  const result = {
    total: rawStats.total,
    totalClients: rawStats.total,
    activeClients: rawStats.active,
    inactiveClients: rawStats.inactive,
    newClients: rawStats.new,
  };

  return sendSuccess(res, result, 'Client statistics retrieved successfully');
});

/**
 * @desc    Update deal statistics for a client
 * @route   PATCH /api/clients/:id/deal-stats
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const updateClientDealStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { won, value } = req.body;
  const user = extractUser(req);

  // Role check: Only admin, hr, manager, superadmin can update deal stats
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to update client deal statistics');
  }

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid client ID format');
  }

  // Find client
  const client = await Client.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!client) {
    throw buildNotFoundError('Client', id);
  }

  // Update deal statistics
  if (won) {
    client.wonDeals += 1;
    client.wonValue += value || 0;
  }

  client.totalDeals += 1;
  client.totalValue += value || 0;
  await client.save();

  return sendSuccess(
    res,
    {
      _id: client._id,
      clientId: client.clientId,
      totalDeals: client.totalDeals,
      wonDeals: client.wonDeals,
      totalValue: client.totalValue,
      wonValue: client.wonValue,
    },
    'Client deal statistics updated successfully'
  );
});

/**
 * @desc    Export clients as PDF
 * @route   GET /api/clients/export/pdf
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const exportPDF = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  // Role check: Only admin, hr, manager, superadmin can export clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to export clients');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get all clients from tenant-specific database
  const clients = await collections.clients
    .find({
      $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
    })
    .sort({ createdAt: -1 })
    .toArray();

  devLog('[ExportPDF] Found clients:', clients.length);

  // Create PDF document
  const doc = new PDFDocument();
  const fileName = `clients_${Date.now()}.pdf`;
  const tempDir = path.join(process.cwd(), 'temp');
  const filePath = path.join(tempDir, fileName);

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Pipe PDF to file
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Header
  doc.fontSize(20).text('Client Report', 50, 50);
  doc.fontSize(12).text(`Generated on: ${format(new Date(), 'PPP')}`, 50, 80);
  doc.text(`Total Clients: ${clients.length}`, 50, 100);

  let yPosition = 130;

  // Table header
  doc.fontSize(10).text('Name', 50, yPosition);
  doc.text('Company', 200, yPosition);
  doc.text('Email', 350, yPosition);
  doc.text('Status', 500, yPosition);
  doc.text('Created', 580, yPosition);

  yPosition += 20;

  // Draw line under header
  doc.moveTo(50, yPosition).lineTo(650, yPosition).stroke();

  yPosition += 10;

  // Client data
  clients.forEach((client) => {
    if (yPosition > 750) {
      doc.addPage();
      yPosition = 50;
    }

    doc.text(client.name || 'N/A', 50, yPosition);
    doc.text(client.company || 'N/A', 200, yPosition);
    doc.text(client.email || 'N/A', 350, yPosition);
    doc.text(client.status || 'N/A', 500, yPosition);
    doc.text(
      client.createdAt ? format(new Date(client.createdAt), 'MMM dd, yyyy') : 'N/A',
      580,
      yPosition
    );

    yPosition += 20;
  });

  // Finalize PDF
  doc.end();

  // Wait for file to be written
  writeStream.on('finish', () => {
    devLog('[ExportPDF] PDF file created successfully');
    // Send the file as a download response
    res.download(filePath, fileName, (err) => {
      if (err) {
        devError('[ExportPDF] Error sending PDF file:', err);
      }
      // Optionally delete the temp file after sending
      // fs.unlinkSync(filePath);
    });
  });

  writeStream.on('error', (err) => {
    devError('[ExportPDF] Error writing PDF file:', err);
    throw buildValidationError('export', 'Failed to generate PDF file');
  });
});

/**
 * @desc    Export clients as Excel
 * @route   GET /api/clients/export/excel
 * @access  Private (Admin, HR, Manager, Superadmin) - Employee, Leads NOT allowed
 */
export const exportExcel = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  // Role check: Only admin, hr, manager, superadmin can export clients
  if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
    return sendForbidden(res, 'You do not have permission to export clients');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get all clients from tenant-specific database
  const clients = await collections.clients
    .find({
      $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
    })
    .sort({ createdAt: -1 })
    .toArray();

  devLog('[ExportExcel] Found clients:', clients.length);

  // For each client, count projects from the project collection
  const clientsWithProjects = await Promise.all(
    clients.map(async (client) => {
      // Count projects where client name matches
      const projectCount = await collections.projects.countDocuments({
        client: client.name,
        $or: [{ isDeleted: false }, { isDeleted: null }, { isDeleted: { $exists: false } }],
      });

      return {
        ...client,
        projects: projectCount,
      };
    })
  );

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Clients');

  // Define columns
  worksheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Contract Value', key: 'contractValue', width: 15 },
    { header: 'Projects', key: 'projects', width: 10 },
    { header: 'Created At', key: 'createdAt', width: 20 },
  ];

  // Add data
  clientsWithProjects.forEach((client) => {
    worksheet.addRow({
      name: client.name || '',
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      status: client.status || '',
      contractValue: client.contractValue || 0,
      projects: client.projects || 0,
      createdAt: client.createdAt ? format(new Date(client.createdAt), 'MMM dd, yyyy') : '',
    });
  });

  // Style the header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  const fileName = `clients_${Date.now()}.xlsx`;
  const tempDir = path.join(process.cwd(), 'temp');
  const filePath = path.join(tempDir, fileName);

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write Excel file
  await workbook.xlsx.writeFile(filePath);

  devLog('[ExportExcel] Excel file created successfully');

  // Send the file as a download response
  res.download(filePath, fileName, (err) => {
    if (err) {
      devError('[ExportExcel] Error sending Excel file:', err);
    }
    // Optionally delete the temp file after sending
    // fs.unlinkSync(filePath);
  });
});

export default {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientsByAccountManager,
  getClientsByStatus,
  getClientsByTier,
  searchClients,
  getClientStats,
  updateClientDealStats,
  exportPDF,
  exportExcel,
};
