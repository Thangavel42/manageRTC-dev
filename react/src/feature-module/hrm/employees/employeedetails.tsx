import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams, } from 'react-router-dom'
import PredefinedDateRanges from '../../../core/common/datePicker'
import Table from "../../../core/common/dataTable/index";
import { all_routes } from '../../router/all_routes';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { employeereportDetails } from '../../../core/data/json/employeereportDetails';
import { DatePicker, TimePicker } from "antd";
import CommonSelect from '../../../core/common/commonSelect';
import CollapseHeader from '../../../core/common/collapse-header/collapse-header';
import { useSocket } from "../../../SocketContext";
import { Socket } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import Footer from "../../../core/common/footer";

import dayjs from 'dayjs';

type PasswordField = "password" | "confirmPassword";

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

const MODULES: PermissionModule[] = [
    "holidays", "leaves", "clients", "projects", "tasks", "chats", "assets", "timingSheets"
];

const ACTIONS: PermissionAction[] = [
    "read", "write", "create", "delete", "import", "export"
];

const initialPermissionsState = {
    enabledModules: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false,
    },
    permissions: {
        holidays: { read: false, write: false, create: false, delete: false, import: false, export: false },
        leaves: { read: false, write: false, create: false, delete: false, import: false, export: false },
        clients: { read: false, write: false, create: false, delete: false, import: false, export: false },
        projects: { read: false, write: false, create: false, delete: false, import: false, export: false },
        tasks: { read: false, write: false, create: false, delete: false, import: false, export: false },
        chats: { read: false, write: false, create: false, delete: false, import: false, export: false },
        assets: { read: false, write: false, create: false, delete: false, import: false, export: false },
        timingSheets: { read: false, write: false, create: false, delete: false, import: false, export: false },
    },
    selectAll: {
        holidays: false,
        leaves: false,
        clients: false,
        projects: false,
        tasks: false,
        chats: false,
        assets: false,
        timingSheets: false,
    }
};

interface Passport {
    number: string;
    issueDate: string; // ISO date string
    expiryDate: string; // ISO date string
    country: string;
}

interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface PersonalInfo {
    gender: string;
    birthday: string; // ISO date string
    maritalStatus: string;
    religion: string;
    employmentOfSpouse: boolean;
    noOfChildren: number;
    passport: Passport;
    address: Address;
}

interface ContactInfo {
    phone: string;
    email: string;
}

interface AccountInfo {
    userName: string;
    password: string;
}

interface EmergencyContact {
    name: string;
    relation: string;
    phone: string;
    email: string;
}

interface BankInfo {
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
    branch: string;
    ifscCode: string;
}

interface FamilyInfo {
    spouseName: string | null;
    children: string[];
    parents: {
        father: string;
        mother: string;
    };
}

interface EducationEntry {
    degree: string;
    institution: string;
    startYear: number;
    endYear: number;
    grade: string;
}

interface ExperienceEntry {
    company: string;
    designation: string;
    startDate: string; // ISO date string
    endDate: string; // ISO date string
    responsibilities: string[];
}

interface Asset {
    assetName: string;
    serialNumber: string;
    issuedDate: string; // ISO date string
    status: string;
    assignedBy: string;
    assetImageUrl: string;
    assigneeAvatar: string;
}

interface SalaryInfo {
    basic: number;
    hra: number;
    allowance: number;
    total: number;
}

interface PFInfo {
    accountNumber: string;
    contributionPercent: number;
    employerContributionPercent: number;
}

interface ESIInfo {
    number: string;
    contributionPercent: number;
    employerContributionPercent: number;
}

interface Statutory {
    salary: SalaryInfo;
    pf: PFInfo;
    esi: ESIInfo;
}

export interface Employee {
    _id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    dateOfJoining: string; // ISO date string
    departmentId: string;
    designation: string;
    department: string;
    role: string;
    timeZone: string;
    companyName: string;
    about: string;
    status: string;
    reportOffice?: string;
    managerId?: string;
    leadId?: string;
    avatar: string;
    yearsOfExperience?: number;
    contact: ContactInfo;
    personal: PersonalInfo;
    account: AccountInfo;
    emergencyContacts: EmergencyContact[];
    bank: BankInfo;
    family: FamilyInfo;
    education: EducationEntry[];
    experience: ExperienceEntry[];
    assets: Asset[];
    statutory: Statutory;
    updatedBy: string;
    designationId: string;
    avatarUrl: string;
    clientId: string;
}

const EmployeeDetails = () => {
    const [permissions, setPermissions] = useState<PermissionsState>(initialPermissionsState);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageUpload, setImageUpload] = useState(false);
    const [currentTab, setCurrentTab] = useState<'info' | 'permissions'>('info');
    const editEmployeeModalRef = useRef<HTMLButtonElement>(null);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [editFormData, setEditFormData] = useState<Partial<Employee>>({});
    const [maritalStatus, setMaritalStatus] = useState<string>("");
    const [bankFormData, setBankFormData] = useState({
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        branch: ""
    });

    // Handle Next button click
    const handleNext = () => {
        handleEditSubmit(undefined as any).then(() => {
            // Switch to permissions tab
            const addressTab = document.getElementById('address-tab3');
            if (addressTab) {
                addressTab.click();
            }
            setCurrentTab('permissions');
        });
    };

    // Handle permissions update
    const handlePermissionUpdateSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!socket || !employee) return;
        try {
            setLoading(true);
            const payload = {
                employeeId: employee._id,
                permissions: permissions.permissions,
                enabledModules: permissions.enabledModules,
            };
            socket.emit("hrm/employees/update-permissions", payload);
            toast.success("Employee permissions update request sent.");
        } catch (error) {
            toast.error("Failed to update permissions");
            console.error("Permissions update error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle file upload
    const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "amasqis");

        const res = await fetch(
            "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
            {
                method: "POST",
                body: formData,
            }
        );

        const data = await res.json();
        return data.secure_url;
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const maxSize = 4 * 1024 * 1024; // 4MB
        if (file.size > maxSize) {
            toast.error("File size must be less than 4MB.", { position: "top-right", autoClose: 3000 });
            event.target.value = "";
            return;
        }

        if (["image/jpeg", "image/png", "image/jpg", "image/ico"].includes(file.type)) {
            setImageUpload(true);
            try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "amasqis");
                const res = await fetch(
                    "https://api.cloudinary.com/v1_1/dwc3b5zfe/image/upload",
                    { method: "POST", body: formData }
                );
                const data = await res.json();
                setEditFormData(prev => ({ ...prev, avatarUrl: data.secure_url }));
                setImageUpload(false);
                toast.success("Image uploaded successfully!", { position: "top-right", autoClose: 3000 });
            } catch (error) {
                setImageUpload(false);
                toast.error("Failed to upload image. Please try again.", { position: "top-right", autoClose: 3000 });
                event.target.value = "";
            }
        } else {
            toast.error("Please upload image file only.", { position: "top-right", autoClose: 3000 });
            event.target.value = "";
        }
    };

    const removeLogo = () => {
        setEditFormData(prev => ({ ...prev, avatarUrl: "" }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Handle bank form validation and submission
    const handleBankFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields are filled
        if (!bankFormData.bankName || !bankFormData.accountNumber || 
            !bankFormData.ifscCode || !bankFormData.branch) {
            toast.error("All bank details fields are required!", {
                position: "top-right",
                autoClose: 3000,
            });
            return;
        }

        if (!socket || !employee) {
            toast.error("Cannot save bank details at this time.", {
                position: "top-right",
                autoClose: 3000,
            });
            return;
        }

        // Submit bank details to backend
        const payload = {
            employeeId: employee.employeeId,
            bank: {
                ...bankFormData,
                accountHolderName: `${employee.firstName} ${employee.lastName}`
            }
        };

        socket.emit("hrm/employees/update-bank", payload);
        toast.success("Bank details update request sent!", {
            position: "top-right",
            autoClose: 3000,
        });
        
        // Close modal programmatically
        const closeButton = document.querySelector('#edit_bank [data-bs-dismiss="modal"]') as HTMLButtonElement;
        if (closeButton) closeButton.click();
    };

    // Permissions handlers
    const toggleModule = (module: PermissionModule) => {
        setPermissions((prev) => ({
            ...prev,
            enabledModules: {
                ...prev.enabledModules,
                [module]: !prev.enabledModules[module],
            },
        }));
    };

    const toggleSelectAllForModule = (module: PermissionModule) => {
        setPermissions((prev) => {
            const newSelectAllState = !prev.selectAll[module];
            const newPermissionsForModule: PermissionSet = ACTIONS.reduce(
                (acc, action) => {
                    acc[action] = newSelectAllState;
                    return acc;
                },
                {} as PermissionSet
            );

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [module]: newPermissionsForModule,
                },
                selectAll: {
                    ...prev.selectAll,
                    [module]: newSelectAllState,
                },
            };
        });
    };

    const toggleAllModules = (enable: boolean) => {
        setPermissions((prev) => {
            const newEnabledModules: Record<PermissionModule, boolean> = MODULES.reduce(
                (acc, module) => {
                    acc[module] = enable;
                    return acc;
                },
                {} as Record<PermissionModule, boolean>
            );

            return {
                ...prev,
                enabledModules: newEnabledModules,
            };
        });
    };

    const toggleGlobalSelectAll = (checked: boolean) => {
        setPermissions((prev) => {
            // Build new permissions for every module & action
            const newPermissions: Record<PermissionModule, PermissionSet> = MODULES.reduce(
                (accModules, module) => {
                    const newModulePermissions: PermissionSet = ACTIONS.reduce(
                        (accActions, action) => {
                            accActions[action] = checked;
                            return accActions;
                        },
                        {} as PermissionSet
                    );
                    accModules[module] = newModulePermissions;
                    return accModules;
                },
                {} as Record<PermissionModule, PermissionSet>
            );

            // Build new selectAll flags for every module
            const newSelectAll: Record<PermissionModule, boolean> = MODULES.reduce(
                (acc, module) => {
                    acc[module] = checked;
                    return acc;
                },
                {} as Record<PermissionModule, boolean>
            );

            return {
                ...prev,
                permissions: newPermissions,
                selectAll: newSelectAll,
            };
        });
    };

    const handlePermissionChange = (
        module: PermissionModule,
        action: PermissionAction,
        checked: boolean
    ) => {
        setPermissions((prev) => {
            const updatedModulePermissions = {
                ...prev.permissions[module],
                [action]: checked,
            };

            // Check if all actions selected for this module
            const allSelected = ACTIONS.every(
                (act) => updatedModulePermissions[act]
            );

            return {
                ...prev,
                permissions: {
                    ...prev.permissions,
                    [module]: updatedModulePermissions,
                },
                selectAll: {
                    ...prev.selectAll,
                    [module]: allSelected,
                },
            };
        });
    };

    const allPermissionsSelected = () => {
        return MODULES.every(module =>
            ACTIONS.every(action => permissions.permissions[module][action])
        );
    };
    const { employeeId } = useParams();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const socket = useSocket() as Socket | null;
    const [passwordVisibility, setPasswordVisibility] = useState({
        password: false,
        confirmPassword: false,
    });

    // Initialize edit form data when employee data is loaded
    useEffect(() => {
        if (employee) {
            setEditingEmployee(employee);
            setEditFormData({
                ...employee,
                dateOfJoining: employee.dateOfJoining || "",
                personal: {
                    ...employee.personal,
                    birthday: employee.personal?.birthday || null,
                    gender: employee.personal?.gender || "",
                    address: {
                        street: employee.personal?.address?.street || "",
                        city: employee.personal?.address?.city || "",
                        state: employee.personal?.address?.state || "",
                        postalCode: employee.personal?.address?.postalCode || "",
                        country: employee.personal?.address?.country || "",
                    }
                }
            });
            
            // Initialize bank form data
            setBankFormData({
                bankName: employee.bank?.bankName || "",
                accountNumber: employee.bank?.accountNumber || "",
                ifscCode: employee.bank?.ifscCode || "",
                branch: employee.bank?.branch || ""
            });
            
            // Initialize marital status
            setMaritalStatus(employee.personal?.maritalStatus || "");
        }
    }, [employee]);

    // Handle edit form changes
    const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const parts = name.split('.');
            setEditFormData(prev => {
                if (parts.length === 3 && parts[0] === 'personal' && parts[1] === 'address') {
                    // Handle personal.address.field updates
                    const currentAddress = prev.personal?.address || {
                        street: "",
                        city: "",
                        state: "",
                        postalCode: "",
                        country: ""
                    };
                    return {
                        ...prev,
                        personal: {
                            ...prev.personal,
                            address: {
                                ...currentAddress,
                                [parts[2]]: value
                            }
                        }
                    };
                } else if (parts.length === 2) {
                    // Handle other nested fields
                    const [parent, child] = parts;
                    return {
                        ...prev,
                        [parent]: {
                            ...(prev[parent as keyof Employee] as any),
                            [child]: value
                        }
                    };
                }
                return prev;
            });
        } else {
            setEditFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleEditSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editFormData || !socket) {
            toast.error("No employee data available for editing.");
            return;
        }
        
        const payload = {
            employeeId: editFormData.employeeId || "",
            firstName: editFormData.firstName || "",
            lastName: editFormData.lastName || "",
            account: {
                userName: editFormData.account?.userName || "",
            },
            contact: {
                email: editFormData.contact?.email || "",
                phone: editFormData.contact?.phone || "",
            },
            personal: {
                gender: editFormData.personal?.gender || "",
                birthday: editFormData.personal?.birthday || null,
                address: editFormData.personal?.address || {
                    street: "",
                    city: "",
                    state: "",
                    postalCode: "",
                    country: "",
                },
            },
            companyName: editFormData.companyName || "",
            departmentId: editFormData.departmentId || "",
            designationId: editFormData.designationId || "",
            dateOfJoining: editFormData.dateOfJoining || null,
            about: editFormData.about || "",
            avatarUrl: editFormData.avatarUrl || "",
            status: editFormData.status || "Active",
        };

        try {
            socket.emit("hrm/employees/update", payload);
            toast.success("Employee update request sent.", {
                position: "top-right",
                autoClose: 3000,
            });
        } catch (error) {
            toast.error("Failed to update employee.", {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    useEffect(() => {
        if (!socket || !employeeId) return;

        let isMounted = true;
        setLoading(true);

        const timeoutId = setTimeout(() => {
            if (loading && isMounted) {
                console.warn("Employees loading timeout - showing fallback");
                setError("Employees loading timed out. Please refresh the page.");
                setLoading(false);
            }
        }, 30000);

        const payload = {
            employeeId: employeeId,
        }
        socket.emit("hrm/employees/get-details", payload);

        const handleDetailsResponse = (response: any) => {
            if (!isMounted) return;

            if (response.done) {
                setEmployee(response.data);
                setError(null);
                setLoading(false);
            } else {
                console.log(error);
                setError(response.error || "Failed to fetch details");
                setLoading(false);
            }
        };
        
        const handleUpdateEmployeeResponse = (response: any) => {
            if (response.done) {
                toast.success("Employee updated successfully!", {
                    position: "top-right",
                    autoClose: 3000,
                });
                
                // Refresh employee details
                if (socket) {
                    socket.emit("hrm/employees/get-details", { employeeId: employeeId });
                }
                setError(null);
            } else {
                toast.error(response.error || "Failed to update employee.", {
                    position: "top-right",
                    autoClose: 3000,
                });
                setError(response.error || "Failed to update employee.");
            }
        };
        
        const handleBankUpdateResponse = (response: any) => {
            if (response.done) {
                toast.success("Bank details updated successfully!", {
                    position: "top-right",
                    autoClose: 3000,
                });
                // Refresh employee details
                if (socket) {
                    socket.emit("hrm/employees/get-details", { employeeId: employeeId });
                }
            } else {
                toast.error(response.error || "Failed to update bank details.", {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        };

        socket.on("hrm/employees/get-details-response", handleDetailsResponse);
        socket.on("hrm/employees/update-response", handleUpdateEmployeeResponse);
        socket.on("hrm/employees/update-bank-response", handleBankUpdateResponse);

        return () => {
            socket.off("hrm/employees/get-details-response", handleDetailsResponse);
            socket.off("hrm/employees/update-response", handleUpdateEmployeeResponse);
            socket.off("hrm/employees/update-bank-response", handleBankUpdateResponse);
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [socket, employeeId]);

    if (!employeeId) {
        return (
            <div className='alert alert-warning d-flex align-items-center justify-content-center pt-50 mt-5'>
                <Link to={all_routes.employeeList} className="btn btn-outline-primary btn-sm">
                    Select an employee from the Employee List
                </Link>
            </div>
        )
    }

    if (loading) {
        return <p className='text-center'>Loading employee data</p>
    }

    if ( error && !employee) {
        return (<div className="page-wrapper">
            <div className="content">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Error!</h4>
                    <p>{error}</p>
                </div>
            </div>
        </div>
        )
    }

    const togglePasswordVisibility = (field: PasswordField) => {
        setPasswordVisibility((prevState) => ({
            ...prevState,
            [field]: !prevState[field],
        }));
    };

    const getModalContainer = () => {
        const modalElement = document.getElementById('edit_employee') || document.getElementById('modal-datepicker');
        return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
    };
    const getModalContainer2 = () => {
        const modalElement = document.getElementById('modal_datepicker');
        return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
    };

    const data = employeereportDetails;
    const columns = [
        {
            title: "Name",
            dataIndex: "Name",
            render: (text: String, record: any) => (
                <Link to={all_routes.employeedetails} className="link-default">Emp-001</Link>

            ),
            sorter: (a: any, b: any) => a.Name.length - b.Name.length,
        },
        {
            title: "Email",
            dataIndex: "Email",
            sorter: (a: any, b: any) => a.Email.length - b.Email.length,
        },
        {
            title: "Created Date",
            dataIndex: "CreatedDate",
            sorter: (a: any, b: any) => a.CreatedDate.length - b.CreatedDate.length,
        },
        {
            title: "Role",
            dataIndex: "Role",
            render: (text: String, record: any) => (
                <span className={`badge d-inline-flex align-items-center badge-xs ${text === 'Employee' ? 'badge-pink-transparent' : 'badge-soft-purple'}`}>
                    {text}
                </span>

            ),
            sorter: (a: any, b: any) => a.Role.length - b.Role.length,
        },
        {
            title: "Status",
            dataIndex: "Status",
            render: (text: String, record: any) => (
                <span className={`badge d-inline-flex align-items-center badge-xs ${text === 'Active' ? 'badge-success' : 'badge-danger'}`}>
                    <i className="ti ti-point-filled me-1" />
                    {text}
                </span>

            ),
            sorter: (a: any, b: any) => a.Status.length - b.Status.length,
        },
    ]

    interface Option {
        value: string;
        label: string;
    }

    const departmentChoose: Option[] = [
        { value: "Select", label: "Select" },
        { value: "All Department", label: "All Department" },
        { value: "Finance", label: "Finance" },
        { value: "Developer", label: "Developer" },
        { value: "Executive", label: "Executive" },
    ];
    const designationChoose: Option[] = [
        { value: "Select", label: "Select" },
        { value: "Finance", label: "Finance" },
        { value: "Developer", label: "Developer" },
        { value: "Executive", label: "Executive" },
    ];
    const martialstatus = [
        { value: "Select", label: "Select" },
        { value: "Yes", label: "Yes" },
        { value: "No", label: "No" },
    ];
    const salaryChoose = [
        { value: "Select", label: "Select" },
        { value: "Monthly", label: "Monthly" },
        { value: "Annualy", label: "Annualy" },
    ];
    const paymenttype = [
        { value: "Select", label: "Select" },
        { value: "Cash", label: "Cash" },
        { value: "Debit Card", label: "Debit Card" },
        { value: "Mobile Payment", label: "Mobile Payment" },
    ];
    const pfcontribution = [
        { value: "Select", label: "Select" },
        { value: "Employee Contribution", label: "Employee Contribution" },
        { value: "Employer Contribution", label: "Employer Contribution" },
        { value: "Provident Fund Interest", label: "Provident Fund Interest" },
    ];
    const additionalrate = [
        { value: "Select", label: "Select" },
        { value: "ESI", label: "ESI" },
        { value: "EPS", label: "EPS" },
        { value: "EPF", label: "EPF" },
    ];
    const esi = [
        { value: "Select", label: "Select" },
        { value: "Employee Contribution", label: "Employee Contribution" },
        { value: "Employer Contribution", label: "Employer Contribution" },
        { value: "Maternity Benefit ", label: "Maternity Benefit " },
    ];

    function formatDate(isoDateString?: string) {
        if (!isoDateString) return ""; // handle undefined or empty

        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return "";

        const day = date.getDate();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();

        return `${day} ${month} ${year}`;
    }

    return (
        <>
            {/* Page Wrapper */}
            <div className="page-wrapper">
                <div className="content">
                    {/* Breadcrumb */}
                    <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                        <div className="my-auto mb-2">
                            <h6 className="fw-medium d-inline-flex align-items-center mb-3 mb-sm-0">
                                <Link to={all_routes.employeeList}>
                                    <i className="ti ti-arrow-left me-2" />
                                    Employee List
                                </Link>
                            </h6>
                        </div>
                        <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                            <div className="mb-2">
                                <Link
                                    to="#"
                                    data-bs-toggle="modal" data-inert={true}
                                    data-bs-target="#add_bank_satutory"
                                    className="btn btn-primary d-flex align-items-center"
                                >
                                    <i className="ti ti-circle-plus me-2" />
                                    Bank & Statutory
                                </Link>
                            </div>
                            <div className="head-icons ms-2">
                                <CollapseHeader />
                            </div>
                        </div>
                    </div>
                    {/* /Breadcrumb */}
                    <div className="row">
                        <div className="col-xl-4 theiaStickySidebar">
                            <div className="card card-bg-1">
                                <div className="card-body p-0">
                                    <span className="avatar avatar-xl avatar-rounded border border-2 border-white m-auto d-flex mb-2">
                                        {employee?.avatarUrl ? (
                                            <img
                                                src={employee.avatarUrl}
                                                alt="Profile"
                                                className="w-100 h-100 object-fit-cover"
                                            />
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center w-100 h-100 bg-light rounded-circle">
                                                <i className="ti ti-user fs-24 text-gray-5" />
                                            </div>
                                        )}
                                    </span>
                                    <div className="text-center px-3 pb-3 border-bottom">
                                        <div className="mb-3">
                                            <h5 className="d-flex align-items-center justify-content-center mb-1">
                                                {employee?.firstName} {employee?.lastName}
                                                <i className="ti ti-discount-check-filled text-success ms-1" />
                                            </h5>
                                            <span className="badge badge-soft-dark fw-medium me-2">
                                                <i className="ti ti-point-filled me-1" />
                                                {employee?.role || 'employee'}
                                            </span>
                                            <span className="badge badge-soft-secondary fw-medium">
                                                <i className="ti ti-point-filled me-1" />
                                                Years of Experience: {employee?.yearsOfExperience || '-'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="d-inline-flex align-items-center">
                                                    <i className="ti ti-id me-2" />
                                                    Employee ID
                                                </span>
                                                <p className="text-dark">{employee?.employeeId || '-'}</p>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="d-inline-flex align-items-center">
                                                    <i className="ti ti-calendar-check me-2" />
                                                    Date Of Join
                                                </span>
                                                <p className="text-dark">{formatDate(employee?.dateOfJoining) || '-'}</p>
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="d-inline-flex align-items-center">
                                                    <i className="ti ti-calendar-check me-2" />
                                                    Report Office
                                                </span>
                                                <div className="d-flex align-items-center">
                                                    {/* <span className="avatar avatar-sm avatar-rounded me-2">
                                                        <ImageWithBasePath
                                                            src="assets/img/profiles/avatar-12.jpg"
                                                            alt="Img"
                                                        />
                                                    </span> */}
                                                    <p className="text-gray-9 mb-0">{employee?.reportOffice}</p>
                                                </div>
                                            </div>
                                            <div className="row gx-2 mt-3">
                                                <div className="col-6">
                                                    <div>
                                                        <Link
                                                            to="#"
                                                            className="btn btn-dark w-100"
                                                            data-bs-toggle="modal" data-inert={true}
                                                            data-bs-target="#edit_employee"
                                                        >
                                                            <i className="ti ti-edit me-1" />
                                                            Edit Info
                                                        </Link>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div>
                                                        <Link to={all_routes.chat} className="btn btn-primary w-100">
                                                            <i className="ti ti-message-heart me-1" />
                                                            Message
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 border-bottom">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <h6>Basic information</h6>
                                            <Link
                                                to="#"
                                                className="btn btn-icon btn-sm"
                                                data-bs-toggle="modal" data-inert={true}
                                                data-bs-target="#edit_employee"
                                            >
                                                <i className="ti ti-edit" />
                                            </Link>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-phone me-2" />
                                                Phone
                                            </span>
                                            <p className="text-dark">{employee?.contact?.phone || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-mail-check me-2" />
                                                Email
                                            </span>
                                            <Link
                                                to="#"
                                                className="text-info d-inline-flex align-items-center"
                                            >
                                                {employee?.contact?.email || '-'}
                                                <i className="ti ti-copy text-dark ms-2" />
                                            </Link>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-gender-male me-2" />
                                                Gender
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.gender || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-cake me-2" />
                                                Birdthday
                                            </span>
                                            <p className="text-dark text-end">{formatDate(employee?.personal?.birthday) || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-map-pin-check me-2" />
                                                Address
                                            </span>
                                            <p className="text-dark text-end">
                                                {employee?.personal?.address?.street} {employee?.personal?.address?.city || '-'} <br /> {employee?.personal?.address?.state || '-'} {employee?.personal?.address?.country || '-'} {employee?.personal?.address?.postalCode || '-'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-3 border-bottom">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <h6>Personal Information</h6>
                                            <Link
                                                to="#"
                                                className="btn btn-icon btn-sm"
                                                data-bs-toggle="modal" data-inert={true}
                                                data-bs-target="#edit_personal"
                                            >
                                                <i className="ti ti-edit" />
                                            </Link>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-e-passport me-2" />
                                                Passport No
                                            </span>
                                            <p className="text-dark">{employee?.personal?.passport?.number || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-calendar-x me-2" />
                                                Passport Exp Date
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.passport?.expiryDate || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-gender-male me-2" />
                                                Nationality
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.passport?.country || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-bookmark-plus me-2" />
                                                Religion
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.religion || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-hotel-service me-2" />
                                                Marital status
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.maritalStatus || '-'}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-briefcase-2 me-2" />
                                                Employment of spouse
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.employmentOfSpouse || "-"}</p>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <span className="d-inline-flex align-items-center">
                                                <i className="ti ti-baby-bottle me-2" />
                                                No. of children
                                            </span>
                                            <p className="text-dark text-end">{employee?.personal?.noOfChildren || '-'}</p>
                                        </div>
                                        
                                        {/* Emergency Contact Number Section - Now inside Personal Information */}
                                        <div className="border-top mt-3 pt-3">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <h6 className="mb-0">Emergency Contact Number</h6>
                                                <Link
                                                    to="#"
                                                    className="btn btn-icon btn-sm"
                                                    data-bs-toggle="modal" data-inert={true}
                                                    data-bs-target="#edit_emergency"
                                                >
                                                    <i className="ti ti-edit" />
                                                </Link>
                                            </div>
                                            {employee?.emergencyContacts?.map((contact, index) => {
                                                const label = index === 0 ? "Primary" : "Secondary";
                                                return (
                                                    <div key={index} className={index > 0 ? "mt-3" : "mt-2"}>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <span className="d-inline-flex align-items-center">
                                                                <i className="ti ti-user-shield me-2" />
                                                                {label} Contact Name
                                                            </span>
                                                            <p className="text-dark text-end">{contact.name || '-'}</p>
                                                        </div>
                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                            <span className="d-inline-flex align-items-center">
                                                                <i className="ti ti-link me-2" />
                                                                Relationship
                                                            </span>
                                                            <p className="text-dark text-end">{contact.relation || '-'}</p>
                                                        </div>
                                                        <div className="d-flex align-items-center justify-content-between">
                                                            <span className="d-inline-flex align-items-center">
                                                                <i className="ti ti-phone me-2" />
                                                                Phone Number
                                                            </span>
                                                            <p className="text-dark text-end">{contact.phone || '-'}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-8">
                            <div>
                                <div className="tab-content custom-accordion-items">
                                    <div
                                        className="tab-pane active show"
                                        id="bottom-justified-tab1"
                                        role="tabpanel"
                                    >
                                        <div
                                            className="accordion accordions-items-seperate"
                                            id="accordionExample"
                                        >
                                            <div className="accordion-item">
                                                <div className="accordion-header" id="headingOne">
                                                    <div className="accordion-button">
                                                        <div className="d-flex align-items-center flex-fill">
                                                            <h5>About Employee</h5>
                                                            <Link
                                                                to="#"
                                                                className="btn btn-sm btn-icon ms-auto"
                                                                data-bs-toggle="modal" data-inert={true}
                                                                data-bs-target="#edit_employee"
                                                            >
                                                                <i className="ti ti-edit" />
                                                            </Link>
                                                            <Link
                                                                to="#"
                                                                className="d-flex align-items-center collapsed collapse-arrow"
                                                                data-bs-toggle="collapse"
                                                                data-bs-target="#primaryBorderOne"
                                                                aria-expanded="false"
                                                                aria-controls="primaryBorderOne"
                                                            >
                                                                <i className="ti ti-chevron-down fs-18" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    id="primaryBorderOne"
                                                    className="accordion-collapse collapse show border-top"
                                                    aria-labelledby="headingOne"
                                                    data-bs-parent="#accordionExample"
                                                >
                                                    <div className="accordion-body mt-2">
                                                        {employee?.about || '-'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="accordion-item">
                                                <div className="accordion-header" id="headingTwo">
                                                    <div className="accordion-button">
                                                        <div className="d-flex align-items-center flex-fill">
                                                            <h5>Bank Information</h5>
                                                            <Link
                                                                to="#"
                                                                className="btn btn-sm btn-icon ms-auto"
                                                                data-bs-toggle="modal" data-inert={true}
                                                                data-bs-target="#edit_bank"
                                                            >
                                                                <i className="ti ti-edit" />
                                                            </Link>
                                                            <Link
                                                                to="#"
                                                                className="d-flex align-items-center collapsed collapse-arrow"
                                                                data-bs-toggle="collapse"
                                                                data-bs-target="#primaryBorderTwo"
                                                                aria-expanded="false"
                                                                aria-controls="primaryBorderTwo"
                                                            >
                                                                <i className="ti ti-chevron-down fs-18" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    id="primaryBorderTwo"
                                                    className="accordion-collapse collapse border-top"
                                                    aria-labelledby="headingTwo"
                                                    data-bs-parent="#accordionExample"
                                                >
                                                    <div className="accordion-body">
                                                        <div className="row">
                                                            <div className="col-md-3">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Bank Name
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.bank?.bankName || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-3">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Bank Account No
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.bank?.accountNumber || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-3">
                                                                <span className="d-inline-flex align-items-center">
                                                                    IFSC Code
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.bank?.ifscCode || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-3">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Branch
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.bank?.branch || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-3 mt-3">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Account Holder Name
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.bank?.accountHolderName || '-'}
                                                                </h6>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="accordion-item">
                                                <div className="accordion-header" id="headingThree">
                                                    <div className="accordion-button">
                                                        <div className="d-flex align-items-center justify-content-between flex-fill">
                                                            <h5>Family Information</h5>
                                                            <div className="d-flex">
                                                                <Link
                                                                    to="#"
                                                                    className="btn btn-icon btn-sm"
                                                                    data-bs-toggle="modal" data-inert={true}
                                                                    data-bs-target="#edit_familyinformation"
                                                                >
                                                                    <i className="ti ti-edit" />
                                                                </Link>
                                                                <Link
                                                                    to="#"
                                                                    className="d-flex align-items-center collapsed collapse-arrow"
                                                                    data-bs-toggle="collapse"
                                                                    data-bs-target="#primaryBorderThree"
                                                                    aria-expanded="false"
                                                                    aria-controls="primaryBorderThree"
                                                                >
                                                                    <i className="ti ti-chevron-down fs-18" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    id="primaryBorderThree"
                                                    className="accordion-collapse collapse border-top"
                                                    aria-labelledby="headingThree"
                                                    data-bs-parent="#accordionExample"
                                                >
                                                    <div className="accordion-body">
                                                        <div className="row">
                                                            <div className="col-md-4">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Spouse Name
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.family?.spouseName || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-4">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Father's Name
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.family?.parents?.father || '-'}
                                                                </h6>
                                                            </div>
                                                            <div className="col-md-4">
                                                                <span className="d-inline-flex align-items-center">
                                                                    Mother's Name
                                                                </span>
                                                                <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                    {employee?.family?.parents?.mother || '-'}
                                                                </h6>
                                                            </div>
                                                            {employee?.family?.children && employee.family.children.length > 0 && (
                                                                <div className="col-md-12 mt-3">
                                                                    <span className="d-inline-flex align-items-center">
                                                                        Children
                                                                    </span>
                                                                    <h6 className="d-flex align-items-center fw-medium mt-1">
                                                                        {employee.family.children.join(', ')}
                                                                    </h6>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <div className="accordion-item">
                                                        <div className="row">
                                                            <div className="accordion-header" id="headingFour">
                                                                <div className="accordion-button">
                                                                    <div className="d-flex align-items-center justify-content-between flex-fill">
                                                                        <h5>Education Details</h5>
                                                                        <div className="d-flex">
                                                                            <Link
                                                                                to="#"
                                                                                className="btn btn-icon btn-sm"
                                                                                data-bs-toggle="modal" data-inert={true}
                                                                                data-bs-target="#edit_education"
                                                                            >
                                                                                <i className="ti ti-edit" />
                                                                            </Link>
                                                                            <Link
                                                                                to="#"
                                                                                className="d-flex align-items-center collapsed collapse-arrow"
                                                                                data-bs-toggle="collapse"
                                                                                data-bs-target="#primaryBorderFour"
                                                                                aria-expanded="false"
                                                                                aria-controls="primaryBorderFour"
                                                                            >
                                                                                <i className="ti ti-chevron-down fs-18" />
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div
                                                                id="primaryBorderFour"
                                                                className="accordion-collapse collapse border-top"
                                                                aria-labelledby="headingFour"
                                                                data-bs-parent="#accordionExample"
                                                            >
                                                                <div className="accordion-body">
                                                                    <div>
                                                                        {employee?.education && employee.education.length > 0 ? (
                                                                            employee.education.map((edu, index) => (
                                                                                <div key={index} className={index < employee.education.length - 1 ? "mb-3" : ""}>
                                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                                        <div>
                                                                                            <span className="d-inline-flex align-items-center fw-normal">
                                                                                                {edu.institution}
                                                                                            </span>
                                                                                            <h6 className="d-flex align-items-center mt-1">
                                                                                                {edu.degree}
                                                                                            </h6>
                                                                                            {edu.grade && (
                                                                                                <p className="text-muted mb-0">Grade: {edu.grade}</p>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-dark">{edu.startYear} - {edu.endYear}</p>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-muted">No education records available</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="accordion-item">
                                                        <div className="row">
                                                            <div className="accordion-header" id="headingFive">
                                                                <div className="accordion-button collapsed">
                                                                    <div className="d-flex align-items-center justify-content-between flex-fill">
                                                                        <h5>Experience</h5>
                                                                        <div className="d-flex">
                                                                            <Link
                                                                                to="#"
                                                                                className="btn btn-icon btn-sm"
                                                                                data-bs-toggle="modal" data-inert={true}
                                                                                data-bs-target="#edit_experience"
                                                                            >
                                                                                <i className="ti ti-edit" />
                                                                            </Link>
                                                                            <Link
                                                                                to="#"
                                                                                className="d-flex align-items-center collapsed collapse-arrow"
                                                                                data-bs-toggle="collapse"
                                                                                data-bs-target="#primaryBorderFive"
                                                                                aria-expanded="false"
                                                                                aria-controls="primaryBorderFive"
                                                                            >
                                                                                <i className="ti ti-chevron-down fs-18" />
                                                                            </Link>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div
                                                                id="primaryBorderFive"
                                                                className="accordion-collapse collapse border-top"
                                                                aria-labelledby="headingFive"
                                                                data-bs-parent="#accordionExample"
                                                            >
                                                                <div className="accordion-body">
                                                                    <div>
                                                                        {employee?.experience && employee.experience.length > 0 ? (
                                                                            employee.experience.map((exp, index) => (
                                                                                <div key={index} className={index < employee.experience.length - 1 ? "mb-3" : ""}>
                                                                                    <div className="d-flex align-items-center justify-content-between">
                                                                                        <div>
                                                                                            <h6 className="d-inline-flex align-items-center fw-medium">
                                                                                                {exp.company}
                                                                                            </h6>
                                                                                            <span className="d-flex align-items-center badge bg-secondary-transparent mt-1">
                                                                                                <i className="ti ti-point-filled me-1" />
                                                                                                {exp.designation}
                                                                                            </span>
                                                                                            {exp.responsibilities && exp.responsibilities.length > 0 && (
                                                                                                <ul className="mt-2 ps-3">
                                                                                                    {exp.responsibilities.map((resp, idx) => (
                                                                                                        <li key={idx} className="text-muted small">{resp}</li>
                                                                                                    ))}
                                                                                                </ul>
                                                                                            )}
                                                                                        </div>
                                                                                        <p className="text-dark">
                                                                                            {formatDate(exp.startDate)} - {exp.endDate ? formatDate(exp.endDate) : 'Present'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="text-muted">No experience records available</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="card">
                                                <div className="card-body">
                                                    <div className="contact-grids-tab p-0 mb-3">
                                                        <ul
                                                            className="nav nav-underline"
                                                            id="myTab"
                                                            role="tablist"
                                                        >
                                                            {/* Commented out Projects tab */}
                                                            {/* <li className="nav-item" role="presentation">
                                                                <button
                                                                    className="nav-link active"
                                                                    id="info-tab2"
                                                                    data-bs-toggle="tab"
                                                                    data-bs-target="#basic-info2"
                                                                    type="button"
                                                                    role="tab"
                                                                    aria-selected="true"
                                                                >
                                                                    Projects
                                                                </button>
                                                            </li> */}
                                                            <li className="nav-item" role="presentation">
                                                                <button
                                                                    className="nav-link"
                                                                    id="address-tab2"
                                                                    data-bs-toggle="tab"
                                                                    data-bs-target="#address2"
                                                                    type="button"
                                                                    role="tab"
                                                                    aria-selected="false"
                                                                >
                                                                    Assets
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                    <div className="tab-content" id="myTabContent3">
                                                        {/* <div
                                                            className="tab-pane fade show active"
                                                            id="basic-info2"
                                                            role="tabpanel"
                                                            aria-labelledby="info-tab2"
                                                            tabIndex={0}
                                                        > */}
                                                        {/* <div className="row">
                                                                <div className="col-md-6 d-flex">
                                                                    <div className="card flex-fill mb-4 mb-md-0">
                                                                        <div className="card-body">
                                                                            <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                                                                                <Link
                                                                                    to={all_routes.projectdetails}
                                                                                    className="flex-shrink-0 me-2"
                                                                                >
                                                                                    <ImageWithBasePath
                                                                                        src="assets/img/social/project-03.svg"
                                                                                        alt="Img"
                                                                                    />
                                                                                </Link>
                                                                                <div>
                                                                                    <h6 className="mb-1">
                                                                                        <Link to={all_routes.projectdetails}>
                                                                                            World Health
                                                                                        </Link>
                                                                                    </h6>
                                                                                    <div className="d-flex align-items-center">
                                                                                        <p className="mb-0 fs-13">8 tasks</p>
                                                                                        <p className="fs-13">
                                                                                            <span className="mx-1">
                                                                                                <i className="ti ti-point-filled text-primary" />
                                                                                            </span>
                                                                                            15 Completed
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="row">
                                                                                <div className="col-md-6">
                                                                                    <div>
                                                                                        <span className="mb-1 d-block">
                                                                                            Deadline
                                                                                        </span>
                                                                                        <p className="text-dark">
                                                                                            31 July 2025
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <div>
                                                                                        <span className="mb-1 d-block">
                                                                                            Project Lead
                                                                                        </span>
                                                                                        <Link
                                                                                            to="#"
                                                                                            className="fw-normal d-flex align-items-center"
                                                                                        >
                                                                                            <ImageWithBasePath
                                                                                                className="avatar avatar-sm rounded-circle me-2"
                                                                                                src="assets/img/profiles/avatar-01.jpg"
                                                                                                alt="Img"
                                                                                            />
                                                                                            Leona
                                                                                        </Link>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-md-6 d-flex">
                                                                    <div className="card flex-fill mb-0">
                                                                        <div className="card-body">
                                                                            <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
                                                                                <Link
                                                                                    to={all_routes.projectdetails}
                                                                                    className="flex-shrink-0 me-2"
                                                                                >
                                                                                    <ImageWithBasePath
                                                                                        src="assets/img/social/project-01.svg"
                                                                                        alt="Img"
                                                                                    />
                                                                                </Link>
                                                                                <div>
                                                                                    <h6 className="mb-1 text-truncate">
                                                                                        <Link to={all_routes.projectdetails}>
                                                                                            Hospital Administration
                                                                                        </Link>
                                                                                    </h6>
                                                                                    <div className="d-flex align-items-center">
                                                                                        <p className="mb-0 fs-13">8 tasks</p>
                                                                                        <p className="fs-13">
                                                                                            <span className="mx-1">
                                                                                                <i className="ti ti-point-filled text-primary" />
                                                                                            </span>
                                                                                            15 Completed
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="row">
                                                                                <div className="col-md-6">
                                                                                    <div>
                                                                                        <span className="mb-1 d-block">
                                                                                            Deadline
                                                                                        </span>
                                                                                        <p className="text-dark">
                                                                                            31 July 2025
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <div>
                                                                                        <span className="mb-1 d-block">
                                                                                            Project Lead
                                                                                        </span>
                                                                                        <Link
                                                                                            to="#"
                                                                                            className="fw-normal d-flex align-items-center"
                                                                                        >
                                                                                            <ImageWithBasePath
                                                                                                className="avatar avatar-sm rounded-circle me-2"
                                                                                                src="assets/img/profiles/avatar-01.jpg"
                                                                                                alt="Img"
                                                                                            />
                                                                                            Leona
                                                                                        </Link>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div> */}
                                                        <div
                                                            className="tab-pane fade show active"
                                                            id="address2"
                                                            role="tabpanel"
                                                            aria-labelledby="address-tab2"
                                                            tabIndex={0}
                                                        >
                                                            <div className="row">
                                                                {employee?.assets?.map((asset, idx) => (
                                                                    <div key={idx} className="col-md-12 d-flex mb-3">
                                                                        <div className="card flex-fill">
                                                                            <div className="card-body">
                                                                                <div className="row align-items-center">
                                                                                    <div className="col-md-8">
                                                                                        <div className="d-flex align-items-center">
                                                                                            <Link
                                                                                                to={all_routes.projectdetails}
                                                                                                className="flex-shrink-0 me-2"
                                                                                            >
                                                                                                <img
                                                                                                    src={asset.assetImageUrl || "assets/img/products/default.jpg"}
                                                                                                    className="img-fluid rounded-circle"
                                                                                                    alt={asset.assetName}
                                                                                                    style={{ width: "48px", height: "48px" }}
                                                                                                />
                                                                                            </Link>
                                                                                            <div>
                                                                                                <h6 className="mb-1">
                                                                                                    <Link to={all_routes.projectdetails}>
                                                                                                        {asset.assetName} - #{asset.serialNumber}
                                                                                                    </Link>
                                                                                                </h6>
                                                                                                <div className="d-flex align-items-center">
                                                                                                    <p>
                                                                                                        <span className="text-primary">
                                                                                                            AST - 001{" "}
                                                                                                            <i className="ti ti-point-filled text-primary mx-1" />
                                                                                                        </span>
                                                                                                        Assigned on {new Date(asset.issuedDate).toLocaleDateString()}{" "}
                                                                                                        {new Date(asset.issuedDate).toLocaleTimeString()}
                                                                                                    </p>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="col-md-3">
                                                                                        <div>
                                                                                            <span className="mb-1 d-block">Assigned by</span>
                                                                                            <Link
                                                                                                to="#"
                                                                                                className="fw-normal d-flex align-items-center"
                                                                                            >
                                                                                                <img
                                                                                                    className="avatar avatar-sm rounded-circle me-2"
                                                                                                    src={asset.assigneeAvatar || "assets/img/profiles/default.jpg"}
                                                                                                    alt="Assignee"
                                                                                                    style={{ width: "32px", height: "32px" }}
                                                                                                />
                                                                                                {asset.assignedBy || "Unknown"}
                                                                                            </Link>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="col-md-1">
                                                                                        <div className="dropdown ms-2">
                                                                                            <Link
                                                                                                to="#"
                                                                                                className="d-inline-flex align-items-center"
                                                                                                data-bs-toggle="dropdown"
                                                                                                aria-expanded="false"
                                                                                            >
                                                                                                <i className="ti ti-dots-vertical" />
                                                                                            </Link>
                                                                                            {/* <ul className="dropdown-menu dropdown-menu-end p-3">
                                                                                                <li>
                                                                                                    <Link
                                                                                                        to="#"
                                                                                                        className="dropdown-item rounded-1"
                                                                                                        data-bs-toggle="modal"
                                                                                                        data-inert={true}
                                                                                                        data-bs-target="#asset_info"
                                                                                                    >
                                                                                                        View Info
                                                                                                    </Link>
                                                                                                </li>
                                                                                                <li>
                                                                                                    <Link
                                                                                                        to="#"
                                                                                                        className="dropdown-item rounded-1"
                                                                                                        data-bs-toggle="modal"
                                                                                                        data-inert={true}
                                                                                                        data-bs-target="#refuse_msg"
                                                                                                    >
                                                                                                        Raise Issue
                                                                                                    </Link>
                                                                                                </li>
                                                                                            </ul> */}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
            {/* /Page Wrapper */}
                  {/* /Page Wrapper */}
            {/* Edit Employee */}
            <div className="modal fade" id="edit_employee">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div className="d-flex align-items-center">
                                <h4 className="modal-title me-2">Edit Employee</h4>
                                <span>Employee ID : {editFormData?.employeeId || employee?.employeeId}</span>
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
                        {/* Hidden button for programmatic modal close */}
                        <button
                            type="button"
                            ref={editEmployeeModalRef}
                            data-bs-dismiss="modal"
                            style={{ display: "none" }}
                        />
                        <form onSubmit={handleEditSubmit}>
                            <div className="contact-grids-tab">
                                <ul className="nav nav-underline" id="myTab2" role="tablist">
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className="nav-link active"
                                            id="info-tab3"
                                            data-bs-toggle="tab"
                                            data-bs-target="#basic-info3"
                                            type="button"
                                            role="tab"
                                            aria-selected="true"
                                        >
                                            Basic Information
                                        </button>
                                    </li>
                                    <li className="nav-item" role="presentation">
                                        <button
                                            className="nav-link"
                                            id="address-tab3"
                                            data-bs-toggle="tab"
                                            data-bs-target="#address3"
                                            type="button"
                                            role="tab"
                                            aria-selected="false"
                                        >
                                            Permissions
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="tab-content" id="myTabContent2">
                                <div
                                    className="tab-pane fade show active"
                                    id="basic-info3"
                                    role="tabpanel"
                                    aria-labelledby="info-tab3"
                                    tabIndex={0}
                                >
                                    <div className="modal-body pb-0">
                                        <div className="row">

                                            <div className="col-md-12">
                                                <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                                                    {editFormData.avatarUrl ? (
                                                        <img
                                                            src={editFormData.avatarUrl}
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
                                                            <h6 className="mb-1">Edit Profile Image</h6>
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
                                                                    style={{
                                                                        cursor: loading ? "not-allowed" : "pointer",
                                                                        opacity: 0,
                                                                        position: "absolute",
                                                                        top: 0,
                                                                        left: 0,
                                                                        width: "100%",
                                                                        height: "100%",
                                                                    }}
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn btn-light btn-sm"
                                                                onClick={removeLogo}
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
                                                    <label className="form-label">
                                                        First Name <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="firstName"
                                                        value={editFormData.firstName || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Last Name</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="lastName"
                                                        value={editFormData.lastName || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Employee ID <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="employeeId"
                                                        value={editFormData.employeeId || ""}
                                                        readOnly
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Date of Joining <span className="text-danger">*</span>
                                                    </label>
                                                    <div className="input-icon-end position-relative">
                                                        <DatePicker
                                                            className="form-control datetimepicker"
                                                            format="DD-MM-YYYY"
                                                            getPopupContainer={getModalContainer}
                                                            placeholder="DD-MM-YYYY"
                                                            value={editFormData.dateOfJoining ? dayjs(editFormData.dateOfJoining) : null}
                                                            onChange={(date) => setEditFormData(prev => ({
                                                                ...prev,
                                                                dateOfJoining: date ? date.format('YYYY-MM-DD') : null
                                                            }))}
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
                                                        Username <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="account.userName"
                                                        value={editFormData.account?.userName || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Email <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        className="form-control"
                                                        name="contact.email"
                                                        value={editFormData.contact?.email || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Gender <span className="text-danger">*</span>
                                                    </label>
                                                    <select
                                                        className="form-control"
                                                        name="personal.gender"
                                                        value={editFormData.personal?.gender || ""}
                                                        onChange={handleEditFormChange}
                                                    >
                                                        <option value="">Select Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Birthday <span className="text-danger">*</span>
                                                    </label>
                                                    <div className="input-icon-end position-relative">
                                                        <DatePicker
                                                            className="form-control datetimepicker"
                                                            format="DD-MM-YYYY"
                                                            getPopupContainer={getModalContainer}
                                                            placeholder="DD-MM-YYYY"
                                                            value={editFormData.personal?.birthday ? dayjs(editFormData.personal.birthday) : null}
                                                            onChange={(date) => setEditFormData(prev => ({
                                                                ...prev,
                                                                personal: {
                                                                    ...prev.personal,
                                                                    birthday: date ? date.format('YYYY-MM-DD') : null
                                                                }
                                                            }))}
                                                        />
                                                        <span className="input-icon-addon">
                                                            <i className="ti ti-calendar text-gray-7" />
                                                        </span>
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
                                                        name="personal.address.street"
                                                        value={editFormData.personal?.address?.street || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                    <div className="row mt-3">
                                                        <div className="col-md-6">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="City"
                                                                name="personal.address.city"
                                                                value={editFormData.personal?.address?.city || ""}
                                                                onChange={handleEditFormChange}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="State"
                                                                name="personal.address.state"
                                                                value={editFormData.personal?.address?.state || ""}
                                                                onChange={handleEditFormChange}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="row mt-3">
                                                        <div className="col-md-6">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Postal Code"
                                                                name="personal.address.postalCode"
                                                                value={editFormData.personal?.address?.postalCode || ""}
                                                                onChange={handleEditFormChange}
                                                            />
                                                        </div>
                                                        <div className="col-md-6">
                                                            <input
                                                                type="text"
                                                                className="form-control"
                                                                placeholder="Country"
                                                                name="personal.address.country"
                                                                value={editFormData.personal?.address?.country || ""}
                                                                onChange={handleEditFormChange}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Phone Number <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="contact.phone"
                                                        value={editFormData.contact?.phone || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Company <span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        name="companyName"
                                                        value={editFormData.companyName || ""}
                                                        onChange={handleEditFormChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Department</label>
                                                    <CommonSelect
                                                        className='select'
                                                        options={departmentChoose}
                                                        value={departmentChoose.find(opt => opt.value === editFormData.departmentId) || departmentChoose[0]}
                                                        onChange={option => {
                                                            if (option) {
                                                                setEditFormData(prev => ({
                                                                    ...prev,
                                                                    departmentId: option.value
                                                                }));
                                                                if (socket) {
                                                                    socket.emit("hrm/designations/get", { departmentId: option.value });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Designation</label>
                                                    <CommonSelect
                                                        className='select'
                                                        options={designationChoose}
                                                        value={designationChoose.find(opt => opt.value === editFormData.designationId) || designationChoose[0]}
                                                        onChange={option => {
                                                            if (option) {
                                                                setEditFormData(prev => ({
                                                                    ...prev,
                                                                    designationId: option.value
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        Status <span className="text-danger">*</span>
                                                    </label>
                                                    <div className="d-flex align-items-center">
                                                        <div className="form-check form-switch">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                role="switch"
                                                                id="editStatusSwitch"
                                                                checked={editFormData.status === "Active"}
                                                                onChange={(e) =>
                                                                    setEditFormData(prev => ({
                                                                        ...prev,
                                                                        status: e.target.checked ? "Active" : "Inactive"
                                                                    }))
                                                                }
                                                            />
                                                            <label className="form-check-label" htmlFor="editStatusSwitch">
                                                                <span
                                                                    className={`badge ${editFormData.status === "Active"
                                                                        ? "badge-success"
                                                                        : "badge-danger"
                                                                        } d-inline-flex align-items-center`}
                                                                >
                                                                    <i className="ti ti-point-filled me-1" />
                                                                    {editFormData.status || "Active"}
                                                                </span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-12">
                                                <div className="mb-3">
                                                    <label className="form-label">
                                                        About <span className="text-danger">*</span>
                                                    </label>
                                                    <textarea
                                                        className="form-control"
                                                        rows={4}
                                                        name="about"
                                                        value={editFormData.about || ""}
                                                        onChange={handleEditFormChange}
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
                                            onClick={handleNext}
                                        >
                                            {loading ? "Saving..." : "Save & Next"}
                                        </button>
                                    </div>
                                </div>

                                <div
                                    className="tab-pane fade"
                                    id="address3"
                                    role="tabpanel"
                                    aria-labelledby="address-tab3"
                                    tabIndex={0}
                                >
                                    <div className="modal-body pb-0">
                                        <div className="card">
                                            <div className="card-body">
                                                <div className="d-flex align-items-center justify-content-between pb-3 border-bottom">
                                                    <h6 className="mb-0">Enable Modules</h6>
                                                    <div className="d-flex align-items-center">
                                                        <div className="form-check form-switch me-3">
                                                            <label className="form-check-label">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    checked={Object.values(permissions.enabledModules).every(Boolean)}
                                                                    onChange={(e) => toggleAllModules(e.target.checked)}
                                                                />
                                                                <span className="text-dark">Enable All</span>
                                                            </label>
                                                        </div>
                                                        <div className="form-check form-switch">
                                                            <label className="form-check-label">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    role="switch"
                                                                    checked={allPermissionsSelected()}
                                                                    onChange={(e) => toggleGlobalSelectAll(e.target.checked)}
                                                                />
                                                                <span className="text-dark">Select All</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="table-responsive border rounded mt-3">
                                                    <table className="table">
                                                        <tbody>
                                                            {MODULES.map((module) => (
                                                                <tr key={module}>
                                                                    <td>
                                                                        <div className="form-check form-switch me-2">
                                                                            <label className="form-check-label mt-0">
                                                                                <input
                                                                                    className="form-check-input me-2"
                                                                                    type="checkbox"
                                                                                    role="switch"
                                                                                    checked={permissions.enabledModules[module]}
                                                                                    onChange={() => toggleModule(module)}
                                                                                />
                                                                                {module.charAt(0).toUpperCase() + module.slice(1)}
                                                                            </label>
                                                                        </div>
                                                                    </td>

                                                                    {ACTIONS.map((action) => (
                                                                        <td key={action}>
                                                                            <div className="form-check d-flex align-items-center">
                                                                                <label className="form-check-label mt-0">
                                                                                    <input
                                                                                        className="form-check-input"
                                                                                        type="checkbox"
                                                                                        checked={permissions.permissions[module][action]}
                                                                                        onChange={(e) =>
                                                                                            handlePermissionChange(
                                                                                                module,
                                                                                                action,
                                                                                                e.target.checked
                                                                                            )
                                                                                        }
                                                                                        disabled={!permissions.enabledModules[module]}
                                                                                    />
                                                                                    {action.charAt(0).toUpperCase() + action.slice(1)}
                                                                                </label>
                                                                            </div>
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
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
                                                data-bs-toggle="modal"
                                                data-inert={true}
                                                data-bs-target="#success_modal"
                                                onClick={handlePermissionUpdateSubmit}
                                                disabled={loading}
                                            >
                                                {loading ? "Saving..." : "Save"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Edit Employee */}
            {/* Edit Personal */}
            <div className="modal fade" id="edit_personal">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Edit Personal Info</h4>
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
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Passport No <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Passport Expiry Date <span className="text-danger"> *</span>
                                            </label>
                                            <div className="input-icon-end position-relative">
                                                <DatePicker
                                                    className="form-control datetimepicker"
                                                    format="DD-MM-YYYY"
                                                    getPopupContainer={() => document.getElementById('edit_personal') || document.body}
                                                    placeholder="DD-MM-YYYY"
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
                                                Nationality <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Religion</label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Marital status <span className="text-danger"> *</span>
                                            </label>
                                            <CommonSelect
                                                className='select'
                                                options={martialstatus}
                                                defaultValue={martialstatus[0]}
                                                onChange={(option) => {
                                                    if (option) {
                                                        setMaritalStatus(option.value);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {maritalStatus === "Yes" && (
                                        <>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Employment spouse</label>
                                                    <input type="text" className="form-control" />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">No. of children</label>
                                                    <input type="text" className="form-control" />
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Edit Personal */}
            {/* Edit Emergency Contact */}
            <div className="modal fade" id="edit_emergency">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Emergency Contact Details</h4>
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
                                <div className="border-bottom mb-3 ">
                                    <div className="row">
                                        <h5 className="mb-3">Secondary Contact Details</h5>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Name <span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Relationship </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Phone No 1 <span className="text-danger"> *</span>
                                                </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Phone No 2 </label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="row">
                                    <h5 className="mb-3">Secondary Contact Details</h5>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Name <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Relationship </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Phone No 1 <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Phone No 2 </label>
                                            <input type="text" className="form-control" />
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Edit Emergency Contact */}
            {/* Edit Bank */}
            <div className="modal fade" id="edit_bank">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Bank Details</h4>
                            <button
                                type="button"
                                className="btn-close custom-btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            >
                                <i className="ti ti-x" />
                            </button>
                        </div>
                        <form onSubmit={handleBankFormSubmit}>
                            <div className="modal-body pb-0">
                                <div className="row">
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Bank Name <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                value={bankFormData.bankName}
                                                onChange={(e) => setBankFormData(prev => ({ ...prev, bankName: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Bank Account No <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                value={bankFormData.accountNumber}
                                                onChange={(e) => setBankFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                IFSC Code <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                value={bankFormData.ifscCode}
                                                onChange={(e) => setBankFormData(prev => ({ ...prev, ifscCode: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Branch Address <span className="text-danger"> *</span>
                                            </label>
                                            <input 
                                                type="text" 
                                                className="form-control"
                                                value={bankFormData.branch}
                                                onChange={(e) => setBankFormData(prev => ({ ...prev, branch: e.target.value }))}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-white border me-2"
                                    data-bs-dismiss="modal"
                                    onClick={() => setBankFormData({ bankName: "", accountNumber: "", ifscCode: "", branch: "" })}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Edit Bank */}
            {/* Add Family */}
            <div className="modal fade" id="edit_familyinformation">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Family Information</h4>
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
                                                Name <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">Relationship </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-label">Phone </label>
                                            <input type="text" className="form-control" />
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Family */}
            {/* Add Education */}
            <div className="modal fade" id="edit_education">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Education Information</h4>
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
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Institution Name <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Course <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Start Date <span className="text-danger"> *</span>
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
                                                End Date <span className="text-danger"> *</span>
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
                                                />
                                                <span className="input-icon-addon">
                                                    <i className="ti ti-calendar text-gray-7" />
                                                </span>
                                            </div>
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Education */}
            {/* Add Experience */}
            <div className="modal fade" id="edit_experience">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Company Information</h4>
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
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Previous Company Name{" "}
                                                <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Designation <span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Start Date <span className="text-danger"> *</span>
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
                                                End Date <span className="text-danger"> *</span>
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
                                                />
                                                <span className="input-icon-addon">
                                                    <i className="ti ti-calendar text-gray-7" />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="mb-3">
                                            <label className="form-check-label d-flex align-items-center mt-0">
                                                <input
                                                    className="form-check-input mt-0 me-2"
                                                    type="checkbox"
                                                    defaultChecked
                                                />
                                                <span className="text-dark">
                                                    Check if you working present
                                                </span>
                                            </label>
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Experience */}
            {/* Add Employee Success */}
            <div className="modal fade" id="success_modal" role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-sm">
                    <div className="modal-content">
                        <div className="modal-body">
                            <div className="text-center p-3">
                                <span className="avatar avatar-lg avatar-rounded bg-success mb-3">
                                    <i className="ti ti-check fs-24" />
                                </span>
                                <h5 className="mb-2">Employee Added Successfully</h5>
                                <p className="mb-3">
                                    Stephan Peralt has been added with Employee ID :{employee?.employeeId || '-'}
                                    <span className="text-primary">{employee?.employeeId || '-'}</span>
                                </p>
                                <div>
                                    <div className="row g-2">
                                        <div className="col-6">
                                            <Link to={all_routes.employeeList} className="btn btn-dark w-100">
                                                Back to List
                                            </Link>
                                        </div>
                                        <div className="col-6">
                                            <Link
                                                to={all_routes.employeedetails}
                                                className="btn btn-primary w-100"
                                            >
                                                Detail Page
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Add Client Success */}
            {/* Add Statuorty */}
            <div className="modal fade" id="add_bank_satutory">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Bank &amp; Statutory</h4>
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
                                <div className="border-bottom mb-4">
                                    <h5 className="mb-3">Basic Salary Information</h5>
                                    <div className="row mb-2">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    Salary basis <span className="text-danger"> *</span>
                                                </label>
                                                <CommonSelect
                                                    className='select'
                                                    options={salaryChoose}
                                                    defaultValue={salaryChoose[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Salary basis</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    defaultValue="$"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Payment type</label>
                                                <CommonSelect
                                                    className='select'
                                                    options={paymenttype}
                                                    defaultValue={paymenttype[0]}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-bottom mb-4">
                                    <h5 className="mb-3">PF Information</h5>
                                    <div className="row mb-2">
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">
                                                    PF contribution <span className="text-danger"> *</span>
                                                </label>
                                                <CommonSelect
                                                    className='select'
                                                    options={pfcontribution}
                                                    defaultValue={pfcontribution[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">PF No</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="mb-3">
                                                <label className="form-label">Employee PF rate</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Additional rate</label>
                                                <CommonSelect
                                                    className='select'
                                                    options={additionalrate}
                                                    defaultValue={additionalrate[0]}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Total rate</label>
                                                <input type="text" className="form-control" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <h5 className="mb-3">ESI Information</h5>
                                <div className="row">
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                ESI contribution<span className="text-danger"> *</span>
                                            </label>
                                            <CommonSelect
                                                className='select'
                                                options={esi}
                                                defaultValue={esi[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">ESI Number</label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="mb-3">
                                            <label className="form-label">
                                                Employee ESI rate<span className="text-danger"> *</span>
                                            </label>
                                            <input type="text" className="form-control" />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Additional rate</label>
                                            <CommonSelect
                                                className='select'
                                                options={additionalrate}
                                                defaultValue={additionalrate[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Total rate</label>
                                            <input type="text" className="form-control" />
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Add Statuorty */}
            {/* Asset Information */}
            <div className="modal fade" id="asset_info">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Asset Information</h4>
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
                            <div className="bg-light p-3 rounded d-flex align-items-center mb-3">
                                <span className="avatar avatar-lg flex-shrink-0 me-2">
                                    <ImageWithBasePath
                                        src="assets/img/laptop.jpg"
                                        alt="img"
                                        className="ig-fluid rounded-circle"
                                    />
                                </span>
                                <div>
                                    <h6>Dell Laptop - #343556656</h6>
                                    <p className="fs-13">
                                        <span className="text-primary">AST - 001 </span>
                                        <i className="ti ti-point-filled text-primary" /> Assigned on 22
                                        Nov, 2022 10:32AM
                                    </p>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Type</p>
                                        <p className="text-gray-9">Laptop</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Brand</p>
                                        <p className="text-gray-9">Dell</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Category</p>
                                        <p className="text-gray-9">Computer</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Serial No</p>
                                        <p className="text-gray-9">3647952145678</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Cost</p>
                                        <p className="text-gray-9">$800</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Vendor</p>
                                        <p className="text-gray-9">Compusoft Systems Ltd.,</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Warranty</p>
                                        <p className="text-gray-9">12 Jan 2022 - 12 Jan 2026</p>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <p className="fs-13 mb-0">Location</p>
                                        <p className="text-gray-9">46 Laurel Lane, TX 79701</p>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="fs-13 mb-2">Asset Images</p>
                                <div className="d-flex align-items-center">
                                    <ImageWithBasePath
                                        src="assets/img/laptop-01.jpg"
                                        alt="img"
                                        className="img-fluid rounded me-2"
                                    />
                                    <ImageWithBasePath
                                        src="assets/img/laptop-2.jpg"
                                        alt="img"
                                        className="img-fluid rounded me-2"
                                    />
                                    <ImageWithBasePath
                                        src="assets/img/laptop-3.jpg"
                                        alt="img"
                                        className="img-fluid rounded"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* /Asset Information */}
            {/* Refuse */}
            <div className="modal fade" id="refuse_msg">
                <div className="modal-dialog modal-dialog-centered modal-md">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title">Raise Issue</h4>
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
                                                Description<span className="text-danger"> *</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={4}
                                                defaultValue={""}
                                            />
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
                                <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* /Refuse */}
        </>
    )
}

export default EmployeeDetails
