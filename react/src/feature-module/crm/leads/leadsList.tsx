import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Table from "../../../core/common/dataTable/index";
import { useSocket } from "../../../SocketContext";
import CrmsModal from "../../../core/modals/crms_modal";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import Footer from "../../../core/common/footer";
import dragula, { Drake } from "dragula";
import "dragula/dist/dragula.css";

interface DateRange {
  start: string;
  end: string;
}

interface LeadFilters {
  dateRange?: DateRange;
  stage?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

interface Lead {
  _id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  address: string | any;
  source: string;
  country: string;
  createdAt: string;
  owner: string;
  stage?: string;
  // For list view compatibility
  LeadName?: string;
  CompanyName?: string;
  Email?: string;
  Phone?: string;
  Tags?: string;
  CreatedDate?: string;
  LeadOwner?: string;
  Image?: string;
}

interface StageData {
  [key: string]: Lead[];
}

interface StageTotals {
  [key: string]: {
    count: number;
    value: number;
  };
}

const LeadsList = () => {
  const routes = all_routes;
  const socket = useSocket();

  // View Mode State
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // State management for LIST view
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  });

  // State management for GRID view
  const [stages, setStages] = useState<StageData>({
    'Contacted': [],
    'Not Contacted': [],
    'Closed': [],
    'Lost': []
  });
  const [stageTotals, setStageTotals] = useState<StageTotals>({
    'Contacted': { count: 0, value: 0 },
    'Not Contacted': { count: 0, value: 0 },
    'Closed': { count: 0, value: 0 },
    'Lost': { count: 0, value: 0 }
  });

  // Shared state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>({
    stage: 'all',
    sortBy: 'createdDate',
    page: 1,
    limit: 50
  });
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(1970, 0, 1).toISOString(),
    end: new Date().toISOString(),
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    value: 0,
    stage: 'Not Contacted',
    source: 'Unknown',
    country: 'Unknown',
    address: '',
    owner: 'Unknown',
    priority: 'Medium'
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Refs for drag and drop (grid view)
  const container1Ref = useRef<HTMLDivElement>(null);
  const container2Ref = useRef<HTMLDivElement>(null);
  const container3Ref = useRef<HTMLDivElement>(null);
  const container4Ref = useRef<HTMLDivElement>(null);

  // Fetch leads data for LIST view
  const fetchLeadsData = async () => {
    if (!socket) {
      console.log("[LeadsList] Socket not available yet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[LeadsList] Fetching leads data with filters:", filters);

      const requestData = {
        filters: {
          ...filters,
          dateRange: dateRange
        }
      };

      // Set up response handler
      const handleResponse = (response: any) => {
        console.log("[LeadsList] Received response:", response);
        setLoading(false);

        if (response.done) {
          const data = response.data || {};
          setLeadsData(data.leads || []);
          setPagination({
            totalCount: data.totalCount || 0,
            totalPages: data.totalPages || 0,
            currentPage: data.page || 1
          });
          setError(null);
        } else {
          setError(response.error || "Failed to load leads data");
          setLeadsData([]);
        }
      };

      // Listen for response
      socket.on('lead/list/get-data-response', handleResponse);

      // Emit request
      socket.emit('lead/list/get-data', requestData);

      // Clean up listener after response
      const timeout = setTimeout(() => {
        socket.off('lead/list/get-data-response', handleResponse);
        if (loading) {
          setLoading(false);
          setError("Request timed out");
        }
      }, 10000);

      // Clean up on successful response
      socket.once('lead/list/get-data-response', () => {
        clearTimeout(timeout);
        socket.off('lead/list/get-data-response', handleResponse);
      });

    } catch (error) {
      console.error("[LeadsList] Error fetching leads data:", error);
      setLoading(false);
      setError("Failed to fetch leads data");
    }
  };

  // Fetch leads grid data for GRID view
  const fetchLeadsGridData = async () => {
    if (!socket) {
      console.log("[LeadsGrid] Socket not available yet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[LeadsGrid] Fetching leads grid data with filters:", filters);

      const requestData = {
        filters: {
          ...filters,
          dateRange: dateRange
        }
      };

      // Set up response handler
      const handleResponse = (response: any) => {
        console.log("[LeadsGrid] Received response:", response);
        setLoading(false);

        if (response.done) {
          const data = response.data || {};
          console.log("[LeadsGrid] Received data from backend:", data);

          const stagesData = data.stages || {
            'Contacted': [],
            'Not Contacted': [],
            'Closed': [],
            'Lost': []
          };

          const stageTotalsData = data.stageTotals || {
            'Contacted': { count: 0, value: 0 },
            'Not Contacted': { count: 0, value: 0 },
            'Closed': { count: 0, value: 0 },
            'Lost': { count: 0, value: 0 }
          };

          console.log("[LeadsGrid] Setting stages:", {
            'Contacted': stagesData['Contacted'].length,
            'Not Contacted': stagesData['Not Contacted'].length,
            'Closed': stagesData['Closed'].length,
            'Lost': stagesData['Lost'].length
          });

          console.log("[LeadsGrid] Setting stage totals:", stageTotalsData);

          setStages(stagesData);
          setStageTotals(stageTotalsData);
          setError(null);
        } else {
          setError(response.error || "Failed to load leads grid data");
          setStages({
            'Contacted': [],
            'Not Contacted': [],
            'Closed': [],
            'Lost': []
          });
          setStageTotals({
            'Contacted': { count: 0, value: 0 },
            'Not Contacted': { count: 0, value: 0 },
            'Closed': { count: 0, value: 0 },
            'Lost': { count: 0, value: 0 }
          });
        }
      };

      // Listen for response
      socket.on('lead/grid/get-data-response', handleResponse);

      // Emit request
      socket.emit('lead/grid/get-data', requestData);

      // Clean up listener after response
      const timeout = setTimeout(() => {
        socket.off('lead/grid/get-data-response', handleResponse);
        if (loading) {
          setLoading(false);
          setError("Request timed out");
        }
      }, 10000);

      // Clean up on successful response
      socket.once('lead/grid/get-data-response', () => {
        clearTimeout(timeout);
        socket.off('lead/grid/get-data-response', handleResponse);
      });

    } catch (error) {
      console.error("[LeadsGrid] Error fetching leads grid data:", error);
      setLoading(false);
      setError("Failed to fetch leads grid data");
    }
  };

  // Effect to fetch data based on view mode
  useEffect(() => {
    if (viewMode === 'list') {
      fetchLeadsData();
    } else {
      fetchLeadsGridData();
    }
  }, [socket, filters, dateRange, viewMode]);

  // Dragula setup for grid view
  useEffect(() => {
    if (viewMode !== 'grid') return;

    const containers = [
      container1Ref.current as HTMLDivElement,
      container2Ref.current as HTMLDivElement,
      container3Ref.current as HTMLDivElement,
      container4Ref.current as HTMLDivElement,
    ].filter((container) => container !== null);

    if (containers.length > 0) {
      const drake: Drake = dragula(containers, {
        moves: function (el: any, source: any, handle: any, sibling: any) {
          return true;
        },
        accepts: function (el: any, target: any, source: any, sibling: any) {
          return true;
        }
      });

      drake.on('drop', function (el: any, target: any, source: any, sibling: any) {
        console.log('Lead moved from', source.className, 'to', target.className);
      });

      return () => {
        drake.destroy();
      };
    }
  }, [stages, viewMode]);

  // Handle filter changes
  const handleStageFilter = (stage: string) => {
    setFilters(prev => ({ ...prev, stage, page: 1 }));
  };

  const handleSortChange = (sortBy: string) => {
    setFilters(prev => ({ ...prev, sortBy, page: 1 }));
  };

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // Handle form data changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle add new lead
  const handleAddLead = async () => {
    if (!socket) {
      console.log("[Leads] Socket not available");
      return;
    }

    setSubmitLoading(true);
    try {
      console.log("[Leads] Creating new lead:", formData);

      const handleResponse = (response: any) => {
        console.log("[Leads] Received create response:", response);
        setSubmitLoading(false);
        if (response.done) {
          setAddModalVisible(false);
          setFormData({
            name: '',
            company: '',
            email: '',
            phone: '',
            value: 0,
            stage: 'Not Contacted',
            source: 'Unknown',
            country: 'Unknown',
            address: '',
            owner: 'Unknown',
            priority: 'Medium'
          });
          // Refresh the leads data
          if (viewMode === 'list') {
            fetchLeadsData();
            setTimeout(() => fetchLeadsData(), 1000);
          } else {
            fetchLeadsGridData();
            setTimeout(() => fetchLeadsGridData(), 1000);
          }
          console.log("Lead created successfully");
        } else {
          console.error("Failed to create lead:", response.error);
        }
      };

      socket.on('lead/create-response', handleResponse);
      socket.emit('lead/create', formData);

      setTimeout(() => {
        socket.off('lead/create-response', handleResponse);
      }, 5000);
    } catch (error) {
      setSubmitLoading(false);
      console.error("Error creating lead:", error);
    }
  };

  // Handle edit lead
  const handleEditLead = (lead: any) => {
    console.log("[Leads] Opening edit modal for lead:", lead);
    setEditingLead(lead);

    // Support both list and grid data formats
    setFormData({
      name: lead.name || lead.LeadName || '',
      company: lead.company || lead.CompanyName || '',
      email: lead.email || lead.Email || '',
      phone: lead.phone || lead.Phone || '',
      value: lead.value || 0,
      stage: lead.stage || lead.Tags || 'Not Contacted',
      source: lead.source || 'Unknown',
      country: lead.country || 'Unknown',
      address: lead.address || '',
      owner: lead.owner || lead.LeadOwner || 'Unknown',
      priority: 'Medium'
    });
    setEditModalVisible(true);
  };

  // Handle update lead
  const handleUpdateLead = async () => {
    if (!socket || !editingLead) {
      console.log("[Leads] Cannot update lead - socket or editingLead missing");
      return;
    }

    setSubmitLoading(true);
    try {
      const updateData = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        value: formData.value,
        stage: formData.stage,
        source: formData.source,
        country: formData.country,
        address: formData.address,
        owner: formData.owner,
        priority: formData.priority
      };

      const requestData = {
        leadId: editingLead._id,
        updateData: updateData
      };

      console.log("[Leads] Sending update request:", requestData);

      const handleResponse = (response: any) => {
        console.log("[Leads] Received update response:", response);
        setSubmitLoading(false);
        if (response.done) {
          setEditModalVisible(false);
          setEditingLead(null);
          setFormData({
            name: '',
            company: '',
            email: '',
            phone: '',
            value: 0,
            stage: 'Not Contacted',
            source: 'Unknown',
            country: 'Unknown',
            address: '',
            owner: 'Unknown',
            priority: 'Medium'
          });
          // Refresh based on view mode
          setTimeout(() => {
            if (viewMode === 'list') {
              fetchLeadsData();
            } else {
              fetchLeadsGridData();
            }
          }, 500);
          console.log("Lead updated successfully");
        } else {
          console.error("Failed to update lead:", response.error);
        }
      };

      socket.on('lead/update-response', handleResponse);
      socket.emit('lead/update', requestData);

      setTimeout(() => {
        socket.off('lead/update-response', handleResponse);
      }, 5000);
    } catch (error) {
      setSubmitLoading(false);
      console.error("Error updating lead:", error);
    }
  };

  // Handle delete lead
  const handleDeleteLead = async (leadId: string) => {
    if (!socket) {
      console.log("[Leads] Socket not available");
      return;
    }

    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return;
    }

    try {
      console.log("[Leads] Deleting lead:", leadId);

      const handleResponse = (response: any) => {
        console.log("[Leads] Received delete response:", response);
        if (response.done) {
          // Refresh based on view mode
          if (viewMode === 'list') {
            fetchLeadsData();
            setTimeout(() => fetchLeadsData(), 1000);
          } else {
            fetchLeadsGridData();
            setTimeout(() => fetchLeadsGridData(), 1000);
          }
          console.log("Lead deleted successfully");
        } else {
          console.error("Failed to delete lead:", response.error);
        }
      };

      socket.on('lead/delete-response', handleResponse);
      socket.emit('lead/delete', { leadId });

      setTimeout(() => {
        socket.off('lead/delete-response', handleResponse);
      }, 5000);
    } catch (error) {
      console.error("Error deleting lead:", error);
    }
  };

  // Handle add lead from grid column
  const handleAddLeadFromColumn = (stage: string) => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      value: 0,
      stage: stage,
      source: 'Unknown',
      country: 'Unknown',
      address: '',
      owner: 'Unknown',
      priority: 'Medium'
    });
    setAddModalVisible(true);
  };

  // Handle cancel operations
  const handleCancelAdd = () => {
    setAddModalVisible(false);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      value: 0,
      stage: 'Not Contacted',
      source: 'Unknown',
      country: 'Unknown',
      address: '',
      owner: 'Unknown',
      priority: 'Medium'
    });
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingLead(null);
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      value: 0,
      stage: 'Not Contacted',
      source: 'Unknown',
      country: 'Unknown',
      address: '',
      owner: 'Unknown',
      priority: 'Medium'
    });
  };

  // Handle PDF export
  const handleExportPDF = async () => {
    try {
      setExportLoading(true);
      const doc = new jsPDF();
      const currentDate = new Date().toLocaleDateString();
      const currentTime = new Date().toLocaleTimeString();

      // Get leads based on view mode
      let allLeads: any[] = [];
      if (viewMode === 'list') {
        allLeads = leadsData;
      } else {
        allLeads = [
          ...stages['Contacted'].map((lead: Lead) => ({ ...lead, stage: 'Contacted' })),
          ...stages['Not Contacted'].map((lead: Lead) => ({ ...lead, stage: 'Not Contacted' })),
          ...stages['Closed'].map((lead: Lead) => ({ ...lead, stage: 'Closed' })),
          ...stages['Lost'].map((lead: Lead) => ({ ...lead, stage: 'Lost' }))
        ];
      }

      const primaryColor = [242, 101, 34];
      const secondaryColor = [59, 112, 128];
      const textColor = [33, 37, 41];
      const lightGray = [248, 249, 250];
      const borderColor = [222, 226, 230];

      // Company name and report title
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("Amasqis HRMS", 20, 20);

      doc.setFontSize(14);
      doc.setFont(undefined, 'normal');
      doc.text(`Leads ${viewMode === 'grid' ? 'Grid' : 'Management'} Report`, 20, 28);

      // Report info
      doc.setFontSize(9);
      doc.text(`Generated: ${currentDate}`, 150, 20);
      doc.text(`Time: ${currentTime}`, 150, 26);
      doc.text(`Total Leads: ${allLeads.length}`, 150, 32);

      let yPosition = 50;

      // Table header
      doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.rect(20, yPosition, 170, 10, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("LEAD NAME", 22, yPosition + 7);
      doc.text("COMPANY", 60, yPosition + 7);
      doc.text("EMAIL", 100, yPosition + 7);
      doc.text("PHONE", 140, yPosition + 7);
      doc.text("STAGE", 170, yPosition + 7);
      yPosition += 12;

      // Table data
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      allLeads.forEach((lead: any, index: number) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
          doc.rect(20, yPosition - 2, 170, 8, 'F');
        }

        const leadName = (lead.name || lead.LeadName || "N/A").substring(0, 18);
        const company = (lead.company || lead.CompanyName || "N/A").substring(0, 18);
        const email = (lead.email || lead.Email || "N/A").substring(0, 20);
        const phone = (lead.phone || lead.Phone || "N/A").substring(0, 12);
        const stage = (lead.stage || lead.Tags || "N/A").substring(0, 12);

        doc.text(leadName, 22, yPosition + 4);
        doc.text(company, 60, yPosition + 4);
        doc.text(email, 100, yPosition + 4);
        doc.text(phone, 140, yPosition + 4);
        doc.text(stage, 170, yPosition + 4);

        yPosition += 8;
      });

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Page ${i} of ${pageCount}`, 20, 290);
        doc.text(`Generated by Amasqis HRMS`, 150, 290);
      }

      doc.save(`leads_report_${Date.now()}.pdf`);
      setExportLoading(false);
      console.log("PDF exported successfully");
    } catch (error) {
      setExportLoading(false);
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF");
    }
  };

  // Handle Excel export
  const handleExportExcel = () => {
    try {
      setExportLoading(true);
      const wb = XLSX.utils.book_new();

      // Get leads based on view mode
      let allLeads: any[] = [];
      if (viewMode === 'list') {
        allLeads = leadsData;
      } else {
        allLeads = [
          ...stages['Contacted'].map((lead: Lead) => ({ ...lead, stage: 'Contacted' })),
          ...stages['Not Contacted'].map((lead: Lead) => ({ ...lead, stage: 'Not Contacted' })),
          ...stages['Closed'].map((lead: Lead) => ({ ...lead, stage: 'Closed' })),
          ...stages['Lost'].map((lead: Lead) => ({ ...lead, stage: 'Lost' }))
        ];
      }

      const leadsDataForExcel = allLeads.map((lead: any) => ({
        "Lead Name": lead.name || lead.LeadName || "",
        "Company": lead.company || lead.CompanyName || "",
        "Email": lead.email || lead.Email || "",
        "Phone": lead.phone || lead.Phone || "",
        "Stage": lead.stage || lead.Tags || "",
        "Value": lead.value || 0,
        "Source": lead.source || "",
        "Country": lead.country || "",
        "Address": lead.address || "",
        "Owner": lead.owner || lead.LeadOwner || "",
        "Created Date": lead.createdAt || lead.CreatedDate || ""
      }));

      const ws = XLSX.utils.json_to_sheet(leadsDataForExcel);

      const colWidths = [
        { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 40 }, { wch: 20 }, { wch: 20 }
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Leads");
      XLSX.writeFile(wb, `leads_report_${Date.now()}.xlsx`);
      setExportLoading(false);
      console.log("Excel exported successfully");
    } catch (error) {
      setExportLoading(false);
      console.error("Error exporting Excel:", error);
      alert("Failed to export Excel");
    }
  };

  // Table columns for list view
  const columns = [
    {
      title: "Lead Name",
      dataIndex: "LeadName",
      render: (text: string, record: any) => (
        <h6 className="fw-medium fs-14">
          <Link to={`${routes.leadsDetails}?id=${record._id}`}>{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.LeadName.length - b.LeadName.length,
    },
    {
      title: "Company Name",
      dataIndex: "CompanyName",
      render: (text: string, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link
            to={routes.companiesDetails}
            className="avatar avatar-md border rounded-circle"
          >
            <ImageWithBasePath
              src={`assets/img/company/${record.Image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to={routes.companiesDetails}>{text}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.CompanyName.length - b.CompanyName.length,
    },
    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a: any, b: any) => a.Phone.length - b.Phone.length,
    },
    {
      title: "Email",
      dataIndex: "Email",
      sorter: (a: any, b: any) => a.Email.length - b.Email.length,
    },
    {
      title: "Tags",
      dataIndex: "Tags",
      render: (text: string) => (
        <span
          className={`badge  ${
            text === "Closed"
              ? "badge-info-transparent"
              : text === "Not Contacted"
              ? "badge-warning-transparent"
              : text === "Lost"
              ? "badge-danger-transparent"
              : "badge-purple-transparent"
          }`}
        >
          {text}
        </span>
      ),
      sorter: (a: any, b: any) => a.Tags.length - b.Tags.length,
    },
    {
      title: "CreatedDate",
      dataIndex: "CreatedDate",
      sorter: (a: any, b: any) => a.CreatedDate.length - b.CreatedDate.length,
    },
    {
      title: "Lead Owner",
      dataIndex: "LeadOwner",
      sorter: (a: any, b: any) => a.LeadOwner.length - b.LeadOwner.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (text: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            onClick={() => handleEditLead(record)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={() => handleDeleteLead(record._id)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  // Helper function to render lead card for grid view
  const renderLeadCard = (lead: Lead) => {
    const initials = (lead.name || '')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div key={lead._id} className="card kanban-card">
        <div className="card-body">
          <div className="d-block">
            <div className="border-warning border border-2 mb-3" />
            <div className="d-flex align-items-center mb-3">
              <Link
                to={`${routes.leadsDetails}?id=${lead._id}`}
                className="avatar avatar-lg bg-gray flex-shrink-0 me-2"
              >
                <span className="avatar-title text-dark">{initials}</span>
              </Link>
              <h6 className="fw-medium">
                <Link to={`${routes.leadsDetails}?id=${lead._id}`}>{lead.name}</Link>
              </h6>
            </div>
          </div>
          <div className="mb-3 d-flex flex-column">
            <p className="text-default d-inline-flex align-items-center mb-2">
              <i className="ti ti-report-money text-dark me-1" />
              ${lead.value.toLocaleString()}
            </p>
            <p className="text-default d-inline-flex align-items-center mb-2">
              <i className="ti ti-mail text-dark me-1" />
              {lead.email}
            </p>
            <p className="text-default d-inline-flex align-items-center mb-2">
              <i className="ti ti-phone text-dark me-1" />
              {lead.phone}
            </p>
            <p className="text-default d-inline-flex align-items-center">
              <i className="ti ti-map-pin-pin text-dark me-1" />
              {(() => {
                if (typeof lead.address === 'object' && lead.address !== null) {
                  const addr = lead.address as any;
                  const parts = [addr?.street, addr?.city, addr?.state, addr?.country, addr?.zipCode].filter(Boolean);
                  return parts.length > 0 ? parts.join(', ') : '-';
                }
                return lead.address || '-';
              })()}
            </p>
          </div>
          <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-3">
            <Link
              to="#"
              className="avatar avatar-sm avatar-rounded flex-shrink-0 me-2"
            >
              <ImageWithBasePath
                src={`assets/img/company/company-${String(Math.floor(Math.random() * 20) + 1).padStart(2, '0')}.svg`}
                alt="image"
              />
            </Link>
            <div className="icons-social d-flex align-items-center">
              <Link
                to="#"
                className="d-flex align-items-center justify-content-center me-2"
                onClick={() => handleEditLead(lead)}
                title="Edit Lead"
              >
                <i className="ti ti-edit" />
              </Link>
              <Link
                to="#"
                className="d-flex align-items-center justify-content-center me-2"
                onClick={() => handleDeleteLead(lead._id)}
                title="Delete Lead"
              >
                <i className="ti ti-trash" />
              </Link>
              <Link
                to="#"
                className="d-flex align-items-center justify-content-center me-2"
                title="Call"
              >
                <i className="ti ti-phone-call" />
              </Link>
              <Link
                to="#"
                className="d-flex align-items-center justify-content-center me-2"
                title="Chat"
              >
                <i className="ti ti-brand-hipchat" />
              </Link>
              <Link
                to="#"
                className="d-flex align-items-center justify-content-center"
                title="More Options"
              >
                <i className="ti ti-color-swatch" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leads</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">CRM</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    {viewMode === 'list' ? 'Leads List' : 'Leads Grid'}
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="me-2 mb-2">
                <div className="d-flex align-items-center border bg-white rounded p-1 me-2 icon-list">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "list" ? "active bg-primary text-white" : ""
                    } me-1`}
                  >
                    <i className="ti ti-list-tree" />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`btn btn-icon btn-sm ${
                      viewMode === "grid" ? "active bg-primary text-white" : ""
                    }`}
                  >
                    <i className="ti ti-layout-grid" />
                  </button>
                </div>
              </div>
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    <i className="ti ti-file-export me-1" />
                    Export
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
                        style={{ pointerEvents: exportLoading ? 'none' : 'auto' }}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        {exportLoading ? 'Exporting...' : 'Export as PDF'}
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
                        style={{ pointerEvents: exportLoading ? 'none' : 'auto' }}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        {exportLoading ? 'Exporting...' : 'Export as Excel'}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={() => setAddModalVisible(true)}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Lead
                </button>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Leads List</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="me-3">
                    <div className="input-icon-end position-relative">
                      <PredefinedDateRanges
                        onChange={handleDateRangeChange}
                        value={dateRange}
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-chevron-down" />
                      </span>
                    </div>
                  </div>
                  <div className="dropdown me-3">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      {filters.stage === 'all' ? 'All Stages' : filters.stage}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.stage === 'all' ? 'active' : ''}`}
                          onClick={() => handleStageFilter('all')}
                        >
                          All Stages
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.stage === 'Closed' ? 'active' : ''}`}
                          onClick={() => handleStageFilter('Closed')}
                        >
                          Closed
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.stage === 'Contacted' ? 'active' : ''}`}
                          onClick={() => handleStageFilter('Contacted')}
                        >
                          Contacted
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.stage === 'Lost' ? 'active' : ''}`}
                          onClick={() => handleStageFilter('Lost')}
                        >
                          Lost
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.stage === 'Not Contacted' ? 'active' : ''}`}
                          onClick={() => handleStageFilter('Not Contacted')}
                        >
                          Not Contacted
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Sort By: {filters.sortBy === 'createdDate' ? 'Recently Added' :
                                filters.sortBy === 'name' ? 'Name' :
                                filters.sortBy === 'company' ? 'Company' :
                                filters.sortBy === 'stage' ? 'Stage' : 'Recently Added'}
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'createdDate' ? 'active' : ''}`}
                          onClick={() => handleSortChange('createdDate')}
                        >
                          Recently Added
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'name' ? 'active' : ''}`}
                          onClick={() => handleSortChange('name')}
                        >
                          Name (A-Z)
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'company' ? 'active' : ''}`}
                          onClick={() => handleSortChange('company')}
                        >
                          Company (A-Z)
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'stage' ? 'active' : ''}`}
                          onClick={() => handleSortChange('stage')}
                        >
                          Stage
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading leads...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                      <div className="text-danger mb-2">
                        <i className="ti ti-alert-circle fs-24"></i>
                      </div>
                      <p className="text-muted">{error}</p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={fetchLeadsData}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : leadsData.length === 0 ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                      <div className="text-muted mb-2">
                        <i className="ti ti-inbox fs-24"></i>
                      </div>
                      <p className="text-muted">No leads found</p>
                      <p className="text-muted small">Try adjusting your filters or add a new lead</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Table dataSource={leadsData} columns={columns} Selection={true} />
                    {pagination.totalPages > 1 && (
                      <div className="d-flex justify-content-between align-items-center p-3 border-top">
                        <div className="text-muted">
                          Showing {((pagination.currentPage - 1) * (filters.limit || 50)) + 1} to {Math.min(pagination.currentPage * (filters.limit || 50), pagination.totalCount)} of {pagination.totalCount} leads
                        </div>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={pagination.currentPage === 1}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                          >
                            Previous
                          </button>
                          <span className="btn btn-sm btn-outline-secondary disabled">
                            {pagination.currentPage} of {pagination.totalPages}
                          </span>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            disabled={pagination.currentPage === pagination.totalPages}
                            onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Leads Grid</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="dropdown">
                    <Link
                      to="#"
                      className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                      data-bs-toggle="dropdown"
                    >
                      Sort By: {filters.sortBy === 'recentlyAdded' ? 'Recently Added' :
                                filters.sortBy === 'ascending' ? 'Ascending' :
                                filters.sortBy === 'descending' ? 'Descending' :
                                filters.sortBy === 'lastMonth' ? 'Last Month' :
                                filters.sortBy === 'last7Days' ? 'Last 7 Days' : 'Recently Added'}
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'recentlyAdded' ? 'active' : ''}`}
                          onClick={() => handleSortChange('recentlyAdded')}
                        >
                          Recently Added
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'ascending' ? 'active' : ''}`}
                          onClick={() => handleSortChange('ascending')}
                        >
                          Ascending
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'descending' ? 'active' : ''}`}
                          onClick={() => handleSortChange('descending')}
                        >
                          Descending
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'lastMonth' ? 'active' : ''}`}
                          onClick={() => handleSortChange('lastMonth')}
                        >
                          Last Month
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="#"
                          className={`dropdown-item rounded-1 ${filters.sortBy === 'last7Days' ? 'active' : ''}`}
                          onClick={() => handleSortChange('last7Days')}
                        >
                          Last 7 Days
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2 text-muted">Loading leads...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="d-flex align-items-center justify-content-center py-5">
                    <div className="text-center">
                      <div className="text-danger mb-2">
                        <i className="ti ti-alert-circle fs-24"></i>
                      </div>
                      <p className="text-muted">{error}</p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={fetchLeadsGridData}
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="row">
                    {/* Contacted Column */}
                    <div className="col-xxl-3 col-xl-6">
                      <div className="card mb-4">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                          <h5 className="d-flex align-items-center">
                            <span className="badge badge-success badge-xs me-2" />
                            Contacted
                          </h5>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-light me-2">
                              {stageTotals['Contacted'].count} Leads
                            </span>
                            <span className="badge badge-light">
                              ${stageTotals['Contacted'].value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="card-body kanban-container" ref={container1Ref}>
                          {stages['Contacted'].map((lead: Lead) => renderLeadCard(lead))}
                          <button
                            className="btn btn-outline-primary w-100 mt-2"
                            onClick={() => handleAddLeadFromColumn('Contacted')}
                          >
                            <i className="ti ti-plus me-1" />
                            Add Lead
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Not Contacted Column */}
                    <div className="col-xxl-3 col-xl-6">
                      <div className="card mb-4">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                          <h5 className="d-flex align-items-center">
                            <span className="badge badge-warning badge-xs me-2" />
                            Not Contacted
                          </h5>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-light me-2">
                              {stageTotals['Not Contacted'].count} Leads
                            </span>
                            <span className="badge badge-light">
                              ${stageTotals['Not Contacted'].value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="card-body kanban-container" ref={container2Ref}>
                          {stages['Not Contacted'].map((lead: Lead) => renderLeadCard(lead))}
                          <button
                            className="btn btn-outline-primary w-100 mt-2"
                            onClick={() => handleAddLeadFromColumn('Not Contacted')}
                          >
                            <i className="ti ti-plus me-1" />
                            Add Lead
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Closed Column */}
                    <div className="col-xxl-3 col-xl-6">
                      <div className="card mb-4">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                          <h5 className="d-flex align-items-center">
                            <span className="badge badge-info badge-xs me-2" />
                            Closed
                          </h5>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-light me-2">
                              {stageTotals['Closed'].count} Leads
                            </span>
                            <span className="badge badge-light">
                              ${stageTotals['Closed'].value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="card-body kanban-container" ref={container3Ref}>
                          {stages['Closed'].map((lead: Lead) => renderLeadCard(lead))}
                          <button
                            className="btn btn-outline-primary w-100 mt-2"
                            onClick={() => handleAddLeadFromColumn('Closed')}
                          >
                            <i className="ti ti-plus me-1" />
                            Add Lead
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lost Column */}
                    <div className="col-xxl-3 col-xl-6">
                      <div className="card mb-4">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                          <h5 className="d-flex align-items-center">
                            <span className="badge badge-danger badge-xs me-2" />
                            Lost
                          </h5>
                          <div className="d-flex align-items-center">
                            <span className="badge badge-light me-2">
                              {stageTotals['Lost'].count} Leads
                            </span>
                            <span className="badge badge-light">
                              ${stageTotals['Lost'].value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="card-body kanban-container" ref={container4Ref}>
                          {stages['Lost'].map((lead: Lead) => renderLeadCard(lead))}
                          <button
                            className="btn btn-outline-primary w-100 mt-2"
                            onClick={() => handleAddLeadFromColumn('Lost')}
                          >
                            <i className="ti ti-plus me-1" />
                            Add Lead
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Add Lead Modal */}
      {addModalVisible && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Lead</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelAdd}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Lead Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.company}
                      onChange={(e) => handleFormChange('company', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Value</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.value}
                      onChange={(e) => handleFormChange('value', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Stage</label>
                    <select
                      className="form-control"
                      value={formData.stage}
                      onChange={(e) => handleFormChange('stage', e.target.value)}
                    >
                      <option value="Not Contacted">Not Contacted</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Closed</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Source</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.source}
                      onChange={(e) => handleFormChange('source', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.country}
                      onChange={(e) => handleFormChange('country', e.target.value)}
                    />
                  </div>
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Owner</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.owner}
                      onChange={(e) => handleFormChange('owner', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelAdd}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddLead}
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Creating...' : 'Create Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editModalVisible && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Lead</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelEdit}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Lead Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => handleFormChange('name', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.company}
                      onChange={(e) => handleFormChange('company', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => handleFormChange('email', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => handleFormChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Value</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.value}
                      onChange={(e) => handleFormChange('value', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Stage</label>
                    <select
                      className="form-control"
                      value={formData.stage}
                      onChange={(e) => handleFormChange('stage', e.target.value)}
                    >
                      <option value="Not Contacted">Not Contacted</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Closed">Closed</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Source</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.source}
                      onChange={(e) => handleFormChange('source', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.country}
                      onChange={(e) => handleFormChange('country', e.target.value)}
                    />
                  </div>
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleFormChange('address', e.target.value)}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Owner</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.owner}
                      onChange={(e) => handleFormChange('owner', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateLead}
                  disabled={submitLoading}
                >
                  {submitLoading ? 'Updating...' : 'Update Lead'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LeadsList;
