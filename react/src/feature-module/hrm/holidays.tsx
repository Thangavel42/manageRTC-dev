import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import { all_routes } from "../router/all_routes";
import Table from "../../core/common/dataTable/index";
import { HolidaysData } from "../../core/data/json/holidaysData";
import Footer from "../../core/common/footer";
import { useSocket } from "../../SocketContext";
import { Socket } from "socket.io-client";
import { closeModal, cleanupModals, useModalCleanup } from "../../core/hooks/useModalCleanup";
import { log } from "console";
import { LogIn } from "react-feather";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Holidays {
  _id: string;
  title: string;
  date: string;
  description: string;
  status: "active" | "inactive";
  holidayTypeId?: string;
  holidayTypeName?: string;
  repeatsEveryYear?: boolean;
}

interface HolidayType {
  _id: string;
  name: string;
  status: string;
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
  const [deleteHoliday, setDeleteHoliday] = useState<Holidays | null>(null);

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
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");

  const socket = useSocket() as Socket | null;
  
  // Use modal cleanup hook for automatic cleanup on unmount
  useModalCleanup();

  useEffect(() => {
    if (!socket) return;

    console.log("[Holidays] Setting up socket listeners");
    let isMounted = true;

    setLoading(true);

    const timeoutId = setTimeout(() => {
      if (loading && isMounted) {
        console.warn("Holidays loading timeout - showing fallback");
        setError("Holidays loading timed out. Please refresh the page.");
        setLoading(false);
      }
    }, 30000);

    // Fetch holidays
    console.log("[Holidays] Fetching holidays");
    socket.emit("hrm/holiday/get");
    
    // Fetch holiday types
    console.log("[Holidays] Fetching holiday types");
    socket.emit("hrm/holidayType/get");

    const handleAddHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        toast.success(response.message);
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
        
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
        
        // Cleanup form
        resetAddForm();
      } else {
        // Handle validation errors
        if (response.errors) {
          // Map backend errors to frontend validation errors
          const newErrors: ValidationErrors = {};
          Object.keys(response.errors).forEach(key => {
            // Find the holiday entry by checking which one is being submitted
            // For now, apply to the first entry (can be enhanced for multi-entry)
            if (holidayEntries[0]) {
              newErrors[holidayEntries[0].id] = {
                ...newErrors[holidayEntries[0].id],
                [key]: response.errors[key]
              };
            }
          });
          setValidationErrors(newErrors);
          toast.error(response.message || "Validation failed. Please check your inputs.");
        } else {
          setError(response.message || "Failed to add holiday");
          toast.error(response.message || "Failed to add holiday");
        }
        setLoading(false);
      }
    };

    const handleGetHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setHoliday(response.data);
        setResponseData(response.data);
        setError(null);
        setLoading(false);
      } else {
        setError(response.message || response.error || "Failed to get holiday");
        toast.error(error);
        setLoading(false);
      }
    };

    const handleEditHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        toast.success("Holiday updated successfully");
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
        
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
      } else {
        // Handle validation errors for edit
        if (response.errors) {
          setEditValidationErrors(response.errors);
          toast.error(response.message || "Validation failed. Please check your inputs.");
        } else {
          setError(response.message || "Failed to update holiday");
          toast.error(response.message || "Failed to update holiday");
        }
        setLoading(false);
      }
    }

    const handleDeleteHolidayResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        setResponseData(response.data);
        toast.success("Holiday deleted successfully");
        setError(null);
        setLoading(false);
        if (socket) {
          socket.emit("hrm/holiday/get");
        }
        
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
        setError(response.message || response.error || "Failed to delete holiday");
        toast.error(response.message || response.error || "Failed to delete holiday");
        setLoading(false);
      }
    }

    // Holiday Type Handlers
    const handleGetHolidayTypesResponse = (response: any) => {
      console.log("[Holiday Types] Received get response:", response);
      
      if (!isMounted) return;

      if (response.done) {
        console.log("[Holiday Types] Setting holiday types:", response.data?.length || 0, "types");
        setHolidayTypes(response.data || []);
        // Auto-initialization removed - users can manually load defaults if needed
      } else {
        console.error("[Holiday Types] Failed to fetch holiday types:", response.message);
      }
    };

    const handleAddHolidayTypeResponse = (response: any) => {
      console.log("[Holiday Types] Received add response:", response);
      
      if (!isMounted) {
        console.log("[Holiday Types] Component unmounted, ignoring response");
        return;
      }

      // Reset loading state
      setIsAddingType(false);

      if (response.done) {
        console.log("[Holiday Types] Successfully added holiday type");
        toast.success(response.message || "Holiday type added successfully");
        
        // Clear input and errors
        setNewTypeName("");
        setTypeValidationError("");
        
        // Refresh holiday types
        console.log("[Holiday Types] Refreshing holiday types list");
        socket.emit("hrm/holidayType/get");
      } else {
        console.error("[Holiday Types] Failed to add holiday type:", response);
        
        // Handle validation errors
        if (response.errors?.name) {
          setTypeValidationError(response.errors.name);
          toast.error(response.errors.name);
        } else if (response.message) {
          setTypeValidationError(response.message);
          toast.error(response.message);
        } else {
          const defaultError = "Failed to add holiday type";
          setTypeValidationError(defaultError);
          toast.error(defaultError);
        }
      }
    };

    const handleUpdateHolidayTypeResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        toast.success(response.message || "Holiday type updated successfully");
        // Refresh holiday types
        socket.emit("hrm/holidayType/get");
        setEditingTypeId(null);
        setEditingTypeName("");
        setEditTypeValidationError("");
      } else {
        if (response.errors?.name) {
          setEditTypeValidationError(response.errors.name);
        } else {
          setEditTypeValidationError(response.message || "Failed to update holiday type");
        }
      }
    };

    const handleDeleteHolidayTypeResponse = (response: any) => {
      if (!isMounted) return;

      if (response.done) {
        toast.success(response.message || "Holiday type deleted successfully");
        // Refresh holiday types
        socket.emit("hrm/holidayType/get");
        setDeletingTypeId(null);
      } else {
        toast.error(response.message || "Failed to delete holiday type");
        setDeletingTypeId(null);
      }
    };

    const handleInitializeHolidayTypesResponse = (response: any) => {
      console.log("[Holiday Types] Received initialize response:", response);
      
      if (!isMounted) return;

      // Reset initialization flag
      setIsInitializingTypes(false);

      if (response.done) {
        console.log("[Holiday Types] Default types initialized successfully");
        toast.success(response.message || "Default holiday types loaded successfully");
        // Refresh holiday types after initialization
        socket.emit("hrm/holidayType/get");
      } else {
        console.error("[Holiday Types] Failed to initialize defaults:", response.message);
        toast.error(response.message || "Failed to load default holiday types");
      }
    };

    socket.on("hrm/holiday/add-response", handleAddHolidayResponse);
    socket.on("hrm/holiday/get-response", handleGetHolidayResponse);
    socket.on("hrm/holiday/update-response", handleEditHolidayResponse);
    socket.on("hrm/holiday/delete-response", handleDeleteHolidayResponse);
    
    socket.on("hrm/holidayType/get-response", handleGetHolidayTypesResponse);
    socket.on("hrm/holidayType/add-response", handleAddHolidayTypeResponse);
    socket.on("hrm/holidayType/update-response", handleUpdateHolidayTypeResponse);
    socket.on("hrm/holidayType/delete-response", handleDeleteHolidayTypeResponse);
    socket.on("hrm/holidayType/initialize-response", handleInitializeHolidayTypesResponse);
    
    console.log("[Holidays] Socket listeners registered successfully");
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      socket.off("hrm/holiday/add-response", handleAddHolidayResponse);
      socket.off("hrm/holiday/get-response", handleGetHolidayResponse);
      socket.off("hrm/holiday/update-response", handleEditHolidayResponse);
      socket.off("hrm/holiday/delete-response", handleDeleteHolidayResponse);
      
      socket.off("hrm/holidayType/get-response", handleGetHolidayTypesResponse);
      socket.off("hrm/holidayType/add-response", handleAddHolidayTypeResponse);
      socket.off("hrm/holidayType/update-response", handleUpdateHolidayTypeResponse);
      socket.off("hrm/holidayType/delete-response", handleDeleteHolidayTypeResponse);
      socket.off("hrm/holidayType/initialize-response", handleInitializeHolidayTypesResponse);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

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

  const handleDeleteHoliday = (holidayId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!socket) {
        setError("Socket connection is not available");
        setLoading(false);
        return;
      }

      if (!holidayId) {
        setError("Holiday ID is required");
        setLoading(false);
        return;
      }

      socket.emit("hrm/holiday/delete", holidayId);
    } catch (error) {
      setError("Failed to initiate holiday deletion");
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

  // Handle submit multiple holidays
  const handleSubmitHolidays = () => {
    if (!validateAllEntries()) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    if (!socket) {
      toast.error("Socket connection is not available");
      return;
    }

    setLoading(true);

    // Submit each holiday
    holidayEntries.forEach((entry, index) => {
      const holidayData = {
        title: entry.title.trim(),
        date: entry.date,
        description: entry.description.trim(),
        status: normalizeStatus(entry.status),
        holidayTypeId: entry.holidayTypeId,
        repeatsEveryYear: entry.repeatsEveryYear
      };

      socket.emit("hrm/holiday/add", holidayData);
    });

    // Reset form after a delay to allow all submissions
    setTimeout(() => {
      resetAddForm();
      // Close modal
      const modalElement = document.getElementById("add_holiday");
      const modal = window.bootstrap?.Modal.getInstance(modalElement);
      modal?.hide();
    }, 500);
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
      setEditDate(editingHoliday.date.split('T')[0]); // Format date for input
      setEditDescription(editingHoliday.description);
      setEditStatus(editingHoliday.status);
      setEditHolidayTypeId(editingHoliday.holidayTypeId || "");
      setEditRepeatsEveryYear(editingHoliday.repeatsEveryYear || false); // Use existing value or default to false
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

  // Handle edit submit
  const handleEditSubmit = () => {
    if (!validateEditForm()) {
      toast.error("Please fix all validation errors before submitting");
      return;
    }

    if (!socket || !editingHoliday) {
      toast.error("Socket connection is not available");
      return;
    }

    setLoading(true);

    const updatedHoliday = {
      _id: editingHoliday._id,
      title: editTitle.trim(),
      date: editDate,
      description: editDescription.trim(),
      status: normalizeStatus(editStatus),
      holidayTypeId: editHolidayTypeId,
      repeatsEveryYear: editRepeatsEveryYear
    };

    socket.emit("hrm/holiday/update", updatedHoliday);

    // Close modal
    const modalElement = document.getElementById("edit_holiday");
    const modal = window.bootstrap?.Modal.getInstance(modalElement);
    modal?.hide();
    setEditingHoliday(null);
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
  const handleAddHolidayType = () => {
    console.log("[Holiday Types] Adding new holiday type:", newTypeName);
    
    // Clear any previous error
    setTypeValidationError("");

    // Validate type name
    const trimmedName = newTypeName.trim();
    
    if (!trimmedName) {
      setTypeValidationError("Holiday type name is required");
      return;
    }

    if (!socket) {
      const errorMsg = "Socket connection is not available";
      console.error("[Holiday Types]", errorMsg);
      setTypeValidationError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Set loading state
    setIsAddingType(true);
    
    console.log("[Holiday Types] Emitting hrm/holidayType/add event with data:", {
      name: trimmedName,
      status: normalizeStatus("Active")
    });

    // Send to backend
    socket.emit("hrm/holidayType/add", {
      name: trimmedName,
      status: normalizeStatus("Active")
    });
  };

  const handleRemoveHolidayType = (typeId: string) => {
    if (!socket) {
      toast.error("Socket connection is not available");
      return;
    }

    setDeletingTypeId(typeId);
    socket.emit("hrm/holidayType/delete", typeId);
  };

  const handleEditHolidayType = (typeId: string, typeName: string) => {
    setEditingTypeId(typeId);
    setEditingTypeName(typeName);
    setEditTypeValidationError("");
  };

  const handleSaveEditHolidayType = () => {
    // Clear any previous error
    setEditTypeValidationError("");

    // Validate type name
    const trimmedName = editingTypeName.trim();
    
    if (!trimmedName) {
      setEditTypeValidationError("Holiday type name is required");
      return;
    }

    if (!socket || !editingTypeId) {
      toast.error("Socket connection is not available");
      return;
    }

    // Send to backend
    socket.emit("hrm/holidayType/update", {
      _id: editingTypeId,
      name: trimmedName,
      status: normalizeStatus("Active")
    });
  };

  const handleCancelEditHolidayType = () => {
    setEditingTypeId(null);
    setEditingTypeName("");
    setEditTypeValidationError("");
  };

  const handleLoadDefaultTypes = () => {
    if (!socket) {
      toast.error("Socket connection is not available");
      return;
    }

    if (isInitializingTypes) {
      console.log("[Holiday Types] Already initializing, skipping duplicate request");
      return;
    }

    console.log("[Holiday Types] Manually loading default types");
    setIsInitializingTypes(true);
    socket.emit("hrm/holidayType/initialize");
  };

  const handleCloseTypesModal = () => {
    setShowTypesModal(false);
    setNewTypeName("");
    setTypeValidationError("");
    setEditingTypeId(null);
    setEditingTypeName("");
    setEditTypeValidationError("");
  };

  // Filter reset function
  const handleResetFilters = () => {
    setFilterType("");
    setFilterFromDate("");
    setFilterToDate("");
  };

  // Validate date range
  const validateDateRange = () => {
    if (filterFromDate && filterToDate) {
      const fromDate = new Date(filterFromDate);
      const toDate = new Date(filterToDate);
      if (fromDate > toDate) {
        toast.error("'From' date cannot be after 'To' date");
        return false;
      }
    }
    return true;
  };

  // Effect to validate date range when dates change
  useEffect(() => {
    validateDateRange();
  }, [filterFromDate, filterToDate]);

  // Filter holidays based on selected filters
  const getFilteredHolidays = () => {
    let filtered = [...holiday];

    // Filter by type
    if (filterType) {
      filtered = filtered.filter(h => h.holidayTypeId === filterType);
    }

    // Filter by date range
    if (filterFromDate || filterToDate) {
      filtered = filtered.filter(h => {
        if (!h.date) return false;
        const holidayDate = new Date(h.date);
        
        // Check from date
        if (filterFromDate) {
          const fromDate = new Date(filterFromDate);
          if (holidayDate < fromDate) return false;
        }
        
        // Check to date
        if (filterToDate) {
          const toDate = new Date(filterToDate);
          if (holidayDate > toDate) return false;
        }
        
        return true;
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
        const d = new Date(date);
        return d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
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
      render: (text: string) => (
        <span className={`badge ${((text === 'active') || (text === 'Active')) ? 'badge-success' : 'badge-danger'}   d-inline-flex align-items-center badge-sm`}>
          <i className="ti ti-point-filled me-1" />
          {text}
        </span>
      ),
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
            onClick={() => setDeleteHoliday(holiday)}
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
          <div className="card">
            <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
              <h5>Holidays List</h5>
              
              {/* Filters Section */}
              <div className="d-flex align-items-center flex-wrap gap-2">
                {/* Type Filter */}
                <div className="input-icon-end position-relative">
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: "150px" }}
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="">All Types</option>
                    {holidayTypes.map((type) => (
                      <option key={type._id} value={type._id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Filter - From */}
                <div className="input-icon-end position-relative">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ minWidth: "150px" }}
                    placeholder="From"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                  />
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-7" />
                  </span>
                </div>

                {/* Date Range Separator */}
                <span className="text-muted">-</span>

                {/* Date Range Filter - To */}
                <div className="input-icon-end position-relative">
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    style={{ minWidth: "150px" }}
                    placeholder="To"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                  />
                  <span className="input-icon-addon">
                    <i className="ti ti-calendar text-gray-7" />
                  </span>
                </div>

                {/* Reset Filter Button */}
                {(filterType || filterFromDate || filterToDate) && (
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
                
                <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
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
                            <input
                              type="date"
                              className={`form-control ${
                                validationErrors[entry.id]?.date ? "is-invalid" : ""
                              }`}
                              value={entry.date}
                              onChange={(e) =>
                                updateHolidayEntry(entry.id, "date", e.target.value)
                              }
                            />
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
                            <select
                              className={`form-select ${
                                validationErrors[entry.id]?.status ? "is-invalid" : ""
                              }`}
                              value={entry.status}
                              onChange={(e) =>
                                updateHolidayEntry(entry.id, "status", e.target.value)
                              }
                            >
                              <option value="">Select Status</option>
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
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
                            <select
                              className={`form-select ${
                                validationErrors[entry.id]?.holidayTypeId ? "is-invalid" : ""
                              }`}
                              value={entry.holidayTypeId}
                              onChange={(e) =>
                                updateHolidayEntry(entry.id, "holidayTypeId", e.target.value)
                              }
                            >
                              <option value="">Select Type</option>
                              {holidayTypes.map((type) => (
                                <option key={type._id} value={type._id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
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
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Holidays"}
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
                    <input
                      type="date"
                      className={`form-control ${
                        editValidationErrors.date ? "is-invalid" : ""
                      }`}
                      value={editDate}
                      onChange={(e) => {
                        setEditDate(e.target.value);
                        clearEditError("date");
                      }}
                    />
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
                    <select
                      className={`form-select ${
                        editValidationErrors.status ? "is-invalid" : ""
                      }`}
                      value={editStatus}
                      onChange={(e) => {
                        setEditStatus(e.target.value);
                        clearEditError("status");
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
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
                    <select
                      className={`form-select ${
                        editValidationErrors.holidayTypeId ? "is-invalid" : ""
                      }`}
                      value={editHolidayTypeId}
                      onChange={(e) => {
                        setEditHolidayTypeId(e.target.value);
                        clearEditError("holidayTypeId");
                      }}
                    >
                      <option value="">Select Type</option>
                      {holidayTypes.map((type) => (
                        <option key={type._id} value={type._id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
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
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Holiday"}
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
                {deleteHoliday
                  ? `Are you sure you want to delete holiday "${deleteHoliday.title}"? This cannot be undone.`
                  : "You want to delete all the marked holidays, this can't be undone once you delete."}
              </p>
              <div className="d-flex justify-content-center">
                <button
                  className="btn btn-light me-3"
                  data-bs-dismiss="modal"
                  onClick={() => setDeleteHoliday(null)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  data-bs-dismiss="modal"
                  onClick={() => {
                    if (deleteHoliday) {
                      handleDeleteHoliday(deleteHoliday._id);
                    }
                    setDeleteHoliday(null);
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
    </>
  );
};

export default Holidays;