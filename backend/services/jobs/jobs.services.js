import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import Job from "../../models/job.model.js";
import fs from "fs";
import { promises as fsp } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import crypto from "crypto";
import ExcelJS from "exceljs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get collections
const getCollections = () => {
  return getTenantCollections();
};

// 1. Get Jobs Statistics
const getJobsStats = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const stats = await collection.jobs.aggregate([
      { $match: { companyId: companyId, isActive: true } },
      {
        $group: {
          _id: null,
          totalJobs: { $sum: 1 },
          publishedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Published"] }, 1, 0] }
          },
          draftJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Draft"] }, 1, 0] }
          },
          closedJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Closed"] }, 1, 0] }
          },
          expiredJobs: {
            $sum: { $cond: [{ $eq: ["$status", "Expired"] }, 1, 0] }
          },
          totalApplicants: { $sum: "$applicantsCount" },
          totalViews: { $sum: "$viewsCount" }
        }
      }
    ]).toArray();

    const categoryStats = await collection.jobs.aggregate([
      { $match: { companyId: companyId, isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const recentJobs = await collection.jobs.find(
      { companyId: companyId, isActive: true },
      {
        sort: { postedDate: -1 },
        limit: 5,
        projection: {
          jobId: 1,
          title: 1,
          category: 1,
          status: 1,
          postedDate: 1,
          applicantsCount: 1
        }
      }
    ).toArray();

    return {
      done: true,
      data: {
        stats: stats[0] || {
          totalJobs: 0,
          publishedJobs: 0,
          draftJobs: 0,
          closedJobs: 0,
          expiredJobs: 0,
          totalApplicants: 0,
          totalViews: 0
        },
        categoryStats,
        recentJobs
      }
    };
  } catch (error) {
    console.error("Error getting jobs stats:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 2. Get Jobs List with filters and pagination
const getJobsList = async (filters = {}) => {
  try {
    
    const {
      companyId,
      page = 1,
      limit = 10,
      sortBy = 'postedDate',
      sortOrder = 'desc',
      search = '',
      status = '',
      category = '',
      jobType = '',
      location = '',
      dateRange = null
    } = filters;

    const collection = getTenantCollections(companyId);

    // Build match criteria
    const matchCriteria = { companyId: companyId, isActive: true };

    if (search) {
      matchCriteria.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { jobId: { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } },
        { 'location.country': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      matchCriteria.status = status;
    }

    if (category) {
      matchCriteria.category = category;
    }

    if (jobType) {
      matchCriteria.jobType = jobType;
    }

    if (location) {
      matchCriteria.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } },
        { 'location.country': { $regex: location, $options: 'i' } }
      ];
    }

    if (dateRange && dateRange.start && dateRange.end) {
      matchCriteria.postedDate = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    // Get total count
    const totalCount = await collection.jobs.countDocuments(matchCriteria);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    // Build sort criteria
    const sortCriteria = {};
    sortCriteria[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get jobs with pagination
    const jobs = await collection.jobs.find(matchCriteria, {
      sort: sortCriteria,
      skip: skip,
      limit: parseInt(limit)
    }).toArray();

    return {
      done: true,
      data: {
        jobs,
        pagination: {
          totalCount,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error("Error getting jobs list:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get specific job details
const getJobDetails = async (jobId, companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const job = await collection.jobs.findOne({
      jobId: jobId,
      companyId: companyId,
      isActive: true
    });

    if (!job) {
      return { done: false, message: "Job not found", data: null };
    }

    // Increment view count
    await collection.jobs.updateOne(
      { jobId: jobId, companyId: companyId },
      { $inc: { viewsCount: 1 } }
    );

    return { done: true, data: job };
  } catch (error) {
    console.error("Error getting job details:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 4. Create a new job
const createJob = async (jobData) => {
  try {
    const { companyId } = jobData;
    const collection = getTenantCollections(companyId);
    
    // Basic validation
    const required = [
      "title", "description", "category", "jobType", "jobLevel", 
      "experience", "qualification", "minSalary", "maxSalary", 
      "expiredDate", "location", "createdBy", "companyId"
    ];
    
    for (const field of required) {
      if (!jobData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate salary range
    if (jobData.minSalary >= jobData.maxSalary) {
      throw new Error("Minimum salary must be less than maximum salary");
    }

    // Validate expired date
    if (new Date(jobData.expiredDate) <= new Date()) {
      throw new Error("Expired date must be in the future");
    }

    const newJob = {
      ...jobData,
      jobId: `JOB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
      postedDate: new Date(),
      applicantsCount: 0,
      viewsCount: 0,
      status: jobData.status || 'Draft',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // If frontend sent a data URL image, store a small thumbnail path or inline base64 (optional)
    // For now, persist the data URL as provided (if small). In production, move to object storage.
    if (newJob.image && typeof newJob.image === 'string') {
        // keep imageName and imageMime for potential later processing
        // Do not log image content here
    }

    const result = await collection.jobs.insertOne(newJob);
    
    if (result.insertedId) {
      return { done: true, message: "Job created successfully", data: newJob };
    } else {
      throw new Error("Failed to create job");
    }
  } catch (error) {
    console.error("Error creating job:", error);
    return { done: false, message: error.message };
  }
};

// 5. Update a job
const updateJob = async (jobId, jobData, companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Check if job exists
    const existingJob = await collection.jobs.findOne({
      jobId: jobId,
      companyId: companyId,
      isActive: true
    });

    if (!existingJob) {
      return { done: false, message: "Job not found" };
    }

    // Validate salary range if provided
    if (jobData.minSalary && jobData.maxSalary) {
      if (jobData.minSalary >= jobData.maxSalary) {
        throw new Error("Minimum salary must be less than maximum salary");
      }
    }

    // Validate expired date if provided
    if (jobData.expiredDate) {
      if (new Date(jobData.expiredDate) <= new Date()) {
        throw new Error("Expired date must be in the future");
      }
    }

    const updateData = {
      ...jobData,
      updatedAt: new Date()
    };

    const result = await collection.jobs.updateOne(
      { jobId: jobId, companyId: companyId },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      const updatedJob = await collection.jobs.findOne({
        jobId: jobId,
        companyId: companyId
      });
      return { done: true, message: "Job updated successfully", data: updatedJob };
    } else {
      return { done: false, message: "No changes made to the job" };
    }
  } catch (error) {
    console.error("Error updating job:", error);
    return { done: false, message: error.message };
  }
};

// 6. Delete a job (soft delete)
const deleteJob = async (jobId, companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const result = await collection.jobs.updateOne(
      { jobId: jobId, companyId: companyId },
      { 
        $set: { 
          isActive: false,
          status: 'Cancelled',
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      return { done: true, message: "Job deleted successfully" };
    } else {
      return { done: false, message: "Job not found or already deleted" };
    }
  } catch (error) {
    console.error("Error deleting job:", error);
    return { done: false, message: error.message };
  }
};

// 7. Bulk delete jobs
const bulkDeleteJobs = async (jobIds, companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const result = await collection.jobs.updateMany(
      { 
        jobId: { $in: jobIds },
        companyId: companyId 
      },
      { 
        $set: { 
          isActive: false,
          status: 'Cancelled',
          updatedAt: new Date()
        }
      }
    );

    return { 
      done: true, 
      message: `${result.modifiedCount} jobs deleted successfully`,
      deletedCount: result.modifiedCount
    };
  } catch (error) {
    console.error("Error bulk deleting jobs:", error);
    return { done: false, message: error.message };
  }
};

// 8. Update job status
const updateJobStatus = async (jobId, status, companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const validStatuses = ['Draft', 'Published', 'Closed', 'Expired', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    const updateData = {
      status: status,
      updatedAt: new Date()
    };

    if (status === 'Closed' || status === 'Cancelled') {
      updateData.closedDate = new Date();
    }

    const result = await collection.jobs.updateOne(
      { jobId: jobId, companyId: companyId },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      return { done: true, message: `Job status updated to ${status}` };
    } else {
      return { done: false, message: "Job not found" };
    }
  } catch (error) {
    console.error("Error updating job status:", error);
    return { done: false, message: error.message };
  }
};

// 9. Get job categories
const getJobCategories = async () => {
  try {
    const categories = [
      'Software', 'Hardware', 'Networking', 'Design', 
      'Marketing', 'Sales', 'HR', 'Finance', 'Operations'
    ];
    
    return { done: true, data: categories };
  } catch (error) {
    console.error("Error getting job categories:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 10. Get job types
const getJobTypes = async () => {
  try {
    const jobTypes = [
      'Full Time', 'Part Time', 'Contract', 'Internship', 'Freelance'
    ];
    
    return { done: true, data: jobTypes };
  } catch (error) {
    console.error("Error getting job types:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 11. Export jobs as PDF 
const exportJobsPDF = async (companyId, userId, filters = {}) => {
  let filePath = null;
  try {
    console.log("[JobExport] Starting PDF export for companyId:", companyId, "userId:", userId);
    
    const collections = getTenantCollections(companyId);
    const jobsCollection = collections.jobs;
    
    // Build secure query with company isolation
    let query = {
      companyId: companyId,
      isActive: true
    };
    
    // Apply filters
    if (filters.status && filters.status !== '') {
      query.status = filters.status;
    }
    
    if (filters.category && filters.category !== '') {
      query.category = filters.category;
    }
    
    if (filters.jobType && filters.jobType !== '') {
      query.jobType = filters.jobType;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { 'location.city': { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Fetch jobs data
    const jobs = await jobsCollection
      .find(query)
      .sort({ postedDate: -1 })
      .toArray();
    
    console.log("[JobExport] Found jobs for PDF export:", jobs.length);
    
    if (jobs.length === 0) {
      return { 
        done: false, 
        message: "No jobs found matching the selected criteria" 
      };
    }
    
    // Generate secure filename
    const sanitizedCompanyId = companyId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const fileName = `jobs_${sanitizedCompanyId}_${sanitizedUserId}_${timestamp}_${randomSuffix}.pdf`;
    
    // Create secure file path
    const tempDir = path.join(process.cwd(), 'temp', 'exports');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { mode: 0o700, recursive: true });
    }
    
    filePath = path.join(tempDir, fileName);
    
    // Create PDF document
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);
    
    // Add content to PDF
    doc.fontSize(20).text('Jobs Report', 50, 50);
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 50, 80);
    doc.text(`Company: ${sanitizedCompanyId}`, 50, 100);
    doc.text(`Total Jobs: ${jobs.length}`, 50, 120);
    
    let yPosition = 150;
    
    // Table header
    doc.fontSize(10).text("Job Title", 50, yPosition);
    doc.text("Category", 200, yPosition);
    doc.text("Type", 300, yPosition);
    doc.text("Location", 350, yPosition);
    doc.text("Salary", 450, yPosition);
    doc.text("Status", 520, yPosition);
    
    yPosition += 20;
    
    // Draw line under header
    doc.moveTo(50, yPosition).lineTo(580, yPosition).stroke();
    yPosition += 10;
    
    // Job data
    jobs.forEach((job, index) => {
      if (yPosition > 750) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.text(job.title || "N/A", 50, yPosition, { width: 140 });
      doc.text(job.category || "N/A", 200, yPosition, { width: 90 });
      doc.text(job.jobType || "N/A", 300, yPosition, { width: 40 });
      doc.text(`${job.location?.city || 'N/A'}, ${job.location?.country || 'N/A'}`, 350, yPosition, { width: 90 });
      
      const salaryRange = job.minSalary && job.maxSalary 
        ? `${job.minSalary} - ${job.maxSalary} ${job.currency || 'USD'}`
        : 'N/A';
      doc.text(salaryRange, 450, yPosition, { width: 60 });
      
      doc.text(job.status || "N/A", 520, yPosition, { width: 50 });
      
      yPosition += 20;
    });
    
    doc.end();
    
    // Wait for the write stream to finish
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
    
    // Generate proper download URL
    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/temp/exports/${fileName}`;
    
    // Schedule cleanup after 1 hour
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("[JobExport] Cleaned up PDF file:", fileName);
        }
      } catch (cleanupError) {
        console.error("[JobExport] Error cleaning up PDF file:", cleanupError);
      }
    }, 60 * 60 * 1000);
    
    console.log("[JobExport] PDF generation completed successfully");
    
    return {
      done: true,
      data: {
        downloadUrl: frontendUrl,
        fileName: fileName,
        filePath: filePath,
        recordCount: jobs.length,
        message: `PDF exported successfully with ${jobs.length} jobs`
      }
    };
    
  } catch (error) {
    console.error("[JobExport] Error in exportJobsPDF:", error);
    // Clean up file if it was created
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("[JobExport] Error cleaning up failed PDF file:", cleanupError);
      }
    }
    return { 
      done: false, 
      message: "Failed to export jobs as PDF: " + error.message 
    };
  }
};

// 12. Export jobs as Excel 
const exportJobsExcel = async (companyId, userId, filters = {}) => {
  let filePath = null;
  try {
    console.log("[JobExport] Starting Excel export for companyId:", companyId, "userId:", userId);
    
    const collections = getTenantCollections(companyId);
    const jobsCollection = collections.jobs;
    
    // Build secure query (same as PDF)
    let query = {
      companyId: companyId,
      isActive: true
    };
    
    // Apply filters
    if (filters.status && filters.status !== '') {
      query.status = filters.status;
    }
    
    if (filters.category && filters.category !== '') {
      query.category = filters.category;
    }
    
    if (filters.jobType && filters.jobType !== '') {
      query.jobType = filters.jobType;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { 'location.city': { $regex: filters.search, $options: 'i' } }
      ];
    }

    // Fetch jobs data
    const jobs = await jobsCollection
      .find(query)
      .sort({ postedDate: -1 })
      .toArray();
    
    console.log("[JobExport] Found jobs for Excel export:", jobs.length);
    
    if (jobs.length === 0) {
      return { 
        done: false, 
        message: "No jobs found matching the selected criteria" 
      };
    }
    
    // Generate secure filename
    const sanitizedCompanyId = companyId.replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const fileName = `jobs_${sanitizedCompanyId}_${sanitizedUserId}_${timestamp}_${randomSuffix}.xlsx`;
    
    // Create secure file path
    const tempDir = path.join(process.cwd(), 'temp', 'exports');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { mode: 0o700, recursive: true });
    }
    
    filePath = path.join(tempDir, fileName);
    
    // Generate Excel using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Jobs");
    
    // Define columns
    worksheet.columns = [
      { header: "Job ID", key: "jobId", width: 15 },
      { header: "Title", key: "title", width: 30 },
      { header: "Category", key: "category", width: 15 },
      { header: "Type", key: "jobType", width: 12 },
      { header: "Level", key: "jobLevel", width: 15 },
      { header: "Experience", key: "experience", width: 15 },
      { header: "Location", key: "location", width: 25 },
      { header: "Min Salary", key: "minSalary", width: 12 },
      { header: "Max Salary", key: "maxSalary", width: 12 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Posted Date", key: "postedDate", width: 15 },
      { header: "Applicants", key: "applicantsCount", width: 12 }
    ];
    
    // Add data
    jobs.forEach((job) => {
      worksheet.addRow({
        jobId: job.jobId || "",
        title: job.title || "",
        category: job.category || "",
        jobType: job.jobType || "",
        jobLevel: job.jobLevel || "",
        experience: job.experience || "",
        location: `${job.location?.city || ''}, ${job.location?.country || ''}`,
        minSalary: job.minSalary || 0,
        maxSalary: job.maxSalary || 0,
        currency: job.currency || "USD",
        status: job.status || "",
        postedDate: job.postedDate ? new Date(job.postedDate).toLocaleDateString() : "",
        applicantsCount: job.applicantsCount || 0
      });
    });
    
    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" }
    };
    
    await workbook.xlsx.writeFile(filePath);
    
    // Generate proper download URL
    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/temp/exports/${fileName}`;
    
    // Schedule cleanup after 1 hour
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("[JobExport] Cleaned up Excel file:", fileName);
        }
      } catch (cleanupError) {
        console.error("[JobExport] Error cleaning up Excel file:", cleanupError);
      }
    }, 60 * 60 * 1000);
    
    console.log("[JobExport] Excel generation completed successfully");
    
    return {
      done: true,
      data: {
        downloadUrl: frontendUrl,
        fileName: fileName,
        filePath: filePath,
        recordCount: jobs.length,
        message: `Excel exported successfully with ${jobs.length} jobs`
      }
    };
    
  } catch (error) {
    console.error("[JobExport] Error in exportJobsExcel:", error);
    // Clean up file if it was created
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error("[JobExport] Error cleaning up failed Excel file:", cleanupError);
      }
    }
    return { 
      done: false, 
      message: "Failed to export jobs as Excel: " + error.message 
    };
  }
};

// File cleanup service (run this periodically)
const cleanupExportFiles = async (maxAgeHours = 24) => {
  try {
    const exportsDir = path.join(process.cwd(), "temp", "exports");
    if (!fs.existsSync(exportsDir)) {
      return { cleanedCount: 0 };
    }
    
    const files = fs.readdirSync(exportsDir);
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    let cleanedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > maxAge) {
        fs.unlinkSync(filePath);
        cleanedCount++;
        console.log(`[Cleanup] Removed old export file: ${file}`);
      }
    }
    
    console.log(`[Cleanup] Cleaned up ${cleanedCount} old export files`);
    return { cleanedCount };
  } catch (error) {
    console.error("[Cleanup] Error cleaning export files:", error);
    return { error: error.message };
  }
};

// Run cleanup every 24 hours
setInterval(() => {
  cleanupExportFiles().catch(error => {
    console.error("Scheduled cleanup failed:", error);
  });
}, 24 * 60 * 60 * 1000);

export {
  getJobsStats,
  getJobsList,
  getJobDetails,
  createJob,
  updateJob,
  deleteJob,
  bulkDeleteJobs,
  updateJobStatus,
  getJobCategories,
  getJobTypes,
  exportJobsPDF,
  exportJobsExcel
};

