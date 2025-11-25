import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import ImageWithBasePath from "../../core/common/imageWithBasePath";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import TicketListModal from "../../core/modals/ticketListModal";
import Footer from "../../core/common/footer";
import { useSocket } from "../../SocketContext";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

const TicketDetails = () => {
  const routes = all_routes;
  const socket = useSocket();
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('id');
  
  // State for dynamic data
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  
  // State for form controls
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // State for export functionality
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch ticket details
  useEffect(() => {
    if (socket && ticketId) {
      fetchTicketDetails();
      
      // Listen for real-time updates
      socket.on('tickets/ticket-updated', (data) => {
        if (data.data.ticketId === ticketId) {
          setTicket(data.data);
        }
      });

      socket.on('tickets/ticket-comment-added', (data) => {
        if (data.data.ticketId === ticketId) {
          setTicket(data.data);
        }
      });

      return () => {
        socket.off('tickets/ticket-updated');
        socket.off('tickets/ticket-comment-added');
      };
    }
  }, [socket, ticketId]);

  const fetchTicketDetails = () => {
    if (socket && ticketId) {
      // Validate ticket ID format (more lenient)
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
          // Set form controls with current ticket data
          setPriority(response.data.priority || '');
          setStatus(response.data.status || '');
          setAssignedTo(response.data.assignedTo?.firstName ? 
            `${response.data.assignedTo.firstName} ${response.data.assignedTo.lastName || ''}`.trim() : '');
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
    if (socket && ticketId && newComment.trim()) {
      setCommentLoading(true);
      
    socket.emit('tickets/add-comment', {
        ticketId,
        text: newComment,
        author: {
          _id: 'current-user-id',
          firstName: 'Current',
          lastName: 'User',
          avatar: 'assets/img/profiles/avatar-01.jpg'
        },
        isInternal: false
      });
      
      // Listen for comment response
      const handleCommentResponse = (response: any) => {
        console.log('Comment response:', response);
        setCommentLoading(false);
        
        if (response.done) {
          setNewComment('');
          // Refresh ticket details to get updated comments
          fetchTicketDetails();
        } else {
          setError(response.error || 'Failed to add comment');
        }
      };

      socket.on('tickets/add-comment-response', handleCommentResponse);
      
      // Cleanup listener
      setTimeout(() => {
        socket.off('tickets/add-comment-response', handleCommentResponse);
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

  // Handle assignee change
  const handleAssigneeChange = (option: any) => {
    if (option?.value && option.value !== assignedTo) {
      setAssignedTo(option.value);
      // Parse assignee name and update ticket
      const [firstName, lastName] = option.value.split(' ');
      updateTicketField('assignedTo', {
        _id: '507f1f77bcf86cd799439011',
        firstName: firstName,
        lastName: lastName || '',
        email: `${firstName.toLowerCase()}@company.com`,
        role: 'IT Support Specialist'
      });
    }
  };

  // Update ticket field via socket
  const updateTicketField = (field: string, value: any) => {
    if (socket && ticketId) {
      // Validate ticket ID format (more lenient)
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
      console.log('🎫 FRONTEND: Ticket ID from URL:', ticketId);
      console.log('📤 FRONTEND: Sending update data:', updateData);
      console.log('🏢 FRONTEND: Current ticket data:', ticket);
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
        
        if (response.done) {
          // Update local ticket state
          setTicket((prev: any) => ({
            ...prev,
            [field]: value
          }));
        } else {
          setError(response.error || `Failed to update ${field}`);
          // Revert the change
          if (field === 'priority') setPriority(ticket?.priority || '');
          if (field === 'status') setStatus(ticket?.status || '');
          if (field === 'assignedTo') setAssignedTo(ticket?.assignedTo?.firstName ? 
            `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName || ''}`.trim() : '');
        }
        
        // Cleanup listener immediately after response
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

      // Company colors (based on website theme)
      const primaryColor = [242, 101, 34]; // Orange - primary brand color
      const secondaryColor = [59, 112, 128]; // Blue-gray - secondary color
      const textColor = [33, 37, 41]; // Dark gray - main text
      const lightGray = [248, 249, 250]; // Light background
      const borderColor = [222, 226, 230]; // Border color

      // Add company logo with multiple fallback options
      const addCompanyLogo = async () => {
        console.log('🎯 Starting logo loading process...');
        
        // Try to load the new manage RTC logo first
        const logoPaths = [
          '/assets/img/logo.svg',           // New manage RTC logo (priority)
          '/assets/img/logo-white.svg',     // White version of manage RTC logo
          '/assets/img/logo-small.svg',     // Small version of manage RTC logo
        ];
        
        for (const logoPath of logoPaths) {
          try {
            console.log(`🔄 Loading NEW logo: ${logoPath}`);
            
            // Try multiple approaches to load the logo
            const approaches = [
              // Approach 1: Direct fetch with cache busting
              `${logoPath}?v=${Date.now()}&bust=${Math.random()}`,
              // Approach 2: Simple cache busting
              `${logoPath}?t=${Date.now()}`,
              // Approach 3: No cache busting
              logoPath
            ];
            
            for (const url of approaches) {
              try {
                console.log(`🔄 Trying URL: ${url}`);
                const response = await fetch(url, {
                  method: 'GET',
                  cache: 'no-store',
                  headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                });
                
                if (response.ok) {
                  console.log(`✅ Logo response OK: ${response.status}`);
                  
                  // Get the SVG content as text
                  const svgText = await response.text();
                  console.log(`📄 SVG content length: ${svgText.length} characters`);
                  
                  // Check if this is a valid SVG
                  if (svgText.includes('<svg') && svgText.length > 100) {
                    console.log('🎉 Found valid SVG logo!');
                  } else {
                    console.log('⚠️ Invalid SVG content, trying next approach...');
                    continue;
                  }
                  
                  // Try to convert SVG to canvas for better PDF compatibility
                  try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    // Set canvas size to maintain aspect ratio (logo.svg is 115x40)
                    canvas.width = 115;
                    canvas.height = 40;
                    
                    // Create a promise to handle image loading
                    const imagePromise = new Promise((resolve, reject) => {
                      img.onload = () => {
                        try {
                          // Draw the SVG image to canvas maintaining aspect ratio
                          ctx?.drawImage(img, 0, 0, 115, 40);
                          
                          // Convert canvas to PNG data URL
                          const pngDataUrl = canvas.toDataURL('image/png');
                          console.log(`✅ Successfully converted SVG to PNG: ${logoPath}`);
                          resolve(pngDataUrl);
                        } catch (error) {
                          reject(error);
                        }
                      };
                      img.onerror = reject;
                      
                      // Set the SVG as image source
                      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
                      img.src = svgDataUrl;
                    });
                    
                    // Wait for image conversion
                    const pngDataUrl = await imagePromise;
                    
                    // Add PNG to PDF with proper dimensions (maintain aspect ratio)
                    doc.addImage(pngDataUrl as string, 'PNG', 20, 15, 30, 10.4);
                    console.log(`✅ Successfully added logo to PDF: ${logoPath}`);
                    return true;
                    
                  } catch (canvasError) {
                    console.log(`❌ Canvas conversion failed:`, canvasError);
                    
                    // Fallback: Try direct SVG
                    try {
                      const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgText)}`;
                      doc.addImage(svgDataUrl, 'SVG', 20, 15, 30, 10.4);
                      console.log(`✅ Successfully added logo as SVG: ${logoPath}`);
                      return true;
                    } catch (svgError) {
                      console.log(`❌ SVG format also failed:`, svgError);
                    }
                  }
                } else {
                  console.log(`❌ Logo fetch failed: ${response.status} ${response.statusText}`);
                }
              } catch (fetchError) {
                console.log(`❌ Fetch error for ${url}:`, fetchError);
              }
            }
          } catch (error) {
            console.log(`❌ Error loading ${logoPath}:`, error);
          }
        }
        
        console.log('❌ All logo loading attempts failed');
        return false;
      };

      // Try to add logo - NO FALLBACK TEXT, ONLY USE YOUR NEW LOGOS
      const logoAdded = await addCompanyLogo();
      if (!logoAdded) {
        console.log("❌ CRITICAL: New logo loading failed!");
        console.log("🔍 Check if logo files exist: /assets/img/logo.svg, /assets/img/logo-white.svg, /assets/img/logo-small.svg");
        console.log("📁 Make sure React dev server is running and files are accessible");
        // NO FALLBACK TEXT - just leave space for logo
        console.log("⚠️ No logo added to PDF - using empty space instead of fallback text");
      } else {
        console.log("✅ Logo successfully added to PDF!");
      }

      // Header section
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Ticket Details Report', 50, 30);

      // Company info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${currentDate} at ${currentTime}`, 50, 40);
      doc.text(`Ticket ID: ${ticket.ticketId || 'N/A'}`, 50, 45);

      // Add security watermark
      (doc as any).setGState(new (doc as any).GState({opacity: 0.1}));
      doc.setTextColor(128, 128, 128);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIDENTIAL', 105, 150, { angle: 45 });
      (doc as any).setGState(new (doc as any).GState({opacity: 1}));

      // Reset text color and font
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(10);

      // Ticket information section
      let yPosition = 60;
      
      // Ticket details
      const ticketDetails = [
        { label: 'Ticket ID', value: ticket.ticketId || 'N/A' },
        { label: 'Title', value: ticket.title || 'Untitled' },
        { label: 'Subject', value: ticket.subject || 'N/A' },
        { label: 'Category', value: ticket.category || 'N/A' },
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
      
      ticketDetails.forEach((detail, index) => {
        // Label
        doc.setFont('helvetica', 'bold');
        doc.text(`${detail.label}:`, 15, yPosition);
        
        // Value
        doc.setFont('helvetica', 'normal');
        const valueText = doc.splitTextToSize(detail.value, 120);
        doc.text(valueText, 80, yPosition);
        
        yPosition += Math.max(8, valueText.length * 4) + 2;
      });
      
      // Description section
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
      
      // Comments section
      if (ticket.comments && ticket.comments.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Comments:', 15, yPosition);
        yPosition += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        ticket.comments.forEach((comment: any, index: number) => {
          // Comment header
          doc.setFont('helvetica', 'bold');
          const authorName = comment.author?.firstName && comment.author?.lastName ? 
            `${comment.author.firstName} ${comment.author.lastName}` : 'Unknown User';
          const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'N/A';
          doc.text(`Comment ${index + 1} by ${authorName} on ${commentDate}:`, 15, yPosition);
          yPosition += 6;
          
          // Comment text
          doc.setFont('helvetica', 'normal');
          const commentLines = doc.splitTextToSize(comment.text || 'No text', 180);
          doc.text(commentLines, 15, yPosition);
          yPosition += commentLines.length * 4 + 10;
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`© ${currentYear} AMASQIS HRMS. All rights reserved.`, 15, doc.internal.pageSize.height - 15);
      doc.text(`Report generated on ${currentDate} at ${currentTime}`, 15, doc.internal.pageSize.height - 10);
      
      // Save the PDF
      doc.save(`ticket-${ticket.ticketId || 'details'}-${currentDate.replace(/\//g, '-')}.pdf`);
      
      setExportLoading(false);
      console.log("✅ PDF export completed successfully!");
      
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
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

      // Prepare ticket data for Excel (matching ticket grid format)
      const ticketDataForExcel = {
        "Ticket ID": ticket.ticketId || "",
        "Title": ticket.title || "",
        "Subject": ticket.subject || "",
        "Description": ticket.description || "",
        "Category": ticket.category || "",
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
        "Tags": ticket.tags?.join(', ') || ""
      };

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet([ticketDataForExcel]);
      
      // Set column widths (matching ticket grid)
      const colWidths = [
        { wch: 15 }, // Ticket ID
        { wch: 30 }, // Title
        { wch: 25 }, // Subject
        { wch: 40 }, // Description
        { wch: 20 }, // Category
        { wch: 15 }, // Status
        { wch: 15 }, // Priority
        { wch: 25 }, // Assigned To
        { wch: 25 }, // Created By
        { wch: 15 }, // Created Date
        { wch: 15 }, // Updated Date
        { wch: 15 }, // Comments Count
        { wch: 30 }  // Tags
      ];
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Ticket Details");

      // Add comments sheet if comments exist
      if (ticket.comments && ticket.comments.length > 0) {
        const commentsDataForExcel = ticket.comments.map((comment: any) => ({
          "#": ticket.comments.indexOf(comment) + 1,
          "Author": comment.author?.firstName && comment.author?.lastName 
            ? `${comment.author.firstName} ${comment.author.lastName}`
            : "Unknown",
          "Date": comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : "N/A",
          "Comment": comment.text || "No text",
          "Email": comment.author?.email || "N/A"
        }));

        const commentsWs = XLSX.utils.json_to_sheet(commentsDataForExcel);
        
        // Set column widths for comments
        commentsWs['!cols'] = [
          { wch: 5 },  // # column
          { wch: 20 }, // Author column
          { wch: 15 }, // Date column
          { wch: 60 }, // Comment column
          { wch: 25 }  // Email column
        ];

        XLSX.utils.book_append_sheet(wb, commentsWs, "Comments");
      }

      // Save the Excel file
      const fileName = `ticket-${ticket.ticketId || 'details'}-${currentDate.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setExportLoading(false);
      console.log("✅ Excel export completed successfully!");

    } catch (error) {
      console.error("❌ Error generating Excel:", error);
      setExportLoading(false);
      alert("Failed to export Excel");
    }
  };

  const changePriority = [
    { value: "Critical", label: "Critical" },
    { value: "High", label: "High" },
    { value: "Medium", label: "Medium" },
    { value: "Low", label: "Low" },
  ];
  const assignTo = [
    { value: "Edgar Hansel", label: "Edgar Hansel" },
    { value: "Juan Hermann", label: "Juan Hermann" },
    { value: "Sarah Wilson", label: "Sarah Wilson" },
    { value: "Mike Johnson", label: "Mike Johnson" },
  ];
  const ticketStatus = [
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "On Hold", label: "On Hold" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
    { value: "Reopened", label: "Reopened" },
  ];

  return (
    <>
      {/* Page Wrapper */}
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
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                        Exporting...
                      </>
                    ) : (
                      <>
                    <i className="ti ti-file-export me-1" />
                    Export
                      </>
                    )}
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link 
                        to="#" 
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportPDF();
                        }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="#" 
                        className="dropdown-item rounded-1"
                        onClick={(e) => {
                          e.preventDefault();
                          handleExportExcel();
                        }}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel{" "}
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
          {/* /Breadcrumb */}
          
          {/* Error Display */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <strong>Error:</strong> {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}


          {/* Loading State */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading ticket details...</span>
              </div>
              <p className="mt-2 text-muted">Loading ticket details...</p>
            </div>
          )}

          {/* Main Content */}
          {!loading && (
          <div className="row">
            <div className="col-xl-9 col-md-8">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                    <h5 className="text-info fw-medium">{ticket?.category || 'IT Support'}</h5>
                  <div className="d-flex align-items-center">
                      <span className={`badge me-3 ${
                        ticket?.priority === 'High' ? 'bg-danger' : 
                        ticket?.priority === 'Medium' ? 'bg-warning' : 'bg-success'
                      }`}>
                      <i className="ti ti-circle-filled fs-5 me-1" />
                        {ticket?.priority || 'Medium'}
                    </span>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="dropdown-toggle px-2 py-1 btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        Mark as Private
                      </Link>
                      <ul className="dropdown-menu  dropdown-menu-end p-2">
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Mark as Private
                          </Link>
                        </li>
                        <li>
                          <Link to="#" className="dropdown-item rounded-1">
                            Mark as Public{" "}
                          </Link>
                        </li>
                      </ul>
                    </div>
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
                                  <span className="badge bg-outline-pink d-flex align-items-center ms-1">
                              <i className="ti ti-circle-filled fs-5 me-1" />
                                    {ticket.status || 'N/A'}
                            </span>
                          </div>
                          <div className="d-flex align-items-center flex-wrap row-gap-2">
                            <p className="d-flex align-items-center mb-0 me-2">
                              <ImageWithBasePath
                                      src={ticket.assignedTo?.avatar || "assets/img/profiles/avatar-01.jpg"}
                                className="avatar avatar-xs rounded-circle me-2"
                                alt="img"
                              />{" "}
                              Assigned to{" "}
                              <span className="text-dark ms-1">
                                      {ticket.assignedTo?.firstName && ticket.assignedTo?.lastName 
                                        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                                        : 'Unassigned'
                                      }
                              </span>
                            </p>
                            <p className="d-flex align-items-center mb-0 me-2">
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
                      <div className="mb-3">
                        <Link 
                          to="#" 
                          className="btn btn-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            const commentForm = document.querySelector('.border-top.pt-3');
                            if (commentForm) {
                              commentForm.scrollIntoView({ behavior: 'smooth' });
                              // Focus on the comment textarea
                              setTimeout(() => {
                                const textarea = commentForm.querySelector('textarea');
                                if (textarea) textarea.focus();
                              }, 500);
                            }
                          }}
                        >
                          <i className="ti ti-arrow-forward-up me-1" />
                          Post a Reply
                        </Link>
                      </div>
                    </div>
                    <div className="border-bottom mb-3 pb-3">
                      <div>
                        <p className="mb-3">
                            {ticket?.description || 'No description available'}
                          </p>
                          </div>
                        {/* Dynamic Comments */}
                        {ticket?.comments?.map((comment: any, index: number) => (
                          <div key={index} className="mt-4">
                            <div className="d-flex align-items-center mb-3">
                              <span className="avatar avatar-lg avatar-rounded me-2 flex-shrink-0">
                                <ImageWithBasePath
                                  src={comment.author?.avatar || "assets/img/profiles/avatar-01.jpg"}
                                  alt="Img"
                                />
                              </span>
                              <div>
                                <h6 className="fw-medium mb-1">
                                  {comment.author?.firstName && comment.author?.lastName 
                                    ? `${comment.author.firstName} ${comment.author.lastName}`
                                    : 'Unknown User'
                                  }
                                </h6>
                                <p>
                                  <i className="ti ti-calendar-bolt me-1" />
                                  {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div>
                              <div className="mb-3">
                                <p>{comment.text}</p>
                              </div>
                              {comment.attachments && comment.attachments.length > 0 && (
                                <div className="mb-3">
                                  {comment.attachments.map((attachment: any, attIndex: number) => (
                                    <span key={attIndex} className="badge bg-light fw-normal me-2">
                                      {attachment}
                                      <i className="ti ti-download ms-1" />
                                    </span>
                                  ))}
                                </div>
                              )}
                              <div className="d-flex align-items-center mt-3">
                                <Link
                                  to="#"
                                  className="d-inline-flex align-items-center text-primary fw-medium me-3"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const commentForm = document.querySelector('.border-top.pt-3');
                                    if (commentForm) {
                                      commentForm.scrollIntoView({ behavior: 'smooth' });
                                      // Focus on the comment textarea
                                      setTimeout(() => {
                                        const textarea = commentForm.querySelector('textarea');
                                        if (textarea) {
                                          textarea.focus();
                                          // Add a mention to the textarea
                                          const mention = `@${comment.author?.firstName || 'User'} `;
                                          textarea.value = mention + textarea.value;
                                          textarea.setSelectionRange(mention.length, mention.length);
                                        }
                                      }, 500);
                                    }
                                  }}
                                >
                                  <i className="ti ti-arrow-forward-up me-1" />
                                  Reply
                                </Link>
                              </div>
                            </div>
                          </div>
                        )) || (
                          <div className="mt-4">
                          <p className="text-muted">No comments yet. Be the first to comment!</p>
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Add Comment Form */}
                      <div className="border-top pt-3">
                      <h5>Add Comment</h5>
                        <div className="mb-3">
                          <textarea
                            className="form-control"
                          rows={4}
                            placeholder="Write your comment here..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                          />
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={handleAddComment}
                        disabled={!newComment.trim() || commentLoading}
                        >
                        {commentLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-4">
              <div className="card">
                <div className="card-header p-3">
                  <h4>Ticket Details</h4>
                </div>
                <div className="card-body p-0">
                  <div className="border-bottom p-3">
                    <div className="mb-3">
                      <label className="form-label">Change Priority</label>
                      <CommonSelect
                        className="select"
                        options={changePriority}
                        value={changePriority.find(opt => opt.value === priority) || changePriority[0]}
                        onChange={handlePriorityChange}
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
                      <label className="form-label">Assign To</label>
                      <CommonSelect
                        className="select"
                        options={assignTo}
                        value={assignTo.find(opt => opt.value === assignedTo) || assignTo[0]}
                        onChange={handleAssigneeChange}
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
                          src="assets/img/users/user-01.jpg"
                        className="rounded-circle"
                        alt="Img"
                      />
                    </span>
                    <div>
                      <span className="fs-12">User</span>
                        <p className="text-dark">{ticket?.createdBy?.firstName && ticket?.createdBy?.lastName ? 
                          `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'Anthony Lewis'}</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center border-bottom p-3">
                    <span className="avatar avatar-md me-2 flex-shrink-0">
                      <ImageWithBasePath
                          src="assets/img/users/user-05.jpg"
                        className="rounded-circle"
                        alt="Img"
                      />
                    </span>
                    <div>
                      <span className="fs-12">Support Agent</span>
                        <p className="text-dark">{ticket?.assignedTo?.firstName && ticket?.assignedTo?.lastName ? 
                          `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'Edgar Hansel'}</p>
                      </div>
                    </div>
                    <div className="border-bottom p-3">
                      <span className="fs-12">Category</span>
                      <p className="text-dark">{ticket?.category || 'N/A'}</p>
                  </div>
                  <div className="border-bottom p-3">
                      <span className="fs-12">Priority</span>
                      <p className="text-dark">{ticket?.priority || 'N/A'}</p>
                  </div>
                  <div className="border-bottom p-3">
                    <span className="fs-12">Email</span>
                      <p className="text-dark">{ticket?.createdBy?.email || 'N/A'}</p>
                  </div>
                  <div className="p-3">
                      <span className="fs-12">Last Updated</span>
                      <p className="text-dark">{ticket?.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      <TicketListModal />
    </>
  );
};

export default TicketDetails;