import React from "react";
import dayjs from "dayjs";

interface Holiday {
  _id: string;
  title: string;
  date: string;
  description: string;
  status: "Active" | "Inactive";
  holidayTypeId?: string;
  holidayTypeName?: string;
  repeatsEveryYear?: boolean;
}

interface HolidayDetailsModalProps {
  holiday: Holiday | null;
  modalId?: string;
}

const HolidayDetailsModal: React.FC<HolidayDetailsModalProps> = ({ 
  holiday, 
  modalId = "view_holiday_details" 
}) => {
  // Always render modal structure, just show empty/loading state when no data
  if (!holiday) {
    return (
      <div className="modal fade" id={modalId}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Holiday Details</h4>
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
                <p className="text-muted">No holiday selected</p>
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
            <h4 className="modal-title">Holiday Details</h4>
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
              {/* Holiday Title Header */}
              <div className="col-md-12 mb-4">
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-lg bg-info-transparent rounded me-3">
                    <i className="ti ti-calendar-event fs-24 text-info" />
                  </div>
                  <div>
                    <h5 className="mb-1">{holiday.title}</h5>
                    <p className="text-muted mb-0">
                      {holiday.holidayTypeName || "Holiday"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Holiday Details - Two Column Layout */}
              <div className="col-md-12">
                <div className="card bg-light-300 border-0 mb-3">
                  <div className="card-body">
                    <div className="row">
                      {/* Row 1: Date | Status */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Date</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-calendar me-1 text-info" />
                          {dayjs(holiday.date).format("DD MMMM YYYY")}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Status</label>
                        <p className="mb-0">
                          <span className={`badge ${holiday.status === 'Active' ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center`}>
                            <i className="ti ti-point-filled me-1" />
                            {holiday.status}
                          </span>
                        </p>
                      </div>

                      {/* Row 2: Holiday Type | Repeats Every Year */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Holiday Type</label>
                        <p className="fw-medium mb-0">
                          {holiday.holidayTypeName ? (
                            <span className="badge badge-soft-info d-inline-flex align-items-center">
                              <i className="ti ti-tag me-1" />
                              {holiday.holidayTypeName}
                            </span>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Repeats Every Year</label>
                        <p className="fw-medium mb-0">
                          {holiday.repeatsEveryYear ? (
                            <span className="badge badge-soft-success d-inline-flex align-items-center">
                              <i className="ti ti-repeat me-1" />
                              Yes
                            </span>
                          ) : (
                            <span className="badge badge-soft-secondary d-inline-flex align-items-center">
                              <i className="ti ti-x me-1" />
                              No
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Row 3: Day of Week */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Day</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-sun me-1 text-warning" />
                          {dayjs(holiday.date).format("dddd")}
                        </p>
                      </div>

                      {/* Description (if available) */}
                      {holiday.description && (
                        <div className="col-md-12 mb-0">
                          <label className="form-label text-muted mb-1">Description</label>
                          <p className="mb-0">{holiday.description}</p>
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

export default HolidayDetailsModal;
