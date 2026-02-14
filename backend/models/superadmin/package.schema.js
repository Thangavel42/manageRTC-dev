/**
 * Package (Plan) Schema
 * Groups multiple modules together for subscription pricing
 *
 * RELATIONSHIP: Plan → Modules (Many-to-Many via planModules[].moduleId)
 * Uses ObjectId references for proper referential integrity
 */

import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  planName: { type: String, required: true },
  planType: { type: String, required: true },
  price: { type: Number, required: true },
  planPosition: { type: String, required: true },
  planCurrency: { type: String, required: true },
  planCurrencytype: { type: String, required: true },
  discountType: { type: String, required: true },
  discount: { type: Number, required: true },
  limitationsInvoices: { type: Number, required: true },
  maxCustomers: { type: Number, required: true },
  product: { type: Number, required: true },
  supplier: { type: Number, required: true },

  // ============================================
  // MODULES - REFACTORED TO USE OBJECTID
  // ============================================
  planModules: [{
    // ObjectId reference to Module (NEW - proper relationship)
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: false // Optional for backward compatibility during migration
    },
    // Legacy string ID (kept for migration)
    moduleIdLegacy: { type: String },
    // Denormalized fields (synced from Module)
    moduleName: { type: String },
    moduleDisplayName: { type: String },
    // Active status within this plan
    isActive: { type: Boolean, default: true }
  }],

  accessTrial: { type: Boolean, required: true },
  trialDays: { type: Number, required: true },
  isRecommended: { type: Boolean, required: true },
  status: { type: String, required: true },
  description: { type: String, required: true },
  logo: { type: String, required: true },

  // Migration flag
  isMigrated: { type: Boolean, default: false },

  // Audit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Indexes for plan
planSchema.index({ planType: 1, status: 1 });
planSchema.index({ 'planModules.moduleId': 1 });

// Static method to get plan with populated modules
planSchema.statics.getWithModules = function(planId) {
  return this.findById(planId).populate('planModules.moduleId');
};

// Static method to get all active plans with modules
planSchema.statics.getActiveWithModules = function() {
  return this.find({ status: 'Active' })
    .populate('planModules.moduleId')
    .sort({ planPosition: 1 });
};

// Static method to migrate legacy module IDs to ObjectId
planSchema.statics.migrateModuleIds = async function() {
  const Module = mongoose.model('Module');
  const plans = await this.find({ isMigrated: false });
  const results = { migrated: 0, skipped: 0, errors: [] };

  for (const plan of plans) {
    try {
      let hasChanges = false;

      for (const planModule of plan.planModules) {
        // If already has ObjectId, skip
        if (planModule.moduleId && mongoose.Types.ObjectId.isValid(planModule.moduleId)) {
          continue;
        }

        // Try to find module by name
        const module = await Module.findOne({ name: planModule.moduleName || planModule.moduleIdLegacy });
        if (module) {
          planModule.moduleId = module._id;
          planModule.moduleIdLegacy = planModule.moduleIdLegacy || planModule.moduleName;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        plan.isMigrated = true;
        await plan.save();
        results.migrated++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.errors.push({ planId: plan._id, error: error.message });
    }
  }

  return results;
};

export const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);

/**
 * Company Schema
 * Represents tenant companies with assigned packages
 *
 * RELATIONSHIP: Company → Plan (Many-to-One via planId)
 * Uses ObjectId reference for proper referential integrity
 */
const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  domain: { type: String, required: true },
  phone: { type: String, required: true },
  website: { type: String, required: true },
  address: { type: String, required: true },
  status: { type: String, default: "Active" },

  // ============================================
  // PLAN REFERENCE - REFACTORED TO USE OBJECTID
  // ============================================
  // ObjectId reference to Plan (NEW - proper relationship)
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: false // Optional for backward compatibility during migration
  },
  // Legacy plan ID (kept for migration)
  plan_id: { type: String },
  // Denormalized plan fields (synced from Plan)
  plan_name: { type: String },
  plan_type: { type: String },
  currency: { type: String },
  logo: { type: String },

  // Migration flag
  isMigrated: { type: Boolean, default: false },

  // Audit fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Indexes for company
companySchema.index({ domain: 1 }, { unique: true, sparse: true });
companySchema.index({ email: 1 });
companySchema.index({ status: 1 });
companySchema.index({ planId: 1 });

// Static method to get company with populated plan
companySchema.statics.getWithPlan = function(companyId) {
  return this.findById(companyId)
    .populate({
      path: 'planId',
      populate: { path: 'planModules.moduleId' }
    });
};

// Static method to get all companies with plans
companySchema.statics.getAllWithPlans = function() {
  return this.find({})
    .populate('planId')
    .sort({ createdAt: -1 });
};

// Static method to migrate legacy plan IDs to ObjectId
companySchema.statics.migratePlanIds = async function() {
  const Plan = mongoose.model('Plan');
  const companies = await this.find({ isMigrated: false });
  const results = { migrated: 0, skipped: 0, errors: [] };

  for (const company of companies) {
    try {
      // If already has ObjectId, skip
      if (company.planId && mongoose.Types.ObjectId.isValid(company.planId)) {
        company.isMigrated = true;
        await company.save();
        results.migrated++;
        continue;
      }

      // Try to find plan by legacy ID or name
      let plan;
      if (company.plan_id && mongoose.Types.ObjectId.isValid(company.plan_id)) {
        plan = await Plan.findById(company.plan_id);
      }
      if (!plan && company.plan_name) {
        plan = await Plan.findOne({ planName: company.plan_name });
      }

      if (plan) {
        company.planId = plan._id;
        company.isMigrated = true;
        await company.save();
        results.migrated++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      results.errors.push({ companyId: company._id, error: error.message });
    }
  }

  return results;
};

export const Company = mongoose.models.Company || mongoose.model("Company", companySchema);
