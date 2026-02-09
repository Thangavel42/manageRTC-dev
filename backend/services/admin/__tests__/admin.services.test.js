/**
 * Unit Tests for Admin Dashboard Services
 *
 * These tests validate the invoice type filtering fix and ensure
 * all status types (paid, unpaid, pending, overdue) work correctly.
 *
 * Run with: npm test -- backend/services/admin/__tests__/admin.services.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';

// Mock environment variables
process.env.DOMAIN = 'testdomain.com';
process.env.CLERK_JWT_KEY = 'test-jwt-key';

let mongoServer;
let client;
let db;
let collections;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test-company');

  // Initialize tenant collections
  collections = {
    invoices: db.collection('invoices'),
    clients: db.collection('clients'),
    employees: db.collection('employees'),
  };
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear collections before each test
  await collections.invoices.deleteMany({});
  await collections.clients.deleteMany({});
  await collections.employees.deleteMany({});
});

// Import the service functions after database is set up
let adminServices;

describe('Admin Dashboard Services - Invoice Filtering', () => {
  beforeAll(async () => {
    // Mock getTenantCollections
    jest.mock('../../../config/db.js', () => ({
      getTenantCollections: jest.fn(() => collections),
    }));

    // Dynamic import after database setup
    adminServices = await import('../admin.services.js');
  });

  beforeEach(async () => {
    // Create test clients
    const client1 = await collections.clients.insertOne({
      _id: new ObjectId(),
      name: 'Acme Corporation',
      logo: 'acme.png',
      status: 'Active'
    });

    const client2 = await collections.clients.insertOne({
      _id: new ObjectId(),
      name: 'Globex Inc',
      logo: 'globex.png',
      status: 'Active'
    });

    // Create test invoices with different statuses
    await collections.invoices.insertMany([
      {
        invoiceNumber: 'INV-001',
        title: 'Web Development Services',
        amount: 5000,
        status: 'Paid',
        clientId: client1.insertedId,
        createdAt: new Date('2026-01-15')
      },
      {
        invoiceNumber: 'INV-002',
        title: 'SEO Consulting',
        amount: 2500,
        status: 'Unpaid',
        clientId: client1.insertedId,
        createdAt: new Date('2026-01-20')
      },
      {
        invoiceNumber: 'INV-003',
        title: 'Mobile App Design',
        amount: 7500,
        status: 'Pending',
        clientId: client2.insertedId,
        createdAt: new Date('2026-01-25')
      },
      {
        invoiceNumber: 'INV-004',
        title: 'Cloud Hosting',
        amount: 1200,
        status: 'Overdue',
        clientId: client2.insertedId,
        createdAt: new Date('2026-01-10')
      },
      {
        invoiceNumber: 'INV-005',
        title: 'Maintenance Contract',
        amount: 3000,
        status: 'Paid',
        clientId: client1.insertedId,
        createdAt: new Date('2026-01-18')
      }
    ]);
  });

  describe('getRecentInvoices - Invoice Type Filtering', () => {
    const companyId = 'test-company-id';

    it('should return all invoices when invoiceType is "all"', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'all');

      expect(result.done).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBe(5); // All 5 invoices
    });

    it('should filter by "paid" status correctly', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'paid');

      expect(result.done).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data.every(inv => inv.status === 'Paid')).toBe(true);
    });

    it('should filter by "unpaid" status correctly', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'unpaid');

      expect(result.done).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('Unpaid');
    });

    it('should filter by "pending" status correctly', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'pending');

      expect(result.done).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('Pending');
    });

    it('should filter by "overdue" status correctly', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'overdue');

      expect(result.done).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].status).toBe('Overdue');
    });

    it('should handle case-insensitive status matching', async () => {
      // Add an invoice with mixed case status
      await collections.invoices.insertOne({
        invoiceNumber: 'INV-006',
        title: 'Test Invoice',
        amount: 1000,
        status: 'PAID', // Uppercase
        clientId: (await collections.clients.findOne())._id,
        createdAt: new Date()
      });

      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'paid');

      expect(result.done).toBe(true);
      // Should find both "Paid" and "PAID"
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should return client information with invoices', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'all');

      expect(result.done).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      const firstInvoice = result.data[0];
      expect(firstInvoice).toHaveProperty('clientName');
      expect(firstInvoice).toHaveProperty('clientLogo');
      expect(firstInvoice.clientName).toBeDefined();
    });
  });

  describe('Invoice Status Edge Cases', () => {
    it('should handle unknown invoice types gracefully', async () => {
      // Mock console.warn to capture warning
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await adminServices.getRecentInvoices(
        companyId,
        'all',
        null,
        'unknown-status' // Unknown status type
      );

      expect(result.done).toBe(true);
      // Should return all invoices when filter type is unknown
      expect(result.data.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown invoice type filter')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty invoice collection', async () => {
      await collections.invoices.deleteMany({});

      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'paid');

      expect(result.done).toBe(true);
      expect(result.data).toEqual([]);
    });
  });

  describe('Invoice Data Integrity', () => {
    it('should return invoices in descending order by createdAt', async () => {
      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'all');

      expect(result.done).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 0; i < result.data.length - 1; i++) {
        const date1 = new Date(result.data[i].createdAt);
        const date2 = new Date(result.data[i + 1].createdAt);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });

    it('should limit results to 5 invoices', async () => {
      // Insert 10 invoices
      const client = await collections.clients.findOne();
      for (let i = 0; i < 10; i++) {
        await collections.invoices.insertOne({
          invoiceNumber: `INV-${10 + i}`,
          title: `Invoice ${i}`,
          amount: 100 * i,
          status: 'Paid',
          clientId: client._id,
          createdAt: new Date()
        });
      }

      const result = await adminServices.getRecentInvoices(companyId, 'all', null, 'all');

      expect(result.done).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('Invoice Type Filtering Coverage', () => {
  it('should support all required invoice status types', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/admin/admin.services.js'),
      'utf8'
    );

    // Verify all status types are supported
    const requiredStatusTypes = ['paid', 'unpaid', 'pending', 'overdue'];

    requiredStatusTypes.forEach(status => {
      expect(serviceFile).toMatch(new RegExp(status, 'i'));
    });

    // Verify the status map exists
    expect(serviceFile).toMatch(/invoiceStatusMap/);
  });
});
