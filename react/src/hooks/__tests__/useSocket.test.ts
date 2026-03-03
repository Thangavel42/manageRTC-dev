/**
 * useSocket Hook Tests
 * Tests for Socket.IO connection and event handling
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { io as ioClient } from 'socket.io-client';
import { useSocket, useSocketAttendance } from '../useSocket';

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    on: jest.fn(() => mockSocket),
    off: jest.fn(() => mockSocket),
    emit: jest.fn(() => mockSocket),
    connect: jest.fn(() => mockSocket),
    disconnect: jest.fn(() => mockSocket),
    connected: true,
    id: 'test-socket-id',
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    listeners: []
  }))
}));

const mockSocket = {
  connected: true,
  id: 'test-socket-id',
  on: jest.fn(function(event, handler) {
    this.listeners[event] = handler;
    return this;
  }),
  off: jest.fn(function(event, handler) {
    delete this.listeners[event];
    return this;
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  removeAllListeners: jest.fn()
};

describe('useSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ioClient.io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Connection Management', () => {
    test('should connect when token is provided', () => {
      const token = 'test-token';
      const { result } = renderHook(() => useSocket(token));

      expect(ioClient.io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token }
        })
      );
    });

    test('should not connect when token is missing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useSocket(undefined));

      expect(ioClient.io).not.toHaveBeenCalled();
      consoleSpy.mockRestore();

      expect(result.current.socket).toBeNull();
    });

    test('should update connection status on connect', () => {
      // Simulate connection event
      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            if (event === 'connect') {
              setTimeout(() => handler(), 0);
            }
            return this;
          })
        };
        return socketInstance;
      });

      const { result } = renderHook(() => useSocket('test-token'));

      expect(result.current.isConnected).toBe(true);
    });

    test('should handle connection errors', () => {
      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            if (event === 'connect_error') {
              setTimeout(() => handler(new Error('Connection failed')), 0);
            }
            return this;
          })
        };
        return socketInstance;
      });

      const { result } = renderHook(() => useSocket('test-token'));

      expect(result.current.connectionError).toBeDefined();
    });

    test('should disconnect on unmount', () => {
      const { unmount } = renderHook(() => useSocket('test-token'));

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Reconnection', () => {
    test('should reconnect when reconnect is called', () => {
      const { result } = renderHook(() => useSocket('test-token'));

      act(() => {
        result.current.reconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    test('should allow manual disconnect', () => {
      const { result } = renderHook(() => useSocket('test-token'));

      act(() => {
        result.current.disconnect();
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('useSocketAttendance', () => {
    test('should set up attendance event listeners', () => {
      const events = {
        onClockIn: jest.fn(),
        onClockOut: jest.fn(),
        onCreated: jest.fn(),
        onUpdated: jest.fn(),
        onDeleted: jest.fn()
      };

      renderHook(() => useSocketAttendance('test-token', events));

      // Verify event listeners were registered
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:clock_in', events.onClockIn);
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:clock_out', events.onClockOut);
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:created', events.onCreated);
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:updated', events.onUpdated);
      expect(mockSocket.on).toHaveBeenCalledWith('attendance:deleted', events.onDeleted);
    });

    test('should clean up event listeners on unmount', () => {
      const events = {
        onClockIn: jest.fn(),
        onClockOut: jest.fn()
      };

      const { unmount } = renderHook(() => useSocketAttendance('test-token', events));

      unmount();

      expect(mockSocket.off).toHaveBeenCalledWith('attendance:clock_in', events.onClockIn);
      expect(mockSocket.off).toHaveBeenCalledWith('attendance:clock_out', events.onClockOut);
    });

    test('should call event handlers when events are received', async () => {
      const clockInHandler = jest.fn();
      const clockOutHandler = jest.fn();

      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            this.listeners[event] = handler;
            // Emit event immediately
            if (event === 'attendance:clock_in') {
              setTimeout(() => {
                handler({ attendanceId: 'ATT-001' });
              }, 0);
            }
            return this;
          })
        };
        return socketInstance;
      });

      renderHook(() => useSocketAttendance('test-token', {
        onClockIn: clockInHandler,
        onClockOut: clockOutHandler
      }));

      await waitFor(() => {
        expect(clockInHandler).toHaveBeenCalledWith({ attendanceId: 'ATT-001' });
      });
    });

    test('should handle personal clock in events', async () => {
      const youClockedInHandler = jest.fn();

      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            this.listeners[event] = handler;
            if (event === 'attendance:you_clocked_in') {
              setTimeout(() => {
                handler({ attendanceId: 'ATT-002' });
              }, 0);
            }
            return this;
          })
        };
        return socketInstance;
      });

      renderHook(() => useSocketAttendance('test-token', {
        onYouClockedIn: youClockedInHandler
      }));

      await waitFor(() => {
        expect(youClockedInHandler).toHaveBeenCalled();
      });
    });

    test('should handle personal clock out events', async () => {
      const youClockedOutHandler = jest.fn();

      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            this.listeners[event] = handler;
            if (event === 'attendance:you_clocked_out') {
              setTimeout(() => {
                handler({ attendanceId: 'ATT-003', hoursWorked: 8 });
              }, 0);
            }
            return this;
          })
        };
        return socketInstance;
      });

      renderHook(() => useSocketAttendance('test-token', {
        onYouClockedOut: youClockedOutHandler
      }));

      await waitFor(() => {
        expect(youClockedOutHandler).toHaveBeenCalledWith({
          attendanceId: 'ATT-003',
          hoursWorked: 8
        });
      });
    });
  });

  describe('Connection State', () => {
    test('should expose connection state', () => {
      const { result } = renderHook(() => useSocket('test-token'));

      expect(result.current.socket).toBeDefined();
      expect(typeof result.current.isConnected).toBe('boolean');
      expect(typeof result.current.connectionError).toBe('string or null');
    });

    test('should update connection state on reconnect', () => {
      (ioClient.io as jest.Mock).mockImplementation(() => {
        let connected = false;
        return {
          ...mockSocket,
          connected: connected,
          on: jest.fn(function(event, handler) {
            if (event === 'reconnect') {
              connected = true;
              handler();
            }
            return this;
          })
        };
      });

      const { result } = renderHook(() => useSocket('test-token'));

      act(() => {
        result.current.reconnect();
      });

      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null socket gracefully', () => {
      (ioClient.io as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useSocket('test-token'));

      expect(result.current.socket).toBeNull();
      expect(result.current.isConnected).toBe(false);
    });

    test('should handle socket error events', () => {
      (ioClient.io as jest.Mock).mockImplementation(() => {
        const socketInstance = {
          ...mockSocket,
          on: jest.fn(function(event, handler) {
            if (event === 'error') {
              handler(new Error('Socket error'));
            }
            return this;
          })
        };
        return socketInstance;
      });

      const { result } = renderHook(() => useSocket('test-token'));

      expect(result.current.connectionError).toBeDefined();
    });

    test('should handle missing token', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => useSocket(undefined));

      expect(result.current.socket).toBeNull();
      consoleSpy.mockRestore();
    });
  });
});
