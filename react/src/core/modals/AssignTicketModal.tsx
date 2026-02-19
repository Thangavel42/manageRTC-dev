import React, { useState, useEffect, useRef } from "react";
import { useSocket } from "../../SocketContext";
import ImageWithBasePath from "../common/imageWithBasePath";
import CommonSelect from "../common/commonSelect";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string | null;
  ticketCount: number;
}

interface AssignTicketModalProps {
  onTicketAssigned?: () => void;
}

const AssignTicketModal: React.FC<AssignTicketModalProps> = ({ onTicketAssigned }) => {
  const socket = useSocket();

  // State
  const [ticketId, setTicketId] = useState<string>('');
  const [ticketTitle, setTicketTitle] = useState<string>('');
  const [currentAssignee, setCurrentAssignee] = useState<string>('');
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Employee options for dropdown
  const employeeOptions = [
    { value: "select", label: "Select Employee" },
    ...employees.map(emp => ({
      value: emp._id,
      label: `${emp.employeeId} ${emp.firstName} ${emp.lastName}`,
      employee: emp
    }))
  ];

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

  // Listen for modal show event to fetch ticket details
  useEffect(() => {
    const modal = modalRef.current;
    if (modal) {
      const handleModalShow = (e: any) => {
        const button = e.relatedTarget as HTMLElement;
        const ticketIdValue = button?.getAttribute('data-ticket-id');
        const ticketTitleValue = button?.getAttribute('data-ticket-title');
        const currentAssigneeValue = button?.getAttribute('data-current-assignee');
        const currentAssigneeIdValue = button?.getAttribute('data-current-assignee-id');

        setTicketId(ticketIdValue || '');
        setTicketTitle(ticketTitleValue || '');
        setCurrentAssignee(currentAssigneeValue || '');
        setCurrentAssigneeId(currentAssigneeIdValue || '');
        setMessage(null);

        // Fetch employees when modal opens
        fetchEmployees();
      };

      const handleModalClose = () => {
        setTicketId('');
        setTicketTitle('');
        setCurrentAssignee('');
        setCurrentAssigneeId('');
        setSelectedEmployee(null);
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
  }, [socket]);

  // Fetch all employees for assignment
  const fetchEmployees = () => {
    if (socket) {
      setLoadingEmployees(true);
      socket.emit('tickets/employees/get-all-list');
    }
  };

  // Listen for employees response
  useEffect(() => {
    if (socket) {
      const handleEmployeesResponse = (response: any) => {
        setLoadingEmployees(false);
        if (response.done) {
          setEmployees(response.data || []);

          // Pre-select current assignee if exists
          if (currentAssigneeId) {
            const currentEmp = response.data?.find((emp: Employee) => emp._id === currentAssigneeId);
            if (currentEmp) {
              setSelectedEmployee({
                value: currentEmp._id,
                label: `${currentEmp.employeeId} ${currentEmp.firstName} ${currentEmp.lastName}`,
                employee: currentEmp
              });
            }
          }
        } else {
          setMessage({type: 'error', text: 'Failed to load employees'});
        }
      };

      socket.on('tickets/employees/get-all-list-response', handleEmployeesResponse);

      return () => {
        socket.off('tickets/employees/get-all-list-response', handleEmployeesResponse);
      };
    }
  }, [socket, currentAssigneeId]);

  // Handle employee selection
  const handleEmployeeChange = (option: any) => {
    setSelectedEmployee(option);
  };

  // Handle assignment
  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEmployee || selectedEmployee.value === 'select') {
      setMessage({type: 'error', text: 'Please select an employee to assign'});
      return;
    }

    setLoading(true);
    setMessage(null);

    // Get current user info for assignment tracking
    const userStr = localStorage.getItem('user');
    let assignedBy = {
      employeeId: 'system',
      firstName: 'HR',
      lastName: 'Admin'
    };

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        assignedBy = {
          employeeId: user.userId || user.id || 'system',
          firstName: user.firstName || user.given_name || 'HR',
          lastName: user.lastName || user.family_name || 'Admin'
        };
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }

    const employee = selectedEmployee.employee;

    // Emit assign ticket event
    socket?.emit('tickets/assign-ticket', {
      ticketId: ticketId,
      assigneeId: employee._id,
      role: 'hr'
    });

    const timeout = setTimeout(() => {
      if (loading) {
        setMessage({type: 'error', text: 'Request timeout. Please try again.'});
        setLoading(false);
      }
    }, 10000);

    (window as any).ticketAssignTimeout = timeout;
  };

  // Listen for assignment response
  useEffect(() => {
    if (socket) {
      const handleAssignResponse = (response: any) => {
        if ((window as any).ticketAssignTimeout) {
          clearTimeout((window as any).ticketAssignTimeout);
          (window as any).ticketAssignTimeout = null;
        }

        if (response.done) {
          setMessage({type: 'success', text: 'Ticket assigned successfully!'});
          // Close modal after a short delay
          setTimeout(() => {
            closeModal();
            onTicketAssigned?.();
          }, 1500);
        } else {
          setMessage({type: 'error', text: response.error || 'Failed to assign ticket'});
        }
        setLoading(false);
      };

      socket.on('tickets/assign-ticket-response', handleAssignResponse);

      return () => {
        socket.off('tickets/assign-ticket-response', handleAssignResponse);
      };
    }
  }, [socket, onTicketAssigned]);

  return (
    <>
      {/* Assign Ticket Modal */}
      <div className="modal fade" id="assign_ticket" ref={modalRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">{currentAssigneeId ? 'Reassign Ticket' : 'Assign Ticket'}</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                {message && (
                  <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show`} role="alert">
                    {message.text}
                    <button type="button" className="btn-close" onClick={() => setMessage(null)}></button>
                  </div>
                )}

                {/* Ticket Info */}
                <div className="alert alert-info mb-3">
                  <div className="d-flex align-items-start">
                    <i className="ti ti-ticket fs-4 me-2"></i>
                    <div>
                      <h6 className="mb-1">{ticketTitle || 'Untitled Ticket'}</h6>
                      <small className="text-muted mb-0 d-block">
                        Ticket ID: {ticketId || 'N/A'}
                      </small>
                      {currentAssignee && (
                        <small className="text-muted d-block">
                          Currently assigned to: <span className="fw-medium">{currentAssignee}</span>
                        </small>
                      )}
                    </div>
                  </div>
                </div>

                {/* Employee Selection */}
                <div className="mb-3">
                  <label className="form-label">
                    Assign To Employee <span className="text-danger">*</span>
                  </label>
                  {loadingEmployees ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <small className="d-block mt-2 text-muted">Loading employees...</small>
                    </div>
                  ) : employees.length > 0 ? (
                    <>
                      <CommonSelect
                        className="select"
                        options={employeeOptions}
                        value={selectedEmployee || employeeOptions[0]}
                        onChange={handleEmployeeChange}
                      />
                      <small className="text-muted">
                        <i className="ti ti-info-circle me-1"></i>
                        Showing all active employees
                      </small>
                    </>
                  ) : (
                    <div className="alert alert-warning">
                      <i className="ti ti-alert-triangle me-1"></i>
                      No employees found
                    </div>
                  )}
                </div>

                {/* Selected Employee Preview */}
                {selectedEmployee && selectedEmployee.employee && (
                  <div className="card bg-light border mb-3">
                    <div className="card-body py-2">
                      <div className="d-flex align-items-center">
                        <ImageWithBasePath
                          src={selectedEmployee.employee.avatar || "assets/img/profiles/avatar-01.jpg"}
                          className="avatar avatar-sm rounded-circle me-2"
                          alt="Employee"
                        />
                        <div className="flex-fill">
                          <h6 className="mb-0">
                            {selectedEmployee.employee.employeeId} - {selectedEmployee.employee.firstName} {selectedEmployee.employee.lastName}
                          </h6>
                          <small className="text-muted">
                            {selectedEmployee.employee.email}
                          </small>
                        </div>
                        <span className={`badge ${selectedEmployee.employee.ticketCount > 0 ? 'bg-warning' : 'bg-success'}`}>
                          {selectedEmployee.employee.ticketCount} tickets
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={loading || loadingEmployees || !selectedEmployee || selectedEmployee.value === 'select'}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-user-check me-2"></i>
                      {currentAssigneeId ? 'Reassign Ticket' : 'Assign Ticket'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Assign Ticket Modal */}
    </>
  );
};

export default AssignTicketModal;
