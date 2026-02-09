# PROFILE PAGE IMPLEMENTATION PLAN
## Phase-by-Phase Roadmap

**Date:** 2026-02-07
**Component:** Profile Page Enhancement
**Estimated Duration:** 6-8 Weeks

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Phase 1: Foundation & Admin Profile](#phase-1-foundation--admin-profile)
3. [Phase 2: Personal Information Section](#phase-2-personal-information-section)
4. [Phase 3: Bank Information Section](#phase-3-bank-information-section)
5. [Phase 4: Extended Fields (Education, Experience, Family)](#phase-4-extended-fields-education-experience-family)
6. [Phase 5: Employee Lifecycle Status](#phase-5-employee-lifecycle-status)
7. [Phase 6: Permission System](#phase-6-permission-system)
8. [Phase 7: Testing & Documentation](#phase-7-testing--documentation)
9. [Dependencies & Risks](#dependencies--risks)

---

## Project Overview

### Current State
- ✅ Basic profile page exists with REST API
- ✅ Basic information, address, emergency contact, social links work
- ❌ Personal Information section missing
- ❌ Bank Information section missing
- ❌ Education/Experience/Family are view-only
- ❌ Admin uses same profile page as employees
- ❌ No role-based permission enforcement

### Target State
- ✅ Separate admin profile page with company information
- ✅ Complete personal information section
- ✅ Complete bank information section
- ✅ Editable education, experience, family, documents
- ✅ Employee lifecycle status indicators
- ✅ Role-based field permissions (frontend + backend)
- ✅ Full test coverage

### Success Metrics
- All required fields present and functional
- Permission system prevents unauthorized edits
- Admin has dedicated profile page
- API properly validates permissions
- 90%+ test coverage

---

## Phase 1: Foundation & Admin Profile

**Duration:** Week 1-2
**Priority:** P0 - Critical
**Dependencies:** None

### Objectives
1. Create separate admin profile page
2. Set up permission configuration infrastructure
3. Fix schema issues for personal information

### Tasks

#### 1.1 Admin Profile Page

**Files to Create:**
```
react/src/feature-module/pages/admin-profile/
├── index.tsx                    # Main admin profile component
├── CompanyInfoSection.tsx        # Company details display
├── SubscriptionInfoSection.tsx   # Subscription details
├── CompanySettingsSection.tsx    # Company settings form
└── types.ts                      # TypeScript interfaces
```

**Backend Changes:**

**File:** `backend/routes/api/user-profile.js`
```javascript
// Add new route
router.get(
  '/admin',
  authenticate,
  requireRole(['admin']),
  getAdminProfile
);

router.put(
  '/admin',
  authenticate,
  requireRole(['admin']),
  updateAdminProfile
);
```

**File:** `backend/controllers/rest/userProfile.controller.js`
```javascript
/**
 * @desc    Get admin profile (company information)
 * @route   GET /api/user-profile/admin
 * @access  Private (Admin only)
 */
export const getAdminProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  if (user.role !== 'admin') {
    throw buildForbiddenError('Only admin can access this endpoint');
  }

  const { companiesCollection } = getsuperadminCollections();
  const { getTenantCollections } = await import('../../config/db.js');

  // Get company details
  const company = await companiesCollection.findOne({
    _id: new ObjectId(user.companyId)
  });

  // Get subscription details
  const subscriptions = await client.db('superadmin').collection('subscriptions');
  const subscription = await subscriptions.findOne({
    companyId: company._id
  });

  // Get employee count
  const collections = getTenantCollections(user.companyId);
  const employeeCount = await collections.employees.countDocuments({
    isDeleted: { $ne: true }
  });

  const profileData = {
    // Company Info
    companyId: company._id.toString(),
    companyName: company.name,
    companyLogo: company.logo,
    domain: company.domain,
    email: company.email,
    phone: company.phone,
    website: company.website,
    description: company.description,
    status: company.status,
    createdAt: company.createdAt,

    // Subscription Info
    subscription: {
      planId: subscription?.planId,
      planName: subscription?.planName,
      userLimit: subscription?.userLimit,
      currentUsers: employeeCount,
      renewalDate: subscription?.renewalDate,
      status: subscription?.status
    },

    // Admin User Info
    adminName: user.firstName + ' ' + user.lastName,
    adminEmail: user.email,
    role: 'admin'
  };

  return sendSuccess(res, profileData, 'Admin profile retrieved successfully');
});
```

**Route Update:**

**File:** `react/src/feature-module/router/all_routes.tsx`
```typescript
export const all_routes = {
  // ... existing routes
  adminProfile: "/admin/profile",
  employeeProfile: "/pages/profile"
};
```

**Role-Based Routing:**

**File:** `react/src/feature-module/router/withRoleCheck.jsx`
```typescript
import { useAuth } from '../hooks/useAuth';
import { all_routes } from './all_routes';
import AdminProfilePage from '../pages/admin-profile';
import EmployeeProfilePage from '../pages/profile';

export const ProfileRouter = () => {
  const { role } = useAuth();

  if (role === 'admin') {
    return <Redirect to={all_routes.adminProfile} />;
  }

  return <EmployeeProfilePage />;
};
```

#### 1.2 Permission Configuration

**File:** `react/src/config/fieldPermissions.ts`
```typescript
// See full implementation in ROLE_BASED_FIELD_PERMISSIONS_REPORT.md
export const FIELD_PERMISSIONS: Record<string, RolePermissions> = {
  superadmin: { /* ... */ },
  admin: { /* ... */ },
  hr: { /* ... */ },
  manager: { /* ... */ },
  lead: { /* ... */ },
  employee: { /* ... */ }
};

export function canEditField(role: string, field: string): boolean { /* ... */ }
export function canViewField(role: string, field: string): boolean { /* ... */ }
```

#### 1.3 Schema Updates

**File:** `backend/models/employee/employee.schema.js`
```javascript
// Add personal information schema
const personalInfoSchema = new mongoose.Schema({
  passport: {
    number: { type: String, trim: true },
    expiryDate: { type: Date },
    country: { type: String, trim: true }
  },
  nationality: { type: String, trim: true },
  religion: { type: String, trim: true },
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other']
  },
  employmentOfSpouse: { type: String, trim: true },
  noOfChildren: { type: Number, default: 0, min: 0 }
}, { _id: false });

// Add to main schema
const employeeSchema = new mongoose.Schema({
  // ... existing fields
  personal: personalInfoSchema,

  // Bank details already exist - ensure they're properly defined
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    branch: { type: String, trim: true },
    accountType: {
      type: String,
      enum: ['Savings', 'Current'],
      default: 'Savings'
    }
  }
});
```

**Migration Script:**
```javascript
// backend/migrations/addPersonalInfoFields.js
export const up = async () => {
  // Migrate any existing personal info from legacy format
  const { client } = await import('../config/db.js');
  const companies = await client.db('admin').collection('companies').find().toArray();

  for (const company of companies) {
    const collections = getTenantCollections(company._id.toString());

    // Update employees who have personal info in different format
    await collections.employees.updateMany(
      {
        'personal': { $exists: false }
      },
      {
        $set: {
          personal: {
            passport: {
              number: '',
              expiryDate: null,
              country: ''
            },
            nationality: '',
            religion: '',
            maritalStatus: 'Single',
            employmentOfSpouse: '',
            noOfChildren: 0
          }
        }
      }
    );
  }
};
```

### Acceptance Criteria
- [ ] Admin users redirected to dedicated admin profile page
- [ ] Admin profile shows company information (name, logo, domain, etc.)
- [ ] Admin profile shows subscription details
- [ ] Admin can edit company settings (phone, website, description)
- [ ] Personal info schema added to employee model
- [ ] Migration script runs successfully

---

## Phase 2: Personal Information Section

**Duration:** Week 3
**Priority:** P0 - Critical
**Dependencies:** Phase 1 complete

### Objectives
1. Add Personal Information section to profile page
2. Implement edit form for personal fields
3. Backend API support for personal fields

### Tasks

#### 2.1 Frontend Components

**File:** `react/src/feature-module/pages/profile/components/PersonalInfoSection.tsx`
```typescript
import React from 'react';
import { PermissionField } from '../../../components/PermissionField';

interface PersonalInfo {
  passport?: {
    number: string;
    expiryDate: string;
    country: string;
  };
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  employmentOfSpouse?: string;
  noOfChildren?: number;
}

interface PersonalInfoSectionProps {
  personalInfo: PersonalInfo;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  personalInfo,
  isEditing,
  onChange
}) => {
  const maritalStatusOptions = [
    { value: 'Select', label: 'Select' },
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' },
    { value: 'Other', label: 'Other' }
  ];

  const countryOptions = [
    // ... country list
  ];

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Personal Information</h6>
      <div className="row">
        {/* Passport No */}
        <PermissionField field="personal.passport.number" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Passport Number</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.passport?.number || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Passport Exp Date */}
        <PermissionField field="personal.passport.expiryDate" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Passport Expiry Date</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.passport?.expiryDate
                ? new Date(personalInfo.passport.expiryDate).toLocaleDateString()
                : 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Nationality */}
        <PermissionField field="personal.nationality" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Nationality</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.nationality || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Religion */}
        <PermissionField field="personal.religion" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Religion</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.religion || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Marital Status */}
        <PermissionField field="personal.maritalStatus" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Marital Status</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.maritalStatus || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* Employment of Spouse */}
        <PermissionField field="personal.employmentOfSpouse" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Employment of Spouse</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.employmentOfSpouse || 'N/A'}
            </p>
          </div>
        </PermissionField>

        {/* No. of Children */}
        <PermissionField field="personal.noOfChildren" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">No. of Children</label>
            <p className="mb-0 fw-medium">
              {personalInfo?.noOfChildren ?? 'N/A'}
            </p>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="border-bottom mb-3">
      <h6 className="mb-3">Personal Information</h6>
      <div className="row">
        {/* Passport No */}
        <PermissionField field="personal.passport.number" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Passport Number</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.passport?.number || ''}
                  onChange={(e) => onChange('personal.passport.number', e.target.value)}
                  placeholder="Enter passport number"
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Passport Exp Date */}
        <PermissionField field="personal.passport.expiryDate" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Passport Exp Date</label>
              </div>
              <div className="col-md-8">
                <input
                  type="date"
                  className="form-control"
                  value={personalInfo?.passport?.expiryDate || ''}
                  onChange={(e) => onChange('personal.passport.expiryDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Nationality */}
        <PermissionField field="personal.nationality" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Nationality</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={countryOptions}
                  defaultValue={countryOptions.find(c => c.value === personalInfo?.nationality) || countryOptions[0]}
                  onChange={(option) => onChange('personal.nationality', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Religion */}
        <PermissionField field="personal.religion" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Religion</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.religion || ''}
                  onChange={(e) => onChange('personal.religion', e.target.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Marital Status */}
        <PermissionField field="personal.maritalStatus" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Marital Status</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={maritalStatusOptions}
                  defaultValue={maritalStatusOptions.find(s => s.value === personalInfo?.maritalStatus) || maritalStatusOptions[0]}
                  onChange={(option) => onChange('personal.maritalStatus', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* Employment of Spouse */}
        <PermissionField field="personal.employmentOfSpouse" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Employment of Spouse</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={personalInfo?.employmentOfSpouse || ''}
                  onChange={(e) => onChange('personal.employmentOfSpouse', e.target.value)}
                  placeholder="Employer name / Not Employed"
                />
              </div>
            </div>
          </div>
        </PermissionField>

        {/* No. of Children */}
        <PermissionField field="personal.noOfChildren" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">No. of Children</label>
              </div>
              <div className="col-md-8">
                <input
                  type="number"
                  className="form-control"
                  value={personalInfo?.noOfChildren || 0}
                  onChange={(e) => onChange('personal.noOfChildren', parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};
```

#### 2.2 Backend Updates

**File:** `backend/controllers/rest/userProfile.controller.js`
```javascript
// Update updateCurrentUserProfile to handle personal info
export const updateCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const updateData = req.body;

  // ... existing code

  // Handle personal information
  if (updateData.personal) {
    sanitizedUpdate.personal = {
      'passport.number': updateData.personal.passport?.number || '',
      'passport.expiryDate': updateData.personal.passport?.expiryDate || null,
      'passport.country': updateData.personal.passport?.country || '',
      nationality: updateData.personal.nationality || '',
      religion: updateData.personal.religion || '',
      maritalStatus: updateData.personal.maritalStatus || 'Single',
      employmentOfSpouse: updateData.personal.employmentOfSpouse || '',
      noOfChildren: updateData.personal.noOfChildren || 0
    };
  }

  // Handle nested personal fields directly (e.g., personal.passport.number)
  Object.keys(updateData).forEach(key => {
    if (key.startsWith('personal.')) {
      const [parent, ...rest] = key.split('.');
      if (!sanitizedUpdate.personal) {
        sanitizedUpdate.personal = {};
      }

      const fieldPath = rest.join('.');
      sanitizedUpdate.personal[fieldPath] = updateData[key];
    }
  });
});
```

#### 2.3 Update Profile Page

**File:** `react/src/feature-module/pages/profile/index.tsx`
```typescript
// Add to imports
import { PersonalInfoSection } from './components/PersonalInfoSection';

// Add to formData state
const [formData, setFormData] = useState<Partial<Profile>>({
  // ... existing fields
  personal: {
    passport: {
      number: '',
      expiryDate: '',
      country: ''
    },
    nationality: '',
    religion: '',
    maritalStatus: 'Single',
    employmentOfSpouse: '',
    noOfChildren: 0
  }
});

// Add to renderViewMode
const renderViewMode = () => (
  <div className="profile-view">
    {/* ... existing sections */}

    {/* Personal Information */}
    <PersonalInfoSection
      personalInfo={currentUserProfile?.personal || {}}
      isEditing={false}
      onChange={() => {}}
    />
  </div>
);

// Add to renderEditMode
const renderEditMode = () => (
  <form onSubmit={handleSubmit}>
    {/* ... existing sections */}

    {/* Personal Information */}
    <PersonalInfoSection
      personalInfo={formData.personal || {}}
      isEditing={true}
      onChange={handleNestedChange}
    />
  </form>
);
```

### Acceptance Criteria
- [ ] Personal Information section displays in view mode
- [ ] All 7 fields visible and properly formatted
- [ ] Edit mode shows all fields with appropriate inputs
- [ ] Form validation works (date format, number range)
- [ ] Backend saves personal information correctly
- [ ] Permission system controls edit access

---

## Phase 3: Bank Information Section

**Duration:** Week 4
**Priority:** P0 - Critical
**Dependencies:** Phase 2 complete

### Objectives
1. Add Bank Information section to profile page
2. Implement secure handling for account number (masking)
3. Backend API support with validation

### Tasks

#### 3.1 Frontend Components

**File:** `react/src/feature-module/pages/profile/components/BankInfoSection.tsx`
```typescript
import React from 'react';
import { PermissionField } from '../../../components/PermissionField';

interface BankInfo {
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branch?: string;
  accountType?: 'Savings' | 'Current';
}

interface BankInfoSectionProps {
  bankInfo: BankInfo;
  isEditing: boolean;
  onChange: (field: string, value: any) => void;
}

// Utility to mask account number
const maskAccountNumber = (accountNumber: string) => {
  if (!accountNumber || accountNumber.length < 4) return '••••';
  return '•••• ' + accountNumber.slice(-4);
};

export const BankInfoSection: React.FC<BankInfoSectionProps> = ({
  bankInfo,
  isEditing,
  onChange
}) => {
  const accountTypeOptions = [
    { value: 'Savings', label: 'Savings' },
    { value: 'Current', label: 'Current' }
  ];

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Bank Information</h6>
      <div className="row">
        <PermissionField field="bankDetails.bankName" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Bank Name</label>
            <p className="mb-0 fw-medium">{bankInfo?.bankName || 'N/A'}</p>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.accountNumber" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Account Number</label>
            <p className="mb-0 fw-medium">
              {bankInfo?.accountNumber ? maskAccountNumber(bankInfo.accountNumber) : 'N/A'}
            </p>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.ifscCode" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">IFSC Code</label>
            <p className="mb-0 fw-medium text-uppercase">
              {bankInfo?.ifscCode || 'N/A'}
            </p>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.branch" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Branch</label>
            <p className="mb-0 fw-medium">{bankInfo?.branch || 'N/A'}</p>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.accountType" editMode={false}>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Account Type</label>
            <p className="mb-0 fw-medium">{bankInfo?.accountType || 'N/A'}</p>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  const renderEditMode = () => (
    <div className="border-bottom mb-3">
      <h6 className="mb-3">Bank Information</h6>
      <div className="alert alert-info mb-3">
        <i className="ti ti-info-circle me-2"></i>
        Your bank information is used for payroll processing. Please ensure details are accurate.
      </div>
      <div className="row">
        <PermissionField field="bankDetails.bankName" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Bank Name *</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={bankInfo?.bankName || ''}
                  onChange={(e) => onChange('bankDetails.bankName', e.target.value)}
                  placeholder="e.g., State Bank of India"
                  required
                />
              </div>
            </div>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.accountNumber" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Account Number *</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={bankInfo?.accountNumber || ''}
                  onChange={(e) => onChange('bankDetails.accountNumber', e.target.value)}
                  placeholder="Enter account number"
                  required
                />
                <small className="text-muted">
                  This will be masked from other users
                </small>
              </div>
            </div>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.ifscCode" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">IFSC Code *</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={bankInfo?.ifscCode || ''}
                  onChange={(e) => onChange('bankDetails.ifscCode', e.target.value.toUpperCase())}
                  placeholder="e.g., SBIN0001234"
                  pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
                  required
                />
                <small className="text-muted">
                  11 character IFSC code
                </small>
              </div>
            </div>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.branch" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Branch *</label>
              </div>
              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={bankInfo?.branch || ''}
                  onChange={(e) => onChange('bankDetails.branch', e.target.value)}
                  placeholder="e.g., Connaught Place, New Delhi"
                  required
                />
              </div>
            </div>
          </div>
        </PermissionField>

        <PermissionField field="bankDetails.accountType" editMode={true}>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Account Type</label>
              </div>
              <div className="col-md-8">
                <CommonSelect
                  className="select"
                  options={accountTypeOptions}
                  defaultValue={accountTypeOptions.find(t => t.value === bankInfo?.accountType) || accountTypeOptions[0]}
                  onChange={(option) => onChange('bankDetails.accountType', option.value)}
                />
              </div>
            </div>
          </div>
        </PermissionField>
      </div>
    </div>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};
```

#### 3.2 Backend Updates

**File:** `backend/controllers/rest/userProfile.controller.js`
```javascript
// Add to updateCurrentUserProfile
if (updateData.bankDetails) {
  // Validate IFSC code format
  if (updateData.bankDetails.ifscCode) {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(updateData.bankDetails.ifscCode)) {
      throw buildValidationError(
        'ifscCode',
        'Invalid IFSC code format. Must be 11 characters: 4 letters + 0 + 6 alphanumeric characters'
      );
    }
  }

  sanitizedUpdate.bankDetails = {
    bankName: updateData.bankDetails.bankName || '',
    accountNumber: updateData.bankDetails.accountNumber || '',
    ifscCode: updateData.bankDetails.ifscCode || '',
    branch: updateData.bankDetails.branch || '',
    accountType: updateData.bankDetails.accountType || 'Savings'
  };
}

// Handle nested bank fields
Object.keys(updateData).forEach(key => {
  if (key.startsWith('bankDetails.')) {
    const [parent, field] = key.split('.');
    if (!sanitizedUpdate.bankDetails) {
      sanitizedUpdate.bankDetails = {};
    }
    sanitizedUpdate.bankDetails[field] = updateData[key];
  }
});
```

#### 3.3 Account Number Masking in API Response

**File:** `backend/controllers/rest/userProfile.controller.js`
```javascript
// Import masking utility
import { maskAccountNumber } from '../../utils/maskAccNo.js';

// In getCurrentUserProfile, after fetching employee:
if (employee.bankDetails) {
  // Check if user is viewing their own profile or is Admin/HR
  const isOwnProfile = employee.clerkUserId === user.userId;
  const canViewFullAccount = user.role === 'admin' || user.role === 'hr' || isOwnProfile;

  profileData.bankDetails = {
    bankName: employee.bankDetails.bankName || '',
    accountNumber: canViewFullAccount
      ? employee.bankDetails.accountNumber || ''
      : maskAccountNumber(employee.bankDetails.accountNumber || ''),
    ifscCode: employee.bankDetails.ifscCode || '',
    branch: employee.bankDetails.branch || '',
    accountType: employee.bankDetails.accountType || 'Savings'
  };
}
```

### Acceptance Criteria
- [ ] Bank Information section displays in view mode
- [ ] Account number is masked (showing only last 4 digits)
- [ ] Edit mode shows all fields with validation
- [ ] IFSC code validation works (format check)
- [ ] Backend saves bank details correctly
- [ ] Admin/HR can see full account number when viewing others
- [ ] Employee can see full account number only for themselves

---

## Phase 4: Extended Fields (Education, Experience, Family)

**Duration:** Week 5
**Priority:** P1 - High
**Dependencies:** Phase 3 complete

### Objectives
1. Make Education section editable
2. Make Experience section editable
3. Make Family section editable
4. Make Documents section editable

### Tasks

#### 4.1 Editable Education Section

**File:** `react/src/feature-module/pages/profile/components/EducationSection.tsx`
```typescript
import React, { useState } from 'react';

interface Education {
  degree?: string;
  institution?: string;
  year?: number;
  field?: string;
}

interface EducationSectionProps {
  education: Education[];
  isEditing: boolean;
  onChange: (education: Education[]) => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  education,
  isEditing,
  onChange
}) => {
  const [newEntry, setNewEntry] = useState<Education>({});

  const handleAdd = () => {
    if (newEntry.degree && newEntry.institution) {
      onChange([...(education || []), { ...newEntry }]);
      setNewEntry({});
    }
  };

  const handleRemove = (index: number) => {
    const updated = education.filter((_, i) => i !== index);
    onChange(updated);
  };

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Education</h6>
      {education && education.length > 0 ? (
        <div className="row">
          {education.map((edu, index) => (
            <div className="col-md-12 mb-3" key={index}>
              <div className="card bg-light">
                <div className="card-body">
                  <p className="mb-1 fw-medium">
                    {edu.degree || 'N/A'} {edu.field && `in ${edu.field}`}
                  </p>
                  <p className="mb-0 text-muted small">
                    {edu.institution || 'N/A'} {edu.year && `(${edu.year})`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted">No education information added</p>
      )}
    </div>
  );

  const renderEditMode = () => (
    <div className="border-bottom mb-3">
      <h6 className="mb-3">Education</h6>

      {/* Existing entries */}
      {education && education.length > 0 && (
        <div className="mb-3">
          {education.map((edu, index) => (
            <div className="card mb-2" key={index}>
              <div className="card-body d-flex justify-content-between align-items-center">
                <div>
                  <strong>{edu.degree}</strong> {edu.field && `in ${edu.field}`}
                  <br />
                  <small className="text-muted">
                    {edu.institution} {edu.year && `(${edu.year})`}
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => handleRemove(index)}
                >
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new entry */}
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Add Education</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Degree (e.g., B.Tech)"
                value={newEntry.degree || ''}
                onChange={(e) => setNewEntry({ ...newEntry, degree: e.target.value })}
              />
            </div>
            <div className="col-md-3 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Field of Study"
                value={newEntry.field || ''}
                onChange={(e) => setNewEntry({ ...newEntry, field: e.target.value })}
              />
            </div>
            <div className="col-md-4 mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Institution"
                value={newEntry.institution || ''}
                onChange={(e) => setNewEntry({ ...newEntry, institution: e.target.value })}
              />
            </div>
            <div className="col-md-2 mb-2">
              <input
                type="number"
                className="form-control"
                placeholder="Year"
                value={newEntry.year || ''}
                onChange={(e) => setNewEntry({ ...newEntry, year: parseInt(e.target.value) || undefined })}
                min="1950"
                max={new Date().getFullYear() + 5}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleAdd}
            disabled={!newEntry.degree || !newEntry.institution}
          >
            <i className="ti ti-plus me-1"></i> Add
          </button>
        </div>
      </div>
    </div>
  );

  return isEditing ? renderEditMode() : renderViewMode();
};
```

#### 4.2 Editable Experience Section

**Similar structure to Education, with fields:**
- company
- position
- startDate
- endDate
- currentlyWorking (boolean)

#### 4.3 Editable Family Section

**File:** `react/src/feature-module/pages/profile/components/FamilySection.tsx`
```typescript
interface FamilyMember {
  name?: string;
  relationship?: string;
  contact?: string;
}

// Similar structure to Education, with add/remove functionality
```

#### 4.4 Editable Documents Section

**File:** `react/src/feature-module/pages/profile/components/DocumentsSection.tsx`
```typescript
interface Document {
  type?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
}

// Includes file upload functionality
// Integrates with cloud storage
```

### Acceptance Criteria
- [ ] All 4 sections have edit mode
- [ ] Add/remove functionality works
- [ ] Form validation for each field
- [ ] File upload works for documents
- [ ] Backend updates correctly
- [ ] Proper error handling

---

## Phase 5: Employee Lifecycle Status

**Duration:** Week 6
**Priority:** P1 - High
**Dependencies:** Phase 4 complete

### Objectives
1. Display employee lifecycle status
2. Show resignation/promotion/termination warnings
3. Add status indicator to profile header

### Tasks

#### 5.1 Lifecycle Status Hook

**File:** `react/src/hooks/useEmployeeLifecycle.ts`
```typescript
import { useState, useEffect } from 'react';
import { get } from '../services/api';

interface LifecycleStatus {
  isInResignationList: boolean;
  isInPromotionList: boolean;
  isInTerminationList: boolean;
  details?: {
    resignation?: ResignationDetails;
    promotion?: PromotionDetails;
    termination?: TerminationDetails;
  };
}

export const useEmployeeLifecycle = (employeeId?: string) => {
  const [status, setStatus] = useState<LifecycleStatus>({
    isInResignationList: false,
    isInPromotionList: false,
    isInTerminationList: false
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      const response = await post<any>('/employees/check-lifecycle-status', {
        employeeId
      });

      if (response.success && response.data) {
        setStatus(response.data);
      }
    } catch (error) {
      console.error('Error fetching lifecycle status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [employeeId]);

  return { status, loading, refetch: fetchStatus };
};
```

#### 5.2 Status Banner Component

**File:** `react/src/feature-module/pages/profile/components/LifecycleStatusBanner.tsx`
```typescript
import React from 'react';
import { Alert } from 'bootstrap';
import { useEmployeeLifecycle } from '../../../hooks/useEmployeeLifecycle';

interface LifecycleStatusBannerProps {
  employeeId: string;
}

export const LifecycleStatusBanner: React.FC<LifecycleStatusBannerProps> = ({
  employeeId
}) => {
  const { status, loading } = useEmployeeLifecycle(employeeId);

  if (loading) return null;

  if (status.isInTerminationList) {
    return (
      <Alert variant="danger" className="mb-3">
        <i className="ti ti-alert-triangle me-2"></i>
        <strong>Termination Pending</strong>
        <br />
        This employee has a termination record.
        Last Working Date: {status.details?.termination?.lastWorkingDate}
      </Alert>
    );
  }

  if (status.isInResignationList) {
    return (
      <Alert variant="warning" className="mb-3">
        <i className="ti ti-logout me-2"></i>
        <strong>Resignation Submitted</strong>
        <br />
        This employee has submitted their resignation.
        Last Working Date: {status.details?.resignation?.lastWorkingDate}
      </Alert>
    );
  }

  if (status.isInPromotionList) {
    return (
      <Alert variant="success" className="mb-3">
        <i className="ti ti-trophy me-2"></i>
        <strong>Promotion Pending</strong>
        <br />
        This employee has a promotion scheduled for:
        {status.details?.promotion?.promotionDate}
      </Alert>
    );
  }

  return null;
};
```

#### 5.3 Backend Status Check

**File:** `backend/controllers/rest/employee.controller.js`
```javascript
/**
 * @desc    Check employee lifecycle status
 * @route   POST /api/employees/check-lifecycle-status
 * @access  Private
 */
export const checkLifecycleStatus = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { employeeId } = req.body;

  const collections = getTenantCollections(user.companyId);

  // Check resignation
  const resignation = await collections.resignations.findOne({
    employeeId: employeeId,
    status: { $in: ['Pending', 'Approved'] }
  });

  // Check promotion
  const promotion = await collections.promotions.findOne({
    'employee.id': employeeId,
    status: 'Approved',
    promotionDate: { $gte: new Date() }
  });

  // Check termination
  const termination = await collections.terminations.findOne({
    employeeId: employeeId,
    status: { $in: ['Pending', 'Approved'] }
  });

  const result = {
    isInResignationList: !!resignation,
    isInPromotionList: !!promotion,
    isInTerminationList: !!termination,
    details: {
      resignation: resignation ? {
        resignationDate: resignation.resignationDate,
        lastWorkingDate: resignation.lastWorkingDate,
        reason: resignation.reason
      } : undefined,
      promotion: promotion ? {
        promotionDate: promotion.promotionDate,
        designation: promotion.promotionTo.designation.name
      } : undefined,
      termination: termination ? {
        terminationDate: termination.terminationDate,
        lastWorkingDate: termination.lastWorkingDate,
        reason: termination.reason
      } : undefined
    }
  };

  return sendSuccess(res, result, 'Lifecycle status retrieved');
});
```

### Acceptance Criteria
- [ ] Lifecycle status displays correctly
- [ ] Banner shows appropriate warning/info
- [ ] Status check doesn't slow down page load
- [ ] Works for both own profile and viewing others

---

## Phase 6: Permission System

**Duration:** Week 7
**Priority:** P1 - High
**Dependencies:** Phase 5 complete

### Objectives
1. Implement permission configuration
2. Create permission wrapper components
3. Add backend validation middleware
4. Test all permission scenarios

### Tasks

#### 6.1 Permission Configuration

**Already documented in ROLE_BASED_FIELD_PERMISSIONS_REPORT.md**

Implement `react/src/config/fieldPermissions.ts`

#### 6.2 Permission Components

**Already documented in ROLE_BASED_FIELD_PERMISSIONS_REPORT.md**

Implement:
- `PermissionField.tsx` - Single field wrapper
- `PermissionSection.tsx` - Section wrapper

#### 6.3 Backend Middleware

**File:** `backend/middleware/validateFieldPermissions.js`

**Already documented in ROLE_BASED_FIELD_PERMISSIONS_REPORT.md**

#### 6.4 Integration

Update profile page to use permission wrappers for all fields.

### Acceptance Criteria
- [ ] All fields wrapped with permission checks
- [ ] Backend validates all update requests
- [ ] Cannot edit read-only fields via API
- [ ] Proper error messages for permission denied

---

## Phase 7: Testing & Documentation

**Duration:** Week 8
**Priority:** P1 - High
**Dependencies:** Phase 6 complete

### Objectives
1. Write comprehensive tests
2. Update API documentation
3. Create user guide
4. Performance optimization

### Tasks

#### 7.1 Unit Tests

**Frontend Tests:**
```typescript
// __tests__/components/PersonalInfoSection.test.tsx
describe('PersonalInfoSection', () => {
  it('renders all fields in view mode');
  it('renders all fields in edit mode');
  it('respects permissions for each field');
  it('handles form changes correctly');
});
```

**Backend Tests:**
```javascript
// __tests__/controllers/userProfile.test.js
describe('User Profile Controller', () => {
  describe('getCurrentUserProfile', () => {
    it('returns admin profile for admin role');
    it('returns employee profile for employee role');
    it('returns superadmin profile for superadmin role');
  });

  describe('updateCurrentUserProfile', () => {
    it('allows editing personal information');
    it('allows editing bank details');
    it('rejects editing read-only fields');
    it('validates IFSC code format');
  });
});
```

#### 7.2 Integration Tests

```javascript
// __tests__/integration/profile-flow.test.js
describe('Profile Update Flow', () => {
  it('complete profile update by employee');
  it('complete profile update by HR');
  it('complete profile update by admin');
  it('permission denied for non-authorized roles');
});
```

#### 7.3 API Documentation

Update Swagger/OpenAPI documentation for all profile endpoints.

#### 7.4 Performance Optimization

- Add caching for profile data
- Optimize database queries
- Add pagination for education/experience if needed

### Acceptance Criteria
- [ ] 90%+ code coverage
- [ ] All tests passing
- [ ] API documentation updated
- [ ] Performance benchmarks met
- [ ] User guide created

---

## Dependencies & Risks

### Dependencies

| Phase | Depends On | External Dependencies |
|-------|------------|---------------------|
| Phase 1 | None | Clerk authentication |
| Phase 2 | Phase 1 | None |
| Phase 3 | Phase 2 | None |
| Phase 4 | Phase 3 | Cloudinary for documents |
| Phase 5 | Phase 4 | None |
| Phase 6 | Phase 5 | None |
| Phase 7 | Phase 6 | Testing libraries |

### Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema changes break existing data | HIGH | Create migration scripts, test in dev first |
| Permission system complexity | MEDIUM | Start simple, iterate incrementally |
| Performance degradation | MEDIUM | Add caching, optimize queries |
| Bank information security | HIGH | Implement masking, audit logs |
| Admin profile data availability | MEDIUM | Verify subscription data structure |

### Rollback Plan

Each phase should be feature-flagged:
```javascript
const FEATURE_FLAGS = {
  ADMIN_PROFILE_PAGE: process.env.FEATURE_ADMIN_PROFILE === 'true',
  PERSONAL_INFO_SECTION: process.env.FEATURE_PERSONAL_INFO === 'true',
  BANK_INFO_SECTION: process.env.FEATURE_BANK_INFO === 'true',
  EXTENDED_FIELDS: process.env.FEATURE_EXTENDED_FIELDS === 'true',
  LIFECYCLE_STATUS: process.env.FEATURE_LIFECYCLE_STATUS === 'true',
  PERMISSION_SYSTEM: process.env.FEATURE_PERMISSIONS === 'true'
};
```

---

## Timeline Summary

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Foundation | 2 weeks | Week 1 | Week 2 |
| Phase 2: Personal Info | 1 week | Week 3 | Week 3 |
| Phase 3: Bank Info | 1 week | Week 4 | Week 4 |
| Phase 4: Extended Fields | 1 week | Week 5 | Week 5 |
| Phase 5: Lifecycle Status | 1 week | Week 6 | Week 6 |
| Phase 6: Permissions | 1 week | Week 7 | Week 7 |
| Phase 7: Testing | 1 week | Week 8 | Week 8 |

**Total Duration:** 8 weeks

---

**Document Version:** 1.0
**Last Updated:** 2026-02-07
