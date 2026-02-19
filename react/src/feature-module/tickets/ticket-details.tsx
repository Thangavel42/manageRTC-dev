import jsPDF from "jspdf";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import * as XLSX from "xlsx";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import Footer from "../../core/common/footer";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import TicketListModal from "../../core/modals/ticketListModal";
import { useAuth } from "../../hooks/useAuth";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface Comment {
  _id?: string;
  text: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  createdAt: string;
  isInternal?: boolean;
  attachments?: string[];
}

const TicketDetails = () => {
  const routes = all_routes;
  const socket = useSocket();
  const { role, userId } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('id');

  // Permission states
  const [isHRorAdmin, setIsHRorAdmin] = useState(false);
  const [canReopen, setCanReopen] = useState(false);
  const [canComment, setCanComment] = useState(false);

  // State for dynamic data
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  // State for form controls
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);

  // State for employees list (for HR assignment)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // State for comment editing
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentLoading, setEditCommentLoading] = useState(false);

  // State for export functionality
  const [exportLoading, setExportLoading] = useState(false);

  // State for collapsible sections
  const [isTicketDetailsOpen, setIsTicketDetailsOpen] = useState(true);
  const [isTicketTimelineOpen, setIsTicketTimelineOpen] = useState(true);

  // Fetch ticket details
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (socket && ticketId) {
      fetchTicketDetails();

      // Listen for real-time updates - instant reload for better UX
      socket.on('tickets/ticket-updated', (data: any) => {
        if (data.data?.ticketId === ticketId) {
          setTicket(data.data);
          // Also sync form controls with updated data
          if (data.data?.priority) setPriority(data.data.priority);
          if (data.data?.status) setStatus(data.data.status);
          if (data.data?.assignedTo?._id) setAssignedTo(data.data.assignedTo._id);
        }
      });

      socket.on('tickets/ticket-comment-added', (data: any) => {
        if (data.data?.ticketId === ticketId) {
          setTicket(data.data);
        }
      });

      socket.on('tickets/ticket-assigned', (data: any) => {
        if (data.data?.ticketId === ticketId) {
          setTicket(data.data);
          if (data.data?.assignedTo?._id) setAssignedTo(data.data.assignedTo._id);
        }
      });

      return () => {
        socket.off('tickets/ticket-updated');
        socket.off('tickets/ticket-comment-added');
        socket.off('tickets/ticket-assigned');
      };
    }
  }, [socket, ticketId]);

  // Fetch employees list for HR assignment
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (socket && isHRorAdmin) {
      fetchEmployees();
    }
  }, [socket, isHRorAdmin]);

  // Fetch current employee data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (socket) {
      socket.emit('tickets/get-current-employee');

      const handleEmployeeResponse = (response: any) => {
        if (response.done && response.data) {
          setCurrentEmployee(response.data);
        } else {
          console.error('Failed to load current employee:', response.error);
        }
      };

      socket.on('tickets/get-current-employee-response', handleEmployeeResponse);

      return () => {
        socket.off('tickets/get-current-employee-response', handleEmployeeResponse);
      };
    }
  }, [socket]);

  // Update permissions when currentEmployee and ticket are loaded
  // This ensures we use the MongoDB employee _id for comparison, not Clerk userId
  useEffect(() => {
    if (currentEmployee?._id && ticket) {
      const ticketCreatorId = ticket.createdBy?._id || '';
      const assignedUserId = ticket.assignedTo?._id || '';
      const userRole = role || '';

      const currentEmployeeId = currentEmployee._id;
      const isCreator = currentEmployeeId === ticketCreatorId;
      const isAssigned = currentEmployeeId === assignedUserId;

      setIsHRorAdmin(['superadmin', 'admin', 'hr'].includes(userRole));
      // Can reopen if: (HR/Admin) OR (ticket creator AND status is Resolved or Closed)
      setCanReopen(
        ['superadmin', 'admin', 'hr'].includes(userRole) ||
        ((ticket.status === 'Resolved' || ticket.status === 'Closed') &&
        isCreator)
      );
      // Can comment if: HR/Admin OR assigned user OR ticket creator
      setCanComment(
        ['superadmin', 'admin', 'hr'].includes(role) ||
        isAssigned ||
        isCreator
      );

      console.log('📋 Permissions updated:', {
        currentEmployeeId,
        ticketCreatorId,
        assignedUserId,
        isCreator,
        isAssigned,
        canReopen: ['superadmin', 'admin', 'hr'].includes(userRole) ||
          ((ticket.status === 'Resolved' || ticket.status === 'Closed') && isCreator),
        canComment: ['superadmin', 'admin', 'hr'].includes(role) || isAssigned || isCreator
      });
    }
  }, [currentEmployee, ticket, role]);

  const fetchEmployees = () => {
    if (socket) {
      setEmployeesLoading(true);
      socket.emit('tickets/employees/get-all-list');

      const handleResponse = (response: any) => {
        setEmployeesLoading(false);
        if (response.done && response.data) {
          setEmployees(response.data);
        } else {
          console.error('Failed to fetch employees:', response.error);
        }
      };

      socket.on('tickets/employees/get-all-list-response', handleResponse);

      setTimeout(() => {
        socket.off('tickets/employees/get-all-list-response', handleResponse);
      }, 10000);
    }
  };

  const fetchTicketDetails = () => {
    if (socket && ticketId) {
      if (!ticketId || !ticketId.includes('TIC-')) {
        console.error('❌ Invalid ticket ID format:', ticketId);
        setLoading(false);
        setError('Invalid ticket ID format. Please check the URL.');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('🔍 Fetching ticket details for ID:', ticketId);
      socket.emit('tickets/details/get-ticket', { ticketId });

      const handleResponse = (response: any) => {
        console.log('Ticket details response:', response);
        setLoading(false);

        if (response.done && response.data) {
          setTicket(response.data);
          setPriority(response.data.priority || '');
          setStatus(response.data.status || '');
          setAssignedTo(response.data.assignedTo?._id || '');

          // Check user permissions
          const ticketCreatorId = response.data.createdBy?._id || '';
          const assignedUserId = response.data.assignedTo?._id || '';
          const userRole = role || '';

          // Note: We need to check against currentEmployee._id (MongoDB _id)
          // not userId (Clerk user ID). But currentEmployee might not be loaded yet,
          // so we'll check both and update in the useEffect below.
          const isCreator = userId === ticketCreatorId;
          const isAssigned = userId === assignedUserId;

          setIsHRorAdmin(['superadmin', 'admin', 'hr'].includes(userRole));
          // Can reopen if: (HR/Admin) OR (ticket creator AND status is Resolved or Closed)
          setCanReopen(
            ['superadmin', 'admin', 'hr'].includes(userRole) ||
            ((response.data.status === 'Resolved' || response.data.status === 'Closed') &&
            isCreator)
          );
          // Can comment if: HR/Admin OR assigned user OR ticket creator
          setCanComment(
            ['superadmin', 'admin', 'hr'].includes(role) ||
            isAssigned ||
            isCreator
          );
        } else {
          setError(response.error || 'Failed to load ticket details');
          setTicket(null);
        }
      };

      const timeout = setTimeout(() => {
        socket.off('tickets/details/get-ticket-response', handleResponse);
        if (loading) {
          setLoading(false);
          setError('Request timed out');
        }
      }, 10000);

      const handleResponseWithCleanup = (response: any) => {
        clearTimeout(timeout);
        handleResponse(response);
        socket.off('tickets/details/get-ticket-response', handleResponseWithCleanup);
      };

      socket.on('tickets/details/get-ticket-response', handleResponseWithCleanup);
    } else {
      setLoading(false);
      setError('Ticket ID is required');
    }
  };

  const handleAddComment = () => {
    // Check if user can add comment (HR/Admin or assigned user or ticket creator)
    if (!canComment) {
      setError('Only HR, Admin, assigned users, and ticket creator can add comments');
      return;
    }

    if (!currentEmployee || !currentEmployee._id) {
      setError('Employee information not available. Please try again.');
      return;
    }

    if (socket && ticketId && newComment.trim()) {
      setCommentLoading(true);

      socket.emit('tickets/add-comment', {
        ticketId,
        text: newComment,
        author: currentEmployee._id, // Store only employee ObjectId
        isInternal: false
      });

      const handleCommentResponse = (response: any) => {
        console.log('Comment response:', response);
        setCommentLoading(false);

        if (response.done) {
          setNewComment('');
          fetchTicketDetails();
        } else {
          setError(response.error || 'Failed to add comment');
        }
      };

      socket.on('tickets/add-comment-response', handleCommentResponse);

      setTimeout(() => {
        socket.off('tickets/add-comment-response', handleCommentResponse);
      }, 5000);
    }
  };

  // Handle comment edit
  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment._id || '');
    setEditCommentText(comment.text);
  };

  const handleSaveEdit = () => {
    if (socket && ticketId && editingCommentId && editCommentText.trim()) {
      setEditCommentLoading(true);

      socket.emit('tickets/update-ticket', {
        ticketId,
        updateData: {
          'comments.$.text': editCommentText
        }
      });

      const handleResponse = (response: any) => {
        setEditCommentLoading(false);
        if (response.done) {
          setEditingCommentId(null);
          setEditCommentText('');
          fetchTicketDetails();
        } else {
          setError(response.error || 'Failed to update comment');
        }
      };

      socket.on('tickets/update-ticket-response', handleResponse);
      setTimeout(() => {
        socket.off('tickets/update-ticket-response', handleResponse);
      }, 5000);
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  // Handle delete comment (HR/Admin only)
  const handleDeleteComment = (commentIndex: number) => {
    if (!isHRorAdmin) {
      setError('Only HR and Admin can delete comments');
      return;
    }

    if (socket && ticketId && ticket?.comments) {
      setCommentLoading(true);

      // Remove comment at index
      const updatedComments = ticket.comments.filter((_: any, i: number) => i !== commentIndex);

      socket.emit('tickets/update-ticket', {
        ticketId,
        updateData: {
          comments: updatedComments
        }
      });

      const handleResponse = (response: any) => {
        setCommentLoading(false);
        if (response.done) {
          fetchTicketDetails();
        } else {
          setError(response.error || 'Failed to delete comment');
        }
      };

      socket.on('tickets/update-ticket-response', handleResponse);
      setTimeout(() => {
        socket.off('tickets/update-ticket-response', handleResponse);
      }, 5000);
    }
  };

  // Handle priority change
  const handlePriorityChange = (option: any) => {
    if (option?.value && option.value !== priority) {
      setPriority(option.value);
      updateTicketField('priority', option.value);
    }
  };

  // Handle status change
  const handleStatusChange = (option: any) => {
    if (option?.value && option.value !== status) {
      setStatus(option.value);
      updateTicketField('status', option.value);
    }
  };

  // Handle assignee change (HR only - uses proper assignment endpoint)
  const handleAssigneeChange = (option: any) => {
    if (option?.value && isHRorAdmin) {
      const employee = employees.find(e => e._id === option.value);
      if (employee) {
        setAssignedTo(option.value);
        setUpdateLoading(true);

        socket.emit('tickets/assign-ticket', {
          ticketId: ticketId,
          assigneeId: employee._id
        });

        const handleResponse = (response: any) => {
          setUpdateLoading(false);
          if (!response.done) {
            setError(response.error || 'Failed to assign ticket');
          }
        };

        socket.on('tickets/assign-ticket-response', handleResponse);
        setTimeout(() => {
          socket.off('tickets/assign-ticket-response', handleResponse);
        }, 10000);
      }
    }
  };

  // Update ticket field via socket
  const updateTicketField = (field: string, value: any) => {
    if (socket && ticketId) {
      if (!ticketId || !ticketId.includes('TIC-')) {
        console.error('❌ Invalid ticket ID format for update:', ticketId);
        setError('Invalid ticket ID format. Cannot update ticket.');
        return;
      }

      setUpdateLoading(true);

      const updateData = {
        ticketId,
        updateData: {
          [field]: value
        }
      };

      console.log('🔄 FRONTEND: Updating ticket field:', field, 'with value:', value);
      socket.emit('tickets/update-ticket', updateData);

      const timeout = setTimeout(() => {
        socket.off('tickets/update-ticket-response', handleUpdateResponse);
        setUpdateLoading(false);
        setError('Update request timed out');
      }, 10000);

      const handleUpdateResponse = (response: any) => {
        console.log('Update response:', response);
        clearTimeout(timeout);
        setUpdateLoading(false);

        if (!response.done) {
          setError(response.error || `Failed to update ${field}`);
          if (field === 'priority') setPriority(ticket?.priority || '');
          if (field === 'status') setStatus(ticket?.status || '');
          if (field === 'assignedTo') setAssignedTo(ticket?.assignedTo?._id || '');
        }

        socket.off('tickets/update-ticket-response', handleUpdateResponse);
      };

      socket.on('tickets/update-ticket-response', handleUpdateResponse);
    }
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    if (!ticket) return;

    try {
      setExportLoading(true);
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();
      const currentYear = new Date().getFullYear();

      const textColor = [33, 37, 41];

      const addCompanyLogo = async () => {
        const logoPaths = [
          '/assets/img/logo.svg',
          '/assets/img/logo-white.svg',
          '/assets/img/logo-small.svg',
        ];

        for (const logoPath of logoPaths) {
          try {
            const response = await fetch(`${logoPath}?v=${Date.now()}`, {
              method: 'GET',
              cache: 'no-store',
            });

            if (response.ok) {
              const svgText = await response.text();
              if (svgText.includes('<svg') && svgText.length > 100) {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                canvas.width = 115;
                canvas.height = 40;

                await new Promise((resolve, reject) => {
                  img.onload = () => {
                    ctx?.drawImage(img, 0, 0, 115, 40);
                    resolve(canvas.toDataURL('image/png'));
                  };
                  img.onerror = reject;
                  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
                  img.src = svgDataUrl;
                });

                const pngDataUrl = canvas.toDataURL('image/png');
                doc.addImage(pngDataUrl, 'PNG', 20, 15, 30, 10.4);
                return true;
              }
            }
          } catch (error) {
            console.log(`Error loading ${logoPath}:`, error);
          }
        }
        return false;
      };

      await addCompanyLogo();

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Ticket Details Report', 50, 30);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 50, 40);
      doc.text(`Ticket ID: ${ticket.ticketId || 'N/A'}`, 50, 45);

      (doc as any).setGState(new (doc as any).GState({opacity: 0.1}));
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIDENTIAL', 105, 150, { angle: 45 });
      (doc as any).setGState(new (doc as any).GState({opacity: 1}));

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10);

      let yPosition = 60;

      const ticketDetails = [
        { label: 'Ticket ID', value: ticket.ticketId || 'N/A' },
        { label: 'Title', value: ticket.title || 'Untitled' },
        { label: 'Category', value: ticket.category || 'N/A' },
        { label: 'Subcategory', value: ticket.subCategory || 'N/A' },
        { label: 'Priority', value: ticket.priority || 'N/A' },
        { label: 'Status', value: ticket.status || 'N/A' },
        { label: 'Created By', value: ticket.createdBy?.firstName && ticket.createdBy?.lastName ?
          `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'N/A' },
        { label: 'Assigned To', value: ticket.assignedTo?.firstName && ticket.assignedTo?.lastName ?
          `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned' },
        { label: 'Created Date', value: ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A' },
        { label: 'Last Updated', value: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'N/A' }
      ];

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      ticketDetails.forEach((detail) => {
        doc.setFont('helvetica', 'bold');
        doc.text(`${detail.label}:`, 15, yPosition);
        doc.setFont('helvetica', 'normal');
        const valueText = doc.splitTextToSize(detail.value, 120);
        doc.text(valueText, 80, yPosition);
        yPosition += Math.max(8, valueText.length * 4) + 2;
      });

      if (ticket.description) {
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Description:', 15, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const descriptionLines = doc.splitTextToSize(ticket.description, 180);
        doc.text(descriptionLines, 15, yPosition);
        yPosition += descriptionLines.length * 4 + 10;
      }

      if (ticket.comments && ticket.comments.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Comments:', 15, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        ticket.comments.forEach((comment: any, index: number) => {
          doc.setFont('helvetica', 'bold');
          const authorName = comment.author?.firstName && comment.author?.lastName ?
            `${comment.author.firstName} ${comment.author.lastName}` : 'Unknown User';
          const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'N/A';
          doc.text(`Comment ${index + 1} by ${authorName} on ${commentDate}:`, 15, yPosition);
          yPosition += 6;

          doc.setFont('helvetica', 'normal');
          const commentLines = doc.splitTextToSize(comment.text || 'No text', 180);
          doc.text(commentLines, 15, yPosition);
          yPosition += commentLines.length * 4 + 10;
        });
      }

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`© ${currentYear} AMASQIS HRMS. All rights reserved.`, 15, doc.internal.pageSize.height - 15);
      doc.text(`Report generated on ${currentDate} at ${currentTime}`, 15, doc.internal.pageSize.height - 10);

      doc.save(`ticket-${ticket.ticketId || 'details'}-${currentDate.replace(/\//g, '-')}.pdf`);

      setExportLoading(false);
      console.log("PDF export completed successfully!");

    } catch (error) {
      console.error("Error generating PDF:", error);
      setExportLoading(false);
      alert("Failed to export PDF");
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    if (!ticket) return;

    try {
      setExportLoading(true);
      const currentDate = new Date().toLocaleDateString();
      const wb = XLSX.utils.book_new();

      const ticketDataForExcel = {
        "Ticket ID": ticket.ticketId || "",
        "Title": ticket.title || "",
        "Description": ticket.description || "",
        "Category": ticket.category || "",
        "Subcategory": ticket.subCategory || "",
        "Status": ticket.status || "",
        "Priority": ticket.priority || "",
        "Assigned To": ticket.assignedTo?.firstName && ticket.assignedTo?.lastName
          ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
          : "Unassigned",
        "Created By": ticket.createdBy?.firstName && ticket.createdBy?.lastName
          ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`
          : "Unknown",
        "Created Date": ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : "",
        "Updated Date": ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : "",
        "Comments Count": ticket.comments?.length || 0,
      };

      const ws = XLSX.utils.json_to_sheet([ticketDataForExcel]);
      ws['!cols'] = [
        { wch: 15 }, { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Ticket Details");

      if (ticket.comments && ticket.comments.length > 0) {
        const commentsData = ticket.comments.map((comment: any, index: number) => ({
          "#": index + 1,
          "Author": comment.author?.firstName && comment.author?.lastName
            ? `${comment.author.firstName} ${comment.author.lastName}`
            : "Unknown",
          "Date": comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : "N/A",
          "Comment": comment.text || "No text",
        }));

        const commentsWs = XLSX.utils.json_to_sheet(commentsData);
        commentsWs['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, commentsWs, "Comments");
      }

      XLSX.writeFile(wb, `ticket-${ticket.ticketId || 'details'}-${currentDate.replace(/\//g, '-')}.xlsx`);

      setExportLoading(false);
      console.log("Excel export completed successfully!");

    } catch (error) {
      console.error("Error generating Excel:", error);
      setExportLoading(false);
      alert("Failed to export Excel");
    }
  };

  // Priority options
  const priorityOptions = [
    { value: "Critical", label: "Critical" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];

  // Employee options for assignment (HR only)
  const employeeOptions = [
    { value: "", label: employeesLoading ? "Loading..." : isHRorAdmin ? "Unassigned" : "Not Available" },
    ...employees.map(emp => ({
      value: emp._id,
      label: `${emp.employeeId} ${emp.firstName} ${emp.lastName}`
    }))
  ];

  // Ticket status options
  const ticketStatus = [
    { value: "Open", label: "Open" },
    { value: "Assigned", label: "Assigned" },
    { value: "In Progress", label: "In Progress" },
    { value: "On Hold", label: "On Hold" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
    { value: "Reopened", label: "Reopened" },
  ];

  // Check if user can edit a specific comment
  const canEditComment = (comment: Comment) => {
    return comment.author._id === userId;
  };

  return (
    <>
      {/* Timeline Styles */}
      <style>{`
        .timeline {
          position: relative;
          padding-left: 20px;
        }
        .timeline-item {
          position: relative;
          padding-bottom: 20px;
          padding-left: 30px;
        }
        .timeline-item:last-child {
          padding-bottom: 0;
        }
        .timeline-marker {
          position: absolute;
          left: 0;
          top: 0;
          display: flex;
          align-items: center;
        }
        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          z-index: 1;
          border: 2px solid white;
          box-shadow: 0 0 0 2px #dee2e6;
        }
        .timeline-line {
          position: absolute;
          left: 5px;
          top: 12px;
          width: 2px;
          height: calc(100% + 8px);
          background-color: #dee2e6;
          z-index: 0;
        }
        .timeline-content {
          position: relative;
        }
      `}</style>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="mb-2">
              <h6 className="fw-medium d-flex align-items-center">
                <Link to={routes.tickets}>
                  <i className="ti ti-arrow-left me-2" />
                  Ticket Details
                </Link>
                {ticket && (
                  <span className="text-muted ms-2">- {ticket.title || 'Untitled'}</span>
                )}
              </h6>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    {exportLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                        Exporting...
                      </>
                    ) : (
                      <>
                        <i className="ti ti-file-export me-1" />
                        Export
                      </>
                    )}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); handleExportPDF(); }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="#"
                        className="dropdown-item rounded-1"
                        onClick={(e) => { e.preventDefault(); handleExportExcel(); }}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-bs-target="#add_ticket"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Ticket
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="row">
              <div className="col-xl-9 col-md-8">
                <div className="card">
                  <div className="card-header">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="w-50">
                        <div className="bg-light rounded" style={{ height: '24px', width: '60%' }}></div>
                        <div className="bg-light rounded mt-2" style={{ height: '16px', width: '40%' }}></div>
                      </div>
                      <div className="d-flex gap-2">
                        <div className="bg-light rounded" style={{ height: '32px', width: '80px' }}></div>
                        <div className="bg-light rounded" style={{ height: '32px', width: '100px' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="bg-light rounded mb-3" style={{ height: '40px', width: '100%' }}></div>
                    <div className="bg-light rounded mb-2" style={{ height: '20px', width: '100%' }}></div>
                    <div className="bg-light rounded mb-2" style={{ height: '20px', width: '90%' }}></div>
                    <div className="bg-light rounded mb-4" style={{ height: '20px', width: '80%' }}></div>

                    <div className="mt-4">
                      <div className="bg-light rounded mb-3" style={{ height: '30px', width: '30%' }}></div>
                      <div className="bg-light rounded mb-2" style={{ height: '80px', width: '100%' }}></div>
                      <div className="bg-light rounded mb-2" style={{ height: '80px', width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-3 col-md-4">
                <div className="card">
                  <div className="card-header">
                    <div className="bg-light rounded" style={{ height: '24px', width: '60%' }}></div>
                  </div>
                  <div className="card-body">
                    <div className="bg-light rounded mb-3" style={{ height: '20px', width: '100%' }}></div>
                    <div className="bg-light rounded mb-3" style={{ height: '20px', width: '100%' }}></div>
                    <div className="bg-light rounded mb-3" style={{ height: '20px', width: '100%' }}></div>
                  </div>
                </div>

                <div className="card mt-3">
                  <div className="card-header">
                    <div className="bg-light rounded" style={{ height: '24px', width: '60%' }}></div>
                  </div>
                  <div className="card-body">
                    <div className="bg-light rounded mb-3" style={{ height: '40px', width: '100%' }}></div>
                    <div className="bg-light rounded mb-3" style={{ height: '40px', width: '100%' }}></div>
                  </div>
                </div>
              </div>

              <div className="col-12 text-center mt-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading ticket details...</span>
                </div>
                <p className="mt-2 text-muted">Loading ticket details...</p>
              </div>
            </div>
          )}

          {/* Ticket Not Found */}
          {!loading && !ticket && (
            <div className="card">
              <div className="card-body text-center py-5">
                <div className="mb-3">
                  <i className="ti ti-ticket-off" style={{ fontSize: '64px', color: '#ccc' }}></i>
                </div>
                <h4 className="mb-2">Ticket Not Found</h4>
                <p className="text-muted mb-4">
                  The ticket you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Link to={routes.tickets} className="btn btn-primary">
                  <i className="ti ti-arrow-left me-2"></i>
                  Back to Tickets
                </Link>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!loading && ticket && (
            <div className="row">
              <div className="col-xl-9 col-md-8">
                <div className="card">
                  <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                    <div>
                      <h5 className="text-info fw-medium mb-0">{ticket?.category || 'N/A'}</h5>
                      {ticket?.subCategory && (
                        <small className="text-muted">
                          <i className="ti ti-arrow-right me-1" />
                          {ticket.subCategory}
                        </small>
                      )}
                    </div>
                    <div className="d-flex align-items-center">
                      <span className={`badge me-3 ${
                        ticket?.priority === 'Critical' ? 'bg-danger' :
                        ticket?.priority === 'High' ? 'bg-danger' :
                        ticket?.priority === 'Medium' ? 'bg-warning' : 'bg-success'
                      }`}>
                        <i className="ti ti-circle-filled fs-5 me-1" />
                        {ticket?.priority || 'Medium'}
                      </span>
                      {canReopen && (
                        <Link
                          to="#"
                          className="btn btn-warning btn-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            updateTicketField('status', 'Reopened');
                          }}
                        >
                          <i className="ti ti-rotate me-1" />
                          Reopen Ticket
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <div>
                      <div className="d-flex align-items-center justify-content-between flex-wrap border-bottom mb-3">
                        <div className="d-flex align-items-center flex-wrap">
                          <div className="mb-3">
                            {ticket ? (
                              <>
                                <span className="badge badge-info rounded-pill mb-2">
                                  {ticket.ticketId || 'N/A'}
                                </span>
                                <div className="d-flex align-items-center mb-2">
                                  <h5 className="fw-semibold me-2">{ticket.title || 'Untitled'}</h5>
                                  <span className={`badge d-flex align-items-center ms-1 ${
                                    ticket.status === 'Closed' ? 'bg-success' :
                                    ticket.status === 'Open' ? 'bg-primary' :
                                    ticket.status === 'In Progress' ? 'bg-info' :
                                    ticket.status === 'On Hold' ? 'bg-warning' :
                                    ticket.status === 'Resolved' ? 'bg-success' :
                                    ticket.status === 'Reopened' ? 'bg-danger' : 'bg-secondary'
                                  }`}>
                                    <i className="ti ti-circle-filled fs-5 me-1" />
                                    {ticket.status || 'N/A'}
                                  </span>
                                </div>
                                <div className="d-flex align-items-center flex-wrap row-gap-2">
                                  <p className="d-flex align-items-center mb-0 me-3">
                                    {ticket.assignedTo ? (
                                      <ImageWithBasePath
                                        src={ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg"}
                                        className="avatar avatar-xs rounded-circle me-2"
                                        alt="Assigned"
                                      />
                                    ) : (
                                      <ImageWithBasePath
                                        src="assets/img/profiles/avatar-01.jpg"
                                        className="avatar avatar-xs rounded-circle me-2"
                                        alt="Unassigned"
                                        style={{ opacity: 0.5 }}
                                      />
                                    )}
                                    Assigned to
                                    <span className="text-dark ms-1">
                                      {ticket.assignedTo?._id && currentEmployee?._id && ticket.assignedTo._id === currentEmployee._id
                                        ? 'You'
                                        : ticket.assignedTo?.firstName && ticket.assignedTo?.lastName
                                        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                                        : 'Unassigned'
                                      }
                                    </span>
                                  </p>
                                  <p className="d-flex align-items-center mb-0 me-3">
                                    <i className="ti ti-calendar-bolt me-1" />
                                    Updated {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'N/A'}
                                  </p>
                                  <p className="d-flex align-items-center mb-0">
                                    <i className="ti ti-message-circle-share me-1" />
                                    {ticket.comments?.length || 0} Comments
                                  </p>
                                </div>
                              </>
                            ) : (
                              <p>Ticket not found</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="border-bottom mb-3 pb-3">
                        <div>
                          <p className="mb-3">
                            {ticket?.description || 'No description available'}
                          </p>
                        </div>

                        {/* Comments Section */}
                        {ticket?.comments && ticket.comments.length > 0 && (
                          <div className="mt-4">
                            <h5 className="mb-3">Comments ({ticket.comments.length})</h5>
                            {ticket.comments.map((comment: any, index: number) => (
                              <div key={index} className="card mb-3">
                                <div className="card-body">
                                  <div className="d-flex align-items-start mb-3">
                                    <span className="avatar avatar-lg avatar-rounded me-2 flex-shrink-0">
                                      <ImageWithBasePath
                                        src={comment.author?.avatarUrl || comment.author?.avatar || "assets/img/profiles/avatar-01.jpg"}
                                        alt="Img"
                                      />
                                    </span>
                                    <div className="flex-grow-1">
                                      <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                          <h6 className="fw-medium mb-1">
                                            {comment.author?.employeeId && comment.author?.firstName && comment.author?.lastName
                                              ? `${comment.author.employeeId} ${comment.author.firstName} ${comment.author.lastName}`
                                              : comment.author?.firstName && comment.author?.lastName
                                              ? `${comment.author.firstName} ${comment.author.lastName}`
                                              : 'Unknown User'
                                            }
                                          </h6>
                                          <p className="text-muted mb-0">
                                            <i className="ti ti-calendar-bolt me-1" />
                                            {comment.createdAt ? new Date(comment.createdAt).toLocaleString() : 'N/A'}
                                          </p>
                                        </div>
                                        {canEditComment(comment) && editingCommentId !== (comment._id || String(index)) && (
                                          <button
                                            className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => handleEditComment(comment)}
                                          >
                                            <i className="ti ti-edit me-1" />
                                            Edit
                                          </button>
                                        )}
                                        {isHRorAdmin && (
                                          <button
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={() => handleDeleteComment(index)}
                                            disabled={commentLoading}
                                          >
                                            <i className="ti ti-trash me-1" />
                                            Delete
                                          </button>
                                        )}
                                      </div>

                                      {editingCommentId === (comment._id || String(index)) ? (
                                        <div className="mt-3">
                                          <textarea
                                            className="form-control mb-2"
                                            rows={3}
                                            value={editCommentText}
                                            onChange={(e) => setEditCommentText(e.target.value)}
                                          />
                                          <div className="d-flex gap-2">
                                            <button
                                              className="btn btn-sm btn-primary"
                                              onClick={handleSaveEdit}
                                              disabled={editCommentLoading}
                                            >
                                              {editCommentLoading ? (
                                                <>
                                                  <span className="spinner-border spinner-border-sm me-1" />
                                                  Saving...
                                                </>
                                              ) : (
                                                <>
                                                  <i className="ti ti-check me-1" />
                                                  Save
                                                </>
                                              )}
                                            </button>
                                            <button
                                              className="btn btn-sm btn-secondary"
                                              onClick={handleCancelEdit}
                                              disabled={editCommentLoading}
                                            >
                                              <i className="ti ti-x me-1" />
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="mt-2">{comment.text}</p>
                                      )}

                                      {comment.attachments && comment.attachments.length > 0 && (
                                        <div className="mt-2">
                                          {comment.attachments.map((attachment: string, attIndex: number) => (
                                            <span key={attIndex} className="badge bg-light fw-normal me-2">
                                              {attachment}
                                              <i className="ti ti-download ms-1" />
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment Form - HR/Admin/Assigned User/Ticket Creator */}
                        {canComment && (
                          <div className="border-top pt-3">
                            <h5 className="mb-3">Add Comment</h5>
                            <div className="mb-3">
                              <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Write your comment here..."
                                value={newComment}
                                onChange={(e) => {
                                  if (e.target.value.length <= 200) {
                                    setNewComment(e.target.value);
                                  }
                                }}
                                maxLength={200}
                              />
                              <small className="text-muted">{newComment.length}/200 characters</small>
                            </div>
                            <button
                              className="btn btn-primary"
                              onClick={handleAddComment}
                              disabled={!newComment.trim() || commentLoading}
                            >
                              {commentLoading ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-send me-1" />
                                  Add Comment
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="col-xl-3 col-md-4">
                <div className="card">
                  <div
                    className="card-header p-3 d-flex align-items-center justify-content-between cursor-pointer"
                    onClick={() => setIsTicketDetailsOpen(!isTicketDetailsOpen)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h4 className="mb-0">Ticket Details</h4>
                    <i className={`ti ti-chevron-${isTicketDetailsOpen ? 'up' : 'down'}`} />
                  </div>
                  <div className={`collapse ${isTicketDetailsOpen ? 'show' : ''}`} id="ticketDetailsCollapse">
                    <div className="card-body p-0">
                    <div className="border-bottom p-3">
                      <div className="mb-3">
                        <label className="form-label">Change Priority</label>
                        <CommonSelect
                          className="select"
                          options={priorityOptions}
                          value={priorityOptions.find(opt => opt.value === priority) || priorityOptions[0]}
                          onChange={handlePriorityChange}
                          disabled={!isHRorAdmin && (!currentEmployee?._id || !ticket?.assignedTo?._id || currentEmployee._id !== ticket.assignedTo._id)}
                        />
                        {updateLoading && (
                          <div className="mt-1">
                            <span className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Updating...</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="form-label">
                          Assign To {isHRorAdmin ? '' : '(HR Only)'}
                        </label>
                        <CommonSelect
                          className="select"
                          options={employeeOptions}
                          value={employeeOptions.find(opt => opt.value === assignedTo) || employeeOptions[0]}
                          onChange={handleAssigneeChange}
                          disabled={!isHRorAdmin || employeesLoading}
                        />
                        {updateLoading && (
                          <div className="mt-1">
                            <span className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Updating...</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="form-label">Ticket Status</label>
                        <CommonSelect
                          className="select"
                          options={ticketStatus}
                          value={ticketStatus.find(opt => opt.value === status) || ticketStatus[0]}
                          onChange={handleStatusChange}
                          disabled={!isHRorAdmin && (!currentEmployee?._id || !ticket?.assignedTo?._id || currentEmployee._id !== ticket.assignedTo._id)}
                        />
                        {updateLoading && (
                          <div className="mt-1">
                            <span className="spinner-border spinner-border-sm text-primary" role="status">
                              <span className="visually-hidden">Updating...</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex align-items-center border-bottom p-3">
                      <span className="avatar avatar-md me-2 flex-shrink-0">
                        <ImageWithBasePath
                          src={ticket?.createdBy?.avatarUrl || ticket?.createdBy?.avatar || "assets/img/users/user-01.jpg"}
                          className="rounded-circle"
                          alt="Img"
                        />
                      </span>
                      <div>
                        <span className="fs-12">Created By</span>
                        <p className="text-dark mb-0">
                          {ticket?.createdBy?.employeeId && ticket?.createdBy?.firstName && ticket?.createdBy?.lastName ?
                            `${ticket.createdBy.employeeId} ${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` :
                            ticket?.createdBy?.firstName && ticket?.createdBy?.lastName ?
                            `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="d-flex align-items-center border-bottom p-3">
                      <span className="avatar avatar-md me-2 flex-shrink-0">
                        {ticket?.assignedTo ? (
                          <ImageWithBasePath
                            src={ticket.assignedTo.avatarUrl || ticket.assignedTo.avatar || "assets/img/profiles/avatar-01.jpg"}
                            className="rounded-circle"
                            alt="Assigned"
                          />
                        ) : (
                          <ImageWithBasePath
                            src="assets/img/profiles/avatar-01.jpg"
                            className="rounded-circle"
                            alt="Unassigned"
                            style={{ opacity: 0.5 }}
                          />
                        )}
                      </span>
                      <div>
                        <span className="fs-12">Assigned To</span>
                        <p className="text-dark mb-0">
                          {ticket?.assignedTo?._id && currentEmployee?._id && ticket.assignedTo._id === currentEmployee._id
                            ? 'You'
                            : ticket?.assignedTo?.employeeId && ticket?.assignedTo?.firstName && ticket?.assignedTo?.lastName ?
                            `${ticket.assignedTo.employeeId} ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` :
                            ticket?.assignedTo?.firstName && ticket?.assignedTo?.lastName ?
                            `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <div className="border-bottom p-3">
                      <span className="fs-12">Category</span>
                      <p className="text-dark mb-1">{ticket?.category || 'N/A'}</p>
                      {ticket?.subCategory && (
                        <>
                          <span className="fs-12 text-muted">Subcategory</span>
                          <p className="text-muted">{ticket.subCategory}</p>
                        </>
                      )}
                    </div>

                    <div className="border-bottom p-3">
                      <span className="fs-12">Priority</span>
                      <p className="text-dark">{ticket?.priority || 'N/A'}</p>
                    </div>

                    <div className="border-bottom p-3">
                      <span className="fs-12">Email</span>
                      <p className="text-dark">{ticket?.assignedTo?.email || ticket?.createdBy?.email || 'N/A'}</p>
                    </div>

                    <div className="p-3">
                      <span className="fs-12">Last Updated</span>
                      <p className="text-dark">{ticket?.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Ticket Milestone Timeline */}
                <div className="card mt-3">
                  <div
                    className="card-header p-3 d-flex align-items-center justify-content-between cursor-pointer"
                    onClick={() => setIsTicketTimelineOpen(!isTicketTimelineOpen)}
                    style={{ cursor: 'pointer' }}
                  >
                    <h4 className="mb-0">Ticket Timeline</h4>
                    <i className={`ti ti-chevron-${isTicketTimelineOpen ? 'up' : 'down'}`} />
                  </div>
                  <div className={`collapse ${isTicketTimelineOpen ? 'show' : ''}`} id="ticketTimelineCollapse">
                    <div className="card-body p-3">
                    {ticket?.statusHistory && ticket.statusHistory.length > 0 ? (
                      <div className="position-relative">
                        {ticket.statusHistory.map((milestone: any, index: number) => (
                          <div key={index} className="d-flex mb-4 position-relative" style={{ paddingLeft: '0' }}>
                            {/* Timeline Dot and Line */}
                            <div className="d-flex flex-column align-items-center me-3" style={{ width: '12px' }}>
                              <div
                                className="rounded-circle flex-shrink-0"
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  backgroundColor:
                                    milestone.status === 'Open' ? '#e91e63' :
                                    milestone.status === 'Assigned' ? '#2196f3' :
                                    milestone.status === 'In Progress' ? '#ff9800' :
                                    milestone.status === 'On Hold' ? '#9e9e9e' :
                                    milestone.status === 'Resolved' ? '#4caf50' :
                                    milestone.status === 'Closed' ? '#424242' :
                                    milestone.status === 'Reopened' ? '#f44336' : '#2196f3',
                                  zIndex: 1
                                }}
                              />
                              {index < ticket.statusHistory.length - 1 && (
                                <div
                                  className="flex-grow-1"
                                  style={{
                                    width: '2px',
                                    backgroundColor: '#e0e0e0',
                                    minHeight: '60px',
                                    marginTop: '4px'
                                  }}
                                />
                              )}
                            </div>

                            {/* Timeline Content */}
                            <div className="flex-grow-1" style={{ paddingTop: '0px', minHeight: '60px' }}>
                              {/* Status and Timestamp Row */}
                              <div className="d-flex align-items-center justify-content-between mb-2">
                                <h6 className="mb-0 fw-semibold" style={{ fontSize: '15px' }}>
                                  {milestone.status}
                                </h6>
                                <small className="text-muted" style={{ fontSize: '13px' }}>
                                  {milestone.changedAt ? new Date(milestone.changedAt).toLocaleString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                  }) : 'N/A'}
                                </small>
                              </div>

                              {/* By Information */}
                              <div className="mb-1">
                                <span className="text-muted" style={{ fontSize: '13px' }}>By: </span>
                                <span className="text-primary fw-medium" style={{ fontSize: '13px' }}>
                                  {milestone.changedBy?.employeeId && milestone.changedBy?.firstName
                                    ? `${milestone.changedBy.employeeId} ${milestone.changedBy.firstName || ''} ${milestone.changedBy.lastName || ''}`.trim()
                                    : milestone.changedBy?.firstName
                                    ? `${milestone.changedBy.firstName || ''} ${milestone.changedBy.lastName || ''}`.trim()
                                    : 'System'}
                                </span>
                              </div>

                              {/* Note/Description */}
                              {milestone.note && (
                                <div className="text-dark" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                  {milestone.note}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted text-center mb-0">No timeline data available</p>
                    )}
                  </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
          <Footer />
        </div>

        <TicketListModal />
      </>
    );
  };


export default TicketDetails;
