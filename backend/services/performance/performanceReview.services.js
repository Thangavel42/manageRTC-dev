import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Draft", "In Progress", "Completed", "Approved"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizePerformanceReviewInput = (input = {}) => {
  const now = new Date();
  
  return {
    employeeId: (input.employeeId || "").trim(),
    employeeInfo: {
      name: (input.employeeInfo?.name || "").trim(),
      empId: (input.employeeInfo?.empId || "").trim(),
      department: (input.employeeInfo?.department || "").trim(),
      designation: (input.employeeInfo?.designation || "").trim(),
      qualification: (input.employeeInfo?.qualification || "").trim(),
      dateOfJoin: parseDate(input.employeeInfo?.dateOfJoin),
      dateOfConfirmation: parseDate(input.employeeInfo?.dateOfConfirmation),
      previousExperience: (input.employeeInfo?.previousExperience || "").trim(),
      reportingOfficer: {
        name: (input.employeeInfo?.reportingOfficer?.name || "").trim(),
        designation: (input.employeeInfo?.reportingOfficer?.designation || "").trim()
      }
    },
    professionalExcellence: Array.isArray(input.professionalExcellence) ? input.professionalExcellence.map(item => ({
      keyResultArea: (item.keyResultArea || "").trim(),
      keyPerformanceIndicator: (item.keyPerformanceIndicator || "").trim(),
      weightage: typeof item.weightage === "number" ? Math.max(0, Math.min(100, item.weightage)) : 0,
      selfScore: {
        percentage: typeof item.selfScore?.percentage === "number" ? Math.max(0, Math.min(100, item.selfScore.percentage)) : 0,
        points: typeof item.selfScore?.points === "number" ? Math.max(0, item.selfScore.points) : 0
      },
      reportingOfficerScore: {
        percentage: typeof item.reportingOfficerScore?.percentage === "number" ? Math.max(0, Math.min(100, item.reportingOfficerScore.percentage)) : 0,
        points: typeof item.reportingOfficerScore?.points === "number" ? Math.max(0, item.reportingOfficerScore.points) : 0
      }
    })) : [],
    personalExcellence: Array.isArray(input.personalExcellence) ? input.personalExcellence.map(item => ({
      personalAttribute: (item.personalAttribute || "").trim(),
      keyIndicator: (item.keyIndicator || "").trim(),
      weightage: typeof item.weightage === "number" ? Math.max(0, Math.min(100, item.weightage)) : 0,
      selfScore: {
        percentage: typeof item.selfScore?.percentage === "number" ? Math.max(0, Math.min(100, item.selfScore.percentage)) : 0,
        points: typeof item.selfScore?.points === "number" ? Math.max(0, item.selfScore.points) : 0
      },
      reportingOfficerScore: {
        percentage: typeof item.reportingOfficerScore?.percentage === "number" ? Math.max(0, Math.min(100, item.reportingOfficerScore.percentage)) : 0,
        points: typeof item.reportingOfficerScore?.points === "number" ? Math.max(0, item.reportingOfficerScore.points) : 0
      }
    })) : [],
    specialInitiatives: Array.isArray(input.specialInitiatives) ? input.specialInitiatives.map(item => ({
      selfComment: (item.selfComment || "").trim(),
      reportingOfficerComment: (item.reportingOfficerComment || "").trim(),
      hodComment: (item.hodComment || "").trim()
    })) : [],
    roleAlterations: Array.isArray(input.roleAlterations) ? input.roleAlterations.map(item => ({
      selfComment: (item.selfComment || "").trim(),
      reportingOfficerComment: (item.reportingOfficerComment || "").trim(),
      hodComment: (item.hodComment || "").trim()
    })) : [],
    strengthsAndImprovements: {
      self: Array.isArray(input.strengthsAndImprovements?.self) ? input.strengthsAndImprovements.self.map(item => ({
        strengths: (item.strengths || "").trim(),
        areasForImprovement: (item.areasForImprovement || "").trim()
      })) : [],
      reportingOfficer: Array.isArray(input.strengthsAndImprovements?.reportingOfficer) ? input.strengthsAndImprovements.reportingOfficer.map(item => ({
        strengths: (item.strengths || "").trim(),
        areasForImprovement: (item.areasForImprovement || "").trim()
      })) : [],
      hod: Array.isArray(input.strengthsAndImprovements?.hod) ? input.strengthsAndImprovements.hod.map(item => ({
        strengths: (item.strengths || "").trim(),
        areasForImprovement: (item.areasForImprovement || "").trim()
      })) : []
    },
    personalGoals: Array.isArray(input.personalGoals) ? input.personalGoals.map(item => ({
      goalAchievedLastYear: (item.goalAchievedLastYear || "").trim(),
      goalSetForCurrentYear: (item.goalSetForCurrentYear || "").trim()
    })) : [],
    personalUpdates: Array.isArray(input.personalUpdates) ? input.personalUpdates.map(item => ({
      category: (item.category || "").trim(),
      lastYear: {
        yesNo: ["Yes", "No"].includes(item.lastYear?.yesNo) ? item.lastYear.yesNo : "No",
        details: (item.lastYear?.details || "").trim()
      },
      currentYear: {
        yesNo: ["Yes", "No"].includes(item.currentYear?.yesNo) ? item.currentYear.yesNo : "No",
        details: (item.currentYear?.details || "").trim()
      }
    })) : [],
    professionalGoals: {
      achievedLastYear: Array.isArray(input.professionalGoals?.achievedLastYear) ? input.professionalGoals.achievedLastYear.map(item => ({
        selfComment: (item.selfComment || "").trim(),
        reportingOfficerComment: (item.reportingOfficerComment || "").trim(),
        hodComment: (item.hodComment || "").trim()
      })) : [],
      forthcomingYear: Array.isArray(input.professionalGoals?.forthcomingYear) ? input.professionalGoals.forthcomingYear.map(item => ({
        selfComment: (item.selfComment || "").trim(),
        reportingOfficerComment: (item.reportingOfficerComment || "").trim(),
        hodComment: (item.hodComment || "").trim()
      })) : []
    },
    trainingRequirements: Array.isArray(input.trainingRequirements) ? input.trainingRequirements.map(item => ({
      selfComment: (item.selfComment || "").trim(),
      reportingOfficerComment: (item.reportingOfficerComment || "").trim(),
      hodComment: (item.hodComment || "").trim()
    })) : [],
    generalComments: Array.isArray(input.generalComments) ? input.generalComments.map(item => ({
      self: (item.self || "").trim(),
      reportingOfficer: (item.reportingOfficer || "").trim(),
      hod: (item.hod || "").trim()
    })) : [],
    roUseOnly: Array.isArray(input.roUseOnly) ? input.roUseOnly.map(item => ({
      category: (item.category || "").trim(),
      yesNo: ["Yes", "No"].includes(item.yesNo) ? item.yesNo : "No",
      details: (item.details || "").trim()
    })) : [],
    hrdUseOnly: Array.isArray(input.hrdUseOnly) ? input.hrdUseOnly.map(item => ({
      parameter: (item.parameter || "").trim(),
      availablePoints: typeof item.availablePoints === "number" ? Math.max(0, item.availablePoints) : 0,
      pointsScored: typeof item.pointsScored === "number" ? Math.max(0, item.pointsScored) : 0,
      reportingOfficerComment: (item.reportingOfficerComment || "").trim()
    })) : [],
    signatures: {
      employee: {
        name: (input.signatures?.employee?.name || "").trim(),
        signature: (input.signatures?.employee?.signature || "").trim(),
        date: parseDate(input.signatures?.employee?.date)
      },
      reportingOfficer: {
        name: (input.signatures?.reportingOfficer?.name || "").trim(),
        signature: (input.signatures?.reportingOfficer?.signature || "").trim(),
        date: parseDate(input.signatures?.reportingOfficer?.date)
      },
      hod: {
        name: (input.signatures?.hod?.name || "").trim(),
        signature: (input.signatures?.hod?.signature || "").trim(),
        date: parseDate(input.signatures?.hod?.date)
      },
      hrd: {
        name: (input.signatures?.hrd?.name || "").trim(),
        signature: (input.signatures?.hrd?.signature || "").trim(),
        date: parseDate(input.signatures?.hrd?.date)
      }
    },
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Draft",
    reviewPeriod: {
      startDate: parseDate(input.reviewPeriod?.startDate) || now,
      endDate: parseDate(input.reviewPeriod?.endDate) || now
    },
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (performanceReview) => {
  if (!performanceReview.employeeId) return "Employee ID is required";
  if (!performanceReview.employeeInfo?.name) return "Employee name is required";
  if (!performanceReview.employeeInfo?.empId) return "Employee ID is required";
  if (!performanceReview.employeeInfo?.department) return "Department is required";
  if (!performanceReview.employeeInfo?.designation) return "Designation is required";
  if (!ALLOWED_STATUSES.includes(performanceReview.status)) return "Invalid status";
  
  return null;
};

export const createPerformanceReview = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceReviewService] createPerformanceReview", { companyId, data });
    const toInsert = normalizePerformanceReviewInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[PerformanceReviewService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.performanceReviews.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[PerformanceReviewService] Failed to insert performance review");
      return { done: false, error: "Failed to create performance review" };
    }
    const created = await collections.performanceReviews.findOne({ _id: result.insertedId });
    return { done: true, data: created };
  } catch (error) {
    console.error("[PerformanceReviewService] Error in createPerformanceReview", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllPerformanceReviews = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceReviewService] getAllPerformanceReviews", { companyId, filters });
    const query = { companyId, isDeleted: { $ne: true } };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status.filter((s) => ALLOWED_STATUSES.includes(s)) };
      } else if (ALLOWED_STATUSES.includes(filters.status)) {
        query.status = filters.status;
      }
    }

    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.department) {
      query['employeeInfo.department'] = { $regex: filters.department, $options: 'i' };
    }

    if (filters.designation) {
      query['employeeInfo.designation'] = { $regex: filters.designation, $options: 'i' };
    }

    // Date range filters
    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const sort = { createdAt: -1 };
    const performanceReviews = await collections.performanceReviews.find(query).sort(sort).toArray();
    console.log("[PerformanceReviewService] found performance reviews", { count: performanceReviews.length });
    return { done: true, data: performanceReviews };
  } catch (error) {
    console.error("[PerformanceReviewService] Error in getAllPerformanceReviews", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getPerformanceReviewById = async (companyId, id) => {
  try {
    console.log("[PerformanceReviewService] getPerformanceReviewById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance review ID format" };
    const collections = getTenantCollections(companyId);
    const performanceReview = await collections.performanceReviews.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!performanceReview) return { done: false, error: "Performance review not found" };
    return { done: true, data: performanceReview };
  } catch (error) {
    console.error("[PerformanceReviewService] Error in getPerformanceReviewById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updatePerformanceReview = async (companyId, id, updates = {}) => {
  try {
    console.log("[PerformanceReviewService] updatePerformanceReview", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance review ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };

    // Normalize dates in employeeInfo
    if (set.employeeInfo) {
      if (set.employeeInfo.dateOfJoin) {
        const dt = parseDate(set.employeeInfo.dateOfJoin);
        if (dt) set.employeeInfo.dateOfJoin = dt;
      }
      if (set.employeeInfo.dateOfConfirmation) {
        const dt = parseDate(set.employeeInfo.dateOfConfirmation);
        if (dt) set.employeeInfo.dateOfConfirmation = dt;
      }
    }

    // Normalize dates in signatures
    if (set.signatures) {
      Object.keys(set.signatures).forEach(key => {
        if (set.signatures[key]?.date) {
          const dt = parseDate(set.signatures[key].date);
          if (dt) set.signatures[key].date = dt;
        }
      });
    }

    // Normalize reviewPeriod
    if (set.reviewPeriod) {
      if (set.reviewPeriod.startDate) {
        const dt = parseDate(set.reviewPeriod.startDate);
        if (dt) set.reviewPeriod.startDate = dt;
      }
      if (set.reviewPeriod.endDate) {
        const dt = parseDate(set.reviewPeriod.endDate);
        if (dt) set.reviewPeriod.endDate = dt;
      }
    }

    set.updatedAt = new Date();

    const result = await collections.performanceReviews.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance review not found" };
    const updated = await collections.performanceReviews.findOne({ _id: new ObjectId(id) });
    return { done: true, data: updated };
  } catch (error) {
    console.error("[PerformanceReviewService] Error in updatePerformanceReview", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deletePerformanceReview = async (companyId, id) => {
  try {
    console.log("[PerformanceReviewService] deletePerformanceReview", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance review ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.performanceReviews.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "Cancelled", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance review not found" };
    const doc = await collections.performanceReviews.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[PerformanceReviewService] Error in deletePerformanceReview", { error: error.message });
    return { done: false, error: error.message };
  }
};