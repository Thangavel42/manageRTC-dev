import { DatePicker, message, Spin } from "antd";
import { useEffect, useState } from "react";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link } from "react-router-dom";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../core/common/commonSelect";
import Table from "../../../core/common/dataTable/index";
import PredefinedDateRanges from "../../../core/common/datePicker";
import Footer from "../../../core/common/footer";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { useAuth } from "../../../hooks/useAuth";
import { useEmployeesREST } from "../../../hooks/useEmployeesREST";
import {
  statusDisplayMap, useOvertimeREST, type OvertimeStatus
} from "../../../hooks/useOvertimeREST";

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <Spin size="large" />
  </div>
);

// Status badge component
const StatusBadge = ({ status }: { status: OvertimeStatus }) => {
  const config = statusDisplayMap[status] || statusDisplayMap.pending;
  return (
    <span
      className={`badge d-inline-flex align-items-center badge-xs ${config.badgeClass}`}
    >
      <i className="ti ti-point-filled me-1" />
      {config.label}
    </span>
  );
};

const OverTime = () => {
  // Role-based access control
  const { role } = useAuth();
  const isEmployeeOrManager = ['employee', 'manager'].includes(role);
  const canManageOvertime = ['admin', 'hr', 'superadmin'].includes(role);

  // API hooks
  const {
    overtimeRequests,
    loading,
    fetchOvertimeRequests,
    fetchMyOvertimeRequests,
    createOvertimeRequest,
    approveOvertimeRequest,
    rejectOvertimeRequest,
    deleteOvertimeRequest,
    stats
  } = useOvertimeREST();
  const { employees, fetchEmployees } = useEmployeesREST();

  // Local state for filters
  const [filters, setFilters] = useState<{
    status?: OvertimeStatus;
    employee?: string;
    page: number;
    limit: number;
  }>({
    page: 1,
    limit: 20,
  });

  // Form state for Add Overtime modal
  const [addFormData, setAddFormData] = useState({
    employeeId: '',
    date: null as any,
    hours: '',
    description: '',
    status: 'pending' as OvertimeStatus,
  });

  // Form state for Edit Overtime modal
  const [editFormData, setEditFormData] = useState<{
    _id: string;
    employeeId: string;
    date: any;
    hours: string;
    description: string;
    status: OvertimeStatus;
  } | null>(null);

  // State for rejection modal
  const [rejectModal, setRejectModal] = useState<{
    show: boolean;
    overtimeId: string | null;
    reason: string;
  }>({
    show: false,
    overtimeId: null,
    reason: ''
  });

  // Fetch employees on mount (only for admin/hr/superadmin)
  useEffect(() => {
    if (canManageOvertime) {
      fetchEmployees({ status: 'Active' });
    }
  }, [canManageOvertime]);

  // Fetch overtime requests on mount and when filters change
  useEffect(() => {
    if (isEmployeeOrManager) {
      // Employees/Managers only see their own overtime requests
      fetchMyOvertimeRequests(filters);
    } else {
      // Admin/HR see all overtime requests
      fetchOvertimeRequests(filters);
    }
  }, [filters, isEmployeeOrManager]);

  // Transform overtime requests for table display
  const data = overtimeRequests.map((ot) => ({
    key: ot._id,
    _id: ot._id,
    Employee: ot.employeeName || "Unknown",
    Role: "Employee",
    EmpImage: "user-32.jpg",
    Image: "user-32.jpg",
    Date: new Date(ot.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    OvertimeHours: `${ot.hours} Hours`,
    Project: ot.project || "General",
    Name: ot.approvedByName || "Pending",
    Status: ot.status,
    rawOvertime: ot,
  }));

  // Employee options for dropdown
  const employeeOptions = [
    { value: "", label: "Select Employee" },
    ...employees.map(emp => ({
      value: emp._id,
      label: `${emp.firstName} ${emp.lastName}`.trim(),
    }))
  ];

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Accepted" },
    { value: "rejected", label: "Rejected" },
  ];

  // Helper function to refresh data based on role
  const refreshData = () => {
    if (isEmployeeOrManager) {
      fetchMyOvertimeRequests(filters);
    } else {
      fetchOvertimeRequests(filters);
    }
  };

  // Handler functions
  const handleApprove = async (overtimeId: string) => {
    const success = await approveOvertimeRequest(overtimeId, "Approved");
    if (success) {
      refreshData();
    }
  };

  const handleRejectClick = (overtimeId: string) => {
    setRejectModal({
      show: true,
      overtimeId,
      reason: ''
    });
  };

  const handleRejectConfirm = async () => {
    if (rejectModal.overtimeId && rejectModal.reason.trim()) {
      const success = await rejectOvertimeRequest(rejectModal.overtimeId, rejectModal.reason);
      if (success) {
        refreshData();
      }
      setRejectModal({ show: false, overtimeId: null, reason: '' });
    }
  };

  const handleRejectCancel = () => {
    setRejectModal({ show: false, overtimeId: null, reason: '' });
  };

  const handleDelete = async (overtimeId: string) => {
    if (window.confirm("Are you sure you want to delete this overtime request?")) {
      const success = await deleteOvertimeRequest(overtimeId);
      if (success) {
        refreshData();
      }
    }
  };

  // Handler for Add Overtime form submission
  const handleAddOvertimeSubmit = async () => {
    if (!addFormData.employeeId) {
      message.error('Please select an employee');
      return;
    }
    if (!addFormData.date) {
      message.error('Please select a date');
      return;
    }
    if (!addFormData.hours || parseFloat(addFormData.hours) <= 0) {
      message.error('Please enter valid overtime hours');
      return;
    }

    const success = await createOvertimeRequest({
      employeeId: addFormData.employeeId,
      date: addFormData.date.format('YYYY-MM-DD'),
      hours: parseFloat(addFormData.hours),
      description: addFormData.description,
      status: addFormData.status,
    });

    if (success) {
      // Reset form and close modal
      setAddFormData({
        employeeId: '',
        date: null,
        hours: '',
        description: '',
        status: 'pending',
      });
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('add_overtime');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data
      refreshData();
    }
  };

  // Handler for Edit Overtime button click
  const handleEditClick = (overtime: any) => {
    setEditFormData({
      _id: overtime._id,
      employeeId: overtime.employeeId || '',
      date: overtime.date,
      hours: overtime.hours.toString(),
      description: overtime.description || '',
      status: overtime.status,
    });
  };

  // Handler for Edit Overtime form submission
  const handleEditOvertimeSubmit = async () => {
    if (!editFormData) return;

    if (!editFormData.employeeId) {
      message.error('Please select an employee');
      return;
    }
    if (!editFormData.date) {
      message.error('Please select a date');
      return;
    }
    if (!editFormData.hours || parseFloat(editFormData.hours) <= 0) {
      message.error('Please enter valid overtime hours');
      return;
    }

    const success = await createOvertimeRequest({
      employeeId: editFormData.employeeId,
      date: editFormData.date.format ? editFormData.date.format('YYYY-MM-DD') : editFormData.date,
      hours: parseFloat(editFormData.hours),
      description: editFormData.description,
      status: editFormData.status,
    });

    if (success) {
      setEditFormData(null);
      // Close modal using Bootstrap API
      const modalEl = document.getElementById('edit_overtime');
      if (modalEl) {
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      }
      // Refresh data
      refreshData();
    }
  };

  // Filter handlers
  const handleStatusFilter = (status: OvertimeStatus) => {
    setFilters(prev => ({ ...prev, status, page: 1 }));
  };

  const handleEmployeeFilter = (employeeId: string) => {
    setFilters(prev => ({ ...prev, employee: employeeId, page: 1 }));
  };
  const columns = [
    {
      title: "Employee",
      dataIndex: "Employee",
      render: (text: String, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={`assets/img/users/${record.EmpImage}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{record.Employee}</Link>
            </h6>
            <span className="fs-12 fw-normal ">{record.Role}</span>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.Employee.length - b.Employee.length,
    },
    {
      title: "Date",
      dataIndex: "Date",
      sorter: (a: any, b: any) => a.Date.length - b.Date.length,
    },
    {
      title: "Overtime Hours",
      dataIndex: "OvertimeHours",
      sorter: (a: any, b: any) =>
        a.OvertimeHours.length - b.OvertimeHours.length,
    },
    {
      title: "Project",
      dataIndex: "Project",
      render: (text: String, record: any) => (
        <p className="fs-14 fw-medium text-gray-9 d-flex align-items-center">
          {record.Project}
          <Link
            to="#"
            className="ms-1"
            data-bs-toggle="tooltip"
            data-bs-placement="right"
            data-bs-title="Worked on the Management
												design & Development"
          >
            <OverlayTrigger
              placement="bottom"
              overlay={
                <Tooltip id="collapse-tooltip">
                  Worked on the Management design & Development
                </Tooltip>
              }
            >
              <i className="ti ti-info-circle text-info"></i>
            </OverlayTrigger>
          </Link>
        </p>
      ),
      sorter: (a: any, b: any) => a.Project.length - b.Project.length,
    },
    {
      title: "Approved By",
      dataIndex: "Name",
      render: (text: String, record: any) => (
        <div className="d-flex align-items-center file-name-icon">
          <Link to="#" className="avatar avatar-md border avatar-rounded">
            <ImageWithBasePath
              src={`assets/img/users/${record.Image}`}
              className="img-fluid"
              alt="img"
            />
          </Link>
          <div className="ms-2">
            <h6 className="fw-medium">
              <Link to="#">{record.Name}</Link>
            </h6>
          </div>
        </div>
      ),
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (status: OvertimeStatus) => <StatusBadge status={status} />,
      sorter: (a: any, b: any) => a.Status.localeCompare(b.Status),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          {canManageOvertime && record.Status === 'pending' && (
            <>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Approve"
                onClick={() => handleApprove(record._id)}
              >
                <i className="ti ti-check text-success" style={{ fontSize: '18px' }} />
              </Link>
              <Link
                to="#"
                className="me-2"
                data-bs-toggle="tooltip"
                title="Reject"
                onClick={() => handleRejectClick(record._id)}
              >
                <i className="ti ti-x text-danger" style={{ fontSize: '18px' }} />
              </Link>
            </>
          )}
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_overtime"
            onClick={() => handleEditClick(record.rawOvertime)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => handleDelete(record._id)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];
  const employeeName = [
    { value: "Anthony Lewis", label: "Anthony Lewis" },
    { value: "Brian Villalobos", label: "Brian Villalobos" },
    { value: "Harvey Smith", label: "Harvey Smith" },
  ];
  const statusChoose = [
    { value: "Accepted", label: "Accepted" },
    { value: "Rejected", label: "Rejected" },
  ];

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };
  const getModalContainer2 = () => {
    const modalElement = document.getElementById("modal_datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Overtime</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to="index.html">
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Overtime
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
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
                      <Link to="#" className="dropdown-item rounded-1">
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
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
                  data-inert={true}
                  data-bs-target="#add_overtime"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Overtime
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Overtime Counts */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center flex-wrap justify-content-between">
                    <div>
                      <p className="fs-12 fw-medium mb-0 text-gray-5">
                        Overtime Employee
                      </p>
                      <h4>{overtimeRequests.length}</h4>
                    </div>
                    <div>
                      <span className="p-2 br-10 bg-transparent-primary border border-primary d-flex align-items-center justify-content-center">
                        <i className="ti ti-user-check text-primary fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center flex-wrap justify-content-between">
                    <div>
                      <p className="fs-12 fw-medium mb-0 text-gray-5">
                        Overtime Hours
                      </p>
                      <h4>{stats?.totalHours || overtimeRequests.reduce((sum, ot) => sum + ot.hours, 0)}</h4>
                    </div>
                    <div>
                      <span className="p-2 br-10 bg-pink-transparent border border-pink d-flex align-items-center justify-content-center">
                        <i className="ti ti-user-edit text-pink fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center flex-wrap justify-content-between">
                    <div>
                      <p className="fs-12 fw-medium mb-0 text-gray-5">
                        Pending Request
                      </p>
                      <h4>{stats?.pending || overtimeRequests.filter(ot => ot.status === 'pending').length}</h4>
                    </div>
                    <div>
                      <span className="p-2 br-10 bg-transparent-purple border border-purple d-flex align-items-center justify-content-center">
                        <i className="ti ti-user-exclamation text-purple fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center flex-wrap justify-content-between">
                    <div>
                      <p className="fs-12 fw-medium mb-0 text-gray-5">
                        Rejected
                      </p>
                      <h4>{stats?.rejected || overtimeRequests.filter(ot => ot.status === 'rejected').length}</h4>
                    </div>
                    <div>
                      <span className="p-2 br-10 bg-skyblue-transparent border border-skyblue d-flex align-items-center justify-content-center">
                        <i className="ti ti-user-exclamation text-skyblue fs-18" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Overtime Counts */}
          {/* Performance Indicator list */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Overtime</h5>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                <div className="me-3">
                  <div className="input-icon-end position-relative">
                    <PredefinedDateRanges />
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
                    Employee
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Anthony Lewis
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Brian Villalobos
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Harvey Smith
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Project
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Office Management
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Project Management
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Hospital Administration
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="dropdown me-3">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                  >
                    Select Status
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Accepted
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Rejected
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
                    Sort By : Last 7 Days
                  </Link>
                  <ul className="dropdown-menu  dropdown-menu-end p-3">
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Recently Added
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Ascending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Desending
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last Month
                      </Link>
                    </li>
                    <li>
                      <Link to="#" className="dropdown-item rounded-1">
                        Last 7 Days
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <LoadingSpinner />
              ) : (
                <Table dataSource={data} columns={columns} Selection={false} />
              )}
            </div>
          </div>
          {/* /Performance Indicator list */}
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}
      {/* Add Overtime */}
      <div className="modal fade" id="add_overtime">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Overtime</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setAddFormData({
                  employeeId: '',
                  date: null,
                  hours: '',
                  description: '',
                  status: 'pending',
                })}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Employee<span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={employeeOptions}
                        defaultValue={employeeOptions[0]}
                        onChange={(option: any) => setAddFormData({ ...addFormData, employeeId: option.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Overtime date <span className="text-danger"> *</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={addFormData.date}
                          onChange={(date) => setAddFormData({ ...addFormData, date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Overtime Hours<span className="text-danger"> *</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={addFormData.hours}
                        onChange={(e) => setAddFormData({ ...addFormData, hours: e.target.value })}
                        placeholder="Enter hours"
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Status<span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={statusOptions}
                        defaultValue={statusOptions[0]}
                        onChange={(option: any) => setAddFormData({ ...addFormData, status: option.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={addFormData.description}
                        onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                        placeholder="Enter description"
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
                  onClick={() => setAddFormData({
                    employeeId: '',
                    date: null,
                    hours: '',
                    description: '',
                    status: 'pending',
                  })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddOvertimeSubmit}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : 'Add Overtime'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Overtime */}
      {/* Edit Overtime */}
      <div className="modal fade" id="edit_overtime">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Overtime</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setEditFormData(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Employee <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={employeeOptions}
                        defaultValue={editFormData ? employeeOptions.find(e => e.value === editFormData.employeeId) || employeeOptions[1] : employeeOptions[1]}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, employeeId: option.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Overtime date <span className="text-danger"> *</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{
                            format: "DD-MM-YYYY",
                            type: "mask",
                          }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={editFormData?.date}
                          onChange={(date) => editFormData && setEditFormData({ ...editFormData, date })}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Overtime Hours<span className="text-danger"> *</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={editFormData?.hours || ''}
                        onChange={(e) => editFormData && setEditFormData({ ...editFormData, hours: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Status<span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={statusOptions}
                        defaultValue={editFormData ? statusOptions.find(s => s.value === editFormData.status) || statusOptions[0] : statusOptions[0]}
                        onChange={(option: any) => editFormData && setEditFormData({ ...editFormData, status: option.value })}
                      />
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={editFormData?.description || ''}
                        onChange={(e) => editFormData && setEditFormData({ ...editFormData, description: e.target.value })}
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
                  onClick={() => setEditFormData(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEditOvertimeSubmit}
                  disabled={!editFormData || loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Overtime */}
      {/* Overtime Details */}
      <div className="modal fade" id="overtime_details">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title"> Overtime Details</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body pb-0">
                <div className="row">
                  <div className="col-md-12">
                    <div className="mb-3">
                      <div className="p-3 mb-3 br-5 bg-transparent-light">
                        <div className="row">
                          <div className="col-md-4">
                            <div className="d-flex align-items-center file-name-icon">
                              <Link
                                to="#"
                                className="avatar avatar-md border avatar-rounded"
                              >
                                <ImageWithBasePath
                                  src="assets/img/users/user-32.jpg"
                                  className="img-fluid"
                                  alt="img"
                                />
                              </Link>
                              <div className="ms-2">
                                <h6 className="fw-medium fs-14">
                                  <Link to="#">Anthony Lewis</Link>
                                </h6>
                                <span className="fs-12 fw-normal ">
                                  UI/UX Team
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div>
                              <p className="fs-14 fw-normal mb-1">
                                Hours Worked
                              </p>
                              <h6 className="fs-14 fw-medium">32</h6>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div>
                              <p className="fs-14 fw-normal mb-1">Date</p>
                              <h6 className="fs-14 fw-medium">15 Apr 2024</h6>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <h6 className="fs-14 fw-medium">Office Management</h6>
                      <p className="fs-12 fw-normal">
                        Worked on the Management design &amp; Development
                      </p>
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Select Status <span className="text-danger"> *</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={statusChoose}
                        defaultValue={statusChoose[0]}
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
                >
                  Cancel
                </button>
                <button
                  type="button"
                  data-bs-dismiss="modal"
                  className="btn btn-primary"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Overtime Details */}
      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Reject Overtime Request</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={handleRejectCancel}
                  aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Please enter the reason for rejecting this overtime request"
                    value={rejectModal.reason}
                    onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleRejectCancel}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRejectConfirm}
                  disabled={!rejectModal.reason.trim()}
                >
                  Reject Overtime
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Reject Modal */}
    </>
  );
};

export default OverTime;
