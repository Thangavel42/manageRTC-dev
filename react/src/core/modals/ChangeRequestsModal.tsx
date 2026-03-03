import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Badge, Button, message, Modal, Progress, Space, Tag } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { get, handleApiError, patch } from '../../services/api';

interface FieldChange {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string | null;
  reviewedAt?: Date | null;
}

interface ChangeRequest {
  _id: string;
  companyId: string;
  employeeId: string;
  employeeObjectId: string;
  employeeName: string;
  requestType: string;
  fields: FieldChange[];
  reason: string;
  status: 'pending' | 'partially_approved' | 'completed' | 'cancelled';
  requestedAt: string | Date;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | Date | null;
  reviewNote?: string | null;
  // Legacy fields
  fieldChanged?: string;
  fieldLabel?: string;
  oldValue?: any;
  newValue?: any;
}

interface ChangeRequestsModalProps {
  visible: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  employeeId?: string;
  employeeObjectId?: string;
  employeeName?: string;
}

export const ChangeRequestsModal: React.FC<ChangeRequestsModalProps> = ({
  visible,
  onClose,
  onRefresh,
  employeeId,
  employeeObjectId,
  employeeName,
}) => {
  const [employeeRequests, setEmployeeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingFields, setProcessingFields] = useState<Record<string, boolean>>({});

  const fetchEmployeeRequests = useCallback(async () => {
    if (!employeeId) return;

    setLoading(true);
    try {
      // Fetch both pending and partially_approved requests
      const [pendingRes, partialRes] = await Promise.all([
        get<ChangeRequest[]>(`/change-requests?status=pending&employeeId=${employeeId}`),
        get<ChangeRequest[]>(`/change-requests?status=partially_approved&employeeId=${employeeId}`)
      ]);

      if (pendingRes.success && partialRes.success) {
        // Merge both lists and filter to only show requests with pending fields
        const allRequests = [...(pendingRes.data || []), ...(partialRes.data || [])];
        const requestsWithPendingFields = allRequests.filter(request => {
          const fields = request.fields || [];
          return fields.some(f => f.status === 'pending');
        });
        setEmployeeRequests(requestsWithPendingFields);
      } else {
        throw new Error('Failed to fetch change requests');
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to fetch change requests: ${errorMsg}`);
      console.error('[ChangeRequestsModal] Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (visible && employeeId) {
      fetchEmployeeRequests();
    }
  }, [visible, employeeId, fetchEmployeeRequests]);

  const setProcessing = (requestId: string, fieldIndex: number | 'all', isProcessing: boolean) => {
    const key = `${requestId}-${fieldIndex}`;
    setProcessingFields(prev => ({ ...prev, [key]: isProcessing }));
  };

  const isProcessing = (requestId: string, fieldIndex: number | 'all') => {
    return processingFields[`${requestId}-${fieldIndex}`] || false;
  };

  const handleFieldAction = async (
    request: ChangeRequest,
    fieldIndex: number,
    action: 'approve' | 'reject',
    reviewNote?: string
  ) => {
    setProcessing(request._id, fieldIndex, true);
    try {
      const endpoint = `/change-requests/${request._id}/field/${fieldIndex}/${action}`;
      const response = await patch<{ message: string }>(
        endpoint,
        { reviewNote: reviewNote || '' }
      );

      if (response.success) {
        message.success(response.message || `Field ${action}ed successfully.`);
        await fetchEmployeeRequests();
        onRefresh?.();
      } else {
        message.error(response.error?.message || `Failed to ${action} field`);
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to ${action} field: ${errorMsg}`);
      console.error('[ChangeRequestsModal] Error in field action:', err);
    } finally {
      setProcessing(request._id, fieldIndex, false);
    }
  };

  const handleBulkAction = async (
    request: ChangeRequest,
    action: 'approve' | 'reject',
    reviewNote?: string
  ) => {
    setProcessing(request._id, 'all', true);
    try {
      const endpoint = `/change-requests/${request._id}/bulk-${action}`;
      const response = await patch<{ message: string }>(
        endpoint,
        { reviewNote: reviewNote || '' }
      );

      if (response.success) {
        message.success(response.message || `All fields ${action}ed successfully.`);
        await fetchEmployeeRequests();
        onRefresh?.();
      } else {
        message.error(response.error?.message || `Failed to ${action} fields`);
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to ${action} fields: ${errorMsg}`);
      console.error('[ChangeRequestsModal] Error in bulk action:', err);
    } finally {
      setProcessing(request._id, 'all', false);
    }
  };

  const getFieldStatusTag = (status: string) => {
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

    // For HR modal, show full values (no masking) - HR needs to verify
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

    // String values - return as-is for HR to see
    return String(value);
  };

  // Render content based on state
  const renderContent = () => {
    if (loading && employeeRequests.length === 0) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    if (employeeRequests.length === 0) {
      return (
        <div className="text-center py-5">
          <ClockCircleOutlined className="fs-1 text-muted mb-3" style={{ fontSize: '48px' }} />
          <p className="text-muted mb-0">No pending change requests</p>
          <p className="small text-muted">
            {employeeName ? `for ${employeeName}` : 'for this employee'}
          </p>
        </div>
      );
    }

    return (
      <div>
        {employeeRequests.map((request) => {
          // Support legacy single-field requests
          const fields = request.fields && request.fields.length > 0
            ? request.fields
            : [{
              field: request.fieldChanged || 'unknown',
              label: request.fieldLabel || request.fieldChanged || 'Unknown',
              oldValue: request.oldValue,
              newValue: request.newValue,
              status: 'pending' as const,
              reviewNote: null,
            }];

          const pendingCount = fields.filter(f => f.status === 'pending').length;
          const approvedCount = fields.filter(f => f.status === 'approved').length;
          const rejectedCount = fields.filter(f => f.status === 'rejected').length;

          return (
            <div key={request._id} className="mb-4 p-3 border rounded bg-light">
              {/* Request Header */}
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="mb-1">
                    Request from <strong>{request.employeeName}</strong> ({request.employeeId})
                  </h6>
                  <div className="small text-muted">
                    Requested on {new Date(request.requestedAt).toLocaleDateString()} • {fields.length} field(s)
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Badge count={pendingCount} className="ms-2" title={`${pendingCount} pending field(s)`} />
                )}
              </div>

              {/* Progress bar for multi-field requests */}
              {fields.length > 1 && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Review Progress</span>
                    <span>{approvedCount} approved, {rejectedCount} rejected, {pendingCount} pending</span>
                  </div>
                  <Progress
                    percent={Math.round(((approvedCount + rejectedCount) / fields.length) * 100)}
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
                      <th style={{ width: '20%' }}>Field</th>
                      <th style={{ width: '25%' }}>Existing Value</th>
                      <th style={{ width: '25%' }}>New Value</th>
                      <th style={{ width: '15%' }}>Status</th>
                      <th style={{ width: '15%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, idx) => {
                      const isPending = field.status === 'pending';

                      return (
                        <tr key={idx}>
                          <td>
                            <div className="fw-medium">{field.label}</div>
                          </td>
                          <td>
                            <code className="small">{maskSensitiveValue(field.oldValue, field.field)}</code>
                          </td>
                          <td>
                            <code className={`small ${field.status === 'approved' ? 'text-success' : field.status === 'rejected' ? 'text-danger' : 'text-primary'}`}>
                              {maskSensitiveValue(field.newValue, field.field)}
                            </code>
                          </td>
                          <td>{getFieldStatusTag(field.status)}</td>
                          <td>
                            {isPending ? (
                              <Space size="small">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<CheckCircleOutlined />}
                                  onClick={() => handleFieldAction(request, idx, 'approve')}
                                  loading={isProcessing(request._id, idx)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  danger
                                  size="small"
                                  icon={<CloseCircleOutlined />}
                                  onClick={() => {
                                    Modal.confirm({
                                      title: 'Reject Field',
                                      content: (
                                        <div>
                                          <p>Reject <strong>{field.label}</strong>?</p>
                                          <p className="small text-muted mb-2">Please enter a reason (minimum 5 characters):</p>
                                          <input
                                            id={`reject-reason-${request._id}-${idx}`}
                                            type="text"
                                            className="form-control"
                                            placeholder="Rejection reason"
                                            minLength={5}
                                          />
                                        </div>
                                      ),
                                      okText: 'Reject',
                                      okType: 'danger',
                                      onOk: () => {
                                        const input = document.getElementById(`reject-reason-${request._id}-${idx}`) as HTMLInputElement;
                                        const reason = input?.value;
                                        if (!reason || reason.length < 5) {
                                          message.error('Please provide a reason (minimum 5 characters)');
                                          return Promise.reject();
                                        }
                                        return handleFieldAction(request, idx, 'reject', reason);
                                      },
                                    });
                                  }}
                                  loading={isProcessing(request._id, idx)}
                                >
                                  Reject
                                </Button>
                              </Space>
                            ) : (
                              <span className="text-muted small">No actions</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reason and Review Notes */}
              <div className="mt-3 pt-3 border-top">
                <div className="row g-2">
                  <div className="col-12 col-md-6">
                    <label className="small text-muted mb-1">Employee Reason:</label>
                    <div className="p-2 bg-white rounded border small">{request.reason}</div>
                  </div>
                  {rejectedCount > 0 && (
                    <div className="col-12 col-md-6">
                      <label className="small text-muted mb-1">Review Notes:</label>
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
                </div>
              </div>

              {/* Bulk Actions */}
              {pendingCount > 0 && (
                <div className="mt-3 pt-3 border-top d-flex gap-2">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleBulkAction(request, 'approve')}
                    loading={isProcessing(request._id, 'all')}
                  >
                    Approve All ({pendingCount})
                  </Button>
                  <Button
                    danger
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Reject All Pending Fields',
                        content: (
                          <div>
                            <p>Reject all {pendingCount} pending field(s)?</p>
                            <p className="small text-muted mb-2">Please enter a reason (minimum 5 characters):</p>
                            <input
                              id={`bulk-reject-${request._id}`}
                              type="text"
                              className="form-control"
                              placeholder="Rejection reason"
                              minLength={5}
                            />
                          </div>
                        ),
                        okText: 'Reject All',
                        okType: 'danger',
                        onOk: () => {
                          const input = document.getElementById(`bulk-reject-${request._id}`) as HTMLInputElement;
                          const reason = input?.value;
                          if (!reason || reason.length < 5) {
                            message.error('Please provide a reason (minimum 5 characters)');
                            return Promise.reject();
                          }
                          return handleBulkAction(request, 'reject', reason);
                        },
                      });
                    }}
                    loading={isProcessing(request._id, 'all')}
                  >
                    Reject All ({pendingCount})
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      title={
        <span>
          <i className="ti ti-file-description me-2"></i>
          Pending Change Requests
          {employeeName && ` - ${employeeName}`}
        </span>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      destroyOnClose
    >
      {renderContent()}
    </Modal>
  );
};

export default ChangeRequestsModal;
