/**
 * Change Request Modal Component
 * Phase 5: Modal for submitting change requests for sensitive profile fields
 * Shows old value, new value input, and reason field
 * Integrates with useChangeRequestREST hook
 */

import { Alert, Button, Form, Input, Modal } from 'antd';
import React, { useState } from 'react';
import { CreateChangeRequestInput, useChangeRequestREST } from '../../hooks/useChangeRequestREST';

const { TextArea } = Input;

interface ChangeRequestModalProps {
  visible: boolean;
  onClose: () => void;
  // Field information
  fieldType: 'bankDetails' | 'name' | 'phone' | 'address' | 'emergencyContact' | 'other';
  fieldLabel: string;
  fieldChanged: string; // dot-notation path
  oldValue: any;
  // Optional: pre-filled new value
  initialValue?: any;
  // Success callback
  onSuccess?: () => void;
}

export const ChangeRequestModal: React.FC<ChangeRequestModalProps> = ({
  visible,
  onClose,
  fieldType,
  fieldLabel,
  fieldChanged,
  oldValue,
  initialValue,
  onSuccess,
}) => {
  const { createChangeRequest, loading, myRequests } = useChangeRequestREST();

  const [form] = Form.useForm();
  const [newValue, setNewValue] = useState(initialValue || '');
  const [reason, setReason] = useState('');

  // Check if there's already a pending request for this field
  const hasPendingRequest = myRequests?.some(
    req => req.fieldChanged === fieldChanged && req.status === 'pending'
  );

  const handleSubmit = async () => {
    if (!newValue || newValue.trim() === '') {
      Modal.error({
        title: 'New Value Required',
        content: 'Please enter the new value.',
      });
      return;
    }

    if (!reason || reason.trim().length < 5) {
      Modal.error({
        title: 'Reason Required',
        content: 'Please provide a reason (minimum 5 characters) for this change request.',
      });
      return;
    }

    const input: CreateChangeRequestInput = {
      requestType: fieldType,
      fieldChanged,
      fieldLabel,
      newValue: newValue.trim(),
      reason: reason.trim(),
    };

    const success = await createChangeRequest(input);
    if (success) {
      form.resetFields();
      setNewValue('');
      setReason('');
      onSuccess?.();
      onClose();
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setNewValue('');
    setReason('');
    onClose();
  };

  // Render old value display based on type
  const renderOldValue = () => {
    if (oldValue === null || oldValue === undefined) {
      return <span className="text-muted">Not set</span>;
    }

    if (fieldChanged.includes('accountNumber')) {
      // Mask account number except last 4 digits
      const str = String(oldValue);
      if (str.length > 4) {
        return <code>{'*'.repeat(str.length - 4)}{str.slice(-4)}</code>;
      }
      return <code>{str}</code>;
    }

    if (typeof oldValue === 'object') {
      return <code>{JSON.stringify(oldValue)}</code>;
    }

    return <span>{oldValue}</span>;
  };

  return (
    <Modal
      title={
        <span>
          <i className="ti ti-file-description me-2"></i>
          Request Change: {fieldLabel}
        </span>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={hasPendingRequest}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </Button>,
      ]}
      width={600}
      destroyOnClose
    >
      {hasPendingRequest && (
        <Alert
          message="Pending Request Exists"
          description="You already have a pending change request for this field. Please wait for HR to review it before submitting another request."
          type="warning"
          showIcon
          className="mb-3"
        />
      )}

      <Alert
        message="Change Request Process"
        description="Your request will be reviewed by HR. Once approved, the change will be applied to your profile."
        type="info"
        showIcon
        className="mb-4"
      />

      <Form form={form} layout="vertical">
        {/* Current Value */}
        <Form.Item label="Current Value">
          <div className="p-3 bg-light rounded border">
            {renderOldValue()}
          </div>
        </Form.Item>

        {/* New Value */}
        <Form.Item
          label="New Value"
          required
          tooltip="Enter the new value you want to request"
        >
          {fieldChanged.includes('accountNumber') || fieldChanged.includes('ifscCode') ? (
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Enter new ${fieldLabel.toLowerCase()}`}
              disabled={loading || hasPendingRequest}
            />
          ) : fieldChanged.includes('branch') || fieldChanged.includes('bankName') ? (
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Enter new ${fieldLabel.toLowerCase()}`}
              disabled={loading || hasPendingRequest}
            />
          ) : (
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={`Enter new ${fieldLabel.toLowerCase()}`}
              disabled={loading || hasPendingRequest}
            />
          )}
        </Form.Item>

        {/* Reason */}
        <Form.Item
          label="Reason for Change"
          required
          tooltip="Please explain why this change is needed (minimum 5 characters)"
        >
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., My bank account has changed. I've updated my salary details with the new account number."
            rows={4}
            disabled={loading || hasPendingRequest}
            minLength={5}
          />
        </Form.Item>

        {/* Info Note */}
        <div className="text-muted small">
          <i className="ti ti-info-circle me-1"></i>
          This request will be sent to HR for approval. You will be notified once it's reviewed.
        </div>
      </Form>
    </Modal>
  );
};

export default ChangeRequestModal;
