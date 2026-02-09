import { DatePicker } from "antd";
import dayjs from "dayjs";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CommonSelect from "../common/commonSelect";
import ImageWithBasePath from "../common/imageWithBasePath";
import { useDepartmentsREST } from "../../hooks/useDepartmentsREST";
import { useDesignationsREST } from "../../hooks/useDesignationsREST";
import { useBatchesREST } from "../../hooks/useBatchesREST";
import { useShiftsREST } from "../../hooks/useShiftsREST";
import { useEmployeesREST } from "../../hooks/useEmployeesREST";

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

interface FormData {
  employeeId: string;
  avatarUrl: string;
  firstName: string;
  lastName: string;
  dateOfJoining: string;
  email: string;
  phone: string;
  account: {
    role: string;
  };
  gender: string;
  dateOfBirth: string | null;
  address: Address;
  companyName: string;
  designationId: string;
  departmentId: string;
  reportingTo?: string;
  shiftId: string;
  batchId: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Intern";
  about: string;
  status:
    | "Active"
    | "Inactive"
    | "On Notice"
    | "Resigned"
    | "Terminated"
    | "On Leave";
}

interface BatchOption {
  _id: string;
  name: string;
  shiftName?: string;
  rotationEnabled: boolean;
}

interface AddEmployeeModalProps {
  onSuccess?: () => void;
  initialFormData?: Partial<FormData>;
  getModalContainer?: () => HTMLElement;
}

const generateId = (prefix: string): string => {
  const randomNum = Math.floor(1 + Math.random() * 9999);
  const paddedNum = randomNum.toString().padStart(4, "0");
  return `${prefix}-${paddedNum}`;
};

const toDayjsDate = (value?: string | null) => {
  if (!value) return null;
  const DATE_FORMAT = "DD-MM-YYYY";
  const DATE_REGEX = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(\d{4})$/;
  if (DATE_REGEX.test(value)) {
    const parsed = dayjs(value, DATE_FORMAT);
    return parsed.isValid() ? parsed : null;
  }
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback : null;
};

const initialFormDataState = (): FormData => ({
  employeeId: generateId("EMP"),
  avatarUrl: "assets/img/profiles/profile.png",
  firstName: "",
  lastName: "",
  dateOfJoining: "",
  email: "",
  phone: "",
  account: {
    role: "",
  },
  gender: "",
  dateOfBirth: "",
  address: {
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
  },
  companyName: "",
  designationId: "",
  departmentId: "",
  reportingTo: "",
  shiftId: "",
  batchId: "",
  employmentType: "Full-time",
  about: "",
  status: "Active",
});

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  onSuccess,
  initialFormData,
  getModalContainer,
}) => {
  const modalRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const [formData, setFormData] = useState<FormData>(initialFormDataState);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUpload, setImageUpload] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [department, setDepartment] = useState<Option[]>([]);
  const [designation, setDesignation] = useState<Option[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedDesignation, setSelectedDesignation] = useState<string>("");
  const [isDesignationDisabled, setIsDesignationDisabled] = useState<boolean>(true);
  const [managers, setManagers] = useState<Option[]>([]);
  const [shiftAssignmentOptions, setShiftAssignmentOptions] = useState<{
    directShifts: Array<{ value: string; label: string; type: 'shift'; data?: any }>;
    shiftBatches: Array<{ value: string; label: string; type: 'batch'; data?: BatchOption }>;
  }>({
    directShifts: [{ value: '', label: 'Select Shift', type: 'shift' }],
    shiftBatches: [{ value: '', label: 'Select Shift Batch', type: 'batch', data: undefined }],
  });
  const [selectedShiftAssignment, setSelectedShiftAssignment] = useState<{
    type: 'shift' | 'batch' | 'none' | null;
    value: string;
  }>({ type: null, value: '' });

  // Email validation state
  const [emailValidation, setEmailValidation] = useState({
    checking: false,
    available: false,
    error: ''
  });

  const { departments, fetchDepartments } = useDepartmentsREST();
  const { designations, fetchDesignations } = useDesignationsREST();
  const { batches, fetchBatches } = useBatchesREST();
  const { shifts: allShifts } = useShiftsREST();
  const { createEmployee, checkDuplicates, checkEmailAvailability, fetchEmployees, employees } = useEmployeesREST();

  // Load departments, batches, and employees on mount
  useEffect(() => {
    fetchDepartments();
    fetchBatches();
    fetchEmployees();
  }, [fetchDepartments, fetchBatches, fetchEmployees]);

  // Sync managers from employees (filter for Manager role)
  useEffect(() => {
    if (employees && employees.length > 0) {
      // Filter employees with role 'Manager' (case-insensitive)
      const managersList = employees
        .filter((emp: any) => emp.account?.role?.toLowerCase() === 'manager')
        .map((emp: any) => ({
          value: emp._id,
          label: `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`,
        }));
      setManagers([{ value: '', label: 'Select Reporting Manager' }, ...managersList]);
    }
  }, [employees]);

  // Sync departments from REST hook to local state
  useEffect(() => {
    if (departments && departments.length > 0) {
      const mappedDepartments = departments.map((d: any) => ({
        value: d._id,
        label: d.department,
      }));
      setDepartment(mappedDepartments);
    }
  }, [departments]);

  // Sync designations from REST hook to local state
  useEffect(() => {
    if (designations && designations.length > 0) {
      const mappedDesignations = designations.map((d: any) => ({
        value: d._id,
        label: d.designation,
      }));
      setDesignation(mappedDesignations);
    }
  }, [designations]);

  // Sync shift assignments
  useEffect(() => {
    if (allShifts || batches) {
      const directShifts = allShifts?.map((shift: any) => ({
        value: shift._id,
        label: shift.shiftName || shift.name,
        type: 'shift' as const,
        data: shift
      })) || [{ value: '', label: 'Select Shift', type: 'shift' as const }];

      const shiftBatches = batches?.map((batch: any) => ({
        value: batch._id,
        label: batch.name || batch.batchName,
        type: 'batch' as const,
        data: batch
      })) || [{ value: '', label: 'Select Shift Batch', type: 'batch' as const, data: undefined }];

      setShiftAssignmentOptions({
        directShifts: [{ value: '', label: 'Select Shift', type: 'shift' }, ...directShifts],
        shiftBatches: [{ value: '', label: 'Select Shift Batch', type: 'batch', data: undefined }, ...shiftBatches],
      });
    }
  }, [allShifts, batches]);

  // Initialize form data from props if provided
  useEffect(() => {
    if (initialFormData) {
      setFormData((prev) => ({ ...prev, ...initialFormData }));
    }
  }, [initialFormData]);

  const closeModal = () => {
    const modals = document.querySelectorAll(".modal-backdrop");
    modals.forEach((modal) => modal.remove());
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("overflow");
  };

  const handleResetFormData = () => {
    setFormData(initialFormDataState());
    setFieldErrors({});
    setSelectedDepartment("");
    setSelectedDesignation("");
    setIsDesignationDisabled(true);
    setSelectedShiftAssignment({ type: null, value: '' });
    setEmailValidation({ checking: false, available: false, error: '' });
  };

  const clearFieldError = (fieldName: string) => {
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    clearFieldError(name);
  };

  const handleDateChange = (_date: any, dateString: string) => {
    setFormData((prev) => ({ ...prev, dateOfJoining: dateString }));
  };

  const handleFieldBlur = async (fieldName: string, value: string) => {
    clearFieldError(fieldName);
    const errors: Record<string, string> = {};

    const validateField = (name: string, val: string) => {
      if (!val || val.trim() === "") {
        return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
      }
      return null;
    };

    switch (fieldName) {
      case "firstName":
        const firstNameError = validateField("First Name", value);
        if (firstNameError) errors.firstName = firstNameError;
        break;
      case "lastName":
        const lastNameError = validateField("Last Name", value);
        if (lastNameError) errors.lastName = lastNameError;
        break;
      case "email":
        if (!value || value.trim() === "") {
          errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = "Please enter a valid email address";
        } else {
          // Check email availability asynchronously
          setEmailValidation({ checking: true, available: false, error: '' });
          try {
            const isAvailable = await checkEmailAvailability(value);
            if (isAvailable) {
              setEmailValidation({ checking: false, available: true, error: '' });
            } else {
              errors.email = "This email is already registered. Please use a different email.";
              setEmailValidation({ checking: false, available: false, error: 'Email is already registered' });
            }
          } catch (err) {
            errors.email = "Failed to check email availability";
            setEmailValidation({ checking: false, available: false, error: 'Failed to check availability' });
          }
        }
        // Set errors immediately for email field (after async validation completes)
        setFieldErrors((prev) => ({ ...prev, ...errors }));
        return; // Early return for email to avoid setting errors twice
      case "phone":
        if (!value || value.trim() === "") {
          errors.phone = "Phone number is required";
        } else if (!/^\d{10,}$/.test(value.replace(/[\s-]/g, ""))) {
          errors.phone = "Please enter a valid phone number";
        }
        break;
      case "role":
        if (!value) errors.role = "Role is required";
        break;
      case "departmentId":
        if (!value) errors.departmentId = "Department is required";
        break;
      case "designationId":
        if (!value) errors.designationId = "Designation is required";
        break;
      case "dateOfJoining":
        if (!value) errors.dateOfJoining = "Joining date is required";
        break;
      case "gender":
        if (!value) errors.gender = "Gender is required";
        break;
      case "birthday":
        if (!value) errors.birthday = "Birthday is required";
        break;
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedFormats = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedFormats.includes(file.type)) {
      toast.error("Please upload image file only (JPG, JPEG, PNG).");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB.");
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
      setFormData((prev) => ({ ...prev, avatarUrl: data.secure_url }));
      setImageUpload(false);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      setImageUpload(false);
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Validate ALL required fields
    const errors: Record<string, string> = {};

    // Basic validation
    if (!formData.firstName?.trim()) {
      errors.firstName = "First name is required";
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    } else if (formData.firstName.trim().length > 50) {
      errors.firstName = "First name cannot exceed 50 characters";
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = "Last name is required";
    } else if (formData.lastName.trim().length < 1) {
      errors.lastName = "Last name must be at least 1 character";
    } else if (formData.lastName.trim().length > 50) {
      errors.lastName = "Last name cannot exceed 50 characters";
    }

    if (!formData.email?.trim()) errors.email = "Email is required";
    if (!formData.phone?.trim()) errors.phone = "Phone number is required";
    if (!formData.account.role) errors.role = "Role is required";
    if (!formData.departmentId) errors.departmentId = "Department is required";
    if (!formData.designationId) errors.designationId = "Designation is required";
    if (!formData.dateOfJoining) errors.dateOfJoining = "Date of joining is required";
    if (!formData.gender) errors.gender = "Gender is required";
    if (!formData.dateOfBirth) errors.birthday = "Date of birth is required";

    // Shift assignment validation (only if not explicitly set to 'none')
    if (selectedShiftAssignment.type !== 'none' && !selectedShiftAssignment.type && !formData.shiftId && !formData.batchId) {
      errors.shiftAssignment = "Shift assignment is required";
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Phone format validation
    const phoneRegex = /^\d{10,}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/[\s-]/g, ""))) {
      errors.phone = "Please enter a valid phone number (at least 10 digits)";
    }

    // Date validation: Joining date must be on or after date of birth
    if (formData.dateOfJoining && formData.dateOfBirth) {
      const joiningDate = toDayjsDate(formData.dateOfJoining);
      const birthDate = toDayjsDate(formData.dateOfBirth);

      if (joiningDate && birthDate && joiningDate.isBefore(birthDate, 'day')) {
        errors.dateOfJoining = "Joining date must be on or after date of birth";
      }
    }

    // If validation errors exist, display them and stop
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

    // Async validation for email availability
    setIsValidating(true);
    try {
      const isEmailAvailable = await checkEmailAvailability(formData.email);
      if (!isEmailAvailable) {
        setFieldErrors((prev) => ({
          ...prev,
          email: "This email is already registered. Please use a different email."
        }));
        toast.error("This email is already registered. Please use a different email.");
        setIsValidating(false);
        return;
      }
    } catch (err) {
      toast.error("Failed to validate email. Please try again.");
      setIsValidating(false);
      return;
    }

    // Submit to backend
    try {
      const payload: any = {
        ...formData,
      };

      // Remove fields not allowed in backend validation schema
      // Note: shiftId and batchId are now saved with the employee

      // Remove reportingTo if it's empty (optional field)
      if (!payload.reportingTo || payload.reportingTo.trim() === '') {
        delete payload.reportingTo;
      }

      // Ensure avatarUrl is valid or use default
      if (!payload.avatarUrl || payload.avatarUrl === "assets/img/profiles/profile.png") {
        // Use default profile image or remove it to let backend set default
        delete payload.avatarUrl;
      }

      const result = await createEmployee(payload);

      if (result.success) {
        const roleLabel = formData.account.role || "Employee";
        toast.success(`${roleLabel} added successfully!`);
        handleResetFormData();
        closeModal();
        if (modalRef.current) {
          modalRef.current.click();
        }
        onSuccess?.();
      } else if (result.error) {
        // Display backend validation errors
        const backendErrors: Record<string, string> = {};

        // Handle array of errors (Joi validation format)
        if (Array.isArray(result.error.errors)) {
          result.error.errors.forEach((err: any) => {
            if (err.field) {
              backendErrors[err.field] = err.message || `Invalid ${err.field}`;
            }
          });
          // Show first error as toast
          if (result.error.errors.length > 0) {
            toast.error(result.error.errors[0].message || "Validation failed");
          }
        } else if (result.error.field) {
          // Single field-specific error
          backendErrors[result.error.field] = result.error.message || result.error.details;
          toast.error(result.error.message || "Validation failed");
        } else {
          // General error
          toast.error(result.error.message || "Failed to add employee");
        }

        if (Object.keys(backendErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...backendErrors }));
          // Scroll to first error
          const firstErrorField = Object.keys(backendErrors)[0];
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    } catch (error: any) {
      // Handle unexpected errors
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
        } else if (apiError.field) {
          setFieldErrors((prev) => ({
            ...prev,
            [apiError.field]: apiError.message
          }));
          toast.error(apiError.message || "Validation failed");
        } else {
          toast.error(apiError.message || "Failed to add employee");
        }
      } else {
        toast.error(error.message || "Failed to add employee");
      }
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <>
      <div className="modal fade" id="add_employee">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <div className="d-flex align-items-center">
                <h4 className="modal-title me-2">Add New Employee</h4>
                <span>Employee ID : {formData.employeeId}</span>
              </div>
              <button
                type="button"
                className="btn-close custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
                onClick={() => {
                  handleResetFormData();
                  closeModal();
                }}
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
                          {formData.avatarUrl ? (
                            <img
                              src={formData.avatarUrl}
                              alt="Profile"
                              className="avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0"
                            />
                          ) : (
                            <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                              <i className="ti ti-photo text-gray-2 fs-16" />
                            </div>
                          )}
                          <div className="profile-upload">
                            <div className="mb-2">
                              <h6 className="mb-1">Upload Profile Image (Optional)</h6>
                              <p className="fs-12">Image should be below 4 mb</p>
                            </div>
                            <div className="profile-uploader d-flex align-items-center">
                              <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                {loading ? "Uploading..." : "Upload"}
                                <input
                                  type="file"
                                  className="form-control image-sign"
                                  accept=".png,.jpeg,.jpg,.ico"
                                  ref={fileInputRef}
                                  onChange={handleImageUpload}
                                  disabled={loading}
                                  style={{ cursor: loading ? "not-allowed" : "pointer", opacity: 0, position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: "assets/img/profiles/profile.png" }))}
                                disabled={loading}
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
                            className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("firstName")}
                            onBlur={(e) => handleFieldBlur("firstName", e.target.value)}
                          />
                          {fieldErrors.firstName && <div className="invalid-feedback d-block">{fieldErrors.firstName}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Last Name <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.lastName ? "is-invalid" : ""}`}
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            onFocus={() => clearFieldError("lastName")}
                            onBlur={(e) => handleFieldBlur("lastName", e.target.value)}
                          />
                          {fieldErrors.lastName && <div className="invalid-feedback d-block">{fieldErrors.lastName}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Employee ID <span className="text-danger"> *</span></label>
                          <input type="text" className="form-control" value={formData.employeeId} readOnly />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Joining Date <span className="text-danger"> *</span></label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className={`form-control datetimepicker ${fieldErrors.dateOfJoining ? "is-invalid" : ""}`}
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              name="dateOfJoining"
                              value={toDayjsDate(formData.dateOfJoining)}
                              onFocus={() => clearFieldError("dateOfJoining")}
                              onChange={(date, dateString) => {
                                handleDateChange(date, dateString as string);
                                handleFieldBlur("dateOfJoining", dateString as string);
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
                            className={`select ${fieldErrors.role ? "is-invalid" : ""}`}
                            options={roleOptions}
                            defaultValue={roleOptions.find((opt) => opt.value === formData.account.role)}
                            onChange={(option: any) => {
                              if (option) {
                                setFormData((prev) => ({ ...prev, account: { ...prev.account, role: option.value } }));
                                clearFieldError("role");
                                handleFieldBlur("role", option.value);
                              }
                            }}
                          />
                          {fieldErrors.role && <div className="invalid-feedback d-block">{fieldErrors.role}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Email <span className="text-danger"> *</span></label>
                          <div className="position-relative">
                            <input
                              type="email"
                              className={`form-control ${fieldErrors.email || emailValidation.error ? "is-invalid" : ""} ${emailValidation.available ? "is-valid" : ""}`}
                              name="email"
                              value={formData.email}
                              onChange={(e) => {
                                setFormData((prev) => ({ ...prev, email: e.target.value }));
                                clearFieldError("email");
                                setEmailValidation({ checking: false, available: false, error: '' });
                              }}
                              onBlur={(e) => handleFieldBlur("email", e.target.value)}
                            />
                            {formData.email && formData.email.trim() && (
                              <div className="position-absolute" style={{ right: '35px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                {emailValidation.checking && <span className="spinner-border spinner-border-sm text-muted" />}
                                {!emailValidation.checking && emailValidation.available && <i className="fas fa-check-circle text-success" />}
                                {!emailValidation.checking && !emailValidation.available && emailValidation.error && <i className="fas fa-times-circle text-danger" />}
                              </div>
                            )}
                          </div>
                          {fieldErrors.email && <div className="invalid-feedback d-block">{fieldErrors.email}</div>}
                          {!fieldErrors.email && formData.email && formData.email.trim() && (
                            <div className={`form-text ${emailValidation.available ? 'text-success' : emailValidation.error ? 'text-danger' : 'text-muted'}`}>
                              {emailValidation.checking && 'Checking email availability...'}
                              {!emailValidation.checking && emailValidation.available && 'Email is available'}
                              {!emailValidation.checking && !emailValidation.available && emailValidation.error}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Phone Number <span className="text-danger"> *</span></label>
                          <input
                            type="text"
                            className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                            name="phone"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData((prev) => ({ ...prev, phone: e.target.value }));
                              clearFieldError("phone");
                            }}
                            onBlur={(e) => handleFieldBlur("phone", e.target.value)}
                          />
                          {fieldErrors.phone && <div className="invalid-feedback d-block">{fieldErrors.phone}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Gender <span className="text-danger"> *</span></label>
                          <CommonSelect
                            className={`select ${fieldErrors.gender ? "is-invalid" : ""}`}
                            options={genderOptions}
                            defaultValue={genderOptions.find((opt) => opt.value === formData.gender)}
                            onChange={(option: any) => {
                              if (option) {
                                setFormData((prev) => ({ ...prev, gender: option.value }));
                                clearFieldError("gender");
                                handleFieldBlur("gender", option.value);
                              }
                            }}
                          />
                          {fieldErrors.gender && <div className="invalid-feedback d-block">{fieldErrors.gender}</div>}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label">Birthday <span className="text-danger"> *</span></label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className={`form-control datetimepicker ${fieldErrors.birthday ? "is-invalid" : ""}`}
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                              name="birthday"
                              value={formData.dateOfBirth ? toDayjsDate(formData.dateOfBirth) : null}
                              onFocus={() => clearFieldError("birthday")}
                              onChange={(_date, dateString) => {
                                const dateValue = Array.isArray(dateString) ? dateString[0] : dateString;
                                setFormData((prev) => ({ ...prev, dateOfBirth: dateValue || "" }));
                                handleFieldBlur("birthday", dateValue || "");
                              }}
                            />
                            <span className="input-icon-addon"><i className="ti ti-calendar text-gray-7" /></span>
                          </div>
                          {fieldErrors.birthday && <div className="invalid-feedback d-block">{fieldErrors.birthday}</div>}
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">Address</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Street"
                            name="street"
                            value={formData.address?.street || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                address: { ...prev.address, street: e.target.value },
                              }))
                            }
                          />
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="City"
                                name="city"
                                value={formData.address?.city || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, city: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="State"
                                name="state"
                                value={formData.address?.state || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, state: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="row mt-3">
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Postal Code"
                                name="postalCode"
                                value={formData.address?.postalCode || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, postalCode: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="col-md-6">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Country"
                                name="country"
                                value={formData.address?.country || ""}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    address: { ...prev.address, country: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>
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
                                defaultValue={department.find((opt) => opt.value === formData.departmentId)}
                                onChange={(option: any) => {
                                  if (option) {
                                    setFormData((prev) => ({ ...prev, departmentId: option.value, designationId: "" }));
                                    setSelectedDepartment(option.value);
                                    setIsDesignationDisabled(false);
                                    if (option.value) {
                                      fetchDesignations({ departmentId: option.value });
                                    }
                                  }
                                }}
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
                                defaultValue={designation.find((opt) => opt.value === formData.designationId)}
                                onChange={(option: any) => {
                                  if (option) {
                                    setFormData((prev) => ({ ...prev, designationId: option.value }));
                                    clearFieldError("designationId");
                                    handleFieldBlur("designationId", option.value);
                                  }
                                }}
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
                            defaultValue={managers.find((opt) => opt.value === formData.reportingTo)}
                            onChange={(option: any) => {
                              if (option) {
                                setFormData((prev) => ({ ...prev, reportingTo: option.value }));
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
                                    setFormData((prev) => ({
                                      ...prev,
                                      shiftId: '',
                                      batchId: '',
                                    }));
                                    clearFieldError('shiftAssignment');
                                  } else {
                                    const [type, value] = e.target.value.split('-');
                                    setSelectedShiftAssignment({ type: type as 'shift' | 'batch', value });
                                    setFormData((prev) => ({
                                      ...prev,
                                      shiftId: type === 'shift' ? value : '',
                                      batchId: type === 'batch' ? value : '',
                                    }));
                                    clearFieldError('shiftAssignment');
                                  }
                                }}
                                onBlur={() => {
                                  if (selectedShiftAssignment.type !== 'none' && !selectedShiftAssignment.type && !formData.shiftId && !formData.batchId) {
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
                            value={formData.employmentType}
                            onChange={(e) => setFormData((prev) => ({ ...prev, employmentType: e.target.value as any }))}
                          >
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Intern">Intern</option>
                          </select>
                        </div>
                      </div>
                      <div className="col-md-12">
                        <div className="mb-3">
                          <label className="form-label">About</label>
                          <textarea
                            className="form-control"
                            rows={4}
                            value={formData.about}
                            onChange={(e) => setFormData((prev) => ({ ...prev, about: e.target.value }))}
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
                      onClick={handleResetFormData}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={isValidating || loading}
                      onClick={handleSubmit}
                    >
                      {isValidating ? "Adding..." : `Add ${formData.account.role || "Employee"}`}
                    </button>
                  </div>
                </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddEmployeeModal;
