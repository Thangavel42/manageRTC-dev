import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../SocketContext';
import { Socket } from 'socket.io-client';
import { message } from 'antd';

interface Job {
  _id: string;
  title: string;
  category: string;
  type: string;
  location?: {
    city: string;
    state: string;
    country: string;
  };
  status: string;
}

const DeleteJob = () => {
  const socket = useSocket() as Socket | null;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleDeleteJob = (event: any) => {
      const jobData = event.detail.job;
      console.log('[DeleteJob] Received job data:', jobData);
      
      setJob({
        _id: jobData._id || '',
        title: jobData.title || '',
        category: jobData.category || '',
        type: jobData.type || '',
        location: {
          city: jobData.location?.city || '',
          state: jobData.location?.state || '',
          country: jobData.location?.country || ''
        },
        status: jobData.status || ''
      });
    };

    window.addEventListener('delete-job', handleDeleteJob);
    return () => window.removeEventListener('delete-job', handleDeleteJob);
  }, []);

  const handleConfirmDelete = async () => {
    if (!job || !socket) {
      message.error("Socket connection not available");
      return;
    }

    setLoading(true);
    
    try {
      console.log('Deleting job:', job._id);
      socket.emit('job:delete', job._id);

      // Listen for response
      socket.once('job:delete-response', (response: any) => {
        if (response.done) {
          console.log('Job deleted successfully:', response.data);
          message.success('Job deleted successfully!');
          
          // Show success message briefly, then close modal
          setTimeout(() => {
            closeModal();
            // Reset states after modal closes
            setTimeout(() => {
              setJob(null);
            }, 300);
          }, 1000);
        } else {
          console.error('Failed to delete job:', response.error);
          message.error(`Failed to delete job: ${response.error}`);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      message.error('An error occurred while deleting the job');
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('delete_job');
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
        (window as any).$('#delete_job').modal('hide');
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
      console.error('Error closing delete job modal:', error);
      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }

    // Reset job state after modal closes
    setJob(null);
  };

  const handleCancel = () => {
    closeModal();
  };

  return (
    <div className="modal fade" id="delete_job">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header border-0 m-0 pb-0">
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
              onClick={handleCancel}
            ></button>
          </div>
          <div className="modal-body">
            <div className="success-message text-center">
              <div className="success-popup-icon">
                <i className="ti ti-trash-x"></i>
              </div>
              <h3>Delete Job</h3>
              <p className="del-info">
                Are you sure you want to delete this job? This action cannot be undone.
              </p>
              {job && (
                <div className="row">
                  <div className="col-12">
                    <div className="card border border-danger">
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <div className="flex-grow-1 ms-3">
                            <h6 className="mb-1 fw-semibold">{job.title}</h6>
                            <div className="d-flex align-items-center flex-wrap row-gap-2 column-gap-3">
                              <span className="badge badge-soft-info">{job.category}</span>
                              <span className="badge badge-soft-secondary">{job.type}</span>
                              <span className={`badge ${job.status === 'Active' ? 'badge-soft-success' : 'badge-soft-warning'}`}>
                                {job.status}
                              </span>
                            </div>
                            {job.location && (
                              <p className="mb-0 text-gray-9 mt-1">
                                <i className="ti ti-map-pin me-1"></i>
                                {job.location.city}, {job.location.state}, {job.location.country}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="col-lg-12 text-center modal-btn">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                >
                  {loading ? 'Deleting...' : 'Delete Job'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteJob;