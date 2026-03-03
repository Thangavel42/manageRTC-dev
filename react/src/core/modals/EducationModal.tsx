/**
 * Education Modal Component
 * For adding/editing education entries in the profile page
 * Fields match employeedetails.tsx: institution, course (degree), startDate, endDate
 * UPDATED: Using Bootstrap theme to match platform consistency
 */

import React, { useEffect, useState } from 'react';

interface EducationEntry {
  degree?: string;
  institution?: string;
  startDate?: string | Date;
  endDate?: string | Date;
}

interface EducationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: EducationEntry) => Promise<void>;
  education?: EducationEntry | null;
  loading?: boolean;
}

export const EducationModal: React.FC<EducationModalProps> = ({
  visible,
  onClose,
  onSave,
  education,
  loading = false,
}) => {
  const [formData, setFormData] = useState<EducationEntry>({
    degree: '',
    institution: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (education) {
        setFormData({
          degree: education.degree || '',
          institution: education.institution || '',
          startDate: education.startDate ? formatDateForInput(education.startDate) : '',
          endDate: education.endDate ? formatDateForInput(education.endDate) : '',
        });
      } else {
        setFormData({
          degree: '',
          institution: '',
          startDate: '',
          endDate: '',
        });
      }
      setErrors({});
    }
  }, [visible, education]);

  const formatDateForInput = (date: string | Date): string => {
    try {
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institution?.trim()) {
      newErrors.institution = 'Please enter institution name';
    }

    if (!formData.degree?.trim()) {
      newErrors.degree = 'Please enter course/degree name';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Please select start date';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'Please select end date';
    }

    if (formData.startDate && formData.endDate) {
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
      const data: EducationEntry = {
        degree: formData.degree,
        institution: formData.institution,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      };
      await onSave(data);
      setFormData({ degree: '', institution: '', startDate: '', endDate: '' });
      setErrors({});
    } catch (error) {
      console.error('Error saving education:', error);
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
                <i className="ti ti-certificate me-2"></i>
                {education ? 'Edit Education Entry' : 'Add Education Entry'}
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
                {/* Institution Name */}
                <div className="mb-3">
                  <label className="form-label">
                    Institution Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="institution"
                    className={`form-control ${errors.institution ? 'is-invalid' : ''}`}
                    placeholder="e.g., IIT Bombay, Anna University, Harvard University"
                    value={formData.institution}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.institution && (
                    <div className="invalid-feedback">{errors.institution}</div>
                  )}
                </div>

                {/* Course/Degree */}
                <div className="mb-3">
                  <label className="form-label">
                    Course/Degree <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="degree"
                    className={`form-control ${errors.degree ? 'is-invalid' : ''}`}
                    placeholder="e.g., B.Tech in Computer Science, MBA, MCA, M.Sc"
                    value={formData.degree}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.degree && (
                    <div className="invalid-feedback">{errors.degree}</div>
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
                        End Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        className={`form-control ${errors.endDate ? 'is-invalid' : ''}`}
                        value={formData.endDate as string}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      {errors.endDate && (
                        <div className="invalid-feedback">{errors.endDate}</div>
                      )}
                      <small className="text-muted">
                        Expected or actual completion date
                      </small>
                    </div>
                  </div>
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
                      {education ? 'Update' : 'Add'}
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

export default EducationModal;
