import { message } from 'antd';
import React, { useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useClientsREST } from '../../../hooks/useClientsREST';

interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  logo: string;
  status: 'Active' | 'Inactive';
  contractValue: number;
  socialLinks: {
    instagram: string;
    facebook: string;
    linkedin: string;
    whatsapp: string;
  };
}

interface ClientFormErrors {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logo?: string;
  status?: string;
  contractValue?: string;
  projects?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  whatsapp?: string;
}

const AddClient = () => {
  const { createClient } = useClientsREST();
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    logo: '',
    status: 'Active',
    contractValue: 0,
    socialLinks: {
      instagram: '',
      facebook: '',
      linkedin: '',
      whatsapp: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<string | null>(null);
  const [imageUpload, setImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clear a specific field error
  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  // Cloudinary image upload function
  const uploadImage = async (file: File) => {
    setLogo(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'amasqis');

    const res = await fetch('https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    console.log(data);
    return data.secure_url;
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 4MB.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = '';
      return;
    }

    if (file && ['image/jpeg', 'image/png', 'image/jpg', 'image/ico'].includes(file.type)) {
      setImageUpload(true);
      try {
        const uploadedUrl = await uploadImage(file);
        setLogo(uploadedUrl);
        setFormData((prev) => ({ ...prev, logo: uploadedUrl }));
        console.log(uploadedUrl);
        setImageUpload(false);
      } catch (error) {
        setImageUpload(false);
        toast.error('Failed to upload image. Please try again.', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        event.target.value = '';
      }
    } else {
      toast.error('Please upload image file only.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      event.target.value = '';
    }
  };

  // Remove uploaded logo
  const removeLogo = () => {
    setLogo(null);
    setFormData((prev) => ({ ...prev, logo: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Validate a single field (used on blur)
  const validateField = (name: string, value: any): string | undefined => {
    const v = typeof value === 'string' ? value.trim() : value;

    switch (name) {
      case 'name':
        if (!v) return 'Name is required';
        if (v.length < 2) return 'Name must be at least 2 characters';
        if (v.length > 100) return 'Name must be at most 100 characters';
        if (!/^[a-zA-Z0-9\s\-'\.]+$/.test(v))
          return 'Name contains invalid characters (letters, numbers, hyphens, apostrophes only)';
        return undefined;
      case 'company':
        if (!v) return 'Company name is required';
        if (v.length < 2) return 'Company name must be at least 2 characters';
        if (v.length > 200) return 'Company name must be at most 200 characters';
        return undefined;
      case 'email':
        if (!v) return 'Email is required';
        if (v.length > 254) return 'Email must be at most 254 characters';
        if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v))
          return 'Please enter a valid email address';
        return undefined;
      case 'phone':
        if (!v) return 'Phone is required';
        if (v.length < 7) return 'Phone must be at least 7 characters';
        if (v.length > 20) return 'Phone must be at most 20 characters';
        if (!/^[0-9+\-()\s]+$/.test(v))
          return 'Phone can only contain digits, +, -, (, ), and spaces';
        return undefined;
      case 'address':
        if (!v) return 'Address is required';
        if (v.length > 500) return 'Address must be at most 500 characters';
        return undefined;
      case 'contractValue':
        if (Number(value) < 0) return 'Contract value cannot be negative';
        if (Number(value) > 999999999) return 'Contract value cannot exceed 999,999,999';
        if (isNaN(Number(value))) return 'Contract value must be a number';
        return undefined;
      case 'status':
        if (!['Active', 'Inactive'].includes(v)) return 'Status must be Active or Inactive';
        return undefined;
      case 'instagram':
        if (v && v !== '' && !/instagram\.com|instagr\.am/i.test(v))
          return 'Instagram URL must contain "instagram.com"';
        return undefined;
      case 'facebook':
        if (v && v !== '' && !/facebook\.com|fb\.com|fb\.me/i.test(v))
          return 'Facebook URL must contain "facebook.com"';
        return undefined;
      case 'linkedin':
        if (v && v !== '' && !/linkedin\.com/i.test(v))
          return 'LinkedIn URL must contain "linkedin.com"';
        return undefined;
      case 'whatsapp':
        if (v && v !== '' && !/wa\.me|whatsapp\.com|^\+?[\d\s\-()]{10,20}$/i.test(v))
          return 'WhatsApp must be a valid phone number or WhatsApp URL';
        return undefined;
      default:
        return undefined;
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'contractValue' ? Number(value) || 0 : value,
    }));
  };

  // Handle social media input changes
  const handleSocialLinkChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    platform: keyof ClientFormData['socialLinks']
  ) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value,
      },
    }));
  };

  // On-blur validation for each field
  const handleFieldBlur = (fieldName: string, value: any) => {
    const error = validateField(fieldName, value);
    if (error) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: error }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fields: (keyof ClientFormData)[] = [
      'name',
      'company',
      'email',
      'phone',
      'address',
      'contractValue',
      'status',
    ];

    fields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) newErrors[field] = error;
    });

    setFieldErrors(newErrors);

    // Scroll to first error
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      setTimeout(() => {
        const errorElement =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector('.is-invalid');
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (errorElement as HTMLElement).focus?.();
        }
      }, 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Trim all text fields before submission
      const trimmedData = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        logo: formData.logo,
        status: formData.status,
        contractValue: formData.contractValue,
        socialLinks: {
          instagram: formData.socialLinks.instagram?.trim() || '',
          facebook: formData.socialLinks.facebook?.trim() || '',
          linkedin: formData.socialLinks.linkedin?.trim() || '',
          whatsapp: formData.socialLinks.whatsapp?.trim() || '',
        },
      };

      // Console log the API request
      console.log('=== CREATE CLIENT API REQUEST ===');
      console.log('Endpoint: POST /api/clients');
      console.log('Request Data:', JSON.stringify(trimmedData, null, 2));
      console.log('================================');

      // Call REST API to create client
      const success = await createClient(trimmedData);

      if (success) {
        console.log('Client created successfully');
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          address: '',
          logo: '',
          status: 'Active',
          contractValue: 0,
          socialLinks: {
            instagram: '',
            facebook: '',
            linkedin: '',
            whatsapp: '',
          },
        });
        setFieldErrors({});
        setLogo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

        // Show success message briefly, then close modal
        setTimeout(() => {
          closeModal();

          // Reload client list after successful creation
          window.dispatchEvent(new CustomEvent('client-created'));

          // Reset states after modal closes
          setTimeout(() => {
            setLoading(false);
          }, 300);
        }, 300);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      message.error('An error occurred while creating the client');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('add_client');
    if (!modal) return;

    try {
      // Method 1: Try Bootstrap Modal API
      if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
        const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
          return;
        }
      }

      // Method 2: Try jQuery Bootstrap Modal
      if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
        (window as any).$('#add_client').modal('hide');
        return;
      }

      // Method 3: Manual modal closing (fallback)
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');

      // Remove backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((backdrop) => backdrop.remove());

      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch (error) {
      console.error('Error closing add client modal:', error);

      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      logo: '',
      status: 'Active',
      contractValue: 0,
      socialLinks: {
        instagram: '',
        facebook: '',
        linkedin: '',
        whatsapp: '',
      },
    });
    setFieldErrors({});
    setLogo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <div className="modal fade" id="add_client">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Client</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="contact-grids-tab">
                <ul className="nav nav-underline" id="myTab" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className="nav-link active"
                      id="info-tab"
                      data-bs-toggle="tab"
                      data-bs-target="#basic-info"
                      type="button"
                      role="tab"
                      aria-selected="true"
                    >
                      Basic Information
                    </button>
                  </li>
                </ul>
              </div>
              <div className="tab-content" id="myTabContent">
                <div
                  className="tab-pane fade show active"
                  id="basic-info"
                  role="tabpanel"
                  aria-labelledby="info-tab"
                  tabIndex={0}
                >
                  <div className="modal-body pb-0">
                    <div className="row">
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                          <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                            {logo ? (
                              <img
                                src={logo}
                                alt="Uploaded Logo"
                                className="rounded-circle"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : imageUpload ? (
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Uploading...</span>
                              </div>
                            ) : (
                              <i className="ti ti-photo text-gray-2 fs-16" />
                            )}
                          </div>
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">Upload Client Logo</h6>
                              <p className="fs-12">Image should be below 4 mb</p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                {logo ? 'Change' : 'Upload'}
                                <input
                                  type="file"
                                  className="form-control image-sign"
                                  accept=".png,.jpeg,.jpg,.ico"
                                  ref={fileInputRef}
                                  onChange={handleImageUpload}
                                />
                              </div>
                              {logo ? (
                                <button
                                  type="button"
                                  onClick={removeLogo}
                                  className="btn btn-light btn-sm"
                                >
                                  Remove
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-light btn-sm"
                                  onClick={() => {
                                    if (fileInputRef.current) {
                                      fileInputRef.current.value = '';
                                    }
                                  }}
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Client Name <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            onFocus={() => clearFieldError('name')}
                            onBlur={(e) => handleFieldBlur('name', e.target.value)}
                            placeholder="Enter client name"
                            maxLength={100}
                          />
                          {fieldErrors.name && (
                            <div className="invalid-feedback d-block">{fieldErrors.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Company Name <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.company ? 'is-invalid' : ''}`}
                            name="company"
                            value={formData.company}
                            onChange={handleInputChange}
                            onFocus={() => clearFieldError('company')}
                            onBlur={(e) => handleFieldBlur('company', e.target.value)}
                            placeholder="Enter company name"
                            maxLength={200}
                          />
                          {fieldErrors.company && (
                            <div className="invalid-feedback d-block">{fieldErrors.company}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Email <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="email"
                            className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            onFocus={() => clearFieldError('email')}
                            onBlur={(e) => handleFieldBlur('email', e.target.value)}
                            placeholder="Enter email address"
                            maxLength={254}
                          />
                          {fieldErrors.email && (
                            <div className="invalid-feedback d-block">{fieldErrors.email}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            Phone Number <span className="text-danger"> *</span>
                          </label>
                          <input
                            type="tel"
                            className={`form-control ${fieldErrors.phone ? 'is-invalid' : ''}`}
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            onFocus={() => clearFieldError('phone')}
                            onBlur={(e) => handleFieldBlur('phone', e.target.value)}
                            placeholder="Enter phone number"
                            maxLength={20}
                          />
                          {fieldErrors.phone && (
                            <div className="invalid-feedback d-block">{fieldErrors.phone}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">
                            Address <span className="text-danger"> *</span>
                          </label>
                          <textarea
                            className={`form-control ${fieldErrors.address ? 'is-invalid' : ''}`}
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            onFocus={() => clearFieldError('address')}
                            onBlur={(e) => handleFieldBlur('address', e.target.value)}
                            rows={3}
                            placeholder="Enter address"
                            maxLength={500}
                          />
                          {fieldErrors.address && (
                            <div className="invalid-feedback d-block">{fieldErrors.address}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Status</label>
                          <input
                            type="text"
                            className="form-control"
                            name="status"
                            value={formData.status}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Contract Value ($)</label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.contractValue ? 'is-invalid' : ''}`}
                            name="contractValue"
                            value={formData.contractValue}
                            onChange={handleInputChange}
                            onKeyPress={(e) => {
                              // Only allow numbers and decimal point
                              if (!/[0-9.]/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onFocus={() => clearFieldError('contractValue')}
                            onBlur={(e) => handleFieldBlur('contractValue', Number(e.target.value))}
                            placeholder="Enter contract value"
                          />
                          {fieldErrors.contractValue && (
                            <div className="invalid-feedback d-block">
                              {fieldErrors.contractValue}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Social Media Links Section */}
                      <div className="col-md-12">
                        <div className="border-top my-3 pt-3">
                          <h6 className="mb-3">Social Media Links (Optional)</h6>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="ti ti-brand-instagram me-1"></i>
                            Instagram
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.instagram ? 'is-invalid' : ''}`}
                            value={formData.socialLinks.instagram}
                            onChange={(e) => handleSocialLinkChange(e, 'instagram')}
                            onFocus={() => clearFieldError('instagram')}
                            onBlur={(e) => handleFieldBlur('instagram', e.target.value)}
                            placeholder="https://instagram.com/yourcompany"
                          />
                          {fieldErrors.instagram && (
                            <div className="invalid-feedback d-block">{fieldErrors.instagram}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="ti ti-brand-facebook me-1"></i>
                            Facebook
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.facebook ? 'is-invalid' : ''}`}
                            value={formData.socialLinks.facebook}
                            onChange={(e) => handleSocialLinkChange(e, 'facebook')}
                            onFocus={() => clearFieldError('facebook')}
                            onBlur={(e) => handleFieldBlur('facebook', e.target.value)}
                            placeholder="https://facebook.com/yourcompany"
                          />
                          {fieldErrors.facebook && (
                            <div className="invalid-feedback d-block">{fieldErrors.facebook}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="ti ti-brand-linkedin me-1"></i>
                            LinkedIn
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.linkedin ? 'is-invalid' : ''}`}
                            value={formData.socialLinks.linkedin}
                            onChange={(e) => handleSocialLinkChange(e, 'linkedin')}
                            onFocus={() => clearFieldError('linkedin')}
                            onBlur={(e) => handleFieldBlur('linkedin', e.target.value)}
                            placeholder="https://linkedin.com/company/yourcompany"
                          />
                          {fieldErrors.linkedin && (
                            <div className="invalid-feedback d-block">{fieldErrors.linkedin}</div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">
                            <i className="ti ti-brand-whatsapp me-1"></i>
                            WhatsApp
                          </label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.whatsapp ? 'is-invalid' : ''}`}
                            value={formData.socialLinks.whatsapp}
                            onChange={(e) => handleSocialLinkChange(e, 'whatsapp')}
                            onFocus={() => clearFieldError('whatsapp')}
                            onBlur={(e) => handleFieldBlur('whatsapp', e.target.value)}
                            placeholder="+1234567890 or https://wa.me/1234567890"
                          />
                          {fieldErrors.whatsapp && (
                            <div className="invalid-feedback d-block">{fieldErrors.whatsapp}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      onClick={() => {
                        closeModal();
                        resetForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading || hasErrors}
                    >
                      {loading ? 'Creating...' : 'Create Client'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
};

export default AddClient;
