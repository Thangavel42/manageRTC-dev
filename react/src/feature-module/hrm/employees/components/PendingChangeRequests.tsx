/**
 * Pending Change Requests Component
 * Phase 7: HR-side panel for reviewing pending change requests from employees
 * Shows pending requests for a specific employee with approve/reject actions
 */

import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Modal, Space, Table, Tag, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import { ChangeRequest, useChangeRequestREST } from '../../../../hooks/useChangeRequestREST';

interface PendingChangeRequestsProps {
  employeeId?: string;
  employeeObjectId?: string;
  refreshTrigger?: number; // Trigger refetch when changed
  onRefresh?: () => void;
}

export const PendingChangeRequests: React.FC<PendingChangeRequestsProps> = ({
  employeeId,
  employeeObjectId,
  refreshTrigger,
  onRefresh,
}) => {
  const {
    allRequests,
    fetchAllRequests,
    approveChangeRequest,
    rejectChangeRequest,
    loading,
  } = useChangeRequestREST();

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  // Fetch pending requests for this employee
  useEffect(() => {
    if (employeeId) {
      fetchAllRequests({ status: 'pending', employeeId });
    }
  }, [employeeId, refreshTrigger, fetchAllRequests]);

  // Filter requests for this specific employee
  const employeeRequests = allRequests.filter(
    req => req.employeeId === employeeId && req.status === 'pending'
  );

  const openReviewModal = (request: ChangeRequest, reviewAction: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setAction(reviewAction);
    setReviewModalVisible(true);
  };

  const closeReviewModal = () => {
    setReviewModalVisible(false);
    setSelectedRequest(null);
    setAction(null);
    setReviewNote('');
  };

  const handleReviewSubmit = async () => {
    if (!selectedRequest) return;

    if (action === 'reject' && (!reviewNote || reviewNote.trim().length < 5)) {
      Modal.error({
        title: 'Review Note Required',
        content: 'Please provide a reason for rejecting this request (minimum 5 characters).',
      });
      return;
    }

    const success = action === 'approve'
      ? await approveChangeRequest(selectedRequest._id, { reviewNote: reviewNote || 'Approved' })
      : await rejectChangeRequest(selectedRequest._id, { reviewNote });

    if (success) {
      closeReviewModal();
      onRefresh?.();
      // Refresh the list
      fetchAllRequests({ status: 'pending', employeeId });
    }
  };

  const getStatusTag = (status: string) => {
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

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bankDetails: 'Bank Details',
      name: 'Name Change',
      phone: 'Phone Number',
      address: 'Address',
      emergencyContact: 'Emergency Contact',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const columns = [
    {
      title: 'Field',
      dataIndex: 'fieldLabel',
      key: 'fieldLabel',
      render: (label: string, record: ChangeRequest) => (
        <div>
          <div className="fw-medium">{label}</div>
          <small className="text-muted">{record.fieldChanged}</small>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'requestType',
      key: 'requestType',
      render: (type: string) => (
        <Tag color="blue">{getRequestTypeLabel(type)}</Tag>
      ),
    },
    {
      title: 'Old Value',
      dataIndex: 'oldValue',
      key: 'oldValue',
      render: (value: any, record: ChangeRequest) => {
        if (record.fieldChanged.includes('accountNumber') && value) {
          const str = String(value);
          if (str.length > 4) {
            return <code>{'*'.repeat(str.length - 4)}{str.slice(-4)}</code>;
          }
        }
        return value ? <code>{String(value)}</code> : <span className="text-muted">Not set</span>;
      },
    },
    {
      title: 'New Value',
      dataIndex: 'newValue',
      key: 'newValue',
      render: (value: any, record: ChangeRequest) => {
        if (record.fieldChanged.includes('accountNumber') && value) {
          const str = String(value);
          if (str.length > 4) {
            return <code className="text-success">{str.slice(-4)} (changed)</code>;
          }
        }
        return value ? <code className="text-success">{String(value)}</code> : <span className="text-muted">Not set</span>;
      },
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string) => (
        <Tooltip title={reason}>
          <span>{reason?.substring(0, 30)}{reason && reason.length > 30 ? '...' : ''}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Requested',
      dataIndex: 'requestedAt',
      key: 'requestedAt',
      render: (date: string | Date) => (
        <span>{date ? new Date(date).toLocaleDateString() : '--'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ChangeRequest) => (
        <Space>
          <Tooltip title="Approve this change request">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openReviewModal(record, 'approve')}
            >
              Approve
            </Button>
          </Tooltip>
          <Tooltip title="Reject this change request">
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => openReviewModal(record, 'reject')}
            >
              Reject
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (loading && employeeRequests.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6 className="mb-0">Pending Change Requests</h6>
        {employeeRequests.length > 0 && (
          <Tag color="warning" className="mb-0">
            {employeeRequests.length} {employeeRequests.length === 1 ? 'Request' : 'Requests'}
          </Tag>
        )}
      </div>

      {employeeRequests.length === 0 ? (
        <Alert
          message="No Pending Requests"
          description="This employee has no pending change requests."
          type="info"
          showIcon
        />
      ) : (
        <Table
          columns={columns}
          dataSource={employeeRequests}
          rowKey={(record) => record._id}
          pagination={false}
          size="small"
          className="mb-0"
        />
      )}

      {/* Review Modal */}
      <Modal
        title={
          <span>
            {action === 'approve' ? (
              <CheckCircleOutlined className="text-success me-2" />
            ) : (
              <CloseCircleOutlined className="text-danger me-2" />
            )}
            {action === 'approve' ? 'Approve' : 'Reject'} Change Request
          </span>
        }
        open={reviewModalVisible}
        onCancel={closeReviewModal}
        footer={[
          <Button key="cancel" onClick={closeReviewModal}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger={action !== 'approve'}
            onClick={handleReviewSubmit}
            loading={loading}
          >
            {action === 'approve' ? 'Approve Request' : 'Reject Request'}
          </Button>,
        ]}
      >
        {selectedRequest && (
          <div>
            <Alert
              message={action === 'approve' ? 'Approving will update employee profile' : 'This action cannot be undone'}
              description={
                action === 'approve'
                  ? `The employee's ${selectedRequest.fieldLabel} will be updated to the new value.`
                  : 'The employee will need to submit a new request if they still want to make this change.'
              }
              type={action === 'approve' ? 'info' : 'warning'}
              showIcon
              className="mb-3"
            />

            <div className="mb-3">
              <label className="fw-medium d-block mb-1">Field:</label>
              <div>
                <span className="fw-semibold">{selectedRequest.fieldLabel}</span>
                <small className="text-muted ms-2">({selectedRequest.fieldChanged})</small>
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-medium d-block mb-1">Current Value:</label>
              <div className="p-2 bg-light rounded border">
                {selectedRequest.fieldChanged.includes('accountNumber') && selectedRequest.oldValue ? (
                  <code>
                    {'*'.repeat(String(selectedRequest.oldValue).length - 4)}
                    {String(selectedRequest.oldValue).slice(-4)}
                  </code>
                ) : (
                  <span>{selectedRequest.oldValue || 'Not set'}</span>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-medium d-block mb-1">New Value:</label>
              <div className="p-2 bg-success bg-opacity-10 rounded border border-success">
                <span className="text-success fw-medium">{selectedRequest.newValue || 'Not set'}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="fw-medium d-block mb-1">Employee Reason:</label>
              <p className="text-muted mb-0">{selectedRequest.reason}</p>
            </div>

            <div>
              <label className="fw-medium d-block mb-1">
                {action === 'reject' ? 'Rejection Reason (Required)' : 'Approval Note (Optional)'}
              </label>
              <Input.TextArea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder={
                  action === 'reject'
                    ? 'Enter reason for rejection (minimum 5 characters)'
                    : 'Add an optional note for the employee'
                }
                rows={3}
                maxLength={500}
                showCount
              />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default PendingChangeRequests;
