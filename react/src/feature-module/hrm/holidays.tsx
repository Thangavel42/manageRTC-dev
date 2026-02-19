import { DatePicker } from "antd";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import Table from "../../core/common/dataTable/index";
import Footer from "../../core/common/footer";
import { closeModal, useModalCleanup } from "../../core/hooks/useModalCleanup";
import HolidayDetailsModal from "../../core/modals/HolidayDetailsModal";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";
// REST API Hook for Holidays
import { useHolidaysREST } from "../../hooks/useHolidaysREST";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD-MM-YYYY";
const DATE_FORMAT_REGEX = /^\d{2}-\d{2}-\d{4}$/;

// Generate an uppercase, underscore-safe code from a holiday type name
const buildHolidayTypeCode = (name: string) => {
  const base = name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return base || `TYPE_${Date.now()}`;
};

const parseDisplayDate = (value?: string | null) => {
  if (!value) return null;
  const strict = dayjs(value, DATE_FORMAT, true);
  if (strict.isValid()) return strict;
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback : null;
};

const normalizeTypeName = (name?: string | null) =>
  (name || "").trim().toLowerCase();

const dedupeHolidayTypes = (types: HolidayType[]) => {
  const uniqueMap = new Map<string, HolidayType>();
  types.forEach((type) => {
    const key = normalizeTypeName(type?.name);
    if (!key) return;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, type);
    }
  });
  return Array.from(uniqueMap.values());
};

const formatDisplayDate = (value?: string | null) => {
  const parsed = parseDisplayDate(value || "");
  return parsed ? parsed.format(DATE_FORMAT) : "";
};

interface Holidays {
  _id: string;
  title: string;
  date: string;
  description: string;
  status: "Active" | "Inactive"; // Strict typing for normalized status
  holidayTypeId?: string;
  holidayTypeName?: string; // Only present in API response from lookup
  repeatsEveryYear?: boolean;
}

interface HolidayType {
  _id: string;
  name: string;
  // status field removed - not needed for holiday types
}

interface HolidayEntry {
  id: string;
  title: string;
  date: string;
  description: string;
  status: string;
  repeatsEveryYear: boolean;
  holidayTypeId: string;
}

interface HolidayEntryErrors {
  title?: string;
  date?: string;
  status?: string;
  holidayTypeId?: string;
}

interface ValidationErrors {
  [key: string]: HolidayEntryErrors;
}

const Holidays = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [holiday, setHoliday] = useState<Holidays[]>([]);
  const [editingHoliday, setEditingHoliday] = useState<Holidays | null>(null);
  const [deletingHoliday, setDeletingHoliday] = useState<Holidays | null>(null);
  const [viewingHoliday, setViewingHoliday] = useState<Holidays | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Dropdown options (matching employeesList.tsx pattern)
  const statusOptions = [
    { value: "", label: "Select Status" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" }
  ];

  // Normalize status to ensure correct case
  const normalizeStatus = (status: string | undefined): "Active" | "Inactive" => {
    if (!status) return "Active";
    const normalized = status.toLowerCase();
    return normalized === "inactive" ? "Inactive" : "Active";
  };

  // State for multiple holiday entries
  const [holidayEntries, setHolidayEntries] = useState<HolidayEntry[]>([
    { id: "1", title: "", date: "", description: "", status: "Active", repeatsEveryYear: false, holidayTypeId: "" }
  ]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // State for edit modal
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editHolidayTypeId, setEditHolidayTypeId] = useState("");
  const [editRepeatsEveryYear, setEditRepeatsEveryYear] = useState(false);
  const [editValidationErrors, setEditValidationErrors] = useState<HolidayEntryErrors>({});

  // State for Holiday Types modal
  const [showTypesModal, setShowTypesModal] = useState(false);
  const [holidayTypes, setHolidayTypes] = useState<HolidayType[]>([]);
  const [newTypeName, setNewTypeName] = useState("");
  const [typeValidationError, setTypeValidationError] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState("");
  const [editTypeValidationError, setEditTypeValidationError] = useState("");
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [isAddingType, setIsAddingType] = useState(false);
  const [isInitializingTypes, setIsInitializingTypes] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Stats state for displaying holiday statistics
  const [stats, setStats] = useState({
    totalHolidays: 0,
    upcomingCount: 0,
    thisMonthCount: 0,
    totalTypesCount: 0
  });

  const socket = useSocket() as Socket | null;
  const socketListenersAttachedRef = useRef(false);
  const socketIdRef = useRef<string | null>(null);

  // REST API Hooks for Holidays and Holiday Types
  const {
    holidays: apiHolidays,
    holidayTypes: apiHolidayTypes,
    loading: apiLoading,
    fetchHolidays,
    fetchHolidayTypes,
    createHoliday,
    updateHoliday,
    deleteHoliday: deleteHolidayAPI,
    createHolidayType,
    updateHolidayType,
    deleteHolidayType,
    initializeDefaultHolidayTypes
  } = useHolidaysREST();

  // Calculate holiday statistics
  const calculateStats = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalHolidays = holiday.length;

    const upcomingCount = holiday.filter(h => {
      if (!h.date || h.status !== "Active") return false;
      const holidayDate = parseDisplayDate(h.date);
      return holidayDate ? holidayDate.isAfter(dayjs(now), "day") : false;
    }).length;

    const thisMonthCount = holiday.filter(h => {
      if (!h.date || h.status !== "Active") return false;
      const holidayDate = parseDisplayDate(h.date);
      return holidayDate
        ? holidayDate.month() === currentMonth && holidayDate.year() === currentYear
        : false;
    }).length;

    const totalTypesCount = holidayTypes.length;

    setStats({
      totalHolidays,
      upcomingCount,
      thisMonthCount,
      totalTypesCount
    });
  };

  // Use modal cleanup hook for automatic cleanup on unmount
  useModalCleanup();

  // Modal container helper (for DatePicker positioning)
  const getModalContainer = (): HTMLElement => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  useEffect(() => {
    console.log("[Holidays] Fetching initial data via REST API");
    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Holidays loading timeout - showing fallback");
        setError("Holidays loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    // Fetch holidays and holiday types via REST API
    const fetchInitialData = async () => {
      if (isMounted) {
        await Promise.all([
          fetchHolidays(),
          fetchHolidayTypes()
        ]);
        setLoading(false);
      }
    };
    fetchInitialData();

    // Real-time broadcast listeners (KEEP - for real-time updates from backend)
    const handleHolidayCreated = () => {
      console.log("[Holidays] Real-time: Holiday created");
      fetchHolidays();
    };
    const handleHolidayUpdated = () => {
      console.log("[Holidays] Real-time: Holiday updated");
      fetchHolidays();
    };
    const handleHolidayDeleted = () => {
      console.log("[Holidays] Real-time: Holiday deleted");
      fetchHolidays();
    };

    if (socket && (!socketListenersAttachedRef.current || socketIdRef.current !== socket.id)) {
      socket.on("holiday:created", handleHolidayCreated);
      socket.on("holiday:updated", handleHolidayUpdated);
      socket.on("holiday:deleted", handleHolidayDeleted);
      socketListenersAttachedRef.current = true;
      socketIdRef.current = socket.id;
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (socket) {
        socket.off("holiday:created", handleHolidayCreated);
        socket.off("holiday:updated", handleHolidayUpdated);
        socket.off("holiday:deleted", handleHolidayDeleted);
      }
      socketListenersAttachedRef.current = false;
      socketIdRef.current = null;
    };
  }, [socket, fetchHolidays, fetchHolidayTypes]);

  // Sync local state with REST API state
  useEffect(() => {
    const transformedHolidays: Holidays[] = apiHolidays.map(holiday => ({
      ...holiday,
      date: formatDisplayDate(holiday.date),
      description: holiday.description || '',
    }));

    const uniqueHolidays = new Map<string, Holidays>();
    transformedHolidays.forEach((holidayItem) => {
      const key = holidayItem._id || `${holidayItem.title}|${holidayItem.date}|${holidayItem.holidayTypeId || ''}`;
      if (!uniqueHolidays.has(key)) {
        uniqueHolidays.set(key, holidayItem);
      }
    });

    setHoliday(Array.from(uniqueHolidays.values()));
    setHolidayTypes(dedupeHolidayTypes(apiHolidayTypes));
    setLoading(apiLoading);
  }, [apiHolidays, apiHolidayTypes, apiLoading]);

  // Handle modal backdrop cleanup for Holiday Types modal
  useEffect(() => {
    if (showTypesModal) {
      // Add modal-open class to body when modal opens
      document.body.classList.add('modal-open');
    } else {
      // Remove modal-open class and any leftover backdrops when modal closes
      document.body.classList.remove('modal-open');

      // Clean up any leftover backdrop elements
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
    };
  }, [showTypesModal]);

  // Listen for global search events from header
  useEffect(() => {
    const handleGlobalSearch = (event: CustomEvent) => {
      const { searchTerm: newSearchTerm, currentPage } = event.detail;
      // Only update if we're on the holidays page
      if (currentPage.includes('holidays')) {
        setSearchTerm(newSearchTerm);
      }
    };

    window.addEventListener('globalSearch' as any, handleGlobalSearch as EventListener);
    return () => {
      window.removeEventListener('globalSearch' as any, handleGlobalSearch as EventListener);
    };
  }, []);

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!holidayId) {
        setError("Holiday ID is required");
        setLoading(false);
        return;
      }

      // Use REST API to delete holiday
      const result = await deleteHolidayAPI(holidayId);
      if (result) {
        // Close modal using utility
        closeModal('delete_modal');

        // Additional cleanup to ensure backdrop is removed (fail-safe)
        setTimeout(() => {
          const backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 0) {
            console.warn('[Delete Holiday] Backdrop still exists after modal close, force removing');
            backdrops.forEach(b => b.remove());
            document.body.classList.remove('modal-open');
          }
        }, 400);
      } else {
        setError("Failed to delete holiday");
        setLoading(false);
      }
    } catch (error) {
      setError("Failed to delete holiday");
      setLoading(false);
    }
  };

  // Add new holiday entry
  const addHolidayEntry = () => {
    const newId = (parseInt(holidayEntries[holidayEntries.length - 1].id) + 1).toString();
    setHolidayEntries([
      ...holidayEntries,
      { id: newId, title: "", date: "", description: "", status: "Active", repeatsEveryYear: false, holidayTypeId: "" }
    ]);
  };

  // Remove holiday entry
  const removeHolidayEntry = (id: string) => {
    if (holidayEntries.length === 1) {
      toast.error("At least one holiday entry is required");
      return;
    }
    setHolidayEntries(holidayEntries.filter(entry => entry.id !== id));
    // Remove validation errors for this entry
    const newErrors = { ...validationErrors };
    delete newErrors[id];
    setValidationErrors(newErrors);
  };

  // Update holiday entry field
  const updateHolidayEntry = (id: string, field: keyof HolidayEntry, value: string | boolean) => {
    setHolidayEntries(
      holidayEntries.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    );
    // Clear error for this field when user starts typing
    if (validationErrors[id]?.[field as keyof HolidayEntryErrors]) {
      setValidationErrors({
        ...validationErrors,
        [id]: {
          ...validationErrors[id],
          [field]: undefined
        }
      });
    }
  };

  // Validate single holiday entry
  const validateHolidayEntry = (entry: HolidayEntry): HolidayEntryErrors => {
    const errors: HolidayEntryErrors = {};

    if (!entry.title.trim()) {
      errors.title = "Title is required";
    }

    if (!entry.date) {
      errors.date = "Date is required";
    } else if (!DATE_FORMAT_REGEX.test(entry.date)) {
      errors.date = "Date must be in DD-MM-YYYY format";
    }

    if (!entry.status) {
      errors.status = "Status is required";
    }

    if (!entry.holidayTypeId) {
      errors.holidayTypeId = "Holiday type is required";
    }

    return errors;
  };

  // Validate all holiday entries
  const validateAllEntries = (): boolean => {
    const errors: ValidationErrors = {};
    let hasErrors = false;

    holidayEntries.forEach(entry => {
      const entryErrors = validateHolidayEntry(entry);
      if (Object.keys(entryErrors).length > 0) {
        errors[entry.id] = entryErrors;
        hasErrors = true;
      }
    });

    setValidationErrors(errors);
    return !hasErrors;
  };

  // Handle submit multiple holidays (using REST API)
  const handleSubmitHolidays = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    if (!validateAllEntries()) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Submit each holiday via REST API
      const promises = holidayEntries.map(async (entry) => {
        const holidayData = {
          title: entry.title.trim(),
          date: entry.date,
          description: entry.description.trim(),
          status: normalizeStatus(entry.status) as 'Active' | 'Inactive',
          holidayTypeId: entry.holidayTypeId,
          repeatsEveryYear: entry.repeatsEveryYear
        };
        return await createHoliday(holidayData);
      });

      const results = await Promise.all(promises);
      const allSucceeded = results.every(Boolean);

      if (!allSucceeded) {
        return;
      }

      await fetchHolidays();

      // Reset form after successful submission
      resetAddForm();

      // Close modal using utility
      closeModal('add_holiday');

      // Additional cleanup to ensure backdrop is removed (fail-safe)
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 0) {
          console.warn('[Add Holiday] Backdrop still exists after modal close, force removing');
          backdrops.forEach(b => b.remove());
          document.body.classList.remove('modal-open');
        }
      }, 400);
    } catch (error) {
      console.error("[Holidays] Error submitting holidays:", error);
      toast.error("Failed to add holidays. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset add form
  const resetAddForm = () => {
    setHolidayEntries([{ id: "1", title: "", date: "", description: "", status: "Active", repeatsEveryYear: false, holidayTypeId: "" }]);
    setValidationErrors({});
  };

  // Handle edit modal open
  useEffect(() => {
    if (editingHoliday) {
      setEditTitle(editingHoliday.title);
      setEditDate(formatDisplayDate(editingHoliday.date));
      setEditDescription(editingHoliday.description);
      setEditStatus(editingHoliday.status);
      setEditHolidayTypeId(editingHoliday.holidayTypeId || "");
      setEditRepeatsEveryYear(editingHoliday.repeatsEveryYear || false);
      setEditValidationErrors({});
    }
  }, [editingHoliday]);

  // Validate edit form
  const validateEditForm = (): boolean => {
    const errors: HolidayEntryErrors = {};

    if (!editTitle.trim()) {
      errors.title = "Title is required";
    }

    if (!editDate) {
      errors.date = "Date is required";
    } else if (!DATE_FORMAT_REGEX.test(editDate)) {
      errors.date = "Date must be in DD-MM-YYYY format";
    }

    if (!editStatus) {
      errors.status = "Status is required";
    }

    if (!editHolidayTypeId) {
      errors.holidayTypeId = "Holiday type is required";
    }

    setEditValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle edit submit (using REST API)
  const handleEditSubmit = async (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    if (!validateEditForm()) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    if (!editingHoliday) {
      toast.error("No holiday selected");
      return;
    }

    if (isUpdating) return;
    setIsUpdating(true);

    const updatedHoliday = {
      title: editTitle.trim(),
      date: editDate,
      description: editDescription.trim(),
      status: normalizeStatus(editStatus) as 'Active' | 'Inactive',
      holidayTypeId: editHolidayTypeId,
      repeatsEveryYear: editRepeatsEveryYear
    };

    try {
      const result = await updateHoliday(editingHoliday._id, updatedHoliday);

      if (result) {
        await fetchHolidays();

        // Close modal using utility
        closeModal('edit_holiday');

        // Additional cleanup to ensure backdrop is removed (fail-safe)
        setTimeout(() => {
          const backdrops = document.querySelectorAll('.modal-backdrop');
          if (backdrops.length > 0) {
            console.warn('[Edit Holiday] Backdrop still exists after modal close, force removing');
            backdrops.forEach(b => b.remove());
            document.body.classList.remove('modal-open');
          }
        }, 400);

        setEditingHoliday(null);
      }
    } catch (error) {
      console.error("[Holidays] Error updating holiday:", error);
      toast.error("Failed to update holiday. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear edit validation error
  const clearEditError = (field: keyof HolidayEntryErrors) => {
    if (editValidationErrors[field]) {
      setEditValidationErrors({
        ...editValidationErrors,
        [field]: undefined
      });
    }
  };

  // Holiday Types Management Functions
  const handleAddHolidayType = async () => {
    console.log("[Holiday Types] Adding new holiday type:", newTypeName);

    // Clear any previous error
    setTypeValidationError("");

    // Validate type name
    const trimmedName = newTypeName.trim();

    if (!trimmedName) {
      setTypeValidationError("Holiday type name is required");
      return;
    }

    // Set loading state
    setIsAddingType(true);

    // Generate code from name
    const typeCode = buildHolidayTypeCode(trimmedName);

    console.log("[Holiday Types] Creating holiday type via REST API:", {
      name: trimmedName,
      code: typeCode,
      status: "Active"
    });

    // Send to backend via REST API
    const result = await createHolidayType({ name: trimmedName, code: typeCode });

    if (result) {
      // Refresh holiday types to update filter dropdown
      await fetchHolidayTypes();
      setNewTypeName("");
      setTypeValidationError("");
      setIsAddingType(false);
    } else {
      setIsAddingType(false);
    }
  };

  const handleRemoveHolidayType = async (typeId: string) => {
    setDeletingTypeId(typeId);

    const result = await deleteHolidayType(typeId);

    if (result) {
      // Refresh holiday types to update filter dropdown
      await fetchHolidayTypes();

      // Clear filter if the deleted type was selected
      const deletedType = holidayTypes.find(t => t._id === typeId);
      if (deletedType && filterType === normalizeTypeName(deletedType.name)) {
        setFilterType("");
      }

      setDeletingTypeId(null);
    } else {
      setDeletingTypeId(null);
    }
  };

  const handleEditHolidayType = (typeId: string, typeName: string) => {
    setEditingTypeId(typeId);
    setEditingTypeName(typeName);
    setEditTypeValidationError("");
  };

  const handleSaveEditHolidayType = async () => {
    // Clear any previous error
    setEditTypeValidationError("");

    // Validate type name
    const trimmedName = editingTypeName.trim();

    if (!trimmedName) {
      setEditTypeValidationError("Holiday type name is required");
      return;
    }

    if (!editingTypeId) {
      toast.error("No holiday type selected");
      return;
    }

    // Generate code from name
    const typeCode = buildHolidayTypeCode(trimmedName);

    // Send to backend via REST API
    const result = await updateHolidayType(editingTypeId, { name: trimmedName, code: typeCode });

    if (result) {
      // Refresh holiday types to update filter dropdown
      await fetchHolidayTypes();
      setEditingTypeId(null);
      setEditingTypeName("");
      setEditTypeValidationError("");
    }
  };

  const handleCancelEditHolidayType = () => {
    setEditingTypeId(null);
    setEditingTypeName("");
    setEditTypeValidationError("");
  };

  const handleLoadDefaultTypes = async () => {
    if (isInitializingTypes) {
      console.log("[Holiday Types] Already initializing, skipping duplicate request");
      return;
    }

    console.log("[Holiday Types] Manually loading default types via REST API");
    setIsInitializingTypes(true);

    const result = await initializeDefaultHolidayTypes();
    setIsInitializingTypes(false);
  };

  const handleCloseTypesModal = () => {
    setShowTypesModal(false);
    setNewTypeName("");
    setTypeValidationError("");
    setEditingTypeId(null);
    setEditingTypeName("");
    setEditTypeValidationError("");

    // Force refresh of holiday types to ensure filter dropdown is up to date
    fetchHolidayTypes();
  };

  // Filter reset function
  const handleResetFilters = () => {
    setFilterType("");
    setSearchTerm("");
  };

  // Effect to recalculate stats when data changes
  useEffect(() => {
    calculateStats();
  }, [holiday, holidayTypes]);

  const holidayTypeNameById = useMemo(() => {
    const map = new Map<string, string>();
    holidayTypes.forEach((type) => {
      if (type._id) {
        map.set(type._id, type.name || "");
      }
    });
    return map;
  }, [holidayTypes]);

  const holidayTypeOptions = useMemo(() => {
    const optionsMap = new Map<string, { value: string; label: string }>();
    holidayTypes.forEach((type) => {
      const key = normalizeTypeName(type.name);
      if (!key) return;
      if (!optionsMap.has(key)) {
        optionsMap.set(key, { value: key, label: type.name.trim() || type.name });
      }
    });
    return Array.from(optionsMap.values());
  }, [holidayTypes]);

  // Filter holidays based on selected filters
  const getFilteredHolidays = () => {
    let filtered = [...holiday];

    // Filter by type
    if (filterType) {
      filtered = filtered.filter(h => {
        const resolvedName = h.holidayTypeName || holidayTypeNameById.get(h.holidayTypeId) || "";
        return normalizeTypeName(resolvedName) === filterType;
      });
    }

    // Filter by search term (searches across all fields)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(h => {
        const title = (h.title || "").toLowerCase();
        const description = (h.description || "").toLowerCase();
        const typeName = (h.holidayTypeName || holidayTypeNameById.get(h.holidayTypeId) || "").toLowerCase();
        const date = h.date || "";

        return (
          title.includes(searchLower) ||
          description.includes(searchLower) ||
          typeName.includes(searchLower) ||
          date.includes(searchLower)
        );
      });
    }

    return filtered;
  };

  const routes = all_routes;
  const data = getFilteredHolidays();
  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      render: (text: string) => (
        <h6 className="fw-medium">
          <Link to="#">{text}</Link>
        </h6>
      ),
      sorter: (a: any, b: any) => a.Title.length - b.Title.length,
    },
    {
      title: "Date",
      dataIndex: "date",
      sorter: (a: any, b: any) => a.Date.length - b.Date.length,
      render: (date: string | Date) => {
        if (!date) return "-";
        if (date instanceof Date) {
          return dayjs(date).format(DATE_FORMAT);
        }
        return formatDisplayDate(date) || "-";
      }
    },
    {
      title: "Type",
      dataIndex: "holidayTypeName",
      render: (text: string) => (
        text ? (
          <span className="badge badge-soft-info d-inline-flex align-items-center">
            <i className="ti ti-tag me-1" />
            {text}
          </span>
        ) : (
          <span className="text-muted">-</span>
        )
      ),
      sorter: (a: any, b: any) => {
        const aType = a.holidayTypeName || "";
        const bType = b.holidayTypeName || "";
        return aType.localeCompare(bType);
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      render: (text: string) => {
        // Normalize status for display - handle any case variations
        const isActive = text?.toLowerCase() === 'active';
        return (
          <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-sm`}>
            <i className="ti ti-point-filled me-1" />
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_test: any, holiday: Holidays) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#view_holiday"
            onClick={() => setViewingHoliday(holiday)}
          >
            <i className="ti ti-eye" />
          </Link>
          <Link
            to="#"
            className="me-2"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#edit_holiday"
            onClick={() => setEditingHoliday(holiday)}
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            data-bs-toggle="modal"
            data-inert={true}
            data-bs-target="#delete_modal"
            onClick={() => setDeletingHoliday(holiday)}
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ height: "400px" }}
          >
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error(error);
    toast.error(error);
  }

  return (
    <>
      {/* Page Wrapper */}
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Holidays</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Employee</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Holidays
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2 me-2">
                <button
                  onClick={() => {
                    console.log("[Holiday Types] Opening Holiday Types modal");
                    setShowTypesModal(true);
                  }}
                  className="btn btn-outline-primary d-flex align-items-center"
                >
                  <i className="ti ti-tag me-2" />
                  Types
                </button>
              </div>
              <div className="mb-2">
                <Link
                  to="#"
                  data-bs-toggle="modal"
                  data-inert={true}
                  data-bs-target="#add_holiday"
                  className="btn btn-primary d-flex align-items-center"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Holiday
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}
          {/* Stats Cards */}
          <div className="row">
            {/* Total Holidays */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-dark rounded-circle">
                        <i className="ti ti-calendar-event" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Holidays
                      </p>
                      <h4>{stats?.totalHolidays || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Holidays */}
            {/* Upcoming */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-success rounded-circle">
                        <i className="ti ti-calendar-check" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Upcoming
                      </p>
                      <h4>{stats?.upcomingCount || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Upcoming */}
            {/* This Month */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-info rounded-circle">
                        <i className="ti ti-calendar-month" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        This Month
                      </p>
                      <h4>{stats?.thisMonthCount || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /This Month */}
            {/* Total Types */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card flex-fill">
                <div className="card-body d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center overflow-hidden">
                    <div>
                      <span className="avatar avatar-lg bg-warning rounded-circle">
                        <i className="ti ti-tag" />
                      </span>
                    </div>
                    <div className="ms-2 overflow-hidden">
                      <p className="fs-12 fw-medium mb-1 text-truncate">
                        Total Types
                      </p>
                      <h4>{stats?.totalTypesCount || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* /Total Types */}
          </div>
          {/* /Stats Cards */}
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Holidays List</h5>

              {/* Filters Section */}
              <div className="d-flex align-items-center flex-wrap gap-2">
                {/* Search Input */}
                <div className="position-relative" style={{ minWidth: "250px" }}>
                  <div className="input-icon-end position-relative">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search holidays..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      title="Search by title, description, type, or date"
                    />
                    <span className="input-icon-addon">
                      <i className="ti ti-search text-gray-7" />
                    </span>
                  </div>
                </div>

                {/* Type Filter */}
                <div style={{ minWidth: "200px" }}>
                  <CommonSelect
                    className="select-sm"
                    options={[
                      { value: "", label: "All Holiday Types" },
                      ...holidayTypeOptions
                    ]}
                    value={
                      filterType
                        ? {
                          value: filterType,
                          label: holidayTypeOptions.find(option => option.value === filterType)?.label || ""
                        }
                        : { value: "", label: "All Holiday Types" }
                    }
                    onChange={(option: any) => {
                      if (option && option.value) {
                        setFilterType(option.value);
                      } else {
                        setFilterType("");
                      }
                    }}
                  />
                </div>

                {/* Reset Filter Button */}
                {(filterType || searchTerm) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleResetFilters}
                    title="Clear filters"
                  >
                    <i className="ti ti-x" />
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              <Table dataSource={data} columns={columns} Selection={true} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
      {/* /Page Wrapper */}

      {/* Add Holiday Modal */}
      <div className="modal fade" id="add_holiday">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Add Holidays</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={resetAddForm}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Holiday Entries</h5>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={addHolidayEntry}
                  >
                    <i className="ti ti-plus me-1" />
                    Add Another Holiday
                  </button>
                </div>

                <div>
                  {holidayEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="border rounded p-3 mb-3"
                      style={{ position: "relative" }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Holiday {index + 1}</h6>
                        {holidayEntries.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() => removeHolidayEntry(entry.id)}
                            title="Remove this holiday"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        )}
                      </div>

                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Title <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className={`form-control ${
                                validationErrors[entry.id]?.title ? "is-invalid" : ""
                              }`}
                              placeholder="Enter holiday title"
                              value={entry.title}
                              onChange={(e) =>
                                updateHolidayEntry(entry.id, "title", e.target.value)
                              }
                            />
                            {validationErrors[entry.id]?.title && (
                              <div className="invalid-feedback d-block">
                                {validationErrors[entry.id].title}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Date <span className="text-danger">*</span>
                            </label>
                            <div className="input-icon-end position-relative">
                              <DatePicker
                                className={`form-control datetimepicker ${
                                  validationErrors[entry.id]?.date ? "is-invalid" : ""
                                }`}
                                format="DD-MM-YYYY"
                                getPopupContainer={getModalContainer}
                                placeholder="DD-MM-YYYY"
                                value={parseDisplayDate(entry.date) || null}
                                onChange={(date) => {
                                  const formattedDate = date ? date.format(DATE_FORMAT) : "";
                                  updateHolidayEntry(entry.id, "date", formattedDate);
                                }}
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                            {validationErrors[entry.id]?.date && (
                              <div className="invalid-feedback d-block">
                                {validationErrors[entry.id].date}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Status <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className={`select ${
                                validationErrors[entry.id]?.status ? "is-invalid" : ""
                              }`}
                              options={statusOptions}
                              defaultValue={statusOptions.find(opt => opt.value === entry.status)}
                              onChange={(option: any) => {
                                if (option) {
                                  updateHolidayEntry(entry.id, "status", option.value);
                                }
                              }}
                            />
                            {validationErrors[entry.id]?.status && (
                              <div className="invalid-feedback d-block">
                                {validationErrors[entry.id].status}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Type <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className={`select ${
                                validationErrors[entry.id]?.holidayTypeId ? "is-invalid" : ""
                              }`}
                              options={[
                                { value: "", label: "Select Type" },
                                ...holidayTypes.map((type) => ({
                                  value: type._id,
                                  label: type.name
                                }))
                              ]}
                              defaultValue={
                                entry.holidayTypeId
                                  ? { value: entry.holidayTypeId, label: holidayTypes.find(t => t._id === entry.holidayTypeId)?.name || "" }
                                  : { value: "", label: "Select Type" }
                              }
                              onChange={(option: any) => {
                                if (option) {
                                  updateHolidayEntry(entry.id, "holidayTypeId", option.value);
                                }
                              }}
                            />
                            {validationErrors[entry.id]?.holidayTypeId && (
                              <div className="invalid-feedback d-block">
                                {validationErrors[entry.id].holidayTypeId}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">Description</label>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Enter description (optional)"
                              value={entry.description}
                              onChange={(e) =>
                                updateHolidayEntry(entry.id, "description", e.target.value)
                              }
                            />
                          </div>
                        </div>

                        <div className="col-md-6">
                          <div className="mb-3">
                            <div className="d-flex align-items-center">
                              <input
                                type="checkbox"
                                className="form-check-input me-2"
                                id={`repeatsYearly-${entry.id}`}
                                checked={entry.repeatsEveryYear}
                                onChange={(e) =>
                                  updateHolidayEntry(entry.id, "repeatsEveryYear", e.target.checked)
                                }
                              />
                              <label className="form-check-label" htmlFor={`repeatsYearly-${entry.id}`}>
                                Repeats Yearly
                              </label>
                            </div>
                            <small className="text-muted d-block mt-1">
                              Check this if the holiday repeats every year on the same date
                            </small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light me-2"
                data-bs-dismiss="modal"
                onClick={resetAddForm}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitHolidays}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Submit Holidays"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Add Holiday Modal */}

      {/* Edit Holiday Modal */}
      <div className="modal fade" id="edit_holiday">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="modal-title">Edit Holiday</h4>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => setEditingHoliday(null)}
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        editValidationErrors.title ? "is-invalid" : ""
                      }`}
                      placeholder="Enter holiday title"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        clearEditError("title");
                      }}
                    />
                    {editValidationErrors.title && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.title}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Date <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-end position-relative">
                      <DatePicker
                        className={`form-control datetimepicker ${
                          editValidationErrors.date ? "is-invalid" : ""
                        }`}
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        value={parseDisplayDate(editDate) || null}
                        onChange={(date) => {
                          const formattedDate = date ? date.format(DATE_FORMAT) : "";
                          setEditDate(formattedDate);
                          clearEditError("date");
                        }}
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar text-gray-7" />
                      </span>
                    </div>
                    {editValidationErrors.date && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.date}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Status <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className={`select ${
                        editValidationErrors.status ? "is-invalid" : ""
                      }`}
                      options={statusOptions}
                      defaultValue={statusOptions.find(opt => opt.value === editStatus)}
                      onChange={(option: any) => {
                        if (option) {
                          setEditStatus(option.value);
                          clearEditError("status");
                        }
                      }}
                    />
                    {editValidationErrors.status && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.status}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Type <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      className={`select ${
                        editValidationErrors.holidayTypeId ? "is-invalid" : ""
                      }`}
                      options={[
                        { value: "", label: "Select Type" },
                        ...holidayTypes.map((type) => ({
                          value: type._id,
                          label: type.name
                        }))
                      ]}
                      defaultValue={
                        editHolidayTypeId
                          ? { value: editHolidayTypeId, label: holidayTypes.find(t => t._id === editHolidayTypeId)?.name || "" }
                          : { value: "", label: "Select Type" }
                      }
                      onChange={(option: any) => {
                        if (option) {
                          setEditHolidayTypeId(option.value);
                          clearEditError("holidayTypeId");
                        }
                      }}
                    />
                    {editValidationErrors.holidayTypeId && (
                      <div className="invalid-feedback d-block">
                        {editValidationErrors.holidayTypeId}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter description (optional)"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="mb-3">
                    <div className="d-flex align-items-center">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        id="editRepeatsYearly"
                        checked={editRepeatsEveryYear}
                        onChange={(e) => setEditRepeatsEveryYear(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="editRepeatsYearly">
                        Repeats Yearly
                      </label>
                    </div>
                    <small className="text-muted d-block mt-1">
                      Check this if the holiday repeats every year on the same date
                    </small>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-light me-2"
                data-bs-dismiss="modal"
                onClick={() => setEditingHoliday(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEditSubmit}
                disabled={isUpdating}
              >
                {isUpdating ? "Updating..." : "Update Holiday"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* /Edit Holiday Modal */}

      <ToastContainer />

      {/* delete modal */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-body text-center">
              <span className="avatar avatar-xl bg-transparent-danger text-danger mb-3">
                <i className="ti ti-trash-x fs-36" />
              </span>
              <h4 className="mb-1">Confirm Deletion</h4>
              <p className="mb-3">
                {deletingHoliday
                  ? `Are you sure you want to delete holiday "${deletingHoliday.title}"? This cannot be undone.`
                  : "You want to delete all the marked holidays, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDeletingHoliday(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (deletingHoliday) {
                      handleDeleteHoliday(deletingHoliday._id);
                    }
                    setDeletingHoliday(null);
                  }}
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* delete modal */}

      {/* Holiday Types Modal */}
      {showTypesModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Holiday Types Management</h4>
                <button
                  type="button"
                  className="btn-close custom-btn-close"
                  onClick={handleCloseTypesModal}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                {/* Existing Holiday Types List */}
                <div className="mb-4">
                  <h5 className="mb-3">Existing Types ({holidayTypes.length})</h5>
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {holidayTypes.length > 0 ? (
                      <div className="list-group">
                        {holidayTypes.map((type) => (
                          <div
                            key={type._id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                          >
                            {editingTypeId === type._id ? (
                              // Edit Mode
                              <>
                                <div className="flex-grow-1 me-2">
                                  <div className="d-flex align-items-center gap-2">
                                    <i className="ti ti-tag text-primary" />
                                    <input
                                      type="text"
                                      className={`form-control form-control-sm ${
                                        editTypeValidationError ? "is-invalid" : ""
                                      }`}
                                      value={editingTypeName}
                                      onChange={(e) => {
                                        setEditingTypeName(e.target.value);
                                        setEditTypeValidationError("");
                                      }}
                                      onKeyPress={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveEditHolidayType();
                                        } else if (e.key === "Escape") {
                                          handleCancelEditHolidayType();
                                        }
                                      }}
                                      autoFocus
                                    />
                                  </div>
                                  {editTypeValidationError && (
                                    <div className="invalid-feedback d-block mt-1">
                                      {editTypeValidationError}
                                    </div>
                                  )}
                                </div>
                                <div className="d-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-success"
                                    onClick={handleSaveEditHolidayType}
                                    title="Save changes"
                                  >
                                    <i className="ti ti-check" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-light"
                                    onClick={handleCancelEditHolidayType}
                                    title="Cancel editing"
                                  >
                                    <i className="ti ti-x" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              // View Mode
                              <>
                                <div className="d-flex align-items-center">
                                  <i className="ti ti-tag me-2 text-primary" />
                                  <span>{type.name}</span>
                                </div>
                                <div className="d-flex gap-1">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-outline-primary"
                                    onClick={() => handleEditHolidayType(type._id, type.name)}
                                    title="Edit this type"
                                  >
                                    <i className="ti ti-edit" />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-icon btn-outline-danger"
                                    onClick={() => handleRemoveHolidayType(type._id)}
                                    title="Remove this type"
                                    disabled={deletingTypeId === type._id}
                                  >
                                    <i className="ti ti-trash" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-info mb-0">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <i className="ti ti-info-circle me-2" />
                            No holiday types found. Add custom types below or load defaults.
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={handleLoadDefaultTypes}
                            disabled={isInitializingTypes}
                          >
                            {isInitializingTypes ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Loading...
                              </>
                            ) : (
                              <>
                                <i className="ti ti-download me-1" />
                                Load Default Types
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add New Type Section */}
                <div className="border-top pt-4">
                  <h5 className="mb-3">Add New Type</h5>
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Type Name <span className="text-danger">*</span>
                        </label>
                        <div className="d-flex gap-2">
                          <input
                            type="text"
                            className={`form-control ${
                              typeValidationError ? "is-invalid" : ""
                            }`}
                            placeholder="Enter type name (e.g., Festival, Optional)"
                            value={newTypeName}
                            onChange={(e) => {
                              setNewTypeName(e.target.value);
                              setTypeValidationError("");
                            }}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleAddHolidayType();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleAddHolidayType}
                            disabled={isAddingType || !newTypeName.trim()}
                          >
                            {isAddingType ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                Adding...
                              </>
                            ) : (
                              <>
                                <i className="ti ti-plus me-1" />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                        {typeValidationError && (
                          <div className="invalid-feedback d-block">
                            {typeValidationError}
                          </div>
                        )}
                        <small className="text-muted mt-1 d-block">
                          Press Enter or click Add button to add a new holiday type
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCloseTypesModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* /Holiday Types Modal */}

      {/* View Holiday Detail Modal */}
      <HolidayDetailsModal holiday={viewingHoliday} modalId="view_holiday" />
      {/* /View Holiday Detail Modal */}
    </>
  );
};

export default Holidays;
