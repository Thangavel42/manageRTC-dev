/**
 * Family Modal Component
 * For adding/editing family member entries in the profile page
 * Fields match employeedetails.tsx: familyMemberName, relationship, phone
 * UPDATED: Using Bootstrap theme to match platform consistency
 */

import React, { useEffect, useState } from 'react';

interface FamilyEntry {
  familyMemberName?: string;
  relationship?: string;
  phone?: string;
}

interface FamilyModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: FamilyEntry) => Promise<void>;
  family?: FamilyEntry | null;
  loading?: boolean;
}

export const FamilyModal: React.FC<FamilyModalProps> = ({
  visible,
  onClose,
  onSave,
  family,
  loading = false,
}) => {
  const [formData, setFormData] = useState<FamilyEntry>({
    familyMemberName: '',
    relationship: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (family) {
        setFormData({
          familyMemberName: (family as any).Name || family.familyMemberName || (family as any).name || '',
          relationship: family.relationship || '',
          phone: family.phone || '',
        });
      } else {
        setFormData({
          familyMemberName: '',
          relationship: '',
          phone: '',
        });
      }
      setErrors({});
    }
  }, [visible, family]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.familyMemberName?.trim()) {
      newErrors.familyMemberName = 'Please enter family member name';
    }

    if (!formData.relationship?.trim()) {
      newErrors.relationship = 'Please select relationship';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'Please enter phone number';
    } else if (!/^\+?[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
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
      await onSave(formData);
      setFormData({ familyMemberName: '', relationship: '', phone: '' });
      setErrors({});
    } catch (error) {
      console.error('Error saving family member:', error);
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
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            {/* Modal Header */}
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ti ti-users me-2"></i>
                {family ? 'Edit Family Member' : 'Add Family Member'}
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
                {/* Name Field */}
                <div className="mb-3">
                  <label className="form-label">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="familyMemberName"
                    className={`form-control ${errors.familyMemberName ? 'is-invalid' : ''}`}
                    placeholder="Enter family member name"
                    value={formData.familyMemberName}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.familyMemberName && (
                    <div className="invalid-feedback">{errors.familyMemberName}</div>
                  )}
                </div>

                {/* Relationship Field */}
                <div className="mb-3">
                  <label className="form-label">
                    Relationship <span className="text-danger">*</span>
                  </label>
                  <select
                    name="relationship"
                    className={`form-select ${errors.relationship ? 'is-invalid' : ''}`}
                    value={formData.relationship}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.relationship && (
                    <div className="invalid-feedback">{errors.relationship}</div>
                  )}
                </div>

                {/* Phone Field */}
                <div className="mb-3">
                  <label className="form-label">
                    Phone <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  {errors.phone && (
                    <div className="invalid-feedback">{errors.phone}</div>
                  )}
                  <small className="text-muted">
                    Example: +1234567890 or 123-456-7890
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
                      {family ? 'Update' : 'Add'}
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

export default FamilyModal;
