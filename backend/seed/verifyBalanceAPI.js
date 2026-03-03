/**
 * Verification script to test the balance API endpoint
 * Run: node backend/seed/verifyBalanceAPI.js
 */

import 'dotenv/config';
import http from 'http';

const API_HOST = 'localhost';
const API_PORT = 5000;
const EMPLOYEE_ID = 'EMP-0256';
const LEAVE_TYPE = 'earned';

// Test JWT token (admin user with companyId)
// Note: You need to replace this with a valid JWT token from your Clerk auth
const JWT_TOKEN = process.env.TEST_JWT_TOKEN || '';

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

function makeRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  logSection('LEAVE BALANCE API VERIFICATION');

  if (!JWT_TOKEN) {
    log('  ❌ No JWT token provided!', 'red');
    console.log('     Set TEST_JWT_TOKEN environment variable with a valid Clerk JWT token');
    console.log('     Or login via the frontend and copy the token from browser DevTools');
    return;
  }

  // Test 1: Get balance for specific employee by employeeId
  logSection('TEST 1: GET /api/leaves/balance?employeeId=' + EMPLOYEE_ID + '&leaveType=' + LEAVE_TYPE);

  try {
    const result = await makeRequest(`/api/leaves/balance?employeeId=${EMPLOYEE_ID}&leaveType=${LEAVE_TYPE}`, JWT_TOKEN);

    if (result.statusCode === 200) {
      log('  ✅ SUCCESS!', 'green');
      console.log('     Status:', result.statusCode);
      console.log('     Response:', JSON.stringify(result.data, null, 2));
    } else if (result.statusCode === 404) {
      log('  ❌ 404 NOT FOUND - Employee not found!', 'red');
      console.log('     This means the fix did NOT work');
      console.log('     Response:', result.data);
    } else if (result.statusCode === 401) {
      log('  ⚠️  401 UNAUTHORIZED - Invalid or missing JWT token', 'yellow');
      console.log('     Response:', result.data);
    } else if (result.statusCode === 403) {
      log('  ⚠️  403 FORBIDDEN - User lacks permission', 'yellow');
      console.log('     Response:', result.data);
    } else {
      log('  ❌ Unexpected status code: ' + result.statusCode, 'red');
      console.log('     Response:', result.data);
    }

  } catch (error) {
    log('  ❌ Request failed:', 'red');
    console.log('     Error:', error.message);
  }

  // Test 2: Get all balances for specific employee
  logSection('TEST 2: GET /api/leaves/balance?employeeId=' + EMPLOYEE_ID);

  try {
    const result = await makeRequest(`/api/leaves/balance?employeeId=${EMPLOYEE_ID}`, JWT_TOKEN);

    if (result.statusCode === 200) {
      log('  ✅ SUCCESS!', 'green');
      console.log('     Status:', result.statusCode);
      console.log('     Response:', JSON.stringify(result.data, null, 2));
    } else if (result.statusCode === 404) {
      log('  ❌ 404 NOT FOUND - Employee not found!', 'red');
      console.log('     This means the fix did NOT work');
      console.log('     Response:', result.data);
    } else {
      log('  ⚠️  Status code: ' + result.statusCode, 'yellow');
      console.log('     Response:', result.data);
    }

  } catch (error) {
    log('  ❌ Request failed:', 'red');
    console.log('     Error:', error.message);
  }

  logSection('VERIFICATION COMPLETE');
  log('\nIf you see 404 errors, the fix did not work.', 'red');
  log('If you see 200 OK responses, the fix is working!', 'green');
  log('\nNote: Make sure you have a valid admin JWT token set as TEST_JWT_TOKEN', 'blue');
}

main();
