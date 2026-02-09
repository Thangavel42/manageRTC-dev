import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import CommonSelect from '../../../core/common/commonSelect';
import Footer from '../../../core/common/footer';
import { Profile, useProfileRest } from '../../../hooks/useProfileRest';
import { all_routes } from '../../router/all_routes';
import { PersonalInfoSection } from './components/PersonalInfoSection';
import { BankInfoSection } from './components/BankInfoSection';
import { EducationSection } from './components/EducationSection';
import { ExperienceSection } from './components/ExperienceSection';
import { FamilySection } from './components/FamilySection';

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
  } = useProfileRest();

  // View/Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
        role: currentUserProfile.role || '',
        employmentType: currentUserProfile.employmentType || '',
        status: currentUserProfile.status || 'Active',
        about: currentUserProfile.about || currentUserProfile.bio || '',
        bio: currentUserProfile.bio || '',
        skills: currentUserProfile.skills || [],
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
          relationship: currentUserProfile.emergencyContact?.relationship || ''
        },
        socialLinks: {
          linkedin: currentUserProfile.socialLinks?.linkedin || '',
          twitter: currentUserProfile.socialLinks?.twitter || '',
          facebook: currentUserProfile.socialLinks?.facebook || '',
          instagram: currentUserProfile.socialLinks?.instagram || ''
        },
        education: currentUserProfile.education || [],
        experience: currentUserProfile.experience || [],
        family: currentUserProfile.family || [],
        documents: currentUserProfile.documents || [],
        personal: {
          passport: {
            number: currentUserProfile.personal?.passport?.number || '',
            expiryDate: currentUserProfile.personal?.passport?.expiryDate || null,
            country: currentUserProfile.personal?.passport?.country || ''
          },
          nationality: currentUserProfile.personal?.nationality || '',
          religion: currentUserProfile.personal?.religion || '',
          maritalStatus: currentUserProfile.personal?.maritalStatus || '',
          employmentOfSpouse: currentUserProfile.personal?.employmentOfSpouse || '',
          noOfChildren: currentUserProfile.personal?.noOfChildren || 0
        },
        bankDetails: {
          bankName: currentUserProfile.bankDetails?.bankName || '',
          accountNumber: currentUserProfile.bankDetails?.accountNumber || '',
          ifscCode: currentUserProfile.bankDetails?.ifscCode || '',
          branch: currentUserProfile.bankDetails?.branch || '',
          accountType: currentUserProfile.bankDetails?.accountType || 'Savings'
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
            ...(prev[parent as keyof Profile] as any),
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

  // Enable edit mode
  const handleEdit = () => {
    setIsEditing(true);
    setIsChangingPassword(false);
  };

  // Cancel edit mode
  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    // Reset form data to current profile
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
        role: currentUserProfile.role || '',
        employmentType: currentUserProfile.employmentType || '',
        status: currentUserProfile.status || 'Active',
        about: currentUserProfile.about || currentUserProfile.bio || '',
        bio: currentUserProfile.bio || '',
        skills: currentUserProfile.skills || [],
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
          relationship: currentUserProfile.emergencyContact?.relationship || ''
        },
        socialLinks: {
          linkedin: currentUserProfile.socialLinks?.linkedin || '',
          twitter: currentUserProfile.socialLinks?.twitter || '',
          facebook: currentUserProfile.socialLinks?.facebook || '',
          instagram: currentUserProfile.socialLinks?.instagram || ''
        },
        education: currentUserProfile.education || [],
        experience: currentUserProfile.experience || [],
        family: currentUserProfile.family || [],
        documents: currentUserProfile.documents || [],
        personal: {
          passport: {
            number: currentUserProfile.personal?.passport?.number || '',
            expiryDate: currentUserProfile.personal?.passport?.expiryDate || null,
            country: currentUserProfile.personal?.passport?.country || ''
          },
          nationality: currentUserProfile.personal?.nationality || '',
          religion: currentUserProfile.personal?.religion || '',
          maritalStatus: currentUserProfile.personal?.maritalStatus || '',
          employmentOfSpouse: currentUserProfile.personal?.employmentOfSpouse || '',
          noOfChildren: currentUserProfile.personal?.noOfChildren || 0
        },
        bankDetails: {
          bankName: currentUserProfile.bankDetails?.bankName || '',
          accountNumber: currentUserProfile.bankDetails?.accountNumber || '',
          ifscCode: currentUserProfile.bankDetails?.ifscCode || '',
          branch: currentUserProfile.bankDetails?.branch || '',
          accountType: currentUserProfile.bankDetails?.accountType || 'Savings'
        }
      });
      setProfilePhoto(currentUserProfile.profilePhoto || null);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);
    try {
      const success = await updateCurrentUserProfile(formData);
      if (success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('An error occurred while updating the profile');
    } finally {
      setSaving(false);
    }
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
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render view mode
  const renderViewMode = () => (
    <div className="profile-view">
      {/* Profile Header with Actions */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <div className="avatar avatar-xxl rounded-circle me-3" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
            {currentUserProfile?.profilePhoto ? (
              <img
                src={currentUserProfile.profilePhoto}
                alt={`${currentUserProfile.firstName} ${currentUserProfile.lastName}`}
                className="rounded-circle"
                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '50%', display: 'block', aspectRatio: '1/1' }}
              />
            ) : (
              <div className="avatar-placeholder bg-primary text-white d-flex align-items-center justify-content-center rounded-circle" style={{ width: '120px', height: '120px', fontSize: '48px' }}>
                {currentUserProfile?.firstName?.charAt(0)}{currentUserProfile?.lastName?.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-1">{currentUserProfile?.firstName} {currentUserProfile?.lastName}</h3>
            <p className="text-muted mb-1">{currentUserProfile?.email}</p>
            <p className="mb-0"><span className="badge bg-info me-1">{currentUserProfile?.designation || 'N/A'}</span></p>
            <p className="mb-0"><span className="badge bg-secondary">{currentUserProfile?.employeeId || 'N/A'}</span></p>
          </div>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={handleEdit}>
            <i className="ti ti-edit me-2"></i>Edit Profile
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Basic Information</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">First Name</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.firstName || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Last Name</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.lastName || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Email</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.email || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Phone</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.phone || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Date of Birth</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.dateOfBirth ? new Date(currentUserProfile.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Gender</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.gender || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <PersonalInfoSection
        personalInfo={currentUserProfile?.personal || {}}
        isEditing={false}
        onChange={handleNestedFieldChange}
      />

      {/* Bank Information Section */}
      <BankInfoSection
        bankInfo={currentUserProfile?.bankDetails || {}}
        isEditing={false}
        onChange={handleNestedFieldChange}
      />

      {/* Professional Information */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Professional Information</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Employee ID</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.employeeId || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Department</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.department || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Designation</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.designation || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Date of Joining</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.joiningDate ? new Date(currentUserProfile.joiningDate).toLocaleDateString() : 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Role</label>
            <p className="mb-0 fw-medium text-capitalize">{currentUserProfile?.role || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Employment Type</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.employmentType || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Status</label>
            <p className="mb-0 fw-medium">
              <span className={`badge ${
                currentUserProfile?.status === 'Active' ? 'bg-success' :
                currentUserProfile?.status === 'Probation' ? 'bg-warning' :
                currentUserProfile?.status === 'On Leave' ? 'bg-info' :
                currentUserProfile?.status === 'Resigned' ? 'bg-secondary' :
                currentUserProfile?.status === 'Terminated' ? 'bg-danger' : 'bg-secondary'
              }`}>
                {currentUserProfile?.status || 'N/A'}
              </span>
            </p>
          </div>
          {currentUserProfile?.reportingManager && (
            <div className="col-md-6 mb-3">
              <label className="text-muted small">Reporting Manager</label>
              <p className="mb-0 fw-medium">
                {currentUserProfile.reportingManager.fullName ||
                 `${currentUserProfile.reportingManager.firstName} ${currentUserProfile.reportingManager.lastName}`}
                {currentUserProfile.reportingManager.employeeId &&
                 ` (${currentUserProfile.reportingManager.employeeId})`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Address Information */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Address Information</h6>
        <div className="row">
          <div className="col-md-12 mb-3">
            <label className="text-muted small">Address</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.address?.street || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">City</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.address?.city || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">State</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.address?.state || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Country</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.address?.country || 'N/A'}</p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Postal Code</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.address?.postalCode || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Emergency Contact</h6>
        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Contact Name</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.emergencyContact?.name || 'N/A'}</p>
          </div>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Contact Phone</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.emergencyContact?.phone || 'N/A'}</p>
          </div>
          <div className="col-md-4 mb-3">
            <label className="text-muted small">Relationship</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.emergencyContact?.relationship || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Social Links</h6>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="text-muted small">LinkedIn</label>
            <p className="mb-0 fw-medium">
              {currentUserProfile?.socialLinks?.linkedin ? (
                <a href={currentUserProfile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer">{currentUserProfile.socialLinks.linkedin}</a>
              ) : 'N/A'}
            </p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Twitter</label>
            <p className="mb-0 fw-medium">
              {currentUserProfile?.socialLinks?.twitter ? (
                <a href={currentUserProfile.socialLinks.twitter} target="_blank" rel="noopener noreferrer">{currentUserProfile.socialLinks.twitter}</a>
              ) : 'N/A'}
            </p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Facebook</label>
            <p className="mb-0 fw-medium">
              {currentUserProfile?.socialLinks?.facebook ? (
                <a href={currentUserProfile.socialLinks.facebook} target="_blank" rel="noopener noreferrer">{currentUserProfile.socialLinks.facebook}</a>
              ) : 'N/A'}
            </p>
          </div>
          <div className="col-md-6 mb-3">
            <label className="text-muted small">Instagram</label>
            <p className="mb-0 fw-medium">
              {currentUserProfile?.socialLinks?.instagram ? (
                <a href={currentUserProfile.socialLinks.instagram} target="_blank" rel="noopener noreferrer">{currentUserProfile.socialLinks.instagram}</a>
              ) : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Skills and About */}
      <div className="border-bottom mb-4 pb-4">
        <h6 className="mb-3">Additional Information</h6>
        <div className="row">
          <div className="col-md-12 mb-3">
            <label className="text-muted small">Skills</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.skills?.length ? currentUserProfile.skills.join(', ') : 'N/A'}</p>
          </div>
          <div className="col-md-12 mb-3">
            <label className="text-muted small">About</label>
            <p className="mb-0 fw-medium">{currentUserProfile?.about || currentUserProfile?.bio || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Education Section */}
      <EducationSection
        education={currentUserProfile?.education || []}
        isEditing={false}
        onChange={(education) => setFormData({ ...formData, education })}
      />

      {/* Experience Section */}
      <ExperienceSection
        experience={currentUserProfile?.experience || []}
        isEditing={false}
        onChange={(experience) => setFormData({ ...formData, experience })}
      />

      {/* Family Section */}
      <FamilySection
        family={currentUserProfile?.family || []}
        isEditing={false}
        onChange={(family) => setFormData({ ...formData, family })}
      />

      {/* Documents */}
      {currentUserProfile?.documents && currentUserProfile.documents.length > 0 && (
        <div className="border-bottom mb-4 pb-4">
          <h6 className="mb-3">Documents</h6>
          <div className="row">
            {currentUserProfile.documents.map((doc, index) => (
              <div className="col-md-6 mb-3" key={index}>
                <div className="card bg-light">
                  <div className="card-body d-flex justify-content-between align-items-center">
                    <div>
                      <p className="mb-1 fw-medium">{doc.fileName || 'N/A'}</p>
                      <p className="mb-0 text-muted small">{doc.type || 'Document'} {doc.fileSize && `• ${(doc.fileSize / 1024).toFixed(1)} KB`}</p>
                    </div>
                    {doc.fileUrl && (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                        <i className="ti ti-download me-1"></i>View
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change Password Button */}
      <div className="text-end">
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={() => setIsChangingPassword(true)}
          data-bs-toggle="modal"
          data-bs-target="#change_password_modal"
        >
          <i className="ti ti-lock me-2"></i>Change Password
        </button>
      </div>
    </div>
  );

  // Render edit mode
  const renderEditMode = () => (
    <form onSubmit={handleSubmit}>
      {/* Profile Photo Upload */}
      <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
        <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames" style={{ width: '100px', height: '100px' }}>
          {profilePhoto ? (
            <img
              src={profilePhoto}
              alt="Profile Photo"
              className="rounded-circle"
              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', display: 'block', aspectRatio: '1/1' }}
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

      {/* Basic Information */}
      <div className="border-bottom mb-3">
        <h6 className="mb-3">Basic Information</h6>
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

      {/* Personal Information Section */}
      <PersonalInfoSection
        personalInfo={formData.personal || {}}
        isEditing={true}
        onChange={handleNestedFieldChange}
      />

      {/* Bank Information Section */}
      <BankInfoSection
        bankInfo={formData.bankDetails || {}}
        isEditing={true}
        onChange={handleNestedFieldChange}
      />

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
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Name</label>
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
          <div className="col-md-4">
            <div className="row align-items-center mb-3">
              <div className="col-md-4">
                <label className="form-label mb-md-0">Phone</label>
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
          <div className="col-md-4">
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

      {/* Education Section - Editable */}
      <EducationSection
        education={formData.education || []}
        isEditing={true}
        onChange={(education) => setFormData({ ...formData, education })}
      />

      {/* Experience Section - Editable */}
      <ExperienceSection
        experience={formData.experience || []}
        isEditing={true}
        onChange={(experience) => setFormData({ ...formData, experience })}
      />

      {/* Family Section - Editable */}
      <FamilySection
        family={formData.family || []}
        isEditing={true}
        onChange={(family) => setFormData({ ...formData, family })}
      />

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
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            'Save Profile'
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

          <div className="card">
            <div className="card-body">
              <div className="border-bottom mb-3 pb-3 d-flex justify-content-between align-items-center">
                <h4 className="mb-0">Profile</h4>
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

      {/* Change Password Modal */}
      <div className="modal fade" id="change_password_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Change Password</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  setIsChangingPassword(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Current Password <span className="text-danger">*</span></label>
                      <div className="pass-group">
                        <input
                          type={passwordVisibility.currentPassword ? "text" : "password"}
                          className="pass-input form-control"
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
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
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">New Password <span className="text-danger">*</span></label>
                      <div className="pass-group">
                        <input
                          type={passwordVisibility.newPassword ? "text" : "password"}
                          className="pass-input form-control"
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
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
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                      <div className="pass-group">
                        <input
                          type={passwordVisibility.confirmPassword ? "text" : "password"}
                          className="pass-input form-control"
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
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
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    setIsChangingPassword(false);
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
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default ProfilePage;
