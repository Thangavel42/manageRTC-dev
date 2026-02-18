/**
 * Project Sub-Contract Controller
 * Handles CRUD operations for sub-contracts within a specific project
 */

import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import Project from '../../models/project/project.schema.js';
import { extractUser } from '../../utils/apiResponse.js';
import { devError, devLog } from '../../utils/logger.js';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';

/**
 * Get all sub-contracts for a specific project
 * GET /api/projects/:projectId/subcontracts
 */
export const getProjectSubContracts = async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    devLog(`[ProjectSubContract] Getting sub-contracts for project ${projectId}`);

    // Get tenant-specific Project model and collections
    const ProjectModel = getTenantModel(companyId, 'Project', Project.schema);
    const collections = getTenantCollections(companyId);

    // Find project by either MongoDB _id or custom projectId field
    let project;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      // Try finding by _id first (tenant model already filters by company via database)
      project = await ProjectModel.findOne({ _id: projectId });
    }
    if (!project) {
      // If not found by _id, try finding by projectId field
      project = await ProjectModel.findOne({ projectId });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { message: 'Project not found' },
      });
    }

    // Filter out soft-deleted sub-contracts
    const activeSubContracts = project.subContracts?.filter((sc) => !sc.isDeleted) || [];

    devLog(
      `[ProjectSubContract] Raw sub-contracts from DB:`,
      JSON.stringify(activeSubContracts, null, 2)
    );

    // Populate sub-contract details from SubContract collection
    const populatedSubContracts = await Promise.all(
      activeSubContracts.map(async (detail) => {
        devLog(`[ProjectSubContract] Processing detail:`, {
          hasSubContractId: !!detail.subContractId,
          hasContractName: !!detail.contractName,
          contractName: detail.contractName,
          allKeys: Object.keys(detail),
        });

        // Handle both old embedded data and new reference-based data
        if (detail.subContractId) {
          // New structure: fetch from SubContract collection
          const subContract = await collections.subcontracts.findOne({
            _id: new ObjectId(detail.subContractId),
          });

          return {
            _id: detail._id,
            subContractId: detail.subContractId,
            contractId: subContract?.contractId || '',
            contractName: subContract?.name || '',
            contractDate: detail.contractDate,
            numberOfMembers: detail.numberOfMembers,
            totalAmount: detail.totalAmount,
            currency: detail.currency,
            description: detail.description,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
          };
        } else {
          // Old structure: embedded data (legacy support)
          const result = {
            _id: detail._id,
            subContractId: null,
            contractId: '', // Old data doesn't have contractId
            contractName: detail.contractName || '',
            contractDate: detail.contractDate,
            numberOfMembers: detail.numberOfMembers,
            totalAmount: detail.totalAmount,
            currency: detail.currency,
            description: detail.description,
            createdAt: detail.createdAt,
            updatedAt: detail.updatedAt,
          };
          devLog(`[ProjectSubContract] Legacy data result:`, result);
          return result;
        }
      })
    );

    devLog(`[ProjectSubContract] Found ${populatedSubContracts.length} active sub-contracts`);

    return res.status(200).json({
      success: true,
      data: populatedSubContracts,
      count: populatedSubContracts.length,
    });
  } catch (error) {
    devError('[ProjectSubContract] Error getting sub-contracts:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve sub-contracts' },
    });
  }
};

/**
 * Create a new sub-contract for a project
 * POST /api/projects/:projectId/subcontracts
 */
export const createProjectSubContract = async (req, res) => {
  try {
    const { projectId } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    const { contractName, contractDate, numberOfMembers, totalAmount, description, currency } =
      req.body;

    // Validate required fields
    if (
      !contractName ||
      !contractDate ||
      numberOfMembers === undefined ||
      totalAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: { message: 'Contract name, date, number of members, and total amount are required' },
      });
    }

    devLog(`[ProjectSubContract] Creating sub-contract for project ${projectId}`);
    devLog(`[ProjectSubContract] Company ID: ${companyId}`);

    // Get tenant-specific Project model
    const ProjectModel = getTenantModel(companyId, 'Project', Project.schema);

    // Find project by either MongoDB _id or custom projectId field
    let project;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      // Try finding by _id first (tenant model already filters by company via database)
      devLog(`[ProjectSubContract] Searching by _id: ${projectId}`);
      project = await ProjectModel.findOne({ _id: projectId });
      devLog(`[ProjectSubContract] Found by _id:`, project ? 'Yes' : 'No');
    }
    if (!project) {
      // If not found by _id, try finding by projectId field
      devLog(`[ProjectSubContract] Searching by projectId field: ${projectId}`);
      project = await ProjectModel.findOne({ projectId });
      devLog(`[ProjectSubContract] Found by projectId field:`, project ? 'Yes' : 'No');
    }

    if (!project) {
      devLog(`[ProjectSubContract] Project not found. Searched for: ${projectId}`);
      return res.status(404).json({
        success: false,
        error: { message: 'Project not found' },
      });
    }

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    // Find the SubContract by name in the SubContract collection
    const subContract = await collections.subcontracts.findOne({
      name: contractName.trim(),
    });

    if (!subContract) {
      return res.status(404).json({
        success: false,
        error: { message: `Sub-contract '${contractName}' not found in sub-contracts collection` },
      });
    }

    // Create new sub-contract reference with project-specific details
    const newSubContractDetail = {
      _id: new ObjectId(),
      subContractId: subContract._id,
      contractDate: new Date(contractDate),
      numberOfMembers: parseInt(numberOfMembers, 10),
      totalAmount: parseFloat(totalAmount),
      currency: currency || '$',
      description: description?.trim() || '',
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add sub-contract detail to project's subContracts array
    if (!project.subContracts) {
      project.subContracts = [];
    }
    project.subContracts.push(newSubContractDetail);
    project.updatedAt = new Date();

    // Save project
    await project.save();

    devLog(
      `[ProjectSubContract] Created sub-contract detail ${newSubContractDetail._id} for project ${projectId}`
    );

    // Return populated data
    const response = {
      _id: newSubContractDetail._id,
      subContractId: subContract._id,
      contractId: subContract.contractId,
      contractName: subContract.name,
      contractDate: newSubContractDetail.contractDate,
      numberOfMembers: newSubContractDetail.numberOfMembers,
      totalAmount: newSubContractDetail.totalAmount,
      currency: newSubContractDetail.currency,
      description: newSubContractDetail.description,
      createdAt: newSubContractDetail.createdAt,
      updatedAt: newSubContractDetail.updatedAt,
    };

    return res.status(201).json({
      success: true,
      data: response,
      message: 'Sub-contract added to project successfully',
    });
  } catch (error) {
    devError('[ProjectSubContract] Error creating sub-contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create sub-contract' },
    });
  }
};

/**
 * Update a sub-contract in a project
 * PUT /api/projects/:projectId/subcontracts/:subContractId
 */
export const updateProjectSubContract = async (req, res) => {
  try {
    const { projectId, subContractId } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    const { contractName, contractDate, numberOfMembers, totalAmount, description, currency } =
      req.body;

    devLog(`[ProjectSubContract] Updating sub-contract ${subContractId} in project ${projectId}`);

    // Get tenant-specific Project model
    const ProjectModel = getTenantModel(companyId, 'Project', Project.schema);

    // Find project by either MongoDB _id or custom projectId field
    let project;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      // Try finding by _id first (tenant model already filters by company via database)
      project = await ProjectModel.findOne({ _id: projectId });
    }
    if (!project) {
      // If not found by _id, try finding by projectId field
      project = await ProjectModel.findOne({ projectId });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { message: 'Project not found' },
      });
    }

    // Find the sub-contract in the project's subContracts array (excluding deleted ones)
    const subContractIndex = project.subContracts?.findIndex(
      (sc) => sc._id.toString() === subContractId && !sc.isDeleted
    );

    if (subContractIndex === -1 || subContractIndex === undefined) {
      return res.status(404).json({
        success: false,
        error: { message: 'Sub-contract not found in this project' },
      });
    }

    // Get tenant-specific collections
    const collections = getTenantCollections(companyId);

    // Update sub-contract fields (project-specific details only)
    const subContract = project.subContracts[subContractIndex];

    if (contractDate !== undefined) subContract.contractDate = new Date(contractDate);
    if (numberOfMembers !== undefined) subContract.numberOfMembers = parseInt(numberOfMembers, 10);
    if (totalAmount !== undefined) subContract.totalAmount = parseFloat(totalAmount);
    if (currency !== undefined) subContract.currency = currency;
    if (description !== undefined) subContract.description = description.trim();

    subContract.updatedAt = new Date();
    project.updatedAt = new Date();

    // Save project
    await project.save();

    // Get the sub-contract info for response
    let subContractInfo = null;
    if (subContract.subContractId) {
      subContractInfo = await collections.subcontracts.findOne({
        _id: new ObjectId(subContract.subContractId),
      });
    }

    devLog(`[ProjectSubContract] Updated sub-contract ${subContractId} in project ${projectId}`);

    // Return populated data
    const response = {
      _id: subContract._id,
      subContractId: subContract.subContractId || null,
      contractId: subContractInfo?.contractId || '',
      contractName: subContractInfo?.name || subContract.contractName || '',
      contractDate: subContract.contractDate,
      numberOfMembers: subContract.numberOfMembers,
      totalAmount: subContract.totalAmount,
      currency: subContract.currency,
      description: subContract.description,
      createdAt: subContract.createdAt,
      updatedAt: subContract.updatedAt,
    };

    return res.status(200).json({
      success: true,
      data: response,
      message: 'Sub-contract updated successfully',
    });
  } catch (error) {
    devError('[ProjectSubContract] Error updating sub-contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update sub-contract' },
    });
  }
};

/**
 * Delete a sub-contract from a project
 * DELETE /api/projects/:projectId/subcontracts/:subContractId
 */
export const deleteProjectSubContract = async (req, res) => {
  try {
    const { projectId, subContractId } = req.params;
    const user = extractUser(req);
    const companyId = user.companyId;

    devLog(`[ProjectSubContract] Deleting sub-contract ${subContractId} from project ${projectId}`);

    // Get tenant-specific Project model
    const ProjectModel = getTenantModel(companyId, 'Project', Project.schema);

    // Find project by either MongoDB _id or custom projectId field
    let project;
    if (mongoose.Types.ObjectId.isValid(projectId)) {
      // Try finding by _id first (tenant model already filters by company via database)
      project = await ProjectModel.findOne({ _id: projectId });
    }
    if (!project) {
      // If not found by _id, try finding by projectId field
      project = await ProjectModel.findOne({ projectId });
    }

    if (!project) {
      return res.status(404).json({
        success: false,
        error: { message: 'Project not found' },
      });
    }

    // Find the sub-contract in the project's subContracts array
    const subContract = project.subContracts?.find(
      (sc) => sc._id.toString() === subContractId && !sc.isDeleted
    );

    if (!subContract) {
      return res.status(404).json({
        success: false,
        error: { message: 'Sub-contract not found in this project' },
      });
    }

    // Soft delete: mark as deleted instead of removing from array
    subContract.isDeleted = true;
    subContract.updatedAt = new Date();
    project.updatedAt = new Date();

    // Save project
    await project.save();

    devLog(
      `[ProjectSubContract] Soft deleted sub-contract ${subContractId} from project ${projectId}`
    );

    return res.status(200).json({
      success: true,
      message: 'Sub-contract deleted successfully',
    });
  } catch (error) {
    devError('[ProjectSubContract] Error deleting sub-contract:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete sub-contract' },
    });
  }
};
