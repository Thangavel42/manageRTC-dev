/**
 * Sub-Contract Controller
 * Handles CRUD operations for sub-contracts
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import { extractUser } from '../../utils/apiResponse.js';
import { devError, devLog } from '../../utils/logger.js';

/**
 * Get all sub-contracts for a company
 * GET /api/subcontracts
 */
export const getAllSubContracts = async (req, res) => {
  try {
    const user = extractUser(req);
    const companyId = user.companyId;

    const { status, limit, skip } = req.query;

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    const subContracts = await collections.subcontracts
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit, 10) : 100)
      .skip(skip ? parseInt(skip, 10) : 0)
      .toArray();

    const total = await collections.subcontracts.countDocuments(query);

    devLog(`[SubContract] Retrieved ${subContracts.length} sub-contracts`);

    return res.status(200).json({
      success: true,
      data: subContracts,
      count: subContracts.length,
      total,
    });
  } catch (error) {
    devError('[SubContract] Error getting sub-contracts:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve sub-contracts' },
    });
  }
};

/**
 * Get a single sub-contract by ID
 * GET /api/subcontracts/:id
 */
export const getSubContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    const subContract = await collections.subcontracts.findOne({
      _id: new ObjectId(id),
    });

    if (!subContract) {
      return res.status(404).json({
        success: false,
        error: { message: 'Sub-contract not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: subContract,
    });
  } catch (error) {
    devError('[SubContract] Error getting sub-contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve sub-contract' },
    });
  }
};

/**
 * Create a new sub-contract
 * POST /api/subcontracts
 */
export const createSubContract = async (req, res) => {
  try {
    const user = extractUser(req);
    const companyId = user.companyId;
    const userId = user.userId;

    const { name, company, email, phone, address, logo, status, socialLinks } = req.body;

    // Validate required fields
    if (!name || !company || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name, company, email, phone, and address are required' },
      });
    }

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    // Check for duplicate email
    const existingSubContract = await collections.subcontracts.findOne({
      email: email.trim().toLowerCase(),
    });

    if (existingSubContract) {
      return res.status(400).json({
        success: false,
        error: { message: 'A sub-contract with this email already exists' },
      });
    }

    // Generate contract ID
    const year = new Date().getFullYear();

    // Find the highest contract ID for this year in tenant database
    const lastContract = await collections.subcontracts
      .find({ contractId: { $regex: `^SUBC-${year}-` } })
      .sort({ contractId: -1 })
      .limit(1)
      .toArray();

    let sequence = 1;
    if (lastContract && lastContract.length > 0 && lastContract[0].contractId) {
      const parts = lastContract[0].contractId.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]);
      sequence = lastSequence + 1;
    }

    const paddedSequence = String(sequence).padStart(4, '0');
    const contractId = `SUBC-${year}-${paddedSequence}`;

    // Create sub-contract document
    const subContractData = {
      contractId,
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      logo: logo?.trim() || '',
      status: status || 'Active',
      socialLinks: {
        instagram: socialLinks?.instagram?.trim() || '',
        facebook: socialLinks?.facebook?.trim() || '',
        linkedin: socialLinks?.linkedin?.trim() || '',
        whatsapp: socialLinks?.whatsapp?.trim() || '',
      },
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.subcontracts.insertOne(subContractData);

    devLog(`[SubContract] Created sub-contract ${result.insertedId}`);

    return res.status(201).json({
      success: true,
      data: { ...subContractData, _id: result.insertedId },
      message: 'Sub-contract created successfully',
    });
  } catch (error) {
    devError('[SubContract] Error creating sub-contract:', error);

    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create sub-contract' },
    });
  }
};

/**
 * Update a sub-contract
 * PUT /api/subcontracts/:id
 */
export const updateSubContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;
    const userId = user.userId;

    const { name, company, email, phone, address, logo, status, socialLinks } = req.body;

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    // Find sub-contract
    const subContract = await collections.subcontracts.findOne({
      _id: new ObjectId(id),
    });

    if (!subContract) {
      return res.status(404).json({
        success: false,
        error: { message: 'Sub-contract not found' },
      });
    }

    // Check for duplicate email (if email is being updated)
    if (email && email.trim().toLowerCase() !== subContract.email) {
      const existingSubContract = await collections.subcontracts.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: new ObjectId(id) },
      });

      if (existingSubContract) {
        return res.status(400).json({
          success: false,
          error: { message: 'A sub-contract with this email already exists' },
        });
      }
    }

    // Build update object
    const updateData = {
      updatedBy: userId,
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (company !== undefined) updateData.company = company.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (logo !== undefined) updateData.logo = logo.trim();
    if (status !== undefined) updateData.status = status;

    if (socialLinks) {
      updateData.socialLinks = { ...subContract.socialLinks };
      if (socialLinks.instagram !== undefined)
        updateData.socialLinks.instagram = socialLinks.instagram.trim();
      if (socialLinks.facebook !== undefined)
        updateData.socialLinks.facebook = socialLinks.facebook.trim();
      if (socialLinks.linkedin !== undefined)
        updateData.socialLinks.linkedin = socialLinks.linkedin.trim();
      if (socialLinks.whatsapp !== undefined)
        updateData.socialLinks.whatsapp = socialLinks.whatsapp.trim();
    }

    await collections.subcontracts.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Get updated document
    const updatedSubContract = await collections.subcontracts.findOne({
      _id: new ObjectId(id),
    });

    devLog(`[SubContract] Updated sub-contract ${id}`);

    return res.status(200).json({
      success: true,
      data: updatedSubContract,
      message: 'Sub-contract updated successfully',
    });
  } catch (error) {
    devError('[SubContract] Error updating sub-contract:', error);

    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update sub-contract' },
    });
  }
};

/**
 * Delete a sub-contract
 * DELETE /api/subcontracts/:id
 */
export const deleteSubContract = async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    const result = await collections.subcontracts.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Sub-contract not found' },
      });
    }

    devLog(`[SubContract] Deleted sub-contract ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Sub-contract deleted successfully',
    });
  } catch (error) {
    devError('[SubContract] Error deleting sub-contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete sub-contract' },
    });
  }
};

/**
 * Get sub-contract statistics
 * GET /api/subcontracts/stats
 */
export const getSubContractStats = async (req, res) => {
  try {
    const user = extractUser(req);
    const companyId = user.companyId;

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    const stats = await collections.subcontracts
      .aggregate([
        {
          $group: {
            _id: null,
            totalContracts: { $sum: 1 },
            activeContracts: {
              $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] },
            },
            inactiveContracts: {
              $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] },
            },
          },
        },
      ])
      .toArray();

    const result = stats[0] || {
      totalContracts: 0,
      activeContracts: 0,
      inactiveContracts: 0,
    };

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    devError('[SubContract] Error getting stats:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve statistics' },
    });
  }
};
