/**
 * Tasks REST API Hook
 * Replaces Socket.IO-based task operations with REST API calls
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, patch, post, put } from '../services/api';
import { useSocket } from '../SocketContext';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  project?: string; // For display/populated data
  projectId?: string; // For create/update operations
  assignee?: string | string[] | any[]; // Array of employee IDs (send to API) or populated employee objects (receive from API)
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  page?: number;
  limit?: number;
  project?: string;
  assignee?: string;
  status?: string;
  priority?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  myPendingTasks: number;
  myCompletedTasks: number;
}

/**
 * Tasks REST API Hook
 */
export const useTasksREST = () => {
  const socket = useSocket();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async (filters: TaskFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Task[]> = await get('/tasks', { params });

      if (response.success && response.data) {
        setTasks(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch tasks');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch tasks';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<TaskStats> = await get('/tasks/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useTasksREST] Failed to fetch stats:', err);
    }
  }, []);

  const getTaskById = useCallback(async (taskId: string): Promise<Task | null> => {
    try {
      const response: ApiResponse<Task> = await get(`/tasks/${taskId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch task');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch task';
      message.error(errorMessage);
      return null;
    }
  }, []);

  const createTask = useCallback(async (taskData: Partial<Task>): Promise<boolean> => {
    try {
      const response: ApiResponse<Task> = await post('/tasks', taskData);

      if (response.success && response.data) {
        message.success('Task created successfully!');
        setTasks((prev) => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create task');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to create task';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateTask = useCallback(
    async (taskId: string, updateData: Partial<Task>): Promise<boolean> => {
      try {
        const response: ApiResponse<Task> = await put(`/tasks/${taskId}`, updateData);

        if (response.success && response.data) {
          message.success('Task updated successfully!');
          setTasks((prev) =>
            prev.map((task) => (task._id === taskId ? { ...task, ...response.data! } : task))
          );
          return true;
        }
        throw new Error(response.error?.message || 'Failed to update task');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to update task';
        message.error(errorMessage);
        return false;
      }
    },
    []
  );

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/tasks/${taskId}`);

      if (response.success) {
        message.success('Task deleted successfully!');
        setTasks((prev) => prev.filter((task) => task._id !== taskId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete task');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to delete task';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateStatus = useCallback(async (taskId: string, status: string): Promise<boolean> => {
    try {
      const response: ApiResponse<Task> = await patch(`/tasks/${taskId}/status`, { status });

      if (response.success && response.data) {
        message.success(`Task status updated to ${status}`);
        setTasks((prev) =>
          prev.map((task) => (task._id === taskId ? { ...task, ...response.data! } : task))
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update status');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to update status';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const getTasksByProject = useCallback(async (projectId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Task[]> = await get(`/tasks/project/${projectId}`);

      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch project tasks';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const getMyTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Task[]> = await get('/tasks/my');

      if (response.success && response.data) {
        setTasks(response.data);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch my tasks';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (data: Task) => {
      console.log('[useTasksREST] Task created via broadcast:', data);
      setTasks((prev) => [...prev, data]);
    };

    const handleTaskUpdated = (data: Task) => {
      console.log('[useTasksREST] Task updated via broadcast:', data);
      setTasks((prev) => prev.map((task) => (task._id === data._id ? { ...task, ...data } : task)));
    };

    const handleTaskStatusChanged = (data: Task) => {
      console.log('[useTasksREST] Task status changed via broadcast:', data);
      setTasks((prev) => prev.map((task) => (task._id === data._id ? { ...task, ...data } : task)));
    };

    const handleTaskDeleted = (data: { _id: string }) => {
      console.log('[useTasksREST] Task deleted via broadcast:', data);
      setTasks((prev) => prev.filter((task) => task._id !== data._id));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:status_changed', handleTaskStatusChanged);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:status_changed', handleTaskStatusChanged);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [socket]);

  return {
    tasks,
    stats,
    loading,
    error,
    fetchTasks,
    fetchStats,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateStatus,
    getTasksByProject,
    getMyTasks,
  };
};

export default useTasksREST;
