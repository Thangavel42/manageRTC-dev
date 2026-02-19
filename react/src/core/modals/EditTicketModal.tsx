import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../../SocketContext";
import CommonSelect from "../common/commonSelect";
import ImageWithBasePath from "../common/imageWithBasePath";

interface Category {
  _id: string;
  name: string;
  description: string;
  icon?: string;
  subCategories: Array<{
    name: string;
    isActive: boolean;
  }>;
}

interface EditTicketModalProps {
  onTicketUpdated?: () => void;
}

const EditTicketModal: React.FC<EditTicketModalProps> = ({ onTicketUpdated }) => {
  const socket = useSocket();

  // Form state
  const [formData, setFormData] = useState({
    ticketId: '',
    title: '',
    category: '',
    subCategory: '',
    description: '',
    priority: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get subcategories based on selected category
  const selectedCategoryData = categories.find(cat => cat.name === formData.category);
  const subCategories = selectedCategoryData?.subCategories || [];

  const priority = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" },
  ];

  // Category options
  const categoryOptions = [
    { value: formData.category || "", label: formData.category || "Select Category" },
    ...categories.map(cat => ({
      value: cat.name,
      label: cat.name,
    }))
  ];

  // Subcategory options (dynamic)
  const subCategoryOptions = [
    { value: formData.subCategory || "", label: formData.subCategory || "Select Subcategory" },
    ...subCategories.map(sub => ({
      value: sub.name,
      label: sub.name,
    }))
  ];

  // Priority options
  const priorityOptions = [
    { value: formData.priority || "", label: formData.priority || "Select Priority" },
    ...priority.map(p => ({ value: p.value, label: p.label }))
  ];

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Reset subcategory when category changes
    if (field === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subCategory: ''
      }));
    }
  };

  // Helper function to close modal safely
  const closeModal = () => {
    try {
      if (modalRef.current) {
        const modalElement = modalRef.current as any;

        if (modalElement._bsModal) {
          modalElement._bsModal.hide();
          return;
        }

        if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
            return;
          }
        }

        const closeButton = modalElement.querySelector('[data-bs-dismiss="modal"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
          return;
        }

        modalElement.classList.remove('show');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('style', 'display: none');

        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }

        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Error closing modal:', error);
      if (modalRef.current) {
        modalRef.current.style.display = 'none';
      }
    }
  };

  // Fetch categories on component mount
  useEffect(() => {
    if (socket) {
      setCategoriesLoading(true);
      socket.emit('tickets/categories/get-main-categories');

      const handleCategoriesResponse = (response: any) => {
        setCategoriesLoading(false);
        if (response.done && response.data) {
          setCategories(response.data);
        }
      };

      socket.on('tickets/categories/get-main-categories-response', handleCategoriesResponse);

      return () => {
        socket.off('tickets/categories/get-main-categories-response', handleCategoriesResponse);
      };
    }
  }, [socket]);

  // Listen for modal show event to fetch ticket details
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      const handleModalShow = (e: any) => {
        const button = e.relatedTarget as HTMLElement;
        const ticketIdValue = button?.getAttribute('data-ticket-id');
        const titleValue = button?.getAttribute('data-ticket-title');
        const descriptionValue = button?.getAttribute('data-ticket-description');
        const categoryValue = button?.getAttribute('data-ticket-category');
        const subcategoryValue = button?.getAttribute('data-ticket-subcategory');
        const priorityValue = button?.getAttribute('data-ticket-priority');

        setFormData({
          ticketId: ticketIdValue || '',
          title: titleValue || '',
          category: categoryValue || '',
          subCategory: subcategoryValue || '',
          description: descriptionValue || '',
          priority: priorityValue || '',
        });
        setMessage(null);
      };

      const handleModalClose = () => {
        setFormData({
          ticketId: '',
          title: '',
          category: '',
          subCategory: '',
          description: '',
          priority: '',
        });
        setLoading(false);
        setMessage(null);
      };

      modal.addEventListener('show.bs.modal', handleModalShow);
      modal.addEventListener('hidden.bs.modal', handleModalClose);

      return () => {
        modal.removeEventListener('show.bs.modal', handleModalShow);
        modal.removeEventListener('hidden.bs.modal', handleModalClose);
      };
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.title || !formData.category || !formData.subCategory || !formData.description) {
      setMessage({type: 'error', text: 'Please fill in all required fields'});
      return;
    }

    setLoading(true);
    setMessage(null);

    const updateData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      subCategory: formData.subCategory,
      priority: formData.priority,
    };

    // Emit update ticket event
    socket?.emit('tickets/update-ticket', {
      ticketId: formData.ticketId,
      updateData
    });

    const handleUpdateResponse = (response: any) => {
      if (response.done) {
        setMessage({type: 'success', text: 'Ticket updated successfully!'});
        // Close modal after a short delay
        setTimeout(() => {
          closeModal();
          onTicketUpdated?.();
        }, 1500);
      } else {
        setMessage({type: 'error', text: 'Error updating ticket: ' + response.error});
      }
      setLoading(false);
    };

    socket.on('tickets/update-ticket-response', handleUpdateResponse);

    setTimeout(() => {
      socket.off('tickets/update-ticket-response', handleUpdateResponse);
      if (loading) {
        setLoading(false);
        setMessage({type: 'error', text: 'Request timeout. Please try again.'});
      }
    }, 10000);
  };

  return (
    <>
      {/* Edit Ticket */}
      <div className="modal fade" id="edit_ticket" ref={modalRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Ticket</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {message && (
                  <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
                  </div>
                )}

                {categoriesLoading && (
                  <div className="alert alert-info">
                    <small>Loading categories...</small>
                  </div>
                )}

                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter ticket title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Category <span className="text-danger">*</span></label>
                          <CommonSelect
                            className="select"
                            options={categoryOptions}
                            value={categoryOptions.find(opt => opt.value === formData.category) || categoryOptions[0]}
                            onChange={(option: any) => handleInputChange('category', option?.value || '')}
                            disabled={categoriesLoading}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Subcategory <span className="text-danger">*</span></label>
                          <CommonSelect
                            className="select"
                            options={subCategoryOptions}
                            value={subCategoryOptions.find(opt => opt.value === formData.subCategory) || subCategoryOptions[0]}
                            onChange={(option: any) => handleInputChange('subCategory', option?.value || '')}
                            disabled={!formData.category || formData.category === 'Select'}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Ticket Description <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        placeholder="Describe your issue or request in detail"
                        value={formData.description}
                        onChange={(e) => {
                          if (e.target.value.length <= 1000) {
                            handleInputChange('description', e.target.value);
                          }
                        }}
                        rows={4}
                        required
                        maxLength={1000}
                      />
                      <small className="text-muted">{formData.description.length}/1000 characters</small>
                    </div>

                    <div className="mb-0">
                      <label className="form-label">Priority <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={priorityOptions}
                        value={priorityOptions.find(opt => opt.value === formData.priority) || priorityOptions[0]}
                        onChange={(option: any) => handleInputChange('priority', option?.value || '')}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light me-2"
                  data-bs-dismiss="modal"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || categoriesLoading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating...
                    </>
                  ) : (
                    'Update Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Ticket */}
    </>
  );
};

export default EditTicketModal;
