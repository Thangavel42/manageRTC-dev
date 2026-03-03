/**
 * Work Info Section Component
 * Read-only display of shift, batch, timezone, and employment type
 * Part of the Profile page tab structure (Phase 4)
 */

import React, { useEffect } from 'react';
import { useProfileExtendedREST, WorkInfo } from '../../../../hooks/useProfileExtendedREST';

interface WorkInfoSectionProps {
  workInfo?: WorkInfo | null;
}

export const WorkInfoSection: React.FC<WorkInfoSectionProps> = ({ workInfo: propWorkInfo }) => {
  const { workInfo: hookWorkInfo, fetchWorkInfo, loading } = useProfileExtendedREST();

  // Use prop if provided, otherwise use hook data
  const displayData = propWorkInfo || hookWorkInfo;

  useEffect(() => {
    if (!propWorkInfo) {
      fetchWorkInfo();
    }
  }, [propWorkInfo, fetchWorkInfo]);

  if (loading && !displayData) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      {/* Employment Type */}
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Employment Type</label>
        <p className="mb-0 fw-medium">{displayData?.employmentType || '--'}</p>
      </div>

      {/* Timezone */}
      <div className="col-md-6 mb-3">
        <label className="text-muted small">Timezone</label>
        <p className="mb-0 fw-medium">{displayData?.timezone || '--'}</p>
      </div>

      {/* Shift Information */}
      <div className="col-12 mb-4">
        <h6 className="mb-3">Shift Assignment</h6>
        {displayData?.shift ? (
          <div className="card bg-light border">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-3">
                  {displayData.shift.color && (
                    <div
                      className="rounded mb-2"
                      style={{
                        backgroundColor: displayData.shift.color,
                        height: '8px',
                        width: '60px',
                      }}
                    />
                  )}
                  <p className="mb-0 fw-bold">{displayData.shift.name}</p>
                  {displayData.shift.code && (
                    <small className="text-muted">{displayData.shift.code}</small>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Timing</label>
                  <p className="mb-0">{displayData.shift.startTime} - {displayData.shift.endTime}</p>
                  <small className="text-muted">{displayData.shift.duration} hours</small>
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Type</label>
                  <p className="mb-0 text-capitalize">{displayData.shift.type}</p>
                  {displayData.shift.isNightShift && (
                    <span className="badge bg-info">Night Shift</span>
                  )}
                </div>
                <div className="col-md-3">
                  <label className="text-muted small">Shift ID</label>
                  <p className="mb-0 small text-muted">{displayData.shift._id}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted">No shift assigned</p>
        )}
      </div>

      {/* Batch Information */}
      <div className="col-12">
        <h6 className="mb-3">Batch Assignment</h6>
        {displayData?.batch ? (
          <div className="card bg-light border">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-4">
                  <p className="mb-0 fw-bold">{displayData.batch.name}</p>
                  {displayData.batch.code && (
                    <small className="text-muted">{displayData.batch.code}</small>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="text-muted small">Batch Shift</label>
                  {displayData.batch.shift ? (
                    <div>
                      <p className="mb-0 fw-medium">{displayData.batch.shift.name}</p>
                      <small className="text-muted">
                        {displayData.batch.shift.startTime} - {displayData.batch.shift.endTime}
                      </small>
                    </div>
                  ) : (
                    <p className="mb-0 text-muted">No shift assigned to batch</p>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="text-muted small">Batch ID</label>
                  <p className="mb-0 small text-muted">{displayData.batch._id}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted">No batch assigned</p>
        )}
      </div>
    </div>
  );
};

export default WorkInfoSection;
