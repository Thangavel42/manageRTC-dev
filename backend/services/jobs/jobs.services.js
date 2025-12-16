import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import PDFDocument from "pdfkit-table";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { format } from "date-fns";

// Create new job
export const createJob = async (companyId, jobData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] createJob", { companyId, jobData });

    // Validate required fields
    if (!jobData.title || !jobData.category || !jobData.type) {
      throw new Error("Missing required fields: title, category, type");
    }

    const newJob = {
      ...jobData,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: jobData.status || "Active",
      isDeleted: false,
      appliedCount: 0,
      numberOfPositions: jobData.numberOfPositions || 1,
      description: jobData.description || "",
      requirements: jobData.requirements || "",
      skills: jobData.skills || [],
      tags: jobData.tags || [],
      location: {
        country: jobData.country || "",
        state: jobData.state || "",
        city: jobData.city || ""
      },
      salaryRange: {
        min: jobData.minSalary || 0,
        max: jobData.maxSalary || 0,
        currency: jobData.salaryCurrency || "USD"
      }
    };

    const result = await collections.jobs.insertOne(newJob);
    console.log("[JobService] insertOne result", { result });

    if (result.insertedId) {
      const inserted = await collections.jobs.findOne({
        _id: result.insertedId
      });
      console.log("[JobService] inserted job", { inserted });
      return { done: true, data: inserted };
    } else {
      console.error("[JobService] Failed to insert job");
      return { done: false, error: "Failed to insert job" };
    }
  } catch (error) {
    console.error("[JobService] Error in createJob", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get all jobs with filters
export const getJobs = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] getJobs", { companyId, filters });

    const query = { companyId, isDeleted: { $ne: true } };

    // Apply filters
    if (filters.status && filters.status !== "All") {
      query.status = filters.status;
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Type filter
    if (filters.type) {
      query.type = filters.type;
    }

    // Location filters
    if (filters.country) {
      query["location.country"] = filters.country;
    }
    if (filters.state) {
      query["location.state"] = filters.state;
    }
    if (filters.city) {
      query["location.city"] = filters.city;
    }

    // Salary range filter
    if (filters.minSalary) {
      query["salaryRange.min"] = { $gte: parseFloat(filters.minSalary) };
    }
    if (filters.maxSalary) {
      query["salaryRange.max"] = { $lte: parseFloat(filters.maxSalary) };
    }

    // Search filter
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { skills: { $in: [new RegExp(filters.search, "i")] } },
        { tags: { $in: [new RegExp(filters.search, "i")] } }
      ];
    }

    // Date range filter
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }

    // Sort options
    let sort = { createdAt: -1 };
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "salary":
          sort = { "salaryRange.min": filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "positions":
          sort = { numberOfPositions: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "applications":
          sort = { appliedCount: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        case "title":
          sort = { title: filters.sortOrder === "asc" ? 1 : -1 };
          break;
        default:
          sort = { createdAt: filters.sortOrder === "asc" ? 1 : -1 };
      }
    }

    console.log("[JobService] Final query", { query, sort });
    const jobs = await collections.jobs.find(query).sort(sort).toArray();
    console.log("[JobService] found jobs", { count: jobs.length });

    // Ensure dates are properly converted to Date objects
    const processedJobs = jobs.map((job) => ({
      ...job,
      createdAt: job.createdAt ? new Date(job.createdAt) : null,
      updatedAt: job.updatedAt ? new Date(job.updatedAt) : null
    }));

    return { done: true, data: processedJobs };
  } catch (error) {
    console.error("[JobService] Error in getJobs", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get single job by ID
export const getJobById = async (companyId, jobId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] getJobById", { companyId, jobId });

    if (!ObjectId.isValid(jobId)) {
      return { done: false, error: "Invalid job ID format" };
    }     

    const job = await collections.jobs.findOne({
      _id: new ObjectId(jobId),
      companyId,
      isDeleted: { $ne: true }
    });

    if (!job) {
      return { done: false, error: "Job not found" };
    }

    // Ensure dates are properly converted
    const processedJob = {
      ...job,
      createdAt: job.createdAt ? new Date(job.createdAt) : null,
      updatedAt: job.updatedAt ? new Date(job.updatedAt) : null
    };

    return { done: true, data: processedJob };
  } catch (error) {
    console.error("[JobService] Error in getJobById", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Update job
export const updateJob = async (companyId, jobId, updateData) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] updateJob", {
      companyId,
      jobId,
      updateData
    });

    if (!ObjectId.isValid(jobId)) {
      return { done: false, error: "Invalid job ID format" };
    }

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    // Remove _id from update data to prevent conflicts
    delete updateFields._id;

    const result = await collections.jobs.updateOne(
      { _id: new ObjectId(jobId), companyId, isDeleted: { $ne: true } },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Job not found" };
    }

    if (result.modifiedCount === 0) {
      return { done: false, error: "No changes made to job" };
    }

    // Return updated job
    const updatedJob = await collections.jobs.findOne({
      _id: new ObjectId(jobId),
      companyId
    });

    const processedJob = {
      ...updatedJob,
      createdAt: updatedJob.createdAt
        ? new Date(updatedJob.createdAt)
        : null,
      updatedAt: updatedJob.updatedAt
        ? new Date(updatedJob.updatedAt)
        : null
    };

    return { done: true, data: processedJob };
  } catch (error) {
    console.error("[JobService] Error in updateJob", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Delete job (soft delete)
export const deleteJob = async (companyId, jobId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] deleteJob", { companyId, jobId });

    if (!ObjectId.isValid(jobId)) {
      return { done: false, error: "Invalid job ID format" };
    }

    const result = await collections.jobs.updateOne(
      { _id: new ObjectId(jobId), companyId, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Job not found" };
    }

    return { done: true, data: { _id: jobId, deleted: true } };
  } catch (error) {
    console.error("[JobService] Error in deleteJob", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Get job statistics
export const getJobStats = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] getJobStats", { companyId });

    const totalJobs = await collections.jobs.countDocuments({
      companyId,
      isDeleted: { $ne: true }
    });

    const activeJobs = await collections.jobs.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Active"
    });

    const inactiveJobs = await collections.jobs.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      status: "Inactive"
    });

    // New jobs in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newJobs = await collections.jobs.countDocuments({
      companyId,
      isDeleted: { $ne: true },
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Category stats
    const categoryStats = await collections.jobs.aggregate([
      {
        $match: {
          companyId,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    // Type stats
    const typeStats = await collections.jobs.aggregate([
      {
        $match: {
          companyId,
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const stats = {
      totalJobs,
      activeJobs,
      inactiveJobs,
      newJobs,
      byCategory: categoryStats,
      byType: typeStats
    };

    console.log("[JobService] Job stats", stats);
    return { done: true, data: stats };
  } catch (error) {
    console.error("[JobService] Error in getJobStats", {
      error: error.message
    });
    return { done: false, error: error.message };
  }
};

// Export jobs as PDF
export const exportJobsPDF = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] exportJobsPDF", { companyId });

    const jobs = await collections.jobs.find({
      companyId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    const doc = new PDFDocument();
    const fileName = `jobs_${companyId}_${Date.now()}.pdf`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    doc.pipe(fs.createWriteStream(filePath));

    // Add company header
    doc.fontSize(16).text("Jobs Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Generated on: ${format(new Date(), "PPP")}`, { align: "right" });
    doc.moveDown();
    doc.text(`Total Jobs: ${jobs.length}`, { align: "right" });
    doc.moveDown();
    doc.moveDown();

    // Add jobs
    jobs.forEach((job, index) => {
      // Start new page if not first job and close to bottom of page
      if (index > 0 && doc.y > 700) {
        doc.addPage();
      }

      doc.fontSize(14).text(`Job ${index + 1}: ${job.title}`);
      doc.fontSize(10);
      doc.text(`Category: ${job.category}`);
      doc.text(`Type: ${job.type}`);
      doc.text(`Status: ${job.status}`);
      doc.text(`Location: ${job.location.city}, ${job.location.state}, ${job.location.country}`);
      doc.text(`Salary Range: ${job.salaryRange.min} - ${job.salaryRange.max} ${job.salaryRange.currency}`);
      doc.text(`Number of Positions: ${job.numberOfPositions}`);
      doc.text(`Posted: ${format(new Date(job.createdAt), "PPP")}`);
      
      if (job.description) {
        doc.moveDown();
        doc.text("Description:", { underline: true });
        doc.text(job.description);
      }

      if (job.requirements) {
        doc.moveDown();
        doc.text("Requirements:", { underline: true });
        doc.text(job.requirements);
      }

      if (job.skills && job.skills.length > 0) {
        doc.moveDown();
        doc.text("Required Skills:", { underline: true });
        doc.text(job.skills.join(", "));
      }

      doc.moveDown();
      doc.moveDown();
    });

    doc.end();

    console.log("[JobService] PDF generation completed", { filePath });
    const frontendUrl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        pdfPath: filePath,
        pdfUrl: frontendUrl
      }
    };
  } catch (error) {
    console.error("[JobService] Error in exportJobsPDF", { error: error.message });
    return { done: false, error: error.message };
  }
};

// Export jobs as Excel
export const exportJobsExcel = async (companyId) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[JobService] exportJobsExcel", { companyId });

    const jobs = await collections.jobs.find({
      companyId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Jobs");

    // Define columns
    worksheet.columns = [
      { header: "Job Title", key: "title", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Type", key: "type", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Country", key: "country", width: 20 },
      { header: "State", key: "state", width: 20 },
      { header: "City", key: "city", width: 20 },
      { header: "Min Salary", key: "minSalary", width: 15 },
      { header: "Max Salary", key: "maxSalary", width: 15 },
      { header: "Currency", key: "currency", width: 10 },
      { header: "Positions", key: "positions", width: 10 },
      { header: "Applications", key: "applications", width: 15 },
      { header: "Skills", key: "skills", width: 40 },
      { header: "Posted Date", key: "postedDate", width: 20 },
      { header: "Last Updated", key: "updatedDate", width: 20 }
    ];

    // Add job data
    jobs.forEach(job => {
      worksheet.addRow({
        title: job.title,
        category: job.category,
        type: job.type,
        status: job.status,
        country: job.location.country,
        state: job.location.state,
        city: job.location.city,
        minSalary: job.salaryRange.min,
        maxSalary: job.salaryRange.max,
        currency: job.salaryRange.currency,
        positions: job.numberOfPositions,
        applications: job.appliedCount,
        skills: job.skills.join(", "),
        postedDate: format(new Date(job.createdAt), "PPP"),
        updatedDate: job.updatedAt ? format(new Date(job.updatedAt), "PPP") : ""
      });
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE9ECEF" }
    };

    // Add borders to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" }
        };
      });
    });

    // Save workbook
    const fileName = `jobs_${companyId}_${Date.now()}.xlsx`;
    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    console.log("[JobService] Excel generation completed", { filePath });
    const frontendUrl = process.env.FRONTEND_URL + `/temp/${fileName}`;

    return {
      done: true,
      data: {
        excelPath: filePath,
        excelUrl: frontendUrl,
        totalJobs: jobs.length
      }
    };
  } catch (error) {
    console.error("[JobService] Error in exportJobsExcel", { error: error.message });
    return { done: false, error: error.message };
  }
};
