import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import type { Candidate } from '../../../hooks/useCandidates';

interface CandidateFormData {
  _id: string;
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  religion: string;
  maritalStatus: string;
  address: string;
  city: string;
  state: string;
  country: string;
  linkedinProfile: string;
  portfolio: string;
  
  // Professional Information
  currentRole: string;
  currentCompany: string;
  experienceYears: number;
  currentSalary: number;
  expectedSalary: number;
  noticePeriod: string;
  skills: string;
  qualifications: string;
  certifications: string;
  languages: string;
  
  // Application Information
  appliedRole: string;
  appliedDate: string;
  recruiterId: string;
  recruiterName: string;
  source: string;
  referredBy: string;
  
  // Documents
  resume: string;
  coverLetter: string;
  portfolioDoc: string;
  
  // Status
  status: string;
}

interface CandidateFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  appliedRole?: string;
  appliedDate?: string;
  experienceYears?: string;
  currentSalary?: string;
  expectedSalary?: string;
}

const EditCandidate = () => {
  const socket = useSocket() as Socket | null;
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CandidateFormData>({
    _id: '',
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    religion: '',
    maritalStatus: '',
    address: '',
    city: '',
    state: '',
    country: '',
    linkedinProfile: '',
    portfolio: '',
    
    // Professional Information
    currentRole: '',
    currentCompany: '',
    experienceYears: 0,
    currentSalary: 0,
    expectedSalary: 0,
    noticePeriod: '',
    skills: '',
    qualifications: '',
    certifications: '',
    languages: '',
    
    // Application Information
    appliedRole: '',
    appliedDate: '',
    recruiterId: '',
    recruiterName: '',
    source: 'Direct',
    referredBy: '',
    
    // Documents
    resume: '',
    coverLetter: '',
    portfolioDoc: '',
    
    // Status
    status: 'New Application'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<CandidateFormErrors>({});
  const [uploadStates, setUploadStates] = useState({
    resume: false,
    coverLetter: false,
    portfolio: false
  });
  const fileInputRefs = {
    resume: useRef<HTMLInputElement>(null),
    coverLetter: useRef<HTMLInputElement>(null),
    portfolio: useRef<HTMLInputElement>(null)
  };

  // Listen for edit candidate events
  useEffect(() => {
    const handleEditCandidate = (event: any) => {
      const candidate: Candidate = event.detail.candidate;
      console.log('[EditCandidate] Received candidate data:', candidate);

      // Add a small delay to ensure modal is ready
      setTimeout(() => {
        setFormData({
          _id: candidate._id || '',
          // Personal Information
          firstName: candidate.personalInfo?.firstName || '',
          lastName: candidate.personalInfo?.lastName || '',
          email: candidate.personalInfo?.email || '',
          phone: candidate.personalInfo?.phone || '',
          dateOfBirth: candidate.personalInfo?.dateOfBirth || '',
          gender: candidate.personalInfo?.gender || '',
          nationality: candidate.personalInfo?.nationality || '',
          religion: candidate.personalInfo?.religion || '',
          maritalStatus: candidate.personalInfo?.maritalStatus || '',
          address: candidate.personalInfo?.address || '',
          city: candidate.personalInfo?.city || '',
          state: candidate.personalInfo?.state || '',
          country: candidate.personalInfo?.country || '',
          linkedinProfile: candidate.personalInfo?.linkedinProfile || '',
          portfolio: candidate.personalInfo?.portfolio || '',
          
          // Professional Information
          currentRole: candidate.professionalInfo?.currentRole || '',
          currentCompany: candidate.professionalInfo?.currentCompany || '',
          experienceYears: candidate.professionalInfo?.experienceYears || 0,
          currentSalary: candidate.professionalInfo?.currentSalary || 0,
          expectedSalary: candidate.professionalInfo?.expectedSalary || 0,
          noticePeriod: candidate.professionalInfo?.noticePeriod || '',
          skills: candidate.professionalInfo?.skills?.join(', ') || '',
          qualifications: candidate.professionalInfo?.qualifications?.join(', ') || '',
          certifications: candidate.professionalInfo?.certifications?.join(', ') || '',
          languages: candidate.professionalInfo?.languages?.join(', ') || '',
          
          // Application Information
          appliedRole: candidate.applicationInfo?.appliedRole || '',
          appliedDate: candidate.applicationInfo?.appliedDate 
            ? new Date(candidate.applicationInfo.appliedDate).toISOString().split('T')[0] 
            : '',
          recruiterId: candidate.applicationInfo?.recruiterId || '',
          recruiterName: candidate.applicationInfo?.recruiterName || '',
          source: candidate.applicationInfo?.source || 'Direct',
          referredBy: candidate.applicationInfo?.referredBy || '',
          
          // Documents
          resume: candidate.documents?.resume || '',
          coverLetter: candidate.documents?.coverLetter || '',
          portfolioDoc: candidate.documents?.portfolio || '',
          
          // Status
          status: candidate.status || 'New Application'
        });
        setErrors({});
        setCurrentStep(1);
        console.log('[EditCandidate] Form data updated with candidate data');
      }, 150);
    };

    window.addEventListener('edit-candidate', handleEditCandidate);
    return () => window.removeEventListener('edit-candidate', handleEditCandidate);
  }, []);

  // Cloudinary file upload function
  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "amasqis");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dwc3b5zfe/raw/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    return data.secure_url;
  };

  // Handle file upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'resume' | 'coverLetter' | 'portfolio'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB.", {
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

    // Allow various file types for documents
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload PDF, DOC, DOCX, TXT, or image files only.", {
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

    setUploadStates(prev => ({ ...prev, [type]: true }));

    try {
      const uploadedUrl = await uploadFile(file);
      setFormData(prev => ({ ...prev, [type === 'portfolio' ? 'portfolioDoc' : type]: uploadedUrl }));
      console.log(`${type} uploaded:`, uploadedUrl);
      setUploadStates(prev => ({ ...prev, [type]: false }));
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully!`);
    } catch (error) {
      setUploadStates(prev => ({ ...prev, [type]: false }));
      toast.error(`Failed to upload ${type}. Please try again.`, {
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

  // Remove uploaded file
  const removeFile = (type: 'resume' | 'coverLetter' | 'portfolio') => {
    setFormData(prev => ({ ...prev, [type === 'portfolio' ? 'portfolioDoc' : type]: '' }));
    if (fileInputRefs[type].current) {
      fileInputRefs[type].current!.value = "";
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experienceYears' || name === 'currentSalary' || name === 'expectedSalary' 
        ? Number(value) || 0 
        : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof CandidateFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: CandidateFormErrors = {};

    if (step === 1) {
      // Personal Information validation
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required';
      }
    } else if (step === 2) {
      // Professional Information validation
      if (formData.experienceYears < 0) {
        newErrors.experienceYears = 'Experience years cannot be negative';
      }
      if (formData.currentSalary < 0) {
        newErrors.currentSalary = 'Current salary cannot be negative';
      }
      if (formData.expectedSalary < 0) {
        newErrors.expectedSalary = 'Expected salary cannot be negative';
      }
    } else if (step === 3) {
      // Application Information validation
      if (!formData.appliedRole.trim()) {
        newErrors.appliedRole = 'Applied role is required';
      }
      if (!formData.appliedDate) {
        newErrors.appliedDate = 'Applied date is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(currentStep)) {
      return;
    }

    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);

    try {
      console.log('Updating candidate:', formData);

      // Process skills, qualifications, certifications, and languages
      const processedData = {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        qualifications: formData.qualifications ? formData.qualifications.split(',').map(s => s.trim()).filter(s => s) : [],
        certifications: formData.certifications ? formData.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
        languages: formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(s => s) : [],
      };

      socket.emit('candidate:update', processedData);

      // Listen for response
      socket.once('candidate:update-response', (response: any) => {
        if (response.done) {
          console.log('Candidate updated successfully:', response.data);
          message.success('Candidate updated successfully!');
          // Show success message briefly, then close modal
          setTimeout(() => {
            closeModal();
            setTimeout(() => {
              setErrors({});
            }, 300);
          }, 1500);
        } else {
          console.error('Failed to update candidate:', response.error);
          message.error(`Failed to update candidate: ${response.error}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error updating candidate:', error);
      message.error('An error occurred while updating the candidate');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('edit_candidate');
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
        (window as any).$('#edit_candidate').modal('hide');
        return;
      }

      // Method 3: Manual modal closing (fallback)
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      
      // Remove backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch (error) {
      console.error('Error closing edit candidate modal:', error);
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h6 className="mb-3">Personal Information</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">First Name *</label>
                <input
                  type="text"
                  className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                />
                {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Last Name *</label>
                <input
                  type="text"
                  className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
                {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Phone *</label>
                <input
                  type="tel"
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
                {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  className="form-control"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Gender</label>
                <select
                  className="form-control"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">City</label>
                <input
                  type="text"
                  className="form-control"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">State</label>
                <input
                  type="text"
                  className="form-control"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Enter state"
                />
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Country</label>
                <input
                  type="text"
                  className="form-control"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h6 className="mb-3">Professional Information</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Current Role</label>
                <input
                  type="text"
                  className="form-control"
                  name="currentRole"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  placeholder="Enter current role"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Current Company</label>
                <input
                  type="text"
                  className="form-control"
                  name="currentCompany"
                  value={formData.currentCompany}
                  onChange={handleInputChange}
                  placeholder="Enter current company"
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">Experience (Years)</label>
                <input
                  type="number"
                  className={`form-control ${errors.experienceYears ? 'is-invalid' : ''}`}
                  name="experienceYears"
                  value={formData.experienceYears}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
                {errors.experienceYears && <div className="invalid-feedback">{errors.experienceYears}</div>}
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Current Salary ($)</label>
                <input
                  type="number"
                  className={`form-control ${errors.currentSalary ? 'is-invalid' : ''}`}
                  name="currentSalary"
                  value={formData.currentSalary}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
                {errors.currentSalary && <div className="invalid-feedback">{errors.currentSalary}</div>}
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Expected Salary ($)</label>
                <input
                  type="number"
                  className={`form-control ${errors.expectedSalary ? 'is-invalid' : ''}`}
                  name="expectedSalary"
                  value={formData.expectedSalary}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="0"
                />
                {errors.expectedSalary && <div className="invalid-feedback">{errors.expectedSalary}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Notice Period</label>
              <select
                className="form-control"
                name="noticePeriod"
                value={formData.noticePeriod}
                onChange={handleInputChange}
              >
                <option value="">Select Notice Period</option>
                <option value="Immediate">Immediate</option>
                <option value="1 Week">1 Week</option>
                <option value="2 Weeks">2 Weeks</option>
                <option value="1 Month">1 Month</option>
                <option value="2 Months">2 Months</option>
                <option value="3 Months">3 Months</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Skills (comma separated)</label>
              <textarea
                className="form-control"
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="e.g. JavaScript, React, Node.js, Python"
                rows={2}
              />
              <small className="text-muted">Separate multiple skills with commas</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Qualifications (comma separated)</label>
              <textarea
                className="form-control"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleInputChange}
                placeholder="e.g. Bachelor's in Computer Science, MBA"
                rows={2}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h6 className="mb-3">Application Information</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Applied Role *</label>
                <input
                  type="text"
                  className={`form-control ${errors.appliedRole ? 'is-invalid' : ''}`}
                  name="appliedRole"
                  value={formData.appliedRole}
                  onChange={handleInputChange}
                  placeholder="Enter applied role"
                />
                {errors.appliedRole && <div className="invalid-feedback">{errors.appliedRole}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Applied Date *</label>
                <input
                  type="date"
                  className={`form-control ${errors.appliedDate ? 'is-invalid' : ''}`}
                  name="appliedDate"
                  value={formData.appliedDate}
                  onChange={handleInputChange}
                />
                {errors.appliedDate && <div className="invalid-feedback">{errors.appliedDate}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Recruiter Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="recruiterName"
                  value={formData.recruiterName}
                  onChange={handleInputChange}
                  placeholder="Enter recruiter name"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Source</label>
                <select
                  className="form-control"
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                >
                  <option value="Direct">Direct Application</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Job Portal">Job Portal</option>
                  <option value="Referral">Referral</option>
                  <option value="Agency">Agency</option>
                  <option value="Career Fair">Career Fair</option>
                  <option value="Company Website">Company Website</option>
                </select>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="New Application">New Application</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interview</option>
                  <option value="Technical Test">Technical Test</option>
                  <option value="Offer Stage">Offer Stage</option>
                  <option value="Hired">Hired</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Referred By</label>
                <input
                  type="text"
                  className="form-control"
                  name="referredBy"
                  value={formData.referredBy}
                  onChange={handleInputChange}
                  placeholder="Enter referrer name (if any)"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h6 className="mb-3">Documents & Links</h6>
            
            {/* Resume Upload */}
            <div className="mb-3">
              <label className="form-label">Resume</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="file"
                  className="form-control"
                  ref={fileInputRefs.resume}
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileUpload(e, 'resume')}
                  disabled={uploadStates.resume}
                />
                {uploadStates.resume && <span className="text-info">Uploading...</span>}
                {formData.resume && !uploadStates.resume && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeFile('resume')}
                  >
                    Remove
                  </button>
                )}
              </div>
              {formData.resume && (
                <small className="text-success">✓ Resume uploaded</small>
              )}
            </div>

            {/* Cover Letter Upload */}
            <div className="mb-3">
              <label className="form-label">Cover Letter</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="file"
                  className="form-control"
                  ref={fileInputRefs.coverLetter}
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => handleFileUpload(e, 'coverLetter')}
                  disabled={uploadStates.coverLetter}
                />
                {uploadStates.coverLetter && <span className="text-info">Uploading...</span>}
                {formData.coverLetter && !uploadStates.coverLetter && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeFile('coverLetter')}
                  >
                    Remove
                  </button>
                )}
              </div>
              {formData.coverLetter && (
                <small className="text-success">✓ Cover letter uploaded</small>
              )}
            </div>

            {/* Portfolio Upload */}
            <div className="mb-3">
              <label className="form-label">Portfolio Document</label>
              <div className="d-flex align-items-center gap-2">
                <input
                  type="file"
                  className="form-control"
                  ref={fileInputRefs.portfolio}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, 'portfolio')}
                  disabled={uploadStates.portfolio}
                />
                {uploadStates.portfolio && <span className="text-info">Uploading...</span>}
                {formData.portfolioDoc && !uploadStates.portfolio && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeFile('portfolio')}
                  >
                    Remove
                  </button>
                )}
              </div>
              {formData.portfolioDoc && (
                <small className="text-success">✓ Portfolio document uploaded</small>
              )}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">LinkedIn Profile</label>
                <input
                  type="url"
                  className="form-control"
                  name="linkedinProfile"
                  value={formData.linkedinProfile}
                  onChange={handleInputChange}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Portfolio Website</label>
                <input
                  type="url"
                  className="form-control"
                  name="portfolio"
                  value={formData.portfolio}
                  onChange={handleInputChange}
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="modal fade" id="edit_candidate" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Candidate</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={closeModal}
              ></button>
            </div>

            <div className="modal-body">
              {/* Progress Steps */}
              <div className="row mb-4">
                <div className="col-12">
                  <div className="d-flex justify-content-between">
                    {[1, 2, 3, 4].map((step) => (
                      <div key={step} className={`text-center ${currentStep >= step ? 'text-primary' : 'text-muted'}`}>
                        <div
                          className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                            currentStep >= step ? 'bg-primary text-white' : 'bg-light'
                          }`}
                          style={{ width: '40px', height: '40px' }}
                        >
                          {step}
                        </div>
                        <div className="mt-1 small">
                          {step === 1 && 'Personal'}
                          {step === 2 && 'Professional'}
                          {step === 3 && 'Application'}
                          {step === 4 && 'Documents'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {renderStepContent()}

                <div className="d-flex justify-content-between mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handlePrevious}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </button>

                  <div>
                    <button
                      type="button"
                      className="btn btn-light me-2"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>

                    {currentStep < 4 ? (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleNext}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update Candidate'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default EditCandidate;