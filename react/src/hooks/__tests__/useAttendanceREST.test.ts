/**
 * useAttendanceREST Hook Tests
 * Tests for attendance REST API hook functionality
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { del as apiDel, get, post, put } from '../../services/api';
import { formatAttendanceDate, formatAttendanceTime, formatHours, toTableFormat, useAttendanceREST } from '../useAttendanceREST';

// Mock the API service
jest.mock('../../services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(() => Promise.resolve({ success: true })),
  buildParams: jest.fn((params) => new URLSearchParams(params).toString())
}));

// Mock Ant Design message
jest.mock('antd', () => ({
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn()
  },
  Spin: jest.fn(({ children, ...props }) => children || 'Loading...')
}));

describe('useAttendanceREST Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch controller if any
    global.fetchMockController = null;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockAttendanceData = [
    {
      _id: 'att-001',
      attendanceId: 'ATT-001',
      employeeId: 'emp-001',
      employeeName: 'John Doe',
      date: '2026-01-28T00:00:00.000Z',
      clockIn: { time: '2026-01-28T09:00:00.000Z', location: { type: 'office' } },
      clockOut: { time: '2026-01-28T17:00:00.000Z' },
      hoursWorked: 8,
      overtimeHours: 0,
      status: 'present',
      createdAt: '2026-01-28T00:00:00.000Z',
      updatedAt: '2026-01-28T00:00:00.000Z'
    },
    {
      _id: 'att-002',
      attendanceId: 'ATT-002',
      employeeId: 'emp-002',
      employeeName: 'Jane Smith',
      date: '2026-01-27T00:00:00.000Z',
      clockIn: { time: '2026-01-27T09:15:00.000Z' },
      clockOut: { time: '2026-01-27T17:30:00.000Z' },
      hoursWorked: 8.25,
      overtimeHours: 0.25,
      status: 'late',
      lateMinutes: 15,
      createdAt: '2026-01-27T00:00:00.000Z',
      updatedAt: '2026-01-27T00:00:00.000Z'
    }
  ];

  const mockStats = {
    total: 10,
    present: 8,
    absent: 1,
    halfDay: 1,
    late: 2,
    totalHoursWorked: '80.00',
    averageHoursPerDay: '8.00',
    attendanceRate: '80.00',
    lateRate: '20.00'
  };

  describe('Initial State', () => {
    test('should initialize with empty state', () => {
      const { result } = renderHook(() => useAttendanceREST());

      expect(result.current.attendance).toEqual([]);
      expect(result.current.myAttendance).toEqual([]);
      expect(result.current.stats).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('fetchAttendance', () => {
    test('should fetch attendance records successfully', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockAttendanceData,
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchAttendance();
      });

      expect(get).toHaveBeenCalledWith('/attendance', {
        params: undefined
      });
      expect(result.current.attendance).toEqual(mockAttendanceData);
      expect(result.current.loading).toBe(false);
    });

    test('should fetch with filters', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockAttendanceData.slice(0, 1)
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchAttendance({ status: 'present', page: 1, limit: 10 });
      });

      expect(get).toHaveBeenCalledWith('/attendance', {
        params: expect.any(String)
      });
    });

    test('should handle fetch errors', async () => {
      (get as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: { message: 'Failed to fetch attendance' }
          }
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchAttendance();
      });

      expect(result.current.error).toBeDefined();
    });

    test('should set loading state during fetch', async () => {
      let isLoading = true;
      (get as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            isLoading = false;
            resolve({
              success: true,
              data: mockAttendanceData
            });
          }, 100);
        });
      });

      const { result } = renderHook(() => useAttendanceREST());

      act(() => {
        result.current.fetchAttendance();
      });

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('fetchMyAttendance', () => {
    test('should fetch my attendance records', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockAttendanceData
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchMyAttendance();
      });

      expect(get).toHaveBeenCalledWith('/attendance/my', {
        params: undefined
      });
      expect(result.current.myAttendance).toEqual(mockAttendanceData);
    });

    test('should handle empty attendance', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: []
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchMyAttendance();
      });

      expect(result.current.myAttendance).toEqual([]);
    });
  });

  describe('clockIn', () => {
    test('should clock in successfully', async () => {
      (post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'att-003',
          attendanceId: 'ATT-003',
          clockIn: { time: new Date().toISOString() }
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.clockIn({
          time: new Date().toISOString(),
          location: { type: 'office' }
        });
      });

      expect(post).toHaveBeenCalledWith('/attendance', {
        clockIn: {
          time: expect.any(String),
          location: { type: 'office' }
        }
      });
      expect(success).toBe(true);
    });

    test('should handle clock in errors', async () => {
      (post as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: { message: 'Already clocked in today' }
          }
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.clockIn();
      });

      expect(success).toBe(false);
    });

    test('should clock in with default values', async () => {
      (post as jest.Mock).mockResolvedValue({
        success: true,
        data: {}
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.clockIn();
      });

      expect(post).toHaveBeenCalledWith('/attendance', {});
    });
  });

  describe('clockOut', () => {
    test('should clock out successfully', async () => {
      (put as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'att-001',
          clockOut: { time: new Date().toISOString() },
          hoursWorked: 8
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.clockOut('att-001', {
          time: new Date().toISOString()
        });
      });

      expect(put).toHaveBeenCalledWith('/attendance/att-001', {
        clockOut: {
          time: expect.any(String)
        }
      });
      expect(success).toBe(true);
    });

    test('should handle clock out errors', async () => {
      (put as jest.Mock).mockRejectedValue({
        response: {
          data: {
            error: { message: 'Not clocked in yet' }
          }
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.clockOut('att-001');
      });

      expect(success).toBe(false);
    });
  });

  describe('deleteAttendance', () => {
    test('should delete attendance successfully', async () => {
      (apiDel as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'att-001',
          isDeleted: true
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.deleteAttendance('att-001');
      });

      expect(apiDel).toHaveBeenCalledWith('/attendance/att-001');
      expect(success).toBe(true);
    });
  });

  describe('fetchStats', () => {
    test('should fetch attendance statistics', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: mockStats
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(get).toHaveBeenCalledWith('/attendance/stats', {
        params: undefined
      });
      expect(result.current.stats).toEqual(mockStats);
    });

    test('should handle missing stats gracefully', async () => {
      (get as jest.Mock).mockResolvedValue({
        success: true,
        data: null
      });

      const { result } = renderHook(() => useAttendanceREST());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.stats).toBeNull();
    });
  });

  describe('bulkAction', () => {
    test('should perform bulk action successfully', async () => {
      (post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          action: 'approve-regularization',
          updatedCount: 5
        }
      });

      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.bulkAction('approve-regularization', ['att-001', 'att-002']);
      });

      expect(post).toHaveBeenCalledWith('/attendance/bulk', {
        action: 'approve-regularization',
        attendanceIds: ['att-001', 'att-002']
      });
      expect(success).toBe(true);
    });

    test('should validate bulk action parameters', async () => {
      const { result } = renderHook(() => useAttendanceREST());

      const success = await act(async () => {
        return await result.current.bulkAction('', []);
      });

      expect(success).toBe(true);
    });
  });
});

describe('Helper Functions', () => {
  describe('formatAttendanceDate', () => {
    test('should format date string correctly', () => {
      const dateStr = '2026-01-28T00:00:00.000Z';
      const formatted = formatAttendanceDate(dateStr);

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('28');
    });

    test('should handle invalid date', () => {
      const formatted = formatAttendanceDate('invalid-date');
      expect(formatted).toBe('Invalid Date');
    });

    test('should handle undefined input', () => {
      const formatted = formatAttendanceDate(undefined);
      expect(formatted).toBeDefined();
    });
  });

  describe('formatAttendanceTime', () => {
    test('should format time to 12-hour format', () => {
      const timeStr = '2026-01-28T14:30:00.000Z'; // 2:30 PM UTC
      const formatted = formatAttendanceTime(timeStr);

      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
      expect(formatted).toMatch(/(AM|PM)/);
    });

    test('should handle midnight', () => {
      const timeStr = '2026-01-28T00:00:00.000Z';
      const formatted = formatAttendanceTime(timeStr);

      expect(formatted).toBeDefined();
    });
  });

  describe('formatHours', () => {
    test('should format hours to 2 decimal places', () => {
      expect(formatHours(8)).toBe('8.00');
      expect(formatHours(8.5)).toBe('8.50');
      expect(formatHours(0)).toBe('0.00');
      expect(formatHours(NaN)).toBe('0.00');
    });
  });

  describe('toTableFormat', () => {
    test('should transform attendance to table format', () => {
      const attendance = {
        _id: 'att-001',
        attendanceId: 'ATT-001',
        employeeName: 'John Doe',
        date: '2026-01-28T00:00:00.000Z',
        clockIn: { time: '2026-01-28T09:00:00.000Z' },
        clockOut: { time: '2026-01-28T17:00:00.000Z' },
        hoursWorked: 8,
        status: 'present'
      };

      const tableRow = toTableFormat(attendance);

      expect(tableRow.key).toBe('att-001');
      expect(tableRow.Employee).toBe('John Doe');
      expect(tableRow.Status).toContain('Present');
      expect(tableRow.CheckIn).toMatch(/\d{1,2}:\d{2}/);
      expect(tableRow.CheckOut).toMatch(/\d{1,2}:\d{2}/);
      expect(tableRow.ProductionHours).toBe('8.00 Hrs');
      expect(tableRow._original).toEqual(attendance);
    });

    test('should handle missing clock out', () => {
      const attendance = {
        _id: 'att-002',
        employeeName: 'Jane Smith',
        date: '2026-01-28T00:00:00.000Z',
        clockIn: { time: '2026-01-28T09:00:00.000Z' },
        hoursWorked: 4,
        status: 'half-day'
      };

      const tableRow = toTableFormat(attendance);

      expect(tableRow.CheckOut).toBe('-');
      expect(tableRow.ProductionHours).toBe('4.00 Hrs');
    });

    test('should handle overtime display', () => {
      const attendance = {
        _id: 'att-003',
        employeeName: 'Bob Johnson',
        date: '2026-01-28T00:00:00.000Z',
        clockIn: { time: '2026-01-28T09:00:00.000Z' },
        clockOut: { time: '2026-01-28T19:00:00.000Z' },
        hoursWorked: 10,
        overtimeHours: 2,
        status: 'present'
      };

      const tableRow = toTableFormat(attendance);

      expect(tableRow.ProductionHours).toBe('10.00 Hrs');
    });
  });
});
