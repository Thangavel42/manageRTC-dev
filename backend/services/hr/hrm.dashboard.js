import { getTenantCollections } from "../../config/db.js";

/**
 * Holiday Resolver Helper
 * Processes holidays to handle yearly repeating logic
 *
 * @param {Array} holidays - Raw holidays from database
 * @param {Date} referenceDate - Reference date for comparison (default: today)
 * @returns {Array} Processed holidays with normalized dates
 */
const resolveHolidays = (holidays, referenceDate = new Date()) => {
  const currentYear = referenceDate.getFullYear();
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return holidays.map(holiday => {
    const originalDate = new Date(holiday.date);
    let resolvedDate = new Date(originalDate);

    if (holiday.repeatsEveryYear) {
      // For repeating holidays, use current year with original month/day
      resolvedDate = new Date(
        currentYear,
        originalDate.getMonth(),
        originalDate.getDate(),
        0, 0, 0, 0
      );

      // Handle leap year edge case (Feb 29)
      if (originalDate.getMonth() === 1 && originalDate.getDate() === 29) {
        // Check if current year is leap year
        const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear(currentYear)) {
          // Use Feb 28 in non-leap years
          resolvedDate = new Date(currentYear, 1, 28, 0, 0, 0, 0);
        }
      }

      // If the date has passed this year and we're looking for upcoming, check next year
      if (resolvedDate < today) {
        const nextYearDate = new Date(
          currentYear + 1,
          originalDate.getMonth(),
          originalDate.getDate(),
          0, 0, 0, 0
        );
        // Use next year's date for upcoming calculations
        resolvedDate = nextYearDate;
      }
    }

    return {
      ...holiday,
      originalDate: originalDate,
      resolvedDate: resolvedDate,
      displayDate: resolvedDate // For frontend display
    };
  });
};

/**
 * Check if a date matches today (for repeating holidays, checks day+month only)
 *
 * @param {Object} holiday - Holiday object with date and repeatsEveryYear
 * @param {Date} referenceDate - Date to compare against
 * @returns {Boolean}
 */
const isHolidayToday = (holiday, referenceDate = new Date()) => {
  const holidayDate = new Date(holiday.date);
  const checkDate = new Date(referenceDate);

  checkDate.setHours(0, 0, 0, 0);
  holidayDate.setHours(0, 0, 0, 0);

  if (holiday.repeatsEveryYear) {
    // Match by day and month only
    return (
      holidayDate.getDate() === checkDate.getDate() &&
      holidayDate.getMonth() === checkDate.getMonth()
    );
  } else {
    // Match exact date
    return holidayDate.getTime() === checkDate.getTime();
  }
};

/**
 * Get previous month's employee counts for growth calculation
 * Returns employee counts from the first day of previous month
 */
const getPreviousMonthCounts = async (collections, currentDate) => {
  try {
    const previousMonthStart = new Date(currentDate);
    previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
    previousMonthStart.setDate(1);
    previousMonthStart.setHours(0, 0, 0, 0);

    const previousMonthEnd = new Date(previousMonthStart);
    previousMonthEnd.setMonth(previousMonthEnd.getMonth() + 1);
    previousMonthEnd.setDate(0);
    previousMonthEnd.setHours(23, 59, 59, 999);

    // Get count of employees who existed on the first day of previous month
    const existingEmployees = await collections.employees.countDocuments({
      createdAt: { $lt: previousMonthEnd }
    });

    // Get active employees as of end of previous month
    // (employees who were Active and hadn't resigned/terminated yet)
    const previousActive = await collections.employees.countDocuments({
      createdAt: { $lt: previousMonthEnd },
      $or: [
        { status: 'Active' },
        { status: { $exists: false } }, // Employees without explicit status
      ],
      $or: [
        { lastWorkingDay: { $exists: false } },
        { lastWorkingDay: { $gt: previousMonthEnd } },
        { resignationDate: { $exists: false } },
        { resignationDate: { $gt: previousMonthEnd } },
      ],
    });

    return {
      total: existingEmployees,
      active: previousActive,
      inactive: existingEmployees - previousActive,
    };
  } catch (error) {
    console.warn('[HR Dashboard] Could not fetch previous month counts:', error.message);
    return { total: 0, active: 0, inactive: 0 };
  }
};

/**
 * Calculate growth percentage between two numbers
 */
const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return 0;
  const growth = ((current - previous) / previous) * 100;
  return parseFloat(growth.toFixed(1));
};

/**
 * Get HR Dashboard Statistics
 * Aggregates data from multiple collections for dashboard overview
 */
export const getDashboardStats = async (companyId, year = null) => {
  console.log(`[HR Dashboard Service] Starting data fetch for companyId: ${companyId}`);

  try {
    const collections = await getTenantCollections(companyId);
    console.log(`[HR Dashboard Service] Collections obtained successfully`);

    const {
      employees,
      departments,
      designations,
      policy,
      holidays,
      holidayTypes,
      trainings,
      trainers,
      trainingtypes,
      resignation,
      termination,
      projects,
    } = collections;

    const currentYear = year || new Date().getFullYear();
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setDate(currentDate.getDate() - 30);

    // Get today's date range (start and end of day)
    const todayStart = new Date(currentDate);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(currentDate);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`[HR Dashboard Service] Starting parallel queries...`);

    // Parallel execution of all queries for better performance
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      newJoiners,
      totalResignations,
      recentResignations,
      totalTerminations,
      recentTerminations,
      employeesByDepartment,
      employeesByStatus,
      departmentStats,
      designationStats,
      policyStats,
      holidayStats,
      trainingStats,
      projectStats,
      resourceStats,
      recentActivities,
      departmentWiseProjects,
      trainingDistribution,
      allHolidays, // Single query for all active holidays
      allActiveEmployees, // Employee data for birthdays and anniversaries
    ] = await Promise.all([
      // Employee Statistics
      employees.countDocuments().catch(() => 0),
      employees.countDocuments({ status: "Active" }).catch(() => 0),
      employees.countDocuments({ status: "Inactive" }).catch(() => 0),
      // New Joiners - count employees who joined in the last 30 days
      employees.countDocuments({
        dateOfJoining: {
          $gte: thirtyDaysAgo,
          $lte: currentDate
        },
      }).catch(() => 0),

      // Resignation Statistics (only approved resignations)
      resignation.countDocuments({ resignationStatus: "approved" }).catch(() => 0),
      resignation.countDocuments({
        resignationStatus: "approved",
        noticeDate: { $gte: thirtyDaysAgo.toISOString().split('T')[0] },
      }).catch(() => 0),

      // Termination Statistics (only processed terminations)
      termination.countDocuments({ status: "processed" }).catch(() => 0),
      termination.countDocuments({
        status: "processed",
        terminationDate: { $gte: thirtyDaysAgo.toISOString().split('T')[0] },
      }).catch(() => 0),

      // Employee Distribution by Department
      employees
        .aggregate([
          {
            $addFields: {
              departmentObjId: {
                $cond: {
                  if: { $and: [{ $ne: ["$departmentId", null] }, { $ne: ["$departmentId", ""] }] },
                  then: { $toObjectId: "$departmentId" },
                  else: null
                }
              }
            }
          },
          {
            $lookup: {
              from: "departments",
              localField: "departmentObjId",
              foreignField: "_id",
              as: "department",
            },
          },
          { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ["$department.department", "Unassigned"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray()
        .catch(() => []),

      // Employee Status Distribution
      employees
        .aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray()
        .catch(() => []),

      // Department Statistics
      Promise.all([
        departments.countDocuments().catch(() => 0),
        departments.countDocuments({ status: "Active" }).catch(() => 0),
        departments.countDocuments({ status: "Inactive" }).catch(() => 0),
        departments.countDocuments({ createdAt: { $gte: thirtyDaysAgo },
        }).catch(() => 0),
      ]).then(([total, active, inactive, recent]) => ({
        totalDepartments: total,
        activeDepartments: active,
        inactiveDepartments: inactive,
        recentlyAdded: recent,
      })).catch(() => ({
        totalDepartments: 0,
        activeDepartments: 0,
        inactiveDepartments: 0,
        recentlyAdded: 0,
      })),

      // Designation Statistics
      (async () => {
        try {
          const [total, active, inactive, deptWise] = await Promise.all([
            designations.countDocuments().catch(() => 0),
            designations.countDocuments({ status: "Active" }).catch(() => 0),
            designations.countDocuments({ status: "Inactive" }).catch(() => 0),
            designations
              .aggregate([
                {
                  $lookup: {
                    from: "departments",
                    localField: "departmentId",
                    foreignField: "_id",
                    as: "department",
                  },
                },
                { $unwind: "$department" },
                {
                  $group: {
                    _id: "$department.department",
                    count: { $sum: 1 },
                  },
                },
                { $sort: { count: -1 } },
                { $limit: 5 },
              ])
              .toArray()
              .catch(() => []),
          ]);
          return {
            totalDesignations: total,
            activeDesignations: active,
            inactiveDesignations: inactive,
            departmentWiseCount: deptWise.map((d) => ({
              department: d._id,
              count: d.count,
            })),
          };
        } catch (error) {
          return {
            totalDesignations: 0,
            activeDesignations: 0,
            inactiveDesignations: 0,
            departmentWiseCount: [],
          };
        }
      })(),

      // Policy Statistics
      Promise.all([
        policy.countDocuments({ status: "Active" }).catch(() => 0),
        policy.countDocuments({ createdAt: { $gte: thirtyDaysAgo },
        }).catch(() => 0),
        policy.countDocuments({ applyToAll: true,
        }).catch(() => 0),
        policy.countDocuments({ applyToAll: false,
        }).catch(() => 0),
      ]).then(([active, recent, applyAll, selective]) => ({
        totalActivePolicies: active,
        policiesCreatedLast30Days: recent,
        policiesAppliedToAll: applyAll,
        policiesSelective: selective,
      })).catch(() => ({
        totalActivePolicies: 0,
        policiesCreatedLast30Days: 0,
        policiesAppliedToAll: 0,
        policiesSelective: 0,
      })),

      // Holiday Statistics
      (async () => {
        try {
          const [total, upcoming, types] = await Promise.all([
            holidays.countDocuments().catch(() => 0),
            holidays.countDocuments({ date: { $gte: currentDate },
            }).catch(() => 0),
            holidayTypes.countDocuments().catch(() => 0),
          ]);
          return {
            totalHolidays: total,
            upcomingHolidays: upcoming,
            holidayTypesCount: types,
          };
        } catch (error) {
          return {
            totalHolidays: 0,
            upcomingHolidays: 0,
            holidayTypesCount: 0,
          };
        }
      })(),

      // Training Statistics
      (async () => {
        try {
          const [total, active, trainersCount, employeesInTraining] =
            await Promise.all([
              trainings.countDocuments().catch(() => 0),
              trainings.countDocuments({ status: "Active" }).catch(() => 0),
              trainers.countDocuments().catch(() => 0),
              trainings
                .aggregate([
                  { $match: { status: "Active" } },
                  { $unwind: "$employees" },
                  { $group: { _id: "$employees" } },
                  { $count: "count" },
                ])
                .toArray()
                .then((result) => (result[0]?.count || 0))
                .catch(() => 0),
            ]);
          return {
            totalTrainings: total,
            activeTrainings: active,
            totalTrainers: trainersCount,
            employeesInTraining,
          };
        } catch (error) {
          return {
            totalTrainings: 0,
            activeTrainings: 0,
            totalTrainers: 0,
            employeesInTraining: 0,
          };
        }
      })(),

      // Project Statistics
      (async () => {
        try {
          const [total, active, completed, onHold] = await Promise.all([
            projects.countDocuments({ isDeleted: false }).catch(() => 0),
            projects.countDocuments({ isDeleted: false, status: { $regex: /^active$/i } }).catch(() => 0),
            projects.countDocuments({ isDeleted: false, status: { $regex: /^completed$/i } }).catch(() => 0),
            projects.countDocuments({ isDeleted: false, status: { $regex: /^(on.?hold|on-hold)$/i } }).catch(() => 0),
          ]);
          return {
            totalProjects: total,
            activeProjects: active,
            completedProjects: completed,
            onHoldProjects: onHold,
          };
        } catch (error) {
          return {
            totalProjects: 0,
            activeProjects: 0,
            completedProjects: 0,
            onHoldProjects: 0,
          };
        }
      })(),

      // Resource Allocation Statistics
      (async () => {
        try {
          const [allocated, allEmployees, overAllocatedResult, avgTeamSize] =
            await Promise.all([
              projects
                .aggregate([
                  { $match: { isDeleted: false, status: { $regex: /^active$/i } } },
                  { $unwind: "$teamMembers" },
                  { $group: { _id: "$teamMembers" } },
                  { $count: "count" },
                ])
                .toArray()
                .then((result) => result[0]?.count || 0)
                .catch(() => 0),
              employees.countDocuments({ status: "Active" }).catch(() => 0),
              projects
                .aggregate([
                  { $match: { isDeleted: false, status: { $regex: /^active$/i } } },
                  { $unwind: "$teamMembers" },
                  {
                    $group: {
                      _id: "$teamMembers",
                      projectCount: { $sum: 1 },
                    },
                  },
                  { $match: { projectCount: { $gt: 2 } } },
                  { $count: "count" },
                ])
                .toArray()
                .then((result) => result[0]?.count || 0)
                .catch(() => 0),
              projects
                .aggregate([
                  { $match: { isDeleted: false, status: { $regex: /^active$/i } } },
                  {
                    $group: {
                      _id: null,
                      avgSize: { $avg: { $size: "$teamMembers" } },
                    },
                  },
                ])
                .toArray()
                .then((result) => Math.round(result[0]?.avgSize || 0))
                .catch(() => 0),
            ]);
          return {
            allocatedResources: allocated,
            availableResources: allEmployees - allocated,
            overAllocated: overAllocatedResult,
            averageTeamSize: avgTeamSize,
          };
        } catch (error) {
          return {
            allocatedResources: 0,
            availableResources: 0,
            overAllocated: 0,
            averageTeamSize: 0,
          };
        }
      })(),

      // Recent Activities (last 10)
      employees
        .aggregate([
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 1,
              action: { $literal: "Employee Added" },
              description: {
                $concat: ["$firstName", " ", "$lastName", " joined the team"],
              },
              createdAt: 1,
              actorName: {
                $concat: ["$firstName", " ", "$lastName"],
              },
              actorRole: "$role",
            },
          },
        ])
        .toArray()
        .catch(() => []),

      // Department-wise Project Distribution
      projects
        .aggregate([
          { $match: { isDeleted: false } },
          {
            $lookup: {
              from: "departments",
              localField: "departmentId",
              foreignField: "_id",
              as: "department",
            },
          },
          { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: { $ifNull: ["$department.name", "Unassigned"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ])
        .toArray()
        .catch(() => []),

      // Training Distribution by Type
      trainings
        .aggregate([
          {
            $lookup: {
              from: "trainingtypes",
              localField: "trainingTypeId",
              foreignField: "_id",
              as: "trainingType",
            },
          },
          {
            $unwind: {
              path: "$trainingType",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $group: {
              _id: { $ifNull: ["$trainingType.name", "Other"] },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ])
        .toArray()
        .catch(() => []),

      // All Active Holidays (will be processed for calendar, upcoming, and today)
      holidays
        .aggregate([
          {
            $match: {
              status: "Active"
            }
          },
          {
            $lookup: {
              from: "holidaytypes",
              localField: "holidayTypeId",
              foreignField: "_id",
              as: "holidayTypeData"
            }
          },
          {
            $addFields: {
              holidayTypeName: {
                $ifNull: [
                  { $arrayElemAt: ["$holidayTypeData.name", 0] },
                  "Other"
                ]
              }
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              date: 1,
              description: 1,
              status: 1,
              holidayTypeName: 1,
              holidayTypeId: 1,
              repeatsEveryYear: 1
            }
          }
        ])
        .toArray()
        .catch(() => []),

      // All Active and On Notice Employees (for birthdays and anniversaries)
      employees
        .find({
          status: { $in: ["Active", "On Notice"] }
        })
        .project({
          _id: 1,
          employeeId: 1,
          firstName: 1,
          lastName: 1,
          status: 1,
          dateOfJoining: 1,
          "personal.birthday": 1
        })
        .toArray()
        .catch(() => []),
    ]);

    // Fetch resignation, termination, and promotion data for Dynamic Events
    const [resignationData, terminationData, promotionData] = await Promise.all([
      // Approved Resignations with notice period info
      resignation
        .find({ resignationStatus: "approved" })
        .project({
          _id: 1,
          employeeId: 1,
          noticeDate: 1,
          resignationDate: 1,
          lastWorkingDay: 1,
        })
        .toArray()
        .catch(() => []),

      // Processed Terminations
      termination
        .find({ status: "processed" })
        .project({
          _id: 1,
          employeeId: 1,
          terminationDate: 1,
          terminationType: 1,
        })
        .toArray()
        .catch(() => []),

      // Promotions (if collection exists)
      collections.promotion ?
        collections.promotion
          .find({ status: "approved" })
          .project({
            _id: 1,
            employeeId: 1,
            promotionDate: 1,
            fromDesignation: 1,
            toDesignation: 1,
          })
          .toArray()
          .catch(() => []) :
        Promise.resolve([]),
    ]);

    console.log(`[HR Dashboard Service] Parallel queries completed successfully`);

    // Process holidays with resolver to handle repeating yearly holidays
    const processedHolidays = resolveHolidays(allHolidays, currentDate);

    // Filter today's holidays (including repeating ones by day+month)
    const todaysHolidays = processedHolidays.filter(holiday =>
      isHolidayToday(holiday, currentDate)
    );

    // Filter and sort upcoming holidays (including repeating ones)
    const upcomingHolidays = processedHolidays
      .filter(holiday => {
        const resolvedDate = new Date(holiday.resolvedDate);
        resolvedDate.setHours(0, 0, 0, 0);
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);
        return resolvedDate >= today;
      })
      .sort((a, b) => new Date(a.resolvedDate) - new Date(b.resolvedDate))
      .slice(0, 7); // Limit to 7

    // All holidays for calendar highlighting (with resolved dates)
    const allActiveHolidays = processedHolidays.map(holiday => ({
      _id: holiday._id,
      title: holiday.title,
      date: holiday.resolvedDate, // Use resolved date for calendar
      originalDate: holiday.originalDate,
      holidayTypeName: holiday.holidayTypeName,
      repeatsEveryYear: holiday.repeatsEveryYear
    }));

    // ============================================
    // PROCESS EMPLOYEE BIRTHDAYS AND ANNIVERSARIES
    // ============================================
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const employeeBirthdays = [];
    const employeeAnniversaries = [];

    allActiveEmployees.forEach(employee => {
      // Process Birthdays (for Active and On Notice employees)
      // Birthdays repeat every year (but only show from birth year onwards)
      if (employee.personal?.birthday) {
        try {
          const birthdayDate = new Date(employee.personal.birthday);
          if (!isNaN(birthdayDate.getTime())) {
            const birthYear = birthdayDate.getFullYear();

            // Only create birthday for current year if it's on or after the birth year
            if (currentYear >= birthYear) {
              // Create birthday for current year (repeats annually)
              const birthdayThisYear = new Date(
                currentYear,
                birthdayDate.getMonth(),
                birthdayDate.getDate(),
                0, 0, 0, 0
              );

              // Include birthdays for Active and On Notice employees
              employeeBirthdays.push({
                _id: employee._id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                status: employee.status,
                date: birthdayThisYear,
                originalDate: birthdayDate,
                birthYear: birthYear,
                type: 'birthday',
                repeatsYearly: true
              });
            }
          }
        } catch (error) {
          console.warn(`[HR Dashboard] Invalid birthday for employee ${employee.employeeId}:`, error.message);
        }
      }

      // Process Work Anniversaries (ONLY for Active employees)
      // Show "Employee Joined" on joining date (joining year)
      // Show anniversaries from next year onwards (repeat yearly)
      if (employee.dateOfJoining && employee.status === "Active") {
        try {
          const joiningDate = new Date(employee.dateOfJoining);
          if (!isNaN(joiningDate.getTime())) {
            const joiningYear = joiningDate.getFullYear();

            // Calculate years with company
            const yearsWithCompany = currentYear - joiningYear;

            // Case 1: Joining year - show "Employee Joined" message
            if (currentYear === joiningYear) {
              const joiningDateThisYear = new Date(
                currentYear,
                joiningDate.getMonth(),
                joiningDate.getDate(),
                0, 0, 0, 0
              );

              employeeAnniversaries.push({
                _id: employee._id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                status: employee.status,
                date: joiningDateThisYear,
                originalDate: joiningDate,
                joiningYear: joiningYear,
                yearsWithCompany: 0, // Zero years in joining year
                type: 'joined',
                repeatsYearly: false
              });
            }
            // Case 2: After joining year - show work anniversaries (repeats yearly)
            else if (yearsWithCompany > 0 && currentYear > joiningYear) {
              const anniversaryThisYear = new Date(
                currentYear,
                joiningDate.getMonth(),
                joiningDate.getDate(),
                0, 0, 0, 0
              );

              employeeAnniversaries.push({
                _id: employee._id,
                employeeId: employee.employeeId,
                firstName: employee.firstName,
                lastName: employee.lastName,
                status: employee.status,
                date: anniversaryThisYear,
                originalDate: joiningDate,
                joiningYear: joiningYear,
                yearsWithCompany: yearsWithCompany,
                type: 'anniversary',
                repeatsYearly: true
              });
            }
          }
        } catch (error) {
          console.warn(`[HR Dashboard] Invalid dateOfJoining for employee ${employee.employeeId}:`, error.message);
        }
      }
    });

    console.log(`[HR Dashboard Service] Processed ${employeeBirthdays.length} birthdays and ${employeeAnniversaries.length} anniversaries`);

    // Transform employee status data
    const statusMap = {
      active: 0,
      inactive: 0,
      onNotice: 0,
      terminated: 0,
      resigned: 0,
    };

    employeesByStatus.forEach((item) => {
      const status = item._id?.toLowerCase().replace(/\s+/g, '') || "inactive";
      if (status === "active") statusMap.active = item.count;
      else if (status === "inactive") statusMap.inactive = item.count;
      else if (status === "onnotice") statusMap.onNotice = item.count;
      else if (status === "terminated") statusMap.terminated = item.count;
      else if (status === "resigned") statusMap.resigned = item.count;
      else if (status === "onleave") statusMap.inactive += item.count; // Count 'On Leave' as inactive
    });

    // Get previous month's counts for growth calculation
    const previousMonthCounts = await getPreviousMonthCounts(collections, currentDate);

    // Calculate growth percentages based on current vs previous month
    const activeGrowth = calculateGrowth(activeEmployees, previousMonthCounts.active);
    const inactiveGrowth = calculateGrowth(inactiveEmployees, previousMonthCounts.inactive);

    // Joiners growth: new joiners this month vs last month's new joiners
    // Since we don't track monthly new joiners historically, we'll calculate based on total growth
    const joinersGrowth = calculateGrowth(newJoiners, Math.max(0, previousMonthCounts.total * 0.05)); // Assume 5% monthly hiring baseline

    // Overall employee growth percentage
    const employeesGrowth = calculateGrowth(totalEmployees, previousMonthCounts.total);

    console.log(`[HR Dashboard Service] Data transformation completed, returning response`);
    return {
      done: true,
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          inactiveEmployees,
          newJoiners,
          totalResignations,
          resignationsLast30Days: recentResignations,
          totalTerminations,
          terminationsLast30Days: recentTerminations,
          employeesGrowth: parseFloat(employeesGrowth),
          activeGrowth,
          inactiveGrowth,
          joinersGrowth,
        },
        employeesByDepartment: employeesByDepartment.map((dept) => ({
          department: dept._id,
          count: dept.count,
        })),
        employeesByStatus: statusMap,
        departmentStats,
        designationStats,
        policyStats,
        holidayStats,
        trainingStats,
        projectStats,
        resourceStats,
        recentActivities,
        departmentWiseProjects: departmentWiseProjects.map((dept) => ({
          department: dept._id,
          count: dept.count,
        })),
        trainingDistribution: trainingDistribution.map((training) => ({
          type: training._id,
          count: training.count,
        })),
        upcomingHolidays: upcomingHolidays.map((holiday) => ({
          _id: holiday._id.toString(),
          title: holiday.title,
          date: holiday.resolvedDate, // Use resolved date (current year for repeating)
          originalDate: holiday.originalDate,
          description: holiday.description || "",
          status: holiday.status,
          holidayTypeName: holiday.holidayTypeName || "Other",
          holidayTypeId: holiday.holidayTypeId?.toString() || "",
          repeatsEveryYear: holiday.repeatsEveryYear || false,
        })),
        todaysHolidays: todaysHolidays.map((holiday) => ({
          _id: holiday._id.toString(),
          title: holiday.title,
          date: holiday.resolvedDate, // Use resolved date
          originalDate: holiday.originalDate,
          description: holiday.description || "",
          status: holiday.status,
          holidayTypeName: holiday.holidayTypeName || "Other",
          holidayTypeId: holiday.holidayTypeId?.toString() || "",
          repeatsEveryYear: holiday.repeatsEveryYear || false,
        })),
        allActiveHolidays: allActiveHolidays.map((holiday) => ({
          _id: holiday._id.toString(),
          title: holiday.title,
          date: holiday.date, // Already using resolved date from processing
          originalDate: holiday.originalDate,
          holidayTypeName: holiday.holidayTypeName || "Other",
          repeatsEveryYear: holiday.repeatsEveryYear || false,
        })),
        employeeBirthdays: employeeBirthdays.map((birthday) => ({
          _id: birthday._id.toString(),
          employeeId: birthday.employeeId,
          firstName: birthday.firstName,
          lastName: birthday.lastName,
          status: birthday.status,
          date: birthday.date,
          originalDate: birthday.originalDate,
          birthYear: birthday.birthYear,
          type: birthday.type,
          repeatsYearly: birthday.repeatsYearly
        })),
        employeeAnniversaries: employeeAnniversaries.map((anniversary) => ({
          _id: anniversary._id.toString(),
          employeeId: anniversary.employeeId,
          firstName: anniversary.firstName,
          lastName: anniversary.lastName,
          status: anniversary.status,
          date: anniversary.date,
          originalDate: anniversary.originalDate,
          joiningYear: anniversary.joiningYear,
          yearsWithCompany: anniversary.yearsWithCompany,
          type: anniversary.type,
          repeatsYearly: anniversary.repeatsYearly
        })),
        resignations: resignationData.map((resignation) => ({
          _id: resignation._id.toString(),
          employeeId: resignation.employeeId,
          noticeDate: resignation.noticeDate,
          resignationDate: resignation.resignationDate,
          lastWorkingDay: resignation.lastWorkingDay,
        })),
        terminations: terminationData.map((termination) => ({
          _id: termination._id.toString(),
          employeeId: termination.employeeId,
          terminationDate: termination.terminationDate,
          terminationType: termination.terminationType,
        })),
        promotions: promotionData.map((promotion) => ({
          _id: promotion._id.toString(),
          employeeId: promotion.employeeId,
          promotionDate: promotion.promotionDate,
          fromDesignation: promotion.fromDesignation,
          toDesignation: promotion.toDesignation,
        })),
      },
    };
  } catch (error) {
    console.error("[HR Dashboard Service] Error:", error);
    return {
      done: false,
      error: error.message || "Failed to fetch dashboard data",
    };
  }
};



