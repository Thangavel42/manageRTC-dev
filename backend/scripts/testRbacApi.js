/**
 * API Endpoint Test Script
 * Tests the RBAC API endpoints with the new embedded permissions structure
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Role from '../models/rbac/role.schema.js';
import Permission from '../models/rbac/permission.schema.js';
import { getRolePermissions, setRolePermissions, checkRolePermission } from '../services/rbac/permission.service.js';
import { GetRolesWithPermissionSummary, getRolePermissionsGrouped } from '../services/rbac/role.service.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const result = { name, passed, message };
  results.tests.push(result);

  if (passed) {
    results.passed++;
    console.log(`${status}: ${name}`);
  } else {
    results.failed++;
    console.log(`${status}: ${name} - ${message}`);
  }
}

async function runTests() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    console.log('🧪 Running API Tests...\n');
    console.log('='.repeat(60));

    // Test 1: Get Super Admin role
    console.log('\n📋 Test 1: Get Super Admin Role');
    const superAdmin = await Role.findOne({ name: 'superadmin' });
    logTest('Find Super Admin role', !!superAdmin, superAdmin ? '' : 'Role not found');

    if (!superAdmin) {
      console.log('\n❌ Cannot continue tests without Super Admin role');
      return;
    }

    // Test 2: Check embedded permissions
    console.log('\n📋 Test 2: Check Embedded Permissions');
    const hasEmbeddedPerms = superAdmin.permissions && superAdmin.permissions.length > 0;
    logTest('Role has embedded permissions', hasEmbeddedPerms, `Found ${superAdmin.permissions?.length || 0} permissions`);

    // Test 3: Check permission stats
    console.log('\n📋 Test 3: Check Permission Stats');
    const hasStats = superAdmin.permissionStats && superAdmin.permissionStats.totalPermissions > 0;
    logTest('Role has permission stats', hasStats, `Total: ${superAdmin.permissionStats?.totalPermissions || 0}`);

    // Test 4: Get role permissions via service
    console.log('\n📋 Test 4: Get Role Permissions (Service)');
    const permResult = await getRolePermissions(superAdmin._id);
    logTest('Get role permissions - success', permResult.success, permResult.error || '');
    logTest('Get role permissions - has data', permResult.data?.flat?.length > 0, `Found ${permResult.data?.flat?.length || 0} permissions`);
    logTest('Get role permissions - has grouped', permResult.data?.grouped?.length > 0, `Found ${permResult.data?.grouped?.length || 0} categories`);
    logTest('Get role permissions - embedded source', permResult.data?.source === 'embedded', `Source: ${permResult.data?.source}`);

    // Test 5: Check specific permission
    console.log('\n📋 Test 5: Check Specific Permission');
    const hasPermission = await checkRolePermission(superAdmin._id, 'super-admin.dashboard', 'read');
    logTest('Check permission - super-admin.dashboard', hasPermission, 'Expected true');

    // Test 6: Get roles with summary
    console.log('\n📋 Test 6: Get Roles With Summary');
    const summaryResult = await GetRolesWithPermissionSummary();
    logTest('Get roles summary - success', summaryResult.success, summaryResult.error || '');
    logTest('Get roles summary - has data', summaryResult.data?.length > 0, `Found ${summaryResult.data?.length || 0} roles`);

    // Check Super Admin has permissionCount
    const saSummary = summaryResult.data?.find(r => r.name === 'superadmin');
    logTest('Super Admin summary has permissionCount', saSummary?.permissionCount > 0, `Count: ${saSummary?.permissionCount || 0}`);

    // Test 7: Get grouped permissions
    console.log('\n📋 Test 7: Get Grouped Permissions');
    const groupedResult = await getRolePermissionsGrouped(superAdmin._id);
    logTest('Get grouped permissions - success', groupedResult.success, groupedResult.error || '');
    logTest('Get grouped permissions - has categories', groupedResult.data?.length > 0, `Found ${groupedResult.data?.length || 0} categories`);

    // Test 8: Verify category count
    console.log('\n📋 Test 8: Verify Category Count');
    const expectedCategories = 15;
    const actualCategories = superAdmin.permissionStats?.categories?.length || 0;
    logTest('Category count matches', actualCategories === expectedCategories, `Expected ${expectedCategories}, got ${actualCategories}`);

    // Test 9: Test permission lookup by module
    console.log('\n📋 Test 9: Permission Lookup by Module');
    const employeesPerm = superAdmin.permissions?.find(p => p.module === 'hrm.employees-list');
    logTest('Find hrm.employees-list permission', !!employeesPerm, employeesPerm ? 'Found' : 'Not found');

    // Test 10: Test action check
    console.log('\n📋 Test 10: Test Action Check');
    const checkAllAction = await checkRolePermission(superAdmin._id, 'super-admin.companies', 'all');
    logTest('Check "all" action on super-admin.companies', checkAllAction, 'Expected true for Super Admin');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total: ${results.passed + results.failed}`);
    console.log(`📋 Pass Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);

    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests.filter(t => !t.passed).forEach(t => {
        console.log(`   - ${t.name}: ${t.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('📡 API ENDPOINTS TO TEST MANUALLY:');
    console.log('='.repeat(60));
    console.log('1. GET  /api/rbac/roles/with-summary');
    console.log('2. GET  /api/rbac/roles/:roleId/permissions');
    console.log('3. PUT  /api/rbac/roles/:roleId/permissions');
    console.log('4. GET  /api/rbac/roles/:roleId/check-permission?module=hrm.employees-list&action=read');
    console.log('5. GET  /api/rbac/permissions/grouped');

    await mongoose.disconnect();
    console.log('\n✅ Tests complete!');

    return results.failed === 0;

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    return false;
  }
}

runTests();
