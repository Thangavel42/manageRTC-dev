/**
 * Admin Profile Page (v2)
 * 3-tab layout: My Details | Company Info | Subscription
 * Three-tier field access:
 *   Tier 1 (Direct Edit): phone, phone2, fax, website, description, social links, logo
 *   Tier 2 (Read-Only): name, email, domain, status, plan, subscription, system fields
 *   Tier 3 (Request to Edit): registration/legal, industry/classification, contact person, founder, address, billing
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Footer from '../../../core/common/footer';
import { all_routes } from '../../router/all_routes';
import { useAdminProfileREST, type AdminProfile } from '../../../hooks/useAdminProfileREST';
import { useCompanyChangeRequestREST } from '../../../hooks/useCompanyChangeRequestREST';

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loaders
// ─────────────────────────────────────────────────────────────────────────────

const ProfileHeaderSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      <div className="d-flex align-items-center">
        <div className="me-3">
          <div className="skeleton-loader rounded-circle" style={{ width: '100px', height: '100px', background: '#e9ecef' }} />
        </div>
        <div className="flex-grow-1">
          <div className="skeleton-loader mb-2" style={{ width: '200px', height: '24px', background: '#e9ecef', borderRadius: '4px' }} />
          <div className="skeleton-loader mb-2" style={{ width: '300px', height: '16px', background: '#e9ecef', borderRadius: '4px' }} />
          <div className="skeleton-loader" style={{ width: '150px', height: '16px', background: '#e9ecef', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  </div>
);

const SectionSkeleton = () => (
  <div className="card mb-3">
    <div className="card-body">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="row mb-3">
          <div className="col-md-4">
            <div className="skeleton-loader" style={{ width: '80%', height: '16px', background: '#e9ecef', borderRadius: '4px' }} />
          </div>
          <div className="col-md-8">
            <div className="skeleton-loader" style={{ width: '60%', height: '16px', background: '#e9ecef', borderRadius: '4px' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Tier Badge Component
// ─────────────────────────────────────────────────────────────────────────────

const TierBadge = ({ tier }: { tier: 'edit' | 'readonly' | 'request' }) => {
  if (tier === 'edit') return null; // No badge for directly editable
  if (tier === 'readonly') {
    return <span className="badge bg-secondary ms-2" style={{ fontSize: '10px' }}>Read-Only</span>;
  }
  return <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '10px' }}>Request to Edit</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Field Row Component
// ─────────────────────────────────────────────────────────────────────────────

const FieldRow = ({ label, value, tier }: { label: string; value: React.ReactNode; tier?: 'edit' | 'readonly' | 'request' }) => (
  <div className="row mb-3">
    <div className="col-md-4">
      <span className="text-muted fw-medium">
        {label}
        {tier && <TierBadge tier={tier} />}
      </span>
    </div>
    <div className="col-md-8">
      <span className="fw-medium">{value || <span className="text-muted">N/A</span>}</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminProfilePage = () => {
  const route = all_routes;
  const { profile, loading, updating, fetchAdminProfile, updateAdminProfile } = useAdminProfileREST();
  const {
    myRequests,
    loading: crLoading,
    submitChangeRequest,
    fetchMyRequests,
    hasPendingRequestForField
  } = useCompanyChangeRequestREST();

  // Tab state
  const [activeTab, setActiveTab] = useState<'details' | 'company' | 'subscription'>('details');

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    phone2: '',
    fax: '',
    website: '',
    description: '',
    companyLogo: '',
    social: { linkedin: '', twitter: '', facebook: '', instagram: '' }
  });

  // Change Request modal state
  const [showChangeRequestModal, setShowChangeRequestModal] = useState(false);
  const [changeRequestFields, setChangeRequestFields] = useState<Array<{ field: string; label: string; newValue: string }>>([]);
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [changeRequestType, setChangeRequestType] = useState<string>('billing');

  // Image upload
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load data on mount
  useEffect(() => {
    fetchAdminProfile();
    fetchMyRequests();
  }, []);

  // Sync form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        phone2: profile.phone2 || '',
        fax: profile.fax || '',
        website: profile.website || '',
        description: profile.description || '',
        companyLogo: profile.companyLogo || '',
        social: {
          linkedin: profile.social?.linkedin || '',
          twitter: profile.social?.twitter || '',
          facebook: profile.social?.facebook || '',
          instagram: profile.social?.instagram || ''
        }
      });
    }
  }, [profile]);

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      social: { ...prev.social, [name]: value }
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 4MB.');
      event.target.value = '';
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/ico'].includes(file.type)) {
      toast.error('Please upload image file only (JPG, JPEG, PNG).');
      event.target.value = '';
      return;
    }

    setImageUpload(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', 'amasqis');

      const res = await fetch('https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload', {
        method: 'POST',
        body: fd
      });

      if (!res.ok) throw new Error('Image upload failed');
      const data = await res.json();
      setFormData(prev => ({ ...prev, companyLogo: data.secure_url }));
      toast.success('Image uploaded successfully!');
    } catch {
      toast.error('Failed to upload image. Please try again.');
      event.target.value = '';
    } finally {
      setImageUpload(false);
    }
  };

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        phone2: profile.phone2 || '',
        fax: profile.fax || '',
        website: profile.website || '',
        description: profile.description || '',
        companyLogo: profile.companyLogo || '',
        social: {
          linkedin: profile.social?.linkedin || '',
          twitter: profile.social?.twitter || '',
          facebook: profile.social?.facebook || '',
          instagram: profile.social?.instagram || ''
        }
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateAdminProfile({
      phone: formData.phone,
      phone2: formData.phone2,
      fax: formData.fax,
      website: formData.website,
      description: formData.description,
      social: formData.social,
      companyLogo: formData.companyLogo,
      profilePhoto: formData.companyLogo
    });
    if (success) {
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    }
  };

  // ─── Change Request Handlers ────────────────────────────────────────

  const openChangeRequestModal = (type: string, fields: Array<{ field: string; label: string; currentValue: string }>) => {
    setChangeRequestType(type);
    setChangeRequestFields(fields.map(f => ({ field: f.field, label: f.label, newValue: f.currentValue })));
    setChangeRequestReason('');
    setShowChangeRequestModal(true);
  };

  const handleSubmitChangeRequest = async () => {
    if (!changeRequestReason || changeRequestReason.trim().length < 5) {
      toast.error('Please provide a reason (minimum 5 characters)');
      return;
    }

    const fieldsToSubmit = changeRequestFields.filter(f => f.newValue !== undefined);
    if (fieldsToSubmit.length === 0) {
      toast.error('Please fill in at least one field to change');
      return;
    }

    const success = await submitChangeRequest({
      requestType: changeRequestType as any,
      fields: fieldsToSubmit,
      reason: changeRequestReason
    });

    if (success) {
      setShowChangeRequestModal(false);
      setChangeRequestFields([]);
      setChangeRequestReason('');
      toast.success('Change request submitted! Superadmin will review it.');
      fetchMyRequests();
    }
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (loading && !profile) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Admin Profile</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item"><Link to={route.adminDashboard}><i className="ti ti-smart-home"></i></Link></li>
                  <li className="breadcrumb-item">Pages</li>
                  <li className="breadcrumb-item active">Profile</li>
                </ol>
              </nav>
            </div>
          </div>
          <ProfileHeaderSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  // ─── Tab: My Details ──────────────────────────────────────────────

  const renderMyDetailsTab = () => {
    if (isEditing) {
      return (
        <form onSubmit={handleSubmit}>
          {/* Logo Upload */}
          <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
            <div
              className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
              style={{ width: '100px', height: '100px' }}
            >
              {formData.companyLogo ? (
                <img src={formData.companyLogo} alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }} />
              ) : imageUpload ? (
                <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Uploading...</span></div>
              ) : profile?.companyLogo ? (
                <img src={profile.companyLogo} alt="Current Logo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }} />
              ) : (
                <i className="ti ti-building text-gray-3 fs-16"></i>
              )}
            </div>
            <div className="profile-upload">
              <div className="mb-2">
                <h6 className="mb-1">Company Logo</h6>
                <p className="fs-12">Recommended: 100px x 100px, max 4MB</p>
              </div>
              <div className="profile-uploader d-flex align-items-center">
                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                  {formData.companyLogo ? 'Change' : 'Upload'}
                  <input type="file" className="form-control image-sign" accept=".png,.jpeg,.jpg,.ico" ref={fileInputRef} onChange={handleImageUpload} />
                </div>
                {formData.companyLogo && (
                  <button type="button" onClick={removeLogo} className="btn btn-light btn-sm">Remove</button>
                )}
              </div>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">Phone</label>
              <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Primary phone" />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Phone 2</label>
              <input type="tel" className="form-control" name="phone2" value={formData.phone2} onChange={handleInputChange} placeholder="Secondary phone" />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Fax</label>
              <input type="text" className="form-control" name="fax" value={formData.fax} onChange={handleInputChange} placeholder="Fax number" />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">Website</label>
              <input type="url" className="form-control" name="website" value={formData.website} onChange={handleInputChange} placeholder="https://example.com" />
            </div>
            <div className="col-md-12 mb-3">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} name="description" value={formData.description} onChange={handleInputChange} placeholder="Company description..." />
            </div>
          </div>

          {/* Social Links */}
          <h6 className="mb-3 mt-2">Social Links</h6>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label"><i className="ti ti-brand-linkedin me-1"></i>LinkedIn</label>
              <input type="url" className="form-control" name="linkedin" value={formData.social.linkedin} onChange={handleSocialChange} placeholder="https://linkedin.com/company/..." />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label"><i className="ti ti-brand-twitter me-1"></i>Twitter</label>
              <input type="url" className="form-control" name="twitter" value={formData.social.twitter} onChange={handleSocialChange} placeholder="https://twitter.com/..." />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label"><i className="ti ti-brand-facebook me-1"></i>Facebook</label>
              <input type="url" className="form-control" name="facebook" value={formData.social.facebook} onChange={handleSocialChange} placeholder="https://facebook.com/..." />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label"><i className="ti ti-brand-instagram me-1"></i>Instagram</label>
              <input type="url" className="form-control" name="instagram" value={formData.social.instagram} onChange={handleSocialChange} placeholder="https://instagram.com/..." />
            </div>
          </div>

          {/* Actions */}
          <div className="d-flex align-items-center justify-content-end gap-2 mt-3">
            <button type="button" className="btn btn-light" onClick={handleCancel}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={updating}>
              {updating ? (
                <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Saving...</>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      );
    }

    // View mode
    return (
      <>
        {/* Admin Account */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">Admin Account</h6>
          <button type="button" className="btn btn-sm btn-primary" onClick={handleEdit}>
            <i className="ti ti-edit me-1"></i>Edit
          </button>
        </div>
        <div className="border-bottom mb-4 pb-3">
          <FieldRow label="Admin Name" value={profile?.admin?.adminName} />
          <FieldRow label="Admin Email" value={profile?.admin?.adminEmail} />
          <FieldRow label="Role" value={<span className="text-capitalize">{profile?.admin?.adminRole || 'admin'}</span>} />
        </div>

        {/* Contact Info (Tier 1) */}
        <h6 className="mb-3">Contact Information</h6>
        <div className="border-bottom mb-4 pb-3">
          <FieldRow label="Email" value={profile?.email} />
          <FieldRow label="Phone" value={profile?.phone} tier="edit" />
          <FieldRow label="Phone 2" value={profile?.phone2} tier="edit" />
          <FieldRow label="Fax" value={profile?.fax} tier="edit" />
          <FieldRow label="Website" value={
            profile?.website ? (
              <a href={profile.website} target="_blank" rel="noopener noreferrer">
                {profile.website} <i className="ti ti-external-link ms-1"></i>
              </a>
            ) : null
          } tier="edit" />
          <FieldRow label="Domain" value={profile?.domain} />
          <FieldRow label="Description" value={profile?.description} tier="edit" />
        </div>

        {/* Social Links (Tier 1) */}
        <h6 className="mb-3">Social Links</h6>
        <div className="border-bottom mb-4 pb-3">
          <FieldRow label="LinkedIn" value={profile?.social?.linkedin ? <a href={profile.social.linkedin} target="_blank" rel="noopener noreferrer">{profile.social.linkedin}</a> : null} tier="edit" />
          <FieldRow label="Twitter" value={profile?.social?.twitter ? <a href={profile.social.twitter} target="_blank" rel="noopener noreferrer">{profile.social.twitter}</a> : null} tier="edit" />
          <FieldRow label="Facebook" value={profile?.social?.facebook ? <a href={profile.social.facebook} target="_blank" rel="noopener noreferrer">{profile.social.facebook}</a> : null} tier="edit" />
          <FieldRow label="Instagram" value={profile?.social?.instagram ? <a href={profile.social.instagram} target="_blank" rel="noopener noreferrer">{profile.social.instagram}</a> : null} tier="edit" />
        </div>

        {/* Stats */}
        <h6 className="mb-3">Statistics</h6>
        <div className="row">
          <div className="col-md-4 mb-3">
            <div className="card bg-light mb-0">
              <div className="card-body text-center py-3">
                <h3 className="mb-1">{profile?.employeeCount ?? 0}</h3>
                <small className="text-muted">Total Employees</small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="card bg-light mb-0">
              <div className="card-body text-center py-3">
                <h3 className="mb-1">{profile?.userCount ?? 0}</h3>
                <small className="text-muted">User Count</small>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div className="card bg-light mb-0">
              <div className="card-body text-center py-3">
                <span className={`badge ${profile?.status === 'Active' ? 'bg-success' : 'bg-warning'} fs-14`}>
                  {profile?.status || 'Unknown'}
                </span>
                <br />
                <small className="text-muted">Company Status</small>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─── Tab: Company Info ─────────────────────────────────────────────

  const renderCompanyInfoTab = () => (
    <>
      {/* Registration & Legal (Tier 3 - Request to Edit) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Registration & Legal</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => openChangeRequestModal('legal', [
            { field: 'legalName', label: 'Legal Name', currentValue: profile?.legalName || '' },
            { field: 'registrationNumber', label: 'Registration Number', currentValue: profile?.registrationNumber || '' },
            { field: 'taxId', label: 'Tax ID', currentValue: profile?.taxId || '' },
            { field: 'taxIdType', label: 'Tax ID Type', currentValue: profile?.taxIdType || '' },
            { field: 'legalEntityType', label: 'Legal Entity Type', currentValue: profile?.legalEntityType || '' },
            { field: 'incorporationCountry', label: 'Incorporation Country', currentValue: profile?.incorporationCountry || '' },
          ])}
        >
          <i className="ti ti-edit me-1"></i>Request to Edit
        </button>
      </div>
      <div className="border-bottom mb-4 pb-3">
        <FieldRow label="Legal Name" value={profile?.legalName} tier="request" />
        <FieldRow label="Registration Number" value={profile?.registrationNumber} tier="request" />
        <FieldRow label="Tax ID" value={profile?.taxId} tier="request" />
        <FieldRow label="Tax ID Type" value={profile?.taxIdType} tier="request" />
        <FieldRow label="Legal Entity Type" value={profile?.legalEntityType} tier="request" />
        <FieldRow label="Incorporation Country" value={profile?.incorporationCountry} tier="request" />
        {(hasPendingRequestForField('legalName') || hasPendingRequestForField('taxId') || hasPendingRequestForField('registrationNumber')) && (
          <small className="text-warning d-block mt-2">
            <i className="ti ti-clock me-1"></i>Some fields in this section have pending change requests
          </small>
        )}
      </div>

      {/* Industry & Classification (Tier 3 - Request to Edit) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Industry & Classification</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => openChangeRequestModal('classification', [
            { field: 'industry', label: 'Industry', currentValue: profile?.industry || '' },
            { field: 'subIndustry', label: 'Sub-Industry', currentValue: profile?.subIndustry || '' },
            { field: 'companySize', label: 'Company Size', currentValue: profile?.companySize || '' },
            { field: 'companyType', label: 'Company Type', currentValue: profile?.companyType || '' },
          ])}
        >
          <i className="ti ti-edit me-1"></i>Request to Edit
        </button>
      </div>
      <div className="border-bottom mb-4 pb-3">
        <FieldRow label="Industry" value={profile?.industry} tier="request" />
        <FieldRow label="Sub-Industry" value={profile?.subIndustry} tier="request" />
        <FieldRow label="Company Size" value={profile?.companySize} tier="request" />
        <FieldRow label="Company Type" value={profile?.companyType} tier="request" />
        {(hasPendingRequestForField('industry') || hasPendingRequestForField('companySize')) && (
          <small className="text-warning d-block mt-2">
            <i className="ti ti-clock me-1"></i>Some fields in this section have pending change requests
          </small>
        )}
      </div>

      {/* Contact Person & Founder (Tier 3 - Request to Edit) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Contact Person</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => openChangeRequestModal('contact', [
            { field: 'contactPerson.name', label: 'Contact Person Name', currentValue: profile?.contactPerson?.name || '' },
            { field: 'contactPerson.email', label: 'Contact Person Email', currentValue: profile?.contactPerson?.email || '' },
            { field: 'contactPerson.phone', label: 'Contact Person Phone', currentValue: profile?.contactPerson?.phone || '' },
            { field: 'contactPerson.designation', label: 'Contact Person Designation', currentValue: profile?.contactPerson?.designation || '' },
            { field: 'founderName', label: 'Founder / CEO Name', currentValue: profile?.founderName || '' },
          ])}
        >
          <i className="ti ti-edit me-1"></i>Request to Edit
        </button>
      </div>
      <div className="border-bottom mb-4 pb-3">
        <FieldRow label="Name" value={profile?.contactPerson?.name} tier="request" />
        <FieldRow label="Email" value={profile?.contactPerson?.email} tier="request" />
        <FieldRow label="Phone" value={profile?.contactPerson?.phone} tier="request" />
        <FieldRow label="Designation" value={profile?.contactPerson?.designation} tier="request" />
        <FieldRow label="Founder / CEO" value={profile?.founderName} tier="request" />
        {(hasPendingRequestForField('contactPerson.name') || hasPendingRequestForField('founderName')) && (
          <small className="text-warning d-block mt-2">
            <i className="ti ti-clock me-1"></i>Some fields in this section have pending change requests
          </small>
        )}
      </div>

      {/* Address (Tier 3 - Request to Edit) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Address</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => openChangeRequestModal('address', [
            { field: 'address', label: 'Address', currentValue: profile?.address || '' },
            { field: 'structuredAddress.street', label: 'Street', currentValue: profile?.structuredAddress?.street || '' },
            { field: 'structuredAddress.city', label: 'City', currentValue: profile?.structuredAddress?.city || '' },
            { field: 'structuredAddress.state', label: 'State', currentValue: profile?.structuredAddress?.state || '' },
            { field: 'structuredAddress.postalCode', label: 'Postal Code', currentValue: profile?.structuredAddress?.postalCode || '' },
            { field: 'structuredAddress.country', label: 'Country', currentValue: profile?.structuredAddress?.country || '' },
          ])}
        >
          <i className="ti ti-edit me-1"></i>Request to Edit
        </button>
      </div>
      <div className="border-bottom mb-4 pb-3">
        <FieldRow label="Address" value={profile?.address} tier="request" />
        {profile?.structuredAddress && (
          <>
            <FieldRow label="Street" value={profile.structuredAddress.street} tier="request" />
            <FieldRow label="City" value={profile.structuredAddress.city} tier="request" />
            <FieldRow label="State" value={profile.structuredAddress.state} tier="request" />
            <FieldRow label="Postal Code" value={profile.structuredAddress.postalCode} tier="request" />
            <FieldRow label="Country" value={profile.structuredAddress.country} tier="request" />
          </>
        )}
      </div>

      {/* Billing (Tier 3 - Request to Edit) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Billing Information</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-warning"
          onClick={() => openChangeRequestModal('billing', [
            { field: 'billingEmail', label: 'Billing Email', currentValue: profile?.billingEmail || '' },
            { field: 'billingAddress.street', label: 'Billing Street', currentValue: profile?.billingAddress?.street || '' },
            { field: 'billingAddress.city', label: 'Billing City', currentValue: profile?.billingAddress?.city || '' },
            { field: 'billingAddress.state', label: 'Billing State', currentValue: profile?.billingAddress?.state || '' },
            { field: 'billingAddress.postalCode', label: 'Billing Postal Code', currentValue: profile?.billingAddress?.postalCode || '' },
            { field: 'billingAddress.country', label: 'Billing Country', currentValue: profile?.billingAddress?.country || '' },
          ])}
        >
          <i className="ti ti-edit me-1"></i>Request to Edit
        </button>
      </div>
      <div className="mb-3">
        <FieldRow label="Billing Email" value={profile?.billingEmail} tier="request" />
        {profile?.billingAddress && (
          <>
            <FieldRow label="Street" value={profile.billingAddress.street} tier="request" />
            <FieldRow label="City" value={profile.billingAddress.city} tier="request" />
            <FieldRow label="State" value={profile.billingAddress.state} tier="request" />
            <FieldRow label="Postal Code" value={profile.billingAddress.postalCode} tier="request" />
            <FieldRow label="Country" value={profile.billingAddress.country} tier="request" />
          </>
        )}
      </div>

      {/* My Change Requests */}
      {myRequests.length > 0 && (
        <div className="mt-4">
          <h6 className="mb-3">My Change Requests</h6>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Type</th>
                  <th>Fields</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.slice(0, 10).map((req) => (
                  <tr key={req._id}>
                    <td><span className="text-capitalize">{req.requestType}</span></td>
                    <td>
                      {req.fields?.map((f, i) => (
                        <span key={i} className="badge bg-light text-dark me-1 mb-1">{f.label}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`badge ${
                        req.status === 'pending' ? 'bg-warning text-dark' :
                        req.status === 'completed' ? 'bg-success' :
                        req.status === 'cancelled' ? 'bg-secondary' :
                        'bg-info'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td>{req.createdAt ? new Date(req.createdAt as string).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );

  // ─── Tab: Subscription ─────────────────────────────────────────────

  const renderSubscriptionTab = () => {
    const sub = profile?.subscription;
    if (!sub) {
      return (
        <div className="text-center py-5">
          <i className="ti ti-package-off fs-1 text-muted d-block mb-3"></i>
          <h5 className="text-muted">No Active Subscription</h5>
          <p className="text-muted">Contact your superadmin for subscription details.</p>
        </div>
      );
    }

    const usagePercent = sub.userLimit > 0 ? Math.min((sub.currentUsers / sub.userLimit) * 100, 100) : 0;

    return (
      <>
        {/* Plan Overview Card */}
        <div className="card bg-light mb-4">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-3 text-center border-end">
                <i className="ti ti-crown fs-1 text-primary d-block mb-2"></i>
                <h5 className="mb-0">{sub.planName || 'Unknown Plan'}</h5>
                <small className="text-muted">Current Plan</small>
              </div>
              <div className="col-md-3 text-center border-end">
                <h3 className="mb-0 text-primary">{sub.currentUsers}</h3>
                <small className="text-muted">of {sub.userLimit} Users</small>
              </div>
              <div className="col-md-3 text-center border-end">
                <span className={`badge ${sub.status === 'Active' ? 'bg-success' : sub.status === 'Trial' ? 'bg-info' : 'bg-warning'} fs-14`}>
                  {sub.status}
                </span>
                <br />
                <small className="text-muted">Subscription Status</small>
              </div>
              <div className="col-md-3 text-center">
                <h5 className="mb-0">
                  {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : 'N/A'}
                </h5>
                <small className="text-muted">Renewal Date</small>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <h6 className="mb-3">User Usage</h6>
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between mb-2">
              <span>Users: {sub.currentUsers} / {sub.userLimit}</span>
              <span>{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="progress" style={{ height: '10px' }}>
              <div
                className={`progress-bar ${usagePercent > 90 ? 'bg-danger' : usagePercent > 70 ? 'bg-warning' : 'bg-primary'}`}
                role="progressbar"
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
            {usagePercent > 90 && (
              <small className="text-danger mt-2 d-block">
                <i className="ti ti-alert-triangle me-1"></i>
                You are approaching the user limit. Consider upgrading your plan.
              </small>
            )}
          </div>
        </div>

        {/* Subscription Details */}
        <h6 className="mb-3">Subscription Details</h6>
        <div className="card">
          <div className="card-body">
            <FieldRow label="Plan Name" value={sub.planName} />
            <FieldRow label="Plan ID" value={sub.planId} />
            <FieldRow label="User Limit" value={String(sub.userLimit)} />
            <FieldRow label="Current Users" value={String(sub.currentUsers)} />
            <FieldRow label="Status" value={
              <span className={`badge ${sub.status === 'Active' ? 'bg-success' : 'bg-warning'}`}>{sub.status}</span>
            } />
            <FieldRow label="Renewal Date" value={sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : 'N/A'} />
          </div>
        </div>
      </>
    );
  };

  // ─── Main Render ────────────────────────────────────────────────

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Admin Profile</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={route.adminDashboard}><i className="ti ti-smart-home"></i></Link>
                  </li>
                  <li className="breadcrumb-item">Pages</li>
                  <li className="breadcrumb-item active" aria-current="page">Profile</li>
                </ol>
              </nav>
            </div>
            <div className="head-icons ms-2">
              <CollapseHeader />
            </div>
          </div>

          {/* Profile Header */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center flex-wrap">
                <div
                  className="avatar avatar-xxl rounded-circle me-3 flex-shrink-0"
                  style={{
                    width: '100px', height: '100px',
                    backgroundColor: '#f8f9fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  {profile?.companyLogo ? (
                    <img src={profile.companyLogo} alt={profile.companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="ti ti-building text-gray-3 fs-16"></i>
                  )}
                </div>
                <div className="flex-grow-1">
                  <h3 className="mb-1">{profile?.companyName || 'Company'}</h3>
                  <p className="text-muted mb-1">{profile?.domain || 'No domain configured'}</p>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className={`badge ${profile?.status === 'Active' ? 'bg-success' : 'bg-warning'}`}>
                      {profile?.status || 'Unknown'}
                    </span>
                    <span className="badge bg-info">Admin</span>
                    {profile?.createdAt && (
                      <small className="text-muted">Member since {new Date(profile.createdAt).toLocaleDateString()}</small>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="card">
            <div className="card-header">
              <ul className="nav nav-tabs nav-tabs-solid nav-tabs-rounded-fill" role="tablist">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('details'); setIsEditing(false); }}
                  >
                    <i className="ti ti-user me-1"></i>My Details
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'company' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('company'); setIsEditing(false); }}
                  >
                    <i className="ti ti-building me-1"></i>Company Info
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === 'subscription' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('subscription'); setIsEditing(false); }}
                  >
                    <i className="ti ti-crown me-1"></i>Subscription
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === 'details' && renderMyDetailsTab()}
              {activeTab === 'company' && renderCompanyInfoTab()}
              {activeTab === 'subscription' && renderSubscriptionTab()}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Change Request Modal */}
      {showChangeRequestModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="ti ti-edit me-2"></i>
                  Request to Edit - {changeRequestType.charAt(0).toUpperCase() + changeRequestType.slice(1)}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowChangeRequestModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info mb-3">
                  <i className="ti ti-info-circle me-2"></i>
                  These fields require superadmin approval. Fill in the new values you want and provide a reason for the change.
                </div>
                {changeRequestFields.map((field, idx) => (
                  <div className="mb-3" key={field.field}>
                    <label className="form-label">{field.label}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={field.newValue}
                      onChange={(e) => {
                        const updated = [...changeRequestFields];
                        updated[idx] = { ...updated[idx], newValue: e.target.value };
                        setChangeRequestFields(updated);
                      }}
                      placeholder={`Enter new ${field.label.toLowerCase()}`}
                    />
                    {hasPendingRequestForField(field.field) && (
                      <small className="text-warning">
                        <i className="ti ti-clock me-1"></i>A pending request already exists for this field
                      </small>
                    )}
                  </div>
                ))}
                <div className="mb-3">
                  <label className="form-label">Reason for Change <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={changeRequestReason}
                    onChange={(e) => setChangeRequestReason(e.target.value)}
                    placeholder="Explain why these changes are needed (minimum 5 characters)"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setShowChangeRequestModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitChangeRequest}
                  disabled={crLoading}
                >
                  {crLoading ? (
                    <><span className="spinner-border spinner-border-sm me-2"></span>Submitting...</>
                  ) : (
                    <><i className="ti ti-send me-1"></i>Submit Request</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
};

export default AdminProfilePage;
