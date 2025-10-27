import * as hrmHolidays from "../../services/hr/hrm.holidays.js";

const toErr = (e) => ({ done: false, message: e?.message || String(e) });

const holidayController = (socket, io) => {
    console.log("Helllloooooo*******");
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
    const validateHolidayData = (data) => {
        if (typeof data !== "object" || data === null) {
            return "Form data must be an object";
        }

        // Required string fields
        const requiredStringFields = ["title", "date", "description", "status"];

        for (const field of requiredStringFields) {
            if (!(field in data)) {
                return `Missing required field: ${field}`;
            }
            if (typeof data[field] !== "string" || data[field].trim() === "") {
                return `Field '${field}' must be a non-empty string`;
            }
        }

        // Validate date format
        const date = new Date(data.date);
        if (isNaN(date.getTime())) {
            return "Invalid date format. Please provide a valid date.";
        }

        // Validate status
        const allowedStatuses = ["active", "inactive"];
        if (!allowedStatuses.includes(data.status.toLowerCase())) {
            return "Status must be either 'active' or 'inactive'";
        }

        return null;
    };

    socket.on("hrm/holiday/get", async () => {
        try {
            console.log("Hello from get controller");

            const { companyId } = validateHrAccess(socket);
            const res = await hrmHolidays.displayHoliday(companyId);
            socket.emit("hrm/holiday/get-response", res);
        } catch (error) {
            socket.emit("hrm/holiday/get-response", toErr(error));
        }
    });

    socket.on("hrm/holiday/add", withRateLimit(async (formData) => {
        try {
            console.log("Hello from add controller", formData);
            const { companyId, hrId } = validateHrAccess(socket);
            const error = validateHolidayData(formData);
            if (error) {
                return socket.emit("hrm/holiday/add-response", {
                    done: false,
                    message: error,
                });
            }
            const result = await hrmHolidays.addHoliday(companyId, hrId, formData);
            socket.emit("hrm/holiday/add-response", result);
        } catch (error) {
            console.log(toErr(error));
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