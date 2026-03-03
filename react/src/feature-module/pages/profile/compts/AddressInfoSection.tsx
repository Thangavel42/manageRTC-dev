/**
 * Address Information Section - Editable
 * Handles street, country, state (dynamic from country), city, postal code
 * Uses react-country-state-city for dynamic country/state loading
 * Field order: Street → Country → State → City → Postal Code
 */

import React, { useEffect, useState } from 'react';
import { GetCountries, GetState } from 'react-country-state-city';
import { EditableSection } from './EditableSection';

interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

interface AddressInfoSectionProps {
  data: Address;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onChange: (field: string, value: any) => void;
}

// Validation error state interface
interface AddressErrors {
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

// RequiredLabel component for marking required fields
const RequiredLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    {children}
    <span className="text-danger ms-1">*</span>
  </>
);

export const AddressInfoSection: React.FC<AddressInfoSectionProps> = ({
  data,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onChange,
}) => {
  const [localData, setLocalData] = React.useState<Address>(data);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);

  // Load countries on mount
  useEffect(() => {
    GetCountries().then((result: any) => {
      setCountries(result);
    });
  }, []);

  // When data changes (opening edit mode with existing data), sync localData
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // When countries load and we have an existing country, load its states
  useEffect(() => {
    if (localData.country && countries.length > 0) {
      const match = countries.find((c: any) => c.name === localData.country);
      if (match) {
        setSelectedCountryId(match.id);
        GetState(match.id).then((result: any) => {
          setStates(result);
        });
      }
    }
  }, [countries, localData.country]);

  // Validation functions
  const validateCity = (value: string): string => {
    if (!value || value.trim() === '') return 'City is required';
    if (value.trim().length < 2) return 'City name must be at least 2 characters';
    return '';
  };

  const validateState = (value: string): string => {
    if (!value || value === 'Select' || value.trim() === '') return 'State is required';
    return '';
  };

  const validateCountry = (value: string): string => {
    if (!value || value === 'Select' || value.trim() === '') return 'Country is required';
    return '';
  };

  const validatePostalCode = (value: string): string => {
    if (!value || value.trim() === '') return 'Postal code is required';
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 10) return 'Postal code must be 3-10 characters';
    if (!/^[\w\s-]+$/.test(trimmed)) return 'Postal code contains invalid characters';
    return '';
  };

  // Country selection handler — loads states dynamically
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryId = e.target.value ? parseInt(e.target.value) : null;
    const selectedCountry = countries.find((c: any) => c.id === countryId);
    const countryName = selectedCountry?.name || '';

    setSelectedCountryId(countryId);
    setLocalData(prev => ({ ...prev, country: countryName, state: '' }));
    setErrors(prev => ({ ...prev, country: validateCountry(countryName), state: '' }));

    if (countryId) {
      GetState(countryId).then((result: any) => {
        setStates(result);
      });
    } else {
      setStates([]);
    }
  };

  const handleFieldChange = (field: keyof Address, value: string) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    let error = '';
    switch (field) {
      case 'city': error = validateCity(value); break;
      case 'state': error = validateState(value); break;
      case 'postalCode': error = validatePostalCode(value); break;
    }
    if (field !== 'street') {
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const handleSave = () => {
    const newErrors: AddressErrors = {
      country: validateCountry(localData.country || ''),
      state: validateState(localData.state || ''),
      city: validateCity(localData.city || ''),
      postalCode: validatePostalCode(localData.postalCode || ''),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(err => err !== '')) return;

    Object.entries(localData).forEach(([key, value]) => {
      onChange(`address.${key}`, value);
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
      <div className="col-md-12 mb-3">
        <label className="text-muted small">Street Address</label>
        <p className="mb-0 fw-medium">{data.street || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Country</label>
        <p className="mb-0 fw-medium">{data.country || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">State / Province</label>
        <p className="mb-0 fw-medium">{data.state || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">City</label>
        <p className="mb-0 fw-medium">{data.city || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Postal Code</label>
        <p className="mb-0 fw-medium">{data.postalCode || '--'}</p>
      </div>
    </div>
  );

  const editContent = (
    <div className="row">
      {/* Street Address — optional */}
      <div className="col-md-12 mb-3">
        <label className="form-label">Street Address</label>
        <input
          type="text"
          className="form-control"
          value={localData.street || ''}
          onChange={(e) => setLocalData(prev => ({ ...prev, street: e.target.value }))}
          placeholder="Enter street address (optional)"
        />
      </div>

      {/* Country — required, dynamic from API */}
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <RequiredLabel>Country</RequiredLabel>
        </label>
        <div className="input-icon-end position-relative">
          <select
            className={`form-select ${errors.country ? 'is-invalid' : ''}`}
            value={selectedCountryId || ''}
            onChange={handleCountryChange}
          >
            <option value="">Select Country</option>
            {countries.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="input-icon-addon">
            <i className="ti ti-chevron-down text-gray-7" />
          </span>
        </div>
        {errors.country && (
          <div className="invalid-feedback d-block">{errors.country}</div>
        )}
      </div>

      {/* State — required, loaded from selected country */}
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <RequiredLabel>State / Province</RequiredLabel>
        </label>
        <div className="input-icon-end position-relative">
          <select
            className={`form-select ${errors.state ? 'is-invalid' : ''}`}
            value={localData.state || ''}
            disabled={!selectedCountryId}
            onChange={(e) => handleFieldChange('state', e.target.value)}
          >
            <option value="">
              {selectedCountryId ? 'Select State' : 'Select Country first'}
            </option>
            {states.map((s: any) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
          <span className="input-icon-addon">
            <i className="ti ti-chevron-down text-gray-7" />
          </span>
        </div>
        {errors.state && (
          <div className="invalid-feedback d-block">{errors.state}</div>
        )}
      </div>

      {/* City — required, free-text */}
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <RequiredLabel>City</RequiredLabel>
        </label>
        <input
          type="text"
          className={`form-control ${errors.city ? 'is-invalid' : ''}`}
          value={localData.city || ''}
          onChange={(e) => handleFieldChange('city', e.target.value)}
          placeholder="Enter city"
        />
        {errors.city && (
          <div className="invalid-feedback d-block">{errors.city}</div>
        )}
      </div>

      {/* Postal Code — required */}
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <RequiredLabel>Postal Code</RequiredLabel>
        </label>
        <input
          type="text"
          className={`form-control ${errors.postalCode ? 'is-invalid' : ''}`}
          value={localData.postalCode || ''}
          onChange={(e) => handleFieldChange('postalCode', e.target.value)}
          placeholder="Enter postal code"
        />
        {errors.postalCode && (
          <div className="invalid-feedback d-block">{errors.postalCode}</div>
        )}
        <small className="text-muted">3-10 characters</small>
      </div>
    </div>
  );

  return (
    <EditableSection
      title="Address Information"
      isEditing={isEditing}
      onEdit={onEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      {isEditing ? editContent : viewContent}
    </EditableSection>
  );
};

export default AddressInfoSection;
