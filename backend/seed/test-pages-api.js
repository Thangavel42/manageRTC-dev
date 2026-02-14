/**
 * Pages API Test Script
 * Run this script to test the Pages API endpoints
 * Usage: node seed/test-pages-api.js
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const API_PREFIX = '/api/rbac/pages';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, endpoint, data = null) {
  try {
    log(`\nTesting: ${method.toUpperCase()} ${endpoint}`, 'blue');
    log(`Expected: ${name}`, 'yellow');

    const config = {
      method,
      url: `${API_BASE_URL}${API_PREFIX}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);

    log(`Status: ${response.status}`, 'green');
    log(`Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`, 'green');
    return { success: true, data: response.data };
  } catch (error) {
    log(`Error: ${error.response?.status || 'Network Error'}`, 'red');
    log(`Message: ${error.response?.data?.error || error.message}`, 'red');
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  log('========================================', 'blue');
  log('Pages API Test Suite', 'blue');
  log('========================================', 'blue');
  log(`API Base URL: ${API_BASE_URL}\n`, 'yellow');

  const results = [];

  // Test 1: Get all pages
  log('\n----------------------------------------', 'blue');
  log('Test 1: GET All Pages', 'blue');
  log('----------------------------------------', 'blue');
  const test1 = await testEndpoint('Get all pages with stats', 'GET', '/');
  results.push({ test: 'GET All Pages', passed: test1.success });

  // Test 2: Get pages grouped by category
  log('\n----------------------------------------', 'blue');
  log('Test 2: GET Pages Grouped by Category', 'blue');
  log('----------------------------------------', 'blue');
  const test2 = await testEndpoint('Get pages grouped by module category', 'GET', '/grouped');
  results.push({ test: 'GET Pages Grouped', passed: test2.success });

  // Test 3: Get page statistics
  log('\n----------------------------------------', 'blue');
  log('Test 3: GET Page Statistics', 'blue');
  log('----------------------------------------', 'blue');
  const test3 = await testEndpoint('Get page statistics', 'GET', '/stats');
  results.push({ test: 'GET Page Stats', passed: test3.success });

  // Test 4: Get pages by module category
  log('\n----------------------------------------', 'blue');
  log('Test 4: GET Pages by Module Category', 'blue');
  log('----------------------------------------', 'blue');
  const test4 = await testEndpoint('Get pages by super-admin category', 'GET', '/category/super-admin');
  results.push({ test: 'GET Pages by Category', passed: test4.success });

  // Test 5: Create a new page (test data)
  log('\n----------------------------------------', 'blue');
  log('Test 5: POST Create New Page', 'blue');
  log('----------------------------------------', 'blue');
  const newPage = {
    name: 'test.custom-page',
    displayName: 'Test Custom Page',
    description: 'This is a test page created by the test script',
    route: '/test/custom-page',
    icon: 'ti ti-test',
    moduleCategory: 'super-admin',
    sortOrder: 999,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  };
  const test5 = await testEndpoint('Create a new custom page', 'POST', '/', newPage);
  results.push({ test: 'POST Create Page', passed: test5.success });

  let testPageId = null;
  if (test5.success && test5.data?.data?._id) {
    testPageId = test5.data.data._id;
    log(`Created page ID: ${testPageId}`, 'green');

    // Test 6: Get page by ID
    log('\n----------------------------------------', 'blue');
    log('Test 6: GET Page by ID', 'blue');
    log('----------------------------------------', 'blue');
    const test6 = await testEndpoint('Get page by ID', 'GET', `/${testPageId}`);
    results.push({ test: 'GET Page by ID', passed: test6.success });

    // Test 7: Update page
    log('\n----------------------------------------', 'blue');
    log('Test 7: PUT Update Page', 'blue');
    log('----------------------------------------', 'blue');
    const updateData = {
      displayName: 'Test Custom Page (Updated)',
      description: 'This page has been updated by the test script'
    };
    const test7 = await testEndpoint('Update page details', 'PUT', `/${testPageId}`, updateData);
    results.push({ test: 'PUT Update Page', passed: test7.success });

    // Test 8: Toggle page status
    log('\n----------------------------------------', 'blue');
    log('Test 8: PATCH Toggle Page Status', 'blue');
    log('----------------------------------------', 'blue');
    const test8 = await testEndpoint('Toggle page active status', 'PATCH', `/${testPageId}/toggle-status`);
    results.push({ test: 'PATCH Toggle Status', passed: test8.success });
  }

  // Test 9: Batch update page orders
  log('\n----------------------------------------', 'blue');
  log('Test 9: PUT Batch Update Page Orders', 'blue');
  log('----------------------------------------', 'blue');
  const batchData = {
    pageOrders: [
      { pageId: testPageId, sortOrder: 100 }
    ]
  };
  const test9 = await testEndpoint('Batch update sort orders', 'PUT', '/batch/orders', batchData);
  results.push({ test: 'PUT Batch Orders', passed: test9.success });

  // Cleanup: Delete test page
  if (testPageId) {
    log('\n----------------------------------------', 'blue');
    log('Cleanup: DELETE Test Page', 'blue');
    log('----------------------------------------', 'blue');
    const cleanup = await testEndpoint('Delete test page', 'DELETE', `/${testPageId}`);
    results.push({ test: 'DELETE Page', passed: cleanup.success });
  }

  // Print summary
  log('\n========================================', 'blue');
  log('Test Summary', 'blue');
  log('========================================', 'blue');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  results.forEach(result => {
    const status = result.passed ? 'PASS' : 'FAIL';
    const color = result.passed ? 'green' : 'red';
    log(`${status}: ${result.test}`, color);
  });

  log(`\nTotal: ${results.length} tests`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\nAll tests passed!', 'green');
  } else {
    log('\nSome tests failed. Please check the errors above.', 'red');
  }

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
