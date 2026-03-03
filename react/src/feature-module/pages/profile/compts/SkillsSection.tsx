/**
 * Skills & Additional Information Section - Editable
 * Handles skills array and bio/about text
 * Includes validation for skills format and bio length
 */

import React, { useEffect, useState } from 'react';
import { EditableSection } from './EditableSection';

interface SkillsData {
  skills?: string[];
  bio?: string;
  about?: string;
}

interface SkillsSectionProps {
  data: SkillsData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onChange: (field: string, value: any) => void;
}

// Validation error state interface
interface SkillsErrors {
  skills?: string;
  bio?: string;
}

// RequiredLabel component for marking required fields
const RequiredLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <>
    {children}
    {required && <span className="text-danger ms-1">*</span>}
  </>
);

export const SkillsSection: React.FC<SkillsSectionProps> = ({
  data,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onChange,
}) => {
  const [localData, setLocalData] = React.useState<SkillsData>(data);
  const [errors, setErrors] = useState<SkillsErrors>({});

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  // Validation functions
  /**
   * Validates skills - checks format (comma-separated)
   * Each skill should be min 2 characters if provided
   */
  const validateSkills = (skillsString: string): string => {
    if (!skillsString || skillsString.trim() === '') {
      return ''; // Skills are optional
    }

    const skillsArray = skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (skillsArray.length === 0) {
      return ''; // Empty is valid
    }

    // Check if any skill is too short
    const invalidSkills = skillsArray.filter(s => s.length < 2);
    if (invalidSkills.length > 0) {
      return `Skills must be at least 2 characters each: ${invalidSkills.join(', ')}`;
    }

    // Check if too many skills
    if (skillsArray.length > 50) {
      return 'Maximum 50 skills allowed';
    }

    return '';
  };

  /**
   * Validates bio - max 500 characters
   */
  const validateBio = (value: string): string => {
    if (value && value.length > 500) {
      return `Bio is too long (${value.length}/500 characters)`;
    }
    return '';
  };

  // Field change handlers with validation
  const handleSkillsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const skillsString = e.target.value;
    const skillsArray = skillsString.split(',').map(s => s.trim()).filter(s => s.length > 0);
    setLocalData({ ...localData, skills: skillsArray });

    // Validate on change
    const error = validateSkills(skillsString);
    setErrors(prev => ({ ...prev, skills: error }));
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalData({ ...localData, bio: value, about: value });

    // Validate on change
    const error = validateBio(value);
    setErrors(prev => ({ ...prev, bio: error }));
  };

  const handleSave = () => {
    const skillsString = (localData.skills || []).join(', ');
    const bioValue = localData.bio || localData.about || '';

    // Validate before saving
    const newErrors: SkillsErrors = {
      skills: validateSkills(skillsString),
      bio: validateBio(bioValue),
    };

    setErrors(newErrors);

    // Check if any errors exist
    if (Object.values(newErrors).some(error => error !== '')) {
      return; // Don't save if there are errors
    }

    // Update skills
    onChange('skills', localData.skills || []);
    // Update bio (prefer bio over about, but set both for compatibility)
    onChange('bio', bioValue);
    onChange('about', bioValue);
    onSave();
  };

  const handleCancel = () => {
    setLocalData(data);
    setErrors({});
    onCancel();
  };

  const skillsString = (localData.skills || []).join(', ');

  const viewContent = (
    <div className="row">
      <div className="col-md-12 mb-3">
        <label className="text-muted small">Skills</label>
        {data.skills && data.skills.length > 0 ? (
          <div className="d-flex flex-wrap gap-2">
            {data.skills.map((skill, index) => (
              <span key={index} className="badge bg-light text-dark border">
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-0 fw-medium">--</p>
        )}
      </div>
      <div className="col-md-12">
        <label className="text-muted small">Bio</label>
        <p className="mb-0 fw-medium">{data.bio || data.about || '--'}</p>
      </div>
    </div>
  );

  const editContent = (
    <div className="row">
      <div className="col-md-12 mb-3">
        <label className="form-label">
          <RequiredLabel required={false}>Skills</RequiredLabel>
        </label>
        <textarea
          className={`form-control ${errors.skills ? 'is-invalid' : ''}`}
          rows={3}
          value={skillsString}
          onChange={handleSkillsChange}
          placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
        />
        {errors.skills && (
          <div className="invalid-feedback d-block">
            {errors.skills}
          </div>
        )}
        <small className="text-muted">
          Separate multiple skills with commas. Max 50 skills. Each skill must be at least 2 characters.
        </small>
      </div>
      <div className="col-md-12">
        <label className="form-label">
          <RequiredLabel required={false}>Bio</RequiredLabel>
        </label>
        <textarea
          className={`form-control ${errors.bio ? 'is-invalid' : ''}`}
          rows={4}
          value={localData.bio || localData.about || ''}
          onChange={handleBioChange}
          placeholder="Write a brief description about yourself..."
          maxLength={500}
        />
        {errors.bio && (
          <div className="invalid-feedback d-block">
            {errors.bio}
          </div>
        )}
        <div className="d-flex justify-content-between">
          <small className="text-muted">Brief description about yourself (optional)</small>
          <small className={`text-muted ${(localData.bio || localData.about || '').length > 450 ? 'text-warning' : ''}`}>
            {(localData.bio || localData.about || '').length}/500 characters
          </small>
        </div>
      </div>
    </div>
  );

  return (
    <EditableSection
      title="Additional Information"
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

export default SkillsSection;
