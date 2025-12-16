import React, { useState, useRef } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface JobFormData {
  title: string;
  category: string;
  type: string;
  description: string;
  requirements: string;
  skills: string[];
  tags: string[];
  country: string;
  state: string;
  city: string;
  minSalary: number;
  maxSalary: number;
  salaryCurrency: string;
  numberOfPositions: number;
  status: 'Active' | 'Inactive';
}

interface JobFormErrors {
  title?: string;
  category?: string;
  type?: string;
  description?: string;
  requirements?: string;
  skills?: string;
  tags?: string;
  country?: string;
  state?: string;
  city?: string;
  minSalary?: string;
  maxSalary?: string;
  salaryCurrency?: string;
  numberOfPositions?: string;
  status?: string;
}

const AddJob = () => {
  const socket = useSocket() as Socket | null;
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    category: '',
    type: '',
    description: '',
    requirements: '',
    skills: [],
    tags: [],
    country: '',
    state: '',
    city: '',
    minSalary: 0,
    maxSalary: 0,
    salaryCurrency: 'USD',
    numberOfPositions: 1,
    status: 'Active'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<JobFormErrors>({});
  const [skillsInput, setSkillsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'minSalary' || name === 'maxSalary' || name === 'numberOfPositions' 
        ? Number(value) || 0 
        : value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof JobFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSkillsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSkillsInput(value);
    const skillsArray = value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setFormData(prev => ({ ...prev, skills: skillsArray }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTagsInput(value);
    const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({ ...prev, tags: tagsArray }));
  };

  const validateForm = (): boolean => {
    const newErrors: JobFormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (!formData.type.trim()) {
      newErrors.type = 'Job type is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required';
    }

    if (!formData.requirements.trim()) {
      newErrors.requirements = 'Job requirements are required';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (formData.minSalary < 0) {
      newErrors.minSalary = 'Minimum salary cannot be negative';
    }

    if (formData.maxSalary < 0) {
      newErrors.maxSalary = 'Maximum salary cannot be negative';
    }

    if (formData.maxSalary > 0 && formData.minSalary > formData.maxSalary) {
      newErrors.maxSalary = 'Maximum salary must be greater than minimum salary';
    }

    if (formData.numberOfPositions < 1) {
      newErrors.numberOfPositions = 'Number of positions must be at least 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);
    
    try {
      console.log('Creating job:', formData);
      socket.emit('job:create', formData);

      // Listen for response
      socket.once('job:create-response', (response: any) => {
        if (response.done) {
          console.log('Job created successfully:', response.data);
          message.success('Job created successfully!');
          
          // Reset form
          setFormData({
            title: '',
            category: '',
            type: '',
            description: '',
            requirements: '',
            skills: [],
            tags: [],
            country: '',
            state: '',
            city: '',
            minSalary: 0,
            maxSalary: 0,
            salaryCurrency: 'USD',
            numberOfPositions: 1,
            status: 'Active'
          });
          setSkillsInput('');
          setTagsInput('');
          setErrors({});

          // Show success message briefly, then close modal
          setTimeout(() => {
            closeModal();
            resetForm();
            // Reset states after modal closes
            setTimeout(() => {
              setLoading(false);
            }, 300);
          }, 1500);
        } else {
          console.error('Failed to create job:', response.error);
          message.error(`Failed to create job: ${response.error}`);
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Error creating job:', error);
      message.error('An error occurred while creating the job');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('add_job');
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
        (window as any).$('#add_job').modal('hide');
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
      console.error('Error closing add job modal:', error);
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      category: '',
      type: '',
      description: '',
      requirements: '',
      skills: [],
      tags: [],
      country: '',
      state: '',
      city: '',
      minSalary: 0,
      maxSalary: 0,
      salaryCurrency: 'USD',
      numberOfPositions: 1,
      status: 'Active'
    });
    setSkillsInput('');
    setTagsInput('');
    setErrors({});
  };

  return (
    <>
      <div className="modal fade" id="add_job">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add New Job</h4>
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
              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Job Title */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Job Title <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter job title"
                      />
                      {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                    </div>
                  </div>

                  {/* Category and Type */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Category</option>
                        <option value="Software">Software</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Networking">Networking</option>
                        <option value="Design">Design</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Sales">Sales</option>
                        <option value="HR">HR</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                        <option value="Others">Others</option>
                      </select>
                      {errors.category && <div className="invalid-feedback">{errors.category}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Job Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className={`form-select ${errors.type ? 'is-invalid' : ''}`}
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                      >
                        <option value="">Select Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Internship">Internship</option>
                      </select>
                      {errors.type && <div className="invalid-feedback">{errors.type}</div>}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        Country <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.country ? 'is-invalid' : ''}`}
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Enter country"
                      />
                      {errors.country && <div className="invalid-feedback">{errors.country}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        State <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.state ? 'is-invalid' : ''}`}
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        placeholder="Enter state"
                      />
                      {errors.state && <div className="invalid-feedback">{errors.state}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">
                        City <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${errors.city ? 'is-invalid' : ''}`}
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="Enter city"
                      />
                      {errors.city && <div className="invalid-feedback">{errors.city}</div>}
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Minimum Salary</label>
                      <input
                        type="number"
                        className={`form-control ${errors.minSalary ? 'is-invalid' : ''}`}
                        name="minSalary"
                        value={formData.minSalary || ''}
                        onChange={handleInputChange}
                        placeholder="Enter minimum salary"
                        min="0"
                      />
                      {errors.minSalary && <div className="invalid-feedback">{errors.minSalary}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Maximum Salary</label>
                      <input
                        type="number"
                        className={`form-control ${errors.maxSalary ? 'is-invalid' : ''}`}
                        name="maxSalary"
                        value={formData.maxSalary || ''}
                        onChange={handleInputChange}
                        placeholder="Enter maximum salary"
                        min="0"
                      />
                      {errors.maxSalary && <div className="invalid-feedback">{errors.maxSalary}</div>}
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-select"
                        name="salaryCurrency"
                        value={formData.salaryCurrency}
                        onChange={handleInputChange}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                        <option value="CAD">CAD</option>
                        <option value="AUD">AUD</option>
                      </select>
                    </div>
                  </div>

                  {/* Number of Positions and Status */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Number of Positions <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${errors.numberOfPositions ? 'is-invalid' : ''}`}
                        name="numberOfPositions"
                        value={formData.numberOfPositions || ''}
                        onChange={handleInputChange}
                        placeholder="Enter number of positions"
                        min="1"
                      />
                      {errors.numberOfPositions && <div className="invalid-feedback">{errors.numberOfPositions}</div>}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Required Skills</label>
                      <input
                        type="text"
                        className="form-control"
                        value={skillsInput}
                        onChange={handleSkillsChange}
                        placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
                      />
                      <small className="form-text text-muted">
                        Separate multiple skills with commas
                      </small>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Tags</label>
                      <input
                        type="text"
                        className="form-control"
                        value={tagsInput}
                        onChange={handleTagsChange}
                        placeholder="Enter tags separated by commas (e.g., Remote, Senior, Frontend)"
                      />
                      <small className="form-text text-muted">
                        Separate multiple tags with commas
                      </small>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Job Description <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                        name="description"
                        rows={4}
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Enter detailed job description"
                      ></textarea>
                      {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Job Requirements <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className={`form-control ${errors.requirements ? 'is-invalid' : ''}`}
                        name="requirements"
                        rows={4}
                        value={formData.requirements}
                        onChange={handleInputChange}
                        placeholder="Enter job requirements and qualifications"
                      ></textarea>
                      {errors.requirements && <div className="invalid-feedback">{errors.requirements}</div>}
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
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
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : 'Create Job'}
                  </button>
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

export default AddJob;