import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CommonSelect from "../common/commonSelect";
import { useSocket } from "../../SocketContext";

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

const TicketListModal = () => {
  const socket = useSocket();

  // Form state
  const [formData, setFormData] = useState({
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
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Get subcategories based on selected category
  const selectedCategoryData = categories.find(cat => cat.name === formData.category);
  const subCategories = selectedCategoryData?.subCategories || [];

  const priority = [
    { value: "Select", label: "Select" },
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" },
  ];

  // Category options
  const categoryOptions = [
    { value: "Select", label: "Select Category" },
    ...categories.map(cat => ({
      value: cat.name,
      label: cat.name,
    }))
  ];

  // Subcategory options (dynamic)
  const subCategoryOptions = [
    { value: "Select", label: formData.category ? "Select Subcategory" : "Select Category First" },
    ...subCategories.map(sub => ({
      value: sub.name,
      label: sub.name,
    }))
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
        console.log('Categories response:', response);
        setCategoriesLoading(false);
        if (response.done && response.data) {
          setCategories(response.data);
        } else {
          setMessage({type: 'error', text: 'Failed to load categories'});
        }
      };

      socket.on('tickets/categories/get-main-categories-response', handleCategoriesResponse);

      return () => {
        socket.off('tickets/categories/get-main-categories-response', handleCategoriesResponse);
      };
    }
  }, [socket]);

  // Fetch current employee data on component mount
  useEffect(() => {
    if (socket) {
      socket.emit('tickets/get-current-employee');

      const handleEmployeeResponse = (response: any) => {
        console.log('Current employee response:', response);
        if (response.done && response.data) {
          setCurrentEmployee(response.data);
        } else {
          console.error('Failed to load current employee:', response.error);
          setMessage({ type: 'error', text: 'Failed to load employee information. Please refresh the page.' });
        }
      };

      socket.on('tickets/get-current-employee-response', handleEmployeeResponse);

      return () => {
        socket.off('tickets/get-current-employee-response', handleEmployeeResponse);
      };
    }
  }, [socket]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submitted with data:', formData);

    // Validate form
    if (!formData.title || !formData.category || !formData.subCategory || !formData.description) {
      setMessage({type: 'error', text: 'Please fill in all required fields'});
      return;
    }

    if (formData.category === 'Select' || formData.subCategory === 'Select' || formData.priority === 'Select') {
      setMessage({type: 'error', text: 'Please select valid options for all fields'});
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Check if we have current employee data
      if (!currentEmployee || !currentEmployee._id) {
        setMessage({type: 'error', text: 'Employee information not available. Please try again.'});
        setLoading(false);
        return;
      }

      const ticketData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subCategory: formData.subCategory,
        priority: formData.priority,
        status: 'Open', // Default status
        createdBy: currentEmployee._id, // Store only employee ObjectId
      };

      console.log('Sending ticket data:', ticketData);

      // Emit create ticket event
      socket?.emit('tickets/create-ticket', ticketData);

      const timeout = setTimeout(() => {
        if (loading) {
          setMessage({type: 'error', text: 'Request timeout. Please try again.'});
          setLoading(false);
        }
      }, 10000);

      (window as any).ticketCreateTimeout = timeout;

    } catch (error) {
      console.error('Error creating ticket:', error);
      setMessage({type: 'error', text: 'Error creating ticket. Please try again.'});
      setLoading(false);
    }
  };

  // Set up socket listener for create ticket response
  useEffect(() => {
    if (socket) {
      const handleCreateTicketResponse = (response: any) => {
        console.log('Create ticket response:', response);

        if ((window as any).ticketCreateTimeout) {
          clearTimeout((window as any).ticketCreateTimeout);
          (window as any).ticketCreateTimeout = null;
        }

        if (response.done) {
          setMessage({type: 'success', text: 'Ticket created successfully!'});
          // Reset form
          setFormData({
            title: '',
            category: '',
            subCategory: '',
            description: '',
            priority: '',
          });
          // Close modal after a short delay
          setTimeout(() => {
            closeModal();
            setMessage(null);
          }, 1500);
        } else {
          setMessage({type: 'error', text: 'Error creating ticket: ' + response.error});
        }
        setLoading(false);
      };

      socket.on('tickets/create-ticket-response', handleCreateTicketResponse);

      return () => {
        socket.off('tickets/create-ticket-response', handleCreateTicketResponse);
      };
    }
  }, [socket]);

  // Reset form when modal is closed
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      const handleModalClose = () => {
        setFormData({
          title: '',
          category: '',
          subCategory: '',
          description: '',
          priority: '',
        });
        setLoading(false);
        setMessage(null);
      };

      modal.addEventListener('hidden.bs.modal', handleModalClose);
      modal.addEventListener('hide.bs.modal', handleModalClose);

      return () => {
        modal.removeEventListener('hidden.bs.modal', handleModalClose);
        modal.removeEventListener('hide.bs.modal', handleModalClose);
      };
    }
  }, []);

  return (
    <>
      {/* Add Ticket */}
      <div className="modal fade" id="add_ticket" ref={modalRef}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Ticket</h4>
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
                        onChange={(e) => {
                          if (e.target.value.length <= 100) {
                            handleInputChange('title', e.target.value);
                          }
                        }}
                        required
                        maxLength={100}
                      />
                      <small className="text-muted">{formData.title.length}/100 characters</small>
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
                        options={priority}
                        value={priority.find(opt => opt.value === formData.priority) || priority[0]}
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
                      Creating...
                    </>
                  ) : (
                    'Create Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Ticket */}
    </>
  );
};

export default TicketListModal;
