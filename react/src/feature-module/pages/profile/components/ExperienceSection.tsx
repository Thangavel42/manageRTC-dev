/**
 * Experience Section Component
 * Displays and edits work experience: Company, Position, Start Date, End Date, Current
 * Supports add/remove experience entries
 */

import React from 'react';
import { PermissionField } from '../../../../core/components/PermissionField';
import { Profile } from '../../../../hooks/useProfileRest';

// Use the same Experience type as in Profile interface
type Experience = NonNullable<Profile['experience']>[0];

interface ExperienceSectionProps {
  experience: Experience[];
  isEditing: boolean;
  onChange: (experience: Experience[]) => void;
}

export const ExperienceSection: React.FC<ExperienceSectionProps> = ({
  experience,
  isEditing,
  onChange
}) => {
  // Local experience state for editing (at component level)
  const [localExperience, setLocalExperience] = React.useState<Experience[]>(
    experience && experience.length > 0 ? experience : [{ company: '', position: '', startDate: '', endDate: '', current: false }]
  );

  // Update local state when experience prop changes
  React.useEffect(() => {
    if (experience && experience.length > 0) {
      setLocalExperience(experience);
    }
  }, [experience]);

  // Format date for display
  const formatDate = (date?: string | Date): string => {
    if (!date) return 'Present';
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return 'N/A';
    }
  };

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Work Experience</h6>
      {!experience || experience.length === 0 ? (
        <p className="text-muted mb-0">No work experience information available</p>
      ) : (
        <div className="row">
          {experience.map((exp, index) => (
            <div className="col-md-12 mb-3" key={index}>
              <div className="card bg-light">
                <div className="card-body d-flex justify-content-between align-items-start">
                  <div>
                    <p className="mb-1 fw-medium">
                      {exp.position || 'N/A'} {exp.company && `at ${exp.company}`}
                    </p>
                    <p className="mb-0 text-muted small">
                      {formatDate(exp.startDate)} - {' '}
                      {exp.current ? 'Present' : formatDate(exp.endDate)}
                    </p>
                  </div>
                  {exp.current && (
                    <span className="badge bg-success">Current</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditMode = () => {
    const handleAdd = () => {
      setLocalExperience([...localExperience, { company: '', position: '', startDate: '', endDate: '', current: false }]);
    };

    const handleRemove = (index: number) => {
      if (localExperience.length > 1) {
        const newExperience = localExperience.filter((_, i) => i !== index);
        setLocalExperience(newExperience);
        onChange(newExperience);
      }
    };

    const handleChange = (index: number, field: keyof Experience, value: any) => {
      const newExperience = [...localExperience];
      newExperience[index] = { ...newExperience[index], [field]: value };

      // If marking as current, clear end date
      if (field === 'current' && value === true) {
        newExperience[index].endDate = '';
      }

      setLocalExperience(newExperience);
      onChange(newExperience);
    };

    const formatInputDate = (date?: string | Date): string => {
      if (!date) return '';
      try {
        return new Date(date).toISOString().split('T')[0];
      } catch {
        return '';
      }
    };

    return (
      <PermissionField field="experience" editMode={true}>
        <div className="border-bottom mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Work Experience</h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={handleAdd}
            >
              <i className="ti ti-plus me-1"></i>Add Experience
            </button>
          </div>

          {localExperience.map((exp, index) => (
            <div key={index} className="card mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h6 className="mb-0">Experience #{index + 1}</h6>
                  {localExperience.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleRemove(index)}
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Position/Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={exp.position || ''}
                      onChange={(e) => handleChange(index, 'position', e.target.value)}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      className="form-control"
                      value={exp.company || ''}
                      onChange={(e) => handleChange(index, 'company', e.target.value)}
                      placeholder="e.g., Google, Microsoft"
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formatInputDate(exp.startDate)}
                      onChange={(e) => handleChange(index, 'startDate', e.target.value)}
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formatInputDate(exp.endDate)}
                      onChange={(e) => handleChange(index, 'endDate', e.target.value)}
                      disabled={exp.current}
                      min={exp.startDate ? formatInputDate(exp.startDate) : undefined}
                    />
                  </div>

                  <div className="col-md-4 mb-3">
                    <label className="form-label d-block">&nbsp;</label>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`current-${index}`}
                        checked={exp.current || false}
                        onChange={(e) => handleChange(index, 'current', e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor={`current-${index}`}>
                        Currently Working
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PermissionField>
    );
  };

  return isEditing ? renderEditMode() : renderViewMode();
};

export default ExperienceSection;
