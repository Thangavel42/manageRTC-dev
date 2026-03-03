/**
 * Wrapper component for Personal Information Section with Edit/Save/Cancel buttons
 */

import React, { useEffect, useState } from 'react';
import { PersonalInfoSection } from './PersonalInfoSection';
import { EditableSection } from './EditableSection';

interface PersonalInfo {
  passport?: {
    number?: string;
    expiryDate?: string | null;
    country?: string;
  };
  nationality?: string;
  religion?: string;
  maritalStatus?: string;
  noOfChildren?: number;
}

interface PersonalInfoSectionWrapperProps {
  personalInfo: PersonalInfo;
  saving: boolean;
  onSave: (data: { personal: PersonalInfo }) => void;
}

export const PersonalInfoSectionWrapper: React.FC<PersonalInfoSectionWrapperProps> = ({
  personalInfo,
  saving,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState<PersonalInfo>(personalInfo);

  useEffect(() => {
    setLocalData(personalInfo);
  }, [personalInfo]);

  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    setIsEditing(false);
    setLocalData(personalInfo);
  };

  const handleSave = () => {
    onSave({ personal: localData });
    setIsEditing(false);
  };

  return (
    <EditableSection
      title="Personal Information"
      isEditing={isEditing}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      saving={saving}
    >
      <PersonalInfoSection
        personalInfo={localData}
        isEditing={isEditing}
        onChange={(field: string, value: any) => {
          // Handle nested field changes
          if (field.includes('.')) {
            const parts = field.split('.');
            if (parts.length === 3) {
              const [parent, child, grandchild] = parts;
              setLocalData({
                ...localData,
                [parent]: {
                  ...(localData[parent as keyof PersonalInfo] as any),
                  [child]: {
                    ...((localData[parent as keyof PersonalInfo] as any)?.[child] || {}),
                    [grandchild]: value
                  }
                }
              });
            } else if (parts.length === 2) {
              const [parent, child] = parts;
              setLocalData({
                ...localData,
                [parent]: {
                  ...(localData[parent as keyof PersonalInfo] as any),
                  [child]: value
                }
              });
            }
          } else {
            setLocalData({ ...localData, [field]: value });
          }
        }}
      />
    </EditableSection>
  );
};

export default PersonalInfoSectionWrapper;
