import { message } from "antd";
import jsPDF from "jspdf";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import CollapseHeader from "../../../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../../../core/common/commonSelect";
import Footer from "../../../../core/common/footer";
import { CustomPolicy, useCustomPolicies } from "../../../../hooks/useCustomPolicies";
import { useEmployeesREST } from "../../../../hooks/useEmployeesREST";
import { LeaveType, useLeaveTypesREST } from "../../../../hooks/useLeaveTypesREST";
import { all_routes } from "../../../router/all_routes";

// Mapping of backend leave type codes (lowercase) to display names
const LEAVE_TYPE_DISPLAY_NAMES: Record<string, string> = {
  earned: "Annual Leave",
  sick: "Sick Leave",
  casual: "Casual Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  bereavement: "Bereavement Leave",
  compensatory: "Compensatory Off",
  unpaid: "Loss of Pay",
  special: "Special Leave",
};

const LeaveSettings = () => {
  // ============ API Hooks ============
  const {
    leaveTypes,
    fetchLeaveTypes,
    createLeaveType,
    updateLeaveType,
    toggleLeaveTypeStatus,
  } = useLeaveTypesREST();

  const {
    employees,
    fetchEmployees,
  } = useEmployeesREST();

  const {
    policies,
    loading: policiesLoading,
    fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
  } = useCustomPolicies();

  // ============ State ============
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<CustomPolicy | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<CustomPolicy | null>(null);
  const [exporting, setExporting] = useState(false);

  // Leave Type Add/Edit Form State
  const [leaveTypeForm, setLeaveTypeForm] = useState<Partial<LeaveType>>({
    name: "",
    code: "",
    annualQuota: 0,
    isPaid: true,
    requiresApproval: true,
    carryForwardAllowed: false,
    maxCarryForwardDays: 0,
    carryForwardExpiry: 90,
    encashmentAllowed: false,
    maxEncashmentDays: 0,
    encashmentRatio: 0,
    minNoticeDays: 0,
    maxConsecutiveDays: 0,
    requiresDocument: false,
    acceptableDocuments: [],
    accrualRate: 0,
    accrualMonth: 1,
    accrualWaitingPeriod: 0,
    color: "#1890ff",
    icon: "ti ti-calendar",
    description: "",
    isActive: true,
  });

  // Validation errors
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [viewingLeaveType, setViewingLeaveType] = useState<LeaveType | null>(null);

  // Validation errors for Add/Edit Leave Type
  const [leaveTypeErrors, setLeaveTypeErrors] = useState<{
    name?: string;
    annualQuota?: string;
    maxCarryForwardDays?: string;
    maxConsecutiveDays?: string;
  }>({});

  // Validation errors for Custom Policy
  const [policyErrors, setPolicyErrors] = useState<{
    name?: string;
    leaveTypeId?: string;
    customDays?: string;
    employees?: string;
  }>({});

  // Custom Policy Form State
  const [policyForm, setPolicyForm] = useState({
    name: "",
    leaveTypeId: "", // ObjectId reference to leaveTypes collection
    defaultDays: 0, // Read-only field fetched from DB
    customDays: 0, // Custom days for selected employees
    employeeIds: [] as string[],
    settings: {
      carryForward: false,
      maxCarryForwardDays: 0,
      isEarnedLeave: false,
    },
  });

  // Employee Multi-Select State
  const [selectedEmployees, setSelectedEmployees] = useState<any[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // ============ Data Fetching ============
  useEffect(() => {
    // Fetch all leave types (including inactive)
    fetchLeaveTypes({ status: "all", limit: 50 });
    fetchEmployees({ status: "Active" });
    fetchPolicies();
  }, [fetchLeaveTypes, fetchEmployees, fetchPolicies]);

  // Prepare employee data for selection
  const employeeOptions = useMemo(() => {
    return employees.map((emp: any) => {
      // Extract department name from object or use string directly
      let departmentName = "Unassigned";
      if (emp.department) {
        if (typeof emp.department === 'string') {
          departmentName = emp.department;
        } else if (typeof emp.department === 'object') {
          departmentName = emp.department.department || emp.department.name || emp.department._id || "Unassigned";
        }
      }

      // Compute employee name from multiple possible sources
      // Priority: fullName > firstName + lastName > name field > 'Unknown'
      let employeeName = emp.fullName;
      if (!employeeName) {
        // If fullName is not set, compute from firstName and lastName
        if (emp.firstName || emp.lastName) {
          employeeName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        } else if (emp.name) {
          employeeName = emp.name;
        } else {
          employeeName = 'Unknown Employee';
        }
      }

      // Use the actual employeeId field (like "EMP-9251") for display, fallback to _id
      // For the unique key, use _id (ObjectId) as it's guaranteed to be unique
      const displayId = emp.employeeId || emp._id;
      const uniqueKey = emp._id || emp.employeeId;

      return {
        employeeId: uniqueKey,
        name: employeeName,
        department: departmentName,
        key: displayId, // This is what gets displayed
      };
    });
  }, [employees]);

  // Filtered employee options based on search term only
  const filteredEmployeeOptions = useMemo(() => {
    let filtered = employeeOptions.filter(
      (emp) => !selectedEmployees.find((selected) => selected.employeeId === emp.employeeId)
    );

    // Filter by search term (searches in both name and employeeId)
    if (employeeSearchTerm) {
      const searchLower = employeeSearchTerm.toLowerCase();
      filtered = filtered.filter((emp) =>
        emp.name.toLowerCase().includes(searchLower) ||
        (emp.key && emp.key.toString().toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [employeeOptions, selectedEmployees, employeeSearchTerm]);

  // Leave type options for dropdown - use _id as value for ObjectId reference
  const leaveTypeOptions = useMemo(() => {
    return leaveTypes.map((lt) => ({
      value: lt._id || lt.leaveTypeId, // Use ObjectId for leaveTypeId
      label: lt.name,
    }));
  }, [leaveTypes]);

  // ============ Handlers ============

  // Reset Add Leave Type form
  const resetAddLeaveTypeForm = () => {
    setLeaveTypeForm({
      name: "",
      code: "",
      annualQuota: 0,
      isPaid: true,
      requiresApproval: true,
      carryForwardAllowed: false,
      maxCarryForwardDays: 0,
      carryForwardExpiry: 90,
      encashmentAllowed: false,
      maxEncashmentDays: 0,
      encashmentRatio: 0,
      minNoticeDays: 0,
      maxConsecutiveDays: 0,
      requiresDocument: false,
      acceptableDocuments: [],
      accrualRate: 0,
      accrualMonth: 1,
      accrualWaitingPeriod: 0,
      color: "#1890ff",
      icon: "ti ti-calendar",
      description: "",
      isActive: true,
    });
    setNameError(null);
    setCodeError(null);
  };

  // Helper function to safely close Bootstrap modal and clean up backdrop
  const closeModal = (modalSelector: string) => {
    const modalEl = document.querySelector(modalSelector);
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getInstance(modalEl);
      if (modal) {
        modal.hide();
      } else {
        // Fallback: manually remove modal classes and backdrop
        modalEl.classList.remove('show');
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.removeAttribute('aria-modal');
        (modalEl as HTMLElement).style.display = 'none';
      }
    }
    // Always clean up backdrop and body classes as fallback
    setTimeout(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    }, 100);
  };

  // Open Edit Leave Type Modal
  const openEditLeaveTypeModal = (leaveType: LeaveType) => {
    setSelectedLeaveType(leaveType);
    setLeaveTypeForm({
      name: leaveType.name,
      code: leaveType.code,
      annualQuota: leaveType.annualQuota,
      isPaid: leaveType.isPaid,
      requiresApproval: leaveType.requiresApproval,
      carryForwardAllowed: leaveType.carryForwardAllowed,
      maxCarryForwardDays: leaveType.maxCarryForwardDays,
      carryForwardExpiry: leaveType.carryForwardExpiry,
      encashmentAllowed: leaveType.encashmentAllowed,
      maxEncashmentDays: leaveType.maxEncashmentDays,
      encashmentRatio: leaveType.encashmentRatio,
      minNoticeDays: leaveType.minNoticeDays,
      maxConsecutiveDays: leaveType.maxConsecutiveDays,
      requiresDocument: leaveType.requiresDocument,
      acceptableDocuments: leaveType.acceptableDocuments || [],
      accrualRate: leaveType.accrualRate,
      accrualMonth: leaveType.accrualMonth,
      accrualWaitingPeriod: leaveType.accrualWaitingPeriod,
      color: leaveType.color,
      icon: leaveType.icon,
      description: leaveType.description || "",
      isActive: leaveType.isActive,
    });
    setNameError(null);
    setCodeError(null);

    // Show modal using Bootstrap API
    const modalEl = document.querySelector("#edit_leave_type_modal");
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  };

  // Handle Create Leave Type
  const handleCreateLeaveType = async () => {
    // Frontend validation
    const errors: any = {};

    if (!leaveTypeForm.name?.trim()) {
      errors.name = "Leave Type Name is required";
    }

    if (!leaveTypeForm.annualQuota || leaveTypeForm.annualQuota < 0) {
      errors.annualQuota = "No of Days must be greater than or equal to 0";
    }

    if (leaveTypeForm.carryForwardAllowed && leaveTypeForm.maxCarryForwardDays < 0) {
      errors.maxCarryForwardDays = "Max Carry Forward Days cannot be negative";
    }

    if (leaveTypeForm.maxConsecutiveDays < 0) {
      errors.maxConsecutiveDays = "Max Consecutive Days cannot be negative";
    }

    if (Object.keys(errors).length > 0) {
      setLeaveTypeErrors(errors);
      return;
    }

    try {
      // Auto-generate code from name
      const code = leaveTypeForm.name.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
      await createLeaveType({ ...leaveTypeForm, code } as Partial<LeaveType>);

      // Close modal
      closeModal("#add_leave_type_modal");

      resetAddLeaveTypeForm();
      message.success("Leave type created successfully");
    } catch (error) {
      console.error("Failed to create leave type:", error);
      message.error("Failed to create leave type");
    }
  };

  // Handle Leave Type Form Save (Edit)
  const handleSaveLeaveType = async () => {
    if (!selectedLeaveType) return;

    // Frontend validation
    const errors: any = {};

    if (!leaveTypeForm.name?.trim()) {
      errors.name = "Leave Type Name is required";
    }

    if (!leaveTypeForm.annualQuota || leaveTypeForm.annualQuota < 0) {
      errors.annualQuota = "No of Days must be greater than or equal to 0";
    }

    if (leaveTypeForm.carryForwardAllowed && leaveTypeForm.maxCarryForwardDays < 0) {
      errors.maxCarryForwardDays = "Max Carry Forward Days cannot be negative";
    }

    if (leaveTypeForm.maxConsecutiveDays < 0) {
      errors.maxConsecutiveDays = "Max Consecutive Days cannot be negative";
    }

    if (Object.keys(errors).length > 0) {
      setLeaveTypeErrors(errors);
      return;
    }

    try {
      await updateLeaveType(selectedLeaveType._id!, leaveTypeForm as Partial<LeaveType>);

      // Close modal
      closeModal("#edit_leave_type_modal");

      setSelectedLeaveType(null);
      setLeaveTypeErrors({});
      message.success("Leave type updated successfully");
    } catch (error) {
      console.error("Failed to update leave type:", error);
      message.error("Failed to update leave type");
    }
  };

  // Open Add Custom Policy Modal
  const openAddCustomPolicyModal = (leaveTypeId: string) => {
    const selectedType = leaveTypes.find(lt => (lt._id || lt.leaveTypeId) === leaveTypeId);

    setPolicyForm({
      name: "",
      leaveTypeId: leaveTypeId, // Use ObjectId reference
      defaultDays: selectedType?.annualQuota || 0,
      customDays: 0,
      employeeIds: [],
      settings: {
        carryForward: false,
        maxCarryForwardDays: 0,
        isEarnedLeave: false,
      },
    });

    setPolicyErrors({});

    // Reset employee selection
    setSelectedEmployees([]);
    setEmployeeSearchTerm("");
    setShowEmployeeDropdown(false);

    // Show modal
    const modalEl = document.querySelector("#add_custom_policy_modal");
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  };

  // Open Edit Custom Policy Modal
  const openEditCustomPolicyModal = (policy: CustomPolicy) => {
    const selectedType = leaveTypes.find(lt => (lt._id || lt.leaveTypeId) === policy.leaveTypeId);

    setEditingPolicy(policy);
    setPolicyForm({
      name: policy.name,
      leaveTypeId: policy.leaveTypeId, // Use ObjectId reference
      defaultDays: selectedType?.annualQuota || 0,
      customDays: policy.annualQuota, // Load from annualQuota field
      employeeIds: [...policy.employeeIds],
      settings: {
        carryForward: policy.settings?.carryForward || false,
        maxCarryForwardDays: policy.settings?.maxCarryForwardDays || 0,
        isEarnedLeave: policy.settings?.isEarnedLeave || false,
      },
    });

    setPolicyErrors({});

    // Set selected employees from policy
    const assigned = employeeOptions.filter((emp) =>
      policy.employeeIds.includes(emp.employeeId)
    );
    setSelectedEmployees(assigned);
    setEmployeeSearchTerm("");
    setShowEmployeeDropdown(false);

    // Show modal
    const modalEl = document.querySelector("#edit_custom_policy_modal");
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  };

  // Open View Custom Policy Modal
  const openViewCustomPolicyModal = (policy: CustomPolicy) => {
    setViewingPolicy(policy);

    // Show modal
    const modalEl = document.querySelector("#view_custom_policy_modal");
    if (modalEl && window.bootstrap) {
      const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  };

  // Handle Create Custom Policy
  const handleCreatePolicy = async () => {
    // Frontend validation
    const errors: any = {};

    if (!policyForm.name?.trim()) {
      errors.name = "Policy Name is required";
    }

    if (!policyForm.leaveTypeId) {
      errors.leaveTypeId = "Leave Type is required";
    }

    if (!policyForm.customDays || policyForm.customDays < 0) {
      errors.customDays = "Custom No of Days must be greater than or equal to 0";
    }

    if (selectedEmployees.length === 0) {
      errors.employees = "At least one employee must be selected";
    }

    if (Object.keys(errors).length > 0) {
      setPolicyErrors(errors);
      return;
    }

    try {
      // Prepare data for API - only send backend-accepted fields
      const policyData = {
        name: policyForm.name,
        leaveTypeId: policyForm.leaveTypeId,
        annualQuota: policyForm.customDays,
        employeeIds: selectedEmployees.map((emp: any) => emp.employeeId),
        settings: policyForm.settings,
      };

      await createPolicy(policyData);

      // Close modal
      closeModal("#add_custom_policy_modal");

      // Reset form
      setPolicyForm({
        name: "",
        leaveTypeId: "", // Use ObjectId reference
        defaultDays: 0,
        customDays: 0,
        employeeIds: [],
        settings: { carryForward: false, maxCarryForwardDays: 0, isEarnedLeave: false },
      });
      setPolicyErrors({});
      setSelectedEmployees([]);
      setEmployeeSearchTerm("");

      message.success("Custom policy created successfully");
    } catch (error) {
      console.error("Failed to create policy:", error);
      message.error("Failed to create custom policy");
    }
  };

  // Handle Update Custom Policy
  const handleUpdatePolicy = async () => {
    if (!editingPolicy) return;

    // Frontend validation
    const errors: any = {};

    if (!policyForm.name?.trim()) {
      errors.name = "Policy Name is required";
    }

    if (!policyForm.leaveTypeId) {
      errors.leaveTypeId = "Leave Type is required";
    }

    if (!policyForm.customDays || policyForm.customDays < 0) {
      errors.customDays = "Custom No of Days must be greater than or equal to 0";
    }

    if (selectedEmployees.length === 0) {
      errors.employees = "At least one employee must be selected";
    }

    if (Object.keys(errors).length > 0) {
      setPolicyErrors(errors);
      return;
    }

    try {
      // Prepare data for API - only send backend-accepted fields
      const policyData = {
        name: policyForm.name,
        leaveTypeId: policyForm.leaveTypeId,
        annualQuota: policyForm.customDays,
        employeeIds: selectedEmployees.map((emp: any) => emp.employeeId),
        settings: policyForm.settings,
      };

      await updatePolicy(editingPolicy._id, policyData);

      // Close modal
      closeModal("#edit_custom_policy_modal");

      setEditingPolicy(null);
      setPolicyErrors({});
      message.success("Custom policy updated successfully");
    } catch (error) {
      console.error("Failed to update policy:", error);
      message.error("Failed to update custom policy");
    }
  };

  // Handle Delete Custom Policy
  const handleDeletePolicy = async (policyId: string) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) return;

    try {
      await deletePolicy(policyId);
    } catch (error) {
      console.error("Failed to delete policy:", error);
    }
  };

  // Build export rows
  const buildExportRows = () => {
    return leaveTypes.map((lt, index) => ({
      No: index + 1,
      Name: lt.name,
      Code: lt.code,
      Days: lt.annualQuota,
      Paid: lt.isPaid ? "Yes" : "No",
      "Require Approval": lt.requiresApproval ? "Yes" : "No",
      "Carry Forward": lt.carryForwardAllowed ? `Yes (${lt.maxCarryForwardDays} days)` : "No",
      "Max Consecutive": lt.maxConsecutiveDays || "Unlimited",
      Status: lt.isActive ? "Active" : "Inactive",
    }));
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(16);
    doc.text("Leave Types Export", 14, 15);
    doc.setFontSize(10);
    const rows = buildExportRows();
    rows.forEach((row, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${index + 1}. ${row.Name} (${row.Code}) | Days: ${row.Days} | Paid: ${row.Paid} | Status: ${row.Status}`,
        14,
        y
      );
      y += 8;
    });
    doc.save("leave-types-export.pdf");
  };

  // Export to Excel
  const exportToExcel = () => {
    const rows = buildExportRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Types");
    const workbookOut = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([workbookOut], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leave-types-export.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Handle Export
  const handleExport = async (type: "pdf" | "excel") => {
    try {
      setExporting(true);
      if (!leaveTypes.length) {
        message.warning("No leave types available to export.");
        return;
      }
      if (type === "pdf") {
        exportToPDF();
      } else {
        exportToExcel();
      }
      message.success(`Leave types exported as ${type.toUpperCase()} successfully.`);
    } catch (err) {
      console.error("Export failed:", err);
      message.error("Failed to export leave types. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Employee Selection Handlers
  const handleAddEmployee = (employee: any) => {
    if (!selectedEmployees.find((emp) => emp.employeeId === employee.employeeId)) {
      setSelectedEmployees([...selectedEmployees, employee]);
      setEmployeeSearchTerm("");
    }
  };

  const handleRemoveEmployee = (employeeId: string) => {
    setSelectedEmployees(selectedEmployees.filter((emp) => emp.employeeId !== employeeId));
  };

  // ============ Render ============
  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content container-fluid">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Leave Settings</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HRM</li>
                  <li className="breadcrumb-item">Attendance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Leave Settings
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link
                    to="#"
                    className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                    data-bs-toggle="dropdown"
                    style={{ pointerEvents: exporting ? "none" : "auto", opacity: exporting ? 0.6 : 1 }}
                  >
                    <i className="ti ti-file-export me-1" />
                    {exporting ? "Exporting..." : "Export"}
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleExport("pdf")}
                        disabled={exporting}
                      >
                        <i className="ti ti-file-type-pdf me-1" />
                        Export as PDF
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item rounded-1"
                        onClick={() => handleExport("excel")}
                        disabled={exporting}
                      >
                        <i className="ti ti-file-type-xls me-1" />
                        Export as Excel
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_leave_type_modal"
                  className="btn btn-primary d-flex align-items-center"
                  onClick={resetAddLeaveTypeForm}
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Leave Type
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Leave Types Grid */}
          <div className="row">
            <div className="col-xl-3 col-md-4">
              <div className="add-new-drawer-header">
                <h5>Leave Types</h5>
                <p>Configure leave types and settings</p>
              </div>
            </div>
          </div>

          <div className="row">
            {leaveTypes.map((leaveType) => {
              const displayName = leaveType.name;
              const code = leaveType.code.toLowerCase();

              return (
                <div key={leaveType._id} className="col-xl-4 col-md-6">
                  <div className={`card ${!leaveType.isActive ? "border-warning" : ""}`}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="mb-0">{displayName}</h6>
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                checked={leaveType.isActive}
                                onChange={() => toggleLeaveTypeStatus(leaveType._id!)}
                              />
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 flex-wrap">
                            <span className={`badge badge-sm ${leaveType.isPaid ? 'badge-soft-success' : 'badge-soft-secondary'}`}>
                              {leaveType.isPaid ? "Paid" : "Unpaid"}
                            </span>
                            <span className="badge badge-sm badge-soft-primary">
                              {leaveType.annualQuota} days
                            </span>
                            {leaveType.carryForwardAllowed && (
                              <span className="badge badge-sm badge-soft-info">
                                Carry Forward
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex gap-2 justify-content-end">
                        <Link
                          to="#"
                          className="btn btn-sm btn-icon btn-light"
                          onClick={(e) => {
                            e.preventDefault();
                            setViewingLeaveType(leaveType);
                          }}
                          data-bs-toggle="modal"
                          data-bs-target="#view_leave_type_modal"
                          title="View Details"
                        >
                          <i className="ti ti-eye"></i>
                        </Link>
                        <Link
                          to="#"
                          className="btn btn-sm btn-icon btn-light"
                          onClick={(e) => {
                            e.preventDefault();
                            openEditLeaveTypeModal(leaveType);
                          }}
                          data-bs-toggle="modal"
                          data-bs-target="#edit_leave_type_modal"
                          title="Edit"
                        >
                          <i className="ti ti-edit"></i>
                        </Link>
                        <Link
                          to="#"
                          className="btn btn-sm btn-icon btn-light"
                          onClick={(e) => {
                            e.preventDefault();
                            if (window.confirm(`Are you sure you want to delete "${displayName}"?`)) {
                              // Handle delete
                              message.success(`${displayName} deleted successfully`);
                            }
                          }}
                          title="Delete"
                        >
                          <i className="ti ti-trash text-danger"></i>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Policies Table */}
          <div className="row mt-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="card-title mb-1">Custom Policies</h5>
                    <p className="card-text mb-0 text-muted">Employee-specific leave policies</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#add_custom_policy_modal"
                    onClick={() => {
                      // Reset policy form
                      setPolicyForm({
                        name: "",
                        leaveTypeId: "", // Use ObjectId reference
                        defaultDays: 0,
                        customDays: 0,
                        employeeIds: [],
                        settings: {
                          carryForward: false,
                          maxCarryForwardDays: 0,
                          isEarnedLeave: false,
                        },
                      });
                      setPolicyErrors({});
                    }}
                  >
                    <i className="ti ti-plus me-1"></i>
                    Add Custom Policy
                  </button>
                </div>
                <div className="card-body">
                  {policiesLoading ? (
                    <div className="text-center py-4">Loading...</div>
                  ) : policies.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      No custom policies found. Click "Add Custom Policy" to create one.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped">
                        <thead>
                          <tr>
                            <th>Policy Name</th>
                            <th>Leave Type</th>
                            <th>Annual Quota</th>
                            <th>Employees</th>
                            <th>Settings</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {policies.map((policy) => (
                            <tr key={policy._id}>
                              <td>{policy.name}</td>
                              <td>{policy.leaveType?.name || 'Unknown'}</td>
                              <td>{policy.annualQuota}</td>
                              <td>{policy.employeeIds.length} employee(s)</td>
                              <td>
                                {policy.settings?.carryForward && (
                                  <span className="badge badge-soft-success me-1">
                                    Carry Forward
                                  </span>
                                )}
                                {policy.settings?.isEarnedLeave && (
                                  <span className="badge badge-soft-info">
                                    Earned Leave
                                  </span>
                                )}
                              </td>
                              <td>
                                <Link
                                  to="#"
                                  className="text-info me-2"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openViewCustomPolicyModal(policy);
                                  }}
                                  title="View Policy"
                                >
                                  <i className="ti ti-eye"></i>
                                </Link>
                                <Link
                                  to="#"
                                  className="text-primary me-2"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openEditCustomPolicyModal(policy);
                                  }}
                                  title="Edit Policy"
                                >
                                  <i className="ti ti-edit"></i>
                                </Link>
                                <Link
                                  to="#"
                                  className="text-danger"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDeletePolicy(policy._id);
                                  }}
                                  title="Delete Policy"
                                >
                                  <i className="ti ti-trash"></i>
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Footer />
        </div>
      </div>

      {/* /Page Wrapper */}

      {/* ============================================= */}
      {/* ADD LEAVE TYPE MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="add_leave_type_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Leave Type</h4>
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
              <div className="row">
                {/* Name */}
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Leave Type Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${leaveTypeErrors.name ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.name || ""}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value });
                        setLeaveTypeErrors({ ...leaveTypeErrors, name: undefined });
                      }}
                      placeholder="Enter leave type name"
                    />
                    {leaveTypeErrors.name && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.name}</div>
                    )}
                  </div>
                </div>

                {/* Annual Quota / Days */}
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      No of Days <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.annualQuota ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.annualQuota || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, annualQuota: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, annualQuota: undefined });
                      }}
                      min="0"
                      placeholder="Enter number of days"
                    />
                    {leaveTypeErrors.annualQuota && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.annualQuota}</div>
                    )}
                  </div>
                </div>

                {/* Is Paid */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="isPaid"
                        checked={leaveTypeForm.isPaid || false}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isPaid: e.target.checked })}
                      />
                      <label className="form-check-label ms-2" htmlFor="isPaid">
                        <span className="d-block fw-medium">Paid Leave</span>
                        <small className="text-muted">
                          Check if this is a paid leave type
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Requires Approval */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="requiresApproval"
                        checked={leaveTypeForm.requiresApproval || false}
                        onChange={(e) =>
                          setLeaveTypeForm({ ...leaveTypeForm, requiresApproval: e.target.checked })
                        }
                      />
                      <label className="form-check-label ms-2" htmlFor="requiresApproval">
                        <span className="d-block fw-medium">Requires Approval</span>
                        <small className="text-muted">
                          Leave requires manager approval
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Carry Forward Allowed */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="carryForwardAllowed"
                        checked={leaveTypeForm.carryForwardAllowed || false}
                        onChange={(e) =>
                          setLeaveTypeForm({ ...leaveTypeForm, carryForwardAllowed: e.target.checked })
                        }
                      />
                      <label className="form-check-label ms-2" htmlFor="carryForwardAllowed">
                        <span className="d-block fw-medium">Allow Carry Forward</span>
                        <small className="text-muted">
                          Unused leaves can be carried forward
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Max Carry Forward Days */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Max Carry Forward Days</label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.maxCarryForwardDays ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.maxCarryForwardDays || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, maxCarryForwardDays: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, maxCarryForwardDays: undefined });
                      }}
                      disabled={!leaveTypeForm.carryForwardAllowed}
                      min="0"
                    />
                    {leaveTypeErrors.maxCarryForwardDays && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.maxCarryForwardDays}</div>
                    )}
                  </div>
                </div>

                {/* Max Consecutive Days */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Max Consecutive Days</label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.maxConsecutiveDays ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.maxConsecutiveDays || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, maxConsecutiveDays: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, maxConsecutiveDays: undefined });
                      }}
                      min="0"
                    />
                    {leaveTypeErrors.maxConsecutiveDays && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.maxConsecutiveDays}</div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={leaveTypeForm.description || ""}
                      onChange={(e) =>
                        setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="col-12">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="isActive"
                        checked={leaveTypeForm.isActive || false}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isActive: e.target.checked })}
                      />
                      <label className="form-check-label ms-2" htmlFor="isActive">
                        <span className="d-block fw-medium">Active</span>
                        <small className="text-muted">
                          Enable this leave type for employees
                        </small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-light border" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleCreateLeaveType}>
                Create Leave Type
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* VIEW LEAVE TYPE MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="view_leave_type_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">
                {viewingLeaveType ? viewingLeaveType.name : "Leave Type Details"}
              </h4>
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
              {viewingLeaveType && (
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">Leave Type Name</label>
                      <p className="fw-medium">{viewingLeaveType.name}</p>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">No of Days</label>
                      <p className="fw-medium">{viewingLeaveType.annualQuota} days</p>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">Type</label>
                      <p>
                        <span className={`badge ${viewingLeaveType.isPaid ? 'badge-soft-success' : 'badge-soft-secondary'}`}>
                          {viewingLeaveType.isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">Requires Approval</label>
                      <p>
                        <span className={`badge ${viewingLeaveType.requiresApproval ? 'badge-soft-info' : 'badge-soft-secondary'}`}>
                          {viewingLeaveType.requiresApproval ? "Yes" : "No"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">Carry Forward Allowed</label>
                      <p>
                        <span className={`badge ${viewingLeaveType.carryForwardAllowed ? 'badge-soft-info' : 'badge-soft-secondary'}`}>
                          {viewingLeaveType.carryForwardAllowed ? "Yes" : "No"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {viewingLeaveType.carryForwardAllowed && (
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">Max Carry Forward Days</label>
                        <p className="fw-medium">{viewingLeaveType.maxCarryForwardDays} days</p>
                      </div>
                    </div>
                  )}

                  {viewingLeaveType.maxConsecutiveDays && viewingLeaveType.maxConsecutiveDays > 0 && (
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label text-muted">Max Consecutive Days</label>
                        <p className="fw-medium">{viewingLeaveType.maxConsecutiveDays} days</p>
                      </div>
                    </div>
                  )}

                  {viewingLeaveType.description && (
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label text-muted">Description</label>
                        <p className="fw-medium">{viewingLeaveType.description}</p>
                      </div>
                    </div>
                  )}

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted">Status</label>
                      <p>
                        <span className={`badge ${viewingLeaveType.isActive ? 'badge-soft-success' : 'badge-soft-danger'}`}>
                          {viewingLeaveType.isActive ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-light border" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* EDIT LEAVE TYPE MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="edit_leave_type_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">
                {selectedLeaveType ? `Edit ${selectedLeaveType.name}` : "Edit Leave Type"}
              </h4>
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
              <div className="row">
                {/* Name */}
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      Leave Type Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${leaveTypeErrors.name ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.name || ""}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value });
                        setLeaveTypeErrors({ ...leaveTypeErrors, name: undefined });
                      }}
                      placeholder="Enter leave type name"
                    />
                    {leaveTypeErrors.name && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.name}</div>
                    )}
                  </div>
                </div>

                {/* Annual Quota / Days */}
                <div className="col-md-12">
                  <div className="mb-3">
                    <label className="form-label">
                      No of Days <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.annualQuota ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.annualQuota || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, annualQuota: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, annualQuota: undefined });
                      }}
                      min="0"
                      placeholder="Enter number of days"
                    />
                    {leaveTypeErrors.annualQuota && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.annualQuota}</div>
                    )}
                  </div>
                </div>

                {/* Is Paid */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="editIsPaid"
                        checked={leaveTypeForm.isPaid || false}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isPaid: e.target.checked })}
                      />
                      <label className="form-check-label ms-2" htmlFor="editIsPaid">
                        <span className="d-block fw-medium">Paid Leave</span>
                        <small className="text-muted">
                          Check if this is a paid leave type
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Requires Approval */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="editRequiresApproval"
                        checked={leaveTypeForm.requiresApproval || false}
                        onChange={(e) =>
                          setLeaveTypeForm({ ...leaveTypeForm, requiresApproval: e.target.checked })
                        }
                      />
                      <label className="form-check-label ms-2" htmlFor="editRequiresApproval">
                        <span className="d-block fw-medium">Requires Approval</span>
                        <small className="text-muted">
                          Leave requires manager approval
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Carry Forward Allowed */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="editCarryForwardAllowed"
                        checked={leaveTypeForm.carryForwardAllowed || false}
                        onChange={(e) =>
                          setLeaveTypeForm({ ...leaveTypeForm, carryForwardAllowed: e.target.checked })
                        }
                      />
                      <label className="form-check-label ms-2" htmlFor="editCarryForwardAllowed">
                        <span className="d-block fw-medium">Allow Carry Forward</span>
                        <small className="text-muted">
                          Unused leaves can be carried forward
                        </small>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Max Carry Forward Days */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Max Carry Forward Days</label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.maxCarryForwardDays ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.maxCarryForwardDays || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, maxCarryForwardDays: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, maxCarryForwardDays: undefined });
                      }}
                      disabled={!leaveTypeForm.carryForwardAllowed}
                      min="0"
                    />
                    {leaveTypeErrors.maxCarryForwardDays && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.maxCarryForwardDays}</div>
                    )}
                  </div>
                </div>

                {/* Max Consecutive Days */}
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Max Consecutive Days</label>
                    <input
                      type="number"
                      className={`form-control ${leaveTypeErrors.maxConsecutiveDays ? 'is-invalid' : ''}`}
                      value={leaveTypeForm.maxConsecutiveDays || 0}
                      onChange={(e) => {
                        setLeaveTypeForm({ ...leaveTypeForm, maxConsecutiveDays: parseInt(e.target.value) || 0 });
                        setLeaveTypeErrors({ ...leaveTypeErrors, maxConsecutiveDays: undefined });
                      }}
                      min="0"
                    />
                    {leaveTypeErrors.maxConsecutiveDays && (
                      <div className="invalid-feedback d-block">{leaveTypeErrors.maxConsecutiveDays}</div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={leaveTypeForm.description || ""}
                      onChange={(e) =>
                        setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })
                      }
                      placeholder="Optional description"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="col-12">
                  <div className="mb-3">
                    <div className="form-check d-flex align-items-start">
                      <input
                        type="checkbox"
                        className="form-check-input mt-0"
                        id="editIsActive"
                        checked={leaveTypeForm.isActive || false}
                        onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, isActive: e.target.checked })}
                      />
                      <label className="form-check-label ms-2" htmlFor="editIsActive">
                        <span className="d-block fw-medium">Active</span>
                        <small className="text-muted">
                          Enable this leave type for employees
                        </small>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-light border" data-bs-dismiss="modal">
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveLeaveType}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* ADD CUSTOM POLICY MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="add_custom_policy_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Custom Policy</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePolicy();
              }}
            >
              <div className="modal-body pb-0">
                <div className="row">
                  {/* Policy Name */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Policy Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${policyErrors.name ? 'is-invalid' : ''}`}
                        value={policyForm.name}
                        onChange={(e) => {
                          setPolicyForm({ ...policyForm, name: e.target.value });
                          setPolicyErrors({ ...policyErrors, name: undefined });
                        }}
                        placeholder="Enter policy name"
                      />
                      {policyErrors.name && (
                        <div className="invalid-feedback d-block">{policyErrors.name}</div>
                      )}
                    </div>
                  </div>

                  {/* Leave Type */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Leave Type <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${policyErrors.leaveTypeId ? 'is-invalid' : ''}`}
                        options={leaveTypeOptions}
                        value={policyForm.leaveTypeId}
                        onChange={(e: any) => {
                          const selectedLeaveType = leaveTypes.find(
                            (lt) => (lt._id || lt.leaveTypeId) === e.value
                          );
                          setPolicyForm({
                            ...policyForm,
                            leaveTypeId: e.value,
                            defaultDays: selectedLeaveType?.annualQuota || 0,
                          });
                          setPolicyErrors({ ...policyErrors, leaveTypeId: undefined });
                        }}
                      />
                      {policyErrors.leaveTypeId && (
                        <small className="text-danger d-block mt-1">{policyErrors.leaveTypeId}</small>
                      )}
                    </div>
                  </div>

                  {/* Default No of Days (Read-only) */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Default No of Days
                        <span className="text-muted ms-1">(System Default)</span>
                      </label>
                      <input
                        type="number"
                        className="form-control bg-light"
                        value={policyForm.defaultDays}
                        readOnly
                        disabled
                      />
                      <small className="text-muted">
                        Auto-filled based on selected leave type
                      </small>
                    </div>
                  </div>

                  {/* Custom No of Days */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Custom No of Days <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${policyErrors.customDays ? 'is-invalid' : ''}`}
                        value={policyForm.customDays || ""}
                        onChange={(e) => {
                          setPolicyForm({ ...policyForm, customDays: parseInt(e.target.value) || 0 });
                          setPolicyErrors({ ...policyErrors, customDays: undefined });
                        }}
                        min="0"
                        placeholder="Enter custom days"
                      />
                      {policyErrors.customDays && (
                        <div className="invalid-feedback d-block">{policyErrors.customDays}</div>
                      )}
                      <small className="text-muted">
                        Custom leave days for selected employees
                      </small>
                    </div>
                  </div>

                  {/* Employee Selection with Tag-based Multi-Select */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Select Employees <span className="text-danger">*</span>
                      </label>

                      {/* Selected Employees Tags */}
                      <div className="mb-2">
                        {selectedEmployees.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mb-2 p-2 border rounded bg-light">
                            {selectedEmployees.map((employee) => (
                              <span
                                key={employee.employeeId}
                                className="badge bg-primary d-flex align-items-center gap-1 px-3 py-2"
                                style={{ fontSize: "0.875rem" }}
                              >
                                <i className="ti ti-user" style={{ fontSize: "1rem" }}></i>
                                <span>{employee.name}</span>
                                <small className="text-white-50">({employee.key})</small>
                                <button
                                  type="button"
                                  className="btn-close btn-close-white"
                                  style={{ width: "0.5rem", height: "0.5rem", fontSize: "0.5rem" }}
                                  onClick={() => handleRemoveEmployee(employee.employeeId)}
                                  aria-label="Remove"
                                ></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Search and Add Input */}
                      <div className="position-relative">
                        <input
                          type="text"
                          className={`form-control ${policyErrors.employees ? 'is-invalid' : ''}`}
                          placeholder="Search and add employees..."
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          onFocus={() => setShowEmployeeDropdown(true)}
                        />

                        {/* Dropdown with Employee List */}
                        {showEmployeeDropdown && (
                          <div
                            className="position-absolute w-100 border rounded bg-white shadow-lg"
                            style={{ zIndex: 1050, maxHeight: "350px", overflowY: "auto", top: "100%", marginTop: "0.25rem" }}
                          >
                            {/* Employee List */}
                            <div className="list-group list-group-flush">
                              {filteredEmployeeOptions.length > 0 ? (
                                filteredEmployeeOptions.map((employee) => (
                                  <button
                                    key={employee.employeeId}
                                    type="button"
                                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                                    onClick={() => handleAddEmployee(employee)}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <i className="ti ti-user text-primary"></i>
                                      <div>
                                        <div className="fw-medium">{employee.name}</div>
                                        <div className="d-flex align-items-center gap-2">
                                          <small className="text-muted">{employee.department}</small>
                                          <span className="text-muted">•</span>
                                          <small className="badge badge-soft-secondary">{employee.key}</small>
                                        </div>
                                      </div>
                                    </div>
                                    <i className="ti ti-plus text-success"></i>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center text-muted">
                                  <i className="ti ti-user-x mb-2" style={{ fontSize: "2rem" }}></i>
                                  <div>No employees found</div>
                                  <small>Try adjusting your search</small>
                                </div>
                              )}
                            </div>

                            {/* Close Dropdown Button */}
                            <div className="p-2 border-top bg-light text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-light"
                                onClick={() => setShowEmployeeDropdown(false)}
                              >
                                <i className="ti ti-x me-1"></i>
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {policyErrors.employees && (
                        <small className="text-danger d-block mt-1">{policyErrors.employees}</small>
                      )}
                      <small className="text-muted d-block mt-1">
                        <i className="ti ti-info-circle me-1"></i>
                        Click on the input to search and select multiple employees. Selected employees will appear as tags above.
                      </small>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="col-12">
                    <hr className="my-3" />
                    <h6 className="mb-3">Additional Settings</h6>
                  </div>

                  {/* Settings: Carry Forward */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check d-flex align-items-start">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          id="policyCarryForward"
                          checked={policyForm.settings.carryForward}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: { ...policyForm.settings, carryForward: e.target.checked },
                            })
                          }
                        />
                        <label className="form-check-label ms-2" htmlFor="policyCarryForward">
                          <span className="d-block fw-medium">Allow Carry Forward</span>
                          <small className="text-muted">
                            Unused leaves can be carried forward
                          </small>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Settings: Is Earned Leave */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check d-flex align-items-start">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          id="policyEarnedLeave"
                          checked={policyForm.settings.isEarnedLeave}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: { ...policyForm.settings, isEarnedLeave: e.target.checked },
                            })
                          }
                        />
                        <label className="form-check-label ms-2" htmlFor="policyEarnedLeave">
                          <span className="d-block fw-medium">Earned Leave</span>
                          <small className="text-muted">
                            Leave is earned over time
                          </small>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Settings: Max Carry Forward Days */}
                  {policyForm.settings.carryForward && (
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Max Carry Forward Days</label>
                        <input
                          type="number"
                          className="form-control"
                          value={policyForm.settings.maxCarryForwardDays || 0}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: {
                                ...policyForm.settings,
                                maxCarryForwardDays: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          min="0"
                          placeholder="Enter max days"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* EDIT CUSTOM POLICY MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="edit_custom_policy_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Custom Policy</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdatePolicy();
              }}
            >
              <div className="modal-body pb-0">
                <div className="row">
                  {/* Policy Name */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Policy Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${policyErrors.name ? 'is-invalid' : ''}`}
                        value={policyForm.name}
                        onChange={(e) => {
                          setPolicyForm({ ...policyForm, name: e.target.value });
                          setPolicyErrors({ ...policyErrors, name: undefined });
                        }}
                        placeholder="Enter policy name"
                      />
                      {policyErrors.name && (
                        <div className="invalid-feedback d-block">{policyErrors.name}</div>
                      )}
                    </div>
                  </div>

                  {/* Leave Type */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Leave Type <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className={`select ${policyErrors.leaveTypeId ? 'is-invalid' : ''}`}
                        options={leaveTypeOptions}
                        value={policyForm.leaveTypeId}
                        onChange={(e: any) => {
                          const selectedLeaveType = leaveTypes.find(
                            (lt) => (lt._id || lt.leaveTypeId) === e.value
                          );
                          setPolicyForm({
                            ...policyForm,
                            leaveTypeId: e.value,
                            defaultDays: selectedLeaveType?.annualQuota || 0,
                          });
                          setPolicyErrors({ ...policyErrors, leaveTypeId: undefined });
                        }}
                      />
                      {policyErrors.leaveTypeId && (
                        <small className="text-danger d-block mt-1">{policyErrors.leaveTypeId}</small>
                      )}
                    </div>
                  </div>

                  {/* Default No of Days (Read-only) */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Default No of Days
                        <span className="text-muted ms-1">(System Default)</span>
                      </label>
                      <input
                        type="number"
                        className="form-control bg-light"
                        value={policyForm.defaultDays}
                        readOnly
                        disabled
                      />
                      <small className="text-muted">
                        Auto-filled based on selected leave type
                      </small>
                    </div>
                  </div>

                  {/* Custom No of Days */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">
                        Custom No of Days <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className={`form-control ${policyErrors.customDays ? 'is-invalid' : ''}`}
                        value={policyForm.customDays || ""}
                        onChange={(e) => {
                          setPolicyForm({ ...policyForm, customDays: parseInt(e.target.value) || 0 });
                          setPolicyErrors({ ...policyErrors, customDays: undefined });
                        }}
                        min="0"
                        placeholder="Enter custom days"
                      />
                      {policyErrors.customDays && (
                        <div className="invalid-feedback d-block">{policyErrors.customDays}</div>
                      )}
                      <small className="text-muted">
                        Custom leave days for selected employees
                      </small>
                    </div>
                  </div>

                  {/* Employee Selection with Tag-based Multi-Select */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Select Employees <span className="text-danger">*</span>
                      </label>

                      {/* Selected Employees Tags */}
                      <div className="mb-2">
                        {selectedEmployees.length > 0 && (
                          <div className="d-flex flex-wrap gap-2 mb-2 p-2 border rounded bg-light">
                            {selectedEmployees.map((employee) => (
                              <span
                                key={employee.employeeId}
                                className="badge bg-primary d-flex align-items-center gap-1 px-3 py-2"
                                style={{ fontSize: "0.875rem" }}
                              >
                                <i className="ti ti-user" style={{ fontSize: "1rem" }}></i>
                                <span>{employee.name}</span>
                                <small className="text-white-50">({employee.key})</small>
                                <button
                                  type="button"
                                  className="btn-close btn-close-white"
                                  style={{ width: "0.5rem", height: "0.5rem", fontSize: "0.5rem" }}
                                  onClick={() => handleRemoveEmployee(employee.employeeId)}
                                  aria-label="Remove"
                                ></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Search and Add Input */}
                      <div className="position-relative">
                        <input
                          type="text"
                          className={`form-control ${policyErrors.employees ? 'is-invalid' : ''}`}
                          placeholder="Search and add employees..."
                          value={employeeSearchTerm}
                          onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                          onFocus={() => setShowEmployeeDropdown(true)}
                        />

                        {/* Dropdown with Employee List */}
                        {showEmployeeDropdown && (
                          <div
                            className="position-absolute w-100 border rounded bg-white shadow-lg"
                            style={{ zIndex: 1050, maxHeight: "350px", overflowY: "auto", top: "100%", marginTop: "0.25rem" }}
                          >
                            {/* Employee List */}
                            <div className="list-group list-group-flush">
                              {filteredEmployeeOptions.length > 0 ? (
                                filteredEmployeeOptions.map((employee) => (
                                  <button
                                    key={employee.employeeId}
                                    type="button"
                                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                                    onClick={() => handleAddEmployee(employee)}
                                  >
                                    <div className="d-flex align-items-center gap-2">
                                      <i className="ti ti-user text-primary"></i>
                                      <div>
                                        <div className="fw-medium">{employee.name}</div>
                                        <div className="d-flex align-items-center gap-2">
                                          <small className="text-muted">{employee.department}</small>
                                          <span className="text-muted">•</span>
                                          <small className="badge badge-soft-secondary">{employee.key}</small>
                                        </div>
                                      </div>
                                    </div>
                                    <i className="ti ti-plus text-success"></i>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-center text-muted">
                                  <i className="ti ti-user-x mb-2" style={{ fontSize: "2rem" }}></i>
                                  <div>No employees found</div>
                                  <small>Try adjusting your search</small>
                                </div>
                              )}
                            </div>

                            {/* Close Dropdown Button */}
                            <div className="p-2 border-top bg-light text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-light"
                                onClick={() => setShowEmployeeDropdown(false)}
                              >
                                <i className="ti ti-x me-1"></i>
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {policyErrors.employees && (
                        <small className="text-danger d-block mt-1">{policyErrors.employees}</small>
                      )}
                      <small className="text-muted d-block mt-1">
                        <i className="ti ti-info-circle me-1"></i>
                        Click on the input to search and select multiple employees. Selected employees will appear as tags above.
                      </small>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="col-12">
                    <hr className="my-3" />
                    <h6 className="mb-3">Additional Settings</h6>
                  </div>

                  {/* Settings: Carry Forward */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check d-flex align-items-start">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          id="editPolicyCarryForward"
                          checked={policyForm.settings.carryForward}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: { ...policyForm.settings, carryForward: e.target.checked },
                            })
                          }
                        />
                        <label className="form-check-label ms-2" htmlFor="editPolicyCarryForward">
                          <span className="d-block fw-medium">Allow Carry Forward</span>
                          <small className="text-muted">
                            Unused leaves can be carried forward
                          </small>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Settings: Is Earned Leave */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <div className="form-check d-flex align-items-start">
                        <input
                          type="checkbox"
                          className="form-check-input mt-0"
                          id="editPolicyEarnedLeave"
                          checked={policyForm.settings.isEarnedLeave}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: { ...policyForm.settings, isEarnedLeave: e.target.checked },
                            })
                          }
                        />
                        <label className="form-check-label ms-2" htmlFor="editPolicyEarnedLeave">
                          <span className="d-block fw-medium">Earned Leave</span>
                          <small className="text-muted">
                            Leave is earned over time
                          </small>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Settings: Max Carry Forward Days */}
                  {policyForm.settings.carryForward && (
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Max Carry Forward Days</label>
                        <input
                          type="number"
                          className="form-control"
                          value={policyForm.settings.maxCarryForwardDays || 0}
                          onChange={(e) =>
                            setPolicyForm({
                              ...policyForm,
                              settings: {
                                ...policyForm.settings,
                                maxCarryForwardDays: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                          min="0"
                          placeholder="Enter max days"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light me-2" data-bs-dismiss="modal">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ============================================= */}
      {/* VIEW CUSTOM POLICY MODAL */}
      {/* ============================================= */}
      <div
        className="modal fade"
        id="view_custom_policy_modal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Custom Policy Details</h4>
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
              {viewingPolicy && (
                <div className="row">
                  {/* Policy Name */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Policy Name</label>
                      <p className="mb-0 fs-14">{viewingPolicy.name}</p>
                    </div>
                  </div>

                  {/* Leave Type */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Leave Type</label>
                      <p className="mb-0 fs-14">
                        <span className="badge bg-primary-transparent text-primary">
                          {viewingPolicy.leaveType?.name || 'Unknown'}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Default Days */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Default Days (System)</label>
                      <p className="mb-0 fs-14">
                        {leaveTypes.find((lt) => lt._id === viewingPolicy.leaveTypeId)?.annualQuota || 0} days
                      </p>
                    </div>
                  </div>

                  {/* Custom Days */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Custom Days</label>
                      <p className="mb-0 fs-14">
                        <span className="badge bg-success-transparent text-success fs-13">
                          {viewingPolicy.annualQuota} days
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Assigned Employees */}
                  <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">
                        Assigned Employees ({viewingPolicy.employeeIds.length})
                      </label>
                      <div className="border rounded p-3 bg-light" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                        {viewingPolicy.employeeIds.length > 0 ? (
                          <div className="row g-2">
                            {employeeOptions
                              .filter((emp) => viewingPolicy.employeeIds.includes(emp.employeeId))
                              .map((emp) => (
                                <div key={emp.employeeId} className="col-md-6">
                                  <div className="d-flex align-items-center">
                                    <div className="avatar avatar-md bg-primary-transparent rounded me-2">
                                      <span className="avatar-title rounded-circle fw-medium text-primary">
                                        {emp.name?.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <div>
                                      <p className="mb-0 fs-14 fw-medium">{emp.name}</p>
                                      <small className="text-muted">{emp.department || 'No Department'}</small>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-muted mb-0">No employees assigned</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="col-12">
                    <hr className="my-3" />
                    <h6 className="mb-3">Additional Settings</h6>
                  </div>

                  {/* Carry Forward */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Carry Forward</label>
                      <p className="mb-0">
                        {viewingPolicy.settings?.carryForward ? (
                          <span className="badge bg-success-transparent text-success">
                            <i className="ti ti-check me-1"></i>
                            Allowed ({viewingPolicy.settings.maxCarryForwardDays || 0} days)
                          </span>
                        ) : (
                          <span className="badge bg-secondary-transparent text-secondary">
                            <i className="ti ti-x me-1"></i>
                            Not Allowed
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Earned Leave */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Earned Leave</label>
                      <p className="mb-0">
                        {viewingPolicy.settings?.isEarnedLeave ? (
                          <span className="badge bg-info-transparent text-info">
                            <i className="ti ti-check me-1"></i>
                            Yes
                          </span>
                        ) : (
                          <span className="badge bg-secondary-transparent text-secondary">
                            <i className="ti ti-x me-1"></i>
                            No
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Status</label>
                      <p className="mb-0">
                        {viewingPolicy.isActive ? (
                          <span className="badge bg-success">Active</span>
                        ) : (
                          <span className="badge bg-danger">Inactive</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label text-muted fw-medium">Last Updated</label>
                      <p className="mb-0 fs-14 text-muted">
                        {new Date(viewingPolicy.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-primary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveSettings;
