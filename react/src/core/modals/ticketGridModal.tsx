import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../../feature-module/router/all_routes";
import CommonSelect from "../common/commonSelect";
import CommonTagsInput from "../common/Taginput";
import { useSocket } from "../../SocketContext";

const TicketGridModal = () => {
  const routes = all_routes;
  const socket = useSocket();
  
  // Form state for edit modal
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: '',
    subject: '',
    description: '',
    priority: '',
    status: '',
    assignedTo: []
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editMessage, setEditMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // State for Add Ticket modal
  const [addFormData, setAddFormData] = useState({
    title: '',
    category: '',
    subject: '',
    description: '',
    priority: '',
    status: '',
    assignedTo: []
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addTags, setAddTags] = useState<string[]>([]);
  const [addMessage, setAddMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // State for selected ticket
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // Modal refs
  const addModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  const eventCategory = [
    { value: "Select", label: "Select" },
    { value: "IT Support", label: "IT Support" },
    { value: "Hardware Issues", label: "Hardware Issues" },
    { value: "Software Issues", label: "Software Issues" },
    { value: "Connectivity", label: "Connectivity" },
    { value: "Payment Issues", label: "Payment Issues" },
    { value: "Account Issues", label: "Account Issues" },
  ];
  
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
  const handleEditInputChange = (field: string, value: any) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Add Ticket form input changes
  const handleAddInputChange = (field: string, value: any) => {
    setAddFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Add Ticket form submission
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!addFormData.title || !addFormData.category || !addFormData.description) {
      setAddMessage({type: 'error', text: 'Please fill in all required fields (Title, Category, Description)'});
      return;
    }

    if (addFormData.category === 'Select' || addFormData.priority === 'Select' || addFormData.status === 'Select') {
      setAddMessage({type: 'error', text: 'Please select valid options for Category, Priority, and Status'});
      return;
    }

    setAddLoading(true);
    setAddMessage(null);

    try {
      // Prepare ticket data
      const ticketData = {
        title: addFormData.title,
        description: addFormData.description,
        category: addFormData.category,
        priority: addFormData.priority,
        status: addFormData.status,
        subject: addFormData.subject,
        assignedTo: {
          _id: "507f1f77bcf86cd799439011",
          firstName: addTags[0]?.split(' ')[0] || "Support",
          lastName: addTags[0]?.split(' ')[1] || "Agent",
          email: "support@company.com",
          role: "IT Support Specialist"
        },
        createdBy: {
          _id: "507f1f77bcf86cd799439012",
          firstName: "Current",
          lastName: "User",
          email: "user@company.com",
          department: "General"
        },
        tags: addTags,
        department: "IT Support",
        location: "Office"
      };

      console.log('Creating ticket:', ticketData);

      // Emit create ticket event
      socket?.emit('tickets/create-ticket', ticketData);

    } catch (error) {
      console.error('Error creating ticket:', error);
      setAddMessage({type: 'error', text: 'Error creating ticket. Please try again.'});
      setAddLoading(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTicket) return;
    
    // Validate form
    if (!editFormData.title || !editFormData.category || !editFormData.description) {
      setEditMessage({type: 'error', text: 'Please fill in all required fields (Title, Category, Description)'});
      return;
    }

    if (editFormData.category === 'Select' || editFormData.priority === 'Select' || editFormData.status === 'Select') {
      setEditMessage({type: 'error', text: 'Please select valid options for Category, Priority, and Status'});
      return;
    }

    setEditLoading(true);
    setEditMessage(null);

    try {
      // Prepare update data
      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        category: editFormData.category,
        priority: editFormData.priority,
        status: editFormData.status,
        subject: editFormData.subject,
        assignedTo: {
          _id: "507f1f77bcf86cd799439011",
          firstName: editTags[0]?.split(' ')[0] || "Support",
          lastName: editTags[0]?.split(' ')[1] || "Agent",
          email: "support@company.com",
          role: "IT Support Specialist"
        },
        tags: editTags,
        department: "IT Support",
        location: "Office"
      };

      console.log('Updating ticket:', selectedTicket.ticketId, updateData);

      // Emit update ticket event
      socket?.emit('tickets/update-ticket', {
        ticketId: selectedTicket.ticketId,
        updateData: updateData
      });

    } catch (error) {
      console.error('Error updating ticket:', error);
      setEditMessage({type: 'error', text: 'Error updating ticket. Please try again.'});
      setEditLoading(false);
    }
  };

  // Helper function to close modal safely
  const closeModal = (modalId: string) => {
    try {
      const modal = document.getElementById(modalId);
      if (modal) {
        const modalElement = modal as any;
        
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
        if (backdrop) backdrop.remove();
        
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Error closing modal:', error);
    }
  };

  // Listen for ticket selection from parent component
  useEffect(() => {
    const handleTicketSelection = (event: CustomEvent) => {
      const ticket = event.detail;
      setSelectedTicket(ticket);
      
      if (ticket) {
        // Populate edit form with ticket data
        setEditFormData({
          title: ticket.title || '',
          category: ticket.category || '',
          subject: ticket.subject || '',
          description: ticket.description || '',
          priority: ticket.priority || '',
          status: ticket.status || '',
          assignedTo: ticket.assignedTo || []
        });
        
        // Set tags
        if (ticket.assignedTo && ticket.assignedTo.firstName) {
          setEditTags([`${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName || ''}`.trim()]);
        } else {
          setEditTags([]);
        }
      }
    };

    window.addEventListener('ticketSelected', handleTicketSelection as EventListener);
    
    return () => {
      window.removeEventListener('ticketSelected', handleTicketSelection as EventListener);
    };
  }, []);

  // Reset forms when modals are closed
  useEffect(() => {
    const addModal = addModalRef.current;
    const editModal = editModalRef.current;
    const deleteModal = deleteModalRef.current;

    const handleModalClose = (modalType: string) => {
      if (modalType === 'add') {
        setAddFormData({
          title: '',
          category: '',
          subject: '',
          description: '',
          priority: '',
          status: '',
          assignedTo: []
        });
        setAddTags([]);
        setAddLoading(false);
        setAddMessage(null);
      } else if (modalType === 'edit') {
        setEditFormData({
          title: '',
          category: '',
          subject: '',
          description: '',
          priority: '',
          status: '',
          assignedTo: []
        });
        setEditTags([]);
        setEditLoading(false);
        setEditMessage(null);
        setSelectedTicket(null);
      } else if (modalType === 'delete') {
        setDeleteLoading(false);
        setSelectedTicket(null);
      }
    };

    if (addModal) {
      const handleAddClose = () => handleModalClose('add');
      addModal.addEventListener('hidden.bs.modal', handleAddClose);
    }

    if (editModal) {
      const handleEditClose = () => handleModalClose('edit');
      editModal.addEventListener('hidden.bs.modal', handleEditClose);
    }

    if (deleteModal) {
      const handleDeleteClose = () => handleModalClose('delete');
      deleteModal.addEventListener('hidden.bs.modal', handleDeleteClose);
    }

    return () => {
      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', () => handleModalClose('add'));
      }
      if (editModal) {
        editModal.removeEventListener('hidden.bs.modal', () => handleModalClose('edit'));
      }
      if (deleteModal) {
        deleteModal.removeEventListener('hidden.bs.modal', () => handleModalClose('delete'));
      }
    };
  }, []);

  // Confirm delete ticket
  const confirmDeleteTicket = async () => {
    if (!selectedTicket) return;

    setDeleteLoading(true);
    try {
      socket?.emit('tickets/delete-ticket', { ticketId: selectedTicket.ticketId });
    } catch (error) {
      console.error('Error deleting ticket:', error);
      setDeleteLoading(false);
    }
  };

  // Set up socket listeners
  useEffect(() => {
    if (socket) {
      const handleUpdateResponse = (response: any) => {
        console.log('Update ticket response:', response);
        
        if (response.done) {
          setEditMessage({type: 'success', text: 'Ticket updated successfully!'});
          setTimeout(() => {
            closeModal('edit_ticket');
            setEditMessage(null);
            setSelectedTicket(null);
          }, 1500);
        } else {
          setEditMessage({type: 'error', text: 'Error updating ticket: ' + response.error});
        }
        setEditLoading(false);
      };

      const handleDeleteResponse = (response: any) => {
        console.log('Delete ticket response:', response);
        
        if (response.done) {
          setTimeout(() => {
            closeModal('delete_modal');
            setSelectedTicket(null);
          }, 1000);
        }
        setDeleteLoading(false);
      };

      const handleCreateResponse = (response: any) => {
        console.log('Create ticket response:', response);
        
        if (response.done) {
          setAddMessage({type: 'success', text: 'Ticket created successfully!'});
          // Reset form
          setAddFormData({
            title: '',
            category: '',
            subject: '',
            description: '',
            priority: '',
            status: '',
            assignedTo: []
          });
          setAddTags([]);
          // Close modal after a short delay
          setTimeout(() => {
            closeModal('add_ticket');
            setAddMessage(null);
          }, 1500);
        } else {
          setAddMessage({type: 'error', text: 'Error creating ticket: ' + response.error});
        }
        setAddLoading(false);
      };

      socket.on('tickets/update-ticket-response', handleUpdateResponse);
      socket.on('tickets/delete-ticket-response', handleDeleteResponse);
      socket.on('tickets/create-ticket-response', handleCreateResponse);

      return () => {
        socket.off('tickets/update-ticket-response', handleUpdateResponse);
        socket.off('tickets/delete-ticket-response', handleDeleteResponse);
        socket.off('tickets/create-ticket-response', handleCreateResponse);
      };
    }
  }, [socket]);
  return (
    <>
      {/* Add Ticket */}
      <div className="modal fade" id="add_ticket" ref={addModalRef}>
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
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {addMessage && (
                  <div className={`alert ${addMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {addMessage.text}
                    <button type="button" className="btn-close" onClick={() => setAddMessage(null)}></button>
                  </div>
                )}
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={addFormData.title}
                        onChange={(e) => handleAddInputChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Category <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={eventCategory}
                        value={eventCategory.find(opt => opt.value === addFormData.category) || eventCategory[0]}
                        onChange={(option: any) => handleAddInputChange('category', option?.value || '')}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Subject</label>
                      <input 
                        type="text" 
                        className="form-control"
                        value={addFormData.subject}
                        onChange={(e) => handleAddInputChange('subject', e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Assign To</label>
                      <CommonTagsInput
                        value={addTags}
                        onChange={setAddTags}
                        placeholder="Add assignee name"
                        className="custom-input-class"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Ticket Description <span className="text-danger">*</span></label>
                      <textarea 
                        className="form-control" 
                        value={addFormData.description}
                        onChange={(e) => handleAddInputChange('description', e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Priority <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={priority}
                        value={priority.find(opt => opt.value === addFormData.priority) || priority[0]}
                        onChange={(option: any) => handleAddInputChange('priority', option?.value || '')}
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label">Status <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={status}
                        value={status.find(opt => opt.value === addFormData.status) || status[0]}
                        onChange={(option: any) => handleAddInputChange('status', option?.value || '')}
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
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addLoading}
                >
                  {addLoading ? (
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
      {/* Edit Ticket */}
      <div className="modal fade" id="edit_ticket" ref={editModalRef}>
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
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editMessage && (
                  <div className={`alert ${editMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {editMessage.text}
                    <button type="button" className="btn-close" onClick={() => setEditMessage(null)}></button>
                  </div>
                )}
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Title <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.title}
                        onChange={(e) => handleEditInputChange('title', e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Category <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={eventCategory}
                        defaultValue={eventCategory.find(opt => opt.value === editFormData.category) || eventCategory[0]}
                        onChange={(option: any) => handleEditInputChange('category', option?.value || '')}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Subject</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editFormData.subject}
                        onChange={(e) => handleEditInputChange('subject', e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Assign To</label>
                      <CommonTagsInput
                        value={editTags}
                        onChange={setEditTags}
                        placeholder="Add assignee name"
                        className="custom-input-class"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Ticket Description <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control"
                        placeholder="Describe the issue or request"
                        value={editFormData.description}
                        onChange={(e) => handleEditInputChange('description', e.target.value)}
                        rows={4}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Priority <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={priority}
                        defaultValue={priority.find(opt => opt.value === editFormData.priority) || priority[0]}
                        onChange={(option: any) => handleEditInputChange('priority', option?.value || '')}
                      />
                    </div>
                    <div className="mb-0">
                      <label className="form-label">Status <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={status}
                        defaultValue={status.find(opt => opt.value === editFormData.status) || status[0]}
                        onChange={(option: any) => handleEditInputChange('status', option?.value || '')}
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
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Ticket */}

      {/* Delete Confirmation Modal */}
      <div className="modal fade" id="delete_modal" ref={deleteModalRef}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Delete Ticket</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="text-center">
                <div className="mb-3">
                  <i className="ti ti-alert-circle text-danger" style={{fontSize: '3rem'}}></i>
                </div>
                <h5>Are you sure you want to delete this ticket?</h5>
                <p className="text-muted">
                  This action cannot be undone. The ticket "{selectedTicket?.title || 'Untitled'}" will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light me-2"
                data-bs-dismiss="modal"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDeleteTicket}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Deleting...
                  </>
                ) : (
                  'Delete Ticket'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Confirmation Modal */}
    </>
  );
};

export default TicketGridModal;
