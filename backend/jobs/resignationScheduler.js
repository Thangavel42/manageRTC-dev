import cron from "node-cron";
import { getTenantCollections } from "../config/db.js";
import { processDueResignations } from "../services/hr/resignation.services.js";

let schedulerRunning = false;

/**
 * Start the resignation scheduler
 * Runs daily at 00:00 UTC
 */
export async function startResignationScheduler() {
  if (schedulerRunning) {
    console.log("[ResignationScheduler] Scheduler already running");
    return;
  }

  const schedule = cron.schedule("0 0 * * *", async () => {
    console.log("[ResignationScheduler] Running daily resignation check at", new Date().toISOString());
    await processAllCompanyResignations();
  });

  schedulerRunning = true;
  console.log("[ResignationScheduler] Started successfully. Will run daily at midnight.");

  return schedule;
}

export function stopResignationScheduler(schedule) {
  if (schedule) {
    schedule.stop();
    schedulerRunning = false;
    console.log("[ResignationScheduler] Stopped");
  }
}

async function processAllCompanyResignations() {
  try {
    const collections = await getTenantCollections("system");
    const companies = await collections.companies.find({ isActive: true }).toArray();

    console.log(`[ResignationScheduler] Found ${companies.length} active companies`);

    let totalProcessed = 0;
    let totalFailed = 0;

    for (const company of companies) {
      try {
        const result = await processDueResignations(company._id.toString());
        totalProcessed += result.processed || 0;
      } catch (error) {
        totalFailed += 1;
        console.error(`[ResignationScheduler] Error processing resignations for company ${company._id}:`, error);
      }
    }

    console.log(`[ResignationScheduler] Completed: ${totalProcessed} processed, ${totalFailed} failed`);
  } catch (error) {
    console.error("[ResignationScheduler] Error in processAllCompanyResignations:", error);
  }
}

export async function manualTriggerResignation(companyId) {
  console.log(`[ResignationScheduler] Manual trigger for company ${companyId}`);
  return await processDueResignations(companyId);
}
