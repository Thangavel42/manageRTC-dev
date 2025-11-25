import React, { useState } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../feature-module/router/all_routes";

interface DeleteModalProps {
  onDeleteConfirm?: () => void;
}

const DeleteModal = ({ onDeleteConfirm }: DeleteModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  return (
    <>
      <>
        {/* Delete Modal */}
        <div className="modal fade" id="delete_modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center">
                <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                  <i className="ti ti-trash-x fs-36" />
                </span>
                <h4 className="mb-1">Confirm Delete</h4>
                <p className="mb-3">
                  Are you sure you want to delete this deal? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center">
                  <button
                    type="button"
                    className="btn btn-light me-3"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={isDeleting}
                    onClick={async () => {
                      if (onDeleteConfirm && !isDeleting) {
                        setIsDeleting(true);
                        try {
                          await onDeleteConfirm();
                        } finally {
                          setIsDeleting(false);
                        }
                      }
                    }}
                  >
                    {isDeleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Deleting...
                      </>
                    ) : (
                      'Yes, Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Delete Modal */}
      </>
    </>
  );
};

export default DeleteModal;
