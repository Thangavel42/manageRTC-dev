/**
 * Wrapper component for Education Section with Edit/Save/Cancel buttons
 */

import React, { useEffect, useState } from 'react';
import { Profile } from '../../../../hooks/useProfileRest';
import { EditableSection } from './EditableSection';
import { EducationSection } from './EducationSection';

type Education = NonNullable<Profile['education']>[0];

interface EducationSectionWrapperProps {
  education: Education[];
  saving: boolean;
  onSave: (data: { education: Education[] }) => void;
}

export const EducationSectionWrapper: React.FC<EducationSectionWrapperProps> = ({
  education,
  saving,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localEducation, setLocalEducation] = useState<Education[]>(education);

  useEffect(() => {
    setLocalEducation(education);
  }, [education]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalEducation(education);
  };

  const handleSave = () => {
    onSave({ education: localEducation });
    setIsEditing(false);
  };

  return (
    <EditableSection
      title="Education"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      <EducationSection
        education={localEducation}
        isEditing={isEditing}
        onChange={setLocalEducation}
      />
    </EditableSection>
  );
};

export default EducationSectionWrapper;
