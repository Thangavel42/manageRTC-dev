/**
 * Social Links Section - Editable
 * Handles LinkedIn, Twitter, Facebook, Instagram
 * Includes validation for URL format
 */

import React, { useEffect, useState } from 'react';
import { EditableSection } from './EditableSection';

interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

interface SocialLinksSectionProps {
  data: SocialLinks;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onChange: (field: string, value: any) => void;
}

// Validation error state interface
interface SocialLinksErrors {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

// RequiredLabel component for marking required fields (all optional here)
const RequiredLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <>
    {children}
    {required && <span className="text-danger ms-1">*</span>}
  </>
);

/**
 * Validates URL format
 * Returns empty string if valid or empty, error message otherwise
 */
const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === '') return true; // Optional field

  try {
    const urlObj = new URL(url);
    // Check for valid protocol
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Platform-specific URL validation
 * Checks if URL matches expected format for each platform
 */
const isValidPlatformUrl = (platform: string, url: string): boolean => {
  if (!url || url.trim() === '') return true; // Optional field

  const lowerUrl = url.toLowerCase();

  switch (platform) {
    case 'linkedin':
      return lowerUrl.includes('linkedin.com');
    case 'twitter':
      return lowerUrl.includes('twitter.com') || lowerUrl.includes('x.com');
    case 'facebook':
      return lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com');
    case 'instagram':
      return lowerUrl.includes('instagram.com');
    default:
      return true;
  }
};

export const SocialLinksSection: React.FC<SocialLinksSectionProps> = ({
  data,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onChange,
}) => {
  const [localData, setLocalData] = React.useState<SocialLinks>(data);
  const [errors, setErrors] = useState<SocialLinksErrors>({});

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Validation functions
  /**
   * Validates a social media URL
   */
  const validateSocialUrl = (platform: string, value: string): string => {
    if (!value || value.trim() === '') {
      return ''; // Optional field
    }

    // Check URL format
    if (!isValidUrl(value)) {
      return 'Please enter a valid URL (e.g., https://linkedin.com/in/username)';
    }

    // Check platform-specific format
    if (!isValidPlatformUrl(platform, value)) {
      return `This doesn't appear to be a valid ${platform.charAt(0).toUpperCase() + platform.slice(1)} URL`;
    }

    return '';
  };

  // Field change handlers with validation
  const handleFieldChange = (platform: keyof SocialLinks, value: string) => {
    setLocalData({ ...localData, [platform]: value });

    // Validate on change (with debounce for better UX)
    const error = validateSocialUrl(platform, value);
    setErrors(prev => ({ ...prev, [platform]: error }));
  };

  const handleSave = () => {
    // Validate all fields before saving
    const newErrors: SocialLinksErrors = {
      linkedin: validateSocialUrl('linkedin', localData.linkedin || ''),
      twitter: validateSocialUrl('twitter', localData.twitter || ''),
      facebook: validateSocialUrl('facebook', localData.facebook || ''),
      instagram: validateSocialUrl('instagram', localData.instagram || ''),
    };

    setErrors(newErrors);

    // Check if any errors exist
    if (Object.values(newErrors).some(error => error !== '')) {
      return; // Don't save if there are errors
    }

    Object.entries(localData).forEach(([key, value]) => {
      onChange(`socialLinks.${key}`, value);
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
      <div className="col-md-6 mb-3">
        <label className="text-muted small">
          <i className="ti ti-brand-linkedin text-primary me-1"></i>LinkedIn
        </label>
        <p className="mb-0 fw-medium text-break">
          {data.linkedin ? (
            <a href={data.linkedin} target="_blank" rel="noopener noreferrer" className="text-primary">
              {data.linkedin}
            </a>
          ) : '--'}
        </p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">
          <i className="ti ti-brand-twitter text-info me-1"></i>Twitter
        </label>
        <p className="mb-0 fw-medium text-break">
          {data.twitter ? (
            <a href={data.twitter} target="_blank" rel="noopener noreferrer" className="text-info">
              {data.twitter}
            </a>
          ) : '--'}
        </p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">
          <i className="ti ti-brand-facebook text-primary me-1"></i>Facebook
        </label>
        <p className="mb-0 fw-medium text-break">
          {data.facebook ? (
            <a href={data.facebook} target="_blank" rel="noopener noreferrer" className="text-primary">
              {data.facebook}
            </a>
          ) : '--'}
        </p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">
          <i className="ti ti-brand-instagram text-danger me-1"></i>Instagram
        </label>
        <p className="mb-0 fw-medium text-break">
          {data.instagram ? (
            <a href={data.instagram} target="_blank" rel="noopener noreferrer" className="text-danger">
              {data.instagram}
            </a>
          ) : '--'}
        </p>
      </div>
    </div>
  );

  const editContent = (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <i className="ti ti-brand-linkedin text-primary me-1"></i>
          <RequiredLabel required={false}>LinkedIn</RequiredLabel>
        </label>
        <input
          type="url"
          className={`form-control ${errors.linkedin ? 'is-invalid' : ''}`}
          value={localData.linkedin || ''}
          onChange={(e) => handleFieldChange('linkedin', e.target.value)}
          placeholder="https://linkedin.com/in/username"
        />
        {errors.linkedin && (
          <div className="invalid-feedback d-block">
            {errors.linkedin}
          </div>
        )}
        <small className="text-muted">e.g., https://linkedin.com/in/username</small>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <i className="ti ti-brand-twitter text-info me-1"></i>
          <RequiredLabel required={false}>Twitter</RequiredLabel>
        </label>
        <input
          type="url"
          className={`form-control ${errors.twitter ? 'is-invalid' : ''}`}
          value={localData.twitter || ''}
          onChange={(e) => handleFieldChange('twitter', e.target.value)}
          placeholder="https://twitter.com/username"
        />
        {errors.twitter && (
          <div className="invalid-feedback d-block">
            {errors.twitter}
          </div>
        )}
        <small className="text-muted">e.g., https://twitter.com/username</small>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <i className="ti ti-brand-facebook text-primary me-1"></i>
          <RequiredLabel required={false}>Facebook</RequiredLabel>
        </label>
        <input
          type="url"
          className={`form-control ${errors.facebook ? 'is-invalid' : ''}`}
          value={localData.facebook || ''}
          onChange={(e) => handleFieldChange('facebook', e.target.value)}
          placeholder="https://facebook.com/username"
        />
        {errors.facebook && (
          <div className="invalid-feedback d-block">
            {errors.facebook}
          </div>
        )}
        <small className="text-muted">e.g., https://facebook.com/username</small>
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">
          <i className="ti ti-brand-instagram text-danger me-1"></i>
          <RequiredLabel required={false}>Instagram</RequiredLabel>
        </label>
        <input
          type="url"
          className={`form-control ${errors.instagram ? 'is-invalid' : ''}`}
          value={localData.instagram || ''}
          onChange={(e) => handleFieldChange('instagram', e.target.value)}
          placeholder="https://instagram.com/username"
        />
        {errors.instagram && (
          <div className="invalid-feedback d-block">
            {errors.instagram}
          </div>
        )}
        <small className="text-muted">e.g., https://instagram.com/username</small>
      </div>
    </div>
  );

  return (
    <EditableSection
      title="Social Links"
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

export default SocialLinksSection;
