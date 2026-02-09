import React from "react";
import dayjs from "dayjs";
import ImageWithBasePath from "../common/imageWithBasePath";
import type { Promotion } from "../../hooks/usePromotionsREST";

interface PromotionDetailsModalProps {
  promotion: Promotion | null;
  modalId?: string;
}

const PromotionDetailsModal: React.FC<PromotionDetailsModalProps> = ({
  promotion,
  modalId = "view_promotion_details"
}) => {
  // Always render modal structure, just show empty/loading state when no data
  if (!promotion) {
    return (
      <div className="modal fade" id={modalId}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Promotion Details</h4>
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
                <p className="text-muted">No promotion selected</p>
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
            <h4 className="modal-title">Promotion Details</h4>
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
                    <div className="avatar-title bg-primary-transparent rounded-circle text-primary">
                      {promotion.employeeName?.charAt(0)?.toUpperCase() || promotion.employeeId?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div>
                    <h5 className="mb-1">{promotion.employeeName || 'Employee'}</h5>
                    <p className="text-muted mb-0">{promotion.promotionTo.department || promotion.promotionTo.departmentId}</p>
                  </div>
                </div>
              </div>

              {/* Promotion Details - Two Column Layout */}
              <div className="col-md-12">
                <div className="card bg-light-300 border-0 mb-3">
                  <div className="card-body">
                    <div className="row">
                      {/* Row 1: Current Department | Department To */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Current Department</label>
                        <p className="fw-medium mb-0">
                          {promotion.promotionFrom.department || promotion.promotionFrom.departmentId}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Department To</label>
                        <p className="fw-medium mb-0 text-primary">
                          <i className="ti ti-arrow-right me-1" />
                          {promotion.promotionTo.department || promotion.promotionTo.departmentId}
                        </p>
                      </div>

                      {/* Row 2: Previous Designation | Promotion To */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Previous Designation</label>
                        <p className="fw-medium mb-0">{promotion.promotionFrom.designation || promotion.promotionFrom.designationId}</p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Promotion To</label>
                        <p className="fw-medium mb-0 text-success">
                          <i className="ti ti-arrow-up me-1" />
                          {promotion.promotionTo.designation || promotion.promotionTo.designationId}
                        </p>
                      </div>

                      {/* Row 3: Promotion Type | Promotion Date */}
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Promotion Type</label>
                        <p className="fw-medium mb-0">
                          {promotion.promotionType || "Regular"}
                        </p>
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label text-muted mb-1">Promotion Date</label>
                        <p className="fw-medium mb-0">
                          <i className="ti ti-calendar me-1 text-gray-5" />
                          {dayjs(promotion.promotionDate).format("DD MMM YYYY")}
                        </p>
                      </div>

                      {/* Row 4: Status | Applied Date (if applicable) */}
                      {promotion.status && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Status</label>
                          <p className="mb-0">
                            <span className={`badge badge-soft-${promotion.status === 'applied' ? 'success' : promotion.status === 'pending' ? 'warning' : promotion.status === 'approved' ? 'success' : promotion.status === 'rejected' ? 'danger' : 'secondary'}`}>
                              {promotion.status.charAt(0).toUpperCase() + promotion.status.slice(1)}
                            </span>
                          </p>
                        </div>
                      )}
                      {promotion.appliedAt && (
                        <div className="col-md-6 mb-3">
                          <label className="form-label text-muted mb-1">Applied On</label>
                          <p className="fw-medium mb-0">
                            <i className="ti ti-check me-1 text-success" />
                            {dayjs(promotion.appliedAt).format("DD MMM YYYY")}
                          </p>
                        </div>
                      )}

                      {promotion.reason && (
                        <div className="col-md-12 mb-3">
                          <label className="form-label text-muted mb-1">Reason</label>
                          <p className="mb-0">{promotion.reason}</p>
                        </div>
                      )}

                      {promotion.notes && (
                        <div className="col-md-12 mb-0">
                          <label className="form-label text-muted mb-1">Notes</label>
                          <p className="mb-0">{promotion.notes}</p>
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

export default PromotionDetailsModal;
