/**
 * Unit Tests for Super Admin Dashboard Services
 *
 * These tests ensure that mock data is NOT generated and that
 * all data comes from actual database queries.
 *
 * Run with: npm test -- backend/services/superadmin/__tests__/dashboard.services.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

// Mock environment variables
process.env.DOMAIN = 'testdomain.com';
process.env.CLERK_JWT_KEY = 'test-jwt-key';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';

// Mock the database configuration
let mongoServer;
let client;
let db;
let collections;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('AmasQIS');

  // Initialize collections
  collections = {
    companiesCollection: db.collection('companies'),
    packagesCollection: db.collection('packages'),
  };
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await collections.companiesCollection.deleteMany({});
  await collections.packagesCollection.deleteMany({});
});

afterEach(() => {
  jest.clearAllMocks();
});

// Import the service functions after database is set up
let dashboardServices;

describe('Super Admin Dashboard Services', () => {
  beforeAll(async () => {
    // Dynamic import after database setup
    dashboardServices = await import('../dashboard.services.js');

    // Mock getTenantCollections to avoid needing actual tenant databases
    jest.mock('../../../config/db.js', () => ({
      getsuperadminCollections: () => collections,
      getTenantCollections: jest.fn((companyId) => ({
        employees: {
          countDocuments: jest.fn().mockResolvedValue(5), // Mock: 5 active employees
        }
      }))
    }));
  });

  describe('getRecentlyRegistered', () => {
    beforeEach(async () => {
      // Create test packages
      await collections.packagesCollection.insertMany([
        {
          _id: new ObjectId(),
          plan_id: 'plan_basic',
          planName: 'Basic',
          planType: 'Monthly',
          price: 99,
          status: 'Active'
        },
        {
          _id: new ObjectId(),
          plan_id: 'plan_enterprise',
          planName: 'Enterprise',
          planType: 'Yearly',
          price: 999,
          status: 'Active'
        }
      ]);

      // Create test companies with cached userCount
      await collections.companiesCollection.insertMany([
        {
          name: 'Test Company 1',
          domain: 'test1',
          plan_id: 'plan_basic',
          plan_name: 'Basic',
          plan_type: 'Monthly',
          logo: 'logo1.png',
          status: 'Active',
          // PHASE 2: Cached userCount
          userCount: 15,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-15'),
          email: 'test1@example.com'
        },
        {
          name: 'Test Company 2',
          domain: 'test2',
          plan_id: 'plan_enterprise',
          plan_name: 'Enterprise',
          plan_type: 'Yearly',
          logo: 'logo2.png',
          status: 'Active',
          userCount: 42,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-16'),
          email: 'test2@example.com'
        },
        {
          name: 'Company Without Domain',
          domain: '',
          plan_id: 'plan_basic',
          plan_name: 'Basic',
          plan_type: 'Monthly',
          logo: '',
          status: 'Active',
          userCount: 8,
          userCountLastUpdated: new Date(),
          createdAt: new Date('2026-01-17'),
          email: 'nodomain@example.com'
        }
      ]);
    });

    it('should return companies with real userCount, not Math.random()', async () => {
      const result = await dashboardServices.getRecentlyRegistered();

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      // CRITICAL: Verify userCount is NOT random
      // Call twice and verify same result
      const result2 = await dashboardServices.getRecentlyRegistered();

      result.data.forEach((company, index) => {
        const company2 = result2.data.find(c => c.id === company.id);
        expect(company2.users).toBe(company.users);
        expect(company.users).toBeGreaterThanOrEqual(0);
        expect(company.users).toBeLessThan(10000); // Reasonable upper bound
      });
    });

    it('should use cached userCount from database', async () => {
      const result = await dashboardServices.getRecentlyRegistered();

      expect(result.done).toBe(true);

      // Verify companies have expected userCount values
      const company1 = result.data.find(c => c.name === 'Test Company 1');
      expect(company1.users).toBe(15);

      const company2 = result.data.find(c => c.name === 'Test Company 2');
      expect(company2.users).toBe(42);

      const companyNoDomain = result.data.find(c => c.name === 'Company Without Domain');
      expect(companyNoDomain.users).toBe(8);
    });

    it('should return actual domain or "Not configured", not .example.com', async () => {
      const result = await dashboardServices.getRecentlyRegistered();

      expect(result.done).toBe(true);

      // Check that no domain contains .example.com
      result.data.forEach(company => {
        if (company.domain !== 'Not configured') {
          expect(company.domain).not.toContain('.example.com');
          expect(company.domain).toMatch(/testdomain\.com$/);
        } else {
          expect(company.domain).toBe('Not configured');
        }
      });

      // Verify specific companies
      const company1 = result.data.find(c => c.name === 'Test Company 1');
      expect(company1.domain).toBe('test1.testdomain.com');

      const companyNoDomain = result.data.find(c => c.name === 'Company Without Domain');
      expect(companyNoDomain.domain).toBe('Not configured');
    });

    it('should return all required fields for each company', async () => {
      const result = await dashboardServices.getRecentlyRegistered();

      expect(result.done).toBe(true);

      const firstCompany = result.data[0];
      expect(firstCompany).toHaveProperty('id');
      expect(firstCompany).toHaveProperty('name');
      expect(firstCompany).toHaveProperty('logo');
      expect(firstCompany).toHaveProperty('domain');
      expect(firstCompany).toHaveProperty('plan');
      expect(firstCompany).toHaveProperty('users');
      expect(firstCompany).toHaveProperty('registeredDate');
    });
  });

  describe('getDashboardStats', () => {
    it('should return accurate statistics without mock data', async () => {
      // Create test data
      await collections.packagesCollection.insertOne({
        _id: new ObjectId(),
        plan_id: 'plan_premium',
        planName: 'Premium',
        planType: 'Monthly',
        price: 299,
        status: 'Active'
      });

      await collections.companiesCollection.insertMany([
        { name: 'Active Company 1', status: 'Active', plan_id: 'plan_premium', createdAt: new Date() },
        { name: 'Active Company 2', status: 'Active', plan_id: 'plan_premium', createdAt: new Date() },
        { name: 'Inactive Company', status: 'Inactive', plan_id: 'plan_premium', createdAt: new Date() }
      ]);

      const result = await dashboardServices.getDashboardStats();

      expect(result.done).toBe(true);
      expect(result.data.totalCompanies).toBe(3);
      expect(result.data.activeCompanies).toBe(2);
      expect(result.data.inactiveCompanies).toBe(1);
      expect(result.data.totalEarnings).toBe(598); // 2 * 299
    });
  });

  describe('getRecentTransactions', () => {
    it('should return actual transactions from database', async () => {
      const pkgId = new ObjectId();
      await collections.packagesCollection.insertOne({
        _id: pkgId,
        plan_id: 'plan_basic',
        planName: 'Basic',
        planType: 'Monthly',
        price: 99,
        status: 'Active'
      });

      await collections.companiesCollection.insertOne({
        name: 'Transaction Company',
        plan_id: 'plan_basic',
        plan_name: 'Basic',
        plan_type: 'Monthly',
        logo: 'test-logo.png',
        createdAt: new Date('2026-01-15')
      });

      const result = await dashboardServices.getRecentTransactions();

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);

      const transaction = result.data[0];
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('company');
      expect(transaction).toHaveProperty('transactionId');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('plan');
    });
  });

  describe('getExpiredPlans', () => {
    it('should calculate expiry dates correctly, not use random values', async () => {
      // Create a company with an old plan (should be expired)
      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 2); // 2 months ago

      await collections.companiesCollection.insertOne({
        name: 'Expired Company',
        plan_name: 'Basic',
        plan_type: 'Monthly',
        logo: 'logo.png',
        createdAt: oldDate,
        status: 'Active'
      });

      const result = await dashboardServices.getExpiredPlans();

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();

      // Verify expiry date is calculated, not random
      if (result.data.length > 0) {
        const expired = result.data[0];
        expect(expired).toHaveProperty('expiredDate');
        expect(expired.expiredDate).toMatch(/\d{1,2} \w{3} \d{4}/); // Date format like "15 Jan 2026"
      }
    });
  });
});

describe('Mock Data Prevention Tests', () => {
  it('should not contain Math.random() in the codebase', async () => {
    // This test ensures no one accidentally reintroduces mock data
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/superadmin/dashboard.services.js'),
      'utf8'
    );

    // Check for Math.random() usage
    expect(serviceFile).not.toMatch(/Math\.random\(\)/);
    expect(serviceFile).not.toMatch(/\.example\.com/);
  });

  it('should not contain hardcoded user counts', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/superadmin/dashboard.services.js'),
      'utf8'
    );

    // Check for hardcoded numbers that look like fake user counts
    expect(serviceFile).not.toMatch(/userCount\s*=\s*\(Math\.floor/);
    });
});
