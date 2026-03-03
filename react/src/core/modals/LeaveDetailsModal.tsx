import dayjs from "dayjs";
import React from "react";
import { statusDisplayMap, type LeaveStatus } from "../../hooks/useLeaveREST";
import ImageWithBasePath from "../common/imageWithBasePath";

interface AuditTrailEntry {
  status: LeaveStatus;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
  comments?: string;
  rejectionReason?: string;
}

interface Leave {
  _id: string;
  leaveId: string;
  employeeId?: string;
  employeeName?: string;
  leaveType: string;
  leaveTypeName?: string;  // Display name from leaveTypes collection (e.g., "Annual Leave")
  startDate: string;
  endDate: string;
  duration: number;
  totalDays?: number;
  workingDays?: number;
  reason: string;
  detailedReason?: string;
  status: LeaveStatus;
  employeeStatus?: LeaveStatus;
  managerStatus?: LeaveStatus;
  hrStatus?: LeaveStatus;
  finalStatus?: LeaveStatus;
  reportingManagerId?: string;
  reportingManagerName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComments?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  balanceAtRequest?: number;
  handoverToId?: string;
  handoverToName?: string;
  attachments?: Array<{
    filename: string;
    originalName: string;
    url: string;
  }>;
  statusHistory?: AuditTrailEntry[];
  createdAt: string;
  updatedAt: string;
}

interface LeaveDetailsModalProps {
  leave: Leave | null;
  modalId?: string;
  leaveTypeDisplayMap?: Record<string, string>;
  employeeNameById?: Map<string, string>;
  employeeDataById?: Map<string, { avatar?: string; avatarUrl?: string; profileImage?: string; role?: string; designation?: string; employeeId?: string }>;
  onClose?: () => void;
  onApprove?: (leave: Leave) => void;
  onReject?: (leave: Leave) => void;
  canApproveReject?: boolean;
}

const LeaveDetailsModal: React.FC<LeaveDetailsModalProps> = ({
  leave,
  modalId = "view_leave_details",
  leaveTypeDisplayMap = {},
  employeeNameById = new Map(),
  employeeDataById = new Map(),
  onClose,
  onApprove,
  onReject,
  canApproveReject = false
}) => {
  // Timeline Styles
  const timelineStyles = `
    .leave-timeline .timeline-item {
      position: relative;
      padding-bottom: 20px;
      padding-left: 30px;
    }
    .leave-timeline .timeline-item:last-child {
      padding-bottom: 0;
    }
    .leave-timeline .timeline-item:last-child .timeline-line {
      display: none;
    }
    .leave-timeline .timeline-dot {
      position: absolute;
      left: 0;
      top: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      z-index: 1;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #dee2e6;
    }
    .leave-timeline .timeline-line {
      position: absolute;
      left: 5px;
      top: 14px;
      width: 2px;
      height: calc(100% + 6px);
      background-color: #dee2e6;
      z-index: 0;
    }
  `;

  // Build audit trail from leave data if statusHistory doesn't exist
  const buildAuditTrail = (): AuditTrailEntry[] => {
    if (!leave) return [];

    // If statusHistory exists, use it
    if (leave.statusHistory && leave.statusHistory.length > 0) {
      return leave.statusHistory;
    }

    // Otherwise, construct from available data
    const trail: AuditTrailEntry[] = [];

    // Initial request
    trail.push({
      status: 'pending',
      updatedByName: leave.employeeName || 'Employee',
      updatedAt: leave.createdAt,
      comments: 'Leave request submitted',
    });

    // Manager action
    if (leave.managerStatus && leave.managerStatus !== 'pending') {
      trail.push({
        status: leave.managerStatus,
        updatedByName: leave.reportingManagerName || leave.approvedByName || 'Manager',
        updatedAt: leave.approvedAt || leave.updatedAt,
        comments: leave.approvalComments,
        rejectionReason: leave.managerStatus === 'rejected' ? leave.rejectionReason : undefined,
      });
    }

    // HR action
    if (leave.hrStatus && leave.hrStatus !== 'pending') {
      trail.push({
        status: leave.hrStatus,
        updatedByName: 'HR',
        updatedAt: leave.updatedAt,
        comments: leave.hrStatus === 'approved' ? 'HR approved' : 'HR rejected',
      });
    }

    // Final status (if different from manager/HR status)
    if (leave.finalStatus && leave.finalStatus !== leave.managerStatus && leave.finalStatus !== leave.hrStatus) {
      if (leave.finalStatus === 'cancelled') {
        trail.push({
          status: 'cancelled',
          updatedByName: leave.employeeName || 'Employee',
          updatedAt: leave.updatedAt,
          comments: 'Leave cancelled by employee',
        });
      }
    }

    return trail;
  };

  const auditTrail = buildAuditTrail();

  // Format date helper
  const formatDate = (date: string | Date) => {
    if (!date) return "-";
    return dayjs(date).format("DD MMM YYYY");
  };

  // Map semantic color names to CSS color values
  const colorMap: Record<string, { bg: string; text: string }> = {
    warning: { bg: '#fff3cd', text: '#856404' },
    success: { bg: '#d4edda', text: '#155724' },
    danger: { bg: '#f8d7da', text: '#721c24' },
    info: { bg: '#d1ecf1', text: '#0c5460' },
    default: { bg: '#f8f9fa', text: '#6c757d' },
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status: LeaveStatus }) => {
    const config = statusDisplayMap[status] || statusDisplayMap.pending;
    const resolved = colorMap[config.color] || colorMap.default;

    return (
      <span
        className="badge d-inline-flex align-items-center"
        style={{
          fontSize: '12px',
          fontWeight: '500',
          padding: '4px 10px',
          minWidth: '80px',
          backgroundColor: resolved.bg,
          color: resolved.text
        }}
      >
        <i className="ti ti-point-filled me-1" style={{ fontSize: '10px' }} />
        {config.label}
      </span>
    );
  };

  if (!leave) {
    return (
      <div className="modal fade" id={modalId} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Leave Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={onClose}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="text-center py-5">
                <p className="text-muted">No leave selected</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light px-4"
                data-bs-dismiss="modal"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{timelineStyles}</style>
      <div className="modal fade" id={modalId} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Leave Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={onClose}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              {/* Leave Details Section */}
              <div className="p-3 rounded border bg-light">
                <div className="row g-3">
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">Employee</p>
                    <div className="d-flex align-items-center">
                      <span className="avatar avatar-md me-2">
                        {(() => {
                          const empData = employeeDataById.get(leave.employeeId || '');
                          const avatarUrl = empData?.avatarUrl || empData?.profileImage || empData?.avatar;
                          if (avatarUrl) {
                            return (
                              <img
                                src={avatarUrl}
                                className="rounded-circle"
                                alt="img"
                                onError={(e) => { (e.target as HTMLImageElement).src = 'assets/img/users/user-32.jpg'; }}
                              />
                            );
                          }
                          return (
                            <ImageWithBasePath src="assets/img/users/user-32.jpg" className="rounded-circle" alt="img" />
                          );
                        })()}
                      </span>
                      <div>
                        <div className="fw-semibold text-dark">
                          {employeeNameById.get(leave.employeeId || '') || leave.employeeName || "Unknown"}
                        </div>
                        <div className="fs-12 text-muted">
                          {(() => {
                            const empData = employeeDataById.get(leave.employeeId || '');
                            const rawDesignation = empData?.designation;
                            const designationStr = typeof rawDesignation === 'object' && rawDesignation !== null
                              ? (rawDesignation as any).designation || (rawDesignation as any).name || ''
                              : rawDesignation;
                            const roleOrDesignation = empData?.role || designationStr;
                            const empId = empData?.employeeId || leave.employeeId;
                            return (
                              <>
                                {roleOrDesignation && <span className="badge bg-light text-dark me-1">{String(roleOrDesignation)}</span>}
                                <span className="text-muted">{empId || '-'}</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">Reporting Manager</p>
                    <div className="fw-semibold text-dark">
                      {leave.reportingManagerName || "-"}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">Leave Type</p>
                    <div className="fw-semibold text-dark">
                      {leave.leaveTypeName || leaveTypeDisplayMap[leave.leaveType?.toLowerCase?.()] || leave.leaveType}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">No. of Days</p>
                    <div className="fw-semibold text-dark">
                      {leave.duration} Day{leave.duration > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">From</p>
                    <div className="fw-semibold text-dark">
                      {formatDate(leave.startDate)}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">To</p>
                    <div className="fw-semibold text-dark">
                      {formatDate(leave.endDate)}
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <p className="text-muted text-uppercase fs-12 mb-1">Status</p>
                    <div className="d-inline-flex align-items-center gap-2">
                      <StatusBadge status={leave.finalStatus || leave.status} />
                    </div>
                  </div>
                  <div className="col-12">
                    <p className="text-muted text-uppercase fs-12 mb-1">Reason</p>
                    <div className="fw-semibold text-dark bg-white rounded p-2 border">
                      {leave.reason || "-"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Trail Section */}
              <div className="mt-3 p-3 rounded border bg-light">
                <h6 className="text-dark fw-semibold mb-3 d-flex align-items-center">
                  <i className="ti ti-history me-2"></i>
                  Audit Trail
                </h6>
                <div className="leave-timeline">
                  {auditTrail && auditTrail.length > 0 ? (
                    auditTrail.map((history: any, index: number) => {
                      // Determine dot color based on status
                      const dotColor =
                        history.status === 'approved' ? '#4caf50' :
                          history.status === 'rejected' ? '#f44336' :
                            history.status === 'pending' ? '#ff9800' :
                              history.status === 'cancelled' ? '#9e9e9e' :
                                history.status === 'on-hold' ? '#2196f3' : '#9e9e9e';

                      return (
                        <div key={index} className="timeline-item position-relative">
                          {/* Timeline Dot */}
                          <div
                            className="timeline-dot"
                            style={{ backgroundColor: dotColor }}
                          />
                          {/* Timeline Line */}
                          {index < auditTrail.length - 1 && (
                            <div className="timeline-line" />
                          )}
                          {/* Timeline Content */}
                          <div className="timeline-content">
                            <div className="d-flex align-items-start justify-content-between mb-1">
                              <h6 className="mb-0 fw-semibold text-dark" style={{ fontSize: '14px' }}>
                                {history.status ? history.status.charAt(0).toUpperCase() + history.status.slice(1) : 'Unknown'}
                              </h6>
                              <small className="text-muted" style={{ fontSize: '12px' }}>
                                {history.updatedAt || history.timestamp ? new Date(history.updatedAt || history.timestamp).toLocaleString('en-US', {
                                  month: 'short',
                                  day: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                }) : 'N/A'}
                              </small>
                            </div>
                            {(history.updatedByName || history.changedBy) && (
                              <div className="mb-1">
                                <span className="text-muted" style={{ fontSize: '12px' }}>By: </span>
                                <span className="text-primary fw-medium" style={{ fontSize: '12px' }}>
                                  {history.updatedByName ||
                                    (history.changedBy?.name || history.changedBy?.firstName
                                      ? `${history.changedBy.firstName || ''} ${history.changedBy.lastName || ''}`.trim()
                                      : 'System')}
                                </span>
                              </div>
                            )}
                            {(history.comments || history.rejectionReason || history.reason) && (
                              <div className="text-dark bg-white rounded p-2 border" style={{ fontSize: '12px', lineHeight: '1.5' }}>
                                <span className="text-muted">Note: </span>
                                {history.comments || history.rejectionReason || history.reason}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-3">
                      <p className="text-muted mb-0" style={{ fontSize: '13px' }}>No audit trail available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex justify-content-end gap-3 flex-wrap">
              <button
                type="button"
                className="btn btn-light px-4"
                data-bs-dismiss="modal"
                onClick={onClose}
              >
                Close
              </button>
              {canApproveReject && (leave.finalStatus || leave.status) === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={() => onReject?.(leave)}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn btn-success px-4"
                    onClick={() => onApprove?.(leave)}
                  >
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveDetailsModal;
