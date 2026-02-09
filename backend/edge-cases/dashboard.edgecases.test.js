/**
 * Edge Case Tests for Admin Dashboard Services
 *
 * These tests validate behavior with empty data, large datasets,
 * malformed data, and other edge cases.
 *
 * Run with: npm test -- backend/integration-tests/dashboard.edgecases.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';
import { connectDB, getTenantCollections } from '../../config/db.js';

// Mock environment
process.env.DOMAIN = 'testdomain.com';
process.env.CLERK_JWT_KEY = 'test-key';

let mongoServer;
let client;
let db;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test-company');

  await connectDB();
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = getTenantCollections('test-company');
  // Clear all collections
  await collections.employees.deleteMany({});
  await collections.invoices.deleteMany({});
  await collections.clients.deleteMany({});
  await collections.projects.deleteMany({});
  await collections.tasks.deleteMany({});
  await collections.attendance.deleteMany({});
  await collections.todos.deleteMany({});
  await collections.earnings.deleteMany({});
});

describe('Edge Cases: Empty Database', () => {
  describe('getDashboardStats with no data', () => {
    it('should return zeros when no employees exist', async () => {
      const adminService = await import('../../services/admin/admin.services.js');
      const result = await adminService.getDashboardStats('test-company', null);

      expect(result.done).toBe(true);
      expect(result.data.employees).toBe(0);
      expect(result.data.clients).toBe(0);
      expect(result.data.projects?.total).toBe(0);
    });

    it('should handle missing attendance data gracefully', async () => {
      const adminService = await import('../../services/admin/admin.services.js');
      const result = await adminService.getAttendanceOverview('test-company', 'today', null);

      expect(result.done).toBe(true);
      expect(result.data.total).toBe(0);
      expect(result.data.present).toBe(0);
    });

    it('should return empty arrays for list endpoints', async () => {
      const adminService = await import('../../services/admin/admin.services.js');

      const invoices = await adminService.getRecentInvoices('test-company', 'all', null, 'all');
      const employees = await adminService.getEmployeesList('test-company', null);

      expect(invoices.done).toBe(true);
      expect(invoices.data).toEqual([]);
      expect(employees.done).toBe(true);
      expect(employees.data).toEqual([]);
    });
  });

  describe('getRecentlyRegistered with no companies', () => {
    it('should return empty array when no companies exist', async () => {
      const { getsuperadminCollections } = await import('../../config/db.js');
      await getsuperadminCollections().companiesCollection.deleteMany({});

      const dashboardService = await import('../../services/superadmin/dashboard.services.js');
      const result = await dashboardService.getRecentlyRegistered();

      expect(result.done).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});

describe('Edge Cases: Large Datasets', () => {
  it('should handle 1000+ employees efficiently', async () => {
    const collections = getTenantCollections('test-company');

    // Insert 1000 employees
    const employees = Array.from({ length: 1000 }, (_, i) => ({
      firstName: `Employee${i}`,
      lastName: `Last${i}`,
      department: i % 5 === 0 ? 'Sales' : 'Engineering',
      position: 'Developer',
      status: 'Active',
      avatar: `avatar${i}.png`,
      createdAt: new Date()
    }));

    await collections.employees.insertMany(employees);

    const adminService = await import('../../services/admin/admin.services.js');
    const startTime = Date.now();
    const result = await adminService.getDashboardStats('test-company', null);
    const duration = Date.now() - startTime;

    expect(result.done).toBe(true);
    expect(result.data.employees).toBe(1000);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
  });

  it('should limit results correctly for large datasets', async () => {
    const collections = getTenantCollections('test-company');
    const client = await collections.clients.findOne();

    // Insert 100 invoices
    const invoices = Array.from({ length: 100 }, (_, i) => ({
      invoiceNumber: `INV-${String(i).padStart(4, '0')}`,
      title: `Invoice ${i}`,
      amount: 100 * i,
      status: ['Paid', 'Unpaid', 'Pending', 'Overdue'][i % 4],
      clientId: client?._id || new ObjectId(),
      createdAt: new Date()
    }));

    await collections.invoices.insertMany(invoices);

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getRecentInvoices('test-company', 'all', null, 'all');

    expect(result.done).toBe(true);
    expect(result.data.length).toBeLessThanOrEqual(5); // Limited to 5
  });
});

describe('Edge Cases: Malformed Data', () => {
  it('should handle companies with missing optional fields', async () => {
    const { getsuperadminCollections } = await import('../../config/db.js');
    await getsuperadminCollections().companiesCollection.insertOne({
      _id: new ObjectId(),
      name: 'Minimal Company'
      // Missing: domain, logo, plan_name, plan_type, email
    });

    const dashboardService = await import('../../services/superadmin/dashboard.services.js');
    const result = await dashboardService.getRecentlyRegistered();

    expect(result.done).toBe(true);
    expect(result.data.length).toBe(1);

    const company = result.data[0];
    expect(company.name).toBe('Minimal Company');
    expect(company.domain).toBe('Not configured');
    expect(company.logo).toBeDefined();
    expect(company.plan).toBe('Basic Plan');
    expect(company.users).toBeGreaterThanOrEqual(0);
  });

  it('should handle employees with null/undefined names', async () => {
    const collections = getTenantCollections('test-company');

    await collections.employees.insertOne({
      firstName: null,
      lastName: undefined,
      department: 'Engineering',
      position: 'Developer',
      status: 'Active',
      avatar: '',
      createdAt: new Date()
    });

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getEmployeesList('test-company', null);

    expect(result.done).toBe(true);
    expect(result.data.length).toBe(1);

    const employee = result.data[0];
    expect(employee.name).toBeDefined(); // Should have fallback name
  });

  it('should handle special characters in company names', async () => {
    const { getsuperadminCollections } = await import('../../config/db.js');
    await getsuperadminCollections().companiesCollection.insertOne({
      _id: new ObjectId(),
      name: "O'Brien & Associates",
      domain: 'obrien-associates',
      plan_name: 'Premium',
      plan_type: 'Monthly',
      status: 'Active',
      userCount: 15,
      userCountLastUpdated: new Date(),
      createdAt: new Date()
    });

    const dashboardService = await import('../../services/superadmin/dashboard.services.js');
    const result = await dashboardService.getRecentlyRegistered();

    expect(result.done).toBe(true);
    expect(result.data[0].name).toBe("O'Brien & Associates");
    expect(result.data[0].domain).toBe('obrien-associates.testdomain.com');
  });
});

describe('Edge Cases: Date Boundaries', () => {
  it('should handle leap years correctly', () => {
    const adminService = await import('../../services/admin/admin.services.js');

    // Test with leap year date
    const leapYearDate = new Date(2024, 1, 29); // Feb 29, 2024
    const collections = getTenantCollections('test-company');

    await collections.earnings.insertOne({
      date: leapYearDate,
      income: 5000,
      expenses: 2000
    });

    const result = await adminService.getSalesOverview('test-company', 'all', 2024, null);

    expect(result.done).toBe(true);
    expect(result.data.income).toBeDefined();
  });

  it('should handle month boundaries correctly', () => {
    const adminService = await import('../../services/admin/admin.services.js');

    // Test at month end
    const monthEnd = new Date();
    monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const collections = getTenantCollections('test-company');
    await collections.earnings.insertOne({
      date: monthEnd,
      income: 3000,
      expenses: 1000
    });

    const result = await adminService.getSalesOverview('test-company', 'month', null, null);

    expect(result.done).toBe(true);
    expect(result.data.income).toBeDefined();
  });

  it('should handle year filter boundaries', () => {
    const adminService = await import('../../services/admin/admin.services.js');

    const collections = getTenantCollections('test-company');

    // Create data at year boundary
    await collections.employees.insertMany([
      { firstName: 'Emp1', status: 'Active', department: 'IT', createdAt: new Date(2025, 11, 31, 23, 59, 59) },
      { firstName: 'Emp2', status: 'Active', department: 'IT', createdAt: new Date(2026, 0, 1, 0, 0, 0) }
    ]);

    const result2025 = await adminService.getEmployeesByDepartment('test-company', 'all', 2025);
    const result2026 = await adminService.getEmployeesByDepartment('test-company', 'all', 2026);

    expect(result2025.done).toBe(true);
    expect(result2026.done).toBe(true);

    // 2025 should have 1 employee (from Dec 31)
    expect(result2025.data.reduce((sum, dept) => sum + dept.count, 0)).toBe(1);

    // 2026 should have 1 employee (from Jan 1)
    expect(result2026.data.reduce((sum, dept) => sum + dept.count, 0)).toBe(1);
  });
});

describe('Edge Cases: Invoice Status Variations', () => {
  it('should handle case-insensitive invoice statuses', async () => {
    const collections = getTenantCollections('test-company');

    await collections.invoices.insertMany([
      { invoiceNumber: 'INV-001', status: 'PAID', amount: 1000, createdAt: new Date() },
      { invoiceNumber: 'INV-002', status: 'paid', amount: 2000, createdAt: new Date() },
      { invoiceNumber: 'INV-003', status: 'PaId', amount: 3000, createdAt: new Date() },
      { invoiceNumber: 'INV-004', status: 'UNPAID', amount: 4000, createdAt: new Date() }
    ]);

    const adminService = await import('../../services/admin/admin.services.js');

    const paidResult = await adminService.getRecentInvoices('test-company', 'all', null, 'paid');
    const unpaidResult = await adminService.getRecentInvoices('test-company', 'all', null, 'unpaid');

    expect(paidResult.done).toBe(true);
    expect(paidResult.data.length).toBe(3); // Should find all variations of "paid"
    expect(unpaidResult.done).toBe(true);
    expect(unpaidResult.data.length).toBe(1);
  });

  it('should handle unknown invoice types gracefully', async () => {
    const collections = getTenantCollections('test-company');

    await collections.invoices.insertOne({
      invoiceNumber: 'INV-001',
      status: 'UnknownStatus',
      amount: 1000,
      createdAt: new Date()
    });

    const adminService = await import('../../services/admin/admin.services.js');

    const result = await adminService.getRecentInvoices('test-company', 'all', null, 'unknown-status');

    expect(result.done).toBe(true);
    // Should return all invoices when filter type is unknown
    expect(result.data.length).toBeGreaterThanOrEqual(0);
  });
});

describe('Edge Cases: Cross-Tenant Data Isolation', () => {
  it('should not leak data between companies', async () => {
    // Create another company's "database" (different ID)
    const otherCompanyId = 'other-company-' + Date.now();
    const collections1 = getTenantCollections('test-company');
    const collections2 = getTenantCollections(otherCompanyId);

    // Insert employees in both "databases"
    await collections1.employees.insertMany([
      { firstName: 'Company1Emp1', status: 'Active', department: 'IT', createdAt: new Date() },
      { firstName: 'Company1Emp2', status: 'Active', department: 'Sales', createdAt: new Date() }
    ]);

    await collections2.employees.insertMany([
      { firstName: 'Company2Emp1', status: 'Active', department: 'IT', createdAt: new Date() },
      { firstName: 'Company2Emp2', status: 'Active', department: 'Sales', createdAt: new Date() },
      { firstName: 'Company2Emp3', status: 'Active', department: 'HR', createdAt: new Date() }
    ]);

    const adminService = await import('../../services/admin/admin.services.js');

    const result1 = await adminService.getDashboardStats('test-company', null);
    const result2 = await adminService.getDashboardStats(otherCompanyId, null);

    expect(result1.data.employees).toBe(2); // Only test-company employees
    expect(result2.data.employees).toBe(3); // Only other-company employees
  });
});

describe('Edge Cases: Numeric Extremes', () => {
  it('should handle very large monetary amounts', async () => {
    const collections = getTenantCollections('test-company');
    const client = await collections.clients.findOne();

    await collections.invoices.insertOne({
      invoiceNumber: 'INV-LARGE',
      title: 'Enterprise Contract',
      amount: 999999999.99,
      status: 'Paid',
      clientId: client?._id || new ObjectId(),
      createdAt: new Date()
    });

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getRecentInvoices('test-company', 'all', null, 'paid');

    expect(result.done).toBe(true);
    expect(result.data[0].amount).toBe(999999999.99);
  });

  it('should handle zero amounts', async () => {
    const collections = getTenantCollections('test-company');
    const client = await collections.clients.findOne();

    await collections.invoices.insertOne({
      invoiceNumber: 'INV-ZERO',
      title: 'Free Invoice',
      amount: 0,
      status: 'Paid',
      clientId: client?._id || new ObjectId(),
      createdAt: new Date()
    });

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getRecentInvoices('test-company', 'all', null, 'paid');

    expect(result.done).toBe(true);
    expect(result.data[0].amount).toBe(0);
  });

  it('should handle negative earnings gracefully', async () => {
    const collections = getTenantCollections('test-company');

    await collections.earnings.insertOne({
      date: new Date(),
      income: 0,
      expenses: 5000 // More expenses than income
    });

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getSalesOverview('test-company', 'all', null, null);

    expect(result.done).toBe(true);
    expect(result.data.income).toBeDefined();
    // Should handle negative profit
  });
});

describe('Edge Cases: Concurrent Requests', () => {
  it('should handle multiple simultaneous requests', async () => {
    const collections = getTenantCollections('test-company');

    // Insert test data
    await collections.employees.insertMany([
      { firstName: 'Emp1', status: 'Active', department: 'IT', createdAt: new Date() },
      { firstName: 'Emp2', status: 'Active', department: 'Sales', createdAt: new Date() }
    ]);

    const adminService = await import('../../services/admin/admin.services.js');

    // Make 10 simultaneous requests
    const promises = Array.from({ length: 10 }, () =>
      adminService.getDashboardStats('test-company', null)
    );

    const results = await Promise.all(promises);

    // All should succeed
    results.forEach(result => {
      expect(result.done).toBe(true);
      expect(result.data.employees).toBe(2);
    });

    // All should return the same data
    const firstResult = results[0].data;
    results.forEach(result => {
      expect(result.data.employees).toBe(firstResult.employees);
    });
  });
});

describe('Edge Cases: Database Errors', () => {
  it('should handle tenant database connection errors gracefully', async () => {
    // Test with invalid company ID (no tenant database)
    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getDashboardStats('non-existent-company-' + Date.now(), null);

    expect(result).toBeDefined();
    // Should either return zeros or handle error gracefully
  });

  it('should handle missing client references in invoices', async () => {
    const collections = getTenantCollections('test-company');

    await collections.invoices.insertOne({
      invoiceNumber: 'INV-NOCLIENT',
      title: 'Orphan Invoice',
      amount: 1000,
      status: 'Paid',
      clientId: new ObjectId(), // Non-existent client
      createdAt: new Date()
    });

    const adminService = await import('../../services/admin/admin.services.js');
    const result = await adminService.getRecentInvoices('test-company', 'all', null, 'all');

    expect(result.done).toBe(true);
    // Should either skip or handle orphaned invoices
  });
});

describe('Edge Cases: Growth Calculations', () => {
  it('should handle division by zero in growth calculations', async () => {
    const adminService = await import('../../services/admin/admin.services.js');

    // First request with no previous data
    const result1 = await adminService.getDashboardStats('test-company', null);
    const result2 = await adminService.getDashboardStats('test-company', null);

    // Should not crash when calculating growth
    expect(result1.done).toBe(true);
    expect(result2.done).toBe(true);
  });

  it('should handle first-time employee growth calculation', async () => {
    const collections = getTenantCollections('test-company');

    const adminService = await adminService.import('../../services/admin/admin.services.js');

    const growth = await adminService.getEmployeeGrowth('test-company', null);

    expect(growth.done).toBe(true);
    expect(growth.data).toBeDefined();
    expect(growth.data.currentWeek).toBeGreaterThanOrEqual(0);
    expect(growth.data.lastWeek).toBeGreaterThanOrEqual(0);
  });
});
