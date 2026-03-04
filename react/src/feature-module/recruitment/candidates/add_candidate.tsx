import { DatePicker, message } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Socket } from 'socket.io-client';
import CommonSelect from '../../../core/common/commonSelect';
import { useCandidates } from '../../../hooks/useCandidates';
import { useDesignationsREST } from '../../../hooks/useDesignationsREST';
import { useEmployeesREST } from '../../../hooks/useEmployeesREST';
import { useSocket } from '../../../SocketContext';

interface CandidateFormData {
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
  candidateType: string; // 'Fresher' or 'Experienced'
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
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  appliedRole?: string;
  appliedDate?: string;
  currentRole?: string;
  currentCompany?: string;
  experienceYears?: string;
  currentSalary?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  skills?: string;
  qualifications?: string;
}

const AddCandidate = () => {
  const socket = useSocket() as Socket | null;
  const { createCandidate } = useCandidates();
  const { employees, fetchActiveEmployeesList } = useEmployeesREST();
  const { designations, fetchDesignations } = useDesignationsREST();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CandidateFormData>({
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
    candidateType: 'Experienced',
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
    appliedDate: new Date().toISOString().split('T')[0],
    recruiterId: '',
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

  // Fetch employees and designations on component mount
  useEffect(() => {
    fetchActiveEmployeesList();
    fetchDesignations({ status: 'Active' });
  }, [fetchActiveEmployeesList, fetchDesignations]);

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
      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }
      if (!formData.gender.trim()) {
        newErrors.gender = 'Gender is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (!formData.state.trim()) {
        newErrors.state = 'State is required';
      }
      if (!formData.country.trim()) {
        newErrors.country = 'Country is required';
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
    } else if (step === 2) {
      // Professional Information validation

      if (formData.candidateType === 'Experienced') {
        // Validation for Experienced candidates
        if (!formData.currentRole.trim()) {
          newErrors.currentRole = 'Current role is required';
        }
        if (!formData.currentCompany.trim()) {
          newErrors.currentCompany = 'Current company is required';
        }
        if (!formData.experienceYears || formData.experienceYears <= 0) {
          newErrors.experienceYears = 'Experience years is required and must be greater than 0';
        }
        if (!formData.currentSalary || formData.currentSalary <= 0) {
          newErrors.currentSalary = 'Current salary is required and must be greater than 0';
        }
        if (!formData.noticePeriod.trim()) {
          newErrors.noticePeriod = 'Notice period is required';
        }
      }

      // Common validation for both Fresher and Experienced
      if (!formData.expectedSalary || formData.expectedSalary <= 0) {
        newErrors.expectedSalary = 'Expected salary is required and must be greater than 0';
      }
      if (!formData.skills.trim()) {
        newErrors.skills = 'Skills are required';
      }
      if (!formData.qualifications.trim()) {
        newErrors.qualifications = 'Qualifications are required';
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

    setLoading(true);

    try {
      console.log('Creating candidate:', formData);

      // Process skills, qualifications, certifications, and languages
      const processedData = {
        ...formData,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        qualifications: formData.qualifications ? formData.qualifications.split(',').map(s => s.trim()).filter(s => s) : [],
        certifications: formData.certifications ? formData.certifications.split(',').map(s => s.trim()).filter(s => s) : [],
        languages: formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(s => s) : [],
      };

      const success = await createCandidate(processedData);

      if (success) {
        console.log('Candidate created successfully');

        // Emit event to notify parent component to refresh data
        window.dispatchEvent(new CustomEvent('candidate-created'));

        resetForm();

        // Close modal after a brief delay to show success message
        setTimeout(() => {
          closeModal();
          setLoading(false);
        }, 800);
      } else {
        console.error('Failed to create candidate');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error creating candidate:', error);
      message.error('An error occurred while creating the candidate');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('add_candidate');
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
        (window as any).$('#add_candidate').modal('hide');
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
      console.error('Error closing add candidate modal:', error);
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  };

  const resetForm = () => {
    setFormData({
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
      candidateType: 'Experienced',
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
      appliedDate: new Date().toISOString().split('T')[0],
      recruiterId: '',
      source: 'Direct',
      referredBy: '',

      // Documents
      resume: '',
      coverLetter: '',
      portfolioDoc: '',

      // Status
      status: 'New Application'
    });
    setErrors({});
    setCurrentStep(1);

    // Clear file inputs
    Object.values(fileInputRefs).forEach(ref => {
      if (ref.current) {
        ref.current.value = "";
      }
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h6 className="mb-3">Personal Information</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">First Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.firstName ? 'is-invalid' : ''}`}
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                />
                {errors.firstName && <div className="invalid-feedback d-block">{errors.firstName}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Last Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.lastName ? 'is-invalid' : ''}`}
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter last name"
                />
                {errors.lastName && <div className="invalid-feedback d-block">{errors.lastName}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter email address"
                />
                {errors.email && <div className="invalid-feedback d-block">{errors.email}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Phone <span className="text-danger">*</span></label>
                <input
                  type="tel"
                  className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
                {errors.phone && <div className="invalid-feedback d-block">{errors.phone}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                <div className="input-icon-end position-relative">
                  <DatePicker
                    className="form-control datetimepicker"
                    style={errors.dateOfBirth ? { borderColor: '#dc3545' } : {}}
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    value={formData.dateOfBirth ? dayjs(formData.dateOfBirth, 'YYYY-MM-DD') : null}
                    defaultPickerValue={dayjs().subtract(25, 'year')}
                    onChange={(date, dateString) => {
                      const dateStr = Array.isArray(dateString) ? dateString[0] : dateString;
                      const isoDate = date ? date.format('YYYY-MM-DD') : '';
                      handleInputChange({ target: { name: 'dateOfBirth', value: isoDate } } as any);
                    }}
                    disabledDate={(current) => {
                      const maxDate = dayjs().subtract(15, 'year');
                      const minDate = dayjs().subtract(100, 'year');
                      return current && (current.isAfter(maxDate, 'day') || current.isBefore(minDate, 'day'));
                    }}
                  />
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-7" />
                  </span>
                </div>
                {errors.dateOfBirth && <div className="invalid-feedback d-block">{errors.dateOfBirth}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Gender <span className="text-danger">*</span></label>
                <CommonSelect
                  className={`select ${errors.gender ? 'is-invalid' : ''}`}
                  options={[
                    { value: '', label: 'Select Gender' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' }
                  ]}
                  value={formData.gender ? { value: formData.gender, label: formData.gender } : { value: '', label: 'Select Gender' }}
                  onChange={(option: any) => {
                    handleInputChange({ target: { name: 'gender', value: option?.value || '' } } as any);
                  }}
                />
                {errors.gender && <div className="invalid-feedback d-block">{errors.gender}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label">City <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                />
                {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">State <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Enter state"
                />
                {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
              </div>
              <div className="col-md-4 mb-3">
                <label className="form-label">Country <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className={`form-control ${errors.country ? 'is-invalid' : ''}`}
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="Enter country"
                />
                {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Address <span className="text-danger">*</span></label>
              <textarea
                className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter full address"
                rows={2}
              />
              {errors.address && <div className="invalid-feedback d-block">{errors.address}</div>}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h6 className="mb-3">Professional Information</h6>

            {/* Candidate Type Selection */}
            <div className="mb-4">
              <label className="form-label">Candidate Type <span className="text-danger">*</span></label>
              <CommonSelect
                className="select"
                options={[
                  { value: 'Fresher', label: 'Fresher' },
                  { value: 'Experienced', label: 'Experienced' }
                ]}
                value={formData.candidateType ? { value: formData.candidateType, label: formData.candidateType } : { value: 'Experienced', label: 'Experienced' }}
                onChange={(option: any) => {
                  handleInputChange({ target: { name: 'candidateType', value: option?.value || 'Experienced' } } as any);
                }}
              />
            </div>

            {/* Show professional fields only for Experienced candidates */}
            {formData.candidateType === 'Experienced' && (
              <>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Current Role <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.currentRole ? 'is-invalid' : ''}`}
                      name="currentRole"
                      value={formData.currentRole}
                      onChange={handleInputChange}
                      placeholder="Enter current role"
                    />
                    {errors.currentRole && <div className="invalid-feedback d-block">{errors.currentRole}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Current Company <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className={`form-control ${errors.currentCompany ? 'is-invalid' : ''}`}
                      name="currentCompany"
                      value={formData.currentCompany}
                      onChange={handleInputChange}
                      placeholder="Enter current company"
                    />
                    {errors.currentCompany && <div className="invalid-feedback d-block">{errors.currentCompany}</div>}
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Experience (Years) <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className={`form-control ${errors.experienceYears ? 'is-invalid' : ''}`}
                      name="experienceYears"
                      value={formData.experienceYears || ''}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="0"
                    />
                    {errors.experienceYears && <div className="invalid-feedback d-block">{errors.experienceYears}</div>}
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Current Salary ($) <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className={`form-control ${errors.currentSalary ? 'is-invalid' : ''}`}
                      name="currentSalary"
                      value={formData.currentSalary || ''}
                      onChange={handleInputChange}
                      min="0"
                      placeholder="0"
                    />
                    {errors.currentSalary && <div className="invalid-feedback d-block">{errors.currentSalary}</div>}
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Notice Period <span className="text-danger">*</span></label>
                  <CommonSelect
                    className={`select ${errors.noticePeriod ? 'is-invalid' : ''}`}
                    options={[
                      { value: '', label: 'Select Notice Period' },
                      { value: 'Immediate', label: 'Immediate' },
                      { value: '1 Week', label: '1 Week' },
                      { value: '2 Weeks', label: '2 Weeks' },
                      { value: '1 Month', label: '1 Month' },
                      { value: '2 Months', label: '2 Months' },
                      { value: '3 Months', label: '3 Months' }
                    ]}
                    value={formData.noticePeriod ? { value: formData.noticePeriod, label: formData.noticePeriod } : { value: '', label: 'Select Notice Period' }}
                    onChange={(option: any) => {
                      handleInputChange({ target: { name: 'noticePeriod', value: option?.value || '' } } as any);
                    }}
                  />
                  {errors.noticePeriod && <div className="invalid-feedback d-block">{errors.noticePeriod}</div>}
                </div>
              </>
            )}

            {/* Expected Salary - shown for both Fresher and Experienced */}
            <div className="mb-3">
              <label className="form-label">Expected Salary ($) <span className="text-danger">*</span></label>
              <input
                type="number"
                className={`form-control ${errors.expectedSalary ? 'is-invalid' : ''}`}
                name="expectedSalary"
                value={formData.expectedSalary || ''}
                onChange={handleInputChange}
                min="0"
                placeholder="0"
              />
              {errors.expectedSalary && <div className="invalid-feedback d-block">{errors.expectedSalary}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Skills (comma separated) <span className="text-danger">*</span></label>
              <textarea
                className={`form-control ${errors.skills ? 'is-invalid' : ''}`}
                name="skills"
                value={formData.skills}
                onChange={handleInputChange}
                placeholder="e.g. JavaScript, React, Node.js, Python"
                rows={2}
              />
              {errors.skills && <div className="invalid-feedback d-block">{errors.skills}</div>}
              <small className="text-muted">Separate multiple skills with commas</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Qualifications (comma separated) <span className="text-danger">*</span></label>
              <textarea
                className={`form-control ${errors.qualifications ? 'is-invalid' : ''}`}
                name="qualifications"
                value={formData.qualifications}
                onChange={handleInputChange}
                placeholder="e.g. Bachelor's in Computer Science, MBA"
                rows={2}
              />
              {errors.qualifications && <div className="invalid-feedback d-block">{errors.qualifications}</div>}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h6 className="mb-3">Application Information</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Applied Role <span className="text-danger">*</span></label>
                <CommonSelect
                  className={`${errors.appliedRole ? 'is-invalid' : ''}`}
                  options={[
                    { value: '', label: 'Select Applied Role' },
                    ...designations
                      .filter(d => d.status === 'Active')
                      .map(designation => ({
                        value: designation._id,
                        label: `${designation.designation}${designation.department ? ` (${designation.department})` : ''}`,
                        designation: designation.designation
                      }))
                  ]}
                  value={formData.appliedRole ? {
                    value: formData.appliedRole,
                    label: (() => {
                      const role = designations.find(d => d._id === formData.appliedRole);
                      return role ? `${role.designation}${role.department ? ` (${role.department})` : ''}` : formData.appliedRole;
                    })()
                  } : null}
                  onChange={(option: any) => {
                    setFormData(prev => ({
                      ...prev,
                      appliedRole: option?.value || ''
                    }));
                    if (errors.appliedRole) {
                      setErrors(prev => ({ ...prev, appliedRole: '' }));
                    }
                  }}
                  placeholder="Select Applied Role"
                />
                {errors.appliedRole && <div className="invalid-feedback d-block">{errors.appliedRole}</div>}
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Applied Date <span className="text-danger">*</span></label>
                <div className="input-icon-end position-relative">
                  <DatePicker
                    className="form-control datetimepicker"
                    style={errors.appliedDate ? { borderColor: '#dc3545' } : {}}
                    format="DD-MM-YYYY"
                    placeholder="DD-MM-YYYY"
                    value={formData.appliedDate ? dayjs(formData.appliedDate, 'YYYY-MM-DD') : null}
                    onChange={(date, dateString) => {
                      const dateStr = Array.isArray(dateString) ? dateString[0] : dateString;
                      const isoDate = date ? date.format('YYYY-MM-DD') : '';
                      handleInputChange({ target: { name: 'appliedDate', value: isoDate } } as any);
                    }}
                  />
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-7" />
                  </span>
                </div>
                {errors.appliedDate && <div className="invalid-feedback d-block">{errors.appliedDate}</div>}
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Recruiter Name</label>
                <CommonSelect
                  className="select"
                  options={(() => {
                    console.log('[AddCandidate] Total employees loaded:', employees.length);
                    const hrEmployees = employees.filter(emp => {
                      const role = emp.role || (emp as any).account?.role;
                      console.log('[AddCandidate] Employee:', emp.firstName, emp.lastName, 'Role:', role, 'emp.role:', emp.role, 'emp.account?.role:', (emp as any).account?.role);
                      return role?.toLowerCase() === 'hr';
                    });
                    console.log('[AddCandidate] HR employees found:', hrEmployees.length);
                    return [
                      { value: '', label: 'Select Recruiter' },
                      ...hrEmployees.map(emp => ({
                        value: emp._id,
                        label: `${emp.fullName || `${emp.firstName} ${emp.lastName}`} (${emp.employeeId})`,
                        employeeName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
                        employeeId: emp.employeeId
                      }))
                    ];
                  })()}
                  value={formData.recruiterId ? {
                    value: formData.recruiterId,
                    label: (() => {
                      const recruiter = employees.find(e => e._id === formData.recruiterId);
                      return recruiter ? `${recruiter.fullName || `${recruiter.firstName} ${recruiter.lastName}`} (${recruiter.employeeId})` : formData.recruiterId;
                    })()
                  } : { value: '', label: 'Select Recruiter' }}
                  onChange={(option: any) => {
                    setFormData(prev => ({
                      ...prev,
                      recruiterId: option?.value || ''
                    }));
                  }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Source</label>
                <CommonSelect
                  className="select"
                  options={[
                    { value: 'Direct', label: 'Direct Application' },
                    { value: 'LinkedIn', label: 'LinkedIn' },
                    { value: 'Job Portal', label: 'Job Portal' },
                    { value: 'Referral', label: 'Referral' },
                    { value: 'Agency', label: 'Agency' },
                    { value: 'Career Fair', label: 'Career Fair' },
                    { value: 'Company Website', label: 'Company Website' }
                  ]}
                  value={formData.source ? { value: formData.source, label: formData.source === 'Direct' ? 'Direct Application' : formData.source } : null}
                  onChange={(option: any) => {
                    handleInputChange({ target: { name: 'source', value: option?.value || '' } } as any);
                  }}
                />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">Status</label>
                <CommonSelect
                  className="select"
                  options={[
                    { value: 'New Application', label: 'New Application' },
                    { value: 'Screening', label: 'Screening' },
                    { value: 'Interview', label: 'Interview' },
                    { value: 'Technical Test', label: 'Technical Test' },
                    { value: 'Offer Stage', label: 'Offer Stage' },
                    { value: 'Hired', label: 'Hired' },
                    { value: 'Rejected', label: 'Rejected' }
                  ]}
                  value={formData.status ? { value: formData.status, label: formData.status } : null}
                  onChange={(option: any) => {
                    handleInputChange({ target: { name: 'status', value: option?.value || '' } } as any);
                  }}
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">Referred By</label>
                <CommonSelect
                  className="select"
                  options={[
                    { value: '', label: 'Select Employee' },
                    ...employees.map(emp => ({
                      value: emp._id,
                      label: `${emp.fullName || `${emp.firstName} ${emp.lastName}`} (${emp.employeeId})`,
                      employeeName: emp.fullName || `${emp.firstName} ${emp.lastName}`
                    }))
                  ]}
                  value={formData.referredBy ? {
                    value: formData.referredBy,
                    label: (() => {
                      const referrer = employees.find(e => e._id === formData.referredBy);
                      return referrer ? `${referrer.fullName || `${referrer.firstName} ${referrer.lastName}`} (${referrer.employeeId})` : formData.referredBy;
                    })()
                  } : { value: '', label: 'Select Employee' }}
                  onChange={(option: any) => {
                    setFormData(prev => ({
                      ...prev,
                      referredBy: option?.value || ''
                    }));
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h6 className="mb-3">Documents Upload</h6>

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
              <small className="text-muted">Upload PDF, DOC, DOCX, or TXT files (max 10MB)</small>
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
              <small className="text-muted">Upload PDF, DOC, DOCX, or TXT files (max 10MB)</small>
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
              <small className="text-muted">Upload PDF, DOC, DOCX, TXT, or image files (max 10MB)</small>
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
      <div className="modal fade" id="add_candidate" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Candidate</h4>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  closeModal();
                  resetForm();
                }}
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
                          className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= step ? 'bg-primary text-white' : 'bg-light'
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
                      onClick={() => {
                        closeModal();
                        resetForm();
                      }}
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
                        {loading ? 'Creating...' : 'Create Candidate'}
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

export default AddCandidate;
