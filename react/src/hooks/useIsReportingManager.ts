/**
 * useIsReportingManager Hook
 * Checks if the current user is a reporting manager (has employees reporting to them)
 */

import { useEffect, useState } from 'react';
import { get } from '../services/api';
import { useAuth } from './useAuth';

export interface ReportingManagerStatus {
  isReportingManager: boolean;
  reporteeCount: number;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to check if the current user is a reporting manager
 *
 * @returns {ReportingManagerStatus} Object containing reporting manager status and reportee count
 *
 * @example
 * const { isReportingManager, reporteeCount, loading } = useIsReportingManager();
 * if (isReportingManager) {
 *   // Show "Team Leaves" menu item
 * }
 */
export const useIsReportingManager = (): ReportingManagerStatus => {
  const { userId, employeeId } = useAuth();
  const [status, setStatus] = useState<ReportingManagerStatus>({
    isReportingManager: false,
    reporteeCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const checkReportingManagerStatus = async () => {
      if (!userId && !employeeId) {
        console.log('[useIsReportingManager] No userId or employeeId - setting to false');
        setStatus({
          isReportingManager: false,
          reporteeCount: 0,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        setStatus(prev => ({ ...prev, loading: true, error: null }));

        console.log('[useIsReportingManager] Checking status for:', { userId, employeeId });

        // Step 1: Fetch current user's employee record to get their MongoDB _id
        const currentUserResponse = await get('/employees/me');

        if (!currentUserResponse || !currentUserResponse.data) {
          console.log('[useIsReportingManager] Could not fetch current user employee record');
          setStatus({
            isReportingManager: false,
            reporteeCount: 0,
            loading: false,
            error: null,
          });
          return;
        }

        const currentEmployee = currentUserResponse.data;
        const currentEmployeeMongoId = currentEmployee._id;
        const currentEmployeeId = currentEmployee.employeeId;

        console.log('[useIsReportingManager] Current employee:', {
          _id: currentEmployeeMongoId,
          employeeId: currentEmployeeId,
          name: `${currentEmployee.firstName} ${currentEmployee.lastName}`
        });

        // Step 2: Fetch all employees and check if any report to the current user
        const response = await get('/api/employees', {
          params: {
            limit: 100, // Maximum allowed by backend validation
            status: 'Active' // Only active employees
          }
        });

        if (response?.success && Array.isArray(response.data)) {
          const employees = response.data;

          console.log('[useIsReportingManager] Total employees fetched:', employees.length);

          // Count employees who report to the current user
          // reportingTo is a MongoDB ObjectId that references the manager's employee document
          const reportees = employees.filter((emp: any) => {
            const reportsToCurrentUser =
              emp.reportingTo === currentEmployeeMongoId || // MongoDB _id match
              emp.reportingTo === currentEmployeeId || // employeeId match (if stored as string)
              emp.reportingToEmployeeId === currentEmployeeId; // Populated employeeId field

            if (reportsToCurrentUser) {
              console.log('[useIsReportingManager] Found reportee:', {
                employeeId: emp.employeeId,
                name: `${emp.firstName} ${emp.lastName}`,
                reportingTo: emp.reportingTo,
                reportingToEmployeeId: emp.reportingToEmployeeId
              });
            }

            return reportsToCurrentUser;
          });

          console.log('[useIsReportingManager] Total reportees found:', reportees.length);

          setStatus({
            isReportingManager: reportees.length > 0,
            reporteeCount: reportees.length,
            loading: false,
            error: null,
          });
        } else {
          console.log('[useIsReportingManager] No employees data in response');
          setStatus({
            isReportingManager: false,
            reporteeCount: 0,
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        console.error('[useIsReportingManager] Error checking status:', error);
        setStatus({
          isReportingManager: false,
          reporteeCount: 0,
          loading: false,
          error: error.message || 'Failed to check reporting manager status',
        });
      }
    };

    checkReportingManagerStatus();
  }, [userId, employeeId]);

  return status;
};

export default useIsReportingManager;
