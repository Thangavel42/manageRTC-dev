import { useEffect, useState } from 'react';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import type { Candidate } from '../../../hooks/useCandidates';
import { useCandidates } from '../../../hooks/useCandidates';

const ViewCandidate = () => {
  const { updateCandidateStatus } = useCandidates();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'pipeline' | 'notes'>('profile');
  const [loading, setLoading] = useState(false);

  // Pipeline stages
  const pipelineStages = [
    { key: 'New Application', label: 'New' },
    { key: 'Screening', label: 'Scheduled' },
    { key: 'Interview', label: 'Interviewed' },
    { key: 'Offer Stage', label: 'Offered' },
    { key: 'Hired', label: 'Hired / Rejected' }
  ];

  // Listen for view candidate event
  useEffect(() => {
    const handleViewCandidate = (event: any) => {
      if (event.detail && event.detail.candidate) {
        setCandidate(event.detail.candidate);
        setActiveTab('profile');
      }
    };

    window.addEventListener('view-candidate', handleViewCandidate as EventListener);

    return () => {
      window.removeEventListener('view-candidate', handleViewCandidate as EventListener);
    };
  }, []);

  const getCurrentStageIndex = () => {
    if (!candidate) return 0;
    const index = pipelineStages.findIndex(stage => stage.key === candidate.status);
    return index >= 0 ? index : 0;
  };

  const handleMoveToNextStage = async () => {
    if (!candidate) return;

    const currentIndex = getCurrentStageIndex();
    if (currentIndex < pipelineStages.length - 1) {
      const nextStage = pipelineStages[currentIndex + 1].key;
      setLoading(true);
      const success = await updateCandidateStatus(
        candidate._id,
        nextStage,
        `Moved to ${nextStage} stage`
      );
      if (success) {
        // Update local candidate state
        setCandidate({ ...candidate, status: nextStage });
      }
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!candidate) return;

    setLoading(true);
    const success = await updateCandidateStatus(
      candidate._id,
      'Rejected',
      'Candidate rejected'
    );
    if (success) {
      // Close offcanvas after rejection
      const offcanvas = document.getElementById('view_candidate');
      if (offcanvas) {
        const bsOffcanvas = (window as any).bootstrap?.Offcanvas?.getInstance(offcanvas);
        if (bsOffcanvas) {
          bsOffcanvas.hide();
        }
      }
    }
    setLoading(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'New Application':
        return 'badge-purple';
      case 'Screening':
        return 'badge-info';
      case 'Interview':
        return 'badge-warning';
      case 'Technical Test':
        return 'badge-secondary';
      case 'Offer Stage':
        return 'badge-primary';
      case 'Hired':
        return 'badge-success';
      case 'Rejected':
        return 'badge-danger';
      default:
        return 'badge-light';
    }
  };

  const currentStageIndex = getCurrentStageIndex();

  return (
    <>
      <div
        className="offcanvas offcanvas-end"
        tabIndex={-1}
        id="view_candidate"
        aria-labelledby="view_candidate_label"
        data-bs-backdrop="true"
        data-bs-scroll="false"
        style={{ width: '60%', maxWidth: '900px' }}
      >
        {!candidate ? (
          <div className="offcanvas-body">
            <div className="text-center p-4">
              <p className="text-muted">No candidate selected</p>
            </div>
          </div>
        ) : (
          <>
            <div className="offcanvas-header border-bottom">
              <div className="d-flex align-items-center justify-content-between w-100">
                <div>
                  <h5 className="offcanvas-title fw-bold mb-0" id="view_candidate_label">
                    Candidate Details{' '}
                    <span className="text-orange">
                      {candidate.applicationNumber || `Cand-${candidate._id.slice(-3).toUpperCase()}`}
                    </span>
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="offcanvas"
                  aria-label="Close"
                />
              </div>
            </div>

            <div className="offcanvas-body p-0">
              <div className="p-4">
                {/* Candidate Header */}
                <div className="card border-0 bg-light mb-4">
                  <div className="card-body p-4">
                    <div className="row">
                      <div className="col-auto">
                        <div className="text-center">
                          <div className="candidate-avatar mb-2" style={{ width: '160px', height: '160px', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '14px' }}>
                            300 x 300
                          </div>
                          <button className="btn btn-sm btn-outline-secondary">
                            <i className="ti ti-upload me-1"></i>Upload
                          </button>
                        </div>
                      </div>
                      <div className="col">
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Candidate Name</label>
                            <div className="fw-semibold text-dark">{candidate.fullName}</div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Applied Role</label>
                            <div className="fw-semibold text-dark">
                              {candidate.applicationInfo?.appliedRoleDetails?.designation ||
                                candidate.applicationInfo?.appliedRole?.toString() || 'N/A'}
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Applied Date</label>
                            <div className="fw-semibold text-dark">
                              {candidate.applicationInfo?.appliedDate
                                ? new Date(candidate.applicationInfo.appliedDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                                : 'N/A'}
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Email</label>
                            <div className="text-dark">{candidate.personalInfo?.email || 'N/A'}</div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Recruiter</label>
                            <div className="d-flex align-items-center">
                              <span
                                className="avatar avatar-xs rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center me-2"
                                style={{ width: '28px', height: '28px', fontSize: '12px', fontWeight: '500' }}
                              >
                                {(candidate.applicationInfo?.recruiterDetails?.firstName || 'R').charAt(0).toUpperCase()}
                              </span>
                              <span className="text-dark">
                                {candidate.applicationInfo?.recruiterDetails
                                  ? `${candidate.applicationInfo.recruiterDetails.fullName ||
                                  `${candidate.applicationInfo.recruiterDetails.firstName} ${candidate.applicationInfo.recruiterDetails.lastName}`}
                                      (${candidate.applicationInfo.recruiterDetails.employeeId})`
                                  : (candidate.applicationInfo?.recruiterId?.toString() || 'N/A')}
                              </span>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label text-muted fw-normal mb-1" style={{ fontSize: '13px' }}>Recruiter</label>
                            <div>
                              <span className="badge badge-purple">
                                <i className="ti ti-point-filled"></i>New
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs Navigation */}
                <ul className="nav nav-tabs mb-4" role="tablist">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                      onClick={() => setActiveTab('profile')}
                      type="button"
                    >
                      Profile
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'pipeline' ? 'active' : ''}`}
                      onClick={() => setActiveTab('pipeline')}
                      type="button"
                    >
                      Hiring Pipeline
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'notes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('notes')}
                      type="button"
                    >
                      Notes
                    </button>
                  </li>
                </ul>

                {/* Tab Content */}
                <div className="tab-content">
                  {/* Profile Tab */}
                  {activeTab === 'profile' && (
                    <div className="tab-pane fade show active">
                      {/* Personal Information */}
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>Personal Information</h6>
                        <div className="border rounded p-3 bg-white">
                          <div className="row g-4">
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Candidate Name</label>
                              <div className="text-dark fw-medium">{candidate.fullName || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Phone</label>
                              <div className="text-dark">{candidate.personalInfo?.phone || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Gender</label>
                              <div className="text-dark">{candidate.personalInfo?.gender || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Date of Birth</label>
                              <div className="text-dark">
                                {candidate.personalInfo?.dateOfBirth
                                  ? new Date(candidate.personalInfo.dateOfBirth).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                  : 'N/A'}
                              </div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Email</label>
                              <div className="text-dark">{candidate.personalInfo?.email || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Nationality</label>
                              <div className="text-dark">{candidate.personalInfo?.nationality || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Religion</label>
                              <div className="text-dark">{candidate.personalInfo?.religion || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Marital status</label>
                              <div className="text-dark">{candidate.personalInfo?.maritalStatus || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Referred By</label>
                              <div className="d-flex align-items-center">
                                {candidate.applicationInfo?.referredByDetails ? (
                                  <>
                                    <span className="avatar avatar-xs rounded-circle bg-info text-white d-inline-flex align-items-center justify-content-center me-2"
                                      style={{ width: '28px', height: '28px', fontSize: '12px', fontWeight: '500' }}>
                                      {candidate.applicationInfo.referredByDetails.firstName?.charAt(0).toUpperCase() || 'R'}
                                    </span>
                                    <span className="text-dark">
                                      {`${candidate.applicationInfo.referredByDetails.fullName ||
                                        `${candidate.applicationInfo.referredByDetails.firstName} ${candidate.applicationInfo.referredByDetails.lastName}`}
                                        (${candidate.applicationInfo.referredByDetails.employeeId})`}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-muted">N/A</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>Address Information</h6>
                        <div className="border rounded p-3 bg-white">
                          <div className="row g-4">
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Address</label>
                              <div className="text-dark">{candidate.personalInfo?.address || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>City</label>
                              <div className="text-dark">{candidate.personalInfo?.city || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>State</label>
                              <div className="text-dark">{candidate.personalInfo?.state || 'N/A'}</div>
                            </div>
                            <div className="col-md-3">
                              <label className="form-label text-muted mb-1" style={{ fontSize: '13px' }}>Country</label>
                              <div className="text-dark">{candidate.personalInfo?.country || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Resume */}
                      <div className="mb-4">
                        <h6 className="fw-bold mb-3 text-dark" style={{ fontSize: '16px' }}>Resume</h6>
                        <div className="border rounded p-3 bg-white">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <div className="me-3" style={{ width: '40px', height: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="ti ti-file-text" style={{ fontSize: '20px', color: '#6c757d' }}></i>
                              </div>
                              <div>
                                <div className="fw-medium text-dark">Resume.doc</div>
                                <div className="text-muted" style={{ fontSize: '13px' }}>120 KB</div>
                              </div>
                            </div>
                            <button className="btn btn-dark px-4">
                              <i className="ti ti-download me-2"></i>Download
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hiring Pipeline Tab */}
                  {activeTab === 'pipeline' && (
                    <div className="tab-pane fade show active">
                      {/* Pipeline Stage Visualization */}
                      <div className="card border mb-4">
                        <div className="card-body">
                          <h6 className="fw-bold mb-4">Candidate Pipeline Stage</h6>
                          <div className="position-relative">
                            <div className="d-flex justify-content-between align-items-center position-relative" style={{ minHeight: '80px' }}>
                              {pipelineStages.map((stage, index) => (
                                <div key={stage.key} className="text-center position-relative" style={{ flex: 1 }}>
                                  {/* Connecting Line */}
                                  {index < pipelineStages.length - 1 && (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        top: '20px',
                                        left: '50%',
                                        width: '100%',
                                        height: '4px',
                                        backgroundColor: index < currentStageIndex ? '#7539FF' : '#E9ECEF',
                                        zIndex: 0
                                      }}
                                    />
                                  )}

                                  {/* Stage Circle */}
                                  <div
                                    className="d-inline-flex align-items-center justify-content-center position-relative"
                                    style={{
                                      width: '44px',
                                      height: '44px',
                                      borderRadius: '50%',
                                      backgroundColor: index <= currentStageIndex ? '#7539FF' : '#E9ECEF',
                                      color: index <= currentStageIndex ? '#FFF' : '#6C757D',
                                      fontWeight: 600,
                                      fontSize: '18px',
                                      zIndex: 1,
                                      border: index === currentStageIndex ? '3px solid #FFF' : 'none',
                                      boxShadow: index === currentStageIndex ? '0 0 0 3px #7539FF' : 'none'
                                    }}
                                  >
                                    {index < currentStageIndex ? (
                                      <i className="ti ti-check" />
                                    ) : (
                                      index + 1
                                    )}
                                  </div>

                                  {/* Stage Label */}
                                  <div className="mt-2">
                                    <p className={`mb-0 fw-${index === currentStageIndex ? 'bold' : 'medium'} fs-14`}>
                                      {stage.label}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="card border">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3">Details</h6>
                          <div className="row">
                            <div className="col-md-3 mb-3">
                              <p className="text-muted mb-1 fs-13">Current Status</p>
                              <span className={`badge ${getStatusBadgeClass(candidate.status)}`}>
                                <i className="ti ti-star-filled fs-10 me-1"></i>
                                {candidate.status}
                              </span>
                            </div>
                            <div className="col-md-3 mb-3">
                              <p className="text-muted mb-1 fs-13">Applied Role</p>
                              <p className="fw-medium mb-0">
                                {candidate.applicationInfo?.appliedRoleDetails?.designation ||
                                  candidate.applicationInfo?.appliedRole?.toString() || 'N/A'}
                              </p>
                            </div>
                            <div className="col-md-3 mb-3">
                              <p className="text-muted mb-1 fs-13">Applied Date</p>
                              <p className="fw-medium mb-0">
                                {candidate.applicationInfo?.appliedDate
                                  ? new Date(candidate.applicationInfo.appliedDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })
                                  : 'N/A'}
                              </p>
                            </div>
                            <div className="col-md-3 mb-3">
                              <p className="text-muted mb-1 fs-13">Recruiter</p>
                              <div className="d-flex align-items-center">
                                <div className="avatar avatar-xs me-1">
                                  <ImageWithBasePath
                                    src="assets/img/profiles/avatar-02.jpg"
                                    className="img-fluid rounded-circle"
                                    alt="Recruiter"
                                  />
                                </div>
                                <span className="fw-medium fs-14">
                                  {candidate.applicationInfo?.recruiterDetails
                                    ? `${candidate.applicationInfo.recruiterDetails.fullName ||
                                    `${candidate.applicationInfo.recruiterDetails.firstName} ${candidate.applicationInfo.recruiterDetails.lastName}`}
                                        (${candidate.applicationInfo.recruiterDetails.employeeId})`
                                    : (candidate.applicationInfo?.recruiterId?.toString() || 'N/A')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes Tab */}
                  {activeTab === 'notes' && (
                    <div className="tab-pane fade show active">
                      <div className="card border">
                        <div className="card-body">
                          <h6 className="fw-bold mb-3">Timeline Notes</h6>
                          {candidate.timeline && candidate.timeline.length > 0 ? (
                            <div className="timeline-notes">
                              {candidate.timeline.map((item, index) => (
                                <div key={index} className="border-start border-2 border-primary ps-3 pb-3 ms-2">
                                  <div className="d-flex align-items-center mb-2">
                                    <div
                                      className="bg-primary rounded-circle position-relative"
                                      style={{
                                        width: '10px',
                                        height: '10px',
                                        marginLeft: '-21px',
                                        marginRight: '11px'
                                      }}
                                    />
                                    <h6 className="fw-semibold mb-0">{item.status}</h6>
                                    <span className="text-muted ms-auto fs-13">
                                      {new Date(item.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-muted mb-1 fs-14">{item.notes}</p>
                                  <p className="text-muted mb-0 fs-13">Updated by: {item.updatedBy}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted">No timeline notes available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer with Action Buttons */}
              <div className="border-top p-4 bg-white position-sticky bottom-0">
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-dark px-4"
                    onClick={handleReject}
                    disabled={loading || candidate.status === 'Rejected'}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Reject'
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-orange px-4"
                    onClick={handleMoveToNextStage}
                    disabled={loading || currentStageIndex >= pipelineStages.length - 1 || candidate.status === 'Rejected'}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Processing...
                      </>
                    ) : (
                      'Move to Next Stage'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        .text-orange {
          color: #FF6F00;
        }
        .btn-orange {
          background-color: #FF6F00;
          color: #fff;
          border: none;
        }
        .btn-orange:hover {
          background-color: #E66300;
          color: #fff;
        }
        .btn-orange:disabled {
          background-color: #FFB366;
          color: #fff;
          opacity: 0.6;
        }
        .badge-purple {
          background-color: #7539FF;
          color: #fff;
        }
        .bg-purple-transparent {
          background-color: rgba(117, 57, 255, 0.1);
        }
        .text-purple {
          color: #7539FF;
        }
        .nav-tabs .nav-link.active {
          border-bottom: 2px solid #FF6F00;
          color: #FF6F00;
        }
        .timeline-notes .border-start:last-child {
          border-color: transparent !important;
        }
      `}</style>
    </>
  );
};

export default ViewCandidate;
