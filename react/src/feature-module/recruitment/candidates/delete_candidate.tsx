import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';

interface Candidate {
  _id: string;
  fullName: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  applicationInfo: {
    appliedRole: string;
  };
  applicationNumber: string;
}

const DeleteCandidate = () => {
  const socket = useSocket() as Socket | null;
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleDeleteCandidate = (event: any) => {
      const candidateData = event.detail.candidate;
      console.log('[DeleteCandidate] Received candidate data:', candidateData);
      
      setCandidate({
        _id: candidateData._id || '',
        fullName: candidateData.fullName || `${candidateData.personalInfo?.firstName || ''} ${candidateData.personalInfo?.lastName || ''}`.trim() || 'N/A',
        personalInfo: {
          firstName: candidateData.personalInfo?.firstName || '',
          lastName: candidateData.personalInfo?.lastName || '',
          email: candidateData.personalInfo?.email || ''
        },
        applicationInfo: {
          appliedRole: candidateData.applicationInfo?.appliedRole || ''
        },
        applicationNumber: candidateData.applicationNumber || 'N/A'
      });
    };

    window.addEventListener('delete-candidate', handleDeleteCandidate);
    return () => window.removeEventListener('delete-candidate', handleDeleteCandidate);
  }, []);

  const handleConfirmDelete = async () => {
    if (!candidate || !socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);

    try {
      console.log('Deleting candidate:', candidate._id);
      socket.emit('candidate:delete', candidate._id);

      // Listen for response
      socket.once('candidate:delete-response', (response: any) => {
        if (response.done) {
          console.log('Candidate deleted successfully:', response.data);
          message.success('Candidate deleted successfully!');
          
          // Show success message briefly, then close modal
          setTimeout(() => {
            closeModal();
            // Reset states after modal closes
            setTimeout(() => {
              setCandidate(null);
            }, 300);
          }, 1000);
        } else {
          console.error('Failed to delete candidate:', response.error);
          message.error(`Failed to delete candidate: ${response.error}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error deleting candidate:', error);
      message.error('An error occurred while deleting the candidate');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('delete_candidate');
    if (!modal) return;

    try {
      // Method 1: Try Bootstrap Modal API
      if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
        const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
          bootstrapModal.hide();
          return;
        }
      }

      // Method 2: Try jQuery Bootstrap Modal
      if ((window as any).$ && (window as any).$.fn && (window as any).$.fn.modal) {
        (window as any).$('#delete_candidate').modal('hide');
        return;
      }

      // Method 3: Manual modal closing (fallback)
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      
      // Remove backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      
      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch (error) {
      console.error('Error closing delete candidate modal:', error);
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }

    // Reset candidate state after modal closes
    setCandidate(null);
  };

  const handleCancel = () => {
    closeModal();
  };

  return (
    <div className="modal fade" id="delete_candidate" tabIndex={-1} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h4 className="modal-title">Delete Candidate</h4>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleCancel}
            ></button>
          </div>

          <div className="modal-body">
            <div className="text-center">
              <div className="mb-3">
                <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '48px' }}></i>
              </div>
              
              <h5 className="mb-3">Are you sure you want to delete this candidate?</h5>
              
              <p className="text-muted mb-4">
                This action cannot be undone. All candidate information, documents, 
                and application history will be permanently removed.
              </p>

              {candidate && (
                <div className="bg-light p-3 rounded mb-4">
                  <div className="row text-start">
                    <div className="col-sm-4 fw-bold">Name:</div>
                    <div className="col-sm-8">{candidate.fullName}</div>
                  </div>
                  <div className="row text-start">
                    <div className="col-sm-4 fw-bold">Email:</div>
                    <div className="col-sm-8">{candidate.personalInfo.email || 'N/A'}</div>
                  </div>
                  <div className="row text-start">
                    <div className="col-sm-4 fw-bold">Applied Role:</div>
                    <div className="col-sm-8">{candidate.applicationInfo.appliedRole || 'N/A'}</div>
                  </div>
                  <div className="row text-start">
                    <div className="col-sm-4 fw-bold">Application ID:</div>
                    <div className="col-sm-8">{candidate.applicationNumber}</div>
                  </div>
                </div>
              )}

              <div className="alert alert-warning" role="alert">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Alternative:</strong> Consider changing the candidate status to "Rejected" 
                instead of permanently deleting the record.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash me-2"></i>
                  Delete Candidate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCandidate;