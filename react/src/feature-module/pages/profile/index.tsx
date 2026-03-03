import { Modal, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { GetCountries, GetState } from 'react-country-state-city';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import { EducationModal } from '../../../core/modals/EducationModal';
import { ExperienceModal } from '../../../core/modals/ExperienceModal';
import { FamilyModal } from '../../../core/modals/FamilyModal';
import { MyChangeRequestsModal } from '../../../core/modals/MyChangeRequestsModal';
import { ChangeRequest, FieldStatus, useChangeRequestREST } from '../../../hooks/useChangeRequestREST';
import { useEmailChange } from '../../../hooks/useEmailChange';
import { useProfileExtendedREST } from '../../../hooks/useProfileExtendedREST';
import { Profile, useProfileRest } from '../../../hooks/useProfileRest';
import { resolveDesignation } from '../../../utils/designationUtils';
import { all_routes } from '../../router/all_routes';

type PasswordField = 'oldPassword' | 'newPassword' | 'confirmPassword' | 'currentPassword';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ============================================
// SKELETON LOADERS (Merged from ProfileSkeletonLoaders.tsx)
// ============================================

// Profile Header Skeleton
const ProfileHeaderSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      <div className="d-flex align-items-start">
        <div className="me-3">
          <div
            className="skeleton-loader rounded-circle"
            style={{ width: '120px', height: '120px' }}
          />
        </div>
        <div className="flex-grow-1">
          <div className="skeleton-loader mb-2" style={{ width: '200px', height: '28px' }} />
          <div className="d-flex gap-3 mb-2">
            <div className="skeleton-loader" style={{ width: '120px', height: '20px' }} />
            <div className="skeleton-loader" style={{ width: '150px', height: '20px' }} />
            <div className="skeleton-loader" style={{ width: '130px', height: '20px' }} />
          </div>
          <div className="d-flex gap-3 mb-2">
            <div className="skeleton-loader" style={{ width: '200px', height: '20px' }} />
            <div className="skeleton-loader" style={{ width: '140px', height: '20px' }} />
          </div>
          <div className="d-flex gap-2">
            <div className="skeleton-loader" style={{ width: '100px', height: '24px' }} />
            <div className="skeleton-loader" style={{ width: '80px', height: '24px' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Section Card Skeleton
const SectionCardSkeleton = () => (
  <div className="card mb-3">
    <div className="card-header d-flex align-items-center justify-content-between">
      <div className="skeleton-loader" style={{ width: '180px', height: '24px' }} />
      <div className="skeleton-loader" style={{ width: '60px', height: '32px' }} />
    </div>
    <div className="card-body">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="row mb-3">
          <div className="col-md-4">
            <div className="skeleton-loader" style={{ width: '100%', height: '20px' }} />
          </div>
          <div className="col-md-8">
            <div className="skeleton-loader" style={{ width: '80%', height: '20px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Work Info Skeleton
const WorkInfoSkeleton = () => (
  <div className="card">
    <div className="card-header">
      <div className="skeleton-loader" style={{ width: '150px', height: '24px' }} />
    </div>
    <div className="card-body">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="row mb-3">
          <div className="col-md-4">
            <div className="skeleton-loader" style={{ width: '100%', height: '20px' }} />
          </div>
          <div className="col-md-8">
            <div className="skeleton-loader" style={{ width: '70%', height: '20px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Timeline Skeleton
const TimelineSkeleton = () => (
  <div className="border-bottom mb-4 pb-4">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="skeleton-loader" style={{ width: '120px', height: '20px' }} />
      <div className="skeleton-loader" style={{ width: '100px', height: '32px' }} />
    </div>
    <div className="timeline">
      {[1, 2, 3].map((i) => (
        <div key={i} className="timeline-item mb-3">
          <div className="timeline-badge">
            <div className="skeleton-loader rounded-circle" style={{ width: '24px', height: '24px' }} />
          </div>
          <div className="timeline-text ps-3 flex-grow-1">
            <div className="skeleton-loader mb-2" style={{ width: '200px', height: '20px' }} />
            <div className="skeleton-loader mb-2" style={{ width: '150px', height: '16px' }} />
            <div className="skeleton-loader" style={{ width: '180px', height: '16px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Family Cards Skeleton
const FamilyCardsSkeleton = () => (
  <div className="border-bottom mb-4 pb-4">
    <div className="d-flex justify-content-between align-items-center mb-3">
      <div className="skeleton-loader" style={{ width: '120px', height: '20px' }} />
      <div className="skeleton-loader" style={{ width: '140px', height: '32px' }} />
    </div>
    <div className="row">
      {[1, 2].map((i) => (
        <div key={i} className="col-md-6 mb-3">
          <div className="card">
            <div className="card-body">
              <div className="skeleton-loader mb-2" style={{ width: '150px', height: '20px' }} />
              <div className="skeleton-loader mb-2" style={{ width: '100px', height: '16px' }} />
              <div className="skeleton-loader mb-2" style={{ width: '130px', height: '16px' }} />
              <div className="skeleton-loader" style={{ width: '110px', height: '16px' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Assets Table Skeleton
const AssetsTableSkeleton = () => (
  <div className="table-responsive">
    <table className="table">
      <thead>
        <tr>
          <th><div className="skeleton-loader" style={{ width: '100px', height: '20px' }} /></th>
          <th><div className="skeleton-loader" style={{ width: '80px', height: '20px' }} /></th>
          <th><div className="skeleton-loader" style={{ width: '120px', height: '20px' }} /></th>
          <th><div className="skeleton-loader" style={{ width: '100px', height: '20px' }} /></th>
          <th><div className="skeleton-loader" style={{ width: '70px', height: '20px' }} /></th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3].map((i) => (
          <tr key={i}>
            <td><div className="skeleton-loader" style={{ width: '90%', height: '20px' }} /></td>
            <td><div className="skeleton-loader" style={{ width: '80%', height: '20px' }} /></td>
            <td><div className="skeleton-loader" style={{ width: '85%', height: '20px' }} /></td>
            <td><div className="skeleton-loader" style={{ width: '90%', height: '20px' }} /></td>
            <td><div className="skeleton-loader" style={{ width: '60px', height: '24px' }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Career History Skeleton
const CareerHistorySkeleton = () => (
  <div className="timeline">
    {[1, 2, 3].map((i) => (
      <div key={i} className="timeline-item mb-4 pb-4 border-bottom">
        <div className="d-flex">
          <div className="skeleton-loader rounded-circle me-3" style={{ width: '40px', height: '40px' }} />
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between mb-2">
              <div className="skeleton-loader" style={{ width: '120px', height: '20px' }} />
              <div className="skeleton-loader" style={{ width: '100px', height: '16px' }} />
            </div>
            <div className="skeleton-loader mb-2" style={{ width: '200px', height: '16px' }} />
            <div className="skeleton-loader" style={{ width: '250px', height: '16px' }} />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Tab Skeleton
const TabsSkeleton = () => (
  <ul className="nav nav-tabs nav-tabs-solid mb-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <li key={i} className="nav-item">
        <div className="skeleton-loader" style={{ width: '100px', height: '38px', margin: '0 4px' }} />
      </li>
    ))}
  </ul>
);

// ============================================
// INLINE SECTION COMPONENTS (NO SEPARATE FILES NEEDED)
// ============================================

// EditableSection Wrapper Component
interface EditableSectionProps {
  title: string;
  icon: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  children: React.ReactNode;
  customActions?: React.ReactNode;
  statusIndicator?: React.ReactNode; // Status icon for pending/rejected changes
}

const EditableSection: React.FC<EditableSectionProps> = ({
  title,
  icon,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  isSaving = false,
  children,
  customActions,
  statusIndicator
}) => {
  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <i className={`ti ${icon} me-2`} />
          {title}
          {statusIndicator}
        </h5>
        <div className="d-flex gap-2">
          {customActions}
          {!isEditing && (
            <Link
              to="#"
              className="btn btn-light btn-sm"
              onClick={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              <i className="ti ti-edit me-1" />
              Edit
            </Link>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={onCancel}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="ti ti-check me-1" />
                    Save
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
};

// ApprovalSection Component - For sections requiring HR approval (e.g., Bank Details)
// Shows "Send Request" instead of "Save" button
interface ApprovalSectionProps {
  title: string;
  icon: string;
  isEditing: boolean;
  onEdit: () => void;
  onSendRequest: () => void;
  onCancel: () => void;
  isSending?: boolean;
  children: React.ReactNode;
  statusIndicator?: React.ReactNode; // Status icon for pending/rejected changes
}

const ApprovalSection: React.FC<ApprovalSectionProps> = ({
  title,
  icon,
  isEditing,
  onEdit,
  onSendRequest,
  onCancel,
  isSending = false,
  children,
  statusIndicator,
}) => {
  return (
    <div className="card mb-3">
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <i className={`ti ${icon} me-2`} />
          {title}
          {statusIndicator}
        </h5>
        <div className="d-flex gap-2">
          {!isEditing && (
            <Link
              to="#"
              className="btn btn-light btn-sm"
              onClick={(e) => {
                e.preventDefault();
                onEdit();
              }}
            >
              <i className="ti ti-edit me-1" />
              Edit
            </Link>
          )}
          {isEditing && (
            <>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={onCancel}
                disabled={isSending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                onClick={onSendRequest}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="ti ti-send me-1" />
                    Send Request
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing && (
        <div className="alert alert-warning py-2 mb-0" role="alert">
          <i className="ti ti-info-circle me-2"></i>
          <strong>Changes require HR approval.</strong> Your requested changes will be sent to HR for review.
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
};

// FieldStatusIcon Component - Shows status icon for fields with pending/rejected changes
interface FieldStatusIconProps {
  fieldPath: string;
  getFieldStatus: (field: string) => FieldStatus | null;
  onClick?: () => void;
}

const FieldStatusIcon: React.FC<FieldStatusIconProps> = ({ fieldPath, getFieldStatus, onClick }) => {
  const status = getFieldStatus(fieldPath);

  if (!status) return null;

  return (
    <Tooltip
      title={
        status === 'pending'
          ? 'A change request for this field is pending HR approval'
          : 'The change request for this field was rejected'
      }
    >
      <span
        className={`ms-2 ${status === 'pending' ? 'text-warning' : 'text-danger'
          }`}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
        onClick={onClick}
      >
        <i
          className={`ti ${status === 'pending' ? 'ti-clock' : 'ti-x-circle'
            }`}
        />
      </span>
    </Tooltip>
  );
};

// Helper to get section-level status (for section title indicator)
const getSectionStatus = (
  sectionFields: string[],
  myRequests: ChangeRequest[]
): { hasPending: boolean; hasRejected: boolean; pendingCount: number } => {
  let hasPending = false;
  let hasRejected = false;
  let pendingCount = 0;

  for (const request of myRequests) {
    const fields = request.fields || [];
    for (const field of fields) {
      if (sectionFields.includes(field.field) || sectionFields.some(sf => field.field.startsWith(sf))) {
        if (field.status === 'pending') {
          hasPending = true;
          pendingCount++;
        } else if (field.status === 'rejected') {
          hasRejected = true;
        }
      }
    }
  }

  return { hasPending, hasRejected, pendingCount };
};

// Basic Info Section Component
const BasicInfoSection: React.FC<{
  profile: Profile | null;
  profilePhoto: string | null;
  imageUpload: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: () => void;
  onEditEmail: () => void;
}> = ({
  profile,
  profilePhoto,
  imageUpload,
  fileInputRef,
  onImageUpload,
  onRemovePhoto,
  onEditEmail
}) => {
    if (!profile) return null;

    return (
      <div className="card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center">
            <div className="avatar avatar-xxl me-3 position-relative" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
              {profilePhoto || profile.profilePhoto ? (
                <img
                  src={profilePhoto || profile.profilePhoto}
                  alt={`${profile.firstName} ${profile.lastName}`}
                  className="rounded-circle"
                  style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                />
              ) : (
                <div className="avatar-placeholder bg-primary text-white d-flex align-items-center justify-content-center rounded-circle" style={{ width: '120px', height: '120px', fontSize: '48px' }}>
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </div>
              )}
              <div className="avatar-edit-icon position-absolute bottom-0 end-0">
                <label htmlFor="profilePhotoInput" className="btn btn-primary btn-sm rounded-circle" style={{ cursor: 'pointer', width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-camera"></i>
                </label>
                <input
                  type="file"
                  id="profilePhotoInput"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={onImageUpload}
                  style={{ display: 'none' }}
                />
              </div>
              {imageUpload && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 rounded-circle">
                  <div className="spinner-border text-white" role="status">
                    <span className="visually-hidden">Uploading...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <h3 className="mb-1">{profile.firstName} {profile.lastName}</h3>
              <div className="d-flex align-items-center gap-3 flex-wrap mb-2">
                <span className="text-muted">
                  <i className="ti ti-id me-1" />
                  {profile.employeeId || '--'}
                </span>
                <span className="text-muted">
                  <i className="ti ti-briefcase me-1" />
                  {resolveDesignation(profile.designation, '--')}
                </span>
                <span className="text-muted">
                  <i className="ti ti-building me-1" />
                  {profile.department || '--'}
                </span>
              </div>
              <div className="d-flex align-items-center gap-3 flex-wrap mb-2">
                <span className="text-muted">
                  <i className="ti ti-mail me-1" />
                  {profile.email}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light text-primary"
                  onClick={onEditEmail}
                >
                  <i className="ti ti-edit me-1" />
                  Edit Email
                </button>
                {profile.phone && (
                  <span className="text-muted">
                    <i className="ti ti-phone me-1" />
                    {profile.phoneCode ? `${profile.phoneCode} ${profile.phone}` : profile.phone}
                  </span>
                )}
              </div>
              {profile.joiningDate && (
                <div className="mb-2">
                  <span className="text-muted">
                    <i className="ti ti-calendar me-1" />
                    Joined: {new Date(profile.joiningDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
              )}
              {profile.status && (
                <span className={`badge ${profile.status === 'Active' ? 'bg-success' : 'bg-secondary'}`}>
                  {profile.status}
                </span>
              )}
              {(profilePhoto || profile.profilePhoto) && (
                <button
                  type="button"
                  className="btn btn-sm btn-light text-danger ms-2"
                  onClick={onRemovePhoto}
                >
                  <i className="ti ti-trash me-1" />
                  Remove Photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

// Personal Info Section
const PersonalInfoSection: React.FC<{ formData: any; isEditing: boolean; onChange: (field: string, value: any) => void; onSelect: (name: string, value: string) => void; genderOptions: any[]; countryOptions: any[]; }> = ({
  formData,
  isEditing,
  onChange,
  onSelect,
  genderOptions,
  countryOptions
}) => {
  const [dobError, setDobError] = React.useState('');

  // Date of Birth constraints: must be at least 15 years ago, max 100 years ago
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 15);
    return d.toISOString().split('T')[0];
  })();
  const minDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 100);
    return d.toISOString().split('T')[0];
  })();

  const handleDobChange = (value: string) => {
    if (value) {
      const selected = new Date(value);
      const maxDate = new Date(maxDob);
      if (selected > maxDate) {
        setDobError('Employee must be at least 15 years old');
        return;
      }
    }
    setDobError('');
    onChange('dateOfBirth', value);
  };

  const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <div className="row mb-3">
      <div className="col-md-4">
        <p className="text-muted mb-0">{label}</p>
      </div>
      <div className="col-md-8">
        <p className="fw-medium mb-0">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <>
      {!isEditing ? (
        <>
          <InfoRow
            label="Date of Birth"
            value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toLocaleDateString('en-GB') : undefined}
          />
          <InfoRow label="Gender" value={formData.gender} />
          <InfoRow label="Marital Status" value={formData.personal?.maritalStatus} />
          <InfoRow label="Nationality" value={formData.personal?.nationality} />
          <InfoRow label="Passport No." value={formData.personal?.passport?.number} />
          <InfoRow
            label="Passport Expiry"
            value={formData.personal?.passport?.expiryDate ? new Date(formData.personal.passport.expiryDate).toLocaleDateString('en-GB') : undefined}
          />
          <InfoRow label="Number of Children" value={formData.personal?.noOfChildren?.toString()} />
        </>
      ) : (
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              className={`form-control ${dobError ? 'is-invalid' : ''}`}
              name="dateOfBirth"
              value={formData.dateOfBirth || ''}
              max={maxDob}
              min={minDob}
              onChange={(e) => handleDobChange(e.target.value)}
            />
            {dobError && <div className="invalid-feedback d-block">{dobError}</div>}
            <small className="text-muted">Must be at least 15 years old</small>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Gender</label>
            <CommonSelect
              className="select"
              options={genderOptions}
              value={formData.gender || 'Select'}
              onChange={(option: any) => onSelect('gender', option.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Marital Status</label>
            <select
              className="form-control"
              value={formData.personal?.maritalStatus || ''}
              onChange={(e) => onChange('personal.maritalStatus', e.target.value)}
            >
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Nationality</label>
            <input
              type="text"
              className="form-control"
              name="personal.nationality"
              value={formData.personal?.nationality || ''}
              onChange={(e) => onChange('personal.nationality', e.target.value)}
              placeholder="Enter nationality"
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Passport No.</label>
            <input
              type="text"
              className="form-control"
              name="personal.passport.number"
              value={formData.personal?.passport?.number || ''}
              onChange={(e) => onChange('personal.passport.number', e.target.value)}
              placeholder="Enter passport number"
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Passport Expiry</label>
            <input
              type="date"
              className="form-control"
              name="personal.passport.expiryDate"
              value={formData.personal?.passport?.expiryDate ? new Date(formData.personal.passport.expiryDate).toISOString().split('T')[0] : ''}
              onChange={(e) => onChange('personal.passport.expiryDate', e.target.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Passport Country</label>
            <CommonSelect
              className="select"
              options={countryOptions}
              value={formData.personal?.passport?.country || 'Select'}
              onChange={(option: any) => onSelect('personal.passport.country', option.value)}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Number of Children</label>
            <input
              type="number"
              className="form-control"
              name="personal.noOfChildren"
              value={formData.personal?.noOfChildren || 0}
              onChange={(e) => onChange('personal.noOfChildren', parseInt(e.target.value) || 0)}
              min="0"
            />
          </div>
        </div>
      )}
    </>
  );
};

// Address Info Section — uses react-country-state-city for dynamic country/state loading
// Field order: Street → Country → State (loaded from country) → City → Postal Code
const AddressInfoSection: React.FC<{ formData: any; isEditing: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; onSelect: (name: string, value: string) => void; countryOptions?: any[]; }> = ({
  formData,
  isEditing,
  onChange,
  onSelect,
}) => {
  const [addrCountries, setAddrCountries] = useState<any[]>([]);
  const [addrStates, setAddrStates] = useState<any[]>([]);
  const [addrCountryId, setAddrCountryId] = useState<number | null>(null);

  // Load countries on mount
  useEffect(() => {
    GetCountries().then((result: any) => setAddrCountries(result));
  }, []);

  // When countries load and formData has an existing country, load its states
  useEffect(() => {
    if (formData.address?.country && addrCountries.length > 0) {
      const match = addrCountries.find((c: any) => c.name === formData.address.country);
      if (match && match.id !== addrCountryId) {
        setAddrCountryId(match.id);
        GetState(match.id).then((result: any) => setAddrStates(result));
      }
    }
  }, [addrCountries, formData.address?.country]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value ? parseInt(e.target.value) : null;
    const selected = addrCountries.find((c: any) => c.id === countryId);
    setAddrCountryId(countryId);
    onSelect('address.country', selected?.name || '');
    onSelect('address.state', ''); // Reset state on country change
    if (countryId) {
      GetState(countryId).then((result: any) => setAddrStates(result));
    } else {
      setAddrStates([]);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <div className="row mb-3">
      <div className="col-md-4">
        <p className="text-muted mb-0">{label}</p>
      </div>
      <div className="col-md-8">
        <p className="fw-medium mb-0">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <>
      {!isEditing ? (
        <>
          <InfoRow label="Street" value={formData.address?.street} />
          <InfoRow label="Country" value={formData.address?.country} />
          <InfoRow label="State / Province" value={formData.address?.state} />
          <InfoRow label="City" value={formData.address?.city} />
          <InfoRow label="Postal Code" value={formData.address?.postalCode} />
        </>
      ) : (
        <div className="row">
          {/* Street — optional */}
          <div className="col-md-12 mb-3">
            <label className="form-label">Street Address</label>
            <textarea
              className="form-control"
              name="address.street"
              value={formData.address?.street || ''}
              onChange={onChange}
              rows={2}
              placeholder="Enter street address (optional)"
            />
          </div>

          {/* Country — dynamic from API */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Country <span className="text-danger">*</span></label>
            <div className="input-icon-end position-relative">
              <select
                className="form-select"
                value={addrCountryId || ''}
                onChange={handleCountryChange}
              >
                <option value="">Select Country</option>
                {addrCountries.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="input-icon-addon">
                <i className="ti ti-chevron-down text-gray-7" />
              </span>
            </div>
          </div>

          {/* State — loaded from selected country */}
          <div className="col-md-6 mb-3">
            <label className="form-label">State / Province <span className="text-danger">*</span></label>
            <div className="input-icon-end position-relative">
              <select
                className="form-select"
                value={formData.address?.state || ''}
                disabled={!addrCountryId}
                onChange={(e) => onSelect('address.state', e.target.value)}
              >
                <option value="">
                  {addrCountryId ? 'Select State' : 'Select Country first'}
                </option>
                {addrStates.map((s: any) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <span className="input-icon-addon">
                <i className="ti ti-chevron-down text-gray-7" />
              </span>
            </div>
          </div>

          {/* City — free-text */}
          <div className="col-md-6 mb-3">
            <label className="form-label">City <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control"
              name="address.city"
              value={formData.address?.city || ''}
              onChange={onChange as any}
              placeholder="Enter city"
            />
          </div>

          {/* Postal Code */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Postal Code</label>
            <input
              type="text"
              className="form-control"
              name="address.postalCode"
              value={formData.address?.postalCode || ''}
              onChange={onChange}
              placeholder="Enter postal code"
            />
          </div>
        </div>
      )}
    </>
  );
};

// Bank Info Section
const BankInfoSection: React.FC<{ formData: any; isEditing: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; }> = ({
  formData,
  isEditing,
  onChange
}) => {
  // Validation state
  const [errors, setErrors] = useState<{
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
  }>({});

  // Validation functions
  const validateBankName = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Bank name is required';
    }
    if (value.trim().length < 3) {
      return 'Bank name must be at least 3 characters';
    }
    return '';
  };

  const validateAccountNumber = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Account number is required';
    }
    const cleanValue = value.replace(/[\s-]/g, '');
    if (!/^\d+$/.test(cleanValue)) {
      return 'Account number must contain only digits';
    }
    if (cleanValue.length < 8 || cleanValue.length > 18) {
      return 'Account number must be 8-18 digits';
    }
    return '';
  };

  const validateIFSCCode = (value: string) => {
    if (!value || value.trim() === '') {
      return 'IFSC code is required';
    }
    const upperValue = value.toUpperCase().trim();
    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscPattern.test(upperValue)) {
      return 'Invalid IFSC format (e.g., SBIN0001234)';
    }
    return '';
  };

  const validateBranch = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Branch is required';
    }
    if (value.trim().length < 2) {
      return 'Branch name must be at least 2 characters';
    }
    return '';
  };

  // Handle field change with validation
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, fieldName: string) => {
    const value = e.target.value;

    // Trigger the parent onChange
    onChange(e);

    // Perform validation
    let error = '';
    switch (fieldName) {
      case 'bankName':
        error = validateBankName(value);
        break;
      case 'accountNumber':
        error = validateAccountNumber(value);
        break;
      case 'ifscCode':
        error = validateIFSCCode(value);
        break;
      case 'branch':
        error = validateBranch(value);
        break;
    }

    setErrors(prev => ({ ...prev, [fieldName]: error || undefined }));
  };

  const InfoRow = ({ label, value, required = false }: { label: string; value?: string; required?: boolean }) => (
    <div className="row mb-3">
      <div className="col-md-4">
        <p className="text-muted mb-0">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </p>
      </div>
      <div className="col-md-8">
        <p className="fw-medium mb-0">{value || '—'}</p>
      </div>
    </div>
  );

  // Helper component for required field label
  const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="form-label">
      {children}
      <span className="text-danger ms-1">*</span>
    </label>
  );

  return (
    <>
      {!isEditing ? (
        <>
          <InfoRow label="Account Holder Name" value={formData.bankDetails?.accountHolderName} required />
          <InfoRow label="Bank Name" value={formData.bankDetails?.bankName} required />
          <InfoRow label="Account Number" value={formData.bankDetails?.accountNumber ? `****${formData.bankDetails.accountNumber.slice(-4)}` : undefined} required />
          <InfoRow label="IFSC Code" value={formData.bankDetails?.ifscCode} required />
          <InfoRow label="Branch" value={formData.bankDetails?.branch} required />
          <InfoRow label="Account Type" value={formData.bankDetails?.accountType} />
        </>
      ) : (
        <div className="row">
          {/* Account Holder Name */}
          <div className="col-md-6 mb-3">
            <RequiredLabel>Account Holder Name</RequiredLabel>
            <input
              type="text"
              className={`form-control ${errors.accountHolderName ? 'is-invalid' : ''}`}
              name="bankDetails.accountHolderName"
              value={formData.bankDetails?.accountHolderName || ''}
              onChange={(e) => handleFieldChange(e, 'accountHolderName')}
              placeholder="Enter account holder name"
            />
            {errors.accountHolderName && (
              <div className="invalid-feedback d-block">
                {errors.accountHolderName}
              </div>
            )}
          </div>

          {/* Bank Name */}
          <div className="col-md-6 mb-3">
            <RequiredLabel>Bank Name</RequiredLabel>
            <input
              type="text"
              className={`form-control ${errors.bankName ? 'is-invalid' : ''}`}
              name="bankDetails.bankName"
              value={formData.bankDetails?.bankName || ''}
              onChange={(e) => handleFieldChange(e, 'bankName')}
              placeholder="Enter bank name"
            />
            {errors.bankName && (
              <div className="invalid-feedback d-block">
                {errors.bankName}
              </div>
            )}
          </div>

          {/* Account Number */}
          <div className="col-md-6 mb-3">
            <RequiredLabel>Account Number</RequiredLabel>
            <input
              type="text"
              className={`form-control ${errors.accountNumber ? 'is-invalid' : ''}`}
              name="bankDetails.accountNumber"
              value={formData.bankDetails?.accountNumber || ''}
              onChange={(e) => handleFieldChange(e, 'accountNumber')}
              placeholder="Enter account number (8-18 digits)"
              maxLength={18}
            />
            {errors.accountNumber && (
              <div className="invalid-feedback d-block">
                {errors.accountNumber}
              </div>
            )}
            <small className="text-muted">
              Only numbers allowed, 8-18 digits
            </small>
          </div>

          {/* IFSC Code */}
          <div className="col-md-6 mb-3">
            <RequiredLabel>IFSC Code</RequiredLabel>
            <input
              type="text"
              className={`form-control text-uppercase ${errors.ifscCode ? 'is-invalid' : ''}`}
              name="bankDetails.ifscCode"
              value={formData.bankDetails?.ifscCode || ''}
              onChange={(e) => {
                // Convert to uppercase immediately - create proper synthetic event
                const uppercasedEvent = {
                  ...e,
                  target: {
                    ...e.target,
                    name: e.target.name,
                    value: e.target.value.toUpperCase()
                  }
                };
                handleFieldChange(uppercasedEvent, 'ifscCode');
              }}
              placeholder="e.g., SBIN0001234"
              maxLength={11}
              style={{ fontFamily: 'monospace' }}
            />
            {errors.ifscCode && (
              <div className="invalid-feedback d-block">
                {errors.ifscCode}
              </div>
            )}
            <small className="text-muted">
              11 characters: 4 letters + 0 + 6 alphanumeric
            </small>
          </div>

          {/* Branch */}
          <div className="col-md-6 mb-3">
            <RequiredLabel>Branch</RequiredLabel>
            <input
              type="text"
              className={`form-control ${errors.branch ? 'is-invalid' : ''}`}
              name="bankDetails.branch"
              value={formData.bankDetails?.branch || ''}
              onChange={(e) => handleFieldChange(e, 'branch')}
              placeholder="Enter branch name"
            />
            {errors.branch && (
              <div className="invalid-feedback d-block">
                {errors.branch}
              </div>
            )}
          </div>

          {/* Account Type */}
          <div className="col-md-6 mb-3">
            <label className="form-label">Account Type</label>
            <select
              className="form-control"
              name="bankDetails.accountType"
              value={formData.bankDetails?.accountType || 'Savings Account'}
              onChange={onChange}
            >
              <option value="Savings Account">Savings Account</option>
              <option value="Salary Account">Salary Account</option>
              <option value="NRI Account">NRI Account</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
};

// Emergency Contact Section
const EmergencyContactSection: React.FC<{ formData: any; isEditing: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({
  formData,
  isEditing,
  onChange
}) => {
  const InfoRow = ({ label, value }: { label: string; value?: string }) => (
    <div className="row mb-3">
      <div className="col-md-4">
        <p className="text-muted mb-0">{label}</p>
      </div>
      <div className="col-md-8">
        <p className="fw-medium mb-0">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <>
      {!isEditing ? (
        <>
          <InfoRow label="Contact Name" value={formData.emergencyContact?.name} />
          <InfoRow label="Relationship" value={formData.emergencyContact?.relationship} />
          <InfoRow label="Phone 1" value={formData.emergencyContact?.phone} />
          <InfoRow label="Phone 2" value={formData.emergencyContact?.phone2} />
        </>
      ) : (
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Contact Name</label>
            <input
              type="text"
              className="form-control"
              name="emergencyContact.name"
              value={formData.emergencyContact?.name || ''}
              onChange={onChange}
              placeholder="Enter contact name"
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Relationship</label>
            <select
              className="form-control"
              name="emergencyContact.relationship"
              value={formData.emergencyContact?.relationship || ''}
              onChange={onChange as any}
            >
              <option value="">Select</option>
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Child">Child</option>
              <option value="Friend">Friend</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Phone 1</label>
            <input
              type="tel"
              className="form-control"
              name="emergencyContact.phone"
              value={formData.emergencyContact?.phone || ''}
              onChange={onChange}
              placeholder="Enter primary phone number"
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Phone 2 (Optional)</label>
            <input
              type="tel"
              className="form-control"
              name="emergencyContact.phone2"
              value={formData.emergencyContact?.phone2 || ''}
              onChange={onChange}
              placeholder="Enter secondary phone number"
            />
          </div>
        </div>
      )}
    </>
  );
};

// Skills & Social Links Section
const SkillsSocialSection: React.FC<{ formData: any; isEditing: boolean; onSkillsChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({
  formData,
  isEditing,
  onSkillsChange,
  onChange
}) => {
  return (
    <>
      <div className="mb-4">
        <h6 className="text-primary mb-3">Skills</h6>
        {!isEditing ? (
          <div className="d-flex flex-wrap gap-2">
            {formData.skills && formData.skills.length > 0 ? (
              formData.skills.map((skill: string, index: number) => (
                <span key={index} className="badge bg-light text-dark border py-2 px-3">
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-muted mb-0">No skills added</p>
            )}
          </div>
        ) : (
          <div className="mb-3">
            <label className="form-label">Skills (comma-separated)</label>
            <textarea
              className="form-control"
              rows={2}
              value={formData.skills?.join(', ') || ''}
              onChange={onSkillsChange}
              placeholder="e.g., JavaScript, React, Node.js"
            />
          </div>
        )}
      </div>

      <div>
        <h6 className="text-primary mb-3">Social Links</h6>
        {!isEditing ? (
          <div className="d-flex flex-wrap gap-2">
            {formData.socialLinks?.linkedin && (
              <Link to={formData.socialLinks.linkedin} target="_blank" className="btn btn-light">
                <i className="ti ti-brand-linkedin me-1" />LinkedIn
              </Link>
            )}
            {formData.socialLinks?.twitter && (
              <Link to={formData.socialLinks.twitter} target="_blank" className="btn btn-light">
                <i className="ti ti-brand-twitter me-1" />Twitter
              </Link>
            )}
            {formData.socialLinks?.facebook && (
              <Link to={formData.socialLinks.facebook} target="_blank" className="btn btn-light">
                <i className="ti ti-brand-facebook me-1" />Facebook
              </Link>
            )}
            {formData.socialLinks?.instagram && (
              <Link to={formData.socialLinks.instagram} target="_blank" className="btn btn-light">
                <i className="ti ti-brand-instagram me-1" />Instagram
              </Link>
            )}
            {!formData.socialLinks?.linkedin && !formData.socialLinks?.twitter && !formData.socialLinks?.facebook && !formData.socialLinks?.instagram && (
              <p className="text-muted mb-0">No social links added</p>
            )}
          </div>
        ) : (
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">LinkedIn</label>
              <input
                type="url"
                className="form-control"
                name="socialLinks.linkedin"
                value={formData.socialLinks?.linkedin || ''}
                onChange={onChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Twitter</label>
              <input
                type="url"
                className="form-control"
                name="socialLinks.twitter"
                value={formData.socialLinks?.twitter || ''}
                onChange={onChange}
                placeholder="https://twitter.com/username"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Facebook</label>
              <input
                type="url"
                className="form-control"
                name="socialLinks.facebook"
                value={formData.socialLinks?.facebook || ''}
                onChange={onChange}
                placeholder="https://facebook.com/username"
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Instagram</label>
              <input
                type="url"
                className="form-control"
                name="socialLinks.instagram"
                value={formData.socialLinks?.instagram || ''}
                onChange={onChange}
                placeholder="https://instagram.com/username"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// About/Bio Section Component
const AboutSection: React.FC<{ formData: any; isEditing: boolean; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; }> = ({
  formData,
  isEditing,
  onChange
}) => {
  const about = formData?.about || formData?.bio || '';

  return (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">About Me</h6>
      {!isEditing ? (
        <div>
          {about ? (
            <p className="mb-0 text-muted">{about}</p>
          ) : (
            <p className="mb-0 text-muted fst-italic">No information provided</p>
          )}
        </div>
      ) : (
        <div>
          <textarea
            className="form-control"
            name="about"
            value={about}
            onChange={onChange}
            placeholder="Write something about yourself..."
            rows={4}
            maxLength={2000}
          />
          <small className="text-muted">
            Maximum 2000 characters
          </small>
        </div>
      )}
    </div>
  );
};

// Education/Qualifications Section Component
const EducationSection: React.FC<{
  qualifications?: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete?: (index: number) => void;
}> = ({ qualifications, onAdd, onEdit, onDelete }) => {
  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  if (!qualifications || qualifications.length === 0) {
    return (
      <>
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">
            <i className="ti ti-certificate me-2" />
            Education & Qualifications
          </h5>
          <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
            <i className="ti ti-plus me-1" />
            Add Education
          </button>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0 fst-italic">No education records available</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <i className="ti ti-certificate me-2" />
          Education & Qualifications
        </h5>
        <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
          <i className="ti ti-plus me-1" />
          Add Education
        </button>
      </div>
      <div className="card-body">
        <div className="row">
          {qualifications.map((edu, index) => (
            <div key={index} className="col-md-6 mb-3">
              <div className="card h-100 border">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="card-title mb-0">{edu.degree || 'Degree'}</h6>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => onEdit(index)}
                        title="Edit"
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          className="btn btn-light text-danger"
                          onClick={() => onDelete(index)}
                          title="Delete"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                  {edu.institution && <p className="small mb-1"><i className="ti ti-building me-1"></i>{edu.institution}</p>}
                  {(edu.startDate || edu.endDate) && <p className="small text-muted mb-0"><i className="ti ti-calendar me-1"></i>{edu.startDate ? formatDate(edu.startDate) : ''}{edu.startDate && edu.endDate ? ' - ' : ''}{edu.endDate ? formatDate(edu.endDate) : ''}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Experience Section Component
const ExperienceSection: React.FC<{
  experience?: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete?: (index: number) => void;
}> = ({ experience, onAdd, onEdit, onDelete }) => {
  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  if (!experience || experience.length === 0) {
    return (
      <>
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">
            <i className="ti ti-briefcase me-2" />
            Work Experience
          </h5>
          <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
            <i className="ti ti-plus me-1" />
            Add Experience
          </button>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0 fst-italic">No experience records available</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <i className="ti ti-briefcase me-2" />
          Work Experience
        </h5>
        <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
          <i className="ti ti-plus me-1" />
          Add Experience
        </button>
      </div>
      <div className="card-body">
        <div className="timeline">
          {experience.map((exp, index) => (
            <div key={index} className="timeline-item mb-3">
              <div className="timeline-badge">
                <i className="ti ti-briefcase" />
              </div>
              <div className="timeline-text ps-3">
                <div className="d-flex justify-content-between align-items-start mb-1">
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-0">{exp.designation || exp.position || 'Designation'}</h6>
                        <p className="small text-muted mb-1">{exp.company || exp.previousCompany || 'Company'}</p>
                      </div>
                      <div className="btn-group btn-group-sm ms-2">
                        <button
                          type="button"
                          className="btn btn-light btn-sm"
                          onClick={() => onEdit(index)}
                          title="Edit"
                        >
                          <i className="ti ti-pencil" />
                        </button>
                        {onDelete && (
                          <button
                            type="button"
                            className="btn btn-light btn-sm text-danger"
                            onClick={() => onDelete(index)}
                            title="Delete"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="small text-muted mb-0">
                      <i className="ti ti-calendar me-1"></i>
                      {exp.startDate ? formatDate(exp.startDate) : 'Start'} - {exp.current ? 'Present' : (exp.endDate ? formatDate(exp.endDate) : 'End')}
                    </p>

                  </div>
                  {exp.current && (
                    <span className="badge bg-success">Current</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Family Section Component
const FamilySection: React.FC<{
  family?: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete?: (index: number) => void;
}> = ({ family = [], onAdd, onEdit, onDelete }) => {
  if (family.length === 0) {
    return (
      <>
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="mb-0">
            <i className="ti ti-users me-2" />
            Family Members
          </h5>
          <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
            <i className="ti ti-plus me-1" />
            Add Family Member
          </button>
        </div>
        <div className="card-body">
          <p className="text-muted mb-0 fst-italic">No family members added yet.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card-header d-flex align-items-center justify-content-between">
        <h5 className="mb-0">
          <i className="ti ti-users me-2" />
          Family Members
        </h5>
        <button type="button" className="btn btn-light btn-sm" onClick={onAdd}>
          <i className="ti ti-plus me-1" />
          Add Family Member
        </button>
      </div>
      <div className="card-body">
        <div className="row">
          {family.map((member, index) => (
            <div key={index} className="col-md-6 mb-3">
              <div className="card h-100 border">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="card-title mb-0">{member.Name || member.familyMemberName || member.name || 'Name'}</h6>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-light"
                        onClick={() => onEdit(index)}
                        title="Edit"
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      {onDelete && (
                        <button
                          type="button"
                          className="btn btn-light text-danger"
                          onClick={() => onDelete(index)}
                          title="Delete"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      )}
                    </div>
                  </div>
                  {member.relationship && <p className="small text-muted mb-1"><i className="ti ti-users me-1"></i>{member.relationship}</p>}
                  {member.phone && <p className="small mb-0"><i className="ti ti-phone me-1"></i>{member.phone}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Work Info Section
const WorkInfoSection: React.FC<{ workInfo: any; currentUserProfile: any; }> = ({ workInfo, currentUserProfile }) => {
  const InfoRow = ({ label, value }: { label: string; value?: string | React.ReactNode }) => (
    <div className="row mb-3">
      <div className="col-md-4">
        <p className="text-muted mb-0">{label}</p>
      </div>
      <div className="col-md-8">
        <p className="fw-medium mb-0">{value || '—'}</p>
      </div>
    </div>
  );

  // Format role for display
  const formatRole = (role: string) => {
    if (!role) return '—';
    const roleMap: Record<string, string> = {
      'superadmin': 'Super Admin',
      'admin': 'Admin',
      'hr': 'HR',
      'manager': 'Manager',
      'leads': 'Team Lead',
      'employee': 'Employee'
    };
    return roleMap[role.toLowerCase()] || role;
  };

  // Get reporting manager name
  const reportingManagerName = currentUserProfile?.reportingManager
    ? `${currentUserProfile.reportingManager.firstName || ''} ${currentUserProfile.reportingManager.lastName || ''}`.trim() ||
    currentUserProfile.reportingManager.fullName ||
    currentUserProfile.reportingManager.employeeId
    : null;

  // Get shift timing from workInfo.shift
  const shiftTiming = workInfo?.shift
    ? `${workInfo.shift.startTime} - ${workInfo.shift.endTime}`
    : null;

  return (
    <>
      <InfoRow label="Role" value={formatRole(currentUserProfile?.role)} />
      <InfoRow label="Employee ID" value={currentUserProfile?.employeeId} />
      <InfoRow label="Department" value={currentUserProfile?.department} />
      <InfoRow label="Designation" value={resolveDesignation(currentUserProfile?.designation)} />
      <InfoRow label="Employment Type" value={currentUserProfile?.employmentType} />
      <InfoRow label="Joining Date" value={currentUserProfile?.joiningDate ? new Date(currentUserProfile.joiningDate).toLocaleDateString() : undefined} />
      <InfoRow label="Work Location" value={currentUserProfile?.workLocation || workInfo?.workMode} />
      <InfoRow label="Reporting Manager" value={reportingManagerName} />
      <InfoRow label="Shift Timing" value={shiftTiming} />
      <InfoRow label="Timezone" value={workInfo?.timezone} />
    </>
  );
};

// Career History Section
const CareerHistorySection: React.FC<{ careerHistory: any; }> = ({ careerHistory }) => {
  if (!careerHistory) {
    return <p className="text-muted">No career history available</p>;
  }

  // Transform career history into a flat array of timeline events
  const timelineEvents: any[] = [];

  // Add promotions
  if (careerHistory.promotions && careerHistory.promotions.length > 0) {
    careerHistory.promotions.forEach((promo: any) => {
      timelineEvents.push({
        type: `Promotion: ${promo.newDesignation || promo.promotionType}`,
        date: promo.effectiveDate,
        description: promo.previousDesignation
          ? `Promoted from ${promo.previousDesignation} to ${promo.newDesignation}`
          : promo.notes,
        icon: 'ti-arrow-up-circle',
        color: 'bg-success'
      });
    });
  }

  // Add resignation
  if (careerHistory.resignation) {
    timelineEvents.push({
      type: 'Resignation',
      date: careerHistory.resignation.resignationDate,
      description: careerHistory.resignation.reason || `Last working day: ${new Date(careerHistory.resignation.lastWorkingDay).toLocaleDateString('en-GB')}`,
      icon: 'ti-logout',
      color: 'bg-warning'
    });
  }

  // Add termination
  if (careerHistory.termination) {
    timelineEvents.push({
      type: 'Termination',
      date: careerHistory.termination.terminationDate,
      description: careerHistory.termination.reason || careerHistory.termination.type || 'Employment terminated',
      icon: 'ti-x-circle',
      color: 'bg-danger'
    });
  }

  // Add policies
  if (careerHistory.policies && careerHistory.policies.length > 0) {
    careerHistory.policies.forEach((policy: any) => {
      timelineEvents.push({
        type: `Policy: ${policy.name}`,
        date: policy.effectiveDate,
        description: policy.description || policy.category,
        icon: 'ti-file-text',
        color: 'bg-info'
      });
    });
  }

  // Sort by date (most recent first)
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (timelineEvents.length === 0) {
    return <p className="text-muted">No career history available</p>;
  }

  return (
    <div className="timeline">
      {timelineEvents.map((event, index) => (
        <div key={index} className="timeline-item mb-4 pb-4 border-bottom">
          <div className="d-flex">
            <div className={`timeline-marker ${event.color} me-3`} style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className={`ti ${event.icon} text-white`} />
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <h6 className="mb-0">{event.type}</h6>
                <span className="text-muted fs-13">
                  <i className="ti ti-calendar me-1" />
                  {new Date(event.date).toLocaleDateString('en-GB')}
                </span>
              </div>
              {event.description && <p className="text-muted mb-0 fs-13">{event.description}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Assets & Policies Section
const AssetsPoliciesSection: React.FC<{ assets: any[]; }> = ({ assets }) => {
  if (!assets || assets.length === 0) {
    return <p className="text-muted">No assets assigned</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Type</th>
            <th>Serial Number</th>
            <th>Assigned Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((asset, index) => (
            <tr key={index}>
              <td className="fw-medium">{asset.name}</td>
              <td>{asset.type}</td>
              <td>
                {asset.serialNumber ? (
                  <code className="bg-light px-2 py-1 rounded">{asset.serialNumber}</code>
                ) : '—'}
              </td>
              <td>{new Date(asset.assignedDate).toLocaleDateString('en-GB')}</td>
              <td>
                <span className={`badge ${asset.status === 'Assigned' ? 'bg-success' : 'bg-secondary'}`}>
                  {asset.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================
// MAIN PROFILE PAGE COMPONENT
// ============================================

const ProfilePage = () => {
  const route = all_routes;
  const {
    currentUserProfile,
    fetchCurrentUserProfile,
    updateCurrentUserProfile,
    changePassword,
    sendForgotPasswordOtp,
    resetForgotPassword,
    loading
  } = useProfileRest();

  // Phase 4: Extended profile hook for new tabs
  const {
    workInfo,
    salaryInfo,
    statutoryInfo,
    myAssets,
    careerHistory,
    fetchAll: fetchExtendedProfile,
    loading: extendedLoading
  } = useProfileExtendedREST();

  // Change request hook for bank details approval workflow
  const {
    createChangeRequest,
    myRequests,
    fetchMyRequests,
    getFieldStatus,
  } = useChangeRequestREST();

  // Email change hook
  const emailChange = useEmailChange();

  // View/Edit mode states - separate for each section
  const [editingSections, setEditingSections] = useState({
    basic: false,
    personal: false,
    address: false,
    bank: false,
    emergency: false,
    about: false,
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email change modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({
    currentEmail: '',
    newEmail: '',
    otp: ''
  });
  // Track whether OTP was sent to new email
  const [otpSent, setOtpSent] = useState(false);
  // Email verification state
  const [emailVerification, setEmailVerification] = useState<{
    verified: boolean;
    message: string;
    checking: boolean;
    available: boolean | null;
  }>({
    verified: false,
    message: '',
    checking: false,
    available: null
  });

  // My Change Requests Modal state
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);

  // Education Modal state
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [editingEducationIndex, setEditingEducationIndex] = useState<number | null>(null);
  const [savingEducation, setSavingEducation] = useState(false);

  // Experience Modal state
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [editingExperienceIndex, setEditingExperienceIndex] = useState<number | null>(null);
  const [savingExperience, setSavingExperience] = useState(false);

  // Family Modal state
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [editingFamilyIndex, setEditingFamilyIndex] = useState<number | null>(null);
  const [savingFamily, setSavingFamily] = useState(false);

  // Fetch my change requests on mount
  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // Verify email availability (called on button click)
  const handleVerifyEmail = async () => {
    const email = emailChangeData.newEmail.trim();

    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailVerification({
        verified: false,
        message: 'Please enter a valid email address',
        checking: false,
        available: false
      });
      return;
    }

    // Check if same as current email
    if (email.toLowerCase() === emailChangeData.currentEmail.toLowerCase()) {
      setEmailVerification({
        verified: false,
        message: 'New email cannot be the same as current email',
        checking: false,
        available: false
      });
      return;
    }

    // Show checking state
    setEmailVerification(prev => ({ ...prev, checking: true, message: '' }));

    // Check availability
    const result = await emailChange.checkEmailAvailability(email, currentUserProfile?._id);
    if (result) {
      if (result.available && result.valid) {
        setEmailVerification({
          verified: true,
          message: result.message,
          checking: false,
          available: true
        });
      } else {
        setEmailVerification({
          verified: false,
          message: result.message,
          checking: false,
          available: false
        });
      }
    } else {
      setEmailVerification({
        verified: false,
        message: 'Failed to verify email. Please try again.',
        checking: false,
        available: null
      });
    }
  };

  // Reset verification state when email changes
  const handleEmailInputChange = (email: string) => {
    setEmailChangeData({ ...emailChangeData, newEmail: email });
    // Reset verification state when user modifies email
    if (emailVerification.verified || emailVerification.message) {
      setEmailVerification({
        verified: false,
        message: '',
        checking: false,
        available: null
      });
    }
  };

  // Phase 4: Tab navigation state
  const [activeTab, setActiveTab] = useState<'personal' | 'work' | 'bank' | 'assets' | 'history'>('personal');

  // State for form data - main profile data from server
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [bankRequestSending, setBankRequestSending] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password visibility states
  const [passwordVisibility, setPasswordVisibility] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
    currentPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility(prevState => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  // Forgot password flow state
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'idle' | 'otp_sent'>('idle');
  const [forgotPasswordData, setForgotPasswordData] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [forgotPasswordVisibility, setForgotPasswordVisibility] = useState({ newPassword: false, confirmPassword: false });
  const [forgotPasswordSaving, setForgotPasswordSaving] = useState(false);

  const handleSendForgotOtp = async () => {
    setForgotPasswordSaving(true);
    const ok = await sendForgotPasswordOtp();
    setForgotPasswordSaving(false);
    if (ok) setForgotPasswordStep('otp_sent');
  };

  const handleResetForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordData.otp || !forgotPasswordData.newPassword || !forgotPasswordData.confirmPassword) {
      toast.error('All fields are required');
      return;
    }
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (forgotPasswordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setForgotPasswordSaving(true);
    const ok = await resetForgotPassword(forgotPasswordData);
    setForgotPasswordSaving(false);
    if (ok) {
      setForgotPasswordStep('idle');
      setForgotPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
    }
  };

  // Country options (comprehensive global list)
  const countryChoose = [
    { value: 'Select', label: 'Select' },
    { value: 'Afghanistan', label: 'Afghanistan' },
    { value: 'Albania', label: 'Albania' },
    { value: 'Algeria', label: 'Algeria' },
    { value: 'Andorra', label: 'Andorra' },
    { value: 'Angola', label: 'Angola' },
    { value: 'Argentina', label: 'Argentina' },
    { value: 'Armenia', label: 'Armenia' },
    { value: 'Australia', label: 'Australia' },
    { value: 'Austria', label: 'Austria' },
    { value: 'Azerbaijan', label: 'Azerbaijan' },
    { value: 'Bahamas', label: 'Bahamas' },
    { value: 'Bahrain', label: 'Bahrain' },
    { value: 'Bangladesh', label: 'Bangladesh' },
    { value: 'Belarus', label: 'Belarus' },
    { value: 'Belgium', label: 'Belgium' },
    { value: 'Belize', label: 'Belize' },
    { value: 'Benin', label: 'Benin' },
    { value: 'Bhutan', label: 'Bhutan' },
    { value: 'Bolivia', label: 'Bolivia' },
    { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
    { value: 'Botswana', label: 'Botswana' },
    { value: 'Brazil', label: 'Brazil' },
    { value: 'Brunei', label: 'Brunei' },
    { value: 'Bulgaria', label: 'Bulgaria' },
    { value: 'Burkina Faso', label: 'Burkina Faso' },
    { value: 'Burundi', label: 'Burundi' },
    { value: 'Cambodia', label: 'Cambodia' },
    { value: 'Cameroon', label: 'Cameroon' },
    { value: 'Canada', label: 'Canada' },
    { value: 'Cape Verde', label: 'Cape Verde' },
    { value: 'Central African Republic', label: 'Central African Republic' },
    { value: 'Chad', label: 'Chad' },
    { value: 'Chile', label: 'Chile' },
    { value: 'China', label: 'China' },
    { value: 'Colombia', label: 'Colombia' },
    { value: 'Comoros', label: 'Comoros' },
    { value: 'Congo', label: 'Congo' },
    { value: 'Costa Rica', label: 'Costa Rica' },
    { value: 'Croatia', label: 'Croatia' },
    { value: 'Cuba', label: 'Cuba' },
    { value: 'Cyprus', label: 'Cyprus' },
    { value: 'Czech Republic', label: 'Czech Republic' },
    { value: 'Denmark', label: 'Denmark' },
    { value: 'Djibouti', label: 'Djibouti' },
    { value: 'Dominican Republic', label: 'Dominican Republic' },
    { value: 'Ecuador', label: 'Ecuador' },
    { value: 'Egypt', label: 'Egypt' },
    { value: 'El Salvador', label: 'El Salvador' },
    { value: 'Equatorial Guinea', label: 'Equatorial Guinea' },
    { value: 'Eritrea', label: 'Eritrea' },
    { value: 'Estonia', label: 'Estonia' },
    { value: 'Ethiopia', label: 'Ethiopia' },
    { value: 'Fiji', label: 'Fiji' },
    { value: 'Finland', label: 'Finland' },
    { value: 'France', label: 'France' },
    { value: 'Gabon', label: 'Gabon' },
    { value: 'Gambia', label: 'Gambia' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Germany', label: 'Germany' },
    { value: 'Ghana', label: 'Ghana' },
    { value: 'Greece', label: 'Greece' },
    { value: 'Grenada', label: 'Grenada' },
    { value: 'Guatemala', label: 'Guatemala' },
    { value: 'Guinea', label: 'Guinea' },
    { value: 'Guinea-Bissau', label: 'Guinea-Bissau' },
    { value: 'Guyana', label: 'Guyana' },
    { value: 'Haiti', label: 'Haiti' },
    { value: 'Honduras', label: 'Honduras' },
    { value: 'Hong Kong', label: 'Hong Kong' },
    { value: 'Hungary', label: 'Hungary' },
    { value: 'Iceland', label: 'Iceland' },
    { value: 'India', label: 'India' },
    { value: 'Indonesia', label: 'Indonesia' },
    { value: 'Iran', label: 'Iran' },
    { value: 'Iraq', label: 'Iraq' },
    { value: 'Ireland', label: 'Ireland' },
    { value: 'Israel', label: 'Israel' },
    { value: 'Italy', label: 'Italy' },
    { value: 'Jamaica', label: 'Jamaica' },
    { value: 'Japan', label: 'Japan' },
    { value: 'Jordan', label: 'Jordan' },
    { value: 'Kazakhstan', label: 'Kazakhstan' },
    { value: 'Kenya', label: 'Kenya' },
    { value: 'Kuwait', label: 'Kuwait' },
    { value: 'Kyrgyzstan', label: 'Kyrgyzstan' },
    { value: 'Laos', label: 'Laos' },
    { value: 'Latvia', label: 'Latvia' },
    { value: 'Lebanon', label: 'Lebanon' },
    { value: 'Lesotho', label: 'Lesotho' },
    { value: 'Liberia', label: 'Liberia' },
    { value: 'Libya', label: 'Libya' },
    { value: 'Liechtenstein', label: 'Liechtenstein' },
    { value: 'Lithuania', label: 'Lithuania' },
    { value: 'Luxembourg', label: 'Luxembourg' },
    { value: 'Macao', label: 'Macao' },
    { value: 'Macedonia', label: 'Macedonia' },
    { value: 'Madagascar', label: 'Madagascar' },
    { value: 'Malawi', label: 'Malawi' },
    { value: 'Malaysia', label: 'Malaysia' },
    { value: 'Maldives', label: 'Maldives' },
    { value: 'Mali', label: 'Mali' },
    { value: 'Malta', label: 'Malta' },
    { value: 'Mauritania', label: 'Mauritania' },
    { value: 'Mauritius', label: 'Mauritius' },
    { value: 'Mexico', label: 'Mexico' },
    { value: 'Moldova', label: 'Moldova' },
    { value: 'Monaco', label: 'Monaco' },
    { value: 'Mongolia', label: 'Mongolia' },
    { value: 'Montenegro', label: 'Montenegro' },
    { value: 'Morocco', label: 'Morocco' },
    { value: 'Mozambique', label: 'Mozambique' },
    { value: 'Myanmar', label: 'Myanmar' },
    { value: 'Namibia', label: 'Namibia' },
    { value: 'Nepal', label: 'Nepal' },
    { value: 'Netherlands', label: 'Netherlands' },
    { value: 'New Zealand', label: 'New Zealand' },
    { value: 'Nicaragua', label: 'Nicaragua' },
    { value: 'Niger', label: 'Niger' },
    { value: 'Nigeria', label: 'Nigeria' },
    { value: 'North Korea', label: 'North Korea' },
    { value: 'Norway', label: 'Norway' },
    { value: 'Oman', label: 'Oman' },
    { value: 'Pakistan', label: 'Pakistan' },
    { value: 'Palestine', label: 'Palestine' },
    { value: 'Panama', label: 'Panama' },
    { value: 'Papua New Guinea', label: 'Papua New Guinea' },
    { value: 'Paraguay', label: 'Paraguay' },
    { value: 'Peru', label: 'Peru' },
    { value: 'Philippines', label: 'Philippines' },
    { value: 'Poland', label: 'Poland' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'Qatar', label: 'Qatar' },
    { value: 'Romania', label: 'Romania' },
    { value: 'Russian Federation', label: 'Russian Federation' },
    { value: 'Rwanda', label: 'Rwanda' },
    { value: 'Saudi Arabia', label: 'Saudi Arabia' },
    { value: 'Senegal', label: 'Senegal' },
    { value: 'Serbia', label: 'Serbia' },
    { value: 'Seychelles', label: 'Seychelles' },
    { value: 'Sierra Leone', label: 'Sierra Leone' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'Slovakia', label: 'Slovakia' },
    { value: 'Slovenia', label: 'Slovenia' },
    { value: 'Somalia', label: 'Somalia' },
    { value: 'South Africa', label: 'South Africa' },
    { value: 'South Korea', label: 'South Korea' },
    { value: 'Spain', label: 'Spain' },
    { value: 'Sri Lanka', label: 'Sri Lanka' },
    { value: 'Sudan', label: 'Sudan' },
    { value: 'Suriname', label: 'Suriname' },
    { value: 'Swaziland', label: 'Swaziland' },
    { value: 'Sweden', label: 'Sweden' },
    { value: 'Switzerland', label: 'Switzerland' },
    { value: 'Syria', label: 'Syria' },
    { value: 'Taiwan', label: 'Taiwan' },
    { value: 'Tajikistan', label: 'Tajikistan' },
    { value: 'Tanzania', label: 'Tanzania' },
    { value: 'Thailand', label: 'Thailand' },
    { value: 'Togo', label: 'Togo' },
    { value: 'Tonga', label: 'Tonga' },
    { value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
    { value: 'Tunisia', label: 'Tunisia' },
    { value: 'Turkey', label: 'Turkey' },
    { value: 'Turkmenistan', label: 'Turkmenistan' },
    { value: 'Uganda', label: 'Uganda' },
    { value: 'Ukraine', label: 'Ukraine' },
    { value: 'United Arab Emirates', label: 'United Arab Emirates' },
    { value: 'United Kingdom', label: 'United Kingdom' },
    { value: 'United States', label: 'United States' },
    { value: 'Uruguay', label: 'Uruguay' },
    { value: 'Uzbekistan', label: 'Uzbekistan' },
    { value: 'Vanuatu', label: 'Vanuatu' },
    { value: 'Vatican City', label: 'Vatican City' },
    { value: 'Venezuela', label: 'Venezuela' },
    { value: 'Vietnam', label: 'Vietnam' },
    { value: 'Yemen', label: 'Yemen' },
    { value: 'Zambia', label: 'Zambia' },
    { value: 'Zimbabwe', label: 'Zimbabwe' },
  ];

  const genderOptions = [
    { value: "Select", label: "Select" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

  // Cloudinary image upload function
  const uploadImage = async (file: File) => {
    setProfilePhoto(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "amasqis");
    const res = await fetch("https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url;
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 4MB.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = "";
      return;
    }

    if (["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)) {
      setImageUpload(true);
      try {
        const uploadedUrl = await uploadImage(file);
        setProfilePhoto(uploadedUrl);
        setFormData(prev => ({ ...prev, profilePhoto: uploadedUrl }));
        setImageUpload(false);
        // Auto-save profile photo
        await updateCurrentUserProfile({ profilePhoto: uploadedUrl });
        toast.success('Profile photo updated successfully!');
      } catch (error) {
        setImageUpload(false);
        toast.error("Failed to upload image. Please try again.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        event.target.value = "";
      }
    } else {
      toast.error("Please upload image file only.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = "";
    }
  };

  // Remove uploaded photo
  const removePhoto = async () => {
    setProfilePhoto(null);
    setFormData(prev => ({ ...prev, profilePhoto: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Auto-save removal
    await updateCurrentUserProfile({ profilePhoto: '' });
    toast.success('Profile photo removed successfully!');
  };

  // Load current user profile on component mount
  useEffect(() => {
    fetchCurrentUserProfile();
  }, [fetchCurrentUserProfile]);

  // Load extended profile data (work info, salary, career, assets) on mount
  useEffect(() => {
    fetchExtendedProfile();
  }, [fetchExtendedProfile]);

  // Update form data when profile is loaded
  useEffect(() => {
    if (currentUserProfile) {
      setFormData({
        firstName: currentUserProfile.firstName || '',
        lastName: currentUserProfile.lastName || '',
        email: currentUserProfile.email || '',
        phone: currentUserProfile.phone || '',
        dateOfBirth: currentUserProfile.dateOfBirth ? new Date(currentUserProfile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: currentUserProfile.gender || '',
        profilePhoto: currentUserProfile.profilePhoto || '',
        employeeId: currentUserProfile.employeeId || '',
        department: currentUserProfile.department || '',
        designation: resolveDesignation(currentUserProfile.designation),
        joiningDate: currentUserProfile.joiningDate ? new Date(currentUserProfile.joiningDate).toISOString().split('T')[0] : '',
        role: currentUserProfile.role || '',
        employmentType: currentUserProfile.employmentType || '',
        status: currentUserProfile.status || 'Active',
        about: currentUserProfile.about || currentUserProfile.bio || '',
        bio: currentUserProfile.bio || '',
        address: {
          street: currentUserProfile.address?.street || '',
          city: currentUserProfile.address?.city || '',
          state: currentUserProfile.address?.state || '',
          country: currentUserProfile.address?.country || '',
          postalCode: currentUserProfile.address?.postalCode || ''
        },
        emergencyContact: {
          name: currentUserProfile.emergencyContact?.name || '',
          phone: currentUserProfile.emergencyContact?.phone || '',
          phone2: currentUserProfile.emergencyContact?.phone2 || '',
          relationship: currentUserProfile.emergencyContact?.relationship || ''
        },
        personal: {
          passport: {
            number: currentUserProfile.personal?.passport?.number || currentUserProfile.passport?.number || '',
            expiryDate: currentUserProfile.personal?.passport?.expiryDate || currentUserProfile.passport?.expiryDate || null,
            country: currentUserProfile.personal?.passport?.country || currentUserProfile.passport?.country || ''
          },
          nationality: currentUserProfile.personal?.nationality || currentUserProfile.nationality || '',
          maritalStatus: currentUserProfile.personal?.maritalStatus || currentUserProfile.maritalStatus || '',
          noOfChildren: currentUserProfile.personal?.noOfChildren ?? currentUserProfile.noOfChildren ?? 0
        },
        bankDetails: {
          accountHolderName: currentUserProfile.bankDetails?.accountHolderName || '',
          bankName: currentUserProfile.bankDetails?.bankName || '',
          accountNumber: currentUserProfile.bankDetails?.accountNumber || '',
          ifscCode: currentUserProfile.bankDetails?.ifscCode || '',
          branch: currentUserProfile.bankDetails?.branch || '',
          accountType: currentUserProfile.bankDetails?.accountType || 'Savings Account'
        }
      });
      setProfilePhoto(currentUserProfile.profilePhoto || null);
    }
  }, [currentUserProfile]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name.includes('.')) {
      const parts = name.split('.');
      // Handle nested fields like personal.passport.number
      if (parts.length === 3) {
        const [parent, child, grandchild] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof Profile] as any),
            [child]: {
              ...((prev[parent as keyof Profile] as any)?.[child] || {}),
              [grandchild]: value
            }
          }
        }));
      } else if (parts.length === 2) {
        const [parent, child] = parts;
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof Profile] as any || {}),
            [child]: value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle nested field changes for PersonalInfoSection
  const handleNestedFieldChange = (field: string, value: any) => {
    const parts = field.split('.');
    if (parts.length === 3) {
      const [parent, child, grandchild] = parts;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Profile] as any),
          [child]: {
            ...((prev[parent as keyof Profile] as any)?.[child] || {}),
            [grandchild]: value
          }
        }
      }));
    } else if (parts.length === 2) {
      const [parent, child] = parts;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Profile] as any),
          [child]: value
        }
      }));
    }
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    const parts = name.split('.');
    // Handle nested fields like personal.passport.country
    if (parts.length === 3) {
      const [parent, child, grandchild] = parts;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Profile] as any),
          [child]: {
            ...((prev[parent as keyof Profile] as any)?.[child] || {}),
            [grandchild]: value
          }
        }
      }));
    } else if (parts.length === 2) {
      const [parent, child] = parts;
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Profile] as any),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password input changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Per-section edit handlers
  const handleEditSection = (section: keyof typeof editingSections) => {
    setEditingSections(prev => ({ ...prev, [section]: true }));
  };

  const handleCancelSection = (section: keyof typeof editingSections) => {
    setEditingSections(prev => ({ ...prev, [section]: false }));
    // Reset form data to current profile when canceling
    if (currentUserProfile) {
      setFormData({
        firstName: currentUserProfile.firstName || '',
        lastName: currentUserProfile.lastName || '',
        email: currentUserProfile.email || '',
        phone: currentUserProfile.phone || '',
        dateOfBirth: currentUserProfile.dateOfBirth ? new Date(currentUserProfile.dateOfBirth).toISOString().split('T')[0] : '',
        gender: currentUserProfile.gender || '',
        profilePhoto: currentUserProfile.profilePhoto || '',
        employeeId: currentUserProfile.employeeId || '',
        department: currentUserProfile.department || '',
        designation: resolveDesignation(currentUserProfile.designation),
        joiningDate: currentUserProfile.joiningDate ? new Date(currentUserProfile.joiningDate).toISOString().split('T')[0] : '',
        role: currentUserProfile.role || '',
        employmentType: currentUserProfile.employmentType || '',
        status: currentUserProfile.status || 'Active',
        about: currentUserProfile.about || currentUserProfile.bio || '',
        bio: currentUserProfile.bio || '',
        address: {
          street: currentUserProfile.address?.street || '',
          city: currentUserProfile.address?.city || '',
          state: currentUserProfile.address?.state || '',
          country: currentUserProfile.address?.country || '',
          postalCode: currentUserProfile.address?.postalCode || ''
        },
        emergencyContact: {
          name: currentUserProfile.emergencyContact?.name || '',
          phone: currentUserProfile.emergencyContact?.phone || '',
          phone2: currentUserProfile.emergencyContact?.phone2 || '',
          relationship: currentUserProfile.emergencyContact?.relationship || ''
        },
        personal: {
          passport: {
            number: currentUserProfile.personal?.passport?.number || currentUserProfile.passport?.number || '',
            expiryDate: currentUserProfile.personal?.passport?.expiryDate || currentUserProfile.passport?.expiryDate || null,
            country: currentUserProfile.personal?.passport?.country || currentUserProfile.passport?.country || ''
          },
          nationality: currentUserProfile.personal?.nationality || currentUserProfile.nationality || '',
          maritalStatus: currentUserProfile.personal?.maritalStatus || currentUserProfile.maritalStatus || '',
          noOfChildren: currentUserProfile.personal?.noOfChildren ?? currentUserProfile.noOfChildren ?? 0
        },
        bankDetails: {
          accountHolderName: currentUserProfile.bankDetails?.accountHolderName || '',
          bankName: currentUserProfile.bankDetails?.bankName || '',
          accountNumber: currentUserProfile.bankDetails?.accountNumber || '',
          ifscCode: currentUserProfile.bankDetails?.ifscCode || '',
          branch: currentUserProfile.bankDetails?.branch || '',
          accountType: currentUserProfile.bankDetails?.accountType || 'Savings Account'
        }
      });
    }
  };

  // Handle save for a specific section
  const handleSaveSection = async (section: keyof typeof editingSections) => {
    setSaving(true);
    try {
      const success = await updateCurrentUserProfile(formData);
      if (success) {
        toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} updated successfully!`);
        setEditingSections(prev => ({ ...prev, [section]: false }));
      }
    } catch (error) {
      console.error(`Error updating ${section}:`, error);
    } finally {
      setSaving(false);
    }
  };

  // Handle bank details change request - sends to HR for approval
  const handleSendBankRequest = async () => {
    // Validate bank details
    const bankDetails = formData.bankDetails;
    if (!bankDetails?.bankName || !bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.branch) {
      toast.error('Please fill in all required bank details (Bank Name, Account Number, IFSC Code, Branch)');
      return;
    }

    setBankRequestSending(true);
    try {
      // Detect which fields have actually changed
      const currentBankDetails = currentUserProfile?.bankDetails || {};
      const fields: Array<{ field: string; label: string; newValue: any }> = [];

      // Account Holder Name
      if (bankDetails.accountHolderName !== currentBankDetails.accountHolderName) {
        fields.push({
          field: 'bankDetails.accountHolderName',
          label: 'Account Holder Name',
          newValue: bankDetails.accountHolderName
        });
      }

      // Bank Name
      if (bankDetails.bankName !== currentBankDetails.bankName) {
        fields.push({
          field: 'bankDetails.bankName',
          label: 'Bank Name',
          newValue: bankDetails.bankName
        });
      }

      // Account Number
      if (bankDetails.accountNumber !== currentBankDetails.accountNumber) {
        fields.push({
          field: 'bankDetails.accountNumber',
          label: 'Account Number',
          newValue: bankDetails.accountNumber
        });
      }

      // IFSC Code
      if (bankDetails.ifscCode !== currentBankDetails.ifscCode) {
        fields.push({
          field: 'bankDetails.ifscCode',
          label: 'IFSC Code',
          newValue: bankDetails.ifscCode
        });
      }

      // Branch
      if (bankDetails.branch !== currentBankDetails.branch) {
        fields.push({
          field: 'bankDetails.branch',
          label: 'Branch',
          newValue: bankDetails.branch
        });
      }

      // Account Type
      if (bankDetails.accountType !== currentBankDetails.accountType) {
        fields.push({
          field: 'bankDetails.accountType',
          label: 'Account Type',
          newValue: bankDetails.accountType
        });
      }

      if (fields.length === 0) {
        toast.warning('No changes detected. Please modify at least one field.');
        setBankRequestSending(false);
        return;
      }

      // Create change request with individual fields
      const success = await createChangeRequest({
        requestType: fields.length > 1 ? 'bankDetails' : 'other',
        fields: fields,
        reason: 'Requesting to update bank account information',
      });

      if (success) {
        toast.success(`Bank details change request sent to HR for approval (${fields.length} field${fields.length > 1 ? 's' : ''})!`);
        // Close edit mode but DON'T save the data
        setEditingSections(prev => ({ ...prev, bank: false }));
        // Reset form data to current profile data (revert changes)
        if (currentUserProfile) {
          setFormData(prev => ({
            ...prev,
            bankDetails: currentUserProfile.bankDetails || {
              accountHolderName: '',
              bankName: '',
              accountNumber: '',
              ifscCode: '',
              branch: '',
              accountType: 'Savings Account'
            }
          }));
        }
      } else {
        toast.error('Failed to send change request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending bank change request:', error);
      toast.error('An error occurred while sending the request.');
    } finally {
      setBankRequestSending(false);
    }
  };

  // Education handlers
  const openAddEducationModal = () => {
    setEditingEducationIndex(null);
    setShowEducationModal(true);
  };

  const openEditEducationModal = (index: number) => {
    setEditingEducationIndex(index);
    setShowEducationModal(true);
  };

  const handleSaveEducation = async (data: any) => {
    setSavingEducation(true);
    try {
      const currentQualifications = currentUserProfile?.education || currentUserProfile?.qualifications || [];
      let updatedQualifications;

      if (editingEducationIndex !== null) {
        // Update existing entry
        updatedQualifications = [...currentQualifications];
        updatedQualifications[editingEducationIndex] = data;
      } else {
        // Add new entry
        updatedQualifications = [...currentQualifications, data];
      }

      const success = await updateCurrentUserProfile({
        education: updatedQualifications
      });

      if (success) {
        toast.success(editingEducationIndex !== null ? 'Education updated successfully!' : 'Education added successfully!');
        setShowEducationModal(false);
        await fetchCurrentUserProfile();
      } else {
        toast.error('Failed to save education. Please try again.');
      }
    } catch (error) {
      console.error('Error saving education:', error);
      toast.error('An error occurred while saving education.');
    } finally {
      setSavingEducation(false);
    }
  };

  const handleDeleteEducation = async (index: number) => {
    Modal.confirm({
      title: 'Delete Education',
      content: 'Are you sure you want to delete this education entry?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const currentQualifications = currentUserProfile?.education || currentUserProfile?.qualifications || [];
          const updatedQualifications = currentQualifications.filter((_, i) => i !== index);

          const success = await updateCurrentUserProfile({
            qualifications: updatedQualifications
          });

          if (success) {
            toast.success('Education deleted successfully!');
            await fetchCurrentUserProfile();
          } else {
            toast.error('Failed to delete education. Please try again.');
          }
        } catch (error) {
          console.error('Error deleting education:', error);
          toast.error('An error occurred while deleting education.');
        }
      }
    });
  };

  // Experience handlers
  const openAddExperienceModal = () => {
    setEditingExperienceIndex(null);
    setShowExperienceModal(true);
  };

  const openEditExperienceModal = (index: number) => {
    setEditingExperienceIndex(index);
    setShowExperienceModal(true);
  };

  const handleSaveExperience = async (data: any) => {
    setSavingExperience(true);
    try {
      const currentExperience = currentUserProfile?.experience || [];
      let updatedExperience;

      if (editingExperienceIndex !== null) {
        // Update existing entry
        updatedExperience = [...currentExperience];
        updatedExperience[editingExperienceIndex] = data;
      } else {
        // Add new entry
        updatedExperience = [...currentExperience, data];
      }

      const success = await updateCurrentUserProfile({
        experience: updatedExperience
      });

      if (success) {
        toast.success(editingExperienceIndex !== null ? 'Experience updated successfully!' : 'Experience added successfully!');
        setShowExperienceModal(false);
        await fetchCurrentUserProfile();
      } else {
        toast.error('Failed to save experience. Please try again.');
      }
    } catch (error) {
      console.error('Error saving experience:', error);
      toast.error('An error occurred while saving experience.');
    } finally {
      setSavingExperience(false);
    }
  };

  const handleDeleteExperience = async (index: number) => {
    Modal.confirm({
      title: 'Delete Experience',
      content: 'Are you sure you want to delete this experience entry?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const currentExperience = currentUserProfile?.experience || [];
          const updatedExperience = currentExperience.filter((_, i) => i !== index);

          const success = await updateCurrentUserProfile({
            experience: updatedExperience
          });

          if (success) {
            toast.success('Experience deleted successfully!');
            await fetchCurrentUserProfile();
          } else {
            toast.error('Failed to delete experience. Please try again.');
          }
        } catch (error) {
          console.error('Error deleting experience:', error);
          toast.error('An error occurred while deleting experience.');
        }
      }
    });
  };

  // Family handlers
  const openAddFamilyModal = () => {
    setEditingFamilyIndex(null);
    setShowFamilyModal(true);
  };

  const openEditFamilyModal = (index: number) => {
    setEditingFamilyIndex(index);
    setShowFamilyModal(true);
  };

  const handleSaveFamily = async (data: any) => {
    setSavingFamily(true);
    try {
      const currentFamily = currentUserProfile?.family || [];
      let updatedFamily;

      if (editingFamilyIndex !== null) {
        updatedFamily = [...currentFamily];
        updatedFamily[editingFamilyIndex] = data;
      } else {
        updatedFamily = [...currentFamily, data];
      }

      const success = await updateCurrentUserProfile({
        family: updatedFamily
      });

      if (success) {
        toast.success(editingFamilyIndex !== null ? 'Family member updated successfully!' : 'Family member added successfully!');
        setShowFamilyModal(false);
        await fetchCurrentUserProfile();
      } else {
        toast.error('Failed to save family member. Please try again.');
      }
    } catch (error) {
      console.error('Error saving family member:', error);
      toast.error('An error occurred while saving family member.');
    } finally {
      setSavingFamily(false);
    }
  };

  const handleDeleteFamily = async (index: number) => {
    Modal.confirm({
      title: 'Delete Family Member',
      content: 'Are you sure you want to delete this family member?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          const currentFamily = currentUserProfile?.family || [];
          const updatedFamily = currentFamily.filter((_: any, i: number) => i !== index);

          const success = await updateCurrentUserProfile({
            family: updatedFamily
          });

          if (success) {
            toast.success('Family member deleted successfully!');
            await fetchCurrentUserProfile();
          } else {
            toast.error('Failed to delete family member. Please try again.');
          }
        } catch (error) {
          console.error('Error deleting family member:', error);
          toast.error('An error occurred while deleting family member.');
        }
      }
    });
  };

  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      const success = await changePassword(passwordData);
      if (success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setIsChangingPassword(false);
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('An error occurred while changing the password');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !currentUserProfile) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h5 className="text-muted">Loading Profile...</h5>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <ToastContainer />

          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">My Profile</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={route.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Profile
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm position-relative d-flex align-items-center gap-1"
                onClick={() => setShowMyRequestsModal(true)}
                title="View My Change Requests"
              >
                <i className="ti ti-file-description" />
                <span>My Requests</span>
                {myRequests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="badge bg-danger text-white ms-1">
                    {myRequests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
              <div className="head-icons">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Basic Info Header */}
          {loading && !currentUserProfile ? (
            <ProfileHeaderSkeleton />
          ) : (
            <BasicInfoSection
              profile={currentUserProfile}
              profilePhoto={profilePhoto}
              imageUpload={imageUpload}
              fileInputRef={fileInputRef}
              onImageUpload={handleImageUpload}
              onRemovePhoto={removePhoto}
              onEditEmail={() => {
                setEmailChangeData({ currentEmail: currentUserProfile?.email || '', newEmail: '', otp: '' });
                setOtpSent(false);
                setEmailVerification({ available: null, message: '', checking: false, verified: false });
                setShowEmailModal(true);
              }}
            />
          )}

          {/* Tab Navigation */}
          {loading && !currentUserProfile ? (
            <TabsSkeleton />
          ) : (
            <ul className="nav nav-tabs nav-tabs-bottom-solid mb-4">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                >
                  <i className="ti ti-user me-1"></i>Personal
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'work' ? 'active' : ''}`}
                  onClick={() => setActiveTab('work')}
                >
                  <i className="ti ti-briefcase me-1"></i>Work Info
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'bank' ? 'active' : ''}`}
                  onClick={() => setActiveTab('bank')}
                >
                  <i className="ti ti-building-bank me-1"></i>Bank Details
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'assets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assets')}
                >
                  <i className="ti ti-package me-1"></i>My Assets
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <i className="ti ti-timeline me-1"></i>Career History
                </button>
              </li>
            </ul>
          )}

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'personal' && (
              <div className="row">
                <div className="col-lg-6">
                  {loading && !currentUserProfile ? (
                    <SectionCardSkeleton />
                  ) : (
                    <EditableSection
                      title="Personal Information"
                      icon="ti-id-badge"
                      isEditing={editingSections.personal}
                      onEdit={() => handleEditSection('personal')}
                      onSave={() => handleSaveSection('personal')}
                      onCancel={() => handleCancelSection('personal')}
                      isSaving={saving}
                    >
                      <PersonalInfoSection
                        formData={formData}
                        isEditing={editingSections.personal}
                        onChange={handleNestedFieldChange}
                        onSelect={handleSelectChange}
                        genderOptions={genderOptions}
                        countryOptions={countryChoose}
                      />
                    </EditableSection>
                  )}
                </div>

                <div className="col-lg-6">
                  {loading && !currentUserProfile ? (
                    <SectionCardSkeleton />
                  ) : (
                    <EditableSection
                      title="Address Information"
                      icon="ti-map-pin"
                      isEditing={editingSections.address}
                      onEdit={() => handleEditSection('address')}
                      onSave={() => handleSaveSection('address')}
                      onCancel={() => handleCancelSection('address')}
                      isSaving={saving}
                    >
                      <AddressInfoSection
                        formData={formData}
                        isEditing={editingSections.address}
                        onChange={handleInputChange}
                        onSelect={handleSelectChange}
                      />
                    </EditableSection>
                  )}
                </div>

                <div className="col-lg-6">
                  {loading && !currentUserProfile ? (
                    <SectionCardSkeleton />
                  ) : (
                    <EditableSection
                      title="Emergency Contact"
                      icon="ti-phone-call"
                      isEditing={editingSections.emergency}
                      onEdit={() => handleEditSection('emergency')}
                      onSave={() => handleSaveSection('emergency')}
                      onCancel={() => handleCancelSection('emergency')}
                      isSaving={saving}
                    >
                      <EmergencyContactSection
                        formData={formData}
                        isEditing={editingSections.emergency}
                        onChange={handleInputChange}
                      />
                    </EditableSection>
                  )}
                </div>


                {/* About Section - Full Width */}
                <div className="col-lg-12">
                  <EditableSection
                    title="About Me"
                    icon="ti-info-circle"
                    isEditing={editingSections.about}
                    onEdit={() => handleEditSection('about')}
                    onSave={() => handleSaveSection('about')}
                    onCancel={() => handleCancelSection('about')}
                    isSaving={saving}
                  >
                    <AboutSection
                      formData={formData}
                      isEditing={editingSections.about}
                      onChange={handleTextAreaChange}
                    />
                  </EditableSection>
                </div>

                {/* Education Section - Editable */}
                <div className="col-lg-12">
                  <div className="card mb-3">
                    {loading && !currentUserProfile ? (
                      <TimelineSkeleton />
                    ) : (
                      <EducationSection
                        qualifications={currentUserProfile?.education || currentUserProfile?.qualifications}
                        onAdd={openAddEducationModal}
                        onEdit={openEditEducationModal}
                        onDelete={handleDeleteEducation}
                      />
                    )}
                  </div>
                </div>

                {/* Experience Section - Editable */}
                <div className="col-lg-12">
                  <div className="card mb-3">
                    {loading && !currentUserProfile ? (
                      <TimelineSkeleton />
                    ) : (
                      <ExperienceSection
                        experience={currentUserProfile?.experience}
                        onAdd={openAddExperienceModal}
                        onEdit={openEditExperienceModal}
                        onDelete={handleDeleteExperience}
                      />
                    )}
                  </div>
                </div>

                {/* Family Section - Editable */}
                <div className="col-lg-12">
                  <div className="card mb-3">
                    {loading && !currentUserProfile ? (
                      <FamilyCardsSkeleton />
                    ) : (
                      <FamilySection
                        family={currentUserProfile?.family}
                        onAdd={openAddFamilyModal}
                        onEdit={openEditFamilyModal}
                        onDelete={handleDeleteFamily}
                      />
                    )}
                  </div>
                </div>

                <div className="col-lg-12">
                  <div className="card mb-3">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h5 className="mb-0">
                        <i className="ti ti-lock me-2" />
                        Change Password
                      </h5>
                      {!isChangingPassword && (
                        <button
                          type="button"
                          className="btn btn-light btn-sm"
                          onClick={() => setIsChangingPassword(true)}
                        >
                          <i className="ti ti-key me-1" />
                          Change Password
                        </button>
                      )}
                    </div>
                    {isChangingPassword && (
                      <div className="card-body">
                        <form onSubmit={handlePasswordSubmit}>
                          <div className="row">
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Current Password</label>
                              <div className="input-group">
                                <input
                                  type={passwordVisibility.currentPassword ? 'text' : 'password'}
                                  className="form-control"
                                  name="currentPassword"
                                  value={passwordData.currentPassword}
                                  onChange={handlePasswordChange}
                                  required
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => togglePasswordVisibility('currentPassword')}
                                >
                                  <i className={`ti ${passwordVisibility.currentPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                                </button>
                              </div>
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">New Password</label>
                              <div className="input-group">
                                <input
                                  type={passwordVisibility.newPassword ? 'text' : 'password'}
                                  className="form-control"
                                  name="newPassword"
                                  value={passwordData.newPassword}
                                  onChange={handlePasswordChange}
                                  required
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => togglePasswordVisibility('newPassword')}
                                >
                                  <i className={`ti ${passwordVisibility.newPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                                </button>
                              </div>
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Confirm Password</label>
                              <div className="input-group">
                                <input
                                  type={passwordVisibility.confirmPassword ? 'text' : 'password'}
                                  className="form-control"
                                  name="confirmPassword"
                                  value={passwordData.confirmPassword}
                                  onChange={handlePasswordChange}
                                  required
                                />
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={() => togglePasswordVisibility('confirmPassword')}
                                >
                                  <i className={`ti ${passwordVisibility.confirmPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                              {saving ? 'Changing...' : 'Change Password'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => {
                                setIsChangingPassword(false);
                                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-muted p-0 ms-2"
                              onClick={() => {
                                setIsChangingPassword(false);
                                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                setForgotPasswordStep('idle');
                                setForgotPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
                                // Scroll to forgot password section
                                setTimeout(() => {
                                  document.getElementById('forgot-password-section')?.scrollIntoView({ behavior: 'smooth' });
                                }, 100);
                              }}
                            >
                              <i className="ti ti-key me-1" />
                              Forgot Password?
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

                {/* Forgot Password Section */}
                <div className="col-lg-12" id="forgot-password-section">
                  <div className="card mb-3">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h5 className="mb-0">
                        <i className="ti ti-key me-2" />
                        Forgot Password
                      </h5>
                      {forgotPasswordStep === 'idle' && (
                        <button
                          type="button"
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => {
                            setIsChangingPassword(false);
                            handleSendForgotOtp();
                          }}
                          disabled={forgotPasswordSaving}
                        >
                          {forgotPasswordSaving ? (
                            <><span className="spinner-border spinner-border-sm me-1" role="status" />&nbsp;Sending OTP...</>
                          ) : (
                            <><i className="ti ti-mail me-1" />Send OTP to Email</>
                          )}
                        </button>
                      )}
                    </div>

                    {forgotPasswordStep === 'idle' && (
                      <div className="card-body">
                        <p className="text-muted mb-0 small">
                          <i className="ti ti-info-circle me-1" />
                          Don't remember your current password? Click "Send OTP to Email" — we'll send a 6-digit code to your registered email address. Use it to set a new password without needing your current one.
                        </p>
                      </div>
                    )}

                    {forgotPasswordStep === 'otp_sent' && (
                      <div className="card-body">
                        <div className="alert alert-success py-2 mb-3">
                          <i className="ti ti-mail-check me-1" />
                          OTP sent to <strong>{currentUserProfile?.email}</strong>. Check your inbox (valid for 10 minutes).
                        </div>
                        <form onSubmit={handleResetForgotPassword}>
                          <div className="row">
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Enter OTP <span className="text-danger">*</span></label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="6-digit OTP"
                                maxLength={6}
                                value={forgotPasswordData.otp}
                                onChange={e => setForgotPasswordData(prev => ({ ...prev, otp: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
                                required
                              />
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">New Password <span className="text-danger">*</span></label>
                              <div className="input-group">
                                <input
                                  type={forgotPasswordVisibility.newPassword ? 'text' : 'password'}
                                  className="form-control"
                                  placeholder="Min. 6 characters"
                                  value={forgotPasswordData.newPassword}
                                  onChange={e => setForgotPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                  required
                                />
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setForgotPasswordVisibility(p => ({ ...p, newPassword: !p.newPassword }))}>
                                  <i className={`ti ${forgotPasswordVisibility.newPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                                </button>
                              </div>
                            </div>
                            <div className="col-md-4 mb-3">
                              <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                              <div className="input-group">
                                <input
                                  type={forgotPasswordVisibility.confirmPassword ? 'text' : 'password'}
                                  className="form-control"
                                  placeholder="Re-enter new password"
                                  value={forgotPasswordData.confirmPassword}
                                  onChange={e => setForgotPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                  required
                                />
                                <button type="button" className="btn btn-outline-secondary" onClick={() => setForgotPasswordVisibility(p => ({ ...p, confirmPassword: !p.confirmPassword }))}>
                                  <i className={`ti ${forgotPasswordVisibility.confirmPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-warning" disabled={forgotPasswordSaving}>
                              {forgotPasswordSaving ? (
                                <><span className="spinner-border spinner-border-sm me-1" role="status" />Resetting...</>
                              ) : (
                                <><i className="ti ti-lock-check me-1" />Reset Password</>
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => {
                                setForgotPasswordStep('idle');
                                setForgotPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
                              }}
                              disabled={forgotPasswordSaving}
                            >
                              Back
                            </button>
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-muted"
                              onClick={handleSendForgotOtp}
                              disabled={forgotPasswordSaving}
                            >
                              <i className="ti ti-refresh me-1" />Resend OTP
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'work' && (
              extendedLoading ? (
                <WorkInfoSkeleton />
              ) : (
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="ti ti-briefcase me-2" />
                      Work Information
                    </h5>
                  </div>
                  <div className="card-body">
                    <WorkInfoSection workInfo={workInfo} currentUserProfile={currentUserProfile} />
                  </div>
                </div>
              )
            )}

            {activeTab === 'bank' && (
              <ApprovalSection
                title="Bank Account Information"
                icon="ti-building-bank"
                isEditing={editingSections.bank}
                onEdit={() => handleEditSection('bank')}
                onSendRequest={handleSendBankRequest}
                onCancel={() => handleCancelSection('bank')}
                isSending={bankRequestSending}
                statusIndicator={
                  (() => {
                    const bankStatus = getSectionStatus(
                      ['bankDetails', 'bankDetails.bankName', 'bankDetails.accountNumber', 'bankDetails.ifscCode', 'bankDetails.branch', 'bankDetails.accountType'],
                      myRequests
                    );
                    if (bankStatus.hasPending || bankStatus.hasRejected) {
                      return (
                        <Tooltip
                          title={
                            bankStatus.hasRejected
                              ? 'Some bank detail changes were rejected. Click to view details.'
                              : `You have ${bankStatus.pendingCount} pending bank detail change request(s). Click to view status.`
                          }
                        >
                          <span
                            className={`ms-2 ${bankStatus.hasRejected ? 'text-danger' : 'text-warning'}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setShowMyRequestsModal(true)}
                          >
                            <i className={`ti ${bankStatus.hasRejected ? 'ti-x-circle' : 'ti-clock'}`} />
                          </span>
                        </Tooltip>
                      );
                    }
                    return null;
                  })()
                }
              >
                <BankInfoSection
                  formData={formData}
                  isEditing={editingSections.bank}
                  onChange={handleInputChange}
                />
              </ApprovalSection>
            )}

            {activeTab === 'assets' && (
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="ti ti-device-laptop me-2" />
                    Assigned Assets
                  </h5>
                </div>
                <div className="card-body">
                  {extendedLoading ? (
                    <AssetsTableSkeleton />
                  ) : (myAssets && myAssets.length > 0) ? (
                    <AssetsPoliciesSection assets={myAssets || []} />
                  ) : (
                    <div className="text-center py-5">
                      <i className="ti ti-package" style={{ fontSize: '48px', color: '#6c757d', display: 'block', marginBottom: '1rem' }} />
                      <h6>No Assets Assigned</h6>
                      <p className="text-muted mb-0">You don't have any assets assigned yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="ti ti-timeline me-2" />
                    Career History
                  </h5>
                </div>
                <div className="card-body">
                  {extendedLoading ? (
                    <CareerHistorySkeleton />
                  ) : careerHistory ? (
                    <CareerHistorySection careerHistory={careerHistory} />
                  ) : (
                    <div className="text-center py-5">
                      <i className="ti ti-timeline" style={{ fontSize: '48px', color: '#6c757d', display: 'block', marginBottom: '1rem' }} />
                      <h6>No Career History</h6>
                      <p className="text-muted mb-0">No career history records available.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Email Change Modal */}
        {showEmailModal && (
          <div className="modal fade show d-block" tabIndex={-1} aria-labelledby="emailChangeModalLabel" aria-hidden="true" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title" id="emailChangeModalLabel">
                    <i className="ti ti-mail me-2" />
                    Change Email Address
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => {
                      setShowEmailModal(false);
                      setEmailChangeData({ currentEmail: '', newEmail: '', otp: '' });
                      setOtpSent(false);
                      setEmailVerification({ verified: false, message: '', checking: false, available: null });
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {/* Current Email Display */}
                  <div className="mb-3">
                    <label className="form-label text-muted">Current Email</label>
                    <div className="form-control bg-light">{emailChangeData.currentEmail}</div>
                  </div>

                  {/* New Email Input */}
                  <div className="mb-3">
                    <label className="form-label">New Email Address</label>
                    <input
                      type="email"
                      className={`form-control ${emailVerification.available === false ? 'is-invalid' :
                        emailVerification.available === true ? 'is-valid' : ''
                        }`}
                      placeholder="Enter new email address"
                      value={emailChangeData.newEmail}
                      onChange={(e) => handleEmailInputChange(e.target.value)}
                      disabled={otpSent}
                    />
                  </div>

                  {/* Verification Status Message */}
                  {emailVerification.message && (
                    <div className={`small mb-3 p-2 rounded ${emailVerification.available === true ? 'text-success bg-success-subtle' :
                      emailVerification.available === false ? 'text-danger bg-danger-subtle' :
                        'text-muted bg-light'
                      }`}>
                      {emailVerification.available === true && <i className="ti ti-check me-1"></i>}
                      {emailVerification.available === false && <i className="ti ti-x me-1"></i>}
                      {emailVerification.message}
                    </div>
                  )}

                  {/* Verify Button (show when email entered but not verified) */}
                  {!otpSent && !emailVerification.verified && emailChangeData.newEmail && (
                    <button
                      className="btn btn-outline-primary w-100 mb-3"
                      onClick={handleVerifyEmail}
                      disabled={emailVerification.checking || !emailChangeData.newEmail}
                    >
                      {emailVerification.checking ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-check me-2"></i>
                          Verify Email
                        </>
                      )}
                    </button>
                  )}

                  {/* Send OTP Button (only show after email is verified) */}
                  {!otpSent && emailVerification.verified ? (
                    <button
                      className="btn btn-primary w-100"
                      onClick={async () => {
                        const result = await emailChange.sendNewEmailOTP(currentUserProfile?._id || '', emailChangeData.newEmail);
                        if (result.success) {
                          setOtpSent(true);
                          toast.success('OTP sent to new email address');
                        }
                      }}
                      disabled={emailChange.loading}
                    >
                      {emailChange.loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="ti ti-mail me-2"></i>
                          Send Verification Code
                        </>
                      )}
                    </button>
                  ) : !otpSent && emailChangeData.newEmail && !emailVerification.verified ? (
                    <div className="text-center text-muted small">
                      <i className="ti ti-info-circle me-1"></i>
                      Enter email and click "Verify Email" to continue
                    </div>
                  ) : null}

                  {/* OTP Section (show after OTP is sent) */}
                  {otpSent && (
                    <>
                      {/* OTP Input */}
                      <div className="mb-3">
                        <label className="form-label">Enter Verification Code</label>
                        <p className="text-muted small">We've sent a 6-digit code to <strong>{emailChangeData.newEmail}</strong></p>
                        <input
                          type="text"
                          className="form-control mb-2"
                          placeholder="Enter 6-digit code"
                          value={emailChangeData.otp}
                          onChange={(e) => setEmailChangeData({ ...emailChangeData, otp: e.target.value })}
                          maxLength={6}
                        />
                      </div>

                      {/* Verify & Update Button */}
                      <button
                        className="btn btn-success w-100"
                        onClick={async () => {
                          if (!emailChangeData.otp || emailChangeData.otp.length !== 6) {
                            toast.error('Please enter valid 6-digit code');
                            return;
                          }

                          const result = await emailChange.updateEmail(
                            currentUserProfile?._id || '',
                            emailChangeData.newEmail,
                            emailChangeData.otp
                          );

                          if (result.success) {
                            setShowEmailModal(false);
                            setEmailChangeData({ currentEmail: '', newEmail: '', otp: '' });
                            setOtpSent(false);
                            setEmailVerification({ verified: false, message: '', checking: false, available: null });
                            toast.success('Email updated successfully! Please check your new email for login credentials.');
                            // Refresh profile data
                            fetchCurrentUserProfile();
                          }
                        }}
                        disabled={emailChange.loading || emailChangeData.otp.length !== 6}
                      >
                        {emailChange.loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Verifying...
                          </>
                        ) : 'Verify & Update Email'}
                      </button>

                      {/* Resend OTP Link */}
                      <div className="text-center mt-2">
                        <button
                          className="btn btn-link p-0 text-muted small"
                          onClick={async () => {
                            const result = await emailChange.sendNewEmailOTP(currentUserProfile?._id || '', emailChangeData.newEmail);
                            if (result.success) {
                              toast.success('New OTP sent to your email');
                            }
                          }}
                          disabled={emailChange.loading}
                        >
                          Didn't receive code? Resend
                        </button>
                      </div>
                    </>
                  )}

                  {/* Error Display */}
                  {emailChange.error && (
                    <div className="alert alert-danger mt-3 mb-0">
                      {emailChange.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>

      {/* My Change Requests Modal */}
      <MyChangeRequestsModal
        visible={showMyRequestsModal}
        onClose={() => setShowMyRequestsModal(false)}
        onRefresh={() => fetchMyRequests()}
      />

      {/* Education Modal */}
      <EducationModal
        visible={showEducationModal}
        onClose={() => setShowEducationModal(false)}
        onSave={handleSaveEducation}
        education={editingEducationIndex !== null ? (currentUserProfile?.education || currentUserProfile?.qualifications || [])[editingEducationIndex] : null}
        loading={savingEducation}
      />

      {/* Experience Modal */}
      <ExperienceModal
        visible={showExperienceModal}
        onClose={() => setShowExperienceModal(false)}
        onSave={handleSaveExperience}
        experience={editingExperienceIndex !== null ? (currentUserProfile?.experience || [])[editingExperienceIndex] : null}
        loading={savingExperience}
      />

      {/* Family Modal */}
      <FamilyModal
        visible={showFamilyModal}
        onClose={() => setShowFamilyModal(false)}
        onSave={handleSaveFamily}
        family={editingFamilyIndex !== null ? (currentUserProfile?.family || [])[editingFamilyIndex] : null}
        loading={savingFamily}
      />
    </>
  );
};

export default ProfilePage;

// Add inline styles for UI improvements and skeleton loaders
const styles = `
  <style>
    /* ============================================
       SKELETON LOADER STYLES (Merged from ProfileSkeletonLoaders.css)
       ============================================ */

    .skeleton-loader {
      background: linear-gradient(
        90deg,
        #f0f0f0 0%,
        #f8f8f8 20%,
        #f0f0f0 40%,
        #f0f0f0 100%
      );
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s ease-in-out infinite;
      border-radius: 4px;
      display: block;
    }

    .skeleton-loader.rounded-circle {
      border-radius: 50% !important;
    }

    @keyframes skeleton-loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .skeleton-loader {
        background: linear-gradient(
          90deg,
          #2a2a2a 0%,
          #353535 20%,
          #2a2a2a 40%,
          #2a2a2a 100%
        );
      }
    }

    /* ============================================
       TAB NAVIGATION STYLING
       ============================================ */

    /* Tab Navigation Styling - Modern solid tabs */
    .nav-tabs-bottom-solid {
      border-bottom: 2px solid #e9ecef;
    }

    .nav-tabs-bottom-solid .nav-link {
      border: none;
      border-bottom: 2px solid transparent;
      color: #6c757d;
      padding: 12px 20px;
      margin-bottom: -2px;
      transition: all 0.3s ease;
      background: transparent;
      font-weight: 500;
    }

    .nav-tabs-bottom-solid .nav-link:hover {
      color: #495057;
      background-color: #f8f9fa;
      border-bottom-color: transparent;
    }

    .nav-tabs-bottom-solid .nav-link.active {
      color: #6366f1;
      border-bottom-color: #6366f1;
      font-weight: 600;
      background-color: transparent;
    }

    .nav-tabs-bottom-solid .nav-link i {
      font-size: 16px;
    }

    /* ============================================
       CARD STYLING
       ============================================ */

    /* Card Styling - Consistent borders and shadows */
    .card {
      border: 1px solid #e9ecef;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      padding: 1rem 1.25rem;
      border-radius: 8px 8px 0 0;
    }

    .card-header h5 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0;
      color: #1f2937;
    }

    .card-body {
      padding: 1.25rem;
    }

    /* ============================================
       TIMELINE DESIGN
       ============================================ */

    /* Timeline Design - Professional vertical timeline */
    .timeline {
      position: relative;
      padding-left: 30px;
    }

    .timeline:before {
      content: '';
      position: absolute;
      left: 10px;
      top: 5px;
      bottom: 5px;
      width: 2px;
      background: #e9ecef;
    }

    .timeline-item {
      position: relative;
      padding-bottom: 20px;
    }

    .timeline-badge {
      position: absolute;
      left: -23px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      border: 3px solid #fff;
      box-shadow: 0 0 0 1px #e9ecef;
      z-index: 1;
    }

    .timeline-text {
      flex-grow: 1;
    }

    /* ============================================
       AVATAR & IMAGES
       ============================================ */

    /* Avatar Styling */
    .avatar-placeholder {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .avatar-edit-icon .btn {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    /* ============================================
       EMPTY STATES
       ============================================ */

    /* Empty State Styling */
    .text-center.py-5 i {
      opacity: 0.5;
    }

    .text-center.py-5 h6 {
      color: #374151;
      font-weight: 600;
      margin-top: 1rem;
    }

    /* ============================================
       BUTTONS
       ============================================ */

    /* Button Styling */
    .btn-primary {
      background-color: #6366f1;
      border-color: #6366f1;
    }

    .btn-primary:hover {
      background-color: #5558e3;
      border-color: #5558e3;
    }

    .btn-outline-primary {
      color: #6366f1;
      border-color: #6366f1;
    }

    .btn-outline-primary:hover {
      background-color: #6366f1;
      border-color: #6366f1;
      color: #fff;
    }

    /* ============================================
       BADGES
       ============================================ */

    /* Badge Styling */
    .badge {
      padding: 0.375rem 0.75rem;
      font-weight: 500;
      border-radius: 6px;
    }

    .badge.bg-success {
      background-color: #10b981 !important;
    }

    .badge.bg-danger {
      background-color: #ef4444 !important;
    }

    .badge.bg-warning {
      background-color: #f59e0b !important;
    }

    .badge.bg-info {
      background-color: #3b82f6 !important;
    }

    /* Skills Badge */
    .badge.bg-light {
      background-color: #f3f4f6 !important;
      color: #374151 !important;
      border: 1px solid #e5e7eb;
    }

    /* ============================================
       FORMS
       ============================================ */

    /* Form Styling */
    .form-control:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 0.2rem rgba(99, 102, 241, 0.25);
    }

    .form-label {
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    /* ============================================
       ALERTS
       ============================================ */

    /* Alert Styling */
    .alert {
      border-radius: 8px;
      border-left-width: 4px;
    }

    .alert-warning {
      background-color: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }

    .alert-danger {
      background-color: #fee2e2;
      border-color: #ef4444;
      color: #991b1b;
    }

    .alert-success {
      background-color: #d1fae5;
      border-color: #10b981;
      color: #065f46;
    }

    /* ============================================
       ANIMATIONS
       ============================================ */

    /* Content Fade-in Animation */
    .tab-content > * {
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* ============================================
       BREADCRUMB
       ============================================ */

    /* Page Breadcrumb */
    .page-breadcrumb h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: #1f2937;
    }

    .breadcrumb {
      background: transparent;
      padding: 0;
      margin: 0;
    }

    .breadcrumb-item {
      color: #6c757d;
    }

    .breadcrumb-item.active {
      color: #6366f1;
    }

    /* ============================================
       TEXT UTILITIES
       ============================================ */

    /* Info Row Styling */
    .text-muted {
      color: #6c757d !important;
    }

    .fw-medium {
      font-weight: 500 !important;
      color: #374151;
    }

    /* ============================================
       RESPONSIVE DESIGN
       ============================================ */

    /* Responsive Design */
    @media (max-width: 768px) {
      .nav-tabs-bottom-solid .nav-link {
        padding: 10px 15px;
        font-size: 14px;
      }

      .card-header h5 {
        font-size: 1rem;
      }

      .page-breadcrumb h2 {
        font-size: 1.5rem;
      }
    }

    /* ============================================
       LOADING STATES
       ============================================ */

    /* Loading State Improvements */
    .spinner-border {
      border-width: 2px;
    }

    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
      border-width: 2px;
    }

    /* ============================================
       MODALS
       ============================================ */

    /* Modal Improvements */
    .modal-content {
      border-radius: 12px;
      border: none;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .modal-header {
      border-bottom: 1px solid #e9ecef;
      padding: 1.25rem 1.5rem;
      background-color: #f8f9fa;
      border-radius: 12px 12px 0 0;
    }

    .modal-title {
      font-weight: 600;
      color: #1f2937;
    }

    .modal-body {
      padding: 1.5rem;
    }

    /* ============================================
       INPUT GROUPS
       ============================================ */

    /* Input Group Styling */
    .input-group .btn-outline-secondary {
      border-color: #ced4da;
      color: #6c757d;
    }

    .input-group .btn-outline-secondary:hover {
      background-color: #e9ecef;
      border-color: #adb5bd;
      color: #495057;
    }
  </style>
`;

// Append styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('div');
  styleElement.innerHTML = styles;
  document.head.appendChild(styleElement.firstChild as Node);
}
