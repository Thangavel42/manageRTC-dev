import { DatePicker } from "antd";
import { format, parse } from "date-fns";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import Table from "../../core/common/dataTable/index";
import EmployeeNameCell from "../../core/common/EmployeeNameCell";
import ResignationDetailsModal from "../../core/modals/ResignationDetailsModal";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";
// REST API Hooks
import { useDepartmentsREST } from "../../hooks/useDepartmentsREST";
import { useEmployeesREST } from "../../hooks/useEmployeesREST";
import { useProfileRest } from "../../hooks/useProfileRest";
import { useResignationsREST, type Resignation as APIResignation } from "../../hooks/useResignationsREST";

type ResignationRow = {
  employeeName: string;
  employeeId: string;
  employee_id?: string; // Database ID for navigation
  employeeImage?: string;
  department: string;
  departmentId: string;
  designation?: string;
  reason: string;
  noticeDate: string;
  resignationDate: string; // already formatted by backend like "12 Sep 2025"
  resignationId: string;
  status: string; // Required for Resignation type compatibility
  resignationStatus?: 'pending' | 'on_notice' | 'rejected' | 'resigned' | 'withdrawn'; // Workflow status
  reportingManagerId?: string;
  reportingManagerName?: string;
  effectiveDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
};

type ResignationStats = {
  total: number;
  pending: number;
  onNotice: number;
  resigned: number;
};

const Resignation = () => {
  const socket = useSocket() as Socket | null;

  // REST API Hooks for Resignations
  const {
    resignations: apiResignations,
    stats: apiStats,
    fetchResignations,
    fetchResignationStats,
    createResignation,
    updateResignation,
    deleteResignations,
    approveResignation,
    rejectResignation
  } = useResignationsREST();

  // REST API Hooks for Departments and Employees
  const { departments: apiDepartments, fetchDepartments } = useDepartmentsREST();
  const { employees: apiEmployees, fetchEmployees, getEmployeeById, fetchReportingManagerOptions } = useEmployeesREST();
  const { currentUserProfile, fetchCurrentUserProfile } = useProfileRest();

  const [rows, setRows] = useState<ResignationRow[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);
  const [reportingManagerOptions, setReportingManagerOptions] = useState<{ value: string; label: string }[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [reportingManagerLoading, setReportingManagerLoading] = useState<boolean>(false);
  const reportingManagerSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stats, setStats] = useState<ResignationStats>({
    total: 0,
    pending: 0,
    onNotice: 0,
    resigned: 0,
  });
  const [deletingResignationId, setDeletingResignationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>("thisyear");
  const [customRange, setCustomRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEmployeeQuery, setFilterEmployeeQuery] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<{ start?: string; end?: string }>({});
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const userRole = currentUserProfile?.role?.toLowerCase();
  const isEmployeeRole = userRole === "employee";
  const isManagerRole = userRole === "manager";
  const isHrRole = userRole === "hr";
  const isAdminRole = userRole === "admin" || userRole === "superadmin";
  const canAddResignation = isEmployeeRole || isHrRole || isAdminRole;

  // State for viewing resignation details - use API type
  const [viewingResignation, setViewingResignation] = useState<APIResignation | null>(null);

  // Add Resignation form state - declare early before useCallbacks
  const [addForm, setAddForm] = useState({
    employeeId: "",
    departmentId: "",
    reportingManagerId: "",
    reason: "",
    noticeDate: "", // YYYY-MM-DD from DatePicker
    resignationDate: "",
  });

  // Validation errors for Add Resignation
  const [addErrors, setAddErrors] = useState({
    departmentId: "",
    employeeId: "",
    reportingManagerId: "",
    reason: "",
    noticeDate: "",
    resignationDate: "",
  });

  // Controlled edit form data
  const [editForm, setEditForm] = useState({
    employeeId: "",
    departmentId: "",
    reportingManagerId: "",
    noticeDate: "", // "DD-MM-YYYY" shown in modal
    reason: "",
    resignationDate: "", // "DD-MM-YYYY" shown in modal
    resignationId: "",
  });

  const loadDepartmentList = useCallback(async () => {
    console.log('[Resignation] Loading departments');
    await fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchCurrentUserProfile();
  }, [fetchCurrentUserProfile]);

  useEffect(() => {
    const loadCurrentEmployee = async () => {
      if (!currentUserProfile?._id) return;
      const employee = await getEmployeeById(currentUserProfile._id);
      if (employee) {
        setCurrentEmployee(employee as any);
      }
    };

    loadCurrentEmployee();
  }, [currentUserProfile?._id, getEmployeeById]);

  const loadEmployeesByDepartment = useCallback(async (departmentId: string) => {
    if (!departmentId) {
      console.log("loadEmployeesByDepartment - departmentId missing", { departmentId });
      setEmployeeOptions([]);
      return;
    }
    console.log("Fetching employees by department via REST API:", departmentId);
    await fetchEmployees({ departmentId });
  }, [fetchEmployees]);

  const loadReportingManagers = useCallback(async (params?: { search?: string; departmentId?: string; employeeId?: string }) => {
    setReportingManagerLoading(true);
    const excludeEmployeeId = params?.employeeId || addForm.employeeId || currentEmployee?._id || "";
    const departmentId = params?.departmentId || addForm.departmentId || currentEmployee?.departmentId || "";
    const results = await fetchReportingManagerOptions({
      search: params?.search || "",
      limit: 10,
      department: departmentId || undefined,
      excludeEmployeeId: excludeEmployeeId || undefined,
    });

    const options = results.map((emp) => ({
      value: emp.id,
      label: `${emp.employeeId} - ${emp.name}`
    }));

    setReportingManagerOptions(options);
    setReportingManagerLoading(false);
  }, [addForm.employeeId, addForm.departmentId, currentEmployee?._id, currentEmployee?.departmentId, fetchReportingManagerOptions]);

  const openEditModal = (row: any) => {
    console.log("[Resignation] openEditModal - row:", row);
    setEditForm({
      employeeId: row.employee_id || "", // Use employee_id (ObjectId), not employeeId string
      departmentId: row.departmentId || "",
      reportingManagerId: row.reportingManagerId || "",
      noticeDate: row.noticeDate
        ? format(parse(row.noticeDate, "yyyy-MM-dd", new Date()), "dd-MM-yyyy")
        : "",
      reason: row.reason || "",
      resignationDate: row.resignationDate
        ? format(
            parse(row.resignationDate, "yyyy-MM-dd", new Date()),
            "dd-MM-yyyy"
          )
        : "",
      resignationId: row.resignationId,
    });
    // Fetch employees for the selected department
    if (row.departmentId) {
      loadEmployeesByDepartment(row.departmentId);
      loadReportingManagers({ departmentId: row.departmentId, employeeId: row.employee_id || row.employeeId });
    }
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  // Validation errors for Edit Resignation
  const [editErrors, setEditErrors] = useState({
    departmentId: "",
    employeeId: "",
    reportingManagerId: "",
    reason: "",
    noticeDate: "",
    resignationDate: "",
  });


  // Handle opening Add modal - reset form
  const handleAddModalOpen = () => {
    console.log("[Resignation] handleAddModalOpen - Resetting Add form");
    const baseForm = {
      employeeId: "",
      departmentId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    };

    if (isEmployeeRole && currentEmployee) {
      baseForm.employeeId = currentEmployee._id || "";
      baseForm.departmentId = currentEmployee.departmentId || "";
      baseForm.reportingManagerId = currentEmployee.reportingTo || currentUserProfile?.reportingManager?._id || "";
      setEmployeeOptions([
        {
          value: currentEmployee._id,
          label: `${currentEmployee.employeeId || ""} - ${currentEmployee.firstName || ""} ${currentEmployee.lastName || ""}`.trim(),
        },
      ]);
      if (currentEmployee.departmentId) {
        loadEmployeesByDepartment(currentEmployee.departmentId);
      }
      if (baseForm.departmentId) {
        loadReportingManagers({ departmentId: baseForm.departmentId, employeeId: baseForm.employeeId });
      }
    }

    setAddForm(baseForm);
    setAddErrors({
      departmentId: "",
      employeeId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    });
    if (!isEmployeeRole) {
      setEmployeeOptions([]);
      setReportingManagerOptions([]);
    }
    setIsSubmitting(false); // Reset loading state
  };

  // Handle closing Add modal - reset form state
  const handleAddModalClose = () => {
    console.log("[Resignation] handleAddModalClose - Cleaning up Add modal state");
    setAddForm({
      employeeId: "",
      departmentId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    });
    setAddErrors({
      departmentId: "",
      employeeId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    });
    setEmployeeOptions([]);
    setReportingManagerOptions([]);
    setIsSubmitting(false);
  };

  // Handle closing Edit modal - reset form state
  const handleEditModalClose = () => {
    console.log("[Resignation] handleEditModalClose - Cleaning up Edit modal state");
    setEditForm({
      employeeId: "",
      departmentId: "",
      reportingManagerId: "",
      noticeDate: "",
      reason: "",
      resignationDate: "",
      resignationId: "",
    });
    setEditErrors({
      departmentId: "",
      employeeId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    });
    setEmployeeOptions([]);
    setReportingManagerOptions([]);
    setIsSubmitting(false);
  };

  // Handle delete resignation
  const handleDeleteClick = (resignationId: string) => {
    console.log("[Resignation] Delete clicked:", resignationId);
    setDeletingResignationId(resignationId);
  };

  const confirmDelete = async () => {
    if (!deletingResignationId) {
      toast.error("No resignation selected");
      return;
    }

    const record = rows.find(r => r.resignationId === deletingResignationId);
    if (record?.resignationStatus && record.resignationStatus !== "pending") {
      toast.error("Only pending resignations can be deleted");
      return;
    }

    console.log("[Resignation] Deleting resignation via REST API:", deletingResignationId);
    await deleteResignations([deletingResignationId]);
  };

  const fmtYMD = (s?: string) => {
    if (!s) return "";
    const d = parse(s, "yyyy-MM-dd", new Date());
    return isNaN(d.getTime()) ? s : format(d, "dd MMM yyyy");
  };

  // Calculate stats from current resignation data
  const calculateStats = useCallback(() => {
    if (rows.length > 0) {
      const calculatedStats: ResignationStats = {
        total: rows.length,
        pending: rows.filter(r => r.resignationStatus === 'pending').length,
        onNotice: rows.filter(r => r.resignationStatus === 'on_notice').length,
        resigned: rows.filter(r => r.resignationStatus === 'resigned').length,
      };
      setStats(calculatedStats);
    }
  }, [rows]);

  // fetchers (using REST API)
  const fetchList = useCallback(
    async (type: string, range?: { startDate?: string; endDate?: string }) => {
      const filters: any = {};
      if (type === "thismonth") {
        filters.period = "thismonth";
      } else if (type === "thisyear") {
        filters.period = "thisyear";
      } else if (type === "custom" && range?.startDate && range?.endDate) {
        filters.startDate = range.startDate;
        filters.endDate = range.endDate;
      }
      await fetchResignations(filters);
    },
    [fetchResignations]
  );

  // Stats fetcher
  const fetchStats = useCallback(async () => {
    try {
      const stats = await fetchResignationStats();
      // Only update stats if we got valid data
      if (stats) {
        setStats(stats as any);
      }
    } catch (error) {
      console.error('[Resignation] Failed to fetch stats:', error);
    }
  }, [fetchResignationStats]);

  // register socket listeners and join room (using REST API + Socket.IO for broadcasts)
  useEffect(() => {
    if (!socket) return;

    // Join HR room for Socket.IO broadcasts
    socket.emit("join-room", "hr_room");

    // Real-time broadcast listeners (KEEP - for real-time updates from backend)
    const handleResignationCreated = (data: any) => {
      console.log("[Resignation] Real-time: Resignation created");
      fetchList(filterType, customRange);
      fetchResignationStats();
    };
    const handleResignationUpdated = (data: any) => {
      console.log("[Resignation] Real-time: Resignation updated");
      fetchList(filterType, customRange);
      fetchResignationStats();
    };
    const handleResignationDeleted = (data: any) => {
      console.log("[Resignation] Real-time: Resignation deleted");
      fetchList(filterType, customRange);
      fetchResignationStats();
    };

    // Only set up socket listeners if socket is available
    if (socket) {
      socket.on("resignation:created", handleResignationCreated);
      socket.on("resignation:updated", handleResignationUpdated);
      socket.on("resignation:deleted", handleResignationDeleted);
    }

    return () => {
      if (socket) {
        socket.off("resignation:created", handleResignationCreated);
        socket.off("resignation:updated", handleResignationUpdated);
        socket.off("resignation:deleted", handleResignationDeleted);
      }
    };
  }, [socket, filterType, customRange, fetchList, fetchResignationStats]);

  // Sync local state with REST API state
  useEffect(() => {
    const transformedResignations: ResignationRow[] = apiResignations.map(resignation => {
      const statusValue = resignation.resignationStatus as string | undefined;
      const normalizedStatus = (statusValue === 'approved' ? 'on_notice' : statusValue) as ResignationRow['resignationStatus'];
      return {
      ...resignation,
      employeeName: resignation.employeeName || 'Unknown',
      department: resignation.department || '',
      departmentId: resignation.departmentId || '',
      resignationId: resignation.resignationId || resignation._id || '',
      employeeId: resignation.employeeId || '',
      reason: resignation.reason || '',
      noticeDate: resignation.noticeDate || '',
      resignationDate: resignation.resignationDate || '',
      status: resignation.status || normalizedStatus || 'pending',
      resignationStatus: normalizedStatus,
      reportingManagerId: resignation.reportingManagerId || '',
      reportingManagerName: resignation.reportingManagerName || '',
    };
    });

    setRows(transformedResignations);
    // Only update stats if apiStats is not null, otherwise keep default values
    if (apiStats) {
      setStats({
        total: Number(apiStats.totalResignations || 0),
        pending: Number(apiStats.pending || 0),
        onNotice: Number(apiStats.onNotice || 0),
        resigned: Number(apiStats.resigned || 0),
      });
    }
  }, [apiResignations, apiStats]);

  // Sync departments to dropdown options
  useEffect(() => {
    if (apiDepartments && apiDepartments.length > 0) {
      const options = apiDepartments.map(dept => ({
        value: dept._id,
        label: dept.department
      }));
      setDepartmentOptions(options);
      console.log('[Resignation] Department options updated:', options.length);
    }
  }, [apiDepartments]);

  // Sync employees to dropdown options
  useEffect(() => {
    if (apiEmployees && apiEmployees.length > 0) {
      const options = apiEmployees.map(emp => ({
        value: emp._id,
        label: `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`
      }));
      setEmployeeOptions(options);
      setReportingManagerOptions(options);
      console.log('[Resignation] Employee options updated:', options.length);
    }
  }, [apiEmployees]);

  const parseDDMMYYYY = (value?: string) => {
    if (!value) return null;
    const parsed = parse(value, "dd-MM-yyyy", new Date());
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const resolveReportingManagerId = (employeeId?: string) => {
    if (!employeeId) return "";
    const match = apiEmployees.find(emp => emp._id === employeeId);
    return match?.reportingTo || currentUserProfile?.reportingManager?._id || "";
  };

  const handleAddSave = async () => {
    console.log("[Resignation] handleAddSave called");

    // Validate form first
    if (!validateAddForm()) {
      console.log("[Resignation] Validation failed");
      return;
    }

    if (isSubmitting) return;

    const payload = {
      employeeId: addForm.employeeId || currentEmployee?._id || "",
      departmentId: addForm.departmentId || currentEmployee?.departmentId || "",
      reportingManagerId: addForm.reportingManagerId || currentEmployee?.reportingTo || currentUserProfile?.reportingManager?._id || "",
      noticeDate: addForm.noticeDate,
      reason: addForm.reason,
      resignationDate: addForm.resignationDate,
    };

    console.log("[Resignation] Creating resignation via REST API:", payload);
    setIsSubmitting(true);
    const success = await createResignation(payload);
    setIsSubmitting(false);

    if (success) {
      console.log("[Resignation] Creation successful - closing modal and refreshing list");
      // Close the modal
      const modalElement = document.getElementById("new_resignation");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement) || new (window as any).bootstrap.Modal(modalElement);
        modal.hide();
      }
      // Refresh the resignation list
      await fetchList(filterType, customRange);
      await fetchStats();
      // Reset the form
      handleAddModalClose();
    }
  };

  const handleEditSave = async () => {
    console.log("[Resignation] handleEditSave called");

    // Validate form first
    if (!validateEditForm()) {
      console.log("[Resignation] Validation failed");
      return;
    }

    if (isSubmitting) return;

    const updateData = {
      employeeId: editForm.employeeId,
      departmentId: editForm.departmentId,
      reportingManagerId: editForm.reportingManagerId,
      noticeDate: editForm.noticeDate,
      reason: editForm.reason,
      resignationDate: editForm.resignationDate,
    };

    console.log("[Resignation] Updating resignation via REST API:", editForm.resignationId, updateData);
    setIsSubmitting(true);
    const success = await updateResignation(editForm.resignationId, updateData);
    setIsSubmitting(false);

    if (success) {
      console.log("[Resignation] Update successful - closing modal and refreshing list");
      // Close the modal
      const modalElement = document.getElementById("edit_resignation");
      if (modalElement) {
        const modal = (window as any).bootstrap?.Modal?.getInstance(modalElement) || new (window as any).bootstrap.Modal(modalElement);
        modal.hide();
      }
      // Refresh the resignation list
      await fetchList(filterType, customRange);
      await fetchStats();
      // Reset the form
      handleEditModalClose();
    }
  };

  // initial + reactive fetch
  useEffect(() => {
    if (!socket) return;
    fetchList(filterType, customRange);
    fetchStats();
    loadDepartmentList(); // Fetch departments on mount
  }, [socket, fetchList, fetchStats, filterType, customRange, loadDepartmentList]);

  // Calculate stats when resignation data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Add Bootstrap modal event listeners for cleanup
  useEffect(() => {
    const addModalElement = document.getElementById("new_resignation");
    const editModalElement = document.getElementById("edit_resignation");
    const deleteModalElement = document.getElementById("delete_modal");

    // Add modal - cleanup on hide
    const handleAddModalHide = () => {
      handleAddModalClose();
    };

    // Edit modal - cleanup on hide
    const handleEditModalHide = () => {
      handleEditModalClose();
    };

    // Delete modal - cleanup on hide
    const handleDeleteModalHide = () => {
      console.log("[Resignation] Delete modal hidden - clearing state");
      setDeletingResignationId(null);
    };

    if (addModalElement) {
      addModalElement.addEventListener('hidden.bs.modal', handleAddModalHide);
    }

    if (editModalElement) {
      editModalElement.addEventListener('hidden.bs.modal', handleEditModalHide);
    }

    if (deleteModalElement) {
      deleteModalElement.addEventListener('hidden.bs.modal', handleDeleteModalHide);
    }

    // Cleanup event listeners on unmount
    return () => {
      if (addModalElement) {
        addModalElement.removeEventListener('hidden.bs.modal', handleAddModalHide);
      }
      if (editModalElement) {
        editModalElement.removeEventListener('hidden.bs.modal', handleEditModalHide);
      }
      if (deleteModalElement) {
        deleteModalElement.removeEventListener('hidden.bs.modal', handleDeleteModalHide);
      }
    };
  }, []);

  // ui events
  type Option = { value: string; label: string };
  const handleFilterChange = (opt: Option | null) => {
    const value = opt?.value ?? "alltime";
    setFilterType(value);
    if (value !== "custom") {
      setCustomRange({});
      fetchList(value);
    }
  };

  const handleDepartmentFilterChange = (opt: any) => {
    setFilterDepartmentId(opt?.value || "");
  };

  const handleStatusFilterChange = (opt: any) => {
    setFilterStatus(opt?.value || "");
  };

  const handleEmployeeFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterEmployeeQuery(e.target.value);
  };

  const handleDateRangeFilterChange = (_: any, dateStrings: [string, string]) => {
    if (dateStrings && dateStrings[0] && dateStrings[1]) {
      setFilterDateRange({ start: dateStrings[0], end: dateStrings[1] });
    } else {
      setFilterDateRange({});
    }
  };

  const handleSortOrderChange = (opt: any) => {
    setSortOrder((opt?.value as "asc" | "desc") || "desc");
  };

  const handleAddDepartmentChange = (opt: any) => {
    console.log("Add department selected - _id:", opt?.value);
    setAddForm({
      ...addForm,
      departmentId: opt?.value || "",
      employeeId: "",
      reportingManagerId: "",
    });
    // Clear department and dependent field errors
    setAddErrors(prev => ({ ...prev, departmentId: "", employeeId: "", reportingManagerId: "" }));
    if (opt?.value) {
      loadEmployeesByDepartment(opt.value);
      loadReportingManagers({ departmentId: opt.value });
    }
  };

  const handleAddEmployeeChange = (opt: any) => {
    console.log("[Resignation] Add employee selected - id:", opt?.value);
    const reportingManagerId = resolveReportingManagerId(opt?.value);
    if (reportingManagerId && !reportingManagerOptions.find(item => item.value === reportingManagerId)) {
      setReportingManagerOptions(prev => [
        ...prev,
        { value: reportingManagerId, label: "Assigned Manager" }
      ]);
    }
    setAddForm({
      ...addForm,
      employeeId: opt?.value || "",
      reportingManagerId,
    });
    // Clear employee error initially
    setAddErrors(prev => ({ ...prev, employeeId: "", reportingManagerId: "" }));
    loadReportingManagers({ departmentId: addForm.departmentId, employeeId: opt?.value || "" });
  };

  const handleEditDepartmentChange = (opt: any) => {
    console.log("Edit department selected - _id:", opt?.value);
    setEditForm({
      ...editForm,
      departmentId: opt?.value || "",
      employeeId: "",
      reportingManagerId: "",
    });
    // Clear department and dependent field errors
    setEditErrors(prev => ({ ...prev, departmentId: "", employeeId: "", reportingManagerId: "" }));
    if (opt?.value) {
      loadEmployeesByDepartment(opt.value);
      loadReportingManagers({ departmentId: opt.value });
    }
  };

  const handleEditEmployeeChange = (opt: any) => {
    console.log("[Resignation] Edit employee selected - id:", opt?.value);
    const reportingManagerId = resolveReportingManagerId(opt?.value);
    if (reportingManagerId && !reportingManagerOptions.find(item => item.value === reportingManagerId)) {
      setReportingManagerOptions(prev => [
        ...prev,
        { value: reportingManagerId, label: "Assigned Manager" }
      ]);
    }
    setEditForm({
      ...editForm,
      employeeId: opt?.value || "",
      reportingManagerId,
    });
    // Clear employee error initially
    setEditErrors(prev => ({ ...prev, employeeId: "", reportingManagerId: "" }));
    loadReportingManagers({ departmentId: editForm.departmentId, employeeId: opt?.value || "" });
  };

  const handleReportingManagerSearch = (inputValue: string) => {
    if (reportingManagerSearchTimeout.current) {
      clearTimeout(reportingManagerSearchTimeout.current);
    }
    reportingManagerSearchTimeout.current = setTimeout(() => {
      loadReportingManagers({ search: inputValue });
    }, 300);
  };

  // Validate Add Resignation form
  const validateAddForm = (): boolean => {
    const errors = {
      departmentId: "",
      employeeId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    };

    let isValid = true;

    if (!addForm.departmentId || addForm.departmentId === "") {
      errors.departmentId = "Please select a department";
      isValid = false;
    }

    if (!addForm.employeeId || addForm.employeeId === "") {
      errors.employeeId = "Please select a resigning employee";
      isValid = false;
    }

    if (!addForm.reportingManagerId || addForm.reportingManagerId === "") {
      errors.reportingManagerId = "Please select a reporting manager";
      isValid = false;
    } else if (addForm.employeeId && addForm.reportingManagerId === addForm.employeeId) {
      errors.reportingManagerId = "Reporting manager cannot be the same employee";
      isValid = false;
    }

    if (!addForm.reason || addForm.reason.trim() === "") {
      errors.reason = "Please enter a reason for resignation";
      isValid = false;
    } else if (addForm.reason.trim().length > 500) {
      errors.reason = "Reason cannot exceed 500 characters";
      isValid = false;
    }

    if (!addForm.noticeDate || addForm.noticeDate === "") {
      errors.noticeDate = "Please select a notice date";
      isValid = false;
    } else if (!parseDDMMYYYY(addForm.noticeDate)) {
      errors.noticeDate = "Notice date must be in DD-MM-YYYY format";
      isValid = false;
    }

    if (!addForm.resignationDate || addForm.resignationDate === "") {
      errors.resignationDate = "Please select a resignation date";
      isValid = false;
    } else if (!parseDDMMYYYY(addForm.resignationDate)) {
      errors.resignationDate = "Resignation date must be in DD-MM-YYYY format";
      isValid = false;
    }

    // Date validation: resignation date should be after or equal to notice date
    if (addForm.noticeDate && addForm.resignationDate) {
      const noticeDate = parseDDMMYYYY(addForm.noticeDate);
      const resignationDate = parseDDMMYYYY(addForm.resignationDate);

      if (noticeDate && resignationDate && resignationDate < noticeDate) {
        errors.resignationDate = "Resignation date cannot be earlier than notice date";
        isValid = false;
      }

      if (resignationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (resignationDate < today) {
          errors.resignationDate = "Resignation date cannot be before today";
          isValid = false;
        }
      }
    }

    setAddErrors(errors);
    return isValid;
  };

  // Validate Edit Resignation form
  const validateEditForm = (): boolean => {
    const errors = {
      departmentId: "",
      employeeId: "",
      reportingManagerId: "",
      reason: "",
      noticeDate: "",
      resignationDate: "",
    };

    let isValid = true;

    if (!editForm.departmentId || editForm.departmentId === "") {
      errors.departmentId = "Please select a department";
      isValid = false;
    }

    if (!editForm.employeeId || editForm.employeeId === "") {
      errors.employeeId = "Please select a resigning employee";
      isValid = false;
    }

    if (!editForm.reportingManagerId || editForm.reportingManagerId === "") {
      errors.reportingManagerId = "Please select a reporting manager";
      isValid = false;
    } else if (editForm.employeeId && editForm.reportingManagerId === editForm.employeeId) {
      errors.reportingManagerId = "Reporting manager cannot be the same employee";
      isValid = false;
    }

    if (!editForm.reason || editForm.reason.trim() === "") {
      errors.reason = "Please enter a reason for resignation";
      isValid = false;
    } else if (editForm.reason.trim().length > 500) {
      errors.reason = "Reason cannot exceed 500 characters";
      isValid = false;
    }

    if (!editForm.noticeDate || editForm.noticeDate === "") {
      errors.noticeDate = "Please select a notice date";
      isValid = false;
    } else if (!parseDDMMYYYY(editForm.noticeDate)) {
      errors.noticeDate = "Notice date must be in DD-MM-YYYY format";
      isValid = false;
    }

    if (!editForm.resignationDate || editForm.resignationDate === "") {
      errors.resignationDate = "Please select a resignation date";
      isValid = false;
    } else if (!parseDDMMYYYY(editForm.resignationDate)) {
      errors.resignationDate = "Resignation date must be in DD-MM-YYYY format";
      isValid = false;
    }

    // Date validation: resignation date should be after or equal to notice date
    if (editForm.noticeDate && editForm.resignationDate) {
      const noticeDate = parseDDMMYYYY(editForm.noticeDate);
      const resignationDate = parseDDMMYYYY(editForm.resignationDate);

      if (noticeDate && resignationDate && resignationDate < noticeDate) {
        errors.resignationDate = "Resignation date cannot be earlier than notice date";
        isValid = false;
      }

      if (resignationDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (resignationDate < today) {
          errors.resignationDate = "Resignation date cannot be before today";
          isValid = false;
        }
      }
    }

    setEditErrors(errors);
    return isValid;
  };

  // Handle view resignation details
  const handleViewClick = (resignation: ResignationRow) => {
    console.log("[Resignation] View clicked:", resignation);
    // Find the original API resignation data
    const apiResignation = apiResignations.find(r => r.resignationId === resignation.resignationId || r._id === resignation.resignationId);
    if (apiResignation) {
      setViewingResignation(apiResignation);
    } else {
      console.error("[Resignation] Could not find API resignation data");
      toast.error("Unable to load resignation details");
    }
  };

  // Handle approve resignation (using REST API)
  const handleApproveResignation = async (resignationId: string) => {
    if (!isHrRole && !isAdminRole && !isManagerRole) {
      toast.error("You do not have permission to approve resignations");
      return;
    }
    if (window.confirm("Are you sure you want to approve this resignation? Employee status will be updated to 'On Notice'.")) {
      console.log("[Resignation] Approving resignation via REST API:", resignationId);
      await approveResignation(resignationId);
    }
  };

  // Handle reject resignation (using REST API)
  const handleRejectResignation = async (resignationId: string) => {
    if (!isHrRole && !isAdminRole && !isManagerRole) {
      toast.error("You do not have permission to reject resignations");
      return;
    }
    const reason = window.prompt("Please enter reason for rejection (optional):");
    if (reason !== null) { // User clicked OK (even if empty string)
      console.log("[Resignation] Rejecting resignation via REST API:", resignationId);
      await rejectResignation(resignationId, reason);
    }
  };

  const filteredRows = rows
    .filter((row) => {
      if (filterDepartmentId && row.departmentId !== filterDepartmentId) return false;
      if (filterStatus && row.resignationStatus?.toLowerCase() !== filterStatus) return false;
      if (filterEmployeeQuery) {
        const query = filterEmployeeQuery.toLowerCase();
        const nameMatch = row.employeeName?.toLowerCase().includes(query);
        const idMatch = row.employeeId?.toLowerCase().includes(query);
        if (!nameMatch && !idMatch) return false;
      }

      if (filterDateRange.start && filterDateRange.end) {
        const startDate = parseDDMMYYYY(filterDateRange.start);
        const endDate = parseDDMMYYYY(filterDateRange.end);
        const rowDate = parse(row.resignationDate, "yyyy-MM-dd", new Date());
        if (startDate && endDate && !isNaN(rowDate.getTime())) {
          if (rowDate < startDate || rowDate > endDate) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = parse(a.resignationDate, "yyyy-MM-dd", new Date());
      const dateB = parse(b.resignationDate, "yyyy-MM-dd", new Date());
      const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
    });

  // table columns (preserved look, wired to backend fields)
  const columns: any[] = [
    {
      title: "Employee ID",
      dataIndex: "employeeId",
      render: (text: string) => (
        <span className="fw-medium">{text}</span>
      ),
      sorter: (a: ResignationRow, b: ResignationRow) =>
        a.employeeId.localeCompare(b.employeeId),
    },
    {
      title: "Name",
      dataIndex: "employeeName",
      render: (text: string, record: ResignationRow) => {
        // Extract just the name part if employeeName contains "ID - Name" format
        const getDisplayName = (employeeName: string): string => {
          const parts = employeeName.split(' - ');
          if (parts.length > 1) {
            return parts.slice(1).join(' - ');
          }
          return employeeName;
        };

        const displayName = getDisplayName(text);

        return (
          <EmployeeNameCell
            name={displayName}
            image={record.employeeImage}
            employeeId={record.employee_id || record.employeeId}
            avatarTheme="danger"
          />
        );
      },
      sorter: (a: ResignationRow, b: ResignationRow) => {
        const getDisplayName = (employeeName: string): string => {
          const parts = employeeName.split(' - ');
          if (parts.length > 1) {
            return parts.slice(1).join(' - ');
          }
          return employeeName;
        };
        return getDisplayName(a.employeeName).localeCompare(getDisplayName(b.employeeName));
      },
    },
    {
      title: "Department",
      dataIndex: "department",
    },
    {
      title: "Reason",
      dataIndex: "reason",
      render: (text: string) => {
        if (!text) return '-';
        const trimmed = text.trim();
        const display = trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed;
        return (
          <div className="text-truncate" title={trimmed}>
            {display}
          </div>
        );
      },
    },
    {
      title: "Notice Date",
      dataIndex: "noticeDate",
      render: (val: string) => fmtYMD(val),
      sorter: (a: ResignationRow, b: ResignationRow) =>
        new Date(a.noticeDate).getTime() - new Date(b.noticeDate).getTime(),
    },
    {
      title: "Resignation Date",
      dataIndex: "resignationDate",
      render: (val: string) => fmtYMD(val),
      sorter: (a: ResignationRow, b: ResignationRow) =>
        new Date(a.resignationDate).getTime() -
        new Date(b.resignationDate).getTime(),
    },
    {
      title: "Status",
      dataIndex: "resignationStatus",
      render: (status: string) => {
        const statusMap: Record<string, { className: string; text: string }> = {
          pending: { className: "badge badge-soft-warning", text: "Pending" },
          on_notice: { className: "badge badge-soft-info", text: "On Notice" },
          rejected: { className: "badge badge-soft-danger", text: "Rejected" },
          resigned: { className: "badge badge-soft-secondary", text: "Resigned" },
          withdrawn: { className: "badge badge-soft-secondary", text: "Withdrawn" },
        };
        const statusInfo = statusMap[status?.toLowerCase()] || { className: "badge badge-soft-secondary", text: status || "Unknown" };
        return <span className={statusInfo.className}>{statusInfo.text}</span>;
      },
      filters: [
        { text: "Pending", value: "pending" },
        { text: "On Notice", value: "on_notice" },
        { text: "Rejected", value: "rejected" },
        { text: "Resigned", value: "resigned" },
      ],
      onFilter: (val: any, rec: any) => rec.resignationStatus?.toLowerCase() === val,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: ResignationRow) => {
        const isPending = record.resignationStatus?.toLowerCase() === "pending" || !record.resignationStatus;
        const isManagerAssignee = isManagerRole && currentEmployee?._id === record.reportingManagerId;
        const canApproveReject = isPending && (isHrRole || isAdminRole || isManagerAssignee);
        const canEdit = isPending && (isHrRole || isAdminRole);
        const canDelete = isPending && (isHrRole || isAdminRole);
        return (
          <div className="action-icon d-inline-flex">
            <Link
              to="#"
              className="me-2"
              onClick={(e) => {
                e.preventDefault();
                handleViewClick(record);
              }}
              data-bs-toggle="modal"
              data-bs-target="#view_resignation"
              title="View Details"
            >
              <i className="ti ti-eye" />
            </Link>
            {canApproveReject && (
              <>
                <Link
                  to="#"
                  className="me-2 text-success"
                  onClick={(e) => {
                    e.preventDefault();
                    handleApproveResignation(record.resignationId);
                  }}
                  title="Approve Resignation"
                >
                  <i className="ti ti-check" />
                </Link>
                <Link
                  to="#"
                  className="me-2 text-danger"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRejectResignation(record.resignationId);
                  }}
                  title="Reject Resignation"
                >
                  <i className="ti ti-x" />
                </Link>
              </>
            )}
            {canEdit && (
              <button
                type="button"
                className="btn btn-link p-0 me-2"
                data-bs-toggle="modal"
                data-bs-target="#edit_resignation"
                onClick={() => {
                  openEditModal(record);
                }}
                title="Edit"
              >
                <i className="ti ti-edit" />
              </button>
            )}
            {canDelete && (
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteClick(record.resignationId);
                }}
                data-bs-toggle="modal"
                data-bs-target="#delete_modal"
                title="Delete"
              >
                <i className="ti ti-trash" />
              </Link>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Resignation</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Resignation
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              {canAddResignation && (
                <div className="mb-2">
                  <Link
                    to="#"
                    className="btn btn-primary d-flex align-items-center"
                    data-bs-toggle="modal"
                    data-bs-target="#new_resignation"
                    onClick={handleAddModalOpen}
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add Resignation
                  </Link>
                </div>
              )}
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Resignation Stats Cards */}
          <div className="row">
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-primary-light rounded-circle p-2">
                      <i className="ti ti-user-off text-primary fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.total}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Total Resignations</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-warning-light rounded-circle p-2">
                      <i className="ti ti-clock text-warning fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.pending}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Pending</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-info-light rounded-circle p-2">
                      <i className="ti ti-bell text-info fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.onNotice}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">On Notice</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-danger-light rounded-circle p-2">
                      <i className="ti ti-user-x text-danger fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.resigned}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Resigned</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Resignation Stats Cards */}

          {/* Resignation List */}
          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                  <h5 className="d-flex align-items-center">
                    Resignation List
                  </h5>
                  <div className="d-flex align-items-center flex-wrap row-gap-3">
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="d-inline-flex align-items-center fs-12"
                      >
                        <label className="fs-12 d-inline-flex me-1">
                          Sort By :{" "}
                        </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "today", label: "Today" },
                            { value: "yesterday", label: "Yesterday" },
                            { value: "last7days", label: "Last 7 Days" },
                            { value: "last30days", label: "Last 30 Days" },
                            { value: "thismonth", label: "This Month" },
                            { value: "lastmonth", label: "Last Month" },
                            { value: "thisyear", label: "This Year" },
                            { value: "alltime", label: "All Time"},
                          ]}
                          defaultValue={filterType}
                          onChange={handleFilterChange}
                        />
                      </Link>
                    </div>
                    <div className="ms-2">
                      <CommonSelect
                        className="select"
                        options={departmentOptions}
                        value={departmentOptions.find(opt => opt.value === filterDepartmentId) || null}
                        onChange={handleDepartmentFilterChange}
                      />
                    </div>
                    <div className="ms-2">
                      <CommonSelect
                        className="select"
                        options={[
                          { value: "pending", label: "Pending" },
                          { value: "on_notice", label: "On Notice" },
                          { value: "rejected", label: "Rejected" },
                          { value: "resigned", label: "Resigned" },
                        ]}
                        value={
                          [
                            { value: "pending", label: "Pending" },
                            { value: "on_notice", label: "On Notice" },
                            { value: "rejected", label: "Rejected" },
                            { value: "resigned", label: "Resigned" },
                          ].find(opt => opt.value === filterStatus) || null
                        }
                        onChange={handleStatusFilterChange}
                      />
                    </div>
                    <div className="ms-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Employee Name"
                        value={filterEmployeeQuery}
                        onChange={handleEmployeeFilterChange}
                      />
                    </div>
                    <div className="ms-2">
                      <DatePicker.RangePicker
                        format={{ format: "DD-MM-YYYY", type: "mask" }}
                        onChange={handleDateRangeFilterChange}
                        className="form-control"
                      />
                    </div>
                    <div className="ms-2">
                      <CommonSelect
                        className="select"
                        options={[
                          { value: "desc", label: "Date: Newest" },
                          { value: "asc", label: "Date: Oldest" },
                        ]}
                        value={
                          [
                            { value: "desc", label: "Date: Newest" },
                            { value: "asc", label: "Date: Oldest" },
                          ].find(opt => opt.value === sortOrder) || null
                        }
                        onChange={handleSortOrderChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  <Table dataSource={filteredRows} columns={columns} Selection={true} />
                </div>
              </div>
            </div>
          </div>
          {/* /Resignation List  */}
        </div>
        {/* Footer */}
        <div className="footer d-sm-flex align-items-center justify-content-between bg-white border-top p-3">
          <p className="mb-0">2026 © amasQIS.ai</p>
          <p>
            Designed &amp; Developed By{" "}
            <Link to="amasqis.ai" className="text-primary">
              amasQIS.ai
            </Link>
          </p>
        </div>
        {/* /Footer */}
      </div>
      {/* Add Resignation */}
      <div className="modal fade" id="new_resignation">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Resignation</h4>
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
                      <label className="form-label">Department <span className="text-danger">*</span></label>
                      <CommonSelect
                        className="select"
                        options={departmentOptions}
                        value={departmentOptions.find(opt => opt.value === addForm.departmentId) || null}
                        onChange={handleAddDepartmentChange}
                        disabled={isEmployeeRole}
                      />
                      {addErrors.departmentId && <div className="text-danger">{addErrors.departmentId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Resigning Employee <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={employeeOptions}
                        value={employeeOptions.find(opt => opt.value === addForm.employeeId) || null}
                        onChange={handleAddEmployeeChange}
                        disabled={isEmployeeRole}
                      />
                      {addErrors.employeeId && <div className="text-danger">{addErrors.employeeId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Reporting Manager <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={reportingManagerOptions}
                        value={reportingManagerOptions.find(opt => opt.value === addForm.reportingManagerId) || null}
                        onChange={(opt) => {
                          setAddForm({ ...addForm, reportingManagerId: opt?.value || "" });
                          setAddErrors(prev => ({ ...prev, reportingManagerId: "" }));
                        }}
                        onInputChange={handleReportingManagerSearch}
                        isLoading={reportingManagerLoading}
                        placeholder="Select Reporting Manager"
                      />
                      {addErrors.reportingManagerId && <div className="text-danger">{addErrors.reportingManagerId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label mb-0">Reason <span className="text-danger">*</span></label>
                        <small className="text-muted">
                          {addForm.reason.length}/500 characters
                        </small>
                      </div>
                      <textarea
                        className="form-control"
                        rows={3}
                        maxLength={500}
                        value={addForm.reason}
                        onChange={(e) => {
                          setAddForm({ ...addForm, reason: e.target.value });
                          // Clear error when user starts typing
                          if (e.target.value.trim() && addErrors.reason) {
                            setAddErrors(prev => ({ ...prev, reason: "" }));
                          }
                        }}
                        placeholder="Enter reason for resignation (max 500 characters)"
                      />
                      {addErrors.reason && <div className="text-danger">{addErrors.reason}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Notice Date <span className="text-danger">*</span>
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
                          value={addForm.noticeDate ? dayjs(addForm.noticeDate, "DD-MM-YYYY") : null}
                          onChange={(_, dateString) => {
                            setAddForm({
                              ...addForm,
                              noticeDate: dateString as string,
                            });
                            // Clear error when date is selected
                            if (dateString && addErrors.noticeDate) {
                              setAddErrors(prev => ({ ...prev, noticeDate: "" }));
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addErrors.noticeDate && <div className="text-danger">{addErrors.noticeDate}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Resignation Date <span className="text-danger">*</span>
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
                          value={addForm.resignationDate ? dayjs(addForm.resignationDate, "DD-MM-YYYY") : null}
                          onChange={(_, dateString) => {
                            setAddForm({
                              ...addForm,
                              resignationDate: dateString as string,
                            });
                            // Clear error when date is selected
                            if (dateString && addErrors.resignationDate) {
                              setAddErrors(prev => ({ ...prev, resignationDate: "" }));
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {addErrors.resignationDate && <div className="text-danger">{addErrors.resignationDate}</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Adding...
                    </>
                  ) : (
                    "Add Resignation"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Add Resignation */}
      {/* Edit Resignation */}
      <div className="modal fade" id="edit_resignation">
        <div className="modal-dialog modal-dialog-centered modal-md">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Resignation</h4>
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
                      <label className="form-label">
                        Department <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={departmentOptions}
                        value={departmentOptions.find(opt => opt.value === editForm.departmentId) || null}
                        onChange={handleEditDepartmentChange}
                        disabled={true}
                      />
                      {editErrors.departmentId && <div className="text-danger">{editErrors.departmentId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Resigning Employee <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={employeeOptions}
                        value={employeeOptions.find(opt => opt.value === editForm.employeeId) || null}
                        onChange={handleEditEmployeeChange}
                        disabled={true}
                      />
                      {editErrors.employeeId && <div className="text-danger">{editErrors.employeeId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Reporting Manager <span className="text-danger">*</span>
                      </label>
                      <CommonSelect
                        className="select"
                        options={reportingManagerOptions}
                        value={reportingManagerOptions.find(opt => opt.value === editForm.reportingManagerId) || null}
                        onChange={(opt) => {
                          setEditForm({ ...editForm, reportingManagerId: opt?.value || "" });
                          setEditErrors(prev => ({ ...prev, reportingManagerId: "" }));
                        }}
                        onInputChange={handleReportingManagerSearch}
                        isLoading={reportingManagerLoading}
                        placeholder="Select Reporting Manager"
                        disabled={isEmployeeRole}
                      />
                      {editErrors.reportingManagerId && <div className="text-danger">{editErrors.reportingManagerId}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label mb-0">
                          Reason <span className="text-danger">*</span>
                        </label>
                        <small className="text-muted">
                          {editForm.reason.length}/500 characters
                        </small>
                      </div>
                      <textarea
                        className="form-control"
                        rows={3}
                        maxLength={500}
                        value={editForm.reason}
                        onChange={(e) => {
                          setEditForm({ ...editForm, reason: e.target.value });
                          // Clear error when user starts typing
                          if (e.target.value.trim() && editErrors.reason) {
                            setEditErrors(prev => ({ ...prev, reason: "" }));
                          }
                        }}
                        placeholder="Enter reason for resignation (max 500 characters)"
                      />
                      {editErrors.reason && <div className="text-danger">{editErrors.reason}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Notice Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{ format: "DD-MM-YYYY", type: "mask" }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={
                            editForm.noticeDate
                              ? dayjs(editForm.noticeDate, "DD-MM-YYYY")
                              : null
                          }
                          onChange={(_, dateString) => {
                            setEditForm({
                              ...editForm,
                              noticeDate: dateString as string,
                            });
                            // Clear error when date is selected
                            if (dateString && editErrors.noticeDate) {
                              setEditErrors(prev => ({ ...prev, noticeDate: "" }));
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {editErrors.noticeDate && <div className="text-danger">{editErrors.noticeDate}</div>}
                    </div>
                  </div>
                  <div className="col-md-12">
                    <div className="mb-3">
                      <label className="form-label">
                        Resignation Date <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-end position-relative">
                        <DatePicker
                          className="form-control datetimepicker"
                          format={{ format: "DD-MM-YYYY", type: "mask" }}
                          getPopupContainer={getModalContainer}
                          placeholder="DD-MM-YYYY"
                          value={
                            editForm.resignationDate
                              ? dayjs(editForm.resignationDate, "DD-MM-YYYY")
                              : null
                          }
                          onChange={(_, dateString) => {
                            setEditForm({
                              ...editForm,
                              resignationDate: dateString as string,
                            });
                            // Clear error when date is selected
                            if (dateString && editErrors.resignationDate) {
                              setEditErrors(prev => ({ ...prev, resignationDate: "" }));
                            }
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                      </div>
                      {editErrors.resignationDate && <div className="text-danger">{editErrors.resignationDate}</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-white border me-2"
                  data-bs-dismiss="modal"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEditSave}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* /Edit Resignation */}
      {/* Delete Modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Delete</h4>
              <p className="mb-3">
                Are you sure you want to delete this resignation? This action cannot be undone.
              </p>
              <div className="d-flex justify-content-center">
                <button
                  type="button"
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="btn btn-danger"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* /Delete Modal */}
      {/* View Resignation Details Modal */}
      <ResignationDetailsModal resignation={viewingResignation} modalId="view_resignation" />
      {/* /View Resignation Details Modal */}
    </>
  );
};

export default Resignation;
