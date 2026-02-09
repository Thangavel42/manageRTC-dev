import * as hrmHolidayTypes from "../../services/hr/hrm.holidayTypes.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const holidayTypeController = (socket, io) => {
    devLog("==========================================");
    devLog("HOLIDAY TYPE CONTROLLER INITIALIZING");
    devLog("Socket ID:", socket.id);
    devLog("Company ID:", socket.companyId);
    devLog("==========================================");

    // Log all events for debugging
    socket.onAny((eventName, ...args) => {
        if (eventName.includes("holidayType")) {
            devLog("[Holiday Types Controller] Received event:", eventName, "with args:", args);
        }
    });
    
    const isDevelopment =
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "production";

    const validateHrAccess = (socket) => {
        if (!socket.companyId) {
            devError("[HR] Company ID not found in user metadata", {
                user: socket.user?.sub,
            });
            throw new Error("Company ID not found in user metadata");
        }
        const companyIdRegex = /^[a-zA-Z0-9_-]{3,50}$/;
        if (!companyIdRegex.test(socket.companyId)) {
            devError(`[HR] Invalid company ID format: ${socket.companyId}`);
            throw new Error("Invalid company ID format");
        }
        if (socket.userMetadata?.companyId !== socket.companyId) {
            devError(
                `[HR] Company ID mismatch: user metadata has ${socket.userMetadata?.companyId}, socket has ${socket.companyId}`
            );
            throw new Error("Unauthorized: Company ID mismatch");
        }
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

    const validateHolidayTypeData = (data) => {
        if (typeof data !== "object" || data === null) {
            return { done: false, errors: { _form: "Form data must be an object" } };
        }

        const errors = {};

        // Validate name (required)
        if (!data.name) {
            errors.name = "Holiday type name is required";
        } else if (typeof data.name !== "string" || data.name.trim() === "") {
            errors.name = "Holiday type name must be a non-empty string";
        }

        // Status field removed - not needed for holiday types

        if (Object.keys(errors).length > 0) {
            return { done: false, errors };
        }

        return null;
    };

    // Get all holiday types
    socket.on("hrm/holidayType/get", async () => {
        try {
            devLog("[Holiday Types Controller] Fetching holiday types");
            const { companyId } = validateHrAccess(socket);
            const res = await hrmHolidayTypes.getHolidayTypes(companyId);
            devLog("[Holiday Types Controller] Get result:", res.done ? `${res.data?.length || 0} types` : res.message);
            socket.emit("hrm/holidayType/get-response", res);
        } catch (error) {
            devError("[Holiday Types Controller] Error fetching:", error);
            socket.emit("hrm/holidayType/get-response", toErr(error));
        }
    });

    // Add new holiday type
    socket.on("hrm/holidayType/add", withRateLimit(async (formData) => {
        try {
            devLog("[Holiday Types Controller] Adding holiday type", formData);
            const { companyId, hrId } = validateHrAccess(socket);
            
            devLog("[Holiday Types Controller] Validating data for company:", companyId);
            const validationResult = validateHolidayTypeData(formData);
            if (validationResult) {
                devLog("[Holiday Types Controller] Validation failed:", validationResult);
                return socket.emit("hrm/holidayType/add-response", validationResult);
            }
            
            devLog("[Holiday Types Controller] Calling service to add holiday type");
            const result = await hrmHolidayTypes.addHolidayType(companyId, hrId, formData);
            devLog("[Holiday Types Controller] Service result:", result);
            
            socket.emit("hrm/holidayType/add-response", result);
        } catch (error) {
            devError("[Holiday Types Controller] Error adding holiday type:", error);
            socket.emit("hrm/holidayType/add-response", toErr(error));
        }
    }));

    // Update holiday type
    socket.on("hrm/holidayType/update", withRateLimit(async (payload) => {
        try {
            devLog("Updating holiday type", payload);
            const { companyId, hrId } = validateHrAccess(socket);
            const validationResult = validateHolidayTypeData(payload);
            if (validationResult) {
                return socket.emit("hrm/holidayType/update-response", validationResult);
            }
            const result = await hrmHolidayTypes.updateHolidayType(companyId, hrId, payload);
            socket.emit("hrm/holidayType/update-response", result);
        } catch (error) {
            devError("Error updating holiday type:", error);
            socket.emit("hrm/holidayType/update-response", toErr(error));
        }
    }));

    // Delete holiday type
    socket.on("hrm/holidayType/delete", withRateLimit(async (typeId) => {
        try {
            devLog("Deleting holiday type", typeId);
            const { companyId } = validateHrAccess(socket);
            const result = await hrmHolidayTypes.deleteHolidayType(companyId, typeId);
            socket.emit("hrm/holidayType/delete-response", result);
        } catch (error) {
            devError("Error deleting holiday type:", error);
            socket.emit("hrm/holidayType/delete-response", toErr(error));
        }
    }));

    // Initialize default holiday types (useful for new companies)
    socket.on("hrm/holidayType/initialize", withRateLimit(async () => {
        try {
            devLog("Initializing default holiday types");
            const { companyId, hrId } = validateHrAccess(socket);
            const result = await hrmHolidayTypes.initializeDefaultHolidayTypes(companyId, hrId);
            socket.emit("hrm/holidayType/initialize-response", result);
        } catch (error) {
            devError("Error initializing default holiday types:", error);
            socket.emit("hrm/holidayType/initialize-response", toErr(error));
        }
    }));
    
    devLog("==========================================");
    devLog("HOLIDAY TYPE CONTROLLER: All listeners registered");
    devLog("  - hrm/holidayType/get");
    devLog("  - hrm/holidayType/add");
    devLog("  - hrm/holidayType/update");
    devLog("  - hrm/holidayType/delete");
    devLog("  - hrm/holidayType/initialize");
    devLog("==========================================");
};

export default holidayTypeController;
