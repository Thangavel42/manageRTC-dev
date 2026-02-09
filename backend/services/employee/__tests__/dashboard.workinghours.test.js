/**
 * Unit Tests for Employee Dashboard - Working Hours & Team Members
 *
 * Tests for the fixed functions:
 * - getWorkingHoursStats()
 * - getTeamMembers()
 *
 * Run with: npm test -- backend/services/employee/__tests__/dashboard.workinghours.test.js
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, ObjectId } from 'mongodb';
import { DateTime } from 'luxon';

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

  collections = {
    employees: db.collection('employees'),
    attendance: db.collection('attendance'),
    details: db.collection('details'),
  };
});

afterAll(async () => {
  await client.close();
  await mongoServer.stop();
});

beforeEach(async () => {
  await collections.employees.deleteMany({});
  await collections.attendance.deleteMany({});
  await collections.details.deleteMany({});
});

describe('Employee Dashboard - Working Hours Tests', () => {
  beforeEach(async () => {
    // Setup company details
    await collections.details.insertOne({
      timeZone: 'Asia/Kolkata',
      totalWorkHoursPerDay: 8,
      totalWorkHoursPerWeek: 40,
      totalWorkHoursPerMonth: 160,
      totalOvertimePerMonth: 10,
    });

    // Create test employee
    await collections.employees.insertOne({
      _id: new ObjectId(),
      userId: 'test-employee-123',
      firstName: 'John',
      lastName: 'Doe',
      designation: 'Developer',
      department: 'Engineering',
      role: 'employee',
      status: 'Active',
    });
  });

  describe('getWorkingHoursStats()', () => {
    it('should calculate today\'s worked hours correctly', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      // Create attendance record with 4 hours worked
      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 4 }).toJSDate(),
        punchOut: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [{ start: now.minus({ hours: 3 }).toJSDate(), end: now.minus({ hours: 2, minutes: 45 }).toJSDate() }],
        totalBreakMins: 15,
        totalProductiveHours: '4', // String in hours
      });

      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      expect(result.data.today.workedHours).toBeCloseTo(4, 0); // 4 hours
      expect(result.data.today.breakHours).toBeCloseTo(0.25, 1); // 15 mins = 0.25 hours
      expect(result.data.today.expectedHours).toBe(8);
    });

    it('should calculate weekly hours correctly', async () => {
      const now = DateTime.utc();
      const startOfWeek = now.startOf('week').toUTC().toJSDate();

      // Create 5 days of attendance, 8 hours each
      for (let i = 0; i < 5; i++) {
        const date = new Date(startOfWeek.getTime() + i * 24 * 60 * 60 * 1000);
        await collections.attendance.insertOne({
          userId: 'test-employee-123',
          date: date,
          punchIn: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          punchOut: new Date(date.getTime() + 18 * 60 * 60 * 1000),
          attendanceStatus: 'onTime',
          breakDetails: [],
          totalBreakMins: 0,
          totalProductiveHours: '8',
        });
      }

      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      expect(result.data.thisWeek.workedHours).toBeCloseTo(40, 0); // 5 * 8 = 40 hours
      expect(result.data.thisWeek.expectedHours).toBe(40);
    });

    it('should calculate monthly hours with overtime', async () => {
      const now = DateTime.utc();
      const startOfMonth = now.startOf('month').toUTC().toJSDate();

      // Create 20 days of attendance, some with overtime
      for (let i = 0; i < 20; i++) {
        const date = new Date(startOfMonth.getTime() + i * 24 * 60 * 60 * 1000);
        const hours = i < 5 ? 9 : 8; // First 5 days have 1 hour overtime each

        await collections.attendance.insertOne({
          userId: 'test-employee-123',
          date: date,
          punchIn: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          punchOut: new Date(date.getTime() + (17 + (hours - 8)) * 60 * 60 * 1000),
          attendanceStatus: 'onTime',
          breakDetails: [],
          totalBreakMins: 0,
          totalProductiveHours: hours.toString(),
        });
      }

      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      expect(result.data.thisMonth.workedHours).toBeCloseTo(165, 0); // 20 * 8.25 = 165 hours
      expect(result.data.thisMonth.overtimeHours).toBe(5); // 5 hours overtime
    });

    it('should handle empty attendance records gracefully', async () => {
      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      expect(result.data.today.workedHours).toBe(0);
      expect(result.data.thisWeek.workedHours).toBe(0);
      expect(result.data.thisMonth.workedHours).toBe(0);
    });

    it('should correctly parse totalProductiveHours from string to number', async () => {
      // This test verifies the field mismatch fix
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 6 }).toJSDate(),
        punchOut: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '6.5', // String in hours, not a number
      });

      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      // Should parse '6.5' as 6.5 hours
      expect(result.data.today.workedHours).toBeCloseTo(6.5, 0);
    });

    it('should handle totalProductiveHours with decimal values', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 5 }).toJSDate(),
        punchOut: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [
          { start: now.minus({ hours: 4 }).toJSDate(), end: now.minus({ hours: 3, minutes: 30 }).toJSDate() }
        ],
        totalBreakMins: 30,
        totalProductiveHours: '4.5', // 4.5 hours
      });

      const { getWorkingHoursStats } = await import('../dashboard.services.js');
      const result = await getWorkingHoursStats('test-company', 'test-employee-123', 2026);

      expect(result.done).toBe(true);
      expect(result.data.today.workedHours).toBeCloseTo(4.5, 0);
      expect(result.data.today.breakHours).toBeCloseTo(0.5, 1); // 30 mins = 0.5 hours
    });
  });
});

describe('Employee Dashboard - Team Members Tests', () => {
  let managerId;
  let employeeIds;

  beforeEach(async () => {
    // Create manager employee
    const managerResult = await collections.employees.insertOne({
      userId: 'manager-123',
      firstName: 'Jane',
      lastName: 'Manager',
      designation: 'Team Lead',
      department: 'Engineering',
      role: 'admin',
      status: 'Active',
    });
    managerId = managerResult.insertedId;

    // Create employees who report to this manager
    const employees = [
      { userId: 'emp-1', firstName: 'Alice', lastName: 'Smith', reportingTo: managerId },
      { userId: 'emp-2', firstName: 'Bob', lastName: 'Jones', reportingTo: managerId },
      { userId: 'emp-3', firstName: 'Charlie', lastName: 'Brown', reportingTo: managerId },
    ];

    const inserted = await collections.employees.insertMany(employees);
    employeeIds = inserted.insertedIds;
  });

  describe('getTeamMembers()', () => {
    it('should return employees who report to the current employee', async () => {
      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'manager-123');

      expect(result.done).toBe(true);
      expect(result.data).toHaveLength(3);

      const names = result.data.map(e => `${e.firstName} ${e.lastName}`);
      expect(names).toContain('Alice Smith');
      expect(names).toContain('Bob Jones');
      expect(names).toContain('Charlie Brown');
    });

    it('should return only required fields for team members', async () => {
      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'manager-123');

      expect(result.done).toBe(true);
      const member = result.data[0];

      expect(member).toHaveProperty('_id');
      expect(member).toHaveProperty('firstName');
      expect(member).toHaveProperty('lastName');
      expect(member).toHaveProperty('avatar');
      expect(member).toHaveProperty('role');
      // Should NOT have other fields
      expect(member).not.toHaveProperty('userId');
      expect(member).not.toHaveProperty('department');
    });

    it('should return empty array when employee has no reports', async () => {
      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'emp-1');

      expect(result.done).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should fail when employee not found', async () => {
      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'non-existent');

      expect(result.done).toBe(false);
      expect(result.error).toBe('Employee not found in this company.');
    });

    it('should correctly use reportingTo field for team lookup', async () => {
      // This test verifies the team members query fix
      // Query should use reportingTo: employee._id instead of leadId: employee.leadId

      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'manager-123');

      expect(result.done).toBe(true);
      // Should find employees where reportingTo matches manager's _id
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should only return active team members', async () => {
      // Add an inactive employee
      await collections.employees.insertOne({
        userId: 'emp-inactive',
        firstName: 'Inactive',
        lastName: 'Person',
        reportingTo: managerId,
        status: 'Inactive',
      });

      const { getTeamMembers } = await import('../dashboard.services.js');
      const result = await getTeamMembers('test-company', 'manager-123');

      expect(result.done).toBe(true);
      // Should still only return 3 active employees
      expect(result.data).toHaveLength(3);

      const names = result.data.map(e => e.firstName);
      expect(names).not.toContain('Inactive');
    });
  });
});

describe('Employee Dashboard - Field Mismatch Verification', () => {
  it('should not reference totalProductiveDuration in getWorkingHoursStats', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/employee/dashboard.services.js'),
      'utf8'
    );

    // The fix should have replaced totalProductiveDuration with proper parsing
    // Check that totalProductiveDuration is not used as a field access
    expect(serviceFile).not.toMatch(/rec\.totalProductiveDuration/);

    // Should instead parse totalProductiveHours
    expect(serviceFile).toMatch(/parseFloat\(rec\.totalProductiveHours/);
  });

  it('should not use leadId: employee.leadId in getTeamMembers', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/employee/dashboard.services.js'),
      'utf8'
    );

    // Check that leadId: employee.leadId is not used
    expect(serviceFile).not.toMatch(/\$match:\s*\{\s*leadId:\s*employee\.leadId/);

    // Should use reportingTo: employee._id instead
    expect(serviceFile).toMatch(/\$match:\s*\{\s*reportingTo:\s*employee\._id/);
  });
});
