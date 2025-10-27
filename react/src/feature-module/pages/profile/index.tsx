import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { all_routes } from '../../router/all_routes';
import CommonSelect from '../../../core/common/commonSelect';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import Footer from '../../../core/common/footer';
import { useProfile, Profile } from '../../../hooks/useProfile';
import { message } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type PasswordField = 'oldPassword' | 'newPassword' | 'confirmPassword' | 'currentPassword';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage = () => {
  const route = all_routes;
  const {
    currentUserProfile,
    fetchCurrentUserProfile,
    updateCurrentUserProfile,
    changePassword,
    loading
  } = useProfile();

  // State for form data
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
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

  // Country, state, city options
  const countryChoose = [
    { value: "Select", label: "Select" },
    { value: "USA", label: "USA" },
    { value: "Canada", label: "Canada" },
    { value: "UK", label: "UK" },
    { value: "Germany", label: "Germany" },
    { value: "France", label: "France" },
    { value: "India", label: "India" },
    { value: "Australia", label: "Australia" },
  ];

  const stateChoose = [
    { value: "Select", label: "Select" },
    { value: "california", label: "California" },
    { value: "Texas", label: "Texas" },
    { value: "New York", label: "New York" },
    { value: "Florida", label: "Florida" },
    { value: "Ontario", label: "Ontario" },
    { value: "London", label: "London" },
    { value: "Mumbai", label: "Mumbai" },
  ];

  const cityChoose = [
    { value: "Select", label: "Select" },
    { value: "Los Angeles", label: "Los Angeles" },
    { value: "San Francisco", label: "San Francisco" },
    { value: "San Diego", label: "San Diego" },
    { value: "Fresno", label: "Fresno" },
    { value: "Toronto", label: "Toronto" },
    { value: "Manchester", label: "Manchester" },
    { value: "Delhi", label: "Delhi" },
  ];

  const genderOptions = [
    { value: "Select", label: "Select" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ];

  const departmentOptions = [
    { value: "Select", label: "Select" },
    { value: "IT", label: "IT" },
    { value: "HR", label: "HR" },
    { value: "Finance", label: "Finance" },
    { value: "Marketing", label: "Marketing" },
    { value: "Sales", label: "Sales" },
    { value: "Operations", label: "Operations" },
    { value: "Support", label: "Support" },
  ];

  // Cloudinary image upload function
  const uploadImage = async (file: File) => {
    setProfilePhoto(null);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "amasqis"); // Your Cloudinary upload preset
    const res = await fetch("https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    console.log(data);
    return data.secure_url;
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 4 * 1024 * 1024; // 4MB
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
        console.log(uploadedUrl);
        setImageUpload(false);
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
  const removePhoto = () => {
    setProfilePhoto(null);
    setFormData(prev => ({ ...prev, profilePhoto: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Load current user profile on component mount
  useEffect(() => {
    fetchCurrentUserProfile();
  }, [fetchCurrentUserProfile]);

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
        designation: currentUserProfile.designation || '',
        joiningDate: currentUserProfile.joiningDate ? new Date(currentUserProfile.joiningDate).toISOString().split('T')[0] : '',
        bio: currentUserProfile.bio || '',
        skills: currentUserProfile.skills || [],
        // Address
        address: {
          street: currentUserProfile.address?.street || '',
          city: currentUserProfile.address?.city || '',
          state: currentUserProfile.address?.state || '',
          country: currentUserProfile.address?.country || '',
          postalCode: currentUserProfile.address?.postalCode || ''
        },
        // Emergency contact
        emergencyContact: {
          name: currentUserProfile.emergencyContact?.name || '',
          phone: currentUserProfile.emergencyContact?.phone || '',
          relationship: currentUserProfile.emergencyContact?.relationship || ''
        },
        // Social links
        socialLinks: {
          linkedin: currentUserProfile.socialLinks?.linkedin || '',
          twitter: currentUserProfile.socialLinks?.twitter || '',
          facebook: currentUserProfile.socialLinks?.facebook || '',
          instagram: currentUserProfile.socialLinks?.instagram || ''
        }
      });
      setProfilePhoto(currentUserProfile.profilePhoto || null);
    }
  }, [currentUserProfile]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      // Handle nested objects (address, emergencyContact, socialLinks)
      const [parent, child] = name.split('.');
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

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    if (name.includes('.')) {
      // Handle nested objects
      const [parent, child] = name.split('.');
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

  // Handle skills input
  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const skillsArray = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData(prev => ({
      ...prev,
      skills: skillsArray
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      console.log('Updating profile:', formData);
      
      const success = await updateCurrentUserProfile(formData);
      if (success) {
        message.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('An error occurred while updating the profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      message.error('All password fields are required');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      message.error('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      message.error('New password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      const success = await changePassword(passwordData);
      if (success) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      message.error('An error occurred while changing the password');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !currentUserProfile) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Profile</h2>
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
          {/* /Breadcrumb */}

          <div className="card">
            <div className="card-body">
              <div className="border-bottom mb-3 pb-3">
                <h4>Profile</h4>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSubmit}>
                {/* Basic Information */}
                <div className="border-bottom mb-3">
                  <div className="row">
                    <div className="col-md-12">
                      <h6 className="mb-3">Basic Information</h6>
                      
                      {/* Profile Photo Upload */}
                      <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                        <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                          {profilePhoto ? (
                            <img 
                              src={profilePhoto} 
                              alt="Profile Photo" 
                              className="rounded-circle" 
                              style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                            />
                          ) : imageUpload ? (
                            <div className="spinner-border text-primary" role="status">
                              <span className="visually-hidden">Uploading...</span>
                            </div>
                          ) : (
                            <i className="ti ti-photo text-gray-3 fs-16"></i>
                          )}
                        </div>
                        <div className="profile-upload">
                          <div className="mb-2">
                            <h6 className="mb-1">Profile Photo</h6>
                            <p className="fs-12">Recommended image size is 100px x 100px</p>
                          </div>
                          <div className="profile-uploader d-flex align-items-center">
                            <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                              {profilePhoto ? 'Change' : 'Upload'}
                              <input
                                type="file"
                                className="form-control image-sign"
                                accept=".png,.jpeg,.jpg,.ico"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                              />
                            </div>
                            {profilePhoto ? (
                              <button
                                type="button"
                                onClick={removePhoto}
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
                  </div>
                  
                  {/* Name and Basic Info */}
                  <div className="row">
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">First Name *</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="firstName"
                            value={formData.firstName || ''}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Last Name *</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="lastName"
                            value={formData.lastName || ''}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Email *</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="email"
                            className="form-control"
                            name="email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
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
                            value={formData.phone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Date of Birth</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="date"
                            className="form-control"
                            name="dateOfBirth"
                            value={formData.dateOfBirth || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Gender</label>
                        </div>
                        <div className="col-md-8">
                          <CommonSelect
                            className="select"
                            options={genderOptions}
                            defaultValue={genderOptions.find(option => option.value === formData.gender) || genderOptions[0]}
                            onChange={(option: any) => handleSelectChange('gender', option.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="border-bottom mb-3">
                  <h6 className="mb-3">Professional Information</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Employee ID</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="employeeId"
                            value={formData.employeeId || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Department</label>
                        </div>
                        <div className="col-md-8">
                          <CommonSelect
                            className="select"
                            options={departmentOptions}
                            defaultValue={departmentOptions.find(option => option.value === formData.department) || departmentOptions[0]}
                            onChange={(option: any) => handleSelectChange('department', option.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Designation</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="designation"
                            value={formData.designation || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Joining Date</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="date"
                            className="form-control"
                            name="joiningDate"
                            value={formData.joiningDate || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="border-bottom mb-3">
                  <h6 className="mb-3">Address Information</h6>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-2">
                          <label className="form-label mb-md-0">Address</label>
                        </div>
                        <div className="col-md-10">
                          <input
                            type="text"
                            className="form-control"
                            name="address.street"
                            value={formData.address?.street || ''}
                            onChange={handleInputChange}
                            placeholder="Street address"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Country</label>
                        </div>
                        <div className="col-md-8">
                          <CommonSelect
                            className="select"
                            options={countryChoose}
                            defaultValue={countryChoose.find(option => option.value === formData.address?.country) || countryChoose[0]}
                            onChange={(option: any) => handleSelectChange('address.country', option.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">State</label>
                        </div>
                        <div className="col-md-8">
                          <CommonSelect
                            className="select"
                            options={stateChoose}
                            defaultValue={stateChoose.find(option => option.value === formData.address?.state) || stateChoose[0]}
                            onChange={(option: any) => handleSelectChange('address.state', option.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">City</label>
                        </div>
                        <div className="col-md-8">
                          <CommonSelect
                            className="select"
                            options={cityChoose}
                            defaultValue={cityChoose.find(option => option.value === formData.address?.city) || cityChoose[0]}
                            onChange={(option: any) => handleSelectChange('address.city', option.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Postal Code</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="address.postalCode"
                            value={formData.address?.postalCode || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="border-bottom mb-3">
                  <h6 className="mb-3">Emergency Contact</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Contact Name</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="emergencyContact.name"
                            value={formData.emergencyContact?.name || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Contact Phone</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="tel"
                            className="form-control"
                            name="emergencyContact.phone"
                            value={formData.emergencyContact?.phone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Relationship</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="text"
                            className="form-control"
                            name="emergencyContact.relationship"
                            value={formData.emergencyContact?.relationship || ''}
                            onChange={handleInputChange}
                            placeholder="e.g., Father, Mother, Spouse"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Links */}
                <div className="border-bottom mb-3">
                  <h6 className="mb-3">Social Links</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">LinkedIn</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="url"
                            className="form-control"
                            name="socialLinks.linkedin"
                            value={formData.socialLinks?.linkedin || ''}
                            onChange={handleInputChange}
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Twitter</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="url"
                            className="form-control"
                            name="socialLinks.twitter"
                            value={formData.socialLinks?.twitter || ''}
                            onChange={handleInputChange}
                            placeholder="https://twitter.com/username"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Facebook</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="url"
                            className="form-control"
                            name="socialLinks.facebook"
                            value={formData.socialLinks?.facebook || ''}
                            onChange={handleInputChange}
                            placeholder="https://facebook.com/username"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-4">
                          <label className="form-label mb-md-0">Instagram</label>
                        </div>
                        <div className="col-md-8">
                          <input
                            type="url"
                            className="form-control"
                            name="socialLinks.instagram"
                            value={formData.socialLinks?.instagram || ''}
                            onChange={handleInputChange}
                            placeholder="https://instagram.com/username"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Skills and Bio */}
                <div className="border-bottom mb-3">
                  <h6 className="mb-3">Additional Information</h6>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="row align-items-start mb-3">
                        <div className="col-md-2">
                          <label className="form-label mb-md-0">Skills</label>
                        </div>
                        <div className="col-md-10">
                          <textarea
                            className="form-control"
                            rows={3}
                            name="skills"
                            value={formData.skills?.join(', ') || ''}
                            onChange={handleSkillsChange}
                            placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
                          />
                          <small className="form-text text-muted">
                            Separate multiple skills with commas
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="row align-items-start mb-3">
                        <div className="col-md-2">
                          <label className="form-label mb-md-0">Bio</label>
                        </div>
                        <div className="col-md-10">
                          <textarea
                            className="form-control"
                            rows={4}
                            name="bio"
                            value={formData.bio || ''}
                            onChange={handleInputChange}
                            placeholder="Write a brief description about yourself..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-end mb-4">
                  <button
                    type="button"
                    className="btn btn-outline-light border me-3"
                    onClick={() => {
                      // Reset form
                      if (currentUserProfile) {
                        setFormData({
                          firstName: currentUserProfile.firstName || '',
                          lastName: currentUserProfile.lastName || '',
                          email: currentUserProfile.email || '',
                          // ... reset all other fields
                        });
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>

              {/* Change Password Section */}
              <div className="border-bottom mb-3">
                <h6 className="mb-3">Change Password</h6>
                <form onSubmit={handlePasswordSubmit}>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-5">
                          <label className="form-label mb-md-0">Current Password</label>
                        </div>
                        <div className="col-md-7">
                          <div className="pass-group">
                            <input
                              type={passwordVisibility.currentPassword ? "text" : "password"}
                              className="pass-input form-control"
                              name="currentPassword"
                              value={passwordData.currentPassword}
                              onChange={handlePasswordChange}
                            />
                            <span
                              className={`ti toggle-passwords ${
                                passwordVisibility.currentPassword ? "ti-eye" : "ti-eye-off"
                              }`}
                              onClick={() => togglePasswordVisibility('currentPassword')}
                            ></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-5">
                          <label className="form-label mb-md-0">New Password</label>
                        </div>
                        <div className="col-md-7">
                          <div className="pass-group">
                            <input
                              type={passwordVisibility.newPassword ? "text" : "password"}
                              className="pass-input form-control"
                              name="newPassword"
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                            />
                            <span
                              className={`ti toggle-passwords ${
                                passwordVisibility.newPassword ? "ti-eye" : "ti-eye-off"
                              }`}
                              onClick={() => togglePasswordVisibility('newPassword')}
                            ></span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="row align-items-center mb-3">
                        <div className="col-md-5">
                          <label className="form-label mb-md-0">Confirm Password</label>
                        </div>
                        <div className="col-md-7">
                          <div className="pass-group">
                            <input
                              type={passwordVisibility.confirmPassword ? "text" : "password"}
                              className="pass-input form-control"
                              name="confirmPassword"
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                            />
                            <span
                              className={`ti toggle-passwords ${
                                passwordVisibility.confirmPassword ? "ti-eye" : "ti-eye-off"
                              }`}
                              onClick={() => togglePasswordVisibility('confirmPassword')}
                            ></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-3 mb-3"
                      onClick={() => {
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary mb-3"
                      disabled={saving}
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
      {/* /Page Wrapper */}

      <ToastContainer />
    </>
  );
};

export default ProfilePage;