import { message } from 'antd';
import { useEffect, useState } from 'react';
import { del as apiDelete } from '../../../services/api';

interface SubContract {
  _id: string;
  name: string;
  company: string;
  email: string;
}

const DeleteSubContract = () => {
  const [subcontract, setSubContract] = useState<SubContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  const nameMatches = subcontract
    ? confirmName.trim().toLowerCase() === subcontract.name.trim().toLowerCase()
    : false;

  useEffect(() => {
    const handleDeleteSubContract = (event: any) => {
      const subcontractData = event.detail.subcontract;
      console.log('[DeleteSubContract] Received sub-contract data:', subcontractData);
      setSubContract({
        _id: subcontractData._id || '',
        name: subcontractData.name || '',
        company: subcontractData.company || '',
        email: subcontractData.email || '',
      });
      setConfirmName('');
    };

    window.addEventListener('delete-subcontract', handleDeleteSubContract);
    return () => window.removeEventListener('delete-subcontract', handleDeleteSubContract);
  }, []);

  const handleConfirmDelete = async () => {
    if (!subcontract) {
      message.error('No sub-contract selected');
      return;
    }

    setLoading(true);
    try {
      console.log('Deleting sub-contract:', subcontract._id);

      // Call REST API to delete sub-contract
      const response = await apiDelete(`/subcontracts/${subcontract._id}`);

      if (response.success) {
        console.log('Sub-contract deleted successfully');
        message.success('Sub-contract deleted successfully');

        // Show success message briefly, then close modal
        setTimeout(() => {
          closeModal();

          // Reload sub-contract list after successful delete
          window.dispatchEvent(new CustomEvent('subcontract-deleted'));

          // Reset states after modal closes
          setTimeout(() => {
            setSubContract(null);
            setConfirmName('');
          }, 300);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error deleting sub-contract:', error);
      const errMsg =
        error?.response?.data?.error?.message ||
        error?.message ||
        'An error occurred while deleting the sub-contract';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    const modal = document.getElementById('delete_subcontract');
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
        (window as any).$('#delete_subcontract').modal('hide');
        return;
      }

      // Method 3: Manual modal closing (fallback)
      modal.style.display = 'none';
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');

      // Remove backdrop
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach((backdrop) => backdrop.remove());

      // Remove modal-open class from body
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    } catch (error) {
      console.error('Error closing delete sub-contract modal:', error);

      // Final fallback: just hide the modal
      modal.style.display = 'none';
      modal.classList.remove('show');
    }

    // Reset state after modal closes
    setSubContract(null);
    setConfirmName('');
  };

  const handleCancel = () => {
    setConfirmName('');
    closeModal();
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="delete_subcontract">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body">
              <div className="text-center p-3">
                <span className="avatar avatar-lg avatar-rounded bg-danger mb-3">
                  <i className="ti ti-trash fs-24" />
                </span>
                <h5 className="mb-2">Delete Sub-Contract</h5>
                <p className="mb-3">
                  Are you sure you want to delete this sub-contract? This action cannot be undone.
                </p>
                {subcontract && (
                  <>
                    <div className="bg-light p-3 rounded mb-3">
                      <h6 className="mb-1">{subcontract.name}</h6>
                      <p className="mb-1 text-muted">{subcontract.company}</p>
                      <p className="mb-0 text-muted">{subcontract.email}</p>
                    </div>
                    <div className="text-start mb-3">
                      <p className="text-danger fw-medium mb-2" style={{ fontSize: '13px' }}>
                        This action is permanent. All data associated with this sub-contract will be
                        removed.
                      </p>
                      <label className="form-label text-muted" style={{ fontSize: '13px' }}>
                        Type <strong>{subcontract.name}</strong> to confirm deletion:
                      </label>
                      <input
                        type="text"
                        className={`form-control form-control-sm ${confirmName && !nameMatches ? 'is-invalid' : ''} ${nameMatches ? 'is-valid' : ''}`}
                        placeholder={`Type "${subcontract.name}" to confirm`}
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        autoComplete="off"
                      />
                      {confirmName && !nameMatches && (
                        <div className="invalid-feedback">Name does not match</div>
                      )}
                    </div>
                  </>
                )}
                <div className="d-flex gap-2 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={loading || !nameMatches}
                  >
                    {loading ? 'Deleting...' : 'Delete Sub-Contract'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteSubContract;
