/**
 * Education Section Component
 * Displays and edits education information: Degree, Institution, Year, Field
 * Supports add/remove education entries
 */

import React from 'react';
import { PermissionField } from '../../../../core/components/PermissionField';
import { Profile } from '../../../../hooks/useProfileRest';

// Use the same Education type as in Profile interface
type Education = NonNullable<Profile['education']>[0];

interface EducationSectionProps {
  education: Education[];
  isEditing: boolean;
  onChange: (education: Education[]) => void;
}

export const EducationSection: React.FC<EducationSectionProps> = ({
  education,
  isEditing,
  onChange
}) => {
  // Local education state for editing (at component level)
  const [localEducation, setLocalEducation] = React.useState<Education[]>(
    education && education.length > 0 ? education : [{ degree: '', institution: '', year: undefined, field: '' }]
  );

  // Update local state when education prop changes
  React.useEffect(() => {
    if (education && education.length > 0) {
      setLocalEducation(education);
    }
  }, [education]);

  // Format year for display
  const formatYear = (year?: number | string): string => {
    if (!year) return 'N/A';
    return String(year);
  };

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Education</h6>
      {!education || education.length === 0 ? (
        <p className="text-muted mb-0">No education information available</p>
      ) : (
        <div className="row">
          {education.map((edu, index) => (
            <div className="col-md-12 mb-3" key={index}>
              <div className="card bg-light">
                <div className="card-body">
                  <p className="mb-1 fw-medium">{edu.degree || 'N/A'} {edu.field && `in ${edu.field}`}</p>
                  <p className="mb-0 text-muted small">
                    {edu.institution || 'N/A'} {edu.year && `(${formatYear(edu.year)})`}
                  </p>
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
      setLocalEducation([...localEducation, { degree: '', institution: '', year: undefined, field: '' }]);
    };

    const handleRemove = (index: number) => {
      if (localEducation.length > 1) {
        const newEducation = localEducation.filter((_, i) => i !== index);
        setLocalEducation(newEducation);
        onChange(newEducation);
      }
    };

    const handleChange = (index: number, field: keyof Education, value: string) => {
      const newEducation = [...localEducation];
      // Convert year to number if it's the year field
      const processedValue = field === 'year' && value ? parseInt(value, 10) || 0 : value;
      newEducation[index] = { ...newEducation[index], [field]: processedValue };
      setLocalEducation(newEducation);
      onChange(newEducation);
    };

    return (
      <PermissionField field="education" editMode={true}>
        <div className="border-bottom mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Education</h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={handleAdd}
            >
              <i className="ti ti-plus me-1"></i>Add Education
            </button>
          </div>

          {localEducation.map((edu, index) => (
            <div key={index} className="card mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h6 className="mb-0">Education #{index + 1}</h6>
                  {localEducation.length > 1 && (
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
                    <label className="form-label">Degree/Certificate</label>
                    <input
                      type="text"
                      className="form-control"
                      value={edu.degree || ''}
                      onChange={(e) => handleChange(index, 'degree', e.target.value)}
                      placeholder="e.g., Bachelor of Science"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Field of Study</label>
                    <input
                      type="text"
                      className="form-control"
                      value={edu.field || ''}
                      onChange={(e) => handleChange(index, 'field', e.target.value)}
                      placeholder="e.g., Computer Science"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Institution/University</label>
                    <input
                      type="text"
                      className="form-control"
                      value={edu.institution || ''}
                      onChange={(e) => handleChange(index, 'institution', e.target.value)}
                      placeholder="e.g., MIT, Stanford"
                    />
                  </div>

                  <div className="col-md-6 mb-3">
                    <label className="form-label">Year of Completion</label>
                    <input
                      type="number"
                      className="form-control"
                      value={edu.year ?? ''}
                      onChange={(e) => handleChange(index, 'year', e.target.value)}
                      placeholder="e.g., 2020"
                      min="1950"
                      max={new Date().getFullYear() + 5}
                    />
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

export default EducationSection;
