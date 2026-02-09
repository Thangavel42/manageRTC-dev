import React from "react";
import dayjs from "dayjs";
import ImageWithBasePath from "../common/imageWithBasePath";
import type { Termination } from "../../hooks/useTerminationsREST";

interface TerminationDetailsModalProps {
  termination: Termination | null;
  modalId?: string;
}

const TerminationDetailsModal: React.FC<TerminationDetailsModalProps> = ({
  termination,
  modalId = "view_termination_details"
}) => {
  // Extract just the name part if employeeName contains "ID - Name" format
  const getDisplayName = (employeeName?: string | null): string => {
    if (!employeeName) return "Unknown Employee";
    // Check if name contains " - " pattern (e.g., "EMP-8984 - Hari Haran")
    const parts = employeeName.split(' - ');
    if (parts.length > 1) {
      // Return everything after the first " - "
      return parts.slice(1).join(' - ');
    }
    return employeeName;
  };

  const displayName = termination ? getDisplayName(termination.employeeName) : '';

  // Always render modal structure, just show empty/loading state when no data
  if (!termination) {
    return (
      <div className="modal fade" id={modalId}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Termination Details</h4>
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
                <p className="text-muted">No termination selected</p>
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

  return (
    <div className="modal fade" id={modalId}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Termination Details</h4>
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
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="avatar avatar-lg me-3">
                      {termination.employeeImage && termination.employeeImage.trim() !== '' ? (
                        <ImageWithBasePath
                          src={termination.employeeImage}
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
                      <p className="text-muted mb-0">{termination.department || termination.departmentId || "N/A"}</p>
                    </div>
                  </div>
                  {termination.status && (
                    <div>
                      {(() => {
                        const statusMap: Record<string, { className: string; text: string }> = {
                          pending: { className: "badge badge-soft-warning", text: "Pending" },
                          processed: { className: "badge badge-soft-success", text: "Processed" },
                          cancelled: { className: "badge badge-soft-danger", text: "Cancelled" },
                        };
                        const statusInfo = statusMap[termination.status?.toLowerCase() || ""] || {
                          className: "badge badge-soft-secondary",
                          text: termination.status
                        };
                        return <span className={statusInfo.className}>{statusInfo.text}</span>;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Termination Details - Two Column Layout */}
              <div className="col-md-12">
                <div className="card bg-light-300 border-0 mb-3">
                  <div className="card-body">
                    <div className="row">
                      {/* Row 1: Employee ID | Department */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Employee ID</label>
                        <p className="fw-medium mb-0">
                          {termination.employeeId || termination.employee_id || "N/A"}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Department</label>
                        <p className="fw-medium mb-0">
                          {termination.department || termination.departmentId || "N/A"}
                        </p>
                      </div>

                      {/* Row 2: Designation (if available) | Termination Type */}
                      {termination.designation && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Designation</label>
                          <p className="fw-medium mb-0">{termination.designation}</p>
                        </div>
                      )}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Termination Type</label>
                        <p className="fw-medium mb-0">
                          <span className="badge badge-soft-info">{termination.terminationType}</span>
                        </p>
                      </div>

                      {/* Row 3: Notice Date | Termination Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Notice Date</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-calendar me-1 text-gray-5" />
                          {dayjs(termination.noticeDate).format("DD MMM YYYY")}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Termination Date</label>
                        <p className="fw-medium mb-0 text-danger">
                          <i className="ti ti-calendar-x me-1" />
                          {dayjs(termination.terminationDate).format("DD MMM YYYY")}
                        </p>
                      </div>

                      {/* Row 4: Last Working Date (if available) */}
                      {termination.lastWorkingDate && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Last Working Date</label>
                          <p className="fw-medium mb-0">
                            <i className="ti ti-calendar-check me-1 text-gray-5" />
                            {dayjs(termination.lastWorkingDate).format("DD MMM YYYY")}
                          </p>
                        </div>
                      )}

                      {/* Processed information */}
                      {termination.processedBy && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Processed By</label>
                          <p className="fw-medium mb-0">{termination.processedBy}</p>
                        </div>
                      )}

                      {termination.processedAt && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Processed At</label>
                          <p className="fw-medium mb-0">
                            {dayjs(termination.processedAt).format("DD MMM YYYY")}
                          </p>
                        </div>
                      )}

                      {/* Row 5: Reason */}
                      {termination.reason && (
                        <div className="col-md-12 mb-0">
                          <label className="form-label text-muted mb-1">Reason</label>
                          <p className="mb-0">{termination.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

export default TerminationDetailsModal;
