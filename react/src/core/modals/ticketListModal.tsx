import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import CommonSelect from "../common/commonSelect";
import CommonTagsInput from "../common/Taginput";
import { useSocket } from "../../SocketContext";

const TicketListModal = () => {
  const socket = useSocket();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    subject: '',
    description: '',
    priority: '',
    status: '',
    assignedTo: []
  });
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  // Default categories - will be replaced with dynamic data
  const defaultCategories = [
    { value: "Select", label: "Select" },
    { value: "IT Support", label: "IT Support" },
    { value: "Hardware Issues", label: "Hardware Issues" },
    { value: "Software Issues", label: "Software Issues" },
    { value: "Connectivity", label: "Connectivity" },
    { value: "Payment Issues", label: "Payment Issues" },
    { value: "Account Issues", label: "Account Issues" },
  ];

  // Use dynamic categories if available, otherwise use default
  const eventCategory = categories.length > 0 ? categories : defaultCategories;
  
  const priority = [
    { value: "Select", label: "Select" },
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" },
  ];
  
  const status = [
    { value: "Select", label: "Select" },
    { value: "New", label: "New" },
    { value: "Open", label: "Open" },
    { value: "On Hold", label: "On Hold" },
    { value: "Reopened", label: "Reopened" },
    { value: "Solved", label: "Solved" },
    { value: "Closed", label: "Closed" },
  ];

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper function to close modal safely
  const closeModal = () => {
    try {
      if (modalRef.current) {
        // Try multiple methods to close the modal
        const modalElement = modalRef.current as any;
        
        // Method 1: Use Bootstrap's modal instance if available
        if (modalElement._bsModal) {
          modalElement._bsModal.hide();
          return;
        }
        
        // Method 2: Use global Bootstrap if available
        if ((window as any).bootstrap && (window as any).bootstrap.Modal) {
          const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
          if (modalInstance) {
            modalInstance.hide();
            return;
          }
        }
        
        // Method 3: Trigger close button click
        const closeButton = modalElement.querySelector('[data-bs-dismiss="modal"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
          return;
        }
        
        // Method 4: Remove modal classes manually
        modalElement.classList.remove('show');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.setAttribute('style', 'display: none');
        
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        
        // Restore body scroll
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Error closing modal:', error);
      // Fallback: just hide the modal element
      if (modalRef.current) {
        modalRef.current.style.display = 'none';
      }
    }
  };

  // Fetch dynamic data
  const fetchDynamicData = () => {
    if (socket) {
      // Fetch categories from existing tickets
      socket.emit('tickets/list/get-tickets', {
        page: 1,
        limit: 1000,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      socket.on('tickets/list/get-tickets-response', (response) => {
        if (response.done && response.data) {
          // Extract unique categories from tickets
          const uniqueCategories = Array.from(new Set(response.data.map((ticket: any) => ticket.category)));
          const categoryOptions = [
            { value: "Select", label: "Select" },
            ...uniqueCategories.map((cat: string) => ({ value: cat, label: cat }))
          ];
          setCategories(categoryOptions);
        }
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    // Validate form
    if (!formData.title || !formData.category || !formData.description) {
      setMessage({type: 'error', text: 'Please fill in all required fields (Title, Category, Description)'});
      return;
    }

    if (formData.category === 'Select' || formData.priority === 'Select' || formData.status === 'Select') {
      setMessage({type: 'error', text: 'Please select valid options for Category, Priority, and Status'});
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Prepare ticket data
      const ticketData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        subject: formData.subject,
        assignedTo: {
          _id: "507f1f77bcf86cd799439011", // Default user ID
          firstName: tags[0]?.split(' ')[0] || "Support",
          lastName: tags[0]?.split(' ')[1] || "Agent",
          email: "support@company.com",
          role: "IT Support Specialist"
        },
        createdBy: {
          _id: "507f1f77bcf86cd799439012", // Current user ID
          firstName: "Current",
          lastName: "User",
          email: "user@company.com",
          department: "General"
        },
        tags: tags,
        department: "IT Support",
        location: "Office"
      };

      console.log('Sending ticket data:', ticketData);
      console.log('Socket connected:', socket?.connected);
      console.log('Socket ID:', socket?.id);

      // Emit create ticket event
      socket?.emit('tickets/create-ticket', ticketData);

      // Set a timeout to handle cases where response doesn't come back
      const timeout = setTimeout(() => {
        if (loading) {
          setMessage({type: 'error', text: 'Request timeout. Please try again.'});
          setLoading(false);
        }
      }, 10000); // 10 second timeout

      // Store timeout ID to clear it when response comes back
      (window as any).ticketCreateTimeout = timeout;

    } catch (error) {
      console.error('Error creating ticket:', error);
      setMessage({type: 'error', text: 'Error creating ticket. Please try again.'});
      setLoading(false);
    }
  };

  // Fetch dynamic data on component mount
  useEffect(() => {
    fetchDynamicData();
  }, [socket]);

  // Set up socket listener for create ticket response
  useEffect(() => {
    if (socket) {
      const handleCreateTicketResponse = (response: any) => {
        console.log('Create ticket response:', response);
        
        // Clear the timeout
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
            subject: '',
            description: '',
            priority: '',
            status: '',
            assignedTo: []
          });
          setTags([]);
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
          subject: '',
          description: '',
          priority: '',
          status: '',
          assignedTo: []
        });
        setTags([]);
        setLoading(false);
        setMessage(null);
      };

      // Listen for modal close events
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
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="alert alert-info">
                    <small>
                      <strong>Debug:</strong> Category: {formData.category}, Priority: {formData.priority}, Status: {formData.status}
                    </small>
                  </div>
                )}
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Category <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={eventCategory}
                        value={eventCategory.find(opt => opt.value === formData.category) || eventCategory[0]}
                        onChange={(option: any) => handleInputChange('category', option?.value || '')}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Subject</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Subject"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Assign To</label>
                      <CommonTagsInput
                        value={tags}
                        onChange={setTags}
                        placeholder="Add assignee name"
                        className="custom-input-class"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Ticket Description <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        placeholder="Describe the issue or request"
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Priority <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={priority}
                        value={priority.find(opt => opt.value === formData.priority) || priority[0]}
                        onChange={(option: any) => handleInputChange('priority', option?.value || '')}
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label">Status <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={status.find(opt => opt.value === formData.status) || status[0]}
                        onChange={(option: any) => handleInputChange('status', option?.value || '')}
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
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    'Add Ticket'
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
