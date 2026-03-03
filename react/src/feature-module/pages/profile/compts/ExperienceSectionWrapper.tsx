/**
 * Wrapper component for Experience Section with Edit/Save/Cancel buttons
 */

import React, { useEffect, useState } from 'react';
import { Profile } from '../../../../hooks/useProfileRest';
import { EditableSection } from './EditableSection';
import { ExperienceSection } from './ExperienceSection';

type Experience = NonNullable<Profile['experience']>[0];

interface ExperienceSectionWrapperProps {
  experience: Experience[];
  saving: boolean;
  onSave: (data: { experience: Experience[] }) => void;
}

export const ExperienceSectionWrapper: React.FC<ExperienceSectionWrapperProps> = ({
  experience,
  saving,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localExperience, setLocalExperience] = useState<Experience[]>(experience);

  useEffect(() => {
    setLocalExperience(experience);
  }, [experience]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalExperience(experience);
  };

  const handleSave = () => {
    onSave({ experience: localExperience });
    setIsEditing(false);
  };

  return (
    <EditableSection
      title="Work Experience"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      <ExperienceSection
        experience={localExperience}
        isEditing={isEditing}
        onChange={setLocalExperience}
      />
    </EditableSection>
  );
};

export default ExperienceSectionWrapper;
