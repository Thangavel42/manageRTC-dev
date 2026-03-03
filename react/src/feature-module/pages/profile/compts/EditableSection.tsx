/**
 * Editable Section Wrapper Component
 * Provides a consistent Edit/Save/Cancel interface for profile sections
 */

import React from 'react';

interface EditableSectionProps {
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children: React.ReactNode;
  editContent?: React.ReactNode; // Optional: different content for edit mode
  hideEditButton?: boolean; // For sections that shouldn't be editable (e.g., read-only sections)
  className?: string;
}

export const EditableSection: React.FC<EditableSectionProps> = ({
  title,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving = false,
  children,
  editContent,
  hideEditButton = false,
  className = '',
}) => {
  return (
    <div className={`border-bottom mb-4 pb-4 position-relative ${className}`}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <h6 className="mb-0">{title}</h6>
        {!hideEditButton && (
          <div className="btn-group btn-group-sm">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="btn btn-outline-success"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check me-1"></i>Save
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={onCancel}
                  disabled={saving}
                >
                  <i className="ti ti-x me-1"></i>Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={onEdit}
              >
                <i className="ti ti-edit me-1"></i>Edit
              </button>
            )}
          </div>
        )}
      </div>
      {isEditing && editContent ? editContent : children}
    </div>
  );
};

export default EditableSection;
