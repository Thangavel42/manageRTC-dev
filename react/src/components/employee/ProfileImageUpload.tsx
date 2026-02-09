/**
 * Employee Profile Image Upload Component
 * Handles profile image upload for employees
 */

import { CameraOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { Avatar, Button, message, Modal, Upload } from 'antd';
import { useRef, useState } from 'react';
import { useEmployeesREST } from '../../hooks/useEmployeesREST';

export interface ProfileImageUploadProps {
  employeeId: string;
  currentImage?: string | null;
  employeeName?: string;
  size?: number;
  readonly?: boolean;
  onUploadComplete?: (imageUrl: string) => void;
  onDeleteComplete?: () => void;
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  employeeId,
  currentImage,
  employeeName = 'Employee',
  size = 80,
  readonly = false,
  onUploadComplete,
  onDeleteComplete
}) => {
  const { uploadProfileImage, deleteProfileImage } = useEmployeesREST();
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getImageUrl = (url: string | null | undefined): string => {
    if (!url) return '';

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Otherwise, construct the backend URL
    const baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      message.error('Only JPEG, PNG, and WebP images are allowed');
      return false;
    }

    // Validate file size (4MB)
    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error('Image must be smaller than 4MB');
      return false;
    }

    setUploading(true);
    try {
      const result = await uploadProfileImage(employeeId, file);

      if (result.success && result.profileImage) {
        onUploadComplete?.(result.profileImage);
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }

    return false; // Prevent auto upload
  };

  const handleDelete = async () => {
    Modal.confirm({
      title: 'Remove Profile Photo',
      content: 'Are you sure you want to remove this profile photo?',
      okText: 'Yes, remove it',
      okType: 'danger',
      cancelText: 'No, keep it',
      onOk: async () => {
        try {
          const success = await deleteProfileImage(employeeId);
          if (success) {
            onDeleteComplete?.();
          }
        } catch (error: any) {
          message.error(error?.message || 'Failed to remove image');
        }
      }
    });
  };

  const handlePreview = () => {
    const url = getImageUrl(currentImage);
    if (url) {
      setPreviewImage(url);
      setPreviewOpen(true);
    }
  };

  const uploadButtonProps: UploadProps = {
    beforeUpload: handleFileSelect,
    showUploadList: false,
    disabled: uploading || readonly,
    accept: 'image/jpeg,image/jpg,image/png,image/webp'
  };

  const avatarUrl = getImageUrl(currentImage);
  const hasImage = !!avatarUrl;

  return (
    <div className="profile-image-upload" style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar
        size={size}
        src={hasImage ? avatarUrl : undefined}
        alt={employeeName}
        icon={!hasImage && <UserOutlined />}
        style={{
          cursor: hasImage && !readonly ? 'pointer' : 'default',
          backgroundColor: '#1890ff'
        }}
        onClick={hasImage && !readonly ? handlePreview : undefined}
      />

      {!readonly && (
        <>
          <Upload {...uploadButtonProps}>
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<CameraOutlined />}
              loading={uploading}
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                zIndex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
          </Upload>

          {hasImage && (
            <Button
              type="primary"
              danger
              shape="circle"
              size="small"
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              style={{
                position: 'absolute',
                bottom: -4,
                right: 30,
                zIndex: 1,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            />
          )}
        </>
      )}

      <Modal
        open={previewOpen}
        title={employeeName}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
        centered
        width="fit-content"
      >
        <img
          alt={employeeName}
          style={{ width: '100%', maxWidth: 400, maxHeight: 400, objectFit: 'contain' }}
          src={previewImage}
        />
      </Modal>

      {/* Hidden file input for programmatic access */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
        }}
      />
    </div>
  );
};

export default ProfileImageUpload;
