import * as hrmHolidays from "../../services/hr/hrm.holidays.js";
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const holidayController = (socket, io) => {
    devLog("Helllloooooo*******");
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
        // if (socket.userMetadata?.role !== "hr") {
        //     devError(`[HR] Unauthorized role: ${socket.userMetadata?.role}, HR role required`);
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
    const validateHolidayData = (data) => {
        if (typeof data !== "object" || data === null) {
            return { done: false, errors: { _form: "Form data must be an object" } };
        }

        const errors = {};

        // Validate title (required)
        if (!data.title) {
            errors.title = "Title is required";
        } else if (typeof data.title !== "string" || data.title.trim() === "") {
            errors.title = "Title must be a non-empty string";
        }

        // Validate date (required)
        if (!data.date) {
            errors.date = "Date is required";
        } else {
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                errors.date = "Invalid date format";
            }
        }

        // Validate status (required)
        if (!data.status) {
            errors.status = "Status is required";
        } else {
            const allowedStatuses = ["active", "inactive"];
            if (!allowedStatuses.includes(data.status.toLowerCase())) {
                errors.status = "Status must be either 'active' or 'inactive'";
            }
        }

        // Validate holidayTypeId (required)
        if (!data.holidayTypeId) {
            errors.holidayTypeId = "Holiday type is required";
        } else if (typeof data.holidayTypeId !== "string" || data.holidayTypeId.trim() === "") {
            errors.holidayTypeId = "Holiday type must be a valid ID";
        }

        // Validate description (optional) - allow empty string
        if (data.description !== undefined && data.description !== null && typeof data.description !== "string") {
            errors.description = "Description must be a string";
        }

        // Validate repeatsEveryYear (optional)
        if (data.repeatsEveryYear !== undefined && typeof data.repeatsEveryYear !== "boolean") {
            errors.repeatsEveryYear = "Repeats Every Year must be a boolean";
        }

        if (Object.keys(errors).length > 0) {
            return { done: false, errors };
        }

        return null;
    };

    socket.on("hrm/holiday/get", async () => {
        try {
            devLog("Hello from get controller");

            const { companyId } = validateHrAccess(socket);
            const res = await hrmHolidays.displayHoliday(companyId);
            socket.emit("hrm/holiday/get-response", res);
        } catch (error) {
            socket.emit("hrm/holiday/get-response", toErr(error));
        }
    });

    socket.on("hrm/holiday/add", withRateLimit(async (formData) => {
        try {
            devLog("Hello from add controller", formData);
            const { companyId, hrId } = validateHrAccess(socket);
            const validationResult = validateHolidayData(formData);
            if (validationResult) {
                return socket.emit("hrm/holiday/add-response", validationResult);
            }
            const result = await hrmHolidays.addHoliday(companyId, hrId, formData);
            socket.emit("hrm/holiday/add-response", result);
        } catch (error) {
            devLog(toErr(error));
            socket.emit("hrm/holiday/add-response", toErr(error));
        }
    }))

    socket.on("hrm/holiday/update", withRateLimit(async (payload) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const result = await hrmHolidays.updateHoliday(companyId, hrId, payload);
            socket.emit("hrm/holiday/update-response", result);
        } catch (error) {
            socket.emit("hrm/holiday/update-response", toErr(error));
        }
    }));

    socket.on("hrm/holiday/delete", withRateLimit(async (holidayId) => {
        try {
            const { companyId, hrId } = validateHrAccess(socket);
            const result = await hrmHolidays.deleteHoliday(companyId, holidayId);
            socket.emit("hrm/holiday/update-response", result);
        } catch (error) {
            socket.emit("hrm/holiday/delete-response", toErr(error));
        }
    }));
}

export default holidayController;