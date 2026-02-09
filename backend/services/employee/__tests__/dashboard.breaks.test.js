/**
 * Unit Tests for Employee Dashboard - Break Tracking Functions
 *
 * Tests for the fixed break tracking functionality:
 * - startBreak()
 * - resumeBreak()
 * - getLastDayTimings()
 *
 * Run with: npm test -- backend/services/employee/__tests__/dashboard.breaks.test.js
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

describe('Employee Dashboard - Break Tracking Tests', () => {
  beforeEach(async () => {
    // Setup company details
    await collections.details.insertOne({
      timeZone: 'Asia/Kolkata',
      punchInTime: '09:00',
      punchOutTime: '18:00',
      lateBufferMinutes: 15,
      absentCutoffMinutes: 60,
      totalWorkingDays: 22,
      totalLeavesAllowed: 12,
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
      avatar: 'avatar.png',
      timeZone: 'Asia/Kolkata',
    });
  });

  describe('startBreak()', () => {
    it('should successfully start a break after punch-in', async () => {
      // Create attendance record with punch-in
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '0',
      });

      // Import and test function
      const { startBreak } = await import('../dashboard.services.js');
      const result = await startBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(true);
      expect(result.message).toBe('Break Started successfully!');

      // Verify break was added to attendance
      const attendance = await collections.attendance.findOne({
        userId: 'test-employee-123',
      });
      expect(attendance.breakDetails).toHaveLength(1);
      expect(attendance.breakDetails[0].start).toBeDefined();
      expect(attendance.breakDetails[0].end).toBeNull();
    });

    it('should fail when no attendance record exists', async () => {
      const { startBreak } = await import('../dashboard.services.js');
      const result = await startBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(false);
      expect(result.error).toBe('No attendance record found. Please punch in first.');
    });

    it('should fail when an active break already exists', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 2 }).toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [{ start: now.minus({ minutes: 30 }).toJSDate(), end: null }],
        totalBreakMins: 0,
        totalProductiveHours: '1.5',
      });

      const { startBreak } = await import('../dashboard.services.js');
      const result = await startBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(false);
      expect(result.error).toBe('An active break is already in progress.');
    });

    it('should handle multiple breaks in a single day', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 4 }).toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [
          {
            start: now.minus({ hours: 3 }).toJSDate(),
            end: now.minus({ hours: 2, minutes: 45 }).toJSDate(),
          },
        ],
        totalBreakMins: 15,
        totalProductiveHours: '3.5',
      });

      const { startBreak } = await import('../dashboard.services.js');
      const result = await startBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(true);

      const attendance = await collections.attendance.findOne({
        userId: 'test-employee-123',
      });
      expect(attendance.breakDetails).toHaveLength(2);
    });

    it('should correctly use userId instead of ObjectId for queries', async () => {
      // This test verifies the ID consistency fix
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      // Create attendance with userId as string (not ObjectId)
      await collections.attendance.insertOne({
        userId: 'test-employee-123', // String, not ObjectId
        date: today,
        punchIn: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '0',
      });

      const { startBreak } = await import('../dashboard.services.js');
      const result = await startBreak('test-company', 'test-employee-123');

      // Should succeed because query now uses userId: employeeId correctly
      expect(result.done).toBe(true);
    });
  });

  describe('resumeBreak()', () => {
    it('should successfully end a break and calculate duration', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();
      const breakStart = now.minus({ minutes: 15 });

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 2 }).toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [{ start: breakStart.toJSDate(), end: null }],
        totalBreakMins: 0,
        totalProductiveHours: '1.75',
      });

      const { resumeBreak } = await import('../dashboard.services.js');
      const result = await resumeBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(true);
      expect(result.data.totalBreakMins).toBeGreaterThan(14); // ~15 minutes
      expect(result.data.totalBreakMins).toBeLessThan(17); // Allow some tolerance

      // Verify break was ended
      const attendance = await collections.attendance.findOne({
        userId: 'test-employee-123',
      });
      const lastBreak = attendance.breakDetails[attendance.breakDetails.length - 1];
      expect(lastBreak.end).toBeDefined();
    });

    it('should fail when no attendance record exists', async () => {
      const { resumeBreak } = await import('../dashboard.services.js');
      const result = await resumeBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(false);
      expect(result.error).toBe('No attendance record found. Please punch in first.');
    });

    it('should fail when no active break exists', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '0',
      });

      const { resumeBreak } = await import('../dashboard.services.js');
      const result = await resumeBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(false);
      expect(result.error).toBe('No active break found to resume.');
    });

    it('should correctly sum total break time across multiple breaks', async () => {
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: today,
        punchIn: now.minus({ hours: 5 }).toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [
          {
            start: now.minus({ hours: 4 }).toJSDate(),
            end: now.minus({ hours: 3, minutes: 45 }).toJSDate(),
          },
          {
            start: now.minus({ hours: 2 }).toJSDate(),
            end: null, // Active break
          },
        ],
        totalBreakMins: 15, // First break was 15 mins
        totalProductiveHours: '4.5',
      });

      const { resumeBreak } = await import('../dashboard.services.js');
      const result = await resumeBreak('test-company', 'test-employee-123');

      expect(result.done).toBe(true);
      // Should have approximately 15 + (second break duration) minutes
      expect(result.data.totalBreakMins).toBeGreaterThan(15);
    });

    it('should correctly use userId instead of ObjectId for queries', async () => {
      // This test verifies the ID consistency fix
      const now = DateTime.utc();
      const today = now.startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123', // String, not ObjectId
        date: today,
        punchIn: now.toJSDate(),
        attendanceStatus: 'onTime',
        breakDetails: [{ start: now.minus({ minutes: 10 }).toJSDate(), end: null }],
        totalBreakMins: 0,
        totalProductiveHours: '0.17',
      });

      const { resumeBreak } = await import('../dashboard.services.js');
      const result = await resumeBreak('test-company', 'test-employee-123');

      // Should succeed because query now uses userId: employeeId correctly
      expect(result.done).toBe(true);
    });
  });

  describe('getLastDayTimings()', () => {
    it('should return timings for the most recent attendance record', async () => {
      const now = DateTime.utc();
      const yesterday = now.minus({ days: 1 }).startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: yesterday,
        punchIn: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
        punchOut: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000), // 6:00 PM
        attendanceStatus: 'onTime',
        breakDetails: [
          {
            start: new Date(yesterday.getTime() + 12.5 * 60 * 60 * 1000), // 12:30 PM
            end: new Date(yesterday.getTime() + 13.5 * 60 * 60 * 1000), // 1:30 PM
          },
        ],
        totalBreakMins: 60,
        totalProductiveHours: '8',
      });

      const { getLastDayTimmings } = await import('../dashboard.services.js');
      const result = await getLastDayTimmings('test-company', 'test-employee-123');

      expect(result.done).toBe(true);
      expect(result.data.punchInTime).toMatch(/\d{2}:\d{2}/);
      expect(result.data.punchOut).toMatch(/\d{2}:\d{2}/);
      expect(result.data.breakDetails).toHaveLength(1);
    });

    it('should return timings with overtime if approved', async () => {
      const now = DateTime.utc();
      const yesterday = now.minus({ days: 1 }).startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123',
        date: yesterday,
        punchIn: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000),
        punchOut: new Date(yesterday.getTime() + 20 * 60 * 60 * 1000), // 8:00 PM (2 hours overtime)
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '11',
        overtimeRequestStatus: 'approved',
        overtimeHours: 2,
        expectedOvertimeHours: 2,
      });

      const { getLastDayTimmings } = await import('../dashboard.services.js');
      const result = await getLastDayTimmings('test-company', 'test-employee-123');

      expect(result.done).toBe(true);
      expect(result.data.shiftEnd).toBeDefined();
      expect(result.data.overtimeStart).toBeDefined();
    });

    it('should fail when employee not found', async () => {
      const { getLastDayTimmings } = await import('../dashboard.services.js');
      const result = await getLastDayTimmings('test-company', 'non-existent-employee');

      expect(result.done).toBe(false);
      expect(result.error).toBe('Employee not found in this company.');
    });

    it('should fail when no attendance records exist', async () => {
      // Employee exists but no attendance
      await collections.attendance.deleteMany({});

      const { getLastDayTimmings } = await import('../dashboard.services.js');
      const result = await getLastDayTimmings('test-company', 'test-employee-123');

      expect(result.done).toBe(false);
      expect(result.error).toBe('No valid attendance record found.');
    });

    it('should correctly use userId instead of ObjectId for queries', async () => {
      // This test verifies the ID consistency fix
      const now = DateTime.utc();
      const yesterday = now.minus({ days: 1 }).startOf('day').toUTC().toJSDate();

      await collections.attendance.insertOne({
        userId: 'test-employee-123', // String, not ObjectId
        date: yesterday,
        punchIn: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000),
        punchOut: new Date(yesterday.getTime() + 17 * 60 * 60 * 1000),
        attendanceStatus: 'onTime',
        breakDetails: [],
        totalBreakMins: 0,
        totalProductiveHours: '8',
      });

      const { getLastDayTimmings } = await import('../dashboard.services.js');
      const result = await getLastDayTimmings('test-company', 'test-employee-123');

      // Should succeed because query now uses userId: employeeId correctly
      expect(result.done).toBe(true);
      expect(result.data.punchInTime).toBeDefined();
    });
  });
});

describe('Employee Dashboard - ID Consistency Verification', () => {
  it('should not contain ObjectId(employeeId) conversions in break functions', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/employee/dashboard.services.js'),
      'utf8'
    );

    // Check that startBreak doesn't use ObjectId conversion for employeeId
    const startBreakMatch = serviceFile.match(/export const startBreak[\s\S]*?^}/m);
    expect(startBreakMatch).toBeTruthy();
    expect(startBreakMatch[0]).not.toMatch(/_id:\s*new\s*ObjectId\(employeeId\)/);
    expect(startBreakMatch[0]).not.toMatch(/employeeId:\s*new\s*ObjectId\(employeeId\)/);

    // Check that resumeBreak doesn't use ObjectId conversion for employeeId
    const resumeBreakMatch = serviceFile.match(/export const resumeBreak[\s\S]*?^}/m);
    expect(resumeBreakMatch).toBeTruthy();
    expect(resumeBreakMatch[0]).not.toMatch(/_id:\s*new\s*ObjectId\(employeeId\)/);
    expect(resumeBreakMatch[0]).not.toMatch(/employeeId:\s*new\s*ObjectId\(employeeId\)/);
  });

  it('should use userId field for employee queries in break functions', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const serviceFile = fs.readFileSync(
      path.join(process.cwd(), 'backend/services/employee/dashboard.services.js'),
      'utf8'
    );

    // Verify userId is used correctly
    expect(serviceFile).toMatch(/userId:\s*employeeId/g);
  });
});
