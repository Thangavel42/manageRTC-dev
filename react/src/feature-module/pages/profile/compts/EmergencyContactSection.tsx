/**
 * Emergency Contact Section - Editable
 * Handles name, phone, phone2, relationship, email
 * Includes validation for required fields
 */

import React, { useEffect, useState } from 'react';
import { EditableSection } from './EditableSection';

interface EmergencyContact {
  name?: string;
  phone?: string;
  phone2?: string;
  relationship?: string;
}

interface EmergencyContactSectionProps {
  data: EmergencyContact;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onChange: (field: string, value: any) => void;
}

// Validation error state interface
interface EmergencyContactErrors {
  name?: string;
  phone?: string;
  phone2?: string;
  relationship?: string;
}

// RequiredLabel component for marking required fields
const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {children}
    <span className="text-danger ms-1">*</span>
  </>
);

export const EmergencyContactSection: React.FC<EmergencyContactSectionProps> = ({
  data,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onChange,
}) => {
  const [localData, setLocalData] = React.useState<EmergencyContact>(data);
  const [errors, setErrors] = useState<EmergencyContactErrors>({});

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Validation functions
  /**
   * Validates contact name - required, min 2 characters
   */
  const validateName = (value: string): string => {
    if (!value || value.trim() === '') {
      return 'Contact name is required';
    }
    if (value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  };

  /**
   * Validates phone number - required, 10-15 digits
   */
  const validatePhone = (value: string): string => {
    if (!value || value.trim() === '') {
      return 'Phone number is required';
    }
    // Remove common separators and spaces
    const cleanValue = value.replace(/[\s\-\+\(\)]/g, '');
    if (!/^\d{10,15}$/.test(cleanValue)) {
      return 'Phone number must be 10-15 digits';
    }
    return '';
  };

  /**
   * Validates relationship - required, min 2 characters
   */
  const validateRelationship = (value: string): string => {
    if (!value || value.trim() === '') {
      return 'Relationship is required';
    }
    if (value.trim().length < 2) {
      return 'Relationship must be at least 2 characters';
    }
    return '';
  };

  /**
   * Validates optional phone2 - if provided, 10-15 digits
   */
  const validatePhone2 = (value: string): string => {
    if (!value || value.trim() === '') {
      return ''; // Optional field
    }
    // Remove common separators and spaces
    const cleanValue = value.replace(/[\s\-\+\(\)]/g, '');
    if (!/^\d{10,15}$/.test(cleanValue)) {
      return 'Phone number must be 10-15 digits';
    }
    return '';
  };

  // Field change handlers with validation
  const handleFieldChange = (field: keyof EmergencyContact, value: string) => {
    setLocalData({ ...localData, [field]: value });

    // Validate on change
    let error = '';
    switch (field) {
      case 'name':
        error = validateName(value);
        setErrors(prev => ({ ...prev, name: error }));
        break;
      case 'phone':
        error = validatePhone(value);
        setErrors(prev => ({ ...prev, phone: error }));
        break;
      case 'phone2':
        error = validatePhone2(value);
        setErrors(prev => ({ ...prev, phone2: error }));
        break;
      case 'relationship':
        error = validateRelationship(value);
        setErrors(prev => ({ ...prev, relationship: error }));
        break;
    }
  };

  const handleSave = () => {
    // Validate all fields before saving
    const newErrors: EmergencyContactErrors = {
      name: validateName(localData.name || ''),
      phone: validatePhone(localData.phone || ''),
      relationship: validateRelationship(localData.relationship || ''),
    };

    setErrors(newErrors);

    // Check if any errors exist
    if (Object.values(newErrors).some(error => error !== '')) {
      return; // Don't save if there are errors
    }

    Object.entries(localData).forEach(([key, value]) => {
      onChange(`emergencyContact.${key}`, value);
    });
    onSave();
  };

  const handleCancel = () => {
    setLocalData(data);
    setErrors({});
    onCancel();
  };

  const viewContent = (
    <div className="row">
      <div className="col-md-3 mb-3">
        <label className="text-muted small">Contact Name</label>
        <p className="mb-0 fw-medium">{data.name || '--'}</p>
      </div>
      <div className="col-md-3 mb-3">
        <label className="text-muted small">Phone 1</label>
        <p className="mb-0 fw-medium">{data.phone || '--'}</p>
      </div>
      <div className="col-md-3 mb-3">
        <label className="text-muted small">Phone 2</label>
        <p className="mb-0 fw-medium">{data.phone2 || '--'}</p>
      </div>
      <div className="col-md-3 mb-3">
        <label className="text-muted small">Relationship</label>
        <p className="mb-0 fw-medium">{data.relationship || '--'}</p>
      </div>
    </div>
  );

  const editContent = (
    <div className="row">
      <div className="col-md-3 mb-3">
        <label className="form-label">
          <RequiredLabel>Contact Name</RequiredLabel>
        </label>
        <input
          type="text"
          className={`form-control ${errors.name ? 'is-invalid' : ''}`}
          value={localData.name || ''}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Emergency contact name"
        />
        {errors.name && (
          <div className="invalid-feedback d-block">
            {errors.name}
          </div>
        )}
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label">
          <RequiredLabel>Phone 1</RequiredLabel>
        </label>
        <input
          type="tel"
          className={`form-control ${errors.phone ? 'is-invalid' : ''}`}
          value={localData.phone || ''}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          placeholder="Primary phone"
        />
        {errors.phone && (
          <div className="invalid-feedback d-block">
            {errors.phone}
          </div>
        )}
        <small className="text-muted">10-15 digits</small>
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label">Phone 2 (Optional)</label>
        <input
          type="tel"
          className={`form-control ${errors.phone2 ? 'is-invalid' : ''}`}
          value={localData.phone2 || ''}
          onChange={(e) => handleFieldChange('phone2', e.target.value)}
          placeholder="Secondary phone"
        />
        {errors.phone2 && (
          <div className="invalid-feedback d-block">
            {errors.phone2}
          </div>
        )}
        <small className="text-muted">10-15 digits</small>
      </div>
      <div className="col-md-3 mb-3">
        <label className="form-label">
          <RequiredLabel>Relationship</RequiredLabel>
        </label>
        <input
          type="text"
          className={`form-control ${errors.relationship ? 'is-invalid' : ''}`}
          value={localData.relationship || ''}
          onChange={(e) => handleFieldChange('relationship', e.target.value)}
          placeholder="e.g., Father, Mother, Spouse"
        />
        {errors.relationship && (
          <div className="invalid-feedback d-block">
            {errors.relationship}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <EditableSection
      title="Emergency Contact"
      isEditing={isEditing}
      onEdit={onEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      {viewContent}
    </EditableSection>
  );
};

export default EmergencyContactSection;
