/**
 * Career History Section Component
 * Read-only display of promotions, resignation, and termination records
 * Part of the Profile page tab structure (Phase 4)
 */

import React, { useEffect } from 'react';
import { useProfileExtendedREST, CareerHistory } from '../../../../hooks/useProfileExtendedREST';

interface CareerHistorySectionProps {
  careerHistory?: CareerHistory | null;
}

export const CareerHistorySection: React.FC<CareerHistorySectionProps> = ({ careerHistory: propCareerHistory }) => {
  const { careerHistory: hookCareerHistory, fetchCareerHistory, loading } = useProfileExtendedREST();

  // Use prop if provided, otherwise use hook data
  const displayData = propCareerHistory || hookCareerHistory;

  useEffect(() => {
    if (!propCareerHistory) {
      fetchCareerHistory();
    }
  }, [propCareerHistory, fetchCareerHistory]);

  if (loading && !displayData) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const hasContent =
    displayData &&
    ((displayData.promotions && displayData.promotions.length > 0) ||
      displayData.resignation ||
      displayData.termination);

  return (
    <div>
      {!hasContent ? (
        <div className="text-center py-5 bg-light rounded">
          <i className="fas fa-history fa-3x text-muted mb-3"></i>
          <p className="text-muted mb-0">No career history available</p>
        </div>
      ) : (
        <div className="timeline-style">
          {/* Promotions */}
          {displayData?.promotions && displayData.promotions.length > 0 && (
            <div className="mb-5">
              <h6 className="mb-3">
                <i className="fas fa-award text-success me-2"></i>
                Promotions
              </h6>
              <div className="list-group">
                {displayData.promotions.map((promo) => (
                  <div key={promo._id} className="list-group-item">
                    <div className="d-flex w-100 justify-content-between">
                      <div>
                        <h6 className="mb-1">{promo.promotionType || 'Promotion'}</h6>
                        <p className="mb-1 text-muted small">
                          Effective: {promo.effectiveDate ? new Date(promo.effectiveDate).toLocaleDateString() : '--'}
                        </p>
                        {(promo.previousDesignation || promo.newDesignation) && (
                          <div className="d-flex align-items-center gap-2 mb-2">
                            {promo.previousDesignation && (
                              <>
                                <span className="text-muted text-decoration-line-through">{promo.previousDesignation}</span>
                                <i className="fas fa-arrow-right text-muted small"></i>
                              </>
                            )}
                            {promo.newDesignation && (
                              <span className="fw-semibold text-success">{promo.newDesignation}</span>
                            )}
                          </div>
                        )}
                        {(promo.previousDepartment || promo.newDepartment) && (
                          <div className="d-flex align-items-center gap-2 mb-2">
                            {promo.previousDepartment && (
                              <>
                                <span className="text-muted text-decoration-line-through">{promo.previousDepartment}</span>
                                <i className="fas fa-arrow-right text-muted small"></i>
                              </>
                            )}
                            {promo.newDepartment && (
                              <span className="fw-semibold text-primary">{promo.newDepartment}</span>
                            )}
                          </div>
                        )}
                        {promo.salaryChange && (
                          <div className="mb-2">
                            <span className="badge bg-success">
                              <i className="fas fa-dollar-sign me-1"></i>
                              Increment: {promo.salaryChange.increment} (
                              {promo.salaryChange.previousSalary} → {promo.salaryChange.newSalary})
                            </span>
                          </div>
                        )}
                        {promo.notes && (
                          <p className="mb-0 text-muted small mt-2">
                            <i className="fas fa-sticky-note me-1"></i>
                            {promo.notes}
                          </p>
                        )}
                        <div className="mt-2">
                          <span
                            className={`badge ${
                              promo.status === 'completed'
                                ? 'bg-success'
                                : promo.status === 'pending'
                                  ? 'bg-warning'
                                  : promo.status === 'approved'
                                    ? 'bg-primary'
                                    : 'bg-secondary'
                            }`}
                          >
                            {promo.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resignation */}
          {displayData?.resignation && (
            <div className="mb-5">
              <h6 className="mb-3">
                <i className="fas fa-user-minus text-warning me-2"></i>
                Resignation
              </h6>
              <div className="card border-warning">
                <div className="card-body bg-light">
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Notice Date</label>
                      <p className="mb-0 fw-medium">
                        {displayData.resignation.noticeDate
                          ? new Date(displayData.resignation.noticeDate).toLocaleDateString()
                          : '--'}
                      </p>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Resignation Date</label>
                      <p className="mb-0 fw-medium">
                        {displayData.resignation.resignationDate
                          ? new Date(displayData.resignation.resignationDate).toLocaleDateString()
                          : '--'}
                      </p>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Last Working Day</label>
                      <p className="mb-0 fw-medium">
                        {displayData.resignation.lastWorkingDay
                          ? new Date(displayData.resignation.lastWorkingDay).toLocaleDateString()
                          : '--'}
                      </p>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Status</label>
                      <p className="mb-0">
                        <span
                          className={`badge ${
                            displayData.resignation.status === 'approved'
                              ? 'bg-success'
                              : displayData.resignation.status === 'pending'
                                ? 'bg-warning'
                                : 'bg-secondary'
                          }`}
                        >
                          {displayData.resignation.status || 'Unknown'}
                        </span>
                      </p>
                    </div>
                    {displayData.resignation.reason && (
                      <div className="col-12">
                        <label className="text-muted small">Reason</label>
                        <p className="mb-0 text-muted">{displayData.resignation.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Termination */}
          {displayData?.termination && (
            <div className="mb-3">
              <h6 className="mb-3">
                <i className="fas fa-user-slash text-danger me-2"></i>
                Termination
              </h6>
              <div className="card border-danger">
                <div className="card-body bg-light">
                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Termination Date</label>
                      <p className="mb-0 fw-medium">
                        {displayData.termination.terminationDate
                          ? new Date(displayData.termination.terminationDate).toLocaleDateString()
                          : '--'}
                      </p>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Type</label>
                      <p className="mb-0 fw-medium text-capitalize">{displayData.termination.type || '--'}</p>
                    </div>
                    <div className="col-md-6 mb-2">
                      <label className="text-muted small">Notice Period Served</label>
                      <p className="mb-0">
                        {displayData.termination.noticePeriodServed ? (
                          <span className="badge bg-success">
                            <i className="fas fa-check me-1"></i>Yes
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <i className="fas fa-times me-1"></i>No
                          </span>
                        )}
                      </p>
                    </div>
                    {displayData.termination.reason && (
                      <div className="col-12">
                        <label className="text-muted small">Reason</label>
                        <p className="mb-0 text-muted">{displayData.termination.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CareerHistorySection;
