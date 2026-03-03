/**
 * Employee Fields Verification Test
 *
 * This script tests:
 * 1. Employee Creation - all fields stored correctly in DB
 * 2. Employee Retrieval - all fields fetched correctly
 * 3. Employee Update - all fields updated correctly
 * 4. Edit Prefill - data correctly populated in edit form
 *
 * Run: node backend/seed/testEmployeeFields.js
 */

import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { client, getTenantCollections } from '../config/db.js';

// Test company ID (will auto-detect if needed)
let TEST_COMPANY_ID = '6982468548550225cc5585a9';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? 'green' : 'red';
  log(`  ${status} - ${testName}`, color);
  if (details) {
    log(`      ${details}`, 'yellow');
  }
}

// Auto-detect valid company, department, and designation IDs
async function getValidTestIds() {
  const { connectDB, getsuperadminCollections } = await import('../config/db.js');

  try {
    await connectDB();
    log('Detecting valid company and test IDs...', 'blue');

    // Get superadmin collections
    const { companiesCollection } = getsuperadminCollections();

    // Find a valid company
    const company = await companiesCollection.findOne({});

    if (!company) {
      log('No company found!', 'red');
      return null;
    }

    TEST_COMPANY_ID = company._id.toString();
    log(`✓ Using Company: ${company.name} (${TEST_COMPANY_ID})`, 'green');

    // Get collections for this company
    const collections = getTenantCollections(TEST_COMPANY_ID);

    // Find a valid department
    const department = await collections.departments.findOne({});
    const validDepartmentId = department?._id?.toString() || null;

    // Find a valid designation
    const designation = await collections.designations.findOne({});
    const validDesignationId = designation?._id?.toString() || null;

    log(`✓ Department ID: ${validDepartmentId || 'None found'}`, validDepartmentId ? 'green' : 'yellow');
    log(`✓ Designation ID: ${validDesignationId || 'None found'}`, validDesignationId ? 'green' : 'yellow');

    return {
      companyId: TEST_COMPANY_ID,
      departmentId: validDepartmentId,
      designationId: validDesignationId
    };

  } catch (error) {
    log(`Error detecting IDs: ${error.message}`, 'red');
    console.error(error);
    return null;
  }
}

// Test employee data with ALL fields
const getTestEmployeeData = (suffix = 'TEST', departmentId = null, designationId = null) => ({
  // Basic Information
  firstName: `Test${suffix}`,
  lastName: `Employee${suffix}`,
  email: `test${suffix.toLowerCase()}@example.com`,
  phone: '9876543210',
  phoneCode: '+91',
  dateOfBirth: '15-08-1990',
  gender: 'Male',

  // Nationality (should be moved to personal.nationality)
  nationality: 'Indian',

  // Address
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'India',
    postalCode: '123456'
  },

  // Employment Details
  employeeCode: `EMP${suffix}`,
  departmentId: departmentId || null, // Will be set dynamically
  designationId: designationId || null, // Will be set dynamically
  employmentType: 'Full-time',
  employmentStatus: 'Active',
  dateOfJoining: '01-01-2024',

  // Account
  account: {
    role: 'Employee'
  },

  // Personal Info (passport, religion, maritalStatus)
  passport: {
    number: 'P1234567',
    expiryDate: '15-08-2030',
    country: 'India'
  },
  religion: 'Hindu',
  maritalStatus: 'Single',
  noOfChildren: 0,

  // Additional fields
  about: 'Test employee for field verification',
  companyName: 'Test Company',
  reportingTo: null,
  shiftId: '',
  batchId: '',
  status: 'Active'
});

const expectedDbStructure = {
  // Should be at ROOT level
  rootLevel: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'phoneCode',
    'dateOfBirth',
    'gender',
    'address',
    'employeeCode',
    'departmentId',
    'designationId',
    'employmentType',
    'employmentStatus',
    'dateOfJoining',
    'account.role',
    'about',
    'status'
  ],

  // Should be in PERSONAL object
  personalLevel: [
    'personal.nationality',
    'personal.passport.number',
    'personal.passport.expiryDate',
    'personal.passport.country',
    'personal.religion',
    'personal.maritalStatus',
    'personal.noOfChildren'
  ],

  // Should be FLATTENED to root in API response
  flattenedInApi: [
    'nationality',
    'passport',
    'religion',
    'maritalStatus',
    'employmentOfSpouse',
    'noOfChildren'
  ]
};

async function testEmployeeCreation(departmentId, designationId) {
  logSection('TEST 1: EMPLOYEE CREATION');

  const collections = getTenantCollections(TEST_COMPANY_ID);
  const testData = getTestEmployeeData('CREATE', departmentId, designationId);

  try {
    // Insert test employee
    const result = await collections.employees.insertOne({
      ...testData,
      clerkUserId: `test_user_create_${Date.now()}`,
      companyId: TEST_COMPANY_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      isDeleted: false
    });

    if (!result.insertedId) {
      logTest('Employee Creation', false, 'Failed to insert employee');
      return null;
    }

    logTest('Employee Creation', true, `Inserted ID: ${result.insertedId}`);

    // Fetch the employee from DB to verify structure
    const employee = await collections.employees.findOne({
      _id: result.insertedId
    });

    if (!employee) {
      logTest('Fetch Created Employee', false, 'Employee not found after creation');
      return null;
    }

    let allPassed = true;
    const failures = [];

    // Test 1.1: Verify root level fields
    log('\n  Verifying Root Level Fields:');
    for (const field of expectedDbStructure.rootLevel) {
      const fieldPath = field.split('.');
      const exists = fieldPath.reduce((obj, key) => obj?.[key], employee) !== undefined;

      if (field.includes('account.role')) {
        const hasAccount = employee.account?.role !== undefined;
        logTest(`  Field: ${field}`, hasAccount, hasAccount ? `Value: ${employee.account?.role}` : 'Missing');
        if (!hasAccount) allPassed = false;
      } else {
        logTest(`  Field: ${field}`, exists, exists ? `Value: ${JSON.stringify(fieldPath.reduce((obj, key) => obj?.[key], employee))}` : 'Missing');
        if (!exists) allPassed = false;
      }
    }

    // Test 1.2: Verify personal object fields
    log('\n  Verifying Personal Object Fields:');
    for (const field of expectedDbStructure.personalLevel) {
      const fieldPath = field.split('.');
      const value = fieldPath.reduce((obj, key) => obj?.[key], employee);
      const exists = value !== undefined && value !== null && value !== '';

      logTest(`  Field: ${field}`, exists, exists ? `Value: ${JSON.stringify(value)}` : 'Missing or empty');
      if (!exists) {
        allPassed = false;
        failures.push(field);
      }
    }

    // Test 1.3: Verify nationality was moved from root to personal
    log('\n  Verifying Nationality Move:');
    const hasRootNationality = employee.nationality !== undefined;
    const hasPersonalNationality = employee.personal?.nationality !== undefined;

    logTest('  Root nationality removed', !hasRootNationality, hasRootNationality ? 'ERROR: nationality still at root!' : '✓ Correctly removed from root');
    logTest('  Personal.nationality exists', hasPersonalNationality, hasPersonalNationality ? `✓ Value: ${employee.personal?.nationality}` : 'ERROR: Not in personal object!');

    if (hasRootNationality || !hasPersonalNationality) {
      allPassed = false;
      failures.push('nationality placement');
    }

    // Test 1.4: Verify account object has password (if generated)
    log('\n  Verifying Account Object:');
    const hasAccount = employee.account !== undefined;
    const hasAccountRole = employee.account?.role !== undefined;
    const hasAccountPassword = employee.account?.password !== undefined;

    logTest('  Account object exists', hasAccount);
    logTest('  Account.role exists', hasAccountRole, hasAccountRole ? `Value: ${employee.account?.role}` : 'Missing');
    logTest('  Account.password exists', hasAccountPassword, hasAccountPassword ? '✓ Password stored' : '⚠️  No password (may be generated separately)');

    // Test 1.5: Verify no unexpected fields at root
    log('\n  Checking for Unexpected Root Fields:');
    const unexpectedRootFields = [];
    if (employee.nationality !== undefined) unexpectedRootFields.push('nationality');
    if (employee.religion !== undefined) unexpectedRootFields.push('religion');
    if (employee.maritalStatus !== undefined) unexpectedRootFields.push('maritalStatus');

    if (unexpectedRootFields.length > 0) {
      logTest('  Unexpected root fields', false, `Found: ${unexpectedRootFields.join(', ')}`);
      allPassed = false;
    } else {
      logTest('  Unexpected root fields', true, 'None found - all correctly placed');
    }

    logTest('OVERALL: Employee Creation Structure', allPassed, allPassed ? '✓ All fields correctly stored' : `✗ Failures: ${failures.join(', ')}`);

    return { employee, allPassed };

  } catch (error) {
    logTest('Employee Creation', false, `Error: ${error.message}`);
    return null;
  }
}

async function testEmployeeRetrieval(employeeId) {
  logSection('TEST 2: EMPLOYEE RETRIEVAL (API RESPONSE)');

  const collections = getTenantCollections(TEST_COMPANY_ID);

  try {
    // Simulate the aggregation pipeline used in getEmployeeById
    const pipeline = [
      { $match: { _id: new ObjectId(employeeId) } },
      {
        $addFields: {
          departmentObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
              then: { $toObjectId: '$departmentId' },
              else: null
            }
          },
          designationObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$designationId', null] }, { $ne: ['$designationId', ''] }] },
              then: { $toObjectId: '$designationId' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentObjId',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'designations',
          localField: 'designationObjId',
          foreignField: '_id',
          as: 'designationInfo'
        }
      },
      {
        $addFields: {
          department: { $arrayElemAt: ['$departmentInfo', 0] },
          designation: { $arrayElemAt: ['$designationInfo', 0] },
          // Flatten personal info to root level for frontend compatibility
          passport: '$personal.passport',
          nationality: '$personal.nationality',
          religion: '$personal.religion',
          maritalStatus: '$personal.maritalStatus',
          employmentOfSpouse: '$personal.employmentOfSpouse',
          noOfChildren: '$personal.noOfChildren'
        }
      },
      {
        $project: {
          departmentObjId: 0,
          designationObjId: 0,
          departmentInfo: 0,
          designationInfo: 0
        }
      }
    ];

    const results = await collections.employees.aggregate(pipeline).toArray();
    const employee = results[0];

    if (!employee) {
      logTest('Employee Retrieval', false, 'Employee not found');
      return;
    }

    logTest('Employee Retrieval', true, `Employee fetched via aggregation`);

    // Test 2.1: Verify flattened fields at root level
    log('\n  Verifying Flattened Fields in API Response:');
    let allPassed = true;

    for (const field of expectedDbStructure.flattenedInApi) {
      const exists = employee[field] !== undefined;
      const isEmpty = employee[field] === '' || employee[field] === null;

      logTest(`  Field: ${field}`, exists && !isEmpty, exists ? (isEmpty ? 'Empty' : `Value: ${JSON.stringify(employee[field])}`) : 'Missing');

      if (!exists || isEmpty) {
        allPassed = false;
      }
    }

    // Test 2.2: Verify root level fields from DB are preserved
    log('\n  Verifying Preserved Root Fields:');
    const rootFieldsToCheck = ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth'];

    for (const field of rootFieldsToCheck) {
      const exists = employee[field] !== undefined;
      logTest(`  Field: ${field}`, exists, exists ? `Value: ${JSON.stringify(employee[field])}` : 'Missing');
      if (!exists) allPassed = false;
    }

    // Test 2.3: Verify personal object is NOT in the response (or is minimal)
    log('\n  Verifying Personal Object Handling:');
    const hasPersonalData = employee.personal && Object.keys(employee.personal).length > 0;

    if (hasPersonalData) {
      // If personal exists, it should only have fields that weren't flattened
      const personalKeys = Object.keys(employee.personal);
      const unexpectedKeys = personalKeys.filter(k => !['birthday', 'address', 'gender'].includes(k));

      if (unexpectedKeys.length > 0) {
        logTest('  Personal object cleanup', false, `Unexpected keys: ${unexpectedKeys.join(', ')}`);
        allPassed = false;
      } else {
        logTest('  Personal object cleanup', true, `Only canonical fields remain: ${personalKeys.join(', ') || '(empty)'}`);
      }
    } else {
      logTest('  Personal object cleanup', true, 'Personal object empty or removed (expected)');
    }

    logTest('OVERALL: Employee Retrieval API Response', allPassed);

    return { employee, allPassed };

  } catch (error) {
    logTest('Employee Retrieval', false, `Error: ${error.message}`);
    return null;
  }
}

async function testEmployeeUpdate(employeeId) {
  logSection('TEST 3: EMPLOYEE UPDATE');

  const collections = getTenantCollections(TEST_COMPANY_ID);

  try {
    // Update with new values
    const updateData = {
      firstName: 'UpdatedName',
      nationality: 'American', // Should be moved to personal.nationality
      religion: 'Christian',
      maritalStatus: 'Married',
      phone: '9999999999'
    };

    const result = await collections.employees.updateOne(
      { _id: new ObjectId(employeeId) },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      logTest('Employee Update', false, 'Employee not found');
      return;
    }

    logTest('Employee Update', true, 'Update executed');

    // Fetch updated employee
    const updated = await collections.employees.findOne({ _id: new ObjectId(employeeId) });

    if (!updated) {
      logTest('Fetch Updated Employee', false, 'Employee not found after update');
      return;
    }

    logTest('Fetch Updated Employee', true);

    // Verify updates
    log('\n  Verifying Updates:');
    let allPassed = true;

    // Test 3.1: Verify root level updates
    const rootUpdates = [
      { field: 'firstName', expected: 'UpdatedName', actual: updated.firstName },
      { field: 'phone', expected: '9999999999', actual: updated.phone }
    ];

    for (const { field, expected, actual } of rootUpdates) {
      const passed = actual === expected;
      logTest(`  ${field} updated`, passed, passed ? `✓ ${actual}` : `✗ Expected: ${expected}, Got: ${actual}`);
      if (!passed) allPassed = false;
    }

    // Test 3.2: Verify personal object updates
    log('\n  Verifying Personal Object Updates:');
    const personalUpdates = [
      { field: 'personal.nationality', expected: 'American', actual: updated.personal?.nationality },
      { field: 'personal.religion', expected: 'Christian', actual: updated.personal?.religion },
      { field: 'personal.maritalStatus', expected: 'Married', actual: updated.personal?.maritalStatus }
    ];

    for (const { field, expected, actual } of personalUpdates) {
      const passed = actual === expected;
      logTest(`  ${field} updated`, passed, passed ? `✓ ${actual}` : `✗ Expected: ${expected}, Got: ${actual}`);
      if (!passed) allPassed = false;
    }

    // Test 3.3: Verify nationality was moved from root
    log('\n  Verifying Nationality Move After Update:');
    const hasRootNationality = updated.nationality !== undefined;
    const hasPersonalNationality = updated.personal?.nationality === 'American';

    logTest('  Root nationality removed', !hasRootNationality);
    logTest('  Personal.nationality updated', hasPersonalNationality);

    if (hasRootNationality || !hasPersonalNationality) {
      allPassed = false;
    }

    logTest('OVERALL: Employee Update', allPassed);

    return { employee: updated, allPassed };

  } catch (error) {
    logTest('Employee Update', false, `Error: ${error.message}`);
    return null;
  }
}

async function testEditPrefill(employeeId) {
  logSection('TEST 4: EDIT PREFILL (DATA CONSISTENCY)');

  const collections = getTenantCollections(TEST_COMPANY_ID);

  try {
    // This simulates what the frontend EditEmployeeModal expects
    // Get employee with aggregation (same as API response)
    const pipeline = [
      { $match: { _id: new ObjectId(employeeId) } },
      {
        $addFields: {
          departmentObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
              then: { $toObjectId: '$departmentId' },
              else: null
            }
          },
          designationObjId: {
            $cond: {
              if: { $and: [{ $ne: ['$designationId', null] }, { $ne: ['$designationId', ''] }] },
              then: { $toObjectId: '$designationId' },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'departments',
          localField: 'departmentObjId',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'designations',
          localField: 'designationObjId',
          foreignField: '_id',
          as: 'designationInfo'
        }
      },
      {
        $addFields: {
          department: { $arrayElemAt: ['$departmentInfo', 0] },
          designation: { $arrayElemAt: ['$designationInfo', 0] },
          passport: '$personal.passport',
          nationality: '$personal.nationality',
          religion: '$personal.religion',
          maritalStatus: '$personal.maritalStatus',
          employmentOfSpouse: '$personal.employmentOfSpouse',
          noOfChildren: '$personal.noOfChildren'
        }
      },
      {
        $project: {
          departmentObjId: 0,
          designationObjId: 0,
          departmentInfo: 0,
          designationInfo: 0
        }
      }
    ];

    const results = await collections.employees.aggregate(pipeline).toArray();
    const apiResponse = results[0];

    if (!apiResponse) {
      logTest('Edit Prefill Data', false, 'Employee not found');
      return;
    }

    log('\n  Simulating EditEmployeeModal Prefill:');
    log('  Expected data structure for EditEmployeeModal:\n');

    // What EditEmployeeModal expects (from TypeScript interface)
    const editFormData = {
      firstName: apiResponse.firstName || '',
      lastName: apiResponse.lastName || '',
      email: apiResponse.email || '',
      phone: apiResponse.phone || '',
      phoneCode: apiResponse.phoneCode || '',
      gender: apiResponse.gender || '',
      dateOfBirth: apiResponse.dateOfBirth || '',
      address: apiResponse.address || {},
      nationality: apiResponse.nationality || '', // ✓ Should be at root level (flattened)
      passport: apiResponse.passport || {},
      religion: apiResponse.religion || '',
      maritalStatus: apiResponse.maritalStatus || '',
      noOfChildren: apiResponse.noOfChildren || 0,
      departmentId: apiResponse.departmentId || '',
      designationId: apiResponse.designationId || '',
      employmentType: apiResponse.employmentType || '',
      dateOfJoining: apiResponse.dateOfJoining || apiResponse.joiningDate || '',
      account: apiResponse.account || {},
      status: apiResponse.status || apiResponse.employmentStatus || ''
    };

    let allPassed = true;

    // Check critical fields for Edit modal
    const criticalFields = [
      { name: 'firstName', value: editFormData.firstName, required: true },
      { name: 'lastName', value: editFormData.lastName, required: true },
      { name: 'email', value: editFormData.email, required: true },
      { name: 'nationality (flattened)', value: editFormData.nationality, required: true },
      { name: 'gender', value: editFormData.gender, required: true },
      { name: 'dateOfBirth', value: editFormData.dateOfBirth, required: true },
      { name: 'maritalStatus', value: editFormData.maritalStatus, required: false },
      { name: 'religion', value: editFormData.religion, required: false },
      { name: 'passport', value: editFormData.passport, required: false }
    ];

    log('  Critical Fields for Edit Modal:\n');
    for (const { name, value, required } of criticalFields) {
      const hasValue = value !== undefined && value !== null && value !== '';
      const status = required ? (hasValue ? '✓' : '✗ REQUIRED') : (hasValue ? '✓' : '-');
      log(`    ${status} ${name}: ${JSON.stringify(value)}`, hasValue ? 'green' : (required ? 'red' : 'yellow'));

      if (required && !hasValue) {
        allPassed = false;
      }
    }

    // Verify the structure matches what frontend expects
    log('\n  Structure Verification:');
    logTest('  nationality at root (flattened)', editFormData.nationality !== undefined, `Value: ${editFormData.nationality}`);
    logTest('  religion at root (flattened)', editFormData.religion !== undefined, `Value: ${editFormData.religion}`);
    logTest('  maritalStatus at root (flattened)', editFormData.maritalStatus !== undefined, `Value: ${editFormData.maritalStatus}`);
    logTest('  passport at root (flattened)', editFormData.passport !== undefined, typeof editFormData.passport === 'object');

    if (editFormData.nationality === undefined) allPassed = false;

    logTest('OVERALL: Edit Prefill Data Structure', allPassed);

    return { editFormData, allPassed };

  } catch (error) {
    logTest('Edit Prefill Test', false, `Error: ${error.message}`);
    return null;
  }
}

async function cleanupTestData() {
  logSection('CLEANUP: Removing Test Data');

  try {
    if (!TEST_COMPANY_ID) {
      log('  No company ID set, skipping cleanup', 'yellow');
      return;
    }

    const collections = getTenantCollections(TEST_COMPANY_ID);

    const result = await collections.employees.deleteMany({
      firstName: { $regex: /^Test(CREATE|UPDATE)/ },
      clerkUserId: { $regex: /^test_user_/ }
    });

    log(`  Deleted ${result.deletedCount} test employee(s)`, 'green');
  } catch (error) {
    log(`  Cleanup failed: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  console.clear();
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                        ║', 'cyan');
  log('║       EMPLOYEE FIELDS VERIFICATION TEST                 ║', 'cyan');
  log('║                                                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  let testIds = null;

  try {
    // Auto-detect valid IDs first
    testIds = await getValidTestIds();

    if (!testIds) {
      log('\n✗ Failed to detect valid test IDs', 'red');
      return;
    }

    log(`\nTesting Company ID: ${testIds.companyId}`, 'blue');
    log(`Start Time: ${new Date().toLocaleString()}\n`, 'blue');

    await client.connect();
    log('✓ Database connected', 'green');

    // Run tests
    const creationResult = await testEmployeeCreation(testIds.departmentId, testIds.designationId);

    if (creationResult?.employee) {
      await testEmployeeRetrieval(creationResult.employee._id);
      await testEmployeeUpdate(creationResult.employee._id);
      await testEditPrefill(creationResult.employee._id);
    }

    // Cleanup
    await cleanupTestData();

    // Final summary
    logSection('FINAL SUMMARY');
    log('  Tests completed!', 'green');
    log('  Review the results above for any failures.', 'yellow');
    log('  Check that:', 'cyan');
    log('    ✓ nationality is stored at personal.nationality', 'green');
    log('    ✓ nationality is flattened to root in API response', 'green');
    log('    ✓ password is stored in account.password (if generated)', 'green');
    log('    ✓ Edit modal prefill has correct field structure', 'green');

  } catch (error) {
    log(`\n✗ Test failed with error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (client) {
      await client.close();
      log('\n✓ Database connection closed', 'green');
    }
  }
}

// Run the tests
runAllTests().catch(console.error);
