/**
 * Diagnostic script to check employee leave balance data
 * Specific diagnostic for EMP-0256 404 error issue
 * Run: node backend/seed/diagnoseEmployeeBalance.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9'; // amasQIS.ai
const SEARCH_EMPLOYEE_ID = 'EMP-0256';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function diagnoseEmployeeBalance() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);
    const employeesCollection = db.collection('employees');

    // ============================================
    // 1. EXACT SEARCH FOR EMP-0256
    // ============================================
    logSection('1. EXACT SEARCH FOR EMPLOYEE: ' + SEARCH_EMPLOYEE_ID);

    const exactMatch = await employeesCollection.findOne({
      employeeId: SEARCH_EMPLOYEE_ID,
      isDeleted: { $ne: true }
    });

    if (exactMatch) {
      log('  ✅ Employee FOUND!', 'green');
      console.log('     Name:', exactMatch.firstName, exactMatch.lastName);
      console.log('     Employee ID:', exactMatch.employeeId);
      console.log('     _id:', exactMatch._id);
      console.log('     companyId:', exactMatch.companyId || 'NOT SET');
      console.log('     isDeleted:', exactMatch.isDeleted || 'false');
      console.log('     Full document:', JSON.stringify(exactMatch, null, 2));
    } else {
      log('  ❌ Employee NOT FOUND!', 'red');
      console.log('     Looking for employeeId:', SEARCH_EMPLOYEE_ID);
    }

    // ============================================
    // 2. CASE-INSENSITIVE SEARCH
    // ============================================
    logSection('2. CASE-INSENSITIVE SEARCH');

    const caseInsensitiveMatches = await employeesCollection.find({
      employeeId: { $regex: new RegExp(`^${SEARCH_EMPLOYEE_ID}$`, 'i') },
      isDeleted: { $ne: true }
    }).toArray();

    if (caseInsensitiveMatches.length > 0) {
      log(`  ✅ Found ${caseInsensitiveMatches.length} employee(s) with case-insensitive match:`, 'green');
      caseInsensitiveMatches.forEach(emp => {
        console.log('     -', emp.employeeId, ':', emp.firstName, emp.lastName);
      });
    } else {
      log('  ❌ No matches with case-insensitive search', 'yellow');
    }

    // ============================================
    // 2.5. BACKEND QUERY SIMULATION (WITH companyId)
    // ============================================
    logSection('2.5. BACKEND QUERY SIMULATION (WITH companyId)');

    const backendQueryResult = await employeesCollection.findOne({
      companyId: COMPANY_ID,
      employeeId: SEARCH_EMPLOYEE_ID,
      isDeleted: { $ne: true }
    });

    if (backendQueryResult) {
      log('  ✅ Employee FOUND with backend query!', 'green');
      console.log('     Query used: { companyId:', COMPANY_ID, ', employeeId:', SEARCH_EMPLOYEE_ID, ', isDeleted: { $ne: true } }');
    } else {
      log('  ❌ Employee NOT FOUND with backend query!', 'red');
      log('  THIS IS THE ROOT CAUSE!', 'red');
      console.log('     Query used: { companyId:', COMPANY_ID, ', employeeId:', SEARCH_EMPLOYEE_ID, ', isDeleted: { $ne: true } }');
      console.log('     The employee document might not have the companyId field set!');
    }

    // ============================================
    // 3. SEARCH FOR SIMILAR EMPLOYEE IDs
    // ============================================
    logSection('3. SIMILAR EMPLOYEE IDs (starts with EMP-02)');

    const similarEmployees = await employeesCollection.find({
      employeeId: { $regex: /^EMP-02/ },
      isDeleted: { $ne: true }
    }).limit(20).toArray();

    if (similarEmployees.length > 0) {
      log(`  ✅ Found ${similarEmployees.length} employee(s) starting with EMP-02:`, 'green');
      similarEmployees.forEach(emp => {
        console.log(`     - ${emp.employeeId}: ${emp.firstName} ${emp.lastName}`);
      });
    } else {
      log('  ❌ No employees starting with EMP-02', 'yellow');
    }

    // ============================================
    // 4. LIST ALL EMPLOYEE IDs
    // ============================================
    logSection('4. ALL EMPLOYEE IDs IN DATABASE');

    const allEmployees = await employeesCollection.find({
      isDeleted: { $ne: true }
    }).project({ employeeId: 1, firstName: 1, lastName: 1 }).toArray();

    log(`  Total employees: ${allEmployees.length}`, 'blue');
    console.log('\n  Employee ID list:');
    allEmployees.forEach(emp => {
      console.log(`     - ${emp.employeeId}: ${emp.firstName} ${emp.lastName}`);
    });

    // ============================================
    // 5. CHECK FOR SPECIFIC PATTERNS
    // ============================================
    logSection('5. CHECKING FOR COMMON PATTERNS');

    const patterns = ['EMP-256', 'EMP0256', 'EMP 0256', 'emp-0256'];
    for (const pattern of patterns) {
      const match = await employeesCollection.findOne({
        employeeId: pattern,
        isDeleted: { $ne: true }
      });
      if (match) {
        log(`  ✅ Found pattern "${pattern}": ${match.firstName} ${match.lastName}`, 'green');
      }
    }

    // ============================================
    // 6. CHECK LEAVE TYPES
    // ============================================
    logSection('6. CHECK LEAVE TYPES');

    const leaveTypes = await db.collection('leaveTypes').find({
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    log(`  Found ${leaveTypes.length} active leave types:`, 'blue');
    leaveTypes.forEach(lt => {
      console.log(`     - ${lt.code} (${lt.name}): ${lt._id}`);
    });

    // ============================================
    // 7. ROOT CAUSE ANALYSIS
    // ============================================
    logSection('7. ROOT CAUSE ANALYSIS');

    if (!exactMatch) {
      log('  ISSUE IDENTIFIED:', 'red');
      log('  Employee EMP-0256 does not exist in the company database.', 'red');
      console.log('\n  Possible reasons:');
      console.log('    1. Employee ID format is incorrect (maybe EMP-256 instead of EMP-0256)');
      console.log('    2. Employee has not been created in the system yet');
      console.log('    3. Employee was soft-deleted (isDeleted: true)');
      console.log('    4. Frontend is sending wrong employeeId format');

      console.log('\n  Next steps:');
      console.log('    1. Verify the correct employeeId from the list above');
      console.log('    2. Check if the employee exists in a different company database');
      console.log('    3. Check frontend code for employeeId format issues');
    } else {
      log('  Employee exists in database - issue may be elsewhere', 'green');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    log('\n✅ Diagnostic complete', 'green');
  }
}

diagnoseEmployeeBalance();
