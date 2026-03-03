/**
 * Experience Modal Component
 * For adding/editing work experience entries in the profile page
 * Fields match employeedetails.tsx: company, designation, startDate, endDate, current
 * UPDATED: Using Bootstrap theme to match platform consistency
 */

import React, { useEffect, useState } from 'react';

interface ExperienceEntry {
  company?: string;
  designation?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  current?: boolean;
}

interface ExperienceModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ExperienceEntry) => Promise<void>;
  experience?: ExperienceEntry | null;
  loading?: boolean;
}

export const ExperienceModal: React.FC<ExperienceModalProps> = ({
  visible,
  onClose,
  onSave,
  experience,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ExperienceEntry>({
    company: '',
    designation: '',
    startDate: '',
    endDate: '',
    current: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (experience) {
        setFormData({
          company: experience.company || '',
          designation: experience.designation || '',
          startDate: experience.startDate ? formatDateForInput(experience.startDate) : '',
          endDate: experience.endDate ? formatDateForInput(experience.endDate) : '',
          current: experience.current === true,
        });
      } else {
        setFormData({
          company: '',
          designation: '',
          startDate: '',
          endDate: '',
          current: false,
        });
      }
      setErrors({});
    }
  }, [visible, experience]);

  const formatDateForInput = (date: string | Date): string => {
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      // Clear endDate error when checking "current job"
      if (name === 'current' && checked) {
        setErrors(prev => ({ ...prev, endDate: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      // Clear error when user types
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company?.trim()) {
      newErrors.company = 'Please enter company name';
    }

    if (!formData.designation?.trim()) {
      newErrors.designation = 'Please enter your designation';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Please select start date';
    }

    if (!formData.current && !formData.endDate) {
      newErrors.endDate = 'Please select end date or check "This is my current job"';
    }

    if (formData.startDate && formData.endDate && !formData.current) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (start > end) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const data: ExperienceEntry = {
        company: formData.company,
        designation: formData.designation,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.current ? undefined : (formData.endDate ? new Date(formData.endDate) : undefined),
        current: formData.current,
      };
      await onSave(data);
      setFormData({
        company: '',
        designation: '',
        startDate: '',
        endDate: '',
        current: false,
      });
      setErrors({});
    } catch (error) {
      console.error('Error saving experience:', error);
    }
  };

  if (!visible) return null;

  return (
    <>
      {/* Bootstrap Modal Backdrop */}
      <div className="modal-backdrop fade show" onClick={onClose}></div>

      {/* Bootstrap Modal */}
      <div
        className="modal fade show"
        style={{ display: 'block' }}
        tabIndex={-1}
        role="dialog"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ti ti-briefcase me-2"></i>
                {experience ? 'Edit Work Experience' : 'Add Work Experience'}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
              ></button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Company Name */}
                <div className="mb-3">
                  <label className="form-label">
                    Company Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="company"
                    className={`form-control ${errors.company ? 'is-invalid' : ''}`}
                    placeholder="e.g., Google, Microsoft, Infosys, Wipro"
                    value={formData.company}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.company && (
                    <div className="invalid-feedback">{errors.company}</div>
                  )}
                </div>

                {/* Designation */}
                <div className="mb-3">
                  <label className="form-label">
                    Designation/Position <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    className={`form-control ${errors.designation ? 'is-invalid' : ''}`}
                    placeholder="e.g., Software Engineer, Product Manager, Team Lead"
                    value={formData.designation}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.designation && (
                    <div className="invalid-feedback">{errors.designation}</div>
                  )}
                </div>

                {/* Date Range */}
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Start Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        className={`form-control ${errors.startDate ? 'is-invalid' : ''}`}
                        value={formData.startDate as string}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      {errors.startDate && (
                        <div className="invalid-feedback">{errors.startDate}</div>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        End Date {!formData.current && <span className="text-danger">*</span>}
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                        value={formData.endDate as string}
                        onChange={handleChange}
                        disabled={loading || formData.current}
                      />
                      {errors.endDate && (
                        <div className="invalid-feedback">{errors.endDate}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Job Checkbox */}
                <div className="mb-3">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      name="current"
                      className="form-check-input"
                      id="currentJobCheck"
                      checked={formData.current}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <label className="form-check-label" htmlFor="currentJobCheck">
                      <i className="ti ti-clock me-1"></i>
                      This is my current job
                    </label>
                  </div>
                  <small className="text-muted">
                    Check this if you are currently working at this company
                  </small>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={onClose}
                  disabled={loading}
                >
                  <i className="ti ti-x me-1"></i>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check me-1"></i>
                      {experience ? 'Update' : 'Add'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExperienceModal;
