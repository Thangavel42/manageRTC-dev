/**
 * Wrapper component for Family Section with Edit/Save/Cancel buttons
 */

import React, { useEffect, useState } from 'react';
import { Profile } from '../../../../hooks/useProfileRest';
import { EditableSection } from './EditableSection';
import { FamilySection } from './FamilySection';

type FamilyMember = NonNullable<Profile['family']>[0];

interface FamilySectionWrapperProps {
  family: FamilyMember[];
  saving: boolean;
  onSave: (data: { family: FamilyMember[] }) => void;
}

export const FamilySectionWrapper: React.FC<FamilySectionWrapperProps> = ({
  family,
  saving,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localFamily, setLocalFamily] = useState<FamilyMember[]>(family);

  useEffect(() => {
    setLocalFamily(family);
  }, [family]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalFamily(family);
  };

  const handleSave = () => {
    onSave({ family: localFamily });
    setIsEditing(false);
  };

  return (
    <EditableSection
      title="Family"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      <FamilySection
        family={localFamily}
        isEditing={isEditing}
        onChange={setLocalFamily}
      />
    </EditableSection>
  );
};

export default FamilySectionWrapper;
