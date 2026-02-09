/**
 * Family Section Component
 * Displays and edits family information: Name, Relationship, Phone
 * Supports add/remove family member entries
 */

import React from 'react';
import { PermissionField } from '../../../../core/components/PermissionField';
import { Profile } from '../../../../hooks/useProfileRest';

// Use the same Family type as in Profile interface
type FamilyMember = NonNullable<Profile['family']>[0];

interface FamilySectionProps {
  family: FamilyMember[];
  isEditing: boolean;
  onChange: (family: FamilyMember[]) => void;
}

// Relationship options
const relationshipOptions = [
  { value: '', label: 'Select' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Grandfather', label: 'Grandfather' },
  { value: 'Grandmother', label: 'Grandmother' },
  { value: 'Uncle', label: 'Uncle' },
  { value: 'Aunt', label: 'Aunt' },
  { value: 'Cousin', label: 'Cousin' },
  { value: 'Other', label: 'Other' }
];

export const FamilySection: React.FC<FamilySectionProps> = ({
  family,
  isEditing,
  onChange
}) => {
  // Local family state for editing (at component level)
  const [localFamily, setLocalFamily] = React.useState<FamilyMember[]>(
    family && family.length > 0 ? family : [{ name: '', relationship: '', phone: '' }]
  );

  // Update local state when family prop changes
  React.useEffect(() => {
    if (family && family.length > 0) {
      setLocalFamily(family);
    }
  }, [family]);

  const renderViewMode = () => (
    <div className="border-bottom mb-4 pb-4">
      <h6 className="mb-3">Family</h6>
      {!family || family.length === 0 ? (
        <p className="text-muted mb-0">No family information available</p>
      ) : (
        <div className="row">
          {family.map((fam, index) => (
            <div className="col-md-6 mb-3" key={index}>
              <div className="card bg-light">
                <div className="card-body">
                  <p className="mb-1 fw-medium">{fam.name || 'N/A'}</p>
                  <p className="mb-0 text-muted small">
                    {fam.relationship || 'N/A'} {fam.phone && `• ${fam.phone}`}
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
      setLocalFamily([...localFamily, { name: '', relationship: '', phone: '' }]);
    };

    const handleRemove = (index: number) => {
      if (localFamily.length > 1) {
        const newFamily = localFamily.filter((_, i) => i !== index);
        setLocalFamily(newFamily);
        onChange(newFamily);
      }
    };

    const handleChange = (index: number, field: keyof FamilyMember, value: string) => {
      const newFamily = [...localFamily];
      newFamily[index] = { ...newFamily[index], [field]: value };
      setLocalFamily(newFamily);
      onChange(newFamily);
    };

    return (
      <PermissionField field="family" editMode={true}>
        <div className="border-bottom mb-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">Family</h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={handleAdd}
            >
              <i className="ti ti-plus me-1"></i>Add Family Member
            </button>
          </div>

          <div className="row">
            {localFamily.map((fam, index) => (
              <div className="col-md-6" key={index}>
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h6 className="mb-0">Family Member #{index + 1}</h6>
                      {localFamily.length > 1 && (
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
                      <div className="col-md-12 mb-3">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={fam.name || ''}
                          onChange={(e) => handleChange(index, 'name', e.target.value)}
                          placeholder="Full name"
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">Relationship</label>
                        <select
                          className="form-select"
                          value={fam.relationship || ''}
                          onChange={(e) => handleChange(index, 'relationship', e.target.value)}
                        >
                          {relationshipOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-6 mb-0">
                        <label className="form-label">Phone</label>
                        <input
                          type="tel"
                          className="form-control"
                          value={fam.phone || ''}
                          onChange={(e) => handleChange(index, 'phone', e.target.value)}
                          placeholder="Contact number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PermissionField>
    );
  };

  return isEditing ? renderEditMode() : renderViewMode();
};

export default FamilySection;
