import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

// Generate application number
const generateApplicationNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CAND-${timestamp.slice(-6)}${random}`;
};

// Create new candidate
export const createCandidate = async (companyId, candidateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] createCandidate", { companyId, candidateData });

    // Generate application number
    const applicationNumber = generateApplicationNumber();

    // Process the form data into the structured format
    const newCandidate = {
      applicationNumber,
      companyId,
      
      // Personal Information
      personalInfo: {
        firstName: candidateData.firstName || '',
        lastName: candidateData.lastName || '',
        email: candidateData.email || '',
        phone: candidateData.phone || '',
        dateOfBirth: candidateData.dateOfBirth || null,
        gender: candidateData.gender || '',
        nationality: candidateData.nationality || '',
        religion: candidateData.religion || '',
        maritalStatus: candidateData.maritalStatus || '',
        address: candidateData.address || '',
        city: candidateData.city || '',
        state: candidateData.state || '',
        country: candidateData.country || '',
        linkedinProfile: candidateData.linkedinProfile || '',
        portfolio: candidateData.portfolio || ''
      },
      
      // Professional Information
      professionalInfo: {
        currentRole: candidateData.currentRole || '',
        currentCompany: candidateData.currentCompany || '',
        experienceYears: candidateData.experienceYears || 0,
        currentSalary: candidateData.currentSalary || 0,
        expectedSalary: candidateData.expectedSalary || 0,
        noticePeriod: candidateData.noticePeriod || '',
        skills: Array.isArray(candidateData.skills) ? candidateData.skills : [],
        qualifications: Array.isArray(candidateData.qualifications) ? candidateData.qualifications : [],
        certifications: Array.isArray(candidateData.certifications) ? candidateData.certifications : [],
        languages: Array.isArray(candidateData.languages) ? candidateData.languages : []
      },
      
      // Application Information
      applicationInfo: {
        appliedRole: candidateData.appliedRole || '',
        appliedDate: candidateData.appliedDate ? new Date(candidateData.appliedDate) : new Date(),
        recruiterId: candidateData.recruiterId || '',
        recruiterName: candidateData.recruiterName || '',
        source: candidateData.source || 'Direct',
        referredBy: candidateData.referredBy || '',
        jobId: candidateData.jobId || ''
      },
      
      // Documents
      documents: {
        resume: candidateData.resume || '',
        coverLetter: candidateData.coverLetter || '',
        portfolio: candidateData.portfolioDoc || '',
        others: []
      },
      
      // Ratings (initialized to 0)
      ratings: {
        technical: 0,
        communication: 0,
        cultural: 0,
        overall: 0
      },
      
      // Interview Information
      interviewInfo: {
        rounds: [],
        feedback: [],
        nextInterviewDate: null
      },
      
      // Status and Timeline
      status: candidateData.status || 'New Application',
      timeline: [
        {
          status: candidateData.status || 'New Application',
          date: new Date(),
          notes: 'Application submitted',
          updatedBy: 'System'
        }
      ],
      
      // Generate full name for easier searching
      fullName: `${candidateData.firstName || ''} ${candidateData.lastName || ''}`.trim(),
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false
    };

    const result = await collections.candidates.insertOne(newCandidate);
    console.log("[CandidateService] insertOne result", { result });

    if (result.insertedId) {
      const inserted = await collections.candidates.findOne({
        _id: result.insertedId,
      });
      console.log("[CandidateService] inserted candidate", { inserted });
      return { done: true, data: inserted };
    } else {
      console.error("[CandidateService] Failed to insert candidate");
      return { done: false, error: "Failed to insert candidate" };
    }
  } catch (error) {
    console.error("[CandidateService] Error in createCandidate", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Get all candidates with filters
export const getCandidates = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] getCandidates", { companyId, filters });

    const query = { companyId, isDeleted: { $ne: true } };

    // Apply filters
    if (filters.status && filters.status !== "All") {
      query.status = filters.status;
    }

    if (filters.appliedRole) {
      query["applicationInfo.appliedRole"] = filters.appliedRole;
    }

    if (filters.experienceLevel) {
      switch (filters.experienceLevel) {
        case "Entry Level":
          query["professionalInfo.experienceYears"] = { $lt: 2 };
          break;
        case "Mid Level":
          query["professionalInfo.experienceYears"] = { $gte: 2, $lt: 5 };
          break;
        case "Senior Level":
          query["professionalInfo.experienceYears"] = { $gte: 5, $lt: 10 };
          break;
        case "Expert Level":
          query["professionalInfo.experienceYears"] = { $gte: 10 };
          break;
      }
    }

    if (filters.recruiterId) {
      query["applicationInfo.recruiterId"] = filters.recruiterId;
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { fullName: { $regex: filters.search, $options: "i" } },
        { "personalInfo.email": { $regex: filters.search, $options: "i" } },
        { "personalInfo.phone": { $regex: filters.search, $options: "i" } },
        { "applicationInfo.appliedRole": { $regex: filters.search, $options: "i" } },
        { "professionalInfo.currentRole": { $regex: filters.search, $options: "i" } },
        { "professionalInfo.skills": { $regex: filters.search, $options: "i" } }
      ];
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      query["applicationInfo.appliedDate"] = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    // Sort options
    let sort = { "applicationInfo.appliedDate": -1 };
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "name_asc":
          sort = { fullName: 1 };
          break;
        case "name_desc":
          sort = { fullName: -1 };
          break;
        case "date_recent":
          sort = { "applicationInfo.appliedDate": -1 };
          break;
        case "date_oldest":
          sort = { "applicationInfo.appliedDate": 1 };
          break;
        case "experience":
          sort = { "professionalInfo.experienceYears": -1 };
          break;
        case "role":
          sort = { "applicationInfo.appliedRole": 1 };
          break;
        case "status":
          sort = { status: 1 };
          break;
      }
    }

    console.log("[CandidateService] Final query", { query, sort });

    const candidates = await collections.candidates.find(query).sort(sort).toArray();
    console.log("[CandidateService] found candidates", { count: candidates.length });

    // Ensure dates are properly converted to Date objects
    const processedCandidates = candidates.map((candidate) => ({
      ...candidate,
      createdAt: candidate.createdAt ? new Date(candidate.createdAt) : null,
      updatedAt: candidate.updatedAt ? new Date(candidate.updatedAt) : null,
      "applicationInfo.appliedDate": candidate.applicationInfo?.appliedDate 
        ? new Date(candidate.applicationInfo.appliedDate) 
        : null,
    }));

    return { done: true, data: processedCandidates };
  } catch (error) {
    console.error("[CandidateService] Error in getCandidates", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Get single candidate by ID
export const getCandidateById = async (companyId, candidateId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] getCandidateById", { companyId, candidateId });

    if (!ObjectId.isValid(candidateId)) {
      return { done: false, error: "Invalid candidate ID format" };
    }

    const candidate = await collections.candidates.findOne({
      _id: new ObjectId(candidateId),
      companyId,
      isDeleted: { $ne: true },
    });

    if (!candidate) {
      return { done: false, error: "Candidate not found" };
    }

    // Ensure dates are properly converted
    const processedCandidate = {
      ...candidate,
      createdAt: candidate.createdAt ? new Date(candidate.createdAt) : null,
      updatedAt: candidate.updatedAt ? new Date(candidate.updatedAt) : null,
      "applicationInfo.appliedDate": candidate.applicationInfo?.appliedDate 
        ? new Date(candidate.applicationInfo.appliedDate) 
        : null,
    };

    return { done: true, data: processedCandidate };
  } catch (error) {
    console.error("[CandidateService] Error in getCandidateById", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Update candidate
export const updateCandidate = async (companyId, candidateId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] updateCandidate", {
      companyId,
      candidateId,
      updateData,
    });

    if (!ObjectId.isValid(candidateId)) {
      return { done: false, error: "Invalid candidate ID format" };
    }

    // Process the form data into the structured format
    const updateFields = {
      // Personal Information
      personalInfo: {
        firstName: updateData.firstName || '',
        lastName: updateData.lastName || '',
        email: updateData.email || '',
        phone: updateData.phone || '',
        dateOfBirth: updateData.dateOfBirth || null,
        gender: updateData.gender || '',
        nationality: updateData.nationality || '',
        religion: updateData.religion || '',
        maritalStatus: updateData.maritalStatus || '',
        address: updateData.address || '',
        city: updateData.city || '',
        state: updateData.state || '',
        country: updateData.country || '',
        linkedinProfile: updateData.linkedinProfile || '',
        portfolio: updateData.portfolio || ''
      },
      
      // Professional Information
      professionalInfo: {
        currentRole: updateData.currentRole || '',
        currentCompany: updateData.currentCompany || '',
        experienceYears: updateData.experienceYears || 0,
        currentSalary: updateData.currentSalary || 0,
        expectedSalary: updateData.expectedSalary || 0,
        noticePeriod: updateData.noticePeriod || '',
        skills: Array.isArray(updateData.skills) ? updateData.skills : [],
        qualifications: Array.isArray(updateData.qualifications) ? updateData.qualifications : [],
        certifications: Array.isArray(updateData.certifications) ? updateData.certifications : [],
        languages: Array.isArray(updateData.languages) ? updateData.languages : []
      },
      
      // Application Information
      applicationInfo: {
        appliedRole: updateData.appliedRole || '',
        appliedDate: updateData.appliedDate ? new Date(updateData.appliedDate) : new Date(),
        recruiterId: updateData.recruiterId || '',
        recruiterName: updateData.recruiterName || '',
        source: updateData.source || 'Direct',
        referredBy: updateData.referredBy || '',
        jobId: updateData.jobId || ''
      },
      
      // Documents (only update if provided)
      ...(updateData.resume || updateData.coverLetter || updateData.portfolioDoc ? {
        documents: {
          resume: updateData.resume || '',
          coverLetter: updateData.coverLetter || '',
          portfolio: updateData.portfolioDoc || '',
          others: []
        }
      } : {}),
      
      // Status (if provided)
      ...(updateData.status ? { status: updateData.status } : {}),
      
      // Update full name for easier searching
      fullName: `${updateData.firstName || ''} ${updateData.lastName || ''}`.trim(),
      
      updatedAt: new Date(),
    };

    // Remove _id from update data to prevent conflicts
    delete updateFields._id;

    const result = await collections.candidates.updateOne(
      { _id: new ObjectId(candidateId), companyId, isDeleted: { $ne: true } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Candidate not found" };
    }

    if (result.modifiedCount === 0) {
      return { done: false, error: "No changes made to candidate" };
    }

    // Return updated candidate
    const updatedCandidate = await collections.candidates.findOne({
      _id: new ObjectId(candidateId),
      companyId,
    });

    const processedCandidate = {
      ...updatedCandidate,
      createdAt: updatedCandidate.createdAt
        ? new Date(updatedCandidate.createdAt)
        : null,
      updatedAt: updatedCandidate.updatedAt
        ? new Date(updatedCandidate.updatedAt)
        : null,
      "applicationInfo.appliedDate": updatedCandidate.applicationInfo?.appliedDate 
        ? new Date(updatedCandidate.applicationInfo.appliedDate) 
        : null,
    };

    return { done: true, data: processedCandidate };
  } catch (error) {
    console.error("[CandidateService] Error in updateCandidate", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Delete candidate (soft delete)
export const deleteCandidate = async (companyId, candidateId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] deleteCandidate", { companyId, candidateId });

    if (!ObjectId.isValid(candidateId)) {
      return { done: false, error: "Invalid candidate ID format" };
    }

    const result = await collections.candidates.updateOne(
      { _id: new ObjectId(candidateId), companyId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Candidate not found" };
    }

    return { done: true, data: { _id: candidateId, deleted: true } };
  } catch (error) {
    console.error("[CandidateService] Error in deleteCandidate", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Update candidate status with timeline
export const updateCandidateStatus = async (companyId, candidateId, statusData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] updateCandidateStatus", { companyId, candidateId, statusData });

    if (!ObjectId.isValid(candidateId)) {
      return { done: false, error: "Invalid candidate ID format" };
    }

    const candidate = await collections.candidates.findOne({
      _id: new ObjectId(candidateId),
      companyId,
      isDeleted: { $ne: true },
    });

    if (!candidate) {
      return { done: false, error: "Candidate not found" };
    }

    // Add to timeline
    const newTimelineEntry = {
      status: statusData.status,
      date: new Date(),
      notes: statusData.notes || '',
      updatedBy: statusData.updatedBy || 'Unknown'
    };

    const result = await collections.candidates.updateOne(
      { _id: new ObjectId(candidateId), companyId },
      {
        $set: {
          status: statusData.status,
          updatedAt: new Date(),
        },
        $push: {
          timeline: newTimelineEntry
        }
      }
    );

    if (result.modifiedCount === 0) {
      return { done: false, error: "Failed to update candidate status" };
    }

    // Return updated candidate
    const updatedCandidate = await collections.candidates.findOne({
      _id: new ObjectId(candidateId),
      companyId,
    });

    return { done: true, data: updatedCandidate };
  } catch (error) {
    console.error("[CandidateService] Error in updateCandidateStatus", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Get candidate statistics
export const getCandidateStats = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] getCandidateStats", { companyId });

    const totalCandidates = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
    });

    // New candidates in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCandidates = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Monthly hires (hired in last 30 days)
    const monthlyHires = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Hired",
      updatedAt: { $gte: thirtyDaysAgo },
    });

    // Status-specific counts
    const newApplications = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "New Application",
    });

    const screening = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Screening",
    });

    const interview = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Interview",
    });

    const hired = await collections.candidates.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Hired",
    });

    // Status breakdown
    const statusBreakdown = await collections.candidates.aggregate([
      { $match: { companyId, isDeleted: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Top applied roles
    const topRoles = await collections.candidates.aggregate([
      { $match: { companyId, isDeleted: { $ne: true } } },
      { $group: { _id: "$applicationInfo.appliedRole", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    const stats = {
      totalCandidates,
      newCandidates,
      monthlyHires,
      newApplications,
      screening,
      interview,
      hired,
      statusBreakdown,
      topRoles,
    };

    console.log("[CandidateService] Candidate stats", stats);
    return { done: true, data: stats };
  } catch (error) {
    console.error("[CandidateService] Error in getCandidateStats", {
      error: error.message,
    });
    return { done: false, error: error.message };
  }
};

// Export candidates as PDF
export const exportCandidatesPDF = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] exportCandidatesPDF", { companyId });

    const candidates = await collections.candidates
      .find({
        companyId,
        isDeleted: { $ne: true },
      })
      .sort({ "applicationInfo.appliedDate": -1 })
      .toArray();

    const doc = new PDFDocument();
    const fileName = `candidates_${companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Header
    doc.fontSize(20).text("Candidate Report", 50, 50);
    doc.fontSize(12).text(`Generated on: ${format(new Date(), "PPP")}`, 50, 80);
    doc.text(`Total Candidates: ${candidates.length}`, 50, 100);

    let yPosition = 130;

    // Table header
    doc.fontSize(10);
    doc.text("Name", 50, yPosition);
    doc.text("Applied Role", 150, yPosition);
    doc.text("Email", 280, yPosition);
    doc.text("Status", 450, yPosition);
    doc.text("Applied Date", 520, yPosition);

    yPosition += 20;

    // Draw line under header
    doc.moveTo(50, yPosition).lineTo(600, yPosition).stroke();
    yPosition += 10;

    // Candidate data
    candidates.forEach((candidate) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }

      doc.text(candidate.fullName || "N/A", 50, yPosition);
      doc.text(candidate.applicationInfo?.appliedRole || "N/A", 150, yPosition);
      doc.text(candidate.personalInfo?.email || "N/A", 280, yPosition);
      doc.text(candidate.status || "N/A", 450, yPosition);
      doc.text(
        candidate.applicationInfo?.appliedDate 
          ? format(new Date(candidate.applicationInfo.appliedDate), "MMM dd, yyyy")
          : "N/A",
        520,
        yPosition
      );

      yPosition += 20;
    });

    doc.end();

    console.log("PDF generation completed successfully");

    const frontendurl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        pdfPath: filePath,
        pdfUrl: frontendurl,
      },
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return { done: false, error: error.message };
  }
};

// Export candidates as Excel
export const exportCandidatesExcel = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[CandidateService] exportCandidatesExcel", { companyId });

    const candidates = await collections.candidates
      .find({
        companyId,
        isDeleted: { $ne: true },
      })
      .sort({ "applicationInfo.appliedDate": -1 })
      .toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Candidates");

    // Define columns
    worksheet.columns = [
      { header: "Application Number", key: "applicationNumber", width: 20 },
      { header: "Full Name", key: "fullName", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Applied Role", key: "appliedRole", width: 25 },
      { header: "Current Role", key: "currentRole", width: 25 },
      { header: "Current Company", key: "currentCompany", width: 25 },
      { header: "Experience (Years)", key: "experience", width: 15 },
      { header: "Current Salary", key: "currentSalary", width: 15 },
      { header: "Expected Salary", key: "expectedSalary", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Applied Date", key: "appliedDate", width: 15 },
      { header: "Recruiter", key: "recruiter", width: 20 },
      { header: "Source", key: "source", width: 15 },
      { header: "City", key: "city", width: 15 },
      { header: "Skills", key: "skills", width: 40 },
      { header: "Qualifications", key: "qualifications", width: 40 },
      { header: "Created Date", key: "createdAt", width: 15 },
    ];

    // Add data
    candidates.forEach((candidate) => {
      worksheet.addRow({
        applicationNumber: candidate.applicationNumber || "",
        fullName: candidate.fullName || "",
        email: candidate.personalInfo?.email || "",
        phone: candidate.personalInfo?.phone || "",
        appliedRole: candidate.applicationInfo?.appliedRole || "",
        currentRole: candidate.professionalInfo?.currentRole || "",
        currentCompany: candidate.professionalInfo?.currentCompany || "",
        experience: candidate.professionalInfo?.experienceYears || 0,
        currentSalary: candidate.professionalInfo?.currentSalary || 0,
        expectedSalary: candidate.professionalInfo?.expectedSalary || 0,
        status: candidate.status || "",
        appliedDate: candidate.applicationInfo?.appliedDate
          ? format(new Date(candidate.applicationInfo.appliedDate), "MMM dd, yyyy")
          : "",
        recruiter: candidate.applicationInfo?.recruiterName || "",
        source: candidate.applicationInfo?.source || "",
        city: candidate.personalInfo?.city || "",
        skills: candidate.professionalInfo?.skills?.join(", ") || "",
        qualifications: candidate.professionalInfo?.qualifications?.join(", ") || "",
        createdAt: candidate.createdAt
          ? format(new Date(candidate.createdAt), "MMM dd, yyyy")
          : "",
      });
    });

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    const fileName = `candidates_${companyId}_${Date.now()}.xlsx`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    console.log("Excel generation completed successfully");

    const frontendurl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        excelPath: filePath,
        excelUrl: frontendurl,
      },
    };
  } catch (error) {
    console.error("Error generating Excel:", error);
    return { done: false, error: error.message };
  }
};