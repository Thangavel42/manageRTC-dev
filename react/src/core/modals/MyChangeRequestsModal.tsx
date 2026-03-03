/**
 * My Change Requests Modal Component (User View)
 * Displays current user's own change requests with status tracking
 * Users can view their request status, see field statuses, and cancel pending requests
 *
 * Table Layout: Field | Existing Value | New Value | Status (read-only, no action buttons)
 */

import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, message, Modal, Progress, Tag, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import { ChangeRequest, FieldStatus, useChangeRequestREST } from '../../hooks/useChangeRequestREST';

interface MyChangeRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const MyChangeRequestsModal: React.FC<MyChangeRequestsModalProps> = ({
  visible,
  onClose,
  onRefresh,
}) => {
  const {
    myRequests,
    loading,
    fetchMyRequests,
    cancelChangeRequest,
  } = useChangeRequestREST();

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchMyRequests();
    }
  }, [visible, fetchMyRequests]);

  const handleCancel = async (requestId: string) => {
    Modal.confirm({
      title: 'Cancel Change Request',
      content: (
        <div>
          <p>Are you sure you want to cancel this change request?</p>
          <p className="small text-muted mb-2">
            Please provide a reason for cancellation (minimum 5 characters):
          </p>
          <input
            id="cancel-reason"
            type="text"
            className="form-control"
            placeholder="Reason for cancellation"
            minLength={5}
          />
        </div>
      ),
      okText: 'Yes, Cancel',
      okType: 'danger',
      onOk: async () => {
        const input = document.getElementById('cancel-reason') as HTMLInputElement;
        const reason = input?.value;
        if (!reason || reason.length < 5) {
          message.error('Please provide a reason (minimum 5 characters)');
          return Promise.reject();
        }

        setCancellingId(requestId);
        const success = await cancelChangeRequest(requestId, reason);
        setCancellingId(null);

        if (success) {
          onRefresh?.();
          await fetchMyRequests();
        }
        return Promise.resolve();
      },
    });
  };

  const getFieldStatusTag = (status: FieldStatus) => {
    switch (status) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="warning">Pending</Tag>;
      case 'approved':
        return <Tag icon={<CheckCircleOutlined />} color="success">Approved</Tag>;
      case 'rejected':
        return <Tag icon={<CloseCircleOutlined />} color="error">Rejected</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const maskSensitiveValue = (value: any, field: string) => {
    if (!value) return 'Not set';

    // For user modal, show full values so user can verify
    // If value is an object (nested field), handle it specially
    if (typeof value === 'object' && value !== null) {
      if (field.includes('accountNumber') && value.accountNumber) {
        return String(value.accountNumber);
      }
      // For other objects, return the relevant field value
      const fieldName = field.split('.').pop();
      if (value[fieldName]) {
        return String(value[fieldName]);
      }
      return JSON.stringify(value);
    }

    // String values - return as-is for user to see
    return String(value);
  };

  const renderRequestCard = (request: ChangeRequest) => {
    // Support legacy single-field requests
    const fields = request.fields && request.fields.length > 0
      ? request.fields
      : [{
        field: request.fieldChanged || 'unknown',
        label: request.fieldLabel || request.fieldChanged || 'Unknown',
        oldValue: request.oldValue,
        newValue: request.newValue,
        status: 'pending' as FieldStatus,
        reviewNote: null,
      }];

    const pendingCount = fields.filter(f => f.status === 'pending').length;
    const approvedCount = fields.filter(f => f.status === 'approved').length;
    const rejectedCount = fields.filter(f => f.status === 'rejected').length;
    const totalFields = fields.length;
    const canCancel = request.status === 'pending' && approvedCount === 0;

    return (
      <div key={request._id} className="mb-3 p-3 border rounded bg-light">
        {/* Request Header */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="fw-medium">
              Request submitted on {new Date(request.requestedAt).toLocaleDateString()}
            </div>
            <div className="small text-muted">
              {totalFields} field(s) • {approvedCount} approved, {rejectedCount} rejected, {pendingCount} pending
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            {request.status === 'pending' && (
              <Tag icon={<ClockCircleOutlined />} color="warning">Pending Review</Tag>
            )}
            {request.status === 'partially_approved' && (
              <Tag icon={<ClockCircleOutlined />} color="processing">In Review</Tag>
            )}
            {request.status === 'completed' && (
              <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>
            )}
            {request.status === 'cancelled' && (
              <Tag color="default">Cancelled</Tag>
            )}
            {canCancel && (
              <Tooltip title="Cancel this request">
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<StopOutlined />}
                  onClick={() => handleCancel(request._id)}
                  loading={cancellingId === request._id}
                >
                  Cancel
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Progress bar for multi-field requests */}
        {totalFields > 1 && (
          <div className="mb-3">
            <div className="d-flex justify-content-between small text-muted mb-1">
              <span>Review Progress</span>
              <span>{approvedCount} approved, {rejectedCount} rejected, {pendingCount} pending</span>
            </div>
            <Progress
              percent={Math.round(((approvedCount + rejectedCount) / totalFields) * 100)}
              status={pendingCount === 0 ? 'success' : 'active'}
              size="small"
            />
          </div>
        )}

        {/* Table for fields */}
        <div className="table-responsive mb-3">
          <table className="table table-bordered table-sm mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '25%' }}>Field</th>
                <th style={{ width: '30%' }}>Existing Value</th>
                <th style={{ width: '30%' }}>New Value</th>
                <th style={{ width: '15%' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="fw-medium">{field.label}</div>
                  </td>
                  <td>
                    <code className="small">{maskSensitiveValue(field.oldValue, field.field)}</code>
                  </td>
                  <td>
                    <code className={`small ${field.status === 'approved' ? 'text-success' :
                        field.status === 'rejected' ? 'text-danger' :
                          'text-primary'
                      }`}>
                      {maskSensitiveValue(field.newValue, field.field)}
                    </code>
                  </td>
                  <td>{getFieldStatusTag(field.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Employee Reason */}
        {request.reason && (
          <div className="mt-3 pt-3 border-top">
            <label className="small text-muted mb-1">Your Reason:</label>
            <div className="p-2 bg-white rounded border small">{request.reason}</div>
          </div>
        )}

        {/* Review Notes for rejected fields */}
        {rejectedCount > 0 && (
          <div className="mt-3 pt-3 border-top">
            <label className="small text-muted mb-1">HR Review Notes:</label>
            <div className="p-2 bg-danger bg-opacity-10 rounded border small">
              {fields
                .filter(f => f.status === 'rejected' && f.reviewNote)
                .map((f, i) => (
                  <div key={i} className="mb-1">
                    <strong>{f.label}:</strong> {f.reviewNote}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Cancellation reason */}
        {request.status === 'cancelled' && request.cancellationReason && (
          <Alert
            message={
              <small>
                <strong>Cancelled by {request.cancelledByName || 'User'}:</strong> {request.cancellationReason}
              </small>
            }
            type="error"
            className="mt-2 mb-0"
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      title={
        <span>
          <i className="ti ti-file-description me-2"></i>
          My Change Requests
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
      width={900}
      destroyOnClose
    >
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : myRequests.length === 0 ? (
        <Empty description="No pending change requests" />
      ) : (
        <div>
          <Alert
            message={
              <small>
                <i className="ti ti-info-circle me-1"></i>
                Track the status of your change requests here. You can cancel pending requests before HR reviews them.
              </small>
            }
            type="info"
            className="mb-3"
          />
          {myRequests.map(renderRequestCard)}
        </div>
      )}
    </Modal>
  );
};

export default MyChangeRequestsModal;
