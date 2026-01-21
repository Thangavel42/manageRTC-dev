import { ObjectId } from "mongodb";
import { DateTime } from "luxon";
import * as hrServices from "../../services/hr/hrm.employee.js";
import * as hrPolicy from "../../services/hr/hrm.policy.js";
import * as hrmDesignation from "../../services/hr/hrm.designation.js";
import * as hrmDepartment from "../../services/hr/hrm.department.js";
import * as hrmEmployee from "../../services/hr/hrm.employee.js";
import terminationController from "./termination.controller.js";
import resignationController from "./resignation.controller.js";
import holidayController from "./holidays.controller.js";
import holidayTypeController from "./holidayTypes.controller.js";

const hrDashboardController = (socket, io) => {
  console.log("Setting up termination controller...");
  terminationController(socket,io);
  console.log("Setting up resignation controller...");
  resignationController(socket,io);
  console.log("Attaching holidays controller...**********");
  holidayController(socket,io);
  console.log("Attaching holiday types controller...**********");
  try {
    holidayTypeController(socket,io);
    console.log("Holiday types controller attached successfully!");
  } catch (error) {
    console.error("ERROR attaching holiday types controller:", error);
  }
  const isDevelopment =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "production";

  const validateHrAccess = (socket) => {
    if (!socket.companyId) {
      console.error("[HR] Company ID not found in user metadata", {
        user: socket.user?.sub,
      });
      throw new Error("Company ID not found in user metadata");
    }
    const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    if (!companyIdRegex.test(socket.companyId)) {
      console.error(`[HR] Invalid company ID format: ${socket.companyId}`);
      throw new Error("Invalid company ID format");
    }
    if (socket.userMetadata?.companyId !== socket.companyId) {
      console.error(
        `[HR] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
      );
      throw new Error("Unauthorized: Company ID mismatch");
    }
    // if (socket.userMetadata?.role !== "hr") {
    //     console.error(`[HR] Unauthorized role: ${socket.userMetadata?.role}, HR role required`);
    //     throw new Error("Unauthorized: HR role required");
    // }
    return { companyId: socket.companyId, hrId: socket.user?.sub };
  };

  const withRateLimit = (handler) => {
    return async (...args) => {
      if (isDevelopment) {
        return handler(...args);
      }
      if (
        typeof socket.checkRateLimit === "function" &&
        !socket.checkRateLimit()
      ) {
        const eventName = args[0] || "unknown";
        socket.emit(`${eventName}-response`, {
          done: false,
          error: "Rate limit exceeded. Please try again later.",
        });
        return;
      }
      return handler(...args);
    };
  };

  const isObject = (val) =>
    val && typeof val === "object" && !Array.isArray(val);

  const validateEmployeeData = (data) => {
    if (typeof data !== "object" || data === null) {
      return "Employee data must be an object";
    }

    // Required string fields - must be non-empty
    const requiredStringFields = [
      "departmentId",
      "designationId",
      "employeeId",
      "firstName",
      "lastName",
    ];

    for (const field of requiredStringFields) {
      if (!(field in data)) {
        return `Missing required field: ${field}`;
      }
      if (typeof data[field] !== "string" || data[field].trim() === "") {
        return `Field '${field}' must be a non-empty string`;
      }
    }

    // Optional string fields - only validate type if provided
    const optionalStringFields = ["avatarUrl", "about", "companyName"];
    for (const field of optionalStringFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== "" && typeof data[field] !== "string") {
        return `Field '${field}' must be a string if provided`;
      }
    }

    // Validate nested account fields
    if (!data.account || typeof data.account !== "object") {
      return "Missing required field: account";
    }
    if (
      typeof data.account.userName !== "string" ||
      data.account.userName.trim() === ""
    ) {
      return "Field 'account.userName' must be a non-empty string";
    }
    if (
      typeof data.account.password !== "string" ||
      data.account.password.trim() === ""
    ) {
      return "Field 'account.password' must be a non-empty string";
    }

    // Validate nested contact fields
    if (!data.contact || typeof data.contact !== "object") {
      return "Missing required field: contact";
    }
    if (
      typeof data.contact.email !== "string" ||
      data.contact.email.trim() === ""
    ) {
      return "Field 'contact.email' must be a non-empty string";
    }
    if (
      typeof data.contact.phone !== "string" ||
      data.contact.phone.trim() === ""
    ) {
      return "Field 'contact.phone' must be a non-empty string";
    }

    if (!("dateOfJoining" in data)) {
      return "Missing required field: dateOfJoining";
    }
    const dateOfJoining = data.dateOfJoining;
    if (typeof dateOfJoining !== "string" && !(dateOfJoining instanceof Date)) {
      if (!dateOfJoining || typeof dateOfJoining.$d !== "object") {
        return "dateOfJoining must be a string, Date object, or valid date wrapper";
      }
    }

    // Validate permissions structure
    if (!isObject(data.enabledModules)) {
      return "enabledModules must be an object";
    }
    for (const [module, enabled] of Object.entries(data.enabledModules)) {
      if (typeof enabled !== "boolean") {
        return `enabledModules.${module} must be boolean`;
      }
    }

    if (!isObject(data.permissions)) {
      return "permissions must be an object";
    }
    const expectedActions = [
      "read",
      "write",
      "create",
      "delete",
      "import",
      "export",
    ];
    for (const [module, perms] of Object.entries(data.permissions)) {
      if (!isObject(perms)) {
        return `permissions.${module} must be an object`;
      }
      for (const action of expectedActions) {
        if (typeof perms[action] !== "boolean") {
          return `permissions.${module}.${action} must be boolean`;
        }
      }
    }

    return null;
  };

  const validateEmployeeBasicData = (data) => {
    if (typeof data !== "object" || data === null) {
      return "Employee data must be an object";
    }
    
    // Required string fields
    const requiredStringFields = [
      "departmentId",
      "designationId",
      "employeeId",
      "firstName",
      "lastName",
    ];

    for (const field of requiredStringFields) {
      if (!(field in data)) {
        return `Missing required field: ${field}`;
      }
      if (typeof data[field] !== "string" || data[field].trim() === "") {
        return `Field '${field}' must be a non-empty string`;
      }
    }

    // Optional string fields - only validate type if provided
    const optionalStringFields = ["avatarUrl", "about", "companyName"];
    for (const field of optionalStringFields) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== "" && typeof data[field] !== "string") {
        return `Field '${field}' must be a string if provided`;
      }
    }

    if (!data.account || typeof data.account !== "object") {
      return "Missing required field: account";
    }
    if (
      typeof data.account.userName !== "string" ||
      data.account.userName.trim() === ""
    ) {
      return "Field 'account.userName' must be a non-empty string";
    }

    if (!data.contact || typeof data.contact !== "object") {
      return "Missing required field: contact";
    }
    if (
      typeof data.contact.email !== "string" ||
      data.contact.email.trim() === ""
    ) {
      return "Field 'contact.email' must be a non-empty string";
    }
    if (
      typeof data.contact.phone !== "string" ||
      data.contact.phone.trim() === ""
    ) {
      return "Field 'contact.phone' must be a non-empty string";
    }

    if (!("dateOfJoining" in data)) {
      return "Missing required field: dateOfJoining";
    }
    const dateOfJoining = data.dateOfJoining;
    if (typeof dateOfJoining !== "string" && !(dateOfJoining instanceof Date)) {
      if (!dateOfJoining || typeof dateOfJoining.$d !== "object") {
        return "dateOfJoining must be a string, Date object, or valid date wrapper";
      }
    }

    return null;
  };

  const validatePermissionsData = (data) => {
    // Helper function to check if a value is a plain object
    const isObject = (value) => {
      return (
        typeof value === "object" && value !== null && !Array.isArray(value)
      );
    };

    // Validate enabledModules
    if (!isObject(data.enabledModules)) {
      return "enabledModules must be an object";
    }

    for (const [module, enabled] of Object.entries(data.enabledModules)) {
      if (typeof enabled !== "boolean") {
        return `enabledModules.${module} must be boolean`;
      }
    }

    // Validate permissions
    if (!isObject(data.permissions)) {
      return "permissions must be an object";
    }

    const expectedActions = [
      "read",
      "write",
      "create",
      "delete",
      "import",
      "export",
    ];

    for (const [module, perms] of Object.entries(data.permissions)) {
      if (!isObject(perms)) {
        return `permissions.${module} must be an object`;
      }

      for (const action of expectedActions) {
        if (typeof perms[action] !== "boolean") {
          return `permissions.${module}.${action} must be boolean`;
        }
      }
    }

    // If all validations pass
    return null;
  };

  socket.on("hr/departments/get", async () => {
    try {
      console.log("[hr/departments/get] Event received with data:");

      const { companyId, hrId } = validateHrAccess(socket);
      console.log(
        "[hr/departments/get] Access validated - companyId:",
        companyId,
        "hrId:",
        hrId
      );

      const response = await hrmDepartment.allDepartments(companyId, hrId);
      console.log("[hr/departments/get] Service response:", response);

      socket.emit("hr/departments/get-response", response);
      // console.log("[hr/departments/get] Response emitted");
    } catch (error) {
      console.log("[hr/departments/get] Error:", error);
      socket.emit("hr/departments/get-response", {
        done: false,
        error: "Unexpected error fetching departments",
      });
    }
  });

  socket.on("hrm/employees/get-employee-stats", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);
      const {
        startDate: rawStartDate,
        endDate: rawEndDate,
        departmentId: rawDeparmentId,
        status: rawStatus,
      } = payload || {};

      let startDate = null;
      if (typeof rawStartDate === "string" && rawStartDate.trim() !== "") {
        const sd = new Date(rawStartDate.trim());
        startDate = isNaN(sd.getTime()) ? null : sd;
      }

      let endDate = null;
      if (typeof rawEndDate === "string" && rawEndDate.trim() !== "") {
        const ed = new Date(rawEndDate.trim());
        endDate = isNaN(ed.getTime()) ? null : ed;
      }

      const allowedStatus = ["active", "inactive", "Active", "Inactive"];
      const departmentId =
        typeof rawDeparmentId === "string" ? rawDeparmentId.trim() : "";

      const status =
        typeof rawStatus === "string" &&
        allowedStatus.includes(rawStatus.trim())
          ? rawStatus.trim()
          : null;

      const sanitizedFilter = { startDate, endDate, departmentId, status };
      console.log("filters", sanitizedFilter);

      const result = await hrServices.getEmployeesStats(
        companyId,
        hrId,
        sanitizedFilter
      );

      socket.emit("hrm/employees/get-employee-stats-response", result);
    } catch (error) {
      socket.emit("hrm/employees/get-employee-stats-response", {
        done: false,
        error: error.message || "Unexpected error fetching employee stats",
      });
    }
  });

  socket.on("hrm/employees/get-employee-grid-stats", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);
      const {
        startDate: rawStartDate,
        endDate: rawEndDate,
        designationId: rawdesignationId,
        status: rawStatus,
      } = payload || {};

      let startDate = null;
      if (typeof rawStartDate === "string" && rawStartDate.trim() !== "") {
        const sd = new Date(rawStartDate.trim());
        startDate = isNaN(sd.getTime()) ? null : sd;
      }

      let endDate = null;
      if (typeof rawEndDate === "string" && rawEndDate.trim() !== "") {
        const ed = new Date(rawEndDate.trim());
        endDate = isNaN(ed.getTime()) ? null : ed;
      }

      const allowedStatus = ["Active", "Inactive", "active", "inactive"];

      const designationId =
        typeof rawdesignationId === "string" ? rawdesignationId.trim() : "";

      const status =
        typeof rawStatus === "string" &&
        allowedStatus.includes(rawStatus.trim())
          ? rawStatus.trim()
          : null;

      const sanitizedFilter = { startDate, endDate, designationId, status };
      const result = await hrServices.getEmployeeGridsStats(
        companyId,
        hrId,
        sanitizedFilter
      );

      socket.emit("hrm/employees/get-employee-grid-stats-response", result);
    } catch (error) {
      console.log(error);
      socket.emit("hrm/employees/get-employee-frid-stats-response", {
        done: false,
        error: error.message || "Unexpected error fetching employee stats",
      });
    }
  });

  // crud ops on policy

  socket.on(
    "hr/policy/add",
    withRateLimit(async (payload) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid payload");
        }

        const policyName =
          typeof payload.policyName === "string"
            ? payload.policyName.trim()
            : "";

        const description =
          typeof payload.policyDescription === "string"
            ? payload.policyDescription.trim()
            : "";

        const rawDate = payload.effectiveDate;
        const dt = DateTime.fromFormat(rawDate, "yyyy-MM-dd", { zone: "utc" });
        const now = DateTime.utc();

        // Extract applyToAll flag - when true, policy applies to all employees
        const applyToAll = payload.applyToAll === true;
        
        // Extract assignTo mappings (department-designation mappings)
        // When applyToAll is true, we don't need assignTo mappings
        const assignTo = Array.isArray(payload.assignTo) ? payload.assignTo : [];

        if (!policyName) {
          throw new Error("Policy name is required");
        }
        // Only require assignTo when applyToAll is false
        if (!applyToAll && (!assignTo || assignTo.length === 0)) {
          throw new Error("Please select at least one department or enable 'All Employees'");
        }
        if (!description) {
          throw new Error("Description is required");
        }
        if (!dt.isValid) {
          throw new Error(
            "Effective date is invalid or must be in yyyy-MM-dd format"
          );
        }
        if (dt <= now) {
          throw new Error("Effective date must be a date in the future");
        }

        const effectiveDate = dt.toJSDate();

        const policyData = {
          policyName,
          applyToAll,
          assignTo: applyToAll ? [] : assignTo,  // Empty array for all employees
          effectiveDate,
          policyDescription: description,
        };

        const result = await hrPolicy.addPolicy(companyId, hrId, policyData);
        socket.emit("hr/policy/add-response", result);
      } catch (error) {
        socket.emit("hr/policy/add-response", {
          done: false,
          error: error.message || "Unexpected error adding policy",
        });
      }
    })
  );

  socket.on("hr/policy/get", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);

      if (!companyId || !hrId) {
        throw new Error("Missing required parameters");
      }

      const filters = {};
      if (payload && typeof payload === "object") {
        if (typeof payload.department === "string") {
          filters.department = payload.department.trim();
        }
        if (
          typeof payload.startDate === "string" &&
          typeof payload.endDate === "string"
        ) {
          filters.startDate = payload.startDate;
          filters.endDate = payload.endDate;
        }
      }

      const result = await hrPolicy.displayPolicy(companyId, hrId, filters);
      socket.emit("hr/policy/get-response", result);
    } catch (error) {
      socket.emit("hr/policy/get-response", {
        done: false,
        error: error.message || "Unexpected error fetching policies",
      });
    }
  });

  socket.on(
    "hr/policy/update",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const policyId = typeof data._id === "string" ? data._id.trim() : "";
        if (!policyId) {
          throw new Error("Policy ID (_id) is required for update");
        }

        const policyName =
          typeof data.policyName === "string" ? data.policyName.trim() : "";

        const description =
          typeof data.policyDescription === "string"
            ? data.policyDescription.trim()
            : "";

        const rawDate = data.effectiveDate;
        const dt = DateTime.fromISO(rawDate, { zone: "utc" });
        const formattedDate = dt.toFormat("yyyy-MM-dd");
        const now = DateTime.utc();

        // Extract applyToAll flag - when true, policy applies to all employees
        const applyToAll = data.applyToAll === true;
        
        // Extract assignTo mappings (department-designation mappings)
        // When applyToAll is true, we don't need assignTo mappings
        const assignTo = Array.isArray(data.assignTo) ? data.assignTo : [];

        if (!policyName) {
          throw new Error("Policy name is required");
        }
        // Only require assignTo when applyToAll is false
        if (!applyToAll && (!assignTo || assignTo.length === 0)) {
          throw new Error("Please select at least one department or enable 'All Employees'");
        }
        if (!description) {
          throw new Error("Description is required");
        }

        if (dt.isValid) {
          if (dt <= now) {
            throw new Error("Effective date must be a date in the future");
          }
          const formattedDate = dt.toFormat("yyyy-MM-dd");
        }

        const payload = {
          policyId,
          policyName,
          applyToAll,
          assignTo: applyToAll ? [] : assignTo,  // Empty array for all employees
          effectiveDate: formattedDate,
          policyDescription: description,
        };

        const result = await hrPolicy.updatePolicy(companyId, hrId, payload);
        socket.emit("hr/policy/update-response", result);
      } catch (error) {
        socket.emit("hr/policy/update-response", {
          done: false,
          error: error.message || "Unexpected error updating policy",
        });
      }
    })
  );

  socket.on(
    "hr/policy/delete",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const policyId = typeof data._id === "string" ? data._id.trim() : "";
        if (!policyId) {
          throw new Error("Policy ID (_id) is required for deletion");
        }

        const result = await hrPolicy.deletePolicy(companyId, hrId, policyId);
        socket.emit("hr/policy/delete-response", result);
        io.emit("hr/policy/delete", data);
      } catch (error) {
        socket.emit("hr/policy/delete-response", {
          done: false,
          error: error.message || "Unexpected error deleting policy",
        });
      }
    })
  );

  // crud ops on department

  socket.on(
    "hr/departments/add",
    withRateLimit(async (data) => {
      try {
        console.log("Hee");
        const { companyId, hrId } = validateHrAccess(socket);
        if (!data) {
          throw new Error("Data is required for creation");
        }

        const departmentName =
          typeof data.departmentName === "string"
            ? data.departmentName.trim()
            : "";
        if (!departmentName) {
          throw new Error("Department name and display name are required");
        }
        console.log("Hee");
        let status = "";
        if (data.status) {
          status = String(data.status).trim().toLowerCase();
        }
        const isValidStatus = ["active", "inactive"].includes(status);

        const payload = {
          department: departmentName,
          status: isValidStatus ? status : "active",
        };
        console.log("Hee");

        const response = await hrmDepartment.addDepartment(
          companyId,
          hrId,
          payload
        );
        socket.emit("hr/departments/add-response", response);
        if (socket) {
          socket.emit("hr/departmentsStats/get", response);
        }
      } catch (error) {
        console.log(error);

        socket.emit("hr/departments/add-response", {
          done: false,
          error: error.message || "Unexpected error adding department",
        });
      }
    })
  );

  socket.on("hr/departmentsStats/get", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);

      if (!companyId || !hrId) {
        throw new Error("Missing required parameters");
      }

      const filters = {};

      const isValidDate = (dateStr) => {
        const dt = DateTime.fromISO(dateStr, { zone: "utc" });
        return dt.isValid;
      };

      if (payload && typeof payload === "object") {
        // Validate and set status filter
        if (typeof payload.status === "string") {
          const status = payload.status.trim().toLowerCase();
          if (
            status === "active" ||
            status === "inactive" ||
            status === "none"
          ) {
            filters.status = status;
          } else {
            throw new Error("Status must be 'active' or 'inactive'");
          }
        }

        // Validate and set date filters
        if (
          typeof payload.startDate === "string" &&
          isValidDate(payload.startDate) &&
          typeof payload.endDate === "string" &&
          isValidDate(payload.endDate)
        ) {
          const startDate = DateTime.fromISO(payload.startDate, {
            zone: "utc",
          });
          const endDate = DateTime.fromISO(payload.endDate, { zone: "utc" });

          if (startDate > endDate) {
            throw new Error("Start date cannot be after end date");
          }

          filters.startDate = startDate.toISO();
          filters.endDate = endDate.toISO();
        } else if (
          (payload.startDate && !payload.endDate) ||
          (!payload.startDate && payload.endDate)
        ) {
          throw new Error(
            "Both startDate and endDate must be provided together"
          );
        }

        if (typeof payload.recentlyAdded === "boolean") {
          filters.recentlyAdded = payload.recentlyAdded;
        }
      }

      const result = await hrmDepartment.displayDepartment(
        companyId,
        hrId,
        filters
      );
      socket.emit("hr/departmentsStats/get-response", result);
    } catch (error) {
      socket.emit("hr/departmentsStats/get-response", {
        done: false,
        error: error.message || "Unexpected error fetching departments",
      });
    }
  });

  socket.on(
    "hrm/departments/update",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const departmentId =
          typeof data._id === "string" && data._id.trim()
            ? data._id.trim()
            : "";
        if (!departmentId)
          throw new Error("Department ID is required for update");

        const department =
          typeof data.department === "string" ? data.department.trim() : "";
        if (!department) throw new Error("Department name is required");

        const status =
          typeof data.status === "string"
            ? data.status.trim().toLowerCase()
            : "";
        if (status !== "active" && status !== "inactive") {
          throw new Error("Status must be 'active' or 'inactive'");
        }

        const payload = {
          departmentId,
          department,
          status,
        };

        const result = await hrmDepartment.updateDepartment(
          companyId,
          hrId,
          payload
        );
        socket.emit("hrm/departments/update-response", result);
      } catch (error) {
        socket.emit("hrm/departments/update-response", {
          done: false,
          error: error.message || "Unexpected error updating department",
        });
      }
    })
  );

  socket.on(
    "hrm/departments/delete",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const departmentId =
          typeof data._id === "string" ? data._id.trim() : "";
        if (!departmentId) {
          throw new Error("department Id is required for deletion");
        }

        const result = await hrmDepartment.deleteDepartment(
          companyId,
          hrId,
          departmentId
        );
        socket.emit("hrm/departments/delete-response", result);
        io.emit("hrm/departments/delete", data);
      } catch (error) {
        socket.emit("hrm/departments/delete-response", {
          done: false,
          error: error.message || "Unexpected error deleting policy",
        });
      }
    })
  );

  socket.on(
    "hrm/departments/reassign-delete",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        if (!data.sourceDepartmentId || !data.targetDepartmentId) {
          throw new Error("Source and target department IDs are required");
        }

        const result = await hrmDepartment.reassignAndDeleteDepartment(
          companyId,
          hrId,
          data
        );
        socket.emit("hrm/departments/reassign-delete-response", result);
        io.emit("hrm/departments/reassign-delete", data);
      } catch (error) {
        socket.emit("hrm/departments/reassign-delete-response", {
          done: false,
          error: error.message || "Unexpected error reassigning and deleting department",
        });
      }
    })
  );

  // crud ops on designation

  socket.on(
    "hrm/designations/add",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data) {
          throw new Error("Data is required for creation");
        }

        const departmentId =
          typeof data.departmentId === "string" ? data.departmentId.trim() : "";
        if (!departmentId) {
          throw new Error("Department name and display name are required");
        }
        const designationName =
          typeof data.designationName === "string"
            ? data.designationName.trim()
            : "";
        if (!designationName) {
          throw new Error("Department name and display name are required");
        }

        let status = "";
        if (data.status) {
          status = String(data.status).trim().toLowerCase();
        }
        const isValidStatus = ["active", "inactive"].includes(status);

        const payload = {
          designation: designationName,
          departmentId: departmentId,
          status: isValidStatus ? status : "active",
        };

        const response = await hrmDesignation.addDesignation(
          companyId,
          hrId,
          payload
        );
        socket.emit("hrm/designations/add-response", response);
      } catch (error) {
        console.log(error);

        socket.emit("hrm/designations/add-response", {
          done: false,
          error: error.message || "Unexpected error adding department",
        });
      }
    })
  );

  socket.on("hrm/designations/get", async (filters) => {
    try {
      console.log(
        "[hrm/designations/get] Event received with filters:",
        filters
      );

      const { companyId, hrId } = validateHrAccess(socket);
      console.log(
        "[hrm/designations/get] Validated access - companyId:",
        companyId,
        "hrId:",
        hrId
      );

      const sanitizedFilters = {};
      if (filters && typeof filters === "object") {
        if (
          typeof filters.status === "string" &&
          filters.status.trim() !== ""
        ) {
          const statusTrim = filters.status.trim();
          if (statusTrim.toLowerCase() !== "none") {
            sanitizedFilters.status = statusTrim;
          }
        }
        if (
          typeof filters.departmentId === "string" &&
          filters.departmentId.trim() !== ""
        ) {
          sanitizedFilters.departmentId = filters.departmentId.trim();
        } else if (
          typeof filters.department === "string" &&
          filters.department.trim() !== ""
        ) {
          sanitizedFilters.departmentId = filters.department.trim();
        }
      }
      console.log(
        "[hrm/designations/get] Sanitized filters:",
        sanitizedFilters
      );

      const result = await hrmDesignation.displayDesignations(
        companyId,
        hrId,
        sanitizedFilters
      );
      // console.log("[hrm/designations/get] Service result:", result);

      if (!result.done) {
        console.error(
          "[hrm/designations/get] Service returned failure:",
          result.error || "Failed to fetch designations"
        );
        throw new Error(
          result.error || "Failed to fetch designations"
        );
      }

      socket.emit("hrm/designations/get-response", result);
      console.log("[hrm/designations/get] Response emitted");
    } catch (error) {
      console.error("[hrm/designations/get] Error:", error);
      socket.emit("hrm/designations/get-response", {
        done: false,
        error: error.message || "Unexpected error fetching designations",
      });
    }
  });

  socket.on("hrm/designations/delete", async (data) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);

      if (!data || typeof data !== "object") {
        throw new Error("Invalid payload");
      }

      const designationId = typeof data._id === "string" ? data._id.trim() : "";
      if (!designationId) {
        throw new Error("Department Id is required for deletion");
      }

      const result = await hrmDesignation.deleteDesignation(
        companyId,
        hrId,
        designationId
      );

      if (!result.done) {
        throw new Error(result.error || result.message || "Delete failed");
      }

      socket.emit("hrm/designations/delete-response", result);
    } catch (error) {
      console.error("[hrm/designations/delete] Error:", error);
      socket.emit("hrm/designations/delete-response", {
        done: false,
        error: error.message || "Unexpected error deleting department",
      });
    }
  });

  socket.on(
    "hrm/designations/reassign-delete",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        if (!data.sourceDesignationId || !data.targetDesignationId) {
          throw new Error("Source and target designation IDs are required");
        }

        const result = await hrmDesignation.reassignAndDeleteDesignation(
          companyId,
          hrId,
          data
        );
        socket.emit("hrm/designations/reassign-delete-response", result);
        io.emit("hrm/designations/reassign-delete", data);
      } catch (error) {
        socket.emit("hrm/designations/reassign-delete-response", {
          done: false,
          error: error.message || "Unexpected error reassigning and deleting designation",
        });
      }
    })
  );

  socket.on("hrm/designations/update", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);

      if (!payload || typeof payload !== "object") {
        throw new Error("Invalid payload");
      }

      if (!companyId || !hrId || !payload) {
        throw new Error(
          "Missing required fields: companyId, hrId, and payload are required"
        );
      }

      // Deep clone payload to avoid mutating original object
      payload = { ...payload };

      if (payload.designation && typeof payload.designation === "string") {
        payload.designation = payload.designation.trim();
        if (payload.designation === "") delete payload.designation;
      }

      if (payload.departmentId && typeof payload.departmentId === "string") {
        payload.departmentId = payload.departmentId.trim();
        if (payload.departmentId === "") delete payload.departmentId;
      }

      if (payload.status && typeof payload.status === "string") {
        payload.status = payload.status.trim().toLowerCase();
        if (!["active", "inactive"].includes(payload.status))
          delete payload.status;
      }

      if (payload.designationId && typeof payload.designationId === "string") {
        payload.designationId = payload.designationId.trim();
        if (payload.designationId === "")
          throw new Error("Designation ID is required and cannot be empty");
      } else {
        throw new Error("Designation ID is required");
      }

      const result = await hrmDesignation.updateDesignation(
        companyId,
        hrId,
        payload
      );
      if (!result.done) {
        throw new Error(result.error || "Failed to update designation");
      }

      socket.emit("hrm/designations/update-response", {
        done: true,
        message: result.message || "Designation updated successfully",
      });
    } catch (error) {
      console.error("[hrm/designations/update] Error:", error);
      socket.emit("hrm/designations/update-response", {
        done: false,
        error: error.message || "Unexpected error updating designation",
      });
    }
  });

  // crud ops on employee

  // Check for duplicate email, username, and phone - called before moving to permissions tab
  socket.on("hrm/employees/check-duplicates", async (data) => {
    console.log("=== BACKEND: hrm/employees/check-duplicates called ===");
    console.log("Received data:", data);
    try {
      const { companyId } = validateHrAccess(socket);
      console.log("CompanyId:", companyId);
      
      if (!data || typeof data !== "object") {
        throw new Error("Invalid request data");
      }

      const { email, userName, phone } = data;

      if (!email || !userName) {
        throw new Error("Email and username are required");
      }

      // Check for duplicates (email, username, and optionally phone)
      console.log("Calling checkDuplicates service...");
      const duplicateCheck = await hrmEmployee.checkDuplicates(companyId, email, userName, phone);
      
      console.log("=== BACKEND: Sending response ===", duplicateCheck);
      socket.emit("hrm/employees/check-duplicates-response", duplicateCheck);
    } catch (error) {
      console.error("Error in hrm/employees/check-duplicates:", error);
      const errorResponse = {
        done: false,
        error: error.message || "Error checking for duplicates",
      };
      console.log("=== BACKEND: Sending error response ===", errorResponse);
      socket.emit("hrm/employees/check-duplicates-response", errorResponse);
    }
  });

  // Validate employee data without saving - for inline error display
  socket.on("hrm/employees/validate", async (data) => {
    console.log("=== hrm/employees/validate called ===");
    console.log("Received data:", JSON.stringify(data, null, 2));
    try {
      const { companyId, hrId } = validateHrAccess(socket);
      console.log("Access validated - companyId:", companyId, "hrId:", hrId);
      
      if (!data) {
        throw new Error("Employee data is required");
      }
      const { employeeData, permissionsData } = data;
      if (!employeeData || typeof employeeData !== "object") {
        throw new Error("Invalid or missing employeeData");
      }
      if (!permissionsData || typeof permissionsData !== "object") {
        throw new Error("Invalid or missing permissionsData");
      }

      // Merge enabledModules & permissions into employeeData for validation
      const mergedData = {
        ...employeeData,
        enabledModules: permissionsData.enabledModules,
        permissions: permissionsData.permissions,
      };

      console.log("Running validateEmployeeData...");
      const validationError = validateEmployeeData(mergedData);
      console.log("Validation result:", validationError || "PASSED");

      if (validationError) {
        // Return validation error with field information
        console.log("Emitting validation error response");
        socket.emit("hrm/employees/validate-response", {
          done: false,
          error: validationError,
        });
        return;
      }

      // Check for duplicate email/username in the database
      console.log("Checking for duplicates...");
      const duplicateCheck = await hrmEmployee.checkDuplicates(
        companyId,
        employeeData.contact.email,
        employeeData.account.userName
      );
      console.log("Duplicate check result:", duplicateCheck);

      if (!duplicateCheck.done) {
        socket.emit("hrm/employees/validate-response", duplicateCheck);
        return;
      }

      // Validation passed
      console.log("Emitting validation success response");
      socket.emit("hrm/employees/validate-response", {
        done: true,
        message: "Validation passed",
      });
    } catch (error) {
      console.log("Error in hrm/employees/validate:", error);
      socket.emit("hrm/employees/validate-response", {
        done: false,
        error: error.message || "Unexpected error validating employee",
      });
    }
  });

  socket.on(
    "hrm/employees/add",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        if (!data) {
          throw new Error("Employee data is required");
        }
        const { employeeData, permissionsData } = data;
        if (!employeeData || typeof employeeData !== "object") {
          throw new Error("Invalid or missing employeeData");
        }
        if (!permissionsData || typeof permissionsData !== "object") {
          throw new Error("Invalid or missing permissionsData");
        }
        // Merge enabledModules & permissions into employeeData for validation convenience
        const mergedData = {
          ...employeeData,
          enabledModules: permissionsData.enabledModules,
          permissions: permissionsData.permissions,
        };

        const validationError = validateEmployeeData(mergedData);

        if (validationError) {
          throw new Error(validationError);
        }

        const response = await hrmEmployee.addEmployee(
          companyId,
          hrId,
          employeeData,
          permissionsData
        );

        socket.emit("hrm/employees/add-response", response);
      } catch (error) {
        console.log("Error in hrm/employees/add:", error);
        socket.emit("hrm/employees/add-response", {
          done: false,
          error: error.message || "Unexpected error adding employee",
        });
      }
    })
  );

  socket.on(
    "hrm/employees/check-phone",
    withRateLimit(async (data) => {
      try {
        const { companyId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const phone = typeof data.phone === "string" ? data.phone.trim() : "";
        if (!phone) {
          throw new Error("Phone number is required");
        }

        const excludeEmployeeId = data.excludeEmployeeId || null;

        const response = await hrmEmployee.checkPhoneExists(
          companyId,
          phone,
          excludeEmployeeId
        );

        socket.emit("hrm/employees/check-phone-response", response);
      } catch (error) {
        console.error("Error in hrm/employees/check-phone:", error);
        socket.emit("hrm/employees/check-phone-response", {
          done: false,
          error: error.message || "Unexpected error checking phone number",
        });
      }
    })
  );

  socket.on(
    "hrm/employees/delete",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Invalid payload");
        }

        const employeeId = typeof data._id === "string" ? data._id.trim() : "";
        if (!employeeId) {
          throw new Error("Employee Id is required for deletion");
        }

        const result = await hrServices.deleteEmployee(
          companyId,
          hrId,
          employeeId
        );
        socket.emit("hrm/employees/delete-response", result);
        io.emit("hrm/employees/delete", data);
      } catch (error) {
        socket.emit("hrm/employees/delete-response", {
          done: false,
          error: error.message || "Unexpected error deleting policy",
        });
      }
    })
  );

  // Check Employee Lifecycle Status (for UI status dropdown control)
  socket.on(
    "hrm/employees/check-lifecycle-status",
    withRateLimit(async (data) => {
      try {
        const { companyId } = validateHrAccess(socket);

        if (!data?.employeeId) {
          throw new Error("Employee ID is required");
        }

        const response = await hrmEmployee.checkEmployeeLifecycleStatus(
          companyId,
          data.employeeId
        );

        socket.emit("hrm/employees/check-lifecycle-status-response", {
          done: true,
          data: response
        });
      } catch (error) {
        console.log(error);
        socket.emit("hrm/employees/check-lifecycle-status-response", {
          done: false,
          error: error.message || "Unexpected error checking lifecycle status",
        });
      }
    })
  );

  // Update Employee Basic Info
  socket.on(
    "hrm/employees/update",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Employee update data is required");
        }

        // You may want to validate here as well
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for update");
        }

        // Optionally validate fields
        const validationError = validateEmployeeBasicData(data);
        if (validationError) throw new Error(validationError);

        const response = await hrmEmployee.updateEmployeeDetails(
          companyId,
          hrId,
          data
        );

        socket.emit("hrm/employees/update-response", response);
      } catch (error) {
        console.log(error);
        socket.emit("hrm/employees/update-response", {
          done: false,
          error: error.message || "Unexpected error updating employee",
        });
      }
    })
  );

  // Update Employee Permissions
  socket.on(
    "hrm/employees/update-permissions",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Permissions update data is required");
        }

        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for permissions update");
        }
        const validationError = validatePermissionsData(data);
        if (validationError) throw new Error(validationError);

        const permissionsPayload = {
          enabledModules: data.enabledModules,
          permissions: data.permissions,
        };

        console.log("permissionPayload", permissionsPayload);

        const response = await hrmEmployee.updatePermissions(
          companyId,
          hrId,
          employeeId,
          permissionsPayload
        );

        socket.emit("hrm/employees/update-permissions-response", response);
      } catch (error) {
        console.log(error);

        socket.emit("hrm/employees/update-permissions-response", {
          done: false,
          error: error.message || "Unexpected error updating permissions",
        });
      }
    })
  );

  socket.on(
    "hrm/employees/get-permissions",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Permissions get data is required");
        }

        const employeeId = typeof data._id === "string" ? data._id.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for permissions update");
        }

        const response = await hrmEmployee.getPermissions(
          companyId,
          hrId,
          employeeId
        );

        socket.emit("hrm/employees/get-permissions-response", response);
      } catch (error) {
        socket.emit("hrm/employees/get-permissions-response", {
          done: false,
          error: error.message || "Unexpected error updating permissions",
        });
      }
    })
  );

  // cru ops on employee details

  socket.on("hrm/employees/get-details", async (payload) => {
    try {
      const { companyId, hrId } = validateHrAccess(socket);

      const employeeId =
        typeof payload.employeeId === "string" ? payload.employeeId.trim() : "";
      if (!employeeId) {
        throw new Error("Employee ID is required for permissions update");
      }

      const employeeInfoResult = await hrmEmployee.getEmployeeDetails(
        companyId,
        hrId,
        employeeId
      );

      if (!employeeInfoResult.done) {
        socket.emit("hrm/employees/get-details-response", {
          done: false,
          message:
            employeeInfoResult.message || "Failed to fetch employee info",
        });
        return;
      }

      socket.emit("hrm/employees/get-details-response", {
        done: true,
        data: employeeInfoResult.data,
      });
    } catch (error) {
      console.log(error);

      socket.emit("employee/get-full-info-response", {
        done: false,
        message: error.message || "Internal server error",
      });
    }
  });

  // Update Bank Details
  socket.on(
    "hrm/employees/update-bank",
    withRateLimit(async (data) => {
      console.log("=== UPDATE BANK DETAILS EVENT RECEIVED ===");
      console.log("Raw data:", JSON.stringify(data, null, 2));
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        console.log("Validated access - companyId:", companyId, "hrId:", hrId);

        if (!data || typeof data !== "object") {
          throw new Error("Bank update data is required");
        }

        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for bank update");
        }
        console.log("Employee ID extracted:", employeeId);

        if (!data.bank) {
          throw new Error("Bank details are required");
        }
        console.log("Bank data:", JSON.stringify(data.bank, null, 2));

        console.log("Calling updateBankDetails service...");
        const response = await hrmEmployee.updateBankDetails(
          companyId,
          hrId,
          data
        );
        console.log("Service response:", JSON.stringify(response, null, 2));

        socket.emit("hrm/employees/update-bank-response", response);
        console.log("Response emitted to client");
      } catch (error) {
        console.error("Error in update-bank:", error);
        socket.emit("hrm/employees/update-bank-response", {
          done: false,
          error: error.message || "Unexpected error updating bank details",
        });
      }
    })
  );

  // Update Personal Info
  socket.on(
    "hrm/employees/update-personal",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);

        if (!data || typeof data !== "object") {
          throw new Error("Personal info update data is required");
        }

        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for personal info update");
        }

        if (!data.personal) {
          throw new Error("Personal details are required");
        }

        const response = await hrmEmployee.updatePersonalInfo(
          companyId,
          hrId,
          data
        );

        socket.emit("hrm/employees/update-personal-response", response);
      } catch (error) {
        console.error("Error in update-personal:", error);
        socket.emit("hrm/employees/update-personal-response", {
          done: false,
          error: error.message || "Unexpected error updating personal info",
        });
      }
    })
  );

  // Update Family Info
  socket.on(
    "hrm/employees/update-family",
    withRateLimit(async (data) => {
      console.log("=== UPDATE FAMILY INFO EVENT RECEIVED ===");
      console.log("Raw data:", JSON.stringify(data, null, 2));
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        console.log("Validated access - companyId:", companyId, "hrId:", hrId);

        if (!data || typeof data !== "object") {
          throw new Error("Family info update data is required");
        }
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for family info update");
        }
        console.log("Employee ID extracted:", employeeId);

        if (!data.family) {
          throw new Error("Family details are required");
        }
        console.log("Family data:", JSON.stringify(data.family, null, 2));

        console.log("Calling updateFamilyInfo service...");
        const response = await hrmEmployee.updateFamilyInfo(
          companyId,
          hrId,
          data
        );
        console.log("Service response:", JSON.stringify(response, null, 2));

        socket.emit("hrm/employees/update-family-response", response);
        console.log("Response emitted to client");
      } catch (error) {
        console.error("Error in update-family:", error);
        socket.emit("hrm/employees/update-family-response", {
          done: false,
          error: error.message || "Unexpected error updating family info",
        });
      }
    })
  );

  // Update Education Info
  socket.on(
    "hrm/employees/update-education",
    withRateLimit(async (data) => { 
      console.log("=== UPDATE EDUCATION INFO EVENT RECEIVED ===");
      console.log("Raw data:", JSON.stringify(data, null, 2));
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        console.log("Validated access - companyId:", companyId, "hrId:", hrId);

        if (!data || typeof data !== "object") {
          throw new Error("Education info update data is required");
        }
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for education info update");
        }
        console.log("Employee ID extracted:", employeeId);

        if (!data.educationDetails) {
          throw new Error("Education details are required");
        }
        console.log(
          "Education data:",
          JSON.stringify(data.educationDetails, null, 2)
        );

        console.log("Calling updateEducationInfo service...");
        const response = await hrmEmployee.updateEducationInfo(
          companyId,
          hrId,
          data
        );
        console.log("Service response:", JSON.stringify(response, null, 2));

        socket.emit("hrm/employees/update-education-response", response);
        console.log("Response emitted to client");
      } catch (error) {
        console.error("Error in update-education:", error);
        socket.emit("hrm/employees/update-education-response", {
          done: false,
          error: error.message || "Unexpected error updating education info",
        });
      }
    })
  );

  // Update Emergency Info
  socket.on(
    "hrm/employees/update-emergency",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket); 
        if (!data || typeof data !== "object") {
          throw new Error("Emergency info update data is required");
        }
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for emergency info update");
        }
        if (!data.emergencyContacts) {
          throw new Error("Emergency contact details are required");
        }
        const response = await hrmEmployee.updateEmergencyContacts(
          companyId,
          hrId,
          data
        );
        socket.emit("hrm/employees/update-emergency-response", response);
      } catch (error) {
        console.error("Error in update-emergency:", error);
        socket.emit("hrm/employees/update-emergency-response", {
          done: false,
          error: error.message || "Unexpected error updating emergency info",
        });
      }
    })
  );

  // Update Experience Info
  socket.on(
    "hrm/employees/update-experience",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        if (!data || typeof data !== "object") {
          throw new Error("Experience info update data is required");
        }
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for experience info update");
        }
        if (!data.experienceDetails) {
          throw new Error("Experience details are required");
        }
        const response = await hrmEmployee.updateExperienceInfo(
          companyId,
          hrId,
          data
        );
        socket.emit("hrm/employees/update-experience-response", response);
      } catch (error) {
        console.error("Error in update-experience:", error);
        socket.emit("hrm/employees/update-experience-response", {
          done: false,
          error: error.message || "Unexpected error updating experience info",
        });
      }
    })
  );

  // Update About Info
  socket.on(
    "hrm/employees/update-about",
    withRateLimit(async (data) => {
      try {
        const { companyId, hrId } = validateHrAccess(socket);
        if (!data || typeof data !== "object") {
          throw new Error("About update data is required");
        }
        const employeeId =
          typeof data.employeeId === "string" ? data.employeeId.trim() : "";
        if (!employeeId) {
          throw new Error("Employee ID is required for about update");
        }
        if (!data.about || typeof data.about !== "string") {
          throw new Error("About content is required and must be a string");
        }
        const response = await hrmEmployee.updateAboutInfo(
          companyId,
          hrId,
          data
        );
        socket.emit("hrm/employees/update-about-response", response);
      } catch (error) {
        console.error("Error in update-about:", error);
        socket.emit("hrm/employees/update-about-response", {
          done: false,
          error: error.message || "Unexpected error updating about info",
        });
      }
    })
  );
};
export default hrDashboardController;
