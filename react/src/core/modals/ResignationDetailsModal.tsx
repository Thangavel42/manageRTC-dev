import dayjs from "dayjs";
import React from "react";
import type { Resignation } from "../../hooks/useResignationsREST";
import ImageWithBasePath from "../common/imageWithBasePath";

interface ResignationDetailsModalProps {
  resignation: Resignation | null;
  modalId?: string;
}

const ResignationDetailsModal: React.FC<ResignationDetailsModalProps> = ({
  resignation,
  modalId = "view_resignation_details"
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
                          <p className="fw-medium mb-0">{resignation.designation}</p>
                        </div>
                      )}

                      {/* Row 3: Notice Date (Last Working Date) | Resignation Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Notice Date</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-calendar me-1 text-gray-5" />
                          {dayjs(resignation.noticeDate).format("DD MMM YYYY")}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Resignation Date</label>
                        <p className="fw-medium mb-0 text-danger">
                          <i className="ti ti-calendar-x me-1" />
                          {dayjs(resignation.resignationDate).format("DD MMM YYYY")}
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
