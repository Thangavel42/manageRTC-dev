/**
 * Admin Profile Page
 * Displays company information and settings for admin users
 * This is a separate page from the regular employee profile
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Footer from '../../../core/common/footer';
import { all_routes } from '../../router/all_routes';
import { get, put, handleApiError } from '../../../services/api';

interface AdminProfile {
  // Company Information
  companyId: string;
  companyName: string;
  companyLogo: string;
  domain: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  description: string;
  status: string;
  createdAt: string | null;

  // Subscription Information
  subscription: {
    planId?: string;
    planName?: string;
    userLimit: number;
    currentUsers: number;
    renewalDate?: string | null;
    status?: string;
  } | null;

  // Admin User Information
  admin: {
    adminName: string;
    adminEmail: string;
    adminRole: string;
  };

  // For compatibility
  _id: string;
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  profilePhoto: string;
  designation: string;
  bio: string;
}

const AdminProfilePage = () => {
  const route = all_routes;

  // State
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    phone: '',
    website: '',
    description: '',
    companyLogo: ''
  });

  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load admin profile on mount
  useEffect(() => {
    fetchAdminProfile();
  }, []);

  // Fetch admin profile
  const fetchAdminProfile = async () => {
    setLoading(true);
    try {
      const response = await get<AdminProfile>('/user-profile/admin');

      if (response.success && response.data) {
        setAdminProfile(response.data);
        // Initialize form data
        setFormData({
          phone: response.data.phone || '',
          website: response.data.website || '',
          description: response.data.description || '',
          companyLogo: response.data.companyLogo || ''
        });
      } else {
        toast.error('Failed to load admin profile');
      }
    } catch (error) {
      const errorMsg = handleApiError(error);
      toast.error(`Error loading profile: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024; // 4MB
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'amasqis');

      const res = await fetch(
        'https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload',
        { method: 'POST', body: formData }
      );

      if (!res.ok) {
        throw new Error('Image upload failed');
      }

      const data = await res.json();
      setFormData(prev => ({ ...prev, companyLogo: data.secure_url }));
      setImageUpload(false);
      toast.success('Image uploaded successfully!');
    } catch (error) {
      setImageUpload(false);
      toast.error('Failed to upload image. Please try again.');
      event.target.value = '';
    }
  };

  // Remove uploaded logo
  const removeLogo = () => {
    setFormData(prev => ({ ...prev, companyLogo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Enable edit mode
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    if (adminProfile) {
      setFormData({
        phone: adminProfile.phone || '',
        website: adminProfile.website || '',
        description: adminProfile.description || '',
        companyLogo: adminProfile.companyLogo || ''
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const response = await put<AdminProfile>('/user-profile/admin', {
        ...formData,
        about: formData.description, // Alias for description
        profilePhoto: formData.companyLogo // Alias for companyLogo
      });

      if (response.success) {
        toast.success('Company profile updated successfully!');
        setIsEditing(false);
        // Refresh profile data
        await fetchAdminProfile();
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      const errorMsg = handleApiError(error);
      toast.error(`Error updating profile: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !adminProfile) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading admin profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render view mode
  const renderViewMode = () => (
    <div className="admin-profile-view">
      {/* Company Header with Logo */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <div
            className="avatar avatar-xxl rounded-circle me-3"
            style={{
              width: '120px',
              height: '120px',
              flexShrink: 0,
              backgroundColor: '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {adminProfile?.companyLogo ? (
              <img
                src={adminProfile.companyLogo}
                alt={adminProfile.companyName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <i className="ti ti-building text-gray-3 fs-16"></i>
            )}
          </div>
          <div>
            <h3 className="mb-1">{adminProfile?.companyName || 'Company'}</h3>
            <p className="text-muted mb-1">{adminProfile?.domain || 'No domain configured'}</p>
            <p className="mb-0">
              <span className={`badge ${
                adminProfile?.status === 'Active' ? 'bg-success' : 'bg-warning'
              }`}>
                {adminProfile?.status || 'Unknown'}
              </span>
              <span className="badge bg-info ms-2">Admin</span>
            </p>
          </div>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={handleEdit}>
            <i className="ti ti-edit me-2"></i>Edit Profile
          </button>
        </div>
      </div>

      {/* Company Information */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Company Information</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Email</label>
            <p className="mb-0 fw-medium">{adminProfile?.email || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Phone</label>
            <p className="mb-0 fw-medium">{adminProfile?.phone || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Website</label>
            <p className="mb-0 fw-medium">
              {adminProfile?.website ? (
                <a href={adminProfile.website} target="_blank" rel="noopener noreferrer">
                  {adminProfile.website}
                  <i className="ti ti-external-link ms-1"></i>
                </a>
              ) : 'N/A'}
            </p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Domain</label>
            <p className="mb-0 fw-medium">{adminProfile?.domain || 'N/A'}</p>
          </div>
          <div className="col-md-12 mb-3">
            <label className="text-muted small">Description</label>
            <p className="mb-0 fw-medium">
              {adminProfile?.description || adminProfile?.bio || 'No description provided'}
            </p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Created On</label>
            <p className="mb-0 fw-medium">
              {adminProfile?.createdAt ? new Date(adminProfile.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Information */}
      {adminProfile?.subscription && (
        <div className="border-bottom mb-4 pb-4">
          <h6 className="mb-3">Subscription Information</h6>
          <div className="card bg-light">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3 mb-2">
                  <label className="text-muted small">Plan</label>
                  <p className="mb-0 fw-medium">{adminProfile.subscription.planName || 'Unknown'}</p>
                </div>
                <div className="col-md-3 mb-2">
                  <label className="text-muted small">Users</label>
                  <p className="mb-0 fw-medium">
                    {adminProfile.subscription.currentUsers} / {adminProfile.subscription.userLimit}
                  </p>
                </div>
                <div className="col-md-3 mb-2">
                  <label className="text-muted small">Status</label>
                  <p className="mb-0">
                    <span className={`badge ${
                      adminProfile.subscription.status === 'Active' ? 'bg-success' : 'bg-warning'
                    }`}>
                      {adminProfile.subscription.status}
                    </span>
                  </p>
                </div>
                <div className="col-md-3 mb-2">
                  <label className="text-muted small">Renewal Date</label>
                  <p className="mb-0 fw-medium">
                    {adminProfile.subscription.renewalDate
                      ? new Date(adminProfile.subscription.renewalDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {/* User usage bar */}
              <div className="progress mt-2" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{
                    width: `${Math.min(
                      (adminProfile.subscription.currentUsers / adminProfile.subscription.userLimit) * 100,
                      100
                    )}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Account Information */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Admin Account</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Admin Name</label>
            <p className="mb-0 fw-medium">{adminProfile?.admin?.adminName || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Admin Email</label>
            <p className="mb-0 fw-medium">{adminProfile?.admin?.adminEmail || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Role</label>
            <p className="mb-0 fw-medium text-capitalize">{adminProfile?.admin?.adminRole || 'admin'}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <h6 className="mb-3">Quick Actions</h6>
        <div className="d-flex gap-2 flex-wrap">
          <Link to={route.superAdminCompanies} className="btn btn-outline-primary">
            <i className="ti ti-building me-2"></i>Manage Company
          </Link>
          <Link to={route.superAdminPackages} className="btn btn-outline-primary">
            <i className="ti ti-package me-2"></i>Subscription
          </Link>
          <Link to={route.employeeList} className="btn btn-outline-primary">
            <i className="ti ti-users me-2"></i>Employees
          </Link>
        </div>
      </div>
    </div>
  );

  // Render edit mode
  const renderEditMode = () => (
    <form onSubmit={handleSubmit}>
      {/* Company Logo Upload */}
      <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
        <div
          className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
          style={{ width: '100px', height: '100px' }}
        >
          {formData.companyLogo ? (
            <img
              src={formData.companyLogo}
              alt="Company Logo"
              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : imageUpload ? (
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Uploading...</span>
            </div>
          ) : adminProfile?.companyLogo ? (
            <img
              src={adminProfile.companyLogo}
              alt="Current Logo"
              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <i className="ti ti-building text-gray-3 fs-16"></i>
          )}
        </div>
        <div className="profile-upload">
          <div className="mb-2">
            <h6 className="mb-1">Company Logo</h6>
            <p className="fs-12">Recommended image size is 100px x 100px</p>
          </div>
          <div className="profile-uploader d-flex align-items-center">
            <div className="drag-upload-btn btn btn-sm btn-primary me-2">
              {formData.companyLogo ? 'Change' : 'Upload'}
              <input
                type="file"
                className="form-control image-sign"
                accept=".png,.jpeg,.jpg,.ico"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
            {formData.companyLogo && (
              <button
                type="button"
                onClick={removeLogo}
                className="btn btn-light btn-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editable Company Information */}
      <div className="border-bottom mb-3">
        <h6 className="mb-3">Company Information</h6>
        <div className="row">
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Phone</label>
              </div>
              <div className="col-md-8">
                <input
                  type="tel"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter company phone number"
                />
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Website</label>
              </div>
              <div className="col-md-8">
                <input
                  type="url"
                  className="form-control"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>
          <div className="col-md-12">
            <div className="row align-items-start mb-3">
              <div className="col-md-2">
                <label className="form-label mb-md-0">Description</label>
              </div>
              <div className="col-md-10">
                <textarea
                  className="form-control"
                  rows={4}
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter company description..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Read-only Information */}
      <div className="border-bottom mb-3">
        <h6 className="mb-3">Company Details (Read-Only)</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Company Name</label>
            <p className="mb-0 fw-medium">{adminProfile?.companyName || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Domain</label>
            <p className="mb-0 fw-medium">{adminProfile?.domain || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Email</label>
            <p className="mb-0 fw-medium">{adminProfile?.email || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Status</label>
            <p className="mb-0">
              <span className={`badge ${
                adminProfile?.status === 'Active' ? 'bg-success' : 'bg-warning'
              }`}>
                {adminProfile?.status || 'Unknown'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="d-flex align-items-center justify-content-end gap-2 mb-4">
        <button
          type="button"
          className="btn btn-light me-2"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );

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
                    <Link to={route.adminDashboard}>
                      <i className="ti ti-smart-home"></i>
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Pages</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Profile
                  </li>
                </ol>
              </nav>
            </div>
            <div className="head-icons ms-2">
              <CollapseHeader />
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="border-bottom mb-3 pb-3 d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Company Profile</h4>
                {isEditing && (
                  <span className="badge bg-warning text-dark">Edit Mode</span>
                )}
              </div>

              {/* View or Edit Mode */}
              {isEditing ? renderEditMode() : renderViewMode()}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      <ToastContainer />
    </>
  );
};

export default AdminProfilePage;
