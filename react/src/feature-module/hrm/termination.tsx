import { DatePicker } from "antd";
import { format, parse } from "date-fns";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import Table from "../../core/common/dataTable/index";
import EmployeeNameCell from "../../core/common/EmployeeNameCell";
import TerminationDetailsModal from "../../core/modals/TerminationDetailsModal";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";
// REST API Hook for Terminations
import { useTerminationsREST } from "../../hooks/useTerminationsREST";

type TerminationRow = {
  employeeName: string | null;
  employeeId: string | null;
  employee_id?: string | null; // Database ID for navigation
  employeeImage?: string | null;
  department: string | null;
  departmentId: string | null;
  designation?: string | null;
  reason: string;
  terminationType: string;
  noticeDate: string;
  terminationDate: string; // already formatted by backend like "12 Sep 2025"
  terminationId: string;
  status: string; // Workflow status: pending, processed, cancelled - Required for Termination type compatibility
  lastWorkingDate?: string;
  processedBy?: string;
  processedAt?: string;
};

type TerminationStats = {
  total: number;
  processed: number;
  pending: number;
  thisMonth: number;
};

type DepartmentRow = {
  _id: string;
  department: string;
}

const Termination = () => {
  const socket = useSocket() as Socket | null;

  // REST API Hooks for Terminations
  const {
    terminations: apiTerminations,
    stats: apiStats,
    loading: apiLoading,
    fetchTerminations,
    fetchTerminationStats,
    createTermination,
    updateTermination,
    deleteTerminations,
    processTermination,
    cancelTermination
  } = useTerminationsREST();

  const [rows, setRows] = useState<TerminationRow[]>([]);
  const [rowsDepartments, setRowsDepartments] = useState<DepartmentRow[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ value: string; label: string }[]>([]);
  const [stats, setStats] = useState<TerminationStats>({
    total: 0,
    processed: 0,
    pending: 0,
    thisMonth: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingTerminationId, setDeletingTerminationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<string>("alltime");
  const [customRange, setCustomRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [editing, setEditing] = useState<any>(null);

  // State for viewing termination details
  const [viewingTermination, setViewingTermination] = useState<TerminationRow | null>(null);

  // Controlled edit form data
  const [editForm, setEditForm] = useState({
    employeeId: "",
    employeeName: "",
    departmentId: "",
    departmentName: "",
    terminationType: "Lack of skills",
    noticeDate: "", // "DD-MM-YYYY" shown in modal
    reason: "",
    terminationDate: "", // "DD-MM-YYYY" shown in modal
    terminationId: "",
  });

  const ddmmyyyyToYMD = (s?: string) => {
    if (!s) return "";
    const d = parse(s, "dd-MM-yyyy", new Date());
    return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
  };

  // Fetch employees by department (using REST API)
  const loadEmployeesByDepartment = useCallback(async (departmentId: string) => {
    if (!departmentId) {
      setEmployeeOptions([]);
      return;
    }
    console.log("[Termination] Fetching employees for department via REST API:", departmentId);
    // Employees will be loaded from employees API
    setEmployeeOptions([]);
  }, []);

  const openEditModal = (row: any) => {
    console.log("[Termination] openEditModal - row:", row);
    console.log("[Termination] Setting editForm with employeeId:", row.employee_id, "departmentId:", row.departmentId);

    setEditForm({
      employeeId: row.employee_id || "",
      employeeName: row.employeeName || "",
      departmentId: row.departmentId || "",
      departmentName: row.department || "",
      terminationType: row.terminationType || "Lack of skills",
      noticeDate: row.noticeDate
        ? format(parse(row.noticeDate, "yyyy-MM-dd", new Date()), "dd-MM-yyyy")
        : "",
      reason: row.reason || "",
      terminationDate: row.terminationDate
        ? format(
            parse(row.terminationDate, "yyyy-MM-dd", new Date()),
            "dd-MM-yyyy"
          )
        : "",
      terminationId: row.terminationId,
    });

    // Create initial employee option from row data for immediate display
    if (row.employee_id && row.employeeName) {
      const getDisplayName = (employeeName: string | null): string => {
        if (!employeeName) return "Unknown Employee";
        const parts = employeeName.split(' - ');
        return parts.length > 1 ? parts.slice(1).join(' - ') : employeeName;
      };

      const initialEmployeeOption = {
        value: row.employee_id,
        label: `${row.employeeId || 'N/A'} - ${getDisplayName(row.employeeName)}`,
      };

      console.log("[Termination] Setting initial employee option:", initialEmployeeOption);
      setEmployeeOptions([initialEmployeeOption]);
    }

    // Fetch employees for the selected department to populate dropdown options
    if (row.departmentId) {
      console.log("[Termination] Fetching employees for department in edit mode:", row.departmentId);
      loadEmployeesByDepartment(row.departmentId);
    } else {
      console.warn("[Termination] No departmentId found in row data");
    }
  };

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const parseYMD = (s?: string) =>
    s ? parse(s, "yyyy-MM-dd", new Date()) : null; // string -> Date
  const toYMD = (d: any) => {
    if (!d) return "";
    const dt = "toDate" in d ? d.toDate() : d; // support dayjs or Date
    return format(dt, "yyyy-MM-dd");
  };

  // state near top of component
  const [addForm, setAddForm] = useState({
    employeeId: "",
    employeeName: "",
    departmentId: "",
    departmentName: "",
    reason: "",
    terminationType: "Lack of skills", // default of your 3 types
    noticeDate: "", // YYYY-MM-DD from DatePicker
    terminationDate: "",
  });

  // Validation errors for Add Termination
  const [addErrors, setAddErrors] = useState({
    departmentId: "",
    employeeId: "",
    reason: "",
    terminationType: "",
    noticeDate: "",
    terminationDate: "",
  });

  // Validation errors for Edit Termination
  const [editErrors, setEditErrors] = useState({
    departmentId: "",
    employeeId: "",
    reason: "",
    terminationType: "",
    noticeDate: "",
    terminationDate: "",
  });

  // Handle delete termination
  const handleDeleteClick = (terminationId: string) => {
    console.log("[Termination] Delete clicked:", terminationId);
    setDeletingTerminationId(terminationId);
  };

  const confirmDelete = async () => {
    if (!deletingTerminationId) {
      toast.error("No termination selected");
      return;
    }

    console.log("[Termination] Deleting termination via REST API:", deletingTerminationId);
    await deleteTerminations([deletingTerminationId]);
  };

  const fmtYMD = (s?: string) => {
    if (!s) return "";
    const d = parse(s, "yyyy-MM-dd", new Date());
    return isNaN(d.getTime()) ? s : format(d, "dd MMM yyyy");
  };

  // event handlers
  const onListResponse = useCallback((res: any) => {
    if (res?.done) {
      setRows(res.data || []);
    } else {
      setRows([]);
      // optionally toast error
      // toast.error(res?.message || "Failed to fetch terminations");
    }
    setLoading(false);
  }, []);

  const onDepartmentsListResponse = useCallback((res: any) => {
    console.log("[Termination] departments list response", res?.data);
    if (res?.done) {
      setRowsDepartments(res.data || []);
      const opts = (res.data || []).map((dept: any) => ({
        value: dept._id,
        label: dept.department,
      }));
      setDepartmentOptions(opts);
    } else {
      setRowsDepartments([]);
      setDepartmentOptions([]);
      // optionally toast error
      // toast.error(res?.message || "Failed to fetch resignations");
    }
    setLoading(false);
  }, []);

  const onEmployeesByDepartmentResponse = useCallback((res: any) => {
    console.log("[Termination] employees-by-dept response:", res?.data, "done:", res?.done, "message:", res?.message);
    if (res?.done) {
      const opts = (res.data || []).map((emp: any) => {
        console.log("[Termination] Employee _id:", emp._id, "employeeId:", emp.employeeId, "employeeName:", emp.employeeName);
        return {
          value: emp._id, // Store employee ObjectId, not employeeId string
          label: `${emp.employeeId} - ${emp.employeeName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim()}`,
        };
      });
      console.log("[Termination] Mapped employee options:", opts);

      // Merge with existing options to preserve any initial option set by openEditModal
      setEmployeeOptions((prevOptions) => {
        // If there's a pre-existing option (from openEditModal), ensure it's included
        const existingIds = new Set(opts.map(o => o.value));
        const preservedOptions = prevOptions.filter(o => !existingIds.has(o.value));
        return [...preservedOptions, ...opts];
      });
    } else {
      console.log("[Termination] Response not done or empty data");
      // Don't clear employee options on error - preserve any initial option
      console.error("[Termination] Failed to fetch employees:", res?.message);
    }
  }, []);

  const onStatsResponse = useCallback((res: any) => {
    if (res?.done && res.data) {
      setStats(res.data);
    }
  }, []);

  // Calculate stats from current termination data
  const calculateStats = useCallback(() => {
    if (rows.length > 0) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const calculatedStats: TerminationStats = {
        total: rows.length,
        processed: rows.filter(r => r.status === 'processed').length,
        pending: rows.filter(r => r.status === 'pending').length,
        thisMonth: rows.filter(r => {
          const termDate = new Date(r.terminationDate);
          return termDate.getMonth() === currentMonth && termDate.getFullYear() === currentYear;
        }).length,
      };
      setStats(calculatedStats);
    }
  }, [rows]);


  // fetchers (using REST API) - Define BEFORE socket listeners
  const fetchList = useCallback(
    async (type: string, range?: { startDate?: string; endDate?: string }) => {
      setLoading(true);
      const filters: any = {};
      if (type === "thismonth") {
        filters.period = "thismonth";
      } else if (type === "thisyear") {
        filters.period = "thisyear";
      } else if (type === "alltime") {
        filters.period = "alltime";
      } else if (type === "custom" && range?.startDate && range?.endDate) {
        filters.startDate = range.startDate;
        filters.endDate = range.endDate;
      }
      await fetchTerminations(filters);
    },
    [fetchTerminations]
  );

  // register socket listeners and join room (using REST API + Socket.IO for broadcasts)
  useEffect(() => {
    if (!socket) return;

    // Join HR room for Socket.IO broadcasts
    socket.emit("join-room", "hr_room");

    // Real-time broadcast listeners (KEEP - for real-time updates from backend)
    const handleTerminationCreated = (data: any) => {
      console.log("[Termination] Real-time: Termination created");
      fetchList(filterType, customRange);
      fetchTerminationStats();
    };
    const handleTerminationUpdated = (data: any) => {
      console.log("[Termination] Real-time: Termination updated");
      fetchList(filterType, customRange);
      fetchTerminationStats();
    };
    const handleTerminationDeleted = (data: any) => {
      console.log("[Termination] Real-time: Termination deleted");
      fetchList(filterType, customRange);
      fetchTerminationStats();
    };

    // Only set up socket listeners if socket is available
    if (socket) {
      socket.on("termination:created", handleTerminationCreated);
      socket.on("termination:updated", handleTerminationUpdated);
      socket.on("termination:deleted", handleTerminationDeleted);
    }

    return () => {
      if (socket) {
        socket.off("termination:created", handleTerminationCreated);
        socket.off("termination:updated", handleTerminationUpdated);
        socket.off("termination:deleted", handleTerminationDeleted);
      }
    };
  }, [socket, filterType, customRange, fetchList, fetchTerminationStats]);

  // Sync local state with REST API state
  useEffect(() => {
    const transformedTerminations: TerminationRow[] = apiTerminations.map(termination => ({
      ...termination,
      employeeName: termination.employeeName || 'Unknown',
      department: termination.department || '',
      departmentId: termination.departmentId || '',
      terminationId: termination.terminationId || termination._id || '',
      employeeId: termination.employeeId || '',
      reason: termination.reason || '',
      terminationType: termination.terminationType || 'Lack of skills',
      noticeDate: termination.noticeDate || '',
      terminationDate: termination.terminationDate || '',
      status: termination.status || 'pending',
    }));

    setRows(transformedTerminations);
    // Only update stats if apiStats is not null, otherwise keep default values
    if (apiStats) {
      setStats(apiStats as any);
    }
    setLoading(apiLoading);
  }, [apiTerminations, apiStats, apiLoading]);

  const toIsoFromDDMMYYYY = (s: string) => {
    // s like "13-09-2025"
    const [dd, mm, yyyy] = s.split("-").map(Number);
    if (!dd || !mm || !yyyy) return null;
    // Construct UTC date to avoid TZ shifts
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, 0, 0, 0));
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Handle department change in Add modal
  const handleAddDepartmentChange = (opt: any) => {
    console.log("[Termination] Add department selected - _id:", opt?.value, "label:", opt?.label);
    setAddForm({
      ...addForm,
      departmentId: opt?.value || "",
      departmentName: opt?.label || "",
      employeeId: "",
      employeeName: "",
    });
    // Clear department and dependent field errors
    setAddErrors(prev => ({ ...prev, departmentId: "", employeeId: "" }));
    if (opt?.value) {
      loadEmployeesByDepartment(opt.value);
    } else {
      setEmployeeOptions([]);
    }
  };

  // Handle department change in Edit modal
  const handleEditDepartmentChange = (opt: any) => {
    console.log("[Termination] Edit department selected - _id:", opt?.value, "label:", opt?.label);
    setEditForm({
      ...editForm,
      departmentId: opt?.value || "",
      departmentName: opt?.label || "",
      employeeId: "",
      employeeName: "",
    });
    // Clear department and dependent field errors
    setEditErrors(prev => ({ ...prev, departmentId: "", employeeId: "" }));
    if (opt?.value) {
      loadEmployeesByDepartment(opt.value);
    } else {
      setEmployeeOptions([]);
    }
  };

  // Handle employee change in Add modal
  const handleAddEmployeeChange = (opt: any) => {
    console.log("[Termination] Add employee selected - _id:", opt?.value, "label:", opt?.label);
    // Extract employee name from label (format: "EMP-XXX - Employee Name")
    const employeeName = opt?.label ? opt.label.split(" - ")[1] || "" : "";
    setAddForm({
      ...addForm,
      employeeId: opt?.value || "",
      employeeName: employeeName,
    });
    setAddErrors(prev => ({ ...prev, employeeId: "" }));
  };

  // Handle employee change in Edit modal
  const handleEditEmployeeChange = (opt: any) => {
    console.log("[Termination] Edit employee selected - _id:", opt?.value, "label:", opt?.label);
    // Extract employee name from label (format: "EMP-XXX - Employee Name")
    const employeeName = opt?.label ? opt.label.split(" - ")[1] || "" : "";
    setEditForm({
      ...editForm,
      employeeId: opt?.value || "",
      employeeName: employeeName,
    });
    setEditErrors(prev => ({ ...prev, employeeId: "" }));
  };

  // Validate Add Termination form
  const validateAddForm = (): boolean => {
    const errors = {
      departmentId: "",
      employeeId: "",
      reason: "",
      terminationType: "",
      noticeDate: "",
      terminationDate: "",
    };

    let isValid = true;

    if (!addForm.departmentId || addForm.departmentId === "") {
      errors.departmentId = "Department is required";
      isValid = false;
    }

    if (!addForm.employeeId || addForm.employeeId === "") {
      errors.employeeId = "Employee is required";
      isValid = false;
    }

    if (!addForm.terminationType || addForm.terminationType === "") {
      errors.terminationType = "Termination type is required";
      isValid = false;
    }

    if (!addForm.reason || addForm.reason.trim() === "") {
      errors.reason = "Reason is required";
      isValid = false;
    }

    if (!addForm.noticeDate || addForm.noticeDate === "") {
      errors.noticeDate = "Notice date is required";
      isValid = false;
    }

    if (!addForm.terminationDate || addForm.terminationDate === "") {
      errors.terminationDate = "Termination date is required";
      isValid = false;
    }

    // Date validation: termination date should be after or equal to notice date
    if (addForm.noticeDate && addForm.terminationDate) {
      const noticeDate = parse(addForm.noticeDate, "dd-MM-yyyy", new Date());
      const terminationDate = parse(addForm.terminationDate, "dd-MM-yyyy", new Date());

      if (!isNaN(noticeDate.getTime()) && !isNaN(terminationDate.getTime())) {
        if (terminationDate < noticeDate) {
          errors.terminationDate = "Termination date must be on or after notice date";
          isValid = false;
        }
      }
    }

    setAddErrors(errors);
    return isValid;
  };

  // Validate Edit Termination form
  const validateEditForm = (): boolean => {
    const errors = {
      departmentId: "",
      employeeId: "",
      reason: "",
      terminationType: "",
      noticeDate: "",
      terminationDate: "",
    };

    let isValid = true;

    if (!editForm.departmentId || editForm.departmentId === "") {
      errors.departmentId = "Department is required";
      isValid = false;
    }

    if (!editForm.employeeId || editForm.employeeId === "") {
      errors.employeeId = "Employee is required";
      isValid = false;
    }

    if (!editForm.terminationType || editForm.terminationType === "") {
      errors.terminationType = "Termination type is required";
      isValid = false;
    }

    if (!editForm.reason || editForm.reason.trim() === "") {
      errors.reason = "Reason is required";
      isValid = false;
    }

    if (!editForm.noticeDate || editForm.noticeDate === "") {
      errors.noticeDate = "Notice date is required";
      isValid = false;
    }

    if (!editForm.terminationDate || editForm.terminationDate === "") {
      errors.terminationDate = "Termination date is required";
      isValid = false;
    }

    // Date validation: termination date should be after or equal to notice date
    if (editForm.noticeDate && editForm.terminationDate) {
      const noticeDate = parse(editForm.noticeDate, "dd-MM-yyyy", new Date());
      const terminationDate = parse(editForm.terminationDate, "dd-MM-yyyy", new Date());

      if (!isNaN(noticeDate.getTime()) && !isNaN(terminationDate.getTime())) {
        if (terminationDate < noticeDate) {
          errors.terminationDate = "Termination date must be on or after notice date";
          isValid = false;
        }
      }
    }

    setEditErrors(errors);
    return isValid;
  };

  // Handle view termination details
  const handleViewClick = (termination: TerminationRow) => {
    console.log("[Termination] View clicked:", termination);
    setViewingTermination(termination);
  };

  const handleAddSave = async () => {
    console.log("[Termination] handleAddSave called");

    // Validate form first
    if (!validateAddForm()) {
      console.log("[Termination] Add form validation failed");
      return;
    }

    if (isSubmitting) return;

    const noticeIso = toIsoFromDDMMYYYY(addForm.noticeDate);
    if (!noticeIso) {
      console.error("[Termination] Invalid notice date format");
      return;
    }

    const terIso = toIsoFromDDMMYYYY(addForm.terminationDate);
    if (!terIso) {
      console.error("[Termination] Invalid termination date format");
      return;
    }

    const payload = {
      employeeId: addForm.employeeId,
      employeeName: addForm.employeeName,
      department: addForm.departmentName,
      terminationType: addForm.terminationType as
        | "Retirement"
        | "Insubordination"
        | "Lack of skills",
      noticeDate: noticeIso,
      reason: addForm.reason,
      terminationDate: terIso,
    };

    console.log("[Termination] Creating termination via REST API:", payload);
    setIsSubmitting(true);
    const result = await createTermination(payload);
    setIsSubmitting(false);
  };

  const handleEditSave = async () => {
    console.log("[Termination] handleEditSave called");

    // Validate form first
    if (!validateEditForm()) {
      console.log("[Termination] Edit form validation failed");
      return;
    }

    if (isSubmitting) return;

    const noticeIso = toIsoFromDDMMYYYY(editForm.noticeDate);
    if (!noticeIso) {
      console.error("[Termination] Invalid notice date format");
      return;
    }

    const terIso = toIsoFromDDMMYYYY(editForm.terminationDate);
    if (!terIso) {
      console.error("[Termination] Invalid termination date format");
      return;
    }

    const updateData = {
      employeeId: editForm.employeeId,
      employeeName: editForm.employeeName,
      department: editForm.departmentName,
      terminationType: editForm.terminationType as
        | "Retirement"
        | "Insubordination"
        | "Lack of skills",
      noticeDate: noticeIso,
      reason: editForm.reason,
      terminationDate: terIso,
    };

    console.log("[Termination] Updating termination via REST API:", editForm.terminationId, updateData);
    setIsSubmitting(true);
    const result = await updateTermination(editForm.terminationId, updateData);
    setIsSubmitting(false);
  };

  const fetchStats = useCallback(async () => {
    try {
      const stats = await fetchTerminationStats();
      // Only update stats if we got valid data
      if (stats) {
        setStats(stats as any);
      }
    } catch (error) {
      console.error('[Termination] Failed to fetch stats:', error);
    }
  }, [fetchTerminationStats]);

  const fetchDepartmentsList = useCallback(async () => {
    try {
      // Fetch departments from API if available
      // For now, keep empty array or use cached data
      setDepartmentOptions([]);
    } catch (error) {
      console.error('[Termination] Failed to fetch departments:', error);
    }
  }, []);

  // initial + reactive fetch
  useEffect(() => {
    if (!socket) return;
    fetchList(filterType, customRange);
    fetchDepartmentsList();
    fetchStats();
  }, [socket, fetchList, fetchDepartmentsList, fetchStats, filterType, customRange]);

  // Calculate stats when termination data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Add Bootstrap modal event listeners for cleanup
  useEffect(() => {
    const deleteModalElement = document.getElementById("delete_modal");

    // Delete modal - cleanup on hide
    const handleDeleteModalHide = () => {
      console.log("[Termination] Delete modal hidden - clearing state");
      setDeletingTerminationId(null);
    };

    if (deleteModalElement) {
      deleteModalElement.addEventListener('hidden.bs.modal', handleDeleteModalHide);
    }

    // Cleanup event listeners on unmount
    return () => {
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

  const handleCustomRange = (_: any, dateStrings: [string, string]) => {
    if (dateStrings && dateStrings[0] && dateStrings[1]) {
      const range = { startDate: dateStrings[0], endDate: dateStrings[1] };
      setCustomRange(range);
      fetchList("custom", range);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.length === 0) return;
    if (
      window.confirm(
        `Delete ${selectedKeys.length} record(s)? This cannot be undone.`
      )
    ) {
      await deleteTerminations(selectedKeys);
    }
  };

  const handleSelectionChange = (keys: React.Key[]) => {
    setSelectedKeys(keys as string[]);
  };

  // Handle process termination (using REST API)
  const handleProcessTermination = async (terminationId: string) => {
    if (window.confirm("Are you sure you want to process this termination? Employee status will be updated to 'Terminated'.")) {
      console.log("[Termination] Processing termination via REST API:", terminationId);
      await processTermination(terminationId);
    }
  };

  // Handle cancel termination (using REST API)
  const handleCancelTermination = async (terminationId: string) => {
    const reason = window.prompt("Please enter reason for cancellation (optional):");
    if (reason !== null) { // User clicked OK (even if empty string)
      console.log("[Termination] Cancelling termination via REST API:", terminationId);
      await cancelTermination(terminationId, reason);
    }
  };

  type OptionDepartments = { value: string; label: string };

  // Helper to find option object from ID value
  const toDepartmentOption = (val: string | undefined) =>
    val ? departmentOptions.find(o => o.value === val) : undefined;

  const toEmployeeOption = (val: string | undefined) =>
    val ? employeeOptions.find(o => o.value === val) : undefined;

  // table columns (aligned with resignation page structure)
  const columns: any[] = [
    {
      title: "Employee ID",
      dataIndex: "employeeId",
      render: (text: string) => (
        <span className="fw-medium">{text || "N/A"}</span>
      ),
      sorter: (a: TerminationRow, b: TerminationRow) =>
        (a.employeeId || "").localeCompare(b.employeeId || ""),
    },
    {
      title: "Name",
      dataIndex: "employeeName",
      render: (text: string, record: TerminationRow) => {
        // Extract just the name part if employeeName contains "ID - Name" format
        const getDisplayName = (employeeName: string | null): string => {
          if (!employeeName) return "Unknown Employee";
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
      sorter: (a: TerminationRow, b: TerminationRow) => {
        const getDisplayName = (employeeName: string | null): string => {
          if (!employeeName) return "";
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
      render: (text: string | null) => text || "N/A",
    },
    {
      title: "Reason",
      dataIndex: "reason",
      render: (text: string) => {
        if (!text) return '-';
        return (
          <div className="text-truncate" title={text}>
            {text}
          </div>
        );
      },
    },
    {
      title: "Notice Date",
      dataIndex: "noticeDate",
      render: (val: string) => fmtYMD(val),
      sorter: (a: TerminationRow, b: TerminationRow) =>
        new Date(a.noticeDate).getTime() - new Date(b.noticeDate).getTime(),
    },
    {
      title: "Termination Date",
      dataIndex: "terminationDate",
      render: (val: string) => fmtYMD(val),
      sorter: (a: TerminationRow, b: TerminationRow) =>
        new Date(a.terminationDate).getTime() -
        new Date(b.terminationDate).getTime(),
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (status: string) => {
        const statusMap: Record<string, { className: string; text: string }> = {
          pending: { className: "badge badge-soft-warning", text: "Pending" },
          processed: { className: "badge badge-soft-success", text: "Processed" },
          cancelled: { className: "badge badge-soft-danger", text: "Cancelled" },
        };
        const statusInfo = statusMap[status?.toLowerCase()] || { className: "badge badge-soft-secondary", text: status || "Unknown" };
        return <span className={statusInfo.className}>{statusInfo.text}</span>;
      },
      filters: [
        { text: "Pending", value: "pending" },
        { text: "Processed", value: "processed" },
        { text: "Cancelled", value: "cancelled" },
      ],
      onFilter: (val: any, rec: any) => rec.status?.toLowerCase() === val,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: TerminationRow) => {
        const isPending = record.status?.toLowerCase() === "pending" || !record.status;
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
              data-bs-target="#view_termination"
              title="View Details"
            >
              <i className="ti ti-eye" />
            </Link>
            {isPending && (
              <>
                <Link
                  to="#"
                  className="me-2 text-success"
                  onClick={(e) => {
                    e.preventDefault();
                    handleProcessTermination(record.terminationId);
                  }}
                  title="Process Termination"
                >
                  <i className="ti ti-check" />
                </Link>
                <Link
                  to="#"
                  className="me-2 text-danger"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancelTermination(record.terminationId);
                  }}
                  title="Cancel Termination"
                >
                  <i className="ti ti-x" />
                </Link>
              </>
            )}
            <a
              href="#"
              className="me-2"
              data-bs-toggle="modal"
              data-bs-target="#edit_termination"
              onClick={(e) => {
                openEditModal(record);
              }}
              title="Edit"
            >
              <i className="ti ti-edit" />
            </a>
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteClick(record.terminationId);
              }}
              data-bs-toggle="modal"
              data-bs-target="#delete_modal"
              title="Delete"
            >
              <i className="ti ti-trash" />
            </Link>
          </div>
        );
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys: selectedKeys,
    onChange: (keys: React.Key[]) => setSelectedKeys(keys as string[]),
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h3 className="mb-1">Termination</h3>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">HR</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Termination
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <label className="mb-2"></label>
              <div>
                <Link
                  to="#"
                  className="btn btn-primary d-flex align-items-center"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#new_termination"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Termination
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>

          {/* Termination Stats Cards */}
          <div className="row">
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-primary-light rounded-circle p-2">
                      <i className="ti ti-user-minus text-primary fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.total}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Total Terminations</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-success-light rounded-circle p-2">
                      <i className="ti ti-check text-success fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.processed}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Processed</span>
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
                      <i className="ti ti-calendar text-info fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.thisMonth}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">This Month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Termination Stats Cards */}

          {/* Table + Filters */}
          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                  <h5 className="d-flex align-items-center">
                    Termination List
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
                  </div>
                </div>
                <div className="card-body p-0">
                  <Table dataSource={rows} columns={columns} Selection={true} />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer d-sm-flex align-items-center justify-content-between">
            <p>2014 - 2025 © Amasqis.</p>
            <p>
              Designed &amp; Developed By{" "}
              <Link to="#" target="_blank">
                Amasqis
              </Link>
            </p>
          </div>
        </div>
        {/* Add Termination */}
        <div className="modal fade" id="new_termination">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Termination</h4>
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
                    {/* 1. Department */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Department <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          value={toDepartmentOption(addForm.departmentId) || null}
                          onChange={handleAddDepartmentChange}
                          options={departmentOptions}
                        />
                        {addErrors.departmentId && (
                          <small className="text-danger">{addErrors.departmentId}</small>
                        )}
                      </div>
                    </div>
                    {/* 2. Terminated Employee */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Terminated Employee <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          value={toEmployeeOption(addForm.employeeId) || null}
                          onChange={handleAddEmployeeChange}
                          options={employeeOptions}
                        />
                        {addErrors.employeeId && (
                          <small className="text-danger">{addErrors.employeeId}</small>
                        )}
                      </div>
                    </div>
                    {/* 3. Termination Type */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Termination Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={[
                            { value: "Retirement", label: "Retirement" },
                            { value: "Insubordination", label: "Insubordination" },
                            { value: "Lack of skills", label: "Lack of skills" },
                          ]}
                          value={{ value: addForm.terminationType, label: addForm.terminationType }}
                          onChange={(opt: { value: string } | null) => {
                            setAddForm({ ...addForm, terminationType: opt?.value ?? "Lack of skills" });
                            setAddErrors(prev => ({ ...prev, terminationType: "" }));
                          }}
                        />
                        {addErrors.terminationType && (
                          <small className="text-danger">{addErrors.terminationType}</small>
                        )}
                      </div>
                    </div>
                    {/* 4. Termination Date */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Termination Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format={{ format: "DD-MM-YYYY", type: "mask" }}
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                            onChange={(_, dateString) => {
                              setAddForm({ ...addForm, terminationDate: dateString as string });
                              setAddErrors(prev => ({ ...prev, terminationDate: "" }));
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                        {addErrors.terminationDate && (
                          <small className="text-danger">{addErrors.terminationDate}</small>
                        )}
                      </div>
                    </div>
                    {/* 5. Notice Date */}
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
                            onChange={(_, dateString) => {
                              setAddForm({ ...addForm, noticeDate: dateString as string });
                              setAddErrors(prev => ({ ...prev, noticeDate: "" }));
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                        {addErrors.noticeDate && (
                          <small className="text-danger">{addErrors.noticeDate}</small>
                        )}
                      </div>
                    </div>
                    {/* 6. Reason */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Reason <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={addForm.reason}
                          maxLength={500}
                          onChange={(e) => {
                            setAddForm({ ...addForm, reason: e.target.value });
                            setAddErrors(prev => ({ ...prev, reason: "" }));
                          }}
                          placeholder="Enter reason (max 500 characters)"
                        />
                        <small className="text-muted">
                          {addForm.reason.length}/500 characters
                        </small>
                        {addErrors.reason && (
                          <div><small className="text-danger">{addErrors.reason}</small></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Adding..." : "Add Termination"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Termination */}
        {/* Edit Termination */}
        <div className="modal fade" id="edit_termination">
          <div className="modal-dialog modal-dialog-centered modal-md">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Termination</h4>
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
                    {/* 1. Department */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Department <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          value={toDepartmentOption(editForm.departmentId) || null}
                          onChange={handleEditDepartmentChange}
                          options={departmentOptions}
                          disabled={true}
                        />

                        {editErrors.departmentId && (
                          <small className="text-danger">{editErrors.departmentId}</small>
                        )}
                      </div>
                    </div>
                    {/* 2. Terminated Employee */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Terminated Employee <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          value={toEmployeeOption(editForm.employeeId) || null}
                          onChange={handleEditEmployeeChange}
                          options={employeeOptions}
                          disabled={true}
                        />

                        {editErrors.employeeId && (
                          <small className="text-danger">{editErrors.employeeId}</small>
                        )}
                      </div>
                    </div>
                    {/* 3. Termination Type */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Termination Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          value={{ value: editForm.terminationType, label: editForm.terminationType }}
                          onChange={(opt: { value: string } | null) => {
                            setEditForm({ ...editForm, terminationType: opt?.value ?? "Lack of skills" });
                            setEditErrors(prev => ({ ...prev, terminationType: "" }));
                          }}
                          options={[
                            { value: "Retirement", label: "Retirement" },
                            { value: "Insubordination", label: "Insubordination" },
                            { value: "Lack of skills", label: "Lack of skills" },
                          ]}
                        />
                        {editErrors.terminationType && (
                          <small className="text-danger">{editErrors.terminationType}</small>
                        )}
                      </div>
                    </div>
                    {/* 4. Termination Date */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Termination Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format={{ format: "DD-MM-YYYY", type: "mask" }}
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                            value={editForm.terminationDate ? dayjs(editForm.terminationDate, "DD-MM-YYYY") : null}
                            onChange={(_, dateString) => {
                              setEditForm({ ...editForm, terminationDate: dateString as string });
                              setEditErrors(prev => ({ ...prev, terminationDate: "" }));
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                        {editErrors.terminationDate && (
                          <small className="text-danger">{editErrors.terminationDate}</small>
                        )}
                      </div>
                    </div>
                    {/* 5. Notice Date */}
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
                            value={editForm.noticeDate ? dayjs(editForm.noticeDate, "DD-MM-YYYY") : null}
                            onChange={(_, dateString) => {
                              setEditForm({ ...editForm, noticeDate: dateString as string });
                              setEditErrors(prev => ({ ...prev, noticeDate: "" }));
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                        {editErrors.noticeDate && (
                          <small className="text-danger">{editErrors.noticeDate}</small>
                        )}
                      </div>
                    </div>
                    {/* 6. Reason */}
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Reason <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={editForm.reason}
                          maxLength={500}
                          onChange={(e) => {
                            setEditForm({ ...editForm, reason: e.target.value });
                            setEditErrors(prev => ({ ...prev, reason: "" }));
                          }}
                          placeholder="Enter reason (max 500 characters)"
                        />
                        <small className="text-muted">
                          {editForm.reason.length}/500 characters
                        </small>
                        {editErrors.reason && (
                          <div><small className="text-danger">{editErrors.reason}</small></div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-white border me-2"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEditSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edi Termination */}

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
                  Are you sure you want to delete this termination? This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center">
                  <button type="button" className="btn btn-light me-3" data-bs-dismiss="modal">
                    Cancel
                  </button>
                  <button type="button" onClick={confirmDelete} className="btn btn-danger">
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Delete Modal */}

        {/* View Termination Details Modal */}
        <TerminationDetailsModal termination={viewingTermination} modalId="view_termination" />
        {/* /View Termination Details Modal */}
      </div>
    </>
  );
};

export default Termination;
