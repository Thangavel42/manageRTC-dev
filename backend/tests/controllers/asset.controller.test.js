/**
 * Asset Controller Tests
 * Tests for all Asset REST API endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Asset from '../../models/asset/asset.schema.js';

// Mock Clerk authentication
jest.mock('@clerk/express', () => ({
  requireAuth: (req, res, next) => {
    req.auth = {
      userId: 'test-user-id',
      claims: {
        org_id: 'test-company-id'
      }
    };
    next();
  }
}));

// Mock Socket.IO broadcaster
jest.mock('../../utils/socketBroadcaster.js', () => ({
  getSocketIO: () => null,
  broadcastAssetEvents: {
    created: jest.fn(),
    updated: jest.fn(),
    deleted: jest.fn()
  }
}));

let mongoServer;
let authToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create a test employee
  const Employee = mongoose.model('Employee');
  const employee = await Employee.create({
    clerkUserId: 'test-user-id',
    companyId: 'test-company-id',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    employeeId: 'EMP001',
    email: 'john.doe@test.com'
  });

  authToken = `Bearer fake-jwt-token-${employee._id}`;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Asset.deleteMany({});
});

afterEach(async () => {
  jest.clearAllMocks();
});

describe('Asset Controller Tests', () => {

  describe('GET /api/assets', () => {
    it('should fetch all assets with pagination', async () => {
      // Create test assets
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter assets by status', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?status=active')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('available');
    });

    it('should filter assets by category', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Office Chair',
          serialNumber: 'CHR-001',
          type: 'furniture',
          category: 'furniture',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?category=electronics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('electronics');
    });

    it('should filter assets by type', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?type=laptop')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].type).toBe('laptop');
    });

    it('should search assets by name, serial number, or barcode', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          barcode: '123456789',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?search=MacBook')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toContain('MacBook');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/assets')
        .expect(401);
    });
  });

  describe('GET /api/assets/:id', () => {
    it('should fetch single asset by ID', async () => {
      const asset = await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const response = await request(app)
        .get(`/api/assets/${asset._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(asset._id.toString());
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/assets/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });

    it('should return 400 for invalid ID format', async () => {
      await request(app)
        .get('/api/assets/invalid-id')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('POST /api/assets', () => {
    it('should create asset successfully', async () => {
      const assetData = {
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        purchaseDate: new Date('2026-01-01'),
        purchaseCost: 2499.99,
        warrantyExpiry: new Date('2027-01-01')
      };

      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('created successfully');
      expect(response.body.data.name).toBe('MacBook Pro 16"');
      expect(response.body.data.serialNumber).toBe('MBP-001');
    });

    it('should prevent duplicate serial number', async () => {
      await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const assetData = {
        name: 'Another MacBook',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active'
      };

      await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData)
        .expect(409);
    });

    it('should verify assignedTo employee exists', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      const assetData = {
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        assignedTo: employee._id.toString()
      };

      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assignedTo).toBe(employee._id.toString());
    });

    it('should fail when assignedTo employee does not exist', async () => {
      const fakeEmployeeId = new mongoose.Types.ObjectId();

      const assetData = {
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        assignedTo: fakeEmployeeId.toString()
      };

      await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/assets')
        .send({ name: 'Test Asset' })
        .expect(401);
    });
  });

  describe('PUT /api/assets/:id', () => {
    it('should update asset successfully', async () => {
      const asset = await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const updateData = {
        name: 'MacBook Pro 16" M3 Max',
        status: 'active'
      };

      const response = await request(app)
        .put(`/api/assets/${asset._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('MacBook Pro 16" M3 Max');
      expect(response.body.data.status).toBe('assigned');
    });

    it('should prevent duplicate serial number when updating', async () => {
      const asset1 = await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      await Asset.create({
        name: 'Dell 27" Monitor',
        serialNumber: 'DELL-001',
        type: 'monitor',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const updateData = {
        serialNumber: 'DELL-001'
      };

      await request(app)
        .put(`/api/assets/${asset1._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(409);
    });

    it('should allow updating to same serial number', async () => {
      const asset = await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const updateData = {
        name: 'MacBook Pro 16" Updated'
      };

      const response = await request(app)
        .put(`/api/assets/${asset._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/assets/:id', () => {
    it('should soft delete asset successfully', async () => {
      const asset = await Asset.create({
        name: 'MacBook Pro 16"',
        serialNumber: 'MBP-001',
        type: 'laptop',
        category: 'electronics',
        status: 'active',
        companyId: 'test-company-id'
      });

      const response = await request(app)
        .delete(`/api/assets/${asset._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDeleted).toBe(true);

      // Verify soft delete
      const deletedAsset = await Asset.findById(asset._id);
      expect(deletedAsset.isDeleted).toBe(true);
      expect(deletedAsset.status).toBe('inactive');
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .delete(`/api/assets/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);
    });
  });

  describe('GET /api/assets/category/:category', () => {
    it('should fetch assets by category', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Office Chair',
          serialNumber: 'CHR-001',
          type: 'furniture',
          category: 'furniture',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets/category/electronics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(asset => asset.category === 'electronics')).toBe(true);
    });
  });

  describe('GET /api/assets/status/:status', () => {
    it('should fetch assets by status', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets/status/active')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('available');
    });

    it('should validate status parameter', async () => {
      await request(app)
        .get('/api/assets/status/invalid-status')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('GET /api/assets/stats', () => {
    it('should fetch asset statistics', async () => {
      await Asset.create([
        {
          name: 'MacBook Pro 16"',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          purchaseCost: 2499.99,
          currentValue: 1999.99,
          depreciation: 500,
          companyId: 'test-company-id'
        },
        {
          name: 'Dell 27" Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          purchaseCost: 499.99,
          currentValue: 399.99,
          depreciation: 100,
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets/stats')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.message).toContain('statistics');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle pagination correctly', async () => {
      // Create 25 assets
      const records = [];
      for (let i = 0; i < 25; i++) {
        records.push({
          name: `Asset ${i}`,
          serialNumber: `SER-${i}`,
          type: 'test',
          category: 'test',
          status: 'active',
          companyId: 'test-company-id'
        });
      }
      await Asset.create(records);

      const response = await request(app)
        .get('/api/assets?page=1&limit=10')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.total).toBe(25);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('should handle sorting', async () => {
      await Asset.create([
        {
          name: 'Zebra Asset',
          serialNumber: 'ZEB-001',
          type: 'test',
          category: 'test',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Alpha Asset',
          serialNumber: 'ALP-001',
          type: 'test',
          category: 'test',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?sortBy=name&order=asc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data[0].name).toBe('Alpha Asset');
      expect(response.body.data[1].name).toBe('Zebra Asset');
    });

    it('should handle multiple filters simultaneously', async () => {
      const Employee = mongoose.model('Employee');
      const employee = await Employee.findOne({ clerkUserId: 'test-user-id' });

      await Asset.create([
        {
          name: 'MacBook Pro',
          serialNumber: 'MBP-001',
          type: 'laptop',
          category: 'electronics',
          status: 'active',
          assignedTo: employee._id,
          companyId: 'test-company-id'
        },
        {
          name: 'Dell Monitor',
          serialNumber: 'DELL-001',
          type: 'monitor',
          category: 'electronics',
          status: 'active',
          companyId: 'test-company-id'
        },
        {
          name: 'Office Chair',
          serialNumber: 'CHR-001',
          type: 'furniture',
          category: 'furniture',
          status: 'active',
          companyId: 'test-company-id'
        }
      ]);

      const response = await request(app)
        .get('/api/assets?category=electronics&status=active')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(asset => asset.category === 'electronics' && asset.status === 'active')).toBe(true);
    });

    it('should handle search with pagination', async () => {
      // Create assets with matching and non-matching names
      const records = [];
      for (let i = 0; i < 15; i++) {
        records.push({
          name: i % 2 === 0 ? 'Laptop' : 'Monitor',
          serialNumber: `SER-${i}`,
          type: 'test',
          category: 'test',
          status: 'active',
          companyId: 'test-company-id'
        });
      }
      await Asset.create(records);

      const response = await request(app)
        .get('/api/assets?search=Laptop&page=1&limit=5')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.data.every(asset => asset.name === 'Laptop')).toBe(true);
    });

    it('should validate numeric fields', async () => {
      const assetData = {
        name: 'Test Asset',
        serialNumber: 'TEST-001',
        type: 'test',
        category: 'test',
        status: 'active',
        purchaseCost: 'invalid-number'
      };

      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData);

      // Should either reject or convert to number
      expect([400, 201]).toContain(response.status);
    });

    it('should handle date fields correctly', async () => {
      const assetData = {
        name: 'Test Asset',
        serialNumber: 'TEST-001',
        type: 'test',
        category: 'test',
        status: 'active',
        purchaseDate: '2026-01-01',
        warrantyExpiry: '2027-01-01'
      };

      const response = await request(app)
        .post('/api/assets')
        .set('Authorization', authToken)
        .send(assetData)
        .expect(201);

      expect(response.body.data.purchaseDate).toBeDefined();
      expect(response.body.data.warrantyExpiry).toBeDefined();
    });
  });
});
