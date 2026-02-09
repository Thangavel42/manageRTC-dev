import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Socket } from "socket.io-client";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import CommonSelect from "../../core/common/commonSelect";
import Table from "../../core/common/dataTable/index";
import EmployeeNameCell from "../../core/common/EmployeeNameCell";
import Footer from "../../core/common/footer";
import { useModalCleanup } from "../../core/hooks/useModalCleanup";
import PromotionDetailsModal from "../../core/modals/PromotionDetailsModal";
import { useSocket } from "../../SocketContext";
import { all_routes } from "../router/all_routes";
// REST API Hooks for Promotions and Employees
import { useEmployeesREST } from "../../hooks/useEmployeesREST";
import { usePromotionsREST, type Promotion as APIPromotion } from "../../hooks/usePromotionsREST";

interface Employee {
  id: string;
  name: string;
  email: string;
  image: string;
  department: string;
  departmentId: string;
  designation: string;
  designationId: string;
  employeeId: string;
}

interface Department {
  _id: string;
  department: string;
}

interface Designation {
  id: string;
  name: string;
  level?: number;
  departmentId?: string;
}

interface Promotion {
  _id: string;
  promotionId: string; // Required field
  employeeId: string; // Required field
  employee: {
    id: string;
    name: string;
    image: string;
    employeeId?: string; // Add employeeId to the interface
  };
  promotionFrom: {
    departmentId: string;
    designationId: string;
    department: {
      id: string;
      name: string;
    };
    designation: {
      id: string;
      name: string;
    };
  };
  promotionTo: {
    departmentId: string;
    designationId: string;
    department: {
      id: string;
      name: string;
    };
    designation: {
      id: string;
      name: string;
    };
  };
  promotionDate: string;
  promotionType?: string;
  reason?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'applied' | 'cancelled' | 'rejected'; // Required field
  createdAt: string; // Required field
  updatedAt: string; // Required field
}

interface PromotionStats {
  total: number;
  pending: number;
  approved: number;
  effectiveThisMonth: number;
}

const Promotion = () => {
  const socket = useSocket() as Socket | null;
  const { cleanupModals } = useModalCleanup();

  // REST API Hook - provides data and CRUD operations
  const {
    promotions: apiPromotions,
    stats: apiStats,
    departments: apiDepartments,
    designations: apiDesignations,
    loading: apiLoading,
    fetchPromotions,
    fetchStats,
    fetchDepartments,
    fetchDesignations,
    createPromotion,
    updatePromotion,
    deletePromotion,
    applyPromotion,
    cancelPromotion,
  } = usePromotionsREST();

  // REST API Hook for Employees (for fetching employees by department)
  const { fetchEmployees: fetchEmployeesByDept } = useEmployeesREST();

  // State management (keeping local state for UI-specific needs)
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PromotionStats>({
    total: 0,
    pending: 0,
    approved: 0,
    effectiveThisMonth: 0,
  });

  // Form state for Add Promotion
  const [newPromotion, setNewPromotion] = useState({
    sourceDepartmentId: "", // For filtering employees
    employeeId: "",
    targetDepartmentId: "", // Department To - where employee is being promoted
    designationToId: "",
    promotionDate: null as Dayjs | null,
    promotionType: "Regular",
  });

  // Form state for Edit Promotion
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [editForm, setEditForm] = useState({
    departmentId: "",
    designationToId: "",
    promotionDate: null as Dayjs | null,
    promotionType: "Regular",
  });

  // State for deletion
  const [deletingPromotionId, setDeletingPromotionId] = useState<string | null>(null);

  // State for viewing promotion details - use API type
  const [viewingPromotion, setViewingPromotion] = useState<APIPromotion | null>(null);

  // Validation errors for Add Promotion
  const [addErrors, setAddErrors] = useState({
    sourceDepartmentId: "",
    employeeId: "",
    targetDepartmentId: "",
    designationToId: "",
    promotionDate: "",
    promotionType: "",
  });

  // Track employees already promoted (for duplicate check)
  const [promotedEmployeeIds, setPromotedEmployeeIds] = useState<Set<string>>(new Set());

  // Validation errors for Edit Promotion
  const [editErrors, setEditErrors] = useState({
    departmentId: "",
    designationToId: "",
    promotionDate: "",
    promotionType: "",
  });

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  /**
   * Reliable modal closing function with multiple fallback methods
   * Does not depend on Bootstrap Modal instance
   */
  const closeModalReliably = (modalId: string) => {
    console.log("[Promotion] closeModalReliably called for:", modalId);

    try {
      // Method 1: Try Bootstrap Modal API if available via window.bootstrap
      const modalElement = document.getElementById(modalId);
      if (modalElement && typeof (window as any).bootstrap !== 'undefined' && (window as any).bootstrap.Modal) {
        const modalInstance = (window as any).bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          console.log("[Promotion] Closing modal using Bootstrap instance");
          modalInstance.hide();
          return;
        }
      }
    } catch (error) {
      console.log("[Promotion] Bootstrap Modal method failed:", error);
    }

    try {
      // Method 2: Click the close button
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        const closeButton = modalElement.querySelector('[data-bs-dismiss="modal"]') as HTMLElement;
        if (closeButton) {
          console.log("[Promotion] Closing modal by clicking close button");
          closeButton.click();
          return;
        }
      }
    } catch (error) {
      console.log("[Promotion] Close button method failed:", error);
    }

    try {
      // Method 3: Manual DOM manipulation as last resort
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        console.log("[Promotion] Closing modal using manual DOM manipulation");
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        modalElement.removeAttribute('role');

        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }

        // Remove modal-open class from body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
    } catch (error) {
      console.error("[Promotion] All modal closing methods failed:", error);
    }
  };

  // Calculate stats from current promotion data
  const calculateStats = useCallback(() => {
    if (promotions.length > 0) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      const calculatedStats: PromotionStats = {
        total: promotions.length,
        pending: 0, // Since Promotion interface doesn't have status, assume none pending
        approved: promotions.length, // Since Promotion interface doesn't have status, assume all approved
        effectiveThisMonth: promotions.filter(p => {
          const promDate = new Date(p.promotionDate);
          return promDate.getMonth() === currentMonth && promDate.getFullYear() === currentYear;
        }).length,
      };
      setStats(calculatedStats);
      console.log("[Promotion] Calculated stats:", calculatedStats);
    }
  }, [promotions]);

  // Fetch initial data using REST API
  useEffect(() => {
    console.log("[Promotion] Fetching initial data via REST API...");

    // Fetch data via REST API
    const fetchInitialData = async () => {
      // Fetch promotions, departments, designations, and stats in parallel
      await Promise.all([
        (async () => {
          await fetchPromotions();
        })(),
        (async () => {
          await fetchDepartments();
        })(),
        (async () => {
          await fetchDesignations();
        })(),
        (async () => {
          await fetchStats();
        })(),
      ]);

      setLoading(false);
    };

    fetchInitialData();

    // Setup Socket.IO listeners for real-time broadcasts (REST API for CRUD + Socket.IO for real-time)
    // Setup Socket.IO listeners for real-time broadcasts only
    // REST API handles data fetching, Socket.IO handles real-time updates

    const handlePromotionCreated = (promotion: Promotion) => {
      console.log("[Promotion] Real-time: Promotion created:", promotion);
      // Refetch from REST to ensure consistency
      fetchPromotions();
      toast.success("Promotion added successfully");
    };

    const handlePromotionUpdated = (promotion: Promotion) => {
      console.log("[Promotion] Real-time: Promotion updated:", promotion);
      // Refetch from REST to ensure consistency
      fetchPromotions();
      toast.success("Promotion updated successfully");
    };

    const handlePromotionDeleted = (data: { promotionId: string }) => {
      console.log("[Promotion] Real-time: Promotion deleted:", data);
      // Refetch from REST to ensure consistency
      fetchPromotions();
      toast.success("Promotion deleted successfully");
    };

    // Only set up socket listeners if socket is available
    if (socket) {
      socket.on("promotion:created", handlePromotionCreated);
      socket.on("promotion:updated", handlePromotionUpdated);
      socket.on("promotion:deleted", handlePromotionDeleted);
    }

    // Cleanup listeners on unmount
    return () => {
      if (socket) {
        socket.off("promotion:created", handlePromotionCreated);
        socket.off("promotion:updated", handlePromotionUpdated);
        socket.off("promotion:deleted", handlePromotionDeleted);
      }
      cleanupModals();
    };
  }, [socket, cleanupModals, fetchPromotions, fetchDepartments, fetchDesignations, fetchStats]);

  // Sync REST API data to local state
  useEffect(() => {
    const transformedPromotions = (apiPromotions || []).map(promo => ({
      _id: promo._id,
      promotionId: promo.promotionId,
      employeeId: promo.employeeId,
      status: promo.status,
      createdAt: promo.createdAt,
      updatedAt: promo.updatedAt,
      promotionDate: promo.promotionDate,
      promotionType: promo.promotionType,
      reason: promo.reason,
      notes: promo.notes,
      employee: promo.employeeId ? {
        id: promo.employeeId,
        name: promo.employeeName || 'Unknown',
        image: '',
        employeeId: promo.employeeId,
      } : { id: '', name: 'Unknown', image: '', employeeId: '' },
      promotionFrom: {
        departmentId: promo.promotionFrom?.departmentId || '',
        designationId: promo.promotionFrom?.designationId || '',
        department: {
          id: promo.promotionFrom?.departmentId || '',
          name: promo.promotionFrom?.department || '',
        },
        designation: {
          id: promo.promotionFrom?.designationId || '',
          name: promo.promotionFrom?.designation || '',
        },
      },
      promotionTo: {
        departmentId: promo.promotionTo?.departmentId || '',
        designationId: promo.promotionTo?.designationId || '',
        department: {
          id: promo.promotionTo?.departmentId || '',
          name: promo.promotionTo?.department || '',
        },
        designation: {
          id: promo.promotionTo?.designationId || '',
          name: promo.promotionTo?.designation || '',
        },
      },
    }));

    setPromotions(transformedPromotions as any);
    setDepartments(apiDepartments || []);

    const transformedDesignations = (apiDesignations || []).map(designation => ({
      id: designation._id,
      name: designation.designation,
      _id: designation._id,
      designation: designation.designation,
    }));
    setDesignations(transformedDesignations as any);

    if (apiStats) {
      setStats({
        total: apiStats.total || 0,
        pending: apiStats.pending || 0,
        approved: apiStats.approved || 0,
        effectiveThisMonth: apiStats.due || 0,
      });
    }
    setLoading(apiLoading);
  }, [apiPromotions, apiDepartments, apiDesignations, apiStats, apiLoading]);

  // Calculate stats when promotion data changes
  useEffect(() => {
    calculateStats();
  }, [promotions, calculateStats]);

  // Handle modal open events to reset errors
  useEffect(() => {
    const addModalElement = document.getElementById("new_promotion");
    const editModalElement = document.getElementById("edit_promotion");

    const handleAddModalOpen = () => {
      console.log("[Promotion] Add modal opened - clearing errors and resetting form");

      // Clear employees list to force fresh fetch
      setEmployees([]);

      // Clear errors
      setAddErrors({
        sourceDepartmentId: "",
        employeeId: "",
        targetDepartmentId: "",
        designationToId: "",
        promotionDate: "",
        promotionType: "",
      });

      // Reset form to ensure clean state
      setNewPromotion({
        sourceDepartmentId: "",
        employeeId: "",
        targetDepartmentId: "",
        designationToId: "",
        promotionDate: null,
        promotionType: "Regular",
      });

      // Clear designations
      setDesignations([]);
    };

    const handleEditModalOpen = () => {
      console.log("[Promotion] Edit modal opened - errors already cleared in handleEditClick");
    };

    if (addModalElement) {
      addModalElement.addEventListener("shown.bs.modal", handleAddModalOpen);
    }

    if (editModalElement) {
      editModalElement.addEventListener("shown.bs.modal", handleEditModalOpen);
    }

    return () => {
      if (addModalElement) {
        addModalElement.removeEventListener("shown.bs.modal", handleAddModalOpen);
      }
      if (editModalElement) {
        editModalElement.removeEventListener("shown.bs.modal", handleEditModalOpen);
      }
    };
  }, []);

  // Fetch employees by department (using REST API)
  const fetchEmployeesByDepartment = React.useCallback(async (departmentId: string) => {
    if (!departmentId) {
      console.log("[Promotion] fetchEmployeesByDepartment - departmentId missing", { departmentId });
      setEmployees([]);
      return;
    }
    console.log("[Promotion] Fetching employees for department via REST API:", departmentId, "type:", typeof departmentId);
    try {
      // Use the employees REST hook to fetch employees by department
      await fetchEmployeesByDept({ departmentId });
      // Note: The employees state will be updated by the socket listener for real-time updates
      // or we can use the returned data from the hook directly if needed
    } catch (error) {
      console.error("[Promotion] Error fetching employees by department:", error);
      setEmployees([]);
    }
  }, [fetchEmployeesByDept]);

  // Fetch designations by department (using REST API)
  const fetchDesignationsByDepartment = React.useCallback(async (departmentId: string) => {
    if (!departmentId) {
      console.log("[Promotion] fetchDesignationsByDepartment - departmentId missing", { departmentId });
      setDesignations([]);
      return;
    }
    console.log("[Promotion] Fetching designations for department via REST API:", departmentId, "type:", typeof departmentId);
    try {
      // Use the promotions REST hook to fetch designations by department
      await fetchDesignations(departmentId);
      // Note: The designations state will be populated by the hook
    } catch (error) {
      console.error("[Promotion] Error fetching designations by department:", error);
      setDesignations([]);
    }
  }, [fetchDesignations]);

  // Handle department change in Add form
  const handleAddDepartmentChange = (option: any) => {
    console.log("[Promotion] Add source department selected - _id:", option?.value);
    setNewPromotion({
      ...newPromotion,
      sourceDepartmentId: option?.value || "",
      employeeId: "", // Reset employee when department changes
      targetDepartmentId: "", // Reset target department
      designationToId: "", // Reset designation when department changes
    });
    // Clear all dependent field errors
    setAddErrors(prev => ({ ...prev, sourceDepartmentId: "", employeeId: "", targetDepartmentId: "", designationToId: "" }));
    if (option?.value) {
      fetchEmployeesByDepartment(option.value);
      // Do NOT fetch designations here - they depend on target department only
    } else {
      setEmployees([]);
    }
    // Clear designations since target department is reset
    setDesignations([]);
  };

  // Handle employee change in Add form
  const handleAddEmployeeChange = (option: any) => {
    console.log("[Promotion] Add employee selected - id:", option?.value);
    const employee = employees.find(emp => emp.id === option?.value);

    const newTargetDeptId = employee?.departmentId || "";
    console.log("[Promotion] Auto-populating target department:", newTargetDeptId);

    setNewPromotion({
      ...newPromotion,
      employeeId: option?.value || "",
      targetDepartmentId: newTargetDeptId, // Auto-populate with employee's current department
      designationToId: "", // Reset designation when employee changes
    });

    // Clear employee, department, and designation errors
    setAddErrors(prev => ({ ...prev, employeeId: "", targetDepartmentId: "", designationToId: "" }));

    // Fetch designations for the auto-populated target department
    if (newTargetDeptId) {
      console.log("[Promotion] Fetching designations for auto-populated department:", newTargetDeptId);
      fetchDesignationsByDepartment(newTargetDeptId);
    } else {
      console.log("[Promotion] No department to fetch designations for, clearing designations");
      setDesignations([]);
    }
  };

  // Handle target department change in Add form
  const handleAddTargetDepartmentChange = (option: any) => {
    console.log("[Promotion] Add target department selected - _id:", option?.value);
    setNewPromotion({
      ...newPromotion,
      targetDepartmentId: option?.value || "",
      designationToId: "", // Reset designation when target department changes
    });
    // Clear target department and designation errors
    setAddErrors(prev => ({ ...prev, targetDepartmentId: "", designationToId: "" }));
    if (option?.value) {
      console.log("[Promotion] Fetching designations for target department:", option.value);
      // Clear existing designations first to show loading state
      setDesignations([]);
      // Fetch designations for the target department
      fetchDesignationsByDepartment(option.value);
    } else {
      console.log("[Promotion] No target department selected, clearing designations");
      setDesignations([]);
    }
  };

  // Handle designation change in Add form
  const handleAddDesignationChange = (option: any) => {
    console.log("[Promotion] Add designation selected - id:", option?.value);
    setNewPromotion({
      ...newPromotion,
      designationToId: option?.value || "",
    });
    // Clear designation error
    setAddErrors(prev => ({ ...prev, designationToId: "" }));
  };

  // Handle promotion type change in Add form
  const handleAddPromotionTypeChange = (option: any) => {
    setNewPromotion({
      ...newPromotion,
      promotionType: option?.value || "Regular",
    });
    // Clear promotion type error
    setAddErrors(prev => ({ ...prev, promotionType: "" }));
  };

  // Handle promotion date change in Add form
  const handleAddPromotionDateChange = (date: Dayjs | null) => {
    setNewPromotion({
      ...newPromotion,
      promotionDate: date,
    });
    // Clear date error
    setAddErrors(prev => ({ ...prev, promotionDate: "" }));
  };

  // Validate Add Promotion form
  const validateAddForm = (): boolean => {
    const errors = {
      sourceDepartmentId: "",
      employeeId: "",
      targetDepartmentId: "",
      designationToId: "",
      promotionDate: "",
      promotionType: "",
    };

    let isValid = true;

    if (!newPromotion.sourceDepartmentId || newPromotion.sourceDepartmentId === "") {
      errors.sourceDepartmentId = "Please select a department";
      isValid = false;
    }

    if (!newPromotion.employeeId || newPromotion.employeeId === "") {
      errors.employeeId = "Please select an employee";
      isValid = false;
    } else {
      // Check for duplicate promotion
      if (promotedEmployeeIds.has(newPromotion.employeeId)) {
        errors.employeeId = "This employee already has an existing promotion";
        isValid = false;
      }
    }

    if (!newPromotion.targetDepartmentId || newPromotion.targetDepartmentId === "") {
      errors.targetDepartmentId = "Please select a target department";
      isValid = false;
    }

    if (!newPromotion.designationToId || newPromotion.designationToId === "") {
      errors.designationToId = "Please select a promotion designation";
      isValid = false;
    } else if (newPromotion.employeeId) {
      // Check if promoting to same designation (regardless of department change)
      const employee = employees.find(emp => emp.id === newPromotion.employeeId);
      if (employee && employee.designationId === newPromotion.designationToId) {
        // If same designation, check if it's also the same department
        if (employee.departmentId === newPromotion.targetDepartmentId) {
          errors.designationToId = "Cannot promote to the same department and designation. Please select a different department or designation.";
        } else {
          // Same designation but different department - this is a lateral move, which may be valid
          // But we should still warn or prevent based on business rules
          errors.designationToId = "Employee already holds this designation in another department. Please select a different designation for promotion.";
        }
        isValid = false;
      }
    }

    if (!newPromotion.promotionType || newPromotion.promotionType === "") {
      errors.promotionType = "Please select a promotion type";
      isValid = false;
    }

    if (!newPromotion.promotionDate) {
      errors.promotionDate = "Please select a promotion date";
      isValid = false;
    }

    setAddErrors(errors);
    return isValid;
  };

  // Validate Edit Promotion form
  const validateEditForm = (): boolean => {
    const errors = {
      departmentId: "",
      designationToId: "",
      promotionDate: "",
      promotionType: "",
    };

    let isValid = true;

    if (!editForm.departmentId || editForm.departmentId === "") {
      errors.departmentId = "Please select a department";
      isValid = false;
    }

    if (!editForm.designationToId || editForm.designationToId === "") {
      errors.designationToId = "Please select a promotion designation";
      isValid = false;
    }

    if (!editForm.promotionType || editForm.promotionType === "") {
      errors.promotionType = "Please select a promotion type";
      isValid = false;
    }

    if (!editForm.promotionDate) {
      errors.promotionDate = "Please select a promotion date";
      isValid = false;
    }

    setEditErrors(errors);
    return isValid;
  };

  // Handle add promotion via REST API
  const handleAddPromotion = async () => {
    console.log("[Promotion] handleAddPromotion called (REST API)", { newPromotion });

    // Validate form first
    if (!validateAddForm()) {
      return;
    }

    // Validation: Ensure required IDs exist
    if (!newPromotion.employeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!newPromotion.targetDepartmentId) {
      toast.error("Please select a target department");
      return;
    }

    if (!newPromotion.designationToId) {
      toast.error("Please select a target designation");
      return;
    }

    // Prepare data for REST API - map to the expected format
    const selectedEmp = employees.find(e => e.id === newPromotion.employeeId);
    const promotionData = {
      employeeId: newPromotion.employeeId,
      promotionFrom: {
        departmentId: newPromotion.sourceDepartmentId || '',
        designationId: selectedEmp?.designationId || '',
      },
      promotionTo: {
        departmentId: newPromotion.targetDepartmentId,
        designationId: newPromotion.designationToId
      },
      promotionDate: newPromotion.promotionDate ? dayjs(newPromotion.promotionDate).format('YYYY-MM-DD') : undefined,
      promotionType: (newPromotion.promotionType || 'promotion') as 'promotion' | 'demotion' | 'transfer',
    };

    console.log("[Promotion] Adding promotion via REST API:", promotionData);

    try {
      // Call REST API to create promotion
      const result = await createPromotion(promotionData);

      if (result.success) {
        // Close modal with delay for animation
        setTimeout(() => {
          closeModalReliably("new_promotion");

          // Reset form after modal closing animation
          setTimeout(() => {
            setNewPromotion({
              sourceDepartmentId: "",
              employeeId: "",
              targetDepartmentId: "",
              designationToId: "",
              promotionDate: null,
              promotionType: "Regular",
            });
            setAddErrors({
              sourceDepartmentId: "",
              employeeId: "",
              targetDepartmentId: "",
              designationToId: "",
              promotionDate: "",
              promotionType: "",
            });
            setEmployees([]);
            setDesignations([]);
          }, 300);
        }, 100);
      } else {
        // Handle errors from REST API
        const errorMessage = result.error?.message || "Failed to add promotion";
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error("[Promotion] Error creating promotion:", error);
      toast.error(error.message || "Failed to add promotion. Please try again.");
    }
  };

  // Handle edit promotion
  const handleEditClick = (promotion: Promotion) => {
    console.log("[Promotion] Edit clicked:", promotion);

    // Validate promotion structure before proceeding
    if (!promotion.promotionTo?.department?.id || !promotion.promotionTo?.designation?.id) {
      toast.error("Invalid promotion data. Please refresh the page and try again.");
      console.error("[Promotion] Invalid promotion structure:", promotion);
      return;
    }

    setEditingPromotion(promotion);
    setEditForm({
      departmentId: promotion.promotionTo.department.id,
      designationToId: promotion.promotionTo.designation.id,
      promotionDate: dayjs(promotion.promotionDate),
      promotionType: promotion.promotionType || "Regular",
    });
    // Clear edit errors when opening modal
    setEditErrors({
      departmentId: "",
      designationToId: "",
      promotionDate: "",
      promotionType: "",
    });
    // Fetch designations for the promotion's target department
    if (promotion.promotionTo.department.id) {
      fetchDesignationsByDepartment(promotion.promotionTo.department.id);
    }
  };

  // Handle view promotion details
  const handleViewClick = (promotion: Promotion) => {
    console.log("[Promotion] View clicked:", promotion);
    // Find the original API promotion data
    const apiPromo = apiPromotions.find(p => p._id === promotion._id);
    if (apiPromo) {
      setViewingPromotion(apiPromo);
    } else {
      console.error("[Promotion] Could not find API promotion data");
      toast.error("Unable to load promotion details");
    }
  };

  const handleUpdatePromotion = async () => {
    console.log("[Promotion] handleUpdatePromotion called", { editForm, editingPromotion });

    // Validate form first
    if (!validateEditForm()) {
      return;
    }

    if (!editingPromotion) {
      toast.error("No promotion selected");
      return;
    }

    // Validation: Ensure required IDs exist
    if (!editForm.departmentId) {
      toast.error("Please select a department");
      return;
    }

    if (!editForm.designationToId) {
      toast.error("Please select a designation");
      return;
    }

    // Prepare data for REST API - map to the expected format
    const updateData = {
      promotionTo: {
        departmentId: editForm.departmentId,
        designationId: editForm.designationToId
      },
      promotionDate: editForm.promotionDate ? dayjs(editForm.promotionDate).format('YYYY-MM-DD') : undefined,
      promotionType: editForm.promotionType as 'promotion' | 'demotion' | 'transfer',
    };

    console.log("[Promotion] Updating promotion via REST API:", { promotionId: editingPromotion._id, update: updateData });

    try {
      // Call REST API to update promotion
      const result = await updatePromotion(editingPromotion._id, updateData);

      if (result) {
        // Success! Show toast first
        toast.success("Promotion updated successfully!");

        // Close modal with delay for animation
        setTimeout(() => {
          closeModalReliably("edit_promotion");

          // Reset form after modal closing animation
          setTimeout(() => {
            setEditingPromotion(null);
            setEditForm({
              departmentId: "",
              designationToId: "",
              promotionDate: null,
              promotionType: "Regular",
            });
            setEditErrors({
              departmentId: "",
              designationToId: "",
              promotionDate: "",
              promotionType: "",
            });
            setDesignations([]);
          }, 300);
        }, 100);
      } else {
        // Handle errors from REST API
        const errorMsg = "Failed to update promotion";
        console.error("[Promotion] Update failed:", result);

        // Map backend errors to form fields for inline display
        const newErrors = {
          departmentId: "",
          designationToId: "",
          promotionDate: "",
          promotionType: "",
        };

        // Check error message and set appropriate field error
        const errorLower = errorMsg.toLowerCase();
        if (errorLower.includes("designation") && errorLower.includes("different")) {
          newErrors.designationToId = errorMsg;
        } else if (errorLower.includes("designation")) {
          newErrors.designationToId = errorMsg;
        } else if (errorLower.includes("department")) {
          newErrors.departmentId = errorMsg;
        } else if (errorLower.includes("date")) {
          newErrors.promotionDate = errorMsg;
        } else if (errorLower.includes("type")) {
          newErrors.promotionType = errorMsg;
        } else {
          // Generic error - show as toast only
          toast.error(errorMsg);
        }

        // Set inline errors if any field-specific error was detected
        if (Object.values(newErrors).some(err => err !== "")) {
          setEditErrors(newErrors);
        }
      }
    } catch (error: any) {
      console.error("[Promotion] Error updating promotion:", error);
      toast.error(error.message || "Failed to update promotion. Please try again.");
    }
  };

  // Handle delete promotion
  const handleDeleteClick = (promotionId: string) => {
    console.log("[Promotion] Delete clicked:", promotionId);
    setDeletingPromotionId(promotionId);
  };

  const confirmDelete = async () => {
    if (!deletingPromotionId) {
      toast.error("No promotion selected");
      return;
    }

    console.log("[Promotion] Deleting promotion via REST API:", deletingPromotionId);

    try {
      // Call REST API to delete promotion
      const result = await deletePromotion(deletingPromotionId);

      if (result) {
        // Show toast first
        toast.success("Promotion deleted successfully!");

        // Close modal with delay for animation
        setTimeout(() => {
          closeModalReliably("delete_modal");
          setDeletingPromotionId(null);
        }, 100);
      } else {
        // Handle errors from REST API
        const errorMessage = "Failed to delete promotion";
        toast.error(errorMessage);
        console.error("[Promotion] Delete failed:", result);
      }
    } catch (error: any) {
      console.error("[Promotion] Error deleting promotion:", error);
      toast.error(error.message || "Failed to delete promotion. Please try again.");
    }
  };

  // Convert departments to select options
  const departmentOptions = departments.map(dept => ({
    value: dept._id,
    label: dept.department
  }));

  // Convert employees to select options
  const employeeOptions = employees.length > 0
    ? employees.map(emp => ({
      value: emp.id,
      label: `${emp.employeeId} - ${emp.name}`,
    }))
    : [{ value: "", label: departments.length === 0 ? "Loading departments..." : "Select a department first" }];

  // Convert designations to select options - depends ONLY on target department
  const designationOptions = designations.length > 0
    ? designations.map(des => ({
      value: des.id,
      label: des.name,
    }))
    : [{ value: "", label: !newPromotion.targetDepartmentId ? "Select target department first" : (loading ? "Loading designations..." : "No designations available in this department") }];

  // Promotion type options
  const promotionTypeOptions = [
    { value: "Performance Based", label: "Performance Based" },
    { value: "Experience Based", label: "Experience Based" },
    { value: "Qualification Based", label: "Qualification Based" },
    { value: "Special Achievement", label: "Special Achievement" },
    { value: "Regular", label: "Regular" },
    { value: "Other", label: "Other" },
  ];

  // Get designation from based on selected employee for add form
  const getDesignationFrom = () => {
    if (newPromotion.employeeId) {
      const employee = employees.find(emp => emp.id === newPromotion.employeeId);
      return employee ? employee.designation : "";
    }
    return "";
  };

  // Get department from based on selected employee for add form
  const getDepartmentFrom = () => {
    if (newPromotion.employeeId) {
      const employee = employees.find(emp => emp.id === newPromotion.employeeId);
      return employee ? employee.department : "";
    }
    return "";
  };

  const data = promotions
    .filter(promotion => {
      // Filter out promotions with incomplete data structure
      return promotion?.employee?.id &&
             promotion?.promotionFrom?.department?.name &&
             promotion?.promotionFrom?.designation?.name &&
             promotion?.promotionTo?.designation?.name;
    })
    .map(promotion => {
      // Look up the actual employee from employees array to get the correct employeeId
      const employee = employees.find(emp => emp.id === promotion.employee.id);
      const displayEmployeeId = promotion.employee.employeeId || employee?.employeeId || promotion.employee.id;

      return {
        key: promotion._id,
        Employee_ID: displayEmployeeId,
        Promoted_Employee: promotion.employee.name,
        Image: promotion.employee.image,
        Department: promotion.promotionFrom.department.name,
        Designation_From: promotion.promotionFrom.designation.name,
        Designation_To: promotion.promotionTo.designation.name,
        Promotion_Date: dayjs(promotion.promotionDate).format("DD MMM YYYY"),
        _original: promotion,
      };
    });

  const columns = [
    {
      title: "Employee ID",
      dataIndex: "Employee_ID",
      render: (text: string) => (
        <span className="fw-medium">{text}</span>
      ),
      sorter: (a: any, b: any) =>
        a.Employee_ID.localeCompare(b.Employee_ID),
    },
    {
      title: "Name",
      dataIndex: "Promoted_Employee",
      render: (text: string, record: any) => (
        <EmployeeNameCell
          name={text}
          image={record.Image}
          employeeId={record._original.employee.id}
          avatarTheme="primary"
        />
      ),
      sorter: (a: any, b: any) =>
        a.Promoted_Employee.localeCompare(b.Promoted_Employee),
    },
    {
      title: "Department",
      dataIndex: "Department",
      sorter: (a: any, b: any) => a.Department.localeCompare(b.Department),
    },
    {
      title: "Designation From",
      dataIndex: "Designation_From",
      sorter: (a: any, b: any) =>
        a.Designation_From.localeCompare(b.Designation_From),
    },
    {
      title: "Designation To",
      dataIndex: "Designation_To",
      sorter: (a: any, b: any) =>
        a.Designation_To.localeCompare(b.Designation_To),
    },
    {
      title: "Promotion Date",
      dataIndex: "Promotion_Date",
      sorter: (a: any, b: any) =>
        a.Promotion_Date.localeCompare(b.Promotion_Date),
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: any, record: any) => (
        <div className="action-icon d-inline-flex">
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              handleViewClick(record._original);
            }}
            data-bs-toggle="modal"
            data-bs-target="#view_promotion"
          >
            <i className="ti ti-eye" />
          </Link>
          <Link
            to="#"
            className="me-2"
            onClick={(e) => {
              e.preventDefault();
              handleEditClick(record._original);
            }}
            data-bs-toggle="modal"
            data-bs-target="#edit_promotion"
          >
            <i className="ti ti-edit" />
          </Link>
          <Link
            to="#"
            onClick={(e) => {
              e.preventDefault();
              handleDeleteClick(record._original._id);
            }}
            data-bs-toggle="modal"
            data-bs-target="#delete_modal"
          >
            <i className="ti ti-trash" />
          </Link>
        </div>
      ),
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
              <h2 className="mb-1">Promotion</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Performance</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Promotion
                  </li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
              <div className="mb-2">
                <Link
                  to="#"
                  className="btn btn-primary d-flex align-items-center"
                  data-bs-toggle="modal"
                  data-bs-target="#new_promotion"
                >
                  <i className="ti ti-circle-plus me-2" />
                  Add Promotion
                </Link>
              </div>
              <div className="head-icons ms-2">
                <CollapseHeader />
              </div>
            </div>
          </div>
          {/* /Breadcrumb */}

          {/* Promotion Stats Cards */}
          <div className="row">
            <div className="col-xl-3 col-sm-6 col-12 d-flex">
              <div className="card bg-comman w-100">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="bg-primary-light rounded-circle p-2">
                      <i className="ti ti-trending-up text-primary fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.total}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Total Promotions</span>
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
                    <div className="bg-success-light rounded-circle p-2">
                      <i className="ti ti-check text-success fs-20" />
                    </div>
                    <h5 className="fs-22 fw-semibold text-truncate mb-0">
                      {stats.approved}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Approved</span>
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
                      {stats.effectiveThisMonth}
                    </h5>
                  </div>
                  <div className="d-flex align-items-center justify-content-between mt-3">
                    <span className="fs-14 fw-medium text-gray">Effective This Month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* /Promotion Stats Cards */}

          {/* Promotion List */}
          <div className="row">
            <div className="col-sm-12">
              <div className="card">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                  <h5 className="d-flex align-items-center">Promotion List</h5>
                  <div className="d-flex align-items-center flex-wrap row-gap-3">
                    <div className="input-icon position-relative me-2">
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                      <input
                        type="text"
                        className="form-control date-range bookingrange"
                        placeholder="dd/mm/yyyy - dd/mm/yyyy "
                      />
                    </div>
                    <div className="dropdown">
                      <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center fs-12"
                        data-bs-toggle="dropdown"
                      >
                        <p className="fs-12 d-inline-flex me-1">Sort By : </p>
                        Last 7 Days
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
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body p-0">
                  {loading ? (
                    <div className="text-center p-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-2">Loading promotions...</p>
                    </div>
                  ) : promotions.length === 0 ? (
                    <div className="text-center p-5">
                      <i className="ti ti-clipboard-text fs-48 text-muted mb-3 d-block" />
                      <h5 className="text-muted">No promotions found</h5>
                      <p className="text-muted">Click "Add Promotion" to create your first promotion record</p>
                    </div>
                  ) : (
                    <Table dataSource={data} columns={columns} Selection={true} />
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* /Promotion List  */}
        </div>
        {/* Footer */}
        <Footer />
        {/* /Footer */}
      </div>
      {/* /Page Wrapper */}
      <>
        {/* Add Promotion */}
        <div className="modal fade" id="new_promotion">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Add Promotion</h4>
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
                <div className="modal-body pb-0" id="modal-datepicker">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Department <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={departmentOptions}
                          value={departmentOptions.find(opt => opt.value === newPromotion.sourceDepartmentId) || null}
                          onChange={handleAddDepartmentChange}
                        />
                        {addErrors.sourceDepartmentId && (
                          <div className="text-danger fs-12 mt-1">{addErrors.sourceDepartmentId}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label">
                          Promotion For <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={employeeOptions}
                          value={employeeOptions.find(opt => opt.value === newPromotion.employeeId) || null}
                          onChange={handleAddEmployeeChange}
                        />
                        {addErrors.employeeId && (
                          <div className="text-danger fs-12 mt-1">{addErrors.employeeId}</div>
                        )}
                      </div>
                    </div>
                    {newPromotion.employeeId && (
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Current Designation</label>
                          <input
                            type="text"
                            className="form-control"
                            value={getDesignationFrom()}
                            disabled
                          />
                        </div>
                      </div>
                    )}

                    {/* Two-Column Layout */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Department To <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={departmentOptions}
                          value={departmentOptions.find(opt => opt.value === newPromotion.targetDepartmentId) || null}
                          onChange={handleAddTargetDepartmentChange}
                          disabled={!newPromotion.employeeId}
                        />
                        {addErrors.targetDepartmentId && (
                          <div className="text-danger fs-12 mt-1">{addErrors.targetDepartmentId}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Promotion To <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={designationOptions}
                          value={designationOptions.find(opt => opt.value === newPromotion.designationToId) || null}
                          onChange={handleAddDesignationChange}
                          disabled={!newPromotion.targetDepartmentId}
                        />
                        {addErrors.designationToId && (
                          <div className="text-danger fs-12 mt-1">{addErrors.designationToId}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Promotion Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                          className="select"
                          options={promotionTypeOptions}
                          value={promotionTypeOptions.find(opt => opt.value === newPromotion.promotionType) || null}
                          onChange={handleAddPromotionTypeChange}
                        />
                        {addErrors.promotionType && (
                          <div className="text-danger fs-12 mt-1">{addErrors.promotionType}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Promotion Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format="DD-MM-YYYY"
                            value={newPromotion.promotionDate}
                            onChange={handleAddPromotionDateChange}
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar text-gray-7" />
                          </span>
                        </div>
                        {addErrors.promotionDate && (
                          <div className="text-danger fs-12 mt-1">{addErrors.promotionDate}</div>
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
                    onClick={handleAddPromotion}
                    className="btn btn-primary"
                    disabled={loading || employees.length === 0 || designations.length === 0}
                  >
                    {loading ? "Loading..." : "Add Promotion"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Add Promotion */}
        {/* Edit Promotion */}
        <div className="modal fade" id="edit_promotion">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit Promotion</h4>
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
                <div className="modal-body pb-0" id="modal-datepicker">
                  <div className="row">
                    {editingPromotion && (
                      <>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Employee</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingPromotion.employee.name}
                              disabled
                            />
                          </div>
                        </div>
                        <div className="col-md-12">
                          <div className="mb-3">
                            <label className="form-label">Current Designation</label>
                            <input
                              type="text"
                              className="form-control"
                              value={editingPromotion.promotionFrom.designation.name}
                              disabled
                            />
                          </div>
                        </div>

                        {/* Two-Column Layout */}
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Department To <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={departmentOptions}
                              value={departmentOptions.find(opt => opt.value === editForm.departmentId) || null}
                              onChange={(option: any) => {
                                setEditForm({ ...editForm, departmentId: option.value, designationToId: "" });
                                setEditErrors(prev => ({ ...prev, departmentId: "", designationToId: "" }));
                                if (option?.value) {
                                  fetchDesignationsByDepartment(option.value);
                                } else {
                                  setDesignations([]);
                                }
                              }}
                            />
                            {editErrors.departmentId && (
                              <div className="text-danger fs-12 mt-1">{editErrors.departmentId}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Promotion To <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={designationOptions}
                              value={designationOptions.find(opt => opt.value === editForm.designationToId) || null}
                              onChange={(option: any) => {
                                setEditForm({ ...editForm, designationToId: option.value });
                                setEditErrors(prev => ({ ...prev, designationToId: "" }));
                              }}
                            />
                            {editErrors.designationToId && (
                              <div className="text-danger fs-12 mt-1">{editErrors.designationToId}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Promotion Type <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              className="select"
                              options={promotionTypeOptions}
                              value={promotionTypeOptions.find(opt => opt.value === editForm.promotionType) || null}
                              onChange={(option: any) => {
                                setEditForm({ ...editForm, promotionType: option.value });
                                setEditErrors(prev => ({ ...prev, promotionType: "" }));
                              }}
                            />
                            {editErrors.promotionType && (
                              <div className="text-danger fs-12 mt-1">{editErrors.promotionType}</div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Promotion Date <span className="text-danger">*</span>
                            </label>
                            <div className="input-icon-end position-relative">
                              <DatePicker
                                className="form-control datetimepicker"
                                format="DD-MM-YYYY"
                                value={editForm.promotionDate}
                                onChange={(date) => {
                                  setEditForm({ ...editForm, promotionDate: date });
                                  setEditErrors(prev => ({ ...prev, promotionDate: "" }));
                                }}
                                getPopupContainer={getModalContainer}
                                placeholder="DD-MM-YYYY"
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar text-gray-7" />
                              </span>
                            </div>
                            {editErrors.promotionDate && (
                              <div className="text-danger fs-12 mt-1">{editErrors.promotionDate}</div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
                    onClick={handleUpdatePromotion}
                    className="btn btn-primary"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit Promotion */}
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
                  Are you sure you want to delete this promotion? This action cannot be undone.
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
        {/* View Promotion Detail Modal */}
        <PromotionDetailsModal promotion={viewingPromotion} modalId="view_promotion" />
        {/* /View Promotion Detail Modal */}
      </>
    </>
  );
};

export default Promotion;
