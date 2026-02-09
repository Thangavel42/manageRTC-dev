/**
 * Employee Schema - Mongoose Model
 * Core HRMS schema for employee management
 */

import mongoose from 'mongoose';
import { generateEmployeeId } from '../../utils/idGenerator.js';

/**
 * Address Sub-schema
 */
const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    trim: true,
    maxlength: 200
  },
  city: {
    type: String,
    trim: true,
    maxlength: 100
  },
  state: {
    type: String,
    trim: true,
    maxlength: 100
  },
  country: {
    type: String,
    trim: true,
    maxlength: 100
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: 20
  }
}, { _id: false });

/**
 * Personal Information Sub-schema
 * Additional personal details for employee profile
 */
const personalInfoSchema = new mongoose.Schema({
  passport: {
    number: {
      type: String,
      trim: true,
      maxlength: 50
    },
    expiryDate: {
      type: Date
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100
    }
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: 100
  },
  religion: {
    type: String,
    trim: true,
    maxlength: 50
  },
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
    default: 'Single'
  },
  employmentOfSpouse: {
    type: String,
    trim: true,
    maxlength: 200
  },
  noOfChildren: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  }
}, { _id: false });

/**
 * Salary Sub-schema
 */
const salarySchema = new mongoose.Schema({
  basic: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Basic salary cannot be negative']
  },
  hra: {
    type: Number,
    default: 0,
    min: [0, 'HRA cannot be negative']
  },
  allowances: {
    type: Number,
    default: 0,
    min: [0, 'Allowances cannot be negative']
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'],
    default: 'USD'
  }
}, { _id: false });

/**
 * Document Sub-schema
 */
const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['Resume', 'ID Proof', 'Address Proof', 'Education Certificate', 'Experience Letter', 'Offer Letter', 'Other']
  },
  fileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number // in bytes
  },
  mimeType: {
    type: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: false });

/**
 * Leave Balance Sub-schema
 * Structure: Array of leave type balances with total, used, and remaining
 * This matches the leave controller's expected format
 */
const leaveBalanceItemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['casual', 'sick', 'earned', 'compensatory', 'maternity', 'paternity', 'bereavement', 'unpaid', 'special'],
    required: true
  },
  total: {
    type: Number,
    default: 0,
    min: 0
  },
  used: {
    type: Number,
    default: 0,
    min: 0
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

const leaveBalanceSchema = new mongoose.Schema({
  balances: {
    type: [leaveBalanceItemSchema],
    default: function() {
      // Initialize with default leave balances
      return [
        { type: 'casual', total: 10, used: 0, balance: 10 },
        { type: 'sick', total: 10, used: 0, balance: 10 },
        { type: 'earned', total: 15, used: 0, balance: 15 },
        { type: 'compensatory', total: 2, used: 0, balance: 2 }
      ];
    }
  }
}, { _id: false });

/**
 * Main Employee Schema
 */
const employeeSchema = new mongoose.Schema({
  // Auto-generated employee ID (e.g., EMP-2026-001)
  employeeId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [2, 'First name must be at least 2 characters'],
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [2, 'Last name must be at least 2 characters'],
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  fullName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },

  // Personal Information
  personal: personalInfoSchema,

  address: addressSchema,

  // Employee Code
  employeeCode: {
    type: String,
    trim: true,
    index: true
  },

  // Department & Designation
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
    index: true
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: [true, 'Designation is required']
  },
  level: {
    type: String,
    enum: ['Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'Executive']
  },

  // Reporting Structure
  reportingTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  reportees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }],

  // Employment Details
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
    required: [true, 'Employment type is required']
  },
  employmentStatus: {
    type: String,
    enum: ['Active', 'Probation', 'Resigned', 'Terminated', 'On Leave'],
    default: 'Active',
    index: true
  },
  joiningDate: {
    type: Date,
    required: [true, 'Joining date is required'],
    index: true
  },
  confirmationDate: {
    type: Date
  },
  resignationDate: {
    type: Date
  },
  lastWorkingDate: {
    type: Date
  },

  // Work Location
  workLocation: {
    type: String,
    enum: ['Office', 'Remote', 'Hybrid'],
    default: 'Office'
  },
  workLocationDetails: {
    type: String,
    trim: true
  },

  // Shift Assignment
  shiftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift',
    index: true
  },
  shiftEffectiveDate: {
    type: Date
  },
  // Batch Assignment (for shift rotation groups)
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    index: true
  },

  // Salary Information
  salary: salarySchema,

  // Leave Balance
  leaveBalance: leaveBalanceSchema,

  // Documents
  documents: [documentSchema],

  // Skills & Qualifications
  skills: [{
    type: String,
    trim: true
  }],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    field: String
  }],
  experience: [{
    company: String,
    position: String,
    startDate: Date,
    endDate: Date,
    current: Boolean
  }],

  // Emergency Contact
  emergencyContact: {
    name: {
      type: String,
      trim: true
    },
    relationship: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    }
  },

  // Bank Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountType: {
      type: String,
      enum: ['Savings', 'Current']
    }
  },

  // Social Profiles
  socialProfiles: {
    linkedin: String,
    github: String,
    twitter: String
  },

  // Profile Image
  profileImage: {
    type: String
  },

  // Notes
  notes: {
    type: String,
    maxlength: 2000
  },

  // Company (Multi-tenant)
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: [true, 'Company is required'],
    index: true
  },

  // Clerk User ID (Authentication)
  clerkUserId: {
    type: String,
    unique: true,
    sparse: true
  },

  // User Role
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'],
    default: 'employee'
  },

  // Status Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Indexes
 */

// Compound indexes for common queries
employeeSchema.index({ companyId: 1, employmentStatus: 1 });
employeeSchema.index({ companyId: 1, department: 1 });
employeeSchema.index({ companyId: 1, designation: 1 });
employeeSchema.index({ companyId: 1, reportingTo: 1 });
employeeSchema.index({ isActive: 1, isDeleted: 1 });

// Text search index
employeeSchema.index({
  firstName: 'text',
  lastName: 'text',
  email: 'text',
  employeeCode: 'text',
  fullName: 'text'
});

/**
 * Virtuals
 */

// Virtual for employee's full name (computed if not set)
employeeSchema.virtual('name').get(function() {
  return this.fullName || `${this.firstName} ${this.lastName}`;
});

// Virtual for total salary
employeeSchema.virtual('totalSalary').get(function() {
  if (!this.salary) return 0;
  return (this.salary.basic || 0) + (this.salary.hra || 0) + (this.salary.allowances || 0);
});

// Virtual for tenure (in days)
employeeSchema.virtual('tenureDays').get(function() {
  const joiningDate = this.joiningDate ? new Date(this.joiningDate) : new Date();
  const endDate = this.lastWorkingDate || new Date();
  return Math.floor((endDate - joiningDate) / (1000 * 60 * 60 * 24));
});

// Virtual for probation completion status
employeeSchema.virtual('isProbationComplete').get(function() {
  if (!this.confirmationDate) return false;
  return new Date() >= new Date(this.confirmationDate);
});

/**
 * Pre-save Middleware
 */

// Generate employeeId before saving if not exists
employeeSchema.pre('save', async function(next) {
  if (!this.employeeId) {
    this.employeeId = await generateEmployeeId(this.companyId, this.joiningDate);
  }

  // Compute fullName if not set
  if (!this.fullName) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }

  next();
});

// Update reportees when reportingTo changes
employeeSchema.pre('save', async function(next) {
  if (this.isModified('reportingTo')) {
    const Employee = mongoose.model('Employee');

    // Remove from previous manager's reportees
    if (this._originalReportingTo) {
      await Employee.findByIdAndUpdate(
        this._originalReportingTo,
        { $pull: { reportees: this._id } }
      );
    }

    // Add to new manager's reportees
    if (this.reportingTo) {
      await Employee.findByIdAndUpdate(
        this.reportingTo,
        { $addToSet: { reportees: this._id } }
      );
    }
  }

  next();
});

// Store original reportingTo for comparison
employeeSchema.pre('save', function(next) {
  if (!this.isNew) {
    this._originalReportingTo = this.reportingTo;
  }
  next();
});

/**
 * Post-save Middleware
 */

// Update department count when employee changes department
employeeSchema.post('save', async function(doc) {
  const Employee = mongoose.model('Employee');

  if (doc.isModified('department') || doc.isModified('employmentStatus')) {
    // Trigger department employee count recalculation
    // This can be handled by a background job or cache invalidation
  }
});

/**
 * Static Methods
 */

// Get active employees only
employeeSchema.statics.getActiveEmployees = function(companyId) {
  return this.find({
    companyId,
    isActive: true,
    isDeleted: false
  });
};

// Get employees by department
employeeSchema.statics.getByDepartment = function(departmentId) {
  return this.find({
    department: departmentId,
    isActive: true,
    isDeleted: false
  }).populate('designation', 'title level');
};

// Get employees by manager
employeeSchema.statics.getByManager = function(managerId) {
  return this.find({
    reportingTo: managerId,
    isActive: true,
    isDeleted: false
  }).populate('department designation');
};

// Search employees
employeeSchema.statics.searchEmployees = function(companyId, searchTerm) {
  return this.find({
    companyId,
    isActive: true,
    isDeleted: false,
    $or: [
      { firstName: { $regex: searchTerm, $options: 'i' } },
      { lastName: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
      { employeeCode: { $regex: searchTerm, $options: 'i' } }
    ]
  });
};

/**
 * Instance Methods
 */

// Soft delete employee
employeeSchema.methods.softDelete = function(deletedBy) {
  this.isActive = false;
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.employmentStatus = 'Resigned';
  return this.save();
};

// Restore deleted employee
employeeSchema.methods.restore = function() {
  this.isActive = true;
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Update leave balance
employeeSchema.methods.updateLeaveBalance = function(type, days) {
  if (!this.leaveBalance || !this.leaveBalance.balances) {
    this.leaveBalance = { balances: [] };
  }

  const balanceItem = this.leaveBalance.balances.find(b => b.type === type);
  if (balanceItem) {
    balanceItem.balance += days;
    return this.save();
  }
  throw new Error(`Invalid leave type: ${type}`);
};

/**
 * Validation
 */

// Validate joining date is not in future
employeeSchema.pre('save', function(next) {
  if (this.joiningDate && this.joiningDate > new Date()) {
    next(new Error('Joining date cannot be in the future'));
  }
  next();
});

// Validate confirmation date is after joining date
employeeSchema.pre('save', function(next) {
  if (this.confirmationDate && this.joiningDate) {
    if (new Date(this.confirmationDate) <= new Date(this.joiningDate)) {
      next(new Error('Confirmation date must be after joining date'));
    }
  }
  next();
});

// Validate resignation date is after joining date
employeeSchema.pre('save', function(next) {
  if (this.resignationDate && this.joiningDate) {
    if (new Date(this.resignationDate) <= new Date(this.joiningDate)) {
      next(new Error('Resignation date must be after joining date'));
    }
  }
  next();
});

/**
 * Create and export model
 */
const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
