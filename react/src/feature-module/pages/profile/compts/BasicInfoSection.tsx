/**
 * Basic Information Section - Editable
 * Handles First Name, Last Name, Email (read-only), Phone, Date of Birth, Gender
 */

import React, { useEffect } from 'react';
import CommonSelect from '../../../../core/common/commonSelect';
import { EditableSection } from './EditableSection';

interface BasicInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: string;
  profilePhoto?: string;
}

interface BasicInfoSectionProps {
  data: BasicInfo;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  onChange: (field: string, value: any) => void;
}

const genderOptions = [
  { value: "Select", label: "Select" },
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  data,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  saving,
  onChange,
}) => {
  // Local state for editing
  const [localData, setLocalData] = React.useState<BasicInfo>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleSave = () => {
    // Call parent's save with updated data
    Object.entries(localData).forEach(([key, value]) => {
      onChange(key, value);
    });
    onSave();
  };

  const handleCancel = () => {
    setLocalData(data);
    onCancel();
  };

  const viewContent = (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="text-muted small">First Name</label>
        <p className="mb-0 fw-medium">{data.firstName || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Last Name</label>
        <p className="mb-0 fw-medium">{data.lastName || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Email</label>
        <p className="mb-0 fw-medium">{data.email || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Phone</label>
        <p className="mb-0 fw-medium">{data.phone || '--'}</p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Date of Birth</label>
        <p className="mb-0 fw-medium">
          {data.dateOfBirth ? new Date(data.dateOfBirth).toLocaleDateString() : '--'}
        </p>
      </div>
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Gender</label>
        <p className="mb-0 fw-medium">{data.gender || '--'}</p>
      </div>
    </div>
  );

  const editContent = (
    <div className="row">
      <div className="col-md-6 mb-3">
        <label className="form-label">First Name *</label>
        <input
          type="text"
          className="form-control"
          value={localData.firstName || ''}
          onChange={(e) => setLocalData({ ...localData, firstName: e.target.value })}
          required
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">Last Name *</label>
        <input
          type="text"
          className="form-control"
          value={localData.lastName || ''}
          onChange={(e) => setLocalData({ ...localData, lastName: e.target.value })}
          required
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">Email *</label>
        <input
          type="email"
          className="form-control-plaintext bg-light px-2 rounded"
          value={localData.email || '--'}
          readOnly
          disabled
          title="Email cannot be changed. Please contact HR for assistance."
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">Phone</label>
        <input
          type="tel"
          className="form-control"
          value={localData.phone || ''}
          onChange={(e) => setLocalData({ ...localData, phone: e.target.value })}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">Date of Birth</label>
        <input
          type="date"
          className="form-control"
          value={localData.dateOfBirth ? new Date(localData.dateOfBirth).toISOString().split('T')[0] : ''}
          onChange={(e) => setLocalData({ ...localData, dateOfBirth: e.target.value })}
          max={new Date(new Date().setFullYear(new Date().getFullYear() - 15)).toISOString().split('T')[0]}
        />
      </div>
      <div className="col-md-6 mb-3">
        <label className="form-label">Gender</label>
        <CommonSelect
          className="select"
          options={genderOptions}
          defaultValue={genderOptions.find(option => option.value === localData.gender) || genderOptions[0]}
          onChange={(option: any) => setLocalData({ ...localData, gender: option.value })}
        />
      </div>
    </div>
  );

  return (
    <EditableSection
      title="Basic Information"
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

export default BasicInfoSection;
