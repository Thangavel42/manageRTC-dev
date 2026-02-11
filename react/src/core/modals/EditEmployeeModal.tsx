import { DatePicker } from "antd";
import { Modal } from "bootstrap";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useBatchesREST } from "../../hooks/useBatchesREST";
import { useDepartmentsREST } from "../../hooks/useDepartmentsREST";
import { useDesignationsREST } from "../../hooks/useDesignationsREST";
import { useEmployeesREST } from "../../hooks/useEmployeesREST";
import { useShiftsREST } from "../../hooks/useShiftsREST";
import CommonSelect from "../common/commonSelect";
import ImageWithBasePath from "../common/imageWithBasePath";

type PermissionAction = "read" | "write" | "create" | "delete" | "import" | "export";
type PermissionModule = "holidays" | "leaves" | "clients" | "projects" | "tasks" | "chats" | "assets" | "timingSheets";

interface PermissionSet {
  read: boolean;
  write: boolean;
  create: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
}

interface PermissionsState {
  enabledModules: Record<PermissionModule, boolean>;
  permissions: Record<PermissionModule, PermissionSet>;
  selectAll: Record<PermissionModule, boolean>;
}

interface Option {
  label: string;
  value: string;
}

interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  profileImage?: string;
  account?: {
    role: string;
  };
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  address?: Address;
  companyName: string;
  departmentId: string;
  designationId: string;
  reportingTo?: string;
  reportingManagerName?: string;
  shiftId?: string;
  shiftName?: string;
  batchId?: string;
  batchName?: string;
  employmentType?: "Full-time" | "Part-time" | "Contract" | "Intern";
  status:
    | "Active"
    | "Inactive"
    | "On Notice"
    | "Resigned"
    | "Terminated"
    | "On Leave";
  dateOfJoining: string | null;
  about: string;
  role: string;
  enabledModules?: Record<PermissionModule, boolean>;
  permissions?: Record<PermissionModule, PermissionSet>;
}

interface EditEmployeeModalProps {
  employee: Employee | null;
  onUpdate?: (updatedEmployee: Employee) => void;
  onDelete?: (employeeId: string) => void;
  getModalContainer?: () => HTMLElement;
  modalId?: string;
  showLifecycleWarning?: boolean;
}

const DATE_FORMAT = "DD-MM-YYYY";
const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(\d{4})$/;

const isValidDateString = (value?: string | null) => !!value && DATE_REGEX.test(value);

const toDayjsDate = (value?: string | null) => {
  if (!value) return null;
  if (isValidDateString(value)) {
    const parsed = dayjs(value, DATE_FORMAT);
    return parsed.isValid() ? parsed : null;
  }
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback : null;
};

const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  onUpdate,
  onDelete,
  getModalContainer,
  modalId = "edit_employee",
  showLifecycleWarning = true,
}) => {
  const modalRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousEmployeeRef = useRef<Employee | null>(null);
  const navigate = useNavigate();

  const roleOptions = [
    { value: "", label: "Select Role" },
    { value: "HR", label: "HR" },
    { value: "Manager", label: "Manager" },
    { value: "Employee", label: "Employee" },
  ];

  const genderOptions = [
    { value: "", label: "Select Gender" },
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUpload, setImageUpload] = useState(false);
  const [department, setDepartment] = useState<Option[]>([]);
  const [designation, setDesignation] = useState<Option[]>([]);
  const [allDesignations, setAllDesignations] = useState<Option[]>([]);
  const [filteredDesignations, setFilteredDesignations] = useState<Option[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [isDesignationDisabled, setIsDesignationDisabled] = useState<boolean>(true);
  const [managers, setManagers] = useState<Option[]>([]);
  const [lifecycleStatus, setLifecycleStatus] = useState<{
    hasLifecycleRecord: boolean;
    canChangeStatus: boolean;
    type?: string;
    status?: string;
    message?: string;
  } | null>(null);

  // Shift Assignment state
  const [shiftAssignmentOptions, setShiftAssignmentOptions] = useState<{
    directShifts: Array<{ value: string; label: string; type: 'shift'; data?: any }>;
    shiftBatches: Array<{ value: string; label: string; type: 'batch'; data?: any }>;
  }>({
    directShifts: [{ value: '', label: 'Select Shift', type: 'shift' }],
    shiftBatches: [{ value: '', label: 'Select Shift Batch', type: 'batch' }],
  });
  const [selectedShiftAssignment, setSelectedShiftAssignment] = useState<{
    type: 'shift' | 'batch' | 'none' | null;
    value: string;
  }>({ type: null, value: '' });

  const { departments, fetchDepartments } = useDepartmentsREST();
  const { designations, fetchDesignations } = useDesignationsREST();
  const { batches, fetchBatches } = useBatchesREST();
  const { shifts: allShifts } = useShiftsREST();
  const { updateEmployee, updatePermissions, checkLifecycleStatus, fetchActiveEmployeesList, employees } = useEmployeesREST();

  // Initialize departments, batches, and employees on mount
  useEffect(() => {
    fetchDepartments();
    fetchBatches();
    fetchActiveEmployeesList();
  }, [fetchDepartments, fetchBatches, fetchActiveEmployeesList]);

  // Sync departments from REST hook
  useEffect(() => {
    if (departments && departments.length > 0) {
      const mappedDepartments = departments.map((d: any) => ({
        value: d._id,
        label: d.department,
      }));
      setDepartment(mappedDepartments);
    }
  }, [departments]);

  // Sync designations from REST hook
  useEffect(() => {
    if (designations && designations.length > 0) {
      const mappedDesignations = designations.map((d: any) => ({
        value: d._id,
        label: d.designation,
      }));
      setAllDesignations(mappedDesignations);
      // Also update the designation state used for rendering
      setDesignation(mappedDesignations);
    }
  }, [designations]);

  const getEmployeeOptionLabel = (emp: any) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.fullName || 'Unknown';
    const id = emp.employeeId ? ` (${emp.employeeId})` : '';
    const departmentLabel = emp.department
      ? emp.department
      : department.find((dep) => dep.value === emp.departmentId)?.label;
    const departmentText = departmentLabel ? ` - ${departmentLabel}` : '';
    return `${name}${id}${departmentText}`;
  };

  // Sync managers from employees (all active employees)
  useEffect(() => {
    if (employees && employees.length > 0) {
      const managersList = employees
        .filter((emp: any) => (emp.status || '').toLowerCase() === 'active')
        .map((emp: any) => ({
          value: emp._id,
          label: getEmployeeOptionLabel(emp),
        }));
      setManagers([{ value: '', label: 'Select Reporting Manager' }, ...managersList]);
    }
  }, [employees, department]);

  // Sync shift assignments
  useEffect(() => {
    if (allShifts || batches) {
      const directShifts = allShifts?.map((shift: any) => ({
        value: shift._id,
        label: shift.name || shift.shiftName || shift.shiftId || 'Unnamed Shift',
        type: 'shift' as const,
        data: shift
      })) || [];

      const shiftBatches = batches?.map((batch: any) => ({
        value: batch._id,
        label: batch.name || batch.batchName || batch.batchId || 'Unnamed Batch',
        type: 'batch' as const,
        data: batch
      })) || [];

      setShiftAssignmentOptions({
        directShifts: [{ value: '', label: 'Select Shift', type: 'shift' }, ...directShifts],
        shiftBatches: [{ value: '', label: 'Select Shift Batch', type: 'batch' }, ...shiftBatches],
      });
    }
  }, [allShifts, batches]);

  // Initialize editingEmployee when employee prop changes
  useEffect(() => {
    // Only open modal if employee prop changed from null to a value
    // This prevents the modal from opening on every update
    const shouldOpenModal = employee && !previousEmployeeRef.current;

    if (employee) {
      // Extract IDs from populated objects if needed
      const departmentId = employee.departmentId || (employee as any).department?._id || "";
      const designationId = employee.designationId || (employee as any).designation?._id || "";
      const reportingTo = employee.reportingTo || "";

      setEditingEmployee({ ...employee, departmentId, designationId, reportingTo });
      setSelectedDepartment(departmentId);
      if (departmentId) {
        setIsDesignationDisabled(false);
        fetchDesignations({ departmentId });
      }

      // Set shift assignment
      if (employee.batchId) {
        setSelectedShiftAssignment({ type: 'batch', value: employee.batchId });
      } else if (employee.shiftId) {
        setSelectedShiftAssignment({ type: 'shift', value: employee.shiftId });
      } else {
        // No shift assigned - set to none
        setSelectedShiftAssignment({ type: 'none', value: '' });
      }

      // Check lifecycle status for the employee
      if (showLifecycleWarning) {
        checkLifecycleStatusForEmployee(employee._id);
      }

      // Only open modal automatically when employee changes from null to a value
      // (not when it updates while the modal is already open)
      if (shouldOpenModal) {
        setTimeout(() => {
          const modalElement = document.getElementById(modalId);
          if (modalElement) {
            // Dispose any existing instance completely
            const existingModal = Modal.getInstance(modalElement);
            if (existingModal) {
              existingModal.dispose();
            }
            // Remove any backdrop or modal-open classes
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('padding-right');
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            // Create new instance and show
            const modal = new Modal(modalElement, {
              backdrop: 'static',
              keyboard: false
            });
            modal.show();
          }
        }, 100); // Increased timeout to ensure cleanup is complete
      }

      // Update the ref for next comparison
      previousEmployeeRef.current = employee;
    } else {
      // When employee prop becomes null, reset the ref to allow reopening next time
      previousEmployeeRef.current = null;
    }
  }, [employee, modalId, showLifecycleWarning]);

  // Cleanup modal instance when modal closes (hidden.bs.modal event)
  useEffect(() => {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) return;

    const handleModalHidden = () => {
      // Dispose the modal instance when it's hidden
      const modalInstance = Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.dispose();
      }
      // Clean up any lingering backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
      // Reset editing employee state and ref after cleanup
      setTimeout(() => {
        setEditingEmployee(null);
        previousEmployeeRef.current = null;
      }, 50);
    };

    modalElement.addEventListener('hidden.bs.modal', handleModalHidden);

    return () => {
      modalElement.removeEventListener('hidden.bs.modal', handleModalHidden);
    };
  }, [modalId]);

  // Reset editingEmployee when modalId changes or component unmounts
  useEffect(() => {
    return () => {
      setEditingEmployee(null);
    };
  }, [modalId]);

  // Cleanup modal instance on unmount to prevent backdrop issues
  useEffect(() => {
    return () => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        const modalInstance = Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.dispose();
        }
      }
      // Clean up any lingering backdrops
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('padding-right');
    };
  }, [modalId]);

  const checkLifecycleStatusForEmployee = async (employeeId: string) => {
    try {
      const status = await checkLifecycleStatus(employeeId);
      setLifecycleStatus(status);
    } catch (error) {
      console.error("Error checking lifecycle status:", error);
    }
  };

  const closeModal = () => {
    // Get the modal instance and hide it properly
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      const modalInstance = Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
    }

    // Clean up backdrops
    const modals = document.querySelectorAll(".modal-backdrop");
    modals.forEach((modal) => modal.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("padding-right");
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingEmployee((prev) => {
      if (!prev) return prev;

      // Handle nested paths like "contact.email"
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev as any)[parent],
            [child]: value,
          },
        };
      }

      return { ...prev, [name]: value };
    });
    clearFieldError(name);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedFormats = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedFormats.includes(file.type)) {
      toast.error("Please upload image file only (JPG, JPEG, PNG).");
      return;
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 4MB.");
      return;
    }

    setImageUpload(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("upload_preset", "amasqis");
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
        { method: "POST", body: formDataUpload }
      );

      if (!res.ok) {
        throw new Error('Image upload failed');
      }

      const data = await res.json();
      setEditingEmployee((prev) =>
        prev ? { ...prev, avatarUrl: data.secure_url, profileImage: data.secure_url } : prev
      );
      setImageUpload(false);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      setImageUpload(false);
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const removeLogo = () => {
    setEditingEmployee((prev) =>
      prev ? {
        ...prev,
        avatarUrl: "assets/img/profiles/profile.png",
        profileImage: "assets/img/profiles/profile.png"
      } : prev
    );
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDepartmentChange = (option: any) => {
    if (!editingEmployee) return;

    if (option) {
      setEditingEmployee((prev) =>
        prev ? { ...prev, departmentId: option.value, designationId: "" } : prev
      );
      setSelectedDepartment(option.value);
      setIsDesignationDisabled(false);

      // Filter designations by department
      if (allDesignations.length > 0) {
        const filtered = allDesignations.filter((d) => {
          // Assuming designations have a departmentId field
          return true; // Adjust this filter based on actual designation structure
        });
        setFilteredDesignations(filtered);
      }

      if (option.value) {
        fetchDesignations({ departmentId: option.value });
      }
    }
  };

  const handleDesignationChange = (option: any) => {
    if (!editingEmployee) return;

    if (option) {
      setEditingEmployee((prev) =>
        prev ? { ...prev, designationId: option.value } : prev
      );
    }
  };

  const handleEditSubmit = async () => {
    if (!editingEmployee) return;

    // Validate ALL required fields
    const errors: Record<string, string> = {};

    // First name validation
    if (!editingEmployee.firstName?.trim()) {
      errors.firstName = "First name is required";
    } else if (editingEmployee.firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    } else if (editingEmployee.firstName.trim().length > 50) {
      errors.firstName = "First name cannot exceed 50 characters";
    }

    // Last name validation
    if (!editingEmployee.lastName?.trim()) {
      errors.lastName = "Last name is required";
    } else if (editingEmployee.lastName.trim().length < 1) {
      errors.lastName = "Last name must be at least 1 character";
    } else if (editingEmployee.lastName.trim().length > 50) {
      errors.lastName = "Last name cannot exceed 50 characters";
    }

    if (!editingEmployee.email?.trim()) errors.email = "Email is required";
    if (!editingEmployee.phone?.trim()) errors.phone = "Phone number is required";
    if (!editingEmployee.account?.role) errors.role = "Role is required";
    if (!editingEmployee.departmentId) errors.departmentId = "Department is required";
    if (!editingEmployee.designationId) errors.designationId = "Designation is required";
    if (!editingEmployee.dateOfJoining) errors.dateOfJoining = "Date of joining is required";
    if (!editingEmployee.gender) errors.gender = "Gender is required";
    if (!editingEmployee.dateOfBirth) errors.birthday = "Date of birth is required";

    // Shift assignment validation (only if not explicitly set to 'none')
    if (selectedShiftAssignment.type !== 'none' && !selectedShiftAssignment.type && !editingEmployee.shiftId && !editingEmployee.batchId) {
      errors.shiftAssignment = "Shift assignment is required";
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (editingEmployee.email && !emailRegex.test(editingEmployee.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone format validation
    const phoneRegex = /^\d{10,}$/;
    if (editingEmployee.phone && !phoneRegex.test(editingEmployee.phone.replace(/[\s-]/g, ""))) {
      errors.phone = "Please enter a valid phone number (at least 10 digits)";
    }

    // Date validation: Joining date must be on or after date of birth
    if (editingEmployee.dateOfJoining && editingEmployee.dateOfBirth) {
      const joiningDate = toDayjsDate(editingEmployee.dateOfJoining);
      const birthDate = toDayjsDate(editingEmployee.dateOfBirth);

      if (joiningDate && birthDate && joiningDate.isBefore(birthDate, 'day')) {
        errors.dateOfJoining = "Joining date must be on or after date of birth";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error field for better UX
      const firstErrorField = Object.keys(errors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      setLoading(true);

      // Prepare payload and clean optional fields
      const payload: any = { ...editingEmployee };

      // Remove fields not allowed in backend validation schema
      delete payload._id;       // MongoDB _id is immutable and cannot be updated
      // Note: shiftId and batchId are now saved with the employee

      // Remove populated objects that shouldn't be sent back to backend
      delete payload.department;
      delete payload.designation;

      // Remove reportingTo if it's empty (optional field)
      if (!payload.reportingTo || payload.reportingTo.trim() === '') {
        delete payload.reportingTo;
      }

      // Ensure avatarUrl is valid or remove default
      if (!payload.avatarUrl || payload.avatarUrl === "assets/img/profiles/profile.png") {
        delete payload.avatarUrl;
      }

      // Ensure profileImage is valid or remove default
      if (!payload.profileImage || payload.profileImage === "assets/img/profiles/profile.png") {
        delete payload.profileImage;
      }

      // Update employee
      const employeeSuccess = await updateEmployee(editingEmployee._id, payload);

      if (employeeSuccess) {
        const roleLabel = editingEmployee.account?.role || "Employee";
        toast.success(`${roleLabel} updated successfully!`);
        onUpdate?.(editingEmployee);
        if (modalRef.current) {
          modalRef.current.click();
        }
      } else {
        toast.error("Failed to update employee");
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        const apiError = error.response.data.error;

        // Handle array of validation errors
        if (Array.isArray(apiError.errors)) {
          const backendErrors: Record<string, string> = {};
          apiError.errors.forEach((err: any) => {
            if (err.field) {
              backendErrors[err.field] = err.message || `Invalid ${err.field}`;
            }
          });
          setFieldErrors((prev) => ({ ...prev, ...backendErrors }));
          toast.error(apiError.errors[0]?.message || "Validation failed");
          // Scroll to first error
          const firstErrorField = Object.keys(backendErrors)[0];
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else if (apiError.field) {
          setFieldErrors((prev) => ({
            ...prev,
            [apiError.field]: apiError.message
          }));
          toast.error(apiError.message || "Validation failed");
        } else {
          toast.error(apiError.message || "Failed to update employee");
        }
      } else {
        toast.error(error.message || "Failed to update employee");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!editingEmployee) return;

    if (window.confirm(`Are you sure you want to delete employee ${editingEmployee.firstName} ${editingEmployee.lastName}?`)) {
      onDelete?.(editingEmployee._id);
      if (modalRef.current) {
        modalRef.current.click();
      }
    }
  };

  // Keep modal in DOM but hide it when no employee is being edited
  if (!editingEmployee) {
    // Render a hidden modal element to keep it in DOM
    return (
      <div
        className="modal fade"
        id={modalId}
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabIndex={-1}
        aria-labelledby={`${modalId}Label`}
        aria-hidden="true"
        style={{ display: 'none' }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center">
                <h4 className="modal-title me-2">Edit Employee</h4>
              </div>
            </div>
            <div className="modal-body">
              <div className="text-center p-4">No employee selected</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="modal fade"
        id={modalId}
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabIndex={-1}
        aria-labelledby={`${modalId}Label`}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center">
                <h4 className="modal-title me-2">Edit Employee</h4>
                <span>Employee ID : {editingEmployee?.employeeId}</span>
              </div>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <button
              type="button"
              ref={modalRef}
              data-bs-dismiss="modal"
              style={{ display: "none" }}
            />
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="modal-body pb-0">
                    <div className="row">
                      <div className="col-md-12">
                        <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                          {editingEmployee?.avatarUrl ? (
                            <img
                              src={editingEmployee.avatarUrl}
                              alt="Profile"
                              className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                            />
                          ) : (
                            <ImageWithBasePath
                              src="assets/img/profiles/profile.png"
                              alt="img"
                              className="rounded-circle"
                            />
                          )}
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">Upload Profile Image</h6>
                              <p className="fs-12">Image should be below 4 mb</p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className={`drag-upload-btn btn btn-sm btn-primary me-2 ${imageUpload ? 'disabled' : ''}`} style={{ position: 'relative' }}>
                                {imageUpload ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    Upload
                                    <input
                                      type="file"
                                      className="form-control image-sign"
                                      accept=".png,.jpeg,.jpg,.ico"
                                      onChange={handleImageUpload}
                                      disabled={imageUpload}
                                      style={{ cursor: imageUpload ? "not-allowed" : "pointer", opacity: 0, position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                                    />
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                disabled={imageUpload}
                                onClick={() =>
                                  setEditingEmployee((prev) =>
                                    prev ? { ...prev, avatarUrl: "assets/img/profiles/profile.png", profileImage: "assets/img/profiles/profile.png" } : prev
                                  )
                                }
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">First Name <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.firstName ? 'is-invalid' : ''}`}
                            value={editingEmployee?.firstName || ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? { ...prev, firstName: e.target.value } : prev
                              );
                            }}
                          />
                          {fieldErrors.firstName && <div className="invalid-feedback d-block">{fieldErrors.firstName}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Last Name <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.lastName ? 'is-invalid' : ''}`}
                            value={editingEmployee?.lastName || ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? { ...prev, lastName: e.target.value } : prev
                              );
                            }}
                          />
                          {fieldErrors.lastName && <div className="invalid-feedback d-block">{fieldErrors.lastName}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Employee ID <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.employeeId || ""}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Joining Date <span className="text-danger"> *</span></label>
                          <div className={`input-icon-end position-relative ${fieldErrors.dateOfJoining ? 'has-error' : ''}`}>
                            <DatePicker
                              className={`form-control datetimepicker ${fieldErrors.dateOfJoining ? 'is-invalid' : ''}`}
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              value={editingEmployee?.dateOfJoining ? toDayjsDate(editingEmployee.dateOfJoining) : null}
                              onChange={(_date, dateString) => {
                                const dateValue = Array.isArray(dateString) ? dateString[0] : dateString;
                                setEditingEmployee((prev) =>
                                  prev ? { ...prev, dateOfJoining: dateValue || "" } : prev
                                );
                              }}
                            />
                            <span className="input-icon-addon"><i className="ti ti-calendar text-gray-7" /></span>
                          </div>
                          {fieldErrors.dateOfJoining && <div className="invalid-feedback d-block">{fieldErrors.dateOfJoining}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Role <span className="text-danger"> *</span></label>
                          <CommonSelect
                            className="select"
                            options={roleOptions}
                            defaultValue={roleOptions.find((opt) => opt.value === editingEmployee?.account?.role)}
                            onChange={(option: any) => {
                              if (option) {
                                setEditingEmployee((prev) =>
                                  prev ? {
                                    ...prev,
                                    account: {
                                      ...prev.account,
                                      role: option.value,
                                    },
                                  } : prev
                                );
                              }
                            }}
                          />
                          {fieldErrors.role && <div className="invalid-feedback d-block">{fieldErrors.role}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Email <span className="text-danger"> *</span></label>
                          <input
                            type="email"
                            className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                            value={editingEmployee?.email || ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? {
                                  ...prev,
                                  email: e.target.value,
                                } : prev
                              );
                            }}
                          />
                          {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Gender <span className="text-danger"> *</span></label>
                          <CommonSelect
                            className="select"
                            options={genderOptions}
                            defaultValue={genderOptions.find((opt) => opt.value === editingEmployee?.gender)}
                            onChange={(option: any) => {
                              if (option) {
                                setEditingEmployee((prev) =>
                                  prev ? {
                                    ...prev,
                                    gender: option.value,
                                  } : prev
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Birthday <span className="text-danger"> *</span></label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className="form-control datetimepicker"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              value={editingEmployee?.dateOfBirth ? toDayjsDate(editingEmployee.dateOfBirth) : null}
                              onChange={(_date, dateString) => {
                                const dateValue = Array.isArray(dateString) ? dateString[0] : dateString;
                                setEditingEmployee((prev) =>
                                  prev ? {
                                    ...prev,
                                    dateOfBirth: dateValue || "",
                                  } : prev
                                );
                              }}
                            />
                            <span className="input-icon-addon"><i className="ti ti-calendar text-gray-7" /></span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Street"
                            value={editingEmployee?.address?.street || ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? {
                                  ...prev,
                                  address: {
                                    ...prev.address,
                                    street: e.target.value,
                                  },
                                } : prev
                              );
                            }}
                          />
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="City"
                                value={editingEmployee?.address?.city || ""}
                                onChange={(e) => {
                                  setEditingEmployee((prev) =>
                                    prev ? {
                                      ...prev,
                                      address: {
                                        ...prev.address,
                                        city: e.target.value,
                                      },
                                    } : prev
                                  );
                                }}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="State"
                                value={editingEmployee?.address?.state || ""}
                                onChange={(e) => {
                                  setEditingEmployee((prev) =>
                                    prev ? {
                                      ...prev,
                                      address: {
                                        ...prev.address,
                                        state: e.target.value,
                                      },
                                    } : prev
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Postal Code"
                                value={editingEmployee?.address?.postalCode || ""}
                                onChange={(e) => {
                                  setEditingEmployee((prev) =>
                                    prev ? {
                                      ...prev,
                                      address: {
                                        ...prev.address,
                                        postalCode: e.target.value,
                                      },
                                    } : prev
                                  );
                                }}
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Country"
                                value={editingEmployee?.address?.country || ""}
                                onChange={(e) => {
                                  setEditingEmployee((prev) =>
                                    prev ? {
                                      ...prev,
                                      address: {
                                        ...prev.address,
                                        country: e.target.value,
                                      },
                                    } : prev
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Phone Number <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={editingEmployee?.phone || ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? {
                                  ...prev,
                                  phone: e.target.value,
                                } : prev
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Department <span className="text-danger"> *</span></label>
                          {department.length === 0 ? (
                            <div>
                              <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={() => navigate("/departments")}
                              >
                                <i className="ti ti-plus me-2" />
                                Create New Department
                              </button>
                              <small className="text-muted d-block mt-2">No departments available. Click to create one.</small>
                            </div>
                          ) : (
                            <>
                              <CommonSelect
                                className="select"
                                options={department}
                                defaultValue={department.find((opt) => opt.value === editingEmployee?.departmentId)}
                                onChange={handleDepartmentChange}
                              />
                              {fieldErrors.departmentId && <div className="invalid-feedback d-block">{fieldErrors.departmentId}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Designation <span className="text-danger"> *</span></label>
                          {designation.length === 0 && !isDesignationDisabled ? (
                            <div>
                              <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={() => navigate("/designations")}
                              >
                                <i className="ti ti-plus me-2" />
                                Create New Designation
                              </button>
                              <small className="text-muted d-block mt-2">No designations available. Click to create one.</small>
                            </div>
                          ) : (
                            <>
                              <CommonSelect
                                className="select"
                                options={designation}
                                disabled={isDesignationDisabled}
                                defaultValue={designation.find((opt) => opt.value === editingEmployee?.designationId)}
                                onChange={handleDesignationChange}
                              />
                              {fieldErrors.designationId && <div className="invalid-feedback d-block">{fieldErrors.designationId}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Reporting Manager <span className="text-muted">(Optional)</span></label>
                          <CommonSelect
                            className="select"
                            options={managers}
                            defaultValue={managers.find((opt) => opt.value === editingEmployee?.reportingTo)}
                            onChange={(option: any) => {
                              if (option) {
                                setEditingEmployee((prev) =>
                                  prev ? { ...prev, reportingTo: option.value } : prev
                                );
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Shift Assignment <span className="text-danger">*</span></label>
                          {shiftAssignmentOptions.directShifts.filter(opt => opt.value !== '').length === 0 &&
                           shiftAssignmentOptions.shiftBatches.filter(opt => opt.value !== '').length === 0 ? (
                            <div>
                              <button
                                type="button"
                                className="btn btn-primary w-100"
                                onClick={() => navigate("/shifts-management")}
                              >
                                <i className="ti ti-plus me-2" />
                                Create New Shift
                              </button>
                              <small className="text-muted d-block mt-2">No shifts available. Click to create one.</small>
                            </div>
                          ) : (
                            <>
                              <select
                                className={`form-control ${fieldErrors.shiftAssignment ? 'is-invalid' : ''}`}
                                value={selectedShiftAssignment.type ? `${selectedShiftAssignment.type}-${selectedShiftAssignment.value}` : 'no-shift'}
                                onChange={(e) => {
                                  if (e.target.value === 'no-shift') {
                                    setSelectedShiftAssignment({ type: 'none', value: '' });
                                    setEditingEmployee((prev) =>
                                      prev ? {
                                        ...prev,
                                        shiftId: '',
                                        batchId: '',
                                      } : prev
                                    );
                                    clearFieldError('shiftAssignment');
                                  } else {
                                    const [type, value] = e.target.value.split('-');
                                    setSelectedShiftAssignment({ type: type as 'shift' | 'batch', value });
                                    setEditingEmployee((prev) =>
                                      prev ? {
                                        ...prev,
                                        shiftId: type === 'shift' ? value : '',
                                        batchId: type === 'batch' ? value : '',
                                      } : prev
                                    );
                                    clearFieldError('shiftAssignment');
                                  }
                                }}
                                onBlur={() => {
                                  if (selectedShiftAssignment.type !== 'none' && !selectedShiftAssignment.type && !editingEmployee?.shiftId && !editingEmployee?.batchId) {
                                    setFieldErrors(prev => ({ ...prev, shiftAssignment: 'Shift assignment is required' }));
                                  }
                                }}
                              >
                                <option value="no-shift">No Shift Assignment</option>
                                <optgroup label="Direct Shifts">
                                  {shiftAssignmentOptions.directShifts
                                    .filter(opt => opt.value !== '')
                                    .map(opt => (
                                      <option key={opt.value} value={`shift-${opt.value}`}>{opt.label}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Shift Batches">
                                  {shiftAssignmentOptions.shiftBatches
                                    .filter(opt => opt.value !== '')
                                    .map(opt => (
                                      <option key={opt.value} value={`batch-${opt.value}`}>{opt.label}</option>
                                    ))}
                                </optgroup>
                              </select>
                              {fieldErrors.shiftAssignment && <div className="invalid-feedback d-block">{fieldErrors.shiftAssignment}</div>}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Employment Type</label>
                          <select
                            className="form-control"
                            value={editingEmployee?.employmentType || "Full-time"}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? { ...prev, employmentType: e.target.value as any } : prev
                              );
                            }}
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Intern">Intern</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Status <span className="text-danger">*</span></label>
                          <div>
                            <div className="form-check form-switch">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="editStatusSwitch"
                                checked={editingEmployee?.status === "Active"}
                                disabled={
                                  lifecycleStatus?.hasLifecycleRecord &&
                                  !lifecycleStatus?.canChangeStatus
                                }
                                onChange={(e) => {
                                  if (
                                    lifecycleStatus?.hasLifecycleRecord &&
                                    !lifecycleStatus?.canChangeStatus
                                  ) {
                                    toast.error(
                                      lifecycleStatus?.message ||
                                      "Cannot change status due to existing lifecycle record"
                                    );
                                    return;
                                  }
                                  setEditingEmployee((prev) =>
                                    prev ? { ...prev, status: e.target.checked ? "Active" : "Inactive" } : prev
                                  );
                                }}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="editStatusSwitch"
                                style={{
                                  opacity:
                                    lifecycleStatus?.hasLifecycleRecord &&
                                    !lifecycleStatus?.canChangeStatus
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                <span
                                  className={`badge ${
                                    editingEmployee?.status === "Active"
                                      ? "badge-success"
                                      : "badge-danger"
                                  } d-inline-flex align-items-center`}
                                >
                                  <i className="ti ti-point-filled me-1" />
                                  {editingEmployee?.status || "Active"}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">About</label>
                          <textarea
                            className="form-control"
                            rows={4}
                            value={typeof editingEmployee?.about === 'string' ? editingEmployee.about : ""}
                            onChange={(e) => {
                              setEditingEmployee((prev) =>
                                prev ? { ...prev, about: e.target.value } : prev
                              );
                            }}
                            placeholder="Write something about the employee..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-light border me-2"
                      data-bs-dismiss="modal"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={loading}
                      onClick={handleEditSubmit}
                    >
                      {loading ? "Updating..." : `Update ${editingEmployee?.account?.role || "Employee"}`}
                    </button>
                  </div>
                </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditEmployeeModal;
