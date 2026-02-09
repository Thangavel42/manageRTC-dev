/**
 * Integration Tests for Admin Dashboard REST API
 *
 * These tests validate the complete request/response cycle
 * from API endpoints through to the database.
 *
 * Run with: npm test -- backend/integration-tests/dashboard.integration.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';
import { Server } from 'http';
import { connectDB, getTenantCollections } from '../../config/db.js';

// Mock environment
process.env.DOMAIN = 'testdomain.com';
process.env.CLERK_JWT_KEY = 'test-key';
process.env.PORT = '5100'; // Use different port for testing

let mongoServer;
let client;
let db;
let testCompany;
let httpServer;
let baseUrl;

beforeAll(async () => {
  // Setup in-memory database
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;

  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test-company');

  // Initialize database connection
  await connectDB();

  // Setup test HTTP server
  const express = await import('express');
  const cors = await import('cors');

  const app = express.default();
  app.use(cors.default());
  app.use(express.default.json());

  // Import routes after app is configured
  // Note: This requires the actual API routes to be modular

  httpServer = await new Promise((resolve) => {
    const server = app.listen(5100, () => {
      baseUrl = 'http://localhost:5100';
      resolve(server);
    });
  });

  // Create test company collections
  testCompany = {
    _id: new ObjectId(),
    name: 'Test Company',
    domain: 'testcompany',
    plan_name: 'Premium',
    plan_type: 'Monthly',
    logo: 'test-logo.png',
    status: 'Active',
    userCount: 25,
    userCountLastUpdated: new Date(),
    createdAt: new Date(),
    email: 'admin@testcompany.com'
  };
});

afterAll(async () => {
  await httpServer.close();
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear and setup test data
  const collections = getTenantCollections('test-company');
  await collections.employees.deleteMany({});
  await collections.invoices.deleteMany({});
  await collections.clients.deleteMany({});
  await collections.projects.deleteMany({});
  await collections.tasks.deleteMany({});
  await collections.attendance.deleteMany({});
  await collections.todos.deleteMany({});
  await collections.earnings.deleteMany({});
});

describe('Admin Dashboard REST API - Integration Tests', () => {
  describe('GET /api/admin-dashboard/all', () => {
    beforeEach(async () => {
      // Setup test data
      const collections = getTenantCollections('test-company');

      // Insert employees
      await collections.employees.insertMany([
        {
          firstName: 'John',
          lastName: 'Doe',
          department: 'Engineering',
          position: 'Developer',
          status: 'Active',
          avatar: 'john.png',
          createdAt: new Date()
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          department: 'Sales',
          position: 'Sales Manager',
          status: 'Active',
          avatar: 'jane.png',
          createdAt: new Date()
        }
      ]);

      // Insert clients
      await collections.clients.insertOne({
        name: 'Acme Corp',
        logo: 'acme.png',
        status: 'Active'
      });

      // Insert invoices
      await collections.invoices.insertMany([
        {
          invoiceNumber: 'INV-001',
          title: 'Web Services',
          amount: 5000,
          status: 'Paid',
          createdAt: new Date()
        },
        {
          invoiceNumber: 'INV-002',
          title: 'Consulting',
          amount: 2500,
          status: 'Pending',
          createdAt: new Date()
        }
      ]);

      // Insert projects
      await collections.projects.insertOne({
        name: 'Website Redesign',
        status: 'Active',
        hours: 50,
        totalHours: 100,
        priority: 'High',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        progress: 50,
        teamMembers: [],
        isDeleted: false,
        createdAt: new Date()
      });

      // Insert tasks
      await collections.tasks.insertMany([
        { title: 'Task 1', status: 'Completed', hoursSpent: 5 },
        { title: 'Task 2', status: 'In Progress', hoursSpent: 3 }
      ]);

      // Insert attendance
      await collections.attendance.insertMany([
        { date: new Date(), status: 'Present', employeeId: new ObjectId() },
        { date: new Date(), status: 'Present', employeeId: new ObjectId() }
      ]);

      // Insert earnings
      await collections.earnings.insertOne({
        date: new Date(),
        income: 10000,
        expenses: 3000
      });
    });

    it('should return all dashboard data in one request', async () => {
      // This would normally use the actual API
      // For now, we test the service layer directly

      const adminService = await import('../../services/admin/admin.services.js');

      const result = await adminService.getDashboardStats('test-company', null);

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.employees).toBe(2);
      expect(result.data.clients).toBe(1);
    });

    it('should handle year filter correctly', async () => {
      const adminService = await import('../../services/admin/admin.services.js');

      const currentYear = new Date().getFullYear();
      const result = await adminService.getDashboardStats('test-company', currentYear);

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should return consistent data across multiple calls', async () => {
      const adminService = await import('../../services/admin/admin.services.js');

      const result1 = await adminService.getDashboardStats('test-company', null);
      const result2 = await adminService.getDashboardStats('test-company', null);

      // Verify no random data
      expect(result1.data.employees).toBe(result2.data.employees);
      expect(result1.data.clients).toBe(result2.data.clients);
    });
  });

  describe('Invoice Filtering Integration', () => {
    it('should filter invoices by all status types', async () => {
      const collections = getTenantCollections('test-company');

      // Insert all invoice types
      await collections.invoices.insertMany([
        { invoiceNumber: 'INV-001', status: 'Paid', amount: 1000, createdAt: new Date() },
        { invoiceNumber: 'INV-002', status: 'Unpaid', amount: 2000, createdAt: new Date() },
        { invoiceNumber: 'INV-003', status: 'Pending', amount: 3000, createdAt: new Date() },
        { invoiceNumber: 'INV-004', status: 'Overdue', amount: 4000, createdAt: new Date() },
        { invoiceNumber: 'INV-005', status: 'Paid', amount: 5000, createdAt: new Date() }
      ]);

      const adminService = await import('../../services/admin/admin.services.js');

      // Test each filter
      const paid = await adminService.getRecentInvoices('test-company', 'all', null, 'paid');
      const unpaid = await adminService.getRecentInvoices('test-company', 'all', null, 'unpaid');
      const pending = await adminService.getRecentInvoices('test-company', 'all', null, 'pending');
      const overdue = await adminService.getRecentInvoices('test-company', 'all', null, 'overdue');

      expect(paid.done).toBe(true);
      expect(unpaid.done).toBe(true);
      expect(pending.done).toBe(true);
      expect(overdue.done).toBe(true);

      expect(paid.data.length).toBe(2); // 2 Paid
      expect(unpaid.data.length).toBe(1); // 1 Unpaid
      expect(pending.data.length).toBe(1); // 1 Pending
      expect(overdue.data.length).toBe(1); // 1 Overdue
    });
  });

  describe('Date Filtering Integration', () => {
    it('should filter data by date ranges', async () => {
      const collections = getTenantCollections('test-company');

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Insert attendance with different dates
      await collections.attendance.insertMany([
        { date: today, status: 'Present', employeeId: new ObjectId() },
        { date: yesterday, status: 'Present', employeeId: new ObjectId() },
        { date: lastWeek, status: 'Present', employeeId: new ObjectId() }
      ]);

      const adminService = await import('../../services/admin/admin.services.js');

      const todayResult = await adminService.getAttendanceOverview('test-company', 'today', null);
      const allResult = await adminService.getAttendanceOverview('test-company', 'all', null);

      expect(todayResult.done).toBe(true);
      expect(allResult.done).toBe(true);
      expect(todayResult.data.total).toBe(1);
      expect(allResult.data.total).toBe(3);
    });
  });
});

describe('Super Admin Dashboard - Integration Tests', () => {
  describe('getRecentlyRegistered Integration', () => {
    beforeEach(async () => {
      // Setup superadmin database
      const { getsuperadminCollections } = await import('../../config/db.js');
      const { companiesCollection } = getsuperadminCollections();

      await companiesCollection.deleteMany({});

      // Insert test companies with userCount
      await companiesCollection.insertMany([
        {
          name: 'Company A',
          domain: 'companya',
          plan_name: 'Enterprise',
          plan_type: 'Yearly',
          logo: 'companya.png',
          status: 'Active',
          userCount: 100,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-15'),
          email: 'admin@companya.com'
        },
        {
          name: 'Company B',
          domain: 'companyb',
          plan_name: 'Premium',
          plan_type: 'Monthly',
          logo: 'companyb.png',
          status: 'Active',
          userCount: 50,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-16'),
          email: 'admin@companyb.com'
        },
        {
          name: 'No Domain Company',
          domain: '',
          plan_name: 'Basic',
          plan_type: 'Monthly',
          logo: '',
          status: 'Active',
          userCount: 10,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-17'),
          email: 'admin@nodomain.com'
        }
      ]);
    });

    it('should return companies with real domains from environment', async () => {
      const dashboardService = await import('../../services/superadmin/dashboard.services.js');
      const result = await dashboardService.getRecentlyRegistered();

      expect(result.done).toBe(true);
      expect(result.data.length).toBe(3);

      const companyA = result.data.find(c => c.name === 'Company A');
      const companyB = result.data.find(c => c.name === 'Company B');
      const noDomain = result.data.find(c => c.name === 'No Domain Company');

      expect(companyA.domain).toBe('companya.testdomain.com');
      expect(companyB.domain).toBe('companyb.testdomain.com');
      expect(noDomain.domain).toBe('Not configured');
    });

    it('should return consistent userCount across calls', async () => {
      const dashboardService = await import('../../services/superadmin/dashboard.services.js');

      const result1 = await dashboardService.getRecentlyRegistered();
      const result2 = await dashboardService.getRecentlyRegistered();

      result1.data.forEach((company, index) => {
        const company2 = result2.data.find(c => c.id === company.id);
        expect(company2.users).toBe(company.users);
        expect(company.users).not.toBeNaN();
        expect(company.users).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not generate random values', async () => {
      const dashboardService = await import('../../services/superadmin/dashboard.services.js');

      const results = await Promise.all([
        dashboardService.getRecentlyRegistered(),
        dashboardService.getRecentlyRegistered(),
        dashboardService.getRecentlyRegistered()
      ]);

      // All three calls should return identical userCounts
      results.forEach((result, i) => {
        result.data.forEach((company) => {
          const otherResults = results.filter((_, idx) => idx !== i);
          otherResults.forEach((otherResult) => {
            const match = otherResult.data.find(c => c.id === company.id);
            expect(match.users).toBe(company.users);
          });
        });
      });
    });
  });

  describe('getRecentTransactions Integration', () => {
    it('should return actual transactions with package data', async () => {
      const { getsuperadminCollections } = await import('../../config/db.js');
      const { companiesCollection, packagesCollection } = getsuperadminCollections();

      await companiesCollection.deleteMany({});
      await packagesCollection.deleteMany({});

      const pkgId = new ObjectId();
      await packagesCollection.insertOne({
        _id: pkgId,
        plan_id: 'pkg_001',
        planName: 'Enterprise',
        planType: 'Yearly',
        price: 9999,
        status: 'Active'
      });

      await companiesCollection.insertOne({
        name: 'Transaction Test Company',
        plan_id: 'pkg_001',
        plan_name: 'Enterprise',
        plan_type: 'Yearly',
        logo: 'trans.png',
        createdAt: new Date('2026-01-15')
      });

      const dashboardService = await import('../../services/superadmin/dashboard.services.js');
      const result = await dashboardService.getRecentTransactions();

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const transaction = result.data[0];
      expect(transaction.company).toBe('Transaction Test Company');
      expect(transaction.plan).toContain('Enterprise');
      expect(transaction.amount).toContain('9999');
    });
  });
});
