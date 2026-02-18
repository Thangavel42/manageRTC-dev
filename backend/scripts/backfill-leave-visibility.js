import 'dotenv/config';
import { connectDB, getTenantCollections } from '../config/db.js';
import logger from '../utils/logger.js';

const COMPANY_ID = process.env.COMPANY_ID || process.argv[2];

if (!COMPANY_ID) {
  // eslint-disable-next-line no-console
  console.error('Usage: COMPANY_ID=<tenantDbName> node scripts/backfill-leave-visibility.js');
  process.exit(1);
}

const buildEmpKey = (emp) => {
  const departmentId = emp.departmentId || emp.department || emp.departmentName || null;
  return {
    departmentId,
  };
};

async function backfill() {
  await connectDB();
  const collections = getTenantCollections(COMPANY_ID);

  // Cache employees for department lookup and prepare employee backfill
  const employeeMap = new Map();
  const employeeBulk = [];

  const employeeCursor = collections.employees.find(
    { isDeleted: { $ne: true } },
    { projection: { employeeId: 1, clerkUserId: 1, departmentId: 1, department: 1, departmentName: 1 } }
  );

  for await (const emp of employeeCursor) {
    const meta = buildEmpKey(emp);
    if (emp.employeeId) {
      employeeMap.set(emp.employeeId, meta);
    }
    if (emp.clerkUserId) {
      employeeMap.set(emp.clerkUserId, meta);
    }

    if (!emp.departmentId && meta.departmentId) {
      employeeBulk.push({
        updateOne: {
          filter: { _id: emp._id },
          update: { $set: { departmentId: meta.departmentId } },
        },
      });
    }
  }

  if (employeeBulk.length) {
    const res = await collections.employees.bulkWrite(employeeBulk);
    logger.info('[backfill] employees updated', { matched: res.matchedCount, modified: res.modifiedCount });
  } else {
    logger.info('[backfill] no employee departmentId updates needed');
  }

  const leavesCursor = collections.leaves.find({
    $or: [
      { departmentId: { $exists: false } },
      { departmentId: null },
      { departmentId: '' },
      { companyId: { $exists: false } },
      { fromDate: { $exists: false } },
      { toDate: { $exists: false } },
    ],
  });

  const leaveBulk = [];
  for await (const leave of leavesCursor) {
    const updates = {};
    const empMeta = employeeMap.get(leave.employeeId);

    if (!leave.companyId) {
      updates.companyId = COMPANY_ID;
    }
    if ((!leave.departmentId || leave.departmentId === '') && empMeta?.departmentId) {
      updates.departmentId = empMeta.departmentId;
    }
    if (!leave.fromDate && leave.startDate) {
      updates.fromDate = leave.startDate;
    }
    if (!leave.toDate && leave.endDate) {
      updates.toDate = leave.endDate;
    }

    if (Object.keys(updates).length > 0) {
      leaveBulk.push({
        updateOne: {
          filter: { _id: leave._id },
          update: { $set: updates },
        },
      });
    }
  }

  if (leaveBulk.length) {
    const res = await collections.leaves.bulkWrite(leaveBulk);
    logger.info('[backfill] leaves updated', { matched: res.matchedCount, modified: res.modifiedCount });
  } else {
    logger.info('[backfill] no leave updates needed');
  }

  logger.info('[backfill] complete');
  process.exit(0);
}

backfill().catch((err) => {
  logger.error('[backfill] failed', { error: err.message });
  process.exit(1);
});
