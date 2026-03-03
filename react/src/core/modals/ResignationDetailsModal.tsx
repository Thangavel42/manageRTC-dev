import { DatePicker } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import type { Resignation } from "../../hooks/useResignationsREST";
import { resolveDesignation } from "../../utils/designationUtils";
import ImageWithBasePath from "../common/imageWithBasePath";

interface ResignationDetailsModalProps {
  resignation: Resignation | null;
  modalId?: string;
  canApproveReject?: boolean;
  onApprove?: (resignationId: string, payload: { noticeDate: string; resignationDate: string }) => void | Promise<void>;
  onReject?: (resignationId: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

const ResignationDetailsModal: React.FC<ResignationDetailsModalProps> = ({
  resignation,
  modalId = "view_resignation_details",
  canApproveReject = false,
  onApprove,
  onReject,
  isSubmitting = false,
}) => {
  // Extract just the name part if employeeName contains "ID - Name" format
  const getDisplayName = (employeeName?: string): string => {
    if (!employeeName) return "Unknown Employee";
    // Check if name contains " - " pattern (e.g., "EMP-8984 - Hari Haran")
    const parts = employeeName.split(' - ');
    if (parts.length > 1) {
      // Return everything after the first " - "
      return parts.slice(1).join(' - ');
    }
    return employeeName;
  };

  const displayName = resignation ? getDisplayName(resignation.employeeName) : '';

  const [noticeDate, setNoticeDate] = useState<string>("");
  const [resignationDate, setResignationDate] = useState<string>("");
  const [actionError, setActionError] = useState<string>("");

  const formatDateDisplay = (...values: Array<string | Date | null | undefined>): string => {
    for (const value of values) {
      if (!value) continue;

      const parsed = typeof value === "string"
        ? dayjs(value, ["YYYY-MM-DD", "DD-MM-YYYY", "YYYY/MM/DD", "DD/MM/YYYY"], true)
        : dayjs(value);

      if (parsed.isValid()) return parsed.format("DD MMM YYYY");

      const fallback = dayjs(value);
      if (fallback.isValid()) return fallback.format("DD MMM YYYY");
    }

    return "Not provided";
  };

  useEffect(() => {
    if (resignation) {
      setNoticeDate(resignation.noticeDate || "");
      setResignationDate(resignation.resignationDate || "");
      setActionError("");
    }
  }, [resignation]);

  const handleApproveClick = () => {
    if (!resignation) return;
    if (!noticeDate || !resignationDate) {
      setActionError("Notice date and resignation date are required to approve.");
      return;
    }
    const notice = dayjs(noticeDate, ["YYYY-MM-DD", "DD-MM-YYYY"], true);
    const resign = dayjs(resignationDate, ["YYYY-MM-DD", "DD-MM-YYYY"], true);
    if (!notice.isValid() || !resign.isValid()) {
      setActionError("Please enter valid dates.");
      return;
    }
    if (resign.isBefore(notice)) {
      setActionError("Resignation date cannot be earlier than notice date.");
      return;
    }
    setActionError("");
    onApprove?.(resignation.resignationId || resignation._id || "", {
      // Send dates as DD-MM-YYYY to satisfy backend Joi (ddmmyyyy)
      noticeDate: notice.format("DD-MM-YYYY"),
      resignationDate: resign.format("DD-MM-YYYY"),
    });
  };

  const handleRejectClick = () => {
    if (!resignation) return;
    onReject?.(resignation.resignationId || resignation._id || "");
  };

  // Always render modal structure, just show empty/loading state when no data
  if (!resignation) {
    return (
      <div className="modal fade" id={modalId}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Resignation Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body pb-0">
              <div className="text-center py-5">
                <p className="text-muted">No resignation selected</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const noticeDateDisplay = formatDateDisplay(
    resignation.noticeDate,
    resignation.effectiveDate,
    resignation.approvedAt,
    resignation.created_at
  );

  const resignationDateDisplay = formatDateDisplay(
    resignation.resignationDate,
    resignation.effectiveDate,
    resignation.processedAt,
    resignation.approvedAt,
    resignation.created_at
  );

  return (
    <div className="modal fade" id={modalId}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Resignation Details</h4>
            <button
              type="button"
              className="btn-close custom-btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i className="ti ti-x" />
            </button>
          </div>
          <div className="modal-body pb-0">
            <div className="row">
              {/* Employee Information */}
              <div className="col-md-12 mb-4">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-lg me-3">
                    {resignation.employeeImage && resignation.employeeImage.trim() !== '' ? (
                      <ImageWithBasePath
                        src={resignation.employeeImage}
                        className="rounded-circle img-fluid"
                        alt={displayName}
                        isLink={true}
                      />
                    ) : (
                      <div className="avatar-title bg-danger-transparent rounded-circle text-danger">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h5 className="mb-1">{displayName}</h5>
                    <p className="text-muted mb-0">{resignation.department || resignation.departmentId || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Resignation Details - Two Column Layout */}
              <div className="col-md-12">
                <div className="card bg-light-300 border-0 mb-3">
                  <div className="card-body">
                    <div className="row">
                      {/* Row 1: Employee ID | Department */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Employee ID</label>
                        <p className="fw-medium mb-0">
                          {resignation.employeeId || resignation.employee_id || 'N/A'}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Department</label>
                        <p className="fw-medium mb-0">
                          {resignation.department || resignation.departmentId || 'N/A'}
                        </p>
                      </div>

                      {/* Row 2: Designation (if available) */}
                      {resignation.designation && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Designation</label>
                          <p className="fw-medium mb-0">{resolveDesignation(resignation.designation, 'N/A')}</p>
                        </div>
                      )}

                      {/* Row 3: Notice Date (Last Working Date) | Resignation Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Notice Date</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-calendar me-1 text-gray-5" />
                          {noticeDateDisplay}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Resignation Date</label>
                        <p className={`fw-medium mb-0 ${resignation.resignationDate ? "text-danger" : ""}`}>
                          <i className="ti ti-calendar-x me-1" />
                          {resignationDateDisplay}
                        </p>
                      </div>

                      {/* Reporting Manager if available */}
                      {resignation.reportingManagerName && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Reporting Manager</label>
                          <p className="fw-medium mb-0">{resignation.reportingManagerName}</p>
                        </div>
                      )}

                      {/* Status if available */}
                      {(resignation.resignationStatus || resignation.status) && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Status</label>
                          <p className="mb-0">
                            <span className={`badge badge-soft-${resignation.resignationStatus === 'on_notice' ? 'info' : resignation.resignationStatus === 'pending' ? 'warning' : resignation.resignationStatus === 'rejected' ? 'danger' : resignation.resignationStatus === 'resigned' ? 'secondary' : 'secondary'}`}>
                              {resignation.resignationStatus
                                ? resignation.resignationStatus.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                                : resignation.status}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Effective Date if available */}
                      {resignation.effectiveDate && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Effective Date</label>
                          <p className="fw-medium mb-0">
                            <i className="ti ti-calendar-check me-1 text-success" />
                            {dayjs(resignation.effectiveDate).format("DD MMM YYYY")}
                          </p>
                        </div>
                      )}

                      {/* Row 4: Reason */}
                      {resignation.reason && (
                        <div className="col-md-12 mb-3">
                          <label className="form-label text-muted mb-1">Reason</label>
                          <p className="mb-0">{resignation.reason}</p>
                        </div>
                      )}

                      {/* Notes (if available) */}
                      {resignation.notes && (
                        <div className="col-md-12 mb-0">
                          <label className="form-label text-muted mb-1">Notes</label>
                          <p className="mb-0">{resignation.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {canApproveReject && (resignation.resignationStatus || resignation.status || "").toLowerCase() === "pending" && (
                <div className="col-md-12">
                  <div className="card border">
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Notice Date <span className="text-danger">*</span></label>
                          <DatePicker
                            className="form-control datetimepicker"
                            format={{ format: "DD-MM-YYYY", type: "mask" }}
                            value={noticeDate ? dayjs(noticeDate, ["YYYY-MM-DD", "DD-MM-YYYY"]) : null}
                            onChange={(_, dateString) => {
                              const next = Array.isArray(dateString) ? dateString[0] || "" : dateString;
                              setNoticeDate(next || "");
                              if (actionError) setActionError("");
                            }}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Resignation Date <span className="text-danger">*</span></label>
                          <DatePicker
                            className="form-control datetimepicker"
                            format={{ format: "DD-MM-YYYY", type: "mask" }}
                            value={resignationDate ? dayjs(resignationDate, ["YYYY-MM-DD", "DD-MM-YYYY"]) : null}
                            onChange={(_, dateString) => {
                              const next = Array.isArray(dateString) ? dateString[0] || "" : dateString;
                              setResignationDate(next || "");
                              if (actionError) setActionError("");
                            }}
                          />
                        </div>
                        {actionError && (
                          <div className="col-12">
                            <div className="text-danger small">{actionError}</div>
                          </div>
                        )}
                        <div className="col-12 d-flex justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={handleRejectClick}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Rejecting..." : "Reject"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleApproveClick}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Approving..." : "Approve"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-primary"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResignationDetailsModal;
