/**
 * Projects REST API Hook
 * Replaces Socket.IO-based project operations with REST API calls
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, patch, post, put } from '../services/api';
import { useSocket } from '../SocketContext';

export interface Project {
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  client?: string;
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled';
  priority: 'High' | 'Medium' | 'Low';
  startDate?: Date;
  dueDate?: Date;
  endDate?: Date; // Alias for dueDate - used in frontend
  budget?: number;
  progress: number;
  teamLeader?: string[];
  teamMembers?: string[];
  projectManager?: string[];
  projectValue?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFilters {
  page?: number;
  limit?: number;
  status?: string;
  client?: string;
  teamLeader?: string;
  priority?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  overdueProjects: number;
  totalBudget: number;
  averageProgress: number;
}

/**
 * Projects REST API Hook
 */
export const useProjectsREST = () => {
  const socket = useSocket();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert date strings to Date objects
  const convertDatesToDateObjects = useCallback((project: any): Project => {
    return {
      ...project,
      startDate: project.startDate ? new Date(project.startDate) : undefined,
      dueDate: project.dueDate ? new Date(project.dueDate) : undefined,
      createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
      updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date(),
    };
  }, []);

  const fetchProjects = useCallback(
    async (filters: ProjectFilters = {}) => {
      setLoading(true);
      setError(null);
      try {
        const params = buildParams(filters);
        const response: ApiResponse<Project[]> = await get('/projects', { params });

        if (response.success && response.data) {
          const projectsWithDates = response.data.map(convertDatesToDateObjects);
          setProjects(projectsWithDates);
        } else {
          throw new Error(response.error?.message || 'Failed to fetch projects');
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to fetch projects';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [convertDatesToDateObjects]
  );

  const fetchStats = useCallback(async () => {
    try {
      const response: ApiResponse<ProjectStats> = await get('/projects/stats');

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useProjectsREST] Failed to fetch stats:', err);
    }
  }, []);

  const getProjectById = useCallback(
    async (projectId: string): Promise<Project | null> => {
      try {
        console.log('[useProjectsREST] Fetching project by ID:', projectId);
        const response: ApiResponse<Project> = await get(`/projects/${projectId}`);

        console.log('[useProjectsREST] Raw response:', response);

        if (response.success && response.data) {
          const convertedData = convertDatesToDateObjects(response.data);
          console.log('[useProjectsREST] Converted project data:', convertedData);
          console.log('[useProjectsREST] Team members:', convertedData.teamMembers);
          console.log('[useProjectsREST] Team leaders:', convertedData.teamLeader);
          return convertedData;
        }
        throw new Error(response.error?.message || 'Failed to fetch project');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to fetch project';
        console.error('[useProjectsREST] Error fetching project:', errorMessage);
        message.error(errorMessage);
        return null;
      }
    },
    [convertDatesToDateObjects]
  );

  const createProject = useCallback(async (projectData: Partial<Project>): Promise<boolean> => {
    try {
      const response: ApiResponse<Project> = await post('/projects', projectData);

      if (response.success && response.data) {
        message.success('Project created successfully!');
        setProjects((prev) => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create project');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to create project';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateProject = useCallback(
    async (projectId: string, updateData: Partial<Project>): Promise<boolean> => {
      try {
        console.log('[useProjectsREST] Updating project:', { projectId, updateData });
        const response: ApiResponse<Project> = await put(`/projects/${projectId}`, updateData);
        console.log('[useProjectsREST] Update response:', response);

        // Check if response is successful
        if (response.success) {
          // Response might have data directly or nested
          const projectData = response.data || response;
          console.log('[useProjectsREST] Project data:', projectData);

          message.success(response.message || 'Project updated successfully!');
          setProjects((prev) =>
            prev.map((proj) => (proj._id === projectId ? { ...proj, ...projectData } : proj))
          );
          return true;
        }

        console.error('[useProjectsREST] Update failed:', response);
        throw new Error(response.error?.message || 'Failed to update project');
      } catch (err: any) {
        console.error('[useProjectsREST] Update error:', err);
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to update project';
        message.error(errorMessage);
        return false;
      }
    },
    []
  );

  const deleteProject = useCallback(async (projectId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/projects/${projectId}`);

      if (response.success) {
        message.success('Project deleted successfully!');
        setProjects((prev) => prev.filter((proj) => proj._id !== projectId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete project');
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to delete project';
      message.error(errorMessage);
      return false;
    }
  }, []);

  const updateProgress = useCallback(
    async (projectId: string, progress: number): Promise<boolean> => {
      try {
        const response: ApiResponse<Project> = await patch(`/projects/${projectId}/progress`, {
          progress,
        });

        if (response.success && response.data) {
          message.success('Project progress updated!');
          setProjects((prev) =>
            prev.map((proj) => (proj._id === projectId ? { ...proj, ...response.data! } : proj))
          );
          return true;
        }
        throw new Error(response.error?.message || 'Failed to update progress');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.error?.message || err.message || 'Failed to update progress';
        message.error(errorMessage);
        return false;
      }
    },
    []
  );

  const getMyProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Project[]> = await get('/projects/my');

      if (response.success && response.data) {
        const projectsWithDates = response.data.map(convertDatesToDateObjects);
        setProjects(projectsWithDates);
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message || err.message || 'Failed to fetch my projects';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [convertDatesToDateObjects]);

  const getProjectTeamMembers = useCallback(async (projectId: string) => {
    try {
      const response: ApiResponse<Project> = await get(`/projects/${projectId}`);

      if (response.success && response.data) {
        // Combine team members and team leaders
        const allMembers = [
          ...(response.data.teamMembers || []),
          ...(response.data.teamLeader || []),
        ];

        // Remove duplicates based on _id or string value
        const seen = new Set<string>();
        const uniqueMembers = allMembers.filter((member) => {
          if (!member) return false;

          // Handle both string IDs and populated objects
          const id =
            typeof member === 'string'
              ? member
              : (member as any)._id?.toString() || (member as any).id?.toString();
          if (!id) return false;

          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        return uniqueMembers;
      }
      return [];
    } catch (err: any) {
      console.error('[useProjectsREST] Failed to fetch team members:', err);
      return [];
    }
  }, []);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!socket) return;

    const handleProjectCreated = (data: Project) => {
      console.log('[useProjectsREST] Project created via broadcast:', data);
      setProjects((prev) => [...prev, data]);
    };

    const handleProjectUpdated = (data: Project) => {
      console.log('[useProjectsREST] Project updated via broadcast:', data);
      setProjects((prev) =>
        prev.map((proj) => (proj._id === data._id ? { ...proj, ...data } : proj))
      );
    };

    const handleProjectProgressUpdated = (data: Project) => {
      console.log('[useProjectsREST] Project progress updated via broadcast:', data);
      setProjects((prev) =>
        prev.map((proj) => (proj._id === data._id ? { ...proj, ...data } : proj))
      );
    };

    const handleProjectDeleted = (data: { _id: string }) => {
      console.log('[useProjectsREST] Project deleted via broadcast:', data);
      setProjects((prev) => prev.filter((proj) => proj._id !== data._id));
    };

    socket.on('project:created', handleProjectCreated);
    socket.on('project:updated', handleProjectUpdated);
    socket.on('project:progress_updated', handleProjectProgressUpdated);
    socket.on('project:deleted', handleProjectDeleted);

    return () => {
      socket.off('project:created', handleProjectCreated);
      socket.off('project:updated', handleProjectUpdated);
      socket.off('project:progress_updated', handleProjectProgressUpdated);
      socket.off('project:deleted', handleProjectDeleted);
    };
  }, [socket]);

  return {
    projects,
    stats,
    loading,
    error,
    fetchProjects,
    fetchStats,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    updateProgress,
    getMyProjects,
    getProjectTeamMembers,
  };
};

export default useProjectsREST;
