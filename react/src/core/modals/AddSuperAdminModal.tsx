/**
 * Add SuperAdmin Modal Component
 * Modal for creating a new Super Admin user
 * Password is auto-generated and sent via email
 */

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { useSuperAdminUsers } from '../../hooks/useSuperAdminUsers';

const DEFAULT_AVATAR = 'assets/img/profiles/profile.png';

interface AddSuperAdminModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddSuperAdminModal: React.FC<AddSuperAdminModalProps> = ({ show, onClose, onSuccess }) => {
  const { createUser, saving } = useSuperAdminUsers();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    address: '',
    avatarUrl: DEFAULT_AVATAR,
  });

  const [errors, setErrors] = useState<any>({});
  const [imageUpload, setImageUpload] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (show) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        gender: '',
        address: '',
        avatarUrl: DEFAULT_AVATAR,
      });
      setErrors({});
      setImageUpload(false);
    }
  }, [show]);

  const validate = () => {
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedFormats = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedFormats.includes(file.type)) {
      toast.error("Please upload image file only (JPG, JPEG, PNG).");
      return;
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB.");
      return;
    }

    setImageUpload(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("upload_preset", "amasqis");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();
      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, avatarUrl: data.secure_url }));
        toast.success("Image uploaded successfully!");
      }
    } catch (error) {
      toast.error("Failed to upload image. Please try again.");
      console.error("Image upload error:", error);
    } finally {
      setImageUpload(false);
    }
  };

  const handleResetImage = () => {
    setFormData((prev) => ({ ...prev, avatarUrl: DEFAULT_AVATAR }));
    toast.info("Profile image reset to default.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const submitData = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      gender: formData.gender,
      address: formData.address.trim() || undefined,
      profileImage: formData.avatarUrl !== DEFAULT_AVATAR ? formData.avatarUrl : undefined,
      sendEmail: true,
    };

    const result = await createUser(submitData);

    if (result.success) {
      onClose();
      if (onSuccess) onSuccess();

      // Show success toast with instructions
      toast.success(
        <div>
          <strong>✅ Super Admin User Created Successfully!</strong>
          <div className="mt-2" style={{ fontSize: '12px' }}>
            <div>📧 Email with credentials has been sent to <strong>{submitData.email}</strong></div>
            <div className="mt-2 p-2" style={{ background: 'rgba(255,255,0,0.1)', borderRadius: '4px' }}>
              <strong>⚠️ Important Instructions:</strong>
              <ul className="mb-0 mt-1" style={{ paddingLeft: '18px' }}>
                <li>User must sign out and sign back in after first login</li>
                <li>This ensures all Super Admin menu items appear correctly</li>
                <li>Use "Refresh Metadata" button if menu items are missing</li>
              </ul>
            </div>
          </div>
        </div>,
        {
          autoClose: 8000,
          closeButton: true,
        }
      );
    } else {
      setErrors({ submit: result.error });
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className={`modal fade ${show ? 'show' : ''}`} id="add_superadmin" tabIndex={-1} aria-labelledby="add_superadmin" aria-hidden="true" style={{ display: show ? 'block' : 'none' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Add Super Admin</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={handleClose} disabled={saving}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {errors.submit && (
                <div className="alert alert-danger" role="alert">
                  {errors.submit}
                </div>
              )}

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">First Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    disabled={saving}
                  />
                  {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Last Name <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    disabled={saving}
                  />
                  {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={saving}
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                <input
                  type="tel"
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={saving}
                  placeholder="+1 234 567 8900"
                />
                {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Gender <span className="text-danger">*</span></label>
                <select
                  className={`form-select ${errors.gender ? 'is-invalid' : ''}`}
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  disabled={saving}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                {errors.gender && <div className="invalid-feedback">{errors.gender}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Address (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={saving}
                  placeholder="Enter full address"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Profile Image (Optional)</label>
                <div className="d-flex align-items-center gap-3">
                  <div className="avatar avatar-xl">
                    <img
                      src={formData.avatarUrl}
                      alt="Profile"
                      className="avatar-img rounded-circle"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleImageUpload}
                      disabled={saving || imageUpload}
                    />
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={saving || imageUpload}
                      >
                        {imageUpload ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1"></span>
                            Uploading...
                          </>
                        ) : (
                          <>
                            <i className="ti ti-upload me-1"></i>
                            Upload Image
                          </>
                        )}
                      </button>
                      {formData.avatarUrl !== DEFAULT_AVATAR && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleResetImage}
                          disabled={saving || imageUpload}
                        >
                          <i className="ti ti-refresh me-1"></i>
                          Reset
                        </button>
                      )}
                    </div>
                    <small className="form-text text-muted d-block mt-1">
                      Allowed formats: JPG, JPEG, PNG (Max 2MB)
                    </small>
                  </div>
                </div>
              </div>

              <div className="alert alert-info mb-0" role="alert">
                <strong>Note:</strong>
                <ul className="mb-0 mt-2">
                  <li>A secure password will be auto-generated and sent to the user's email</li>
                  <li>The user will be created with <strong>Super Admin</strong> role</li>
                  <li>They will have full system access after signing in</li>
                  <li className="text-warning"><strong>⚠️ Important:</strong> After the user signs in for the first time, they should <strong>sign out and sign back in</strong> to see all Super Admin menu items</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={handleClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creating...
                  </>
                ) : (
                  'Create Super Admin'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSuperAdminModal;
