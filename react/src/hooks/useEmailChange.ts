/**
 * Custom Hook for Email Change Operations
 * Handles OTP-based email change flow for employees
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import api from '../services/api';

export interface EmailChangeResult {
  success: boolean;
  data?: {
    email: string;
    passwordReset: boolean;
    message?: string;
    steps?: {
      currentStep: number;
      totalSteps: number;
      stepsCompleted: string[];
      errors: string[];
    };
  };
  error?: {
    message: string;
    code?: string;
  };
}

export interface EmailAvailabilityResult {
  available: boolean;
  valid: boolean;
  message: string;
  source?: string;
  warning?: string;
}

export const useEmailChange = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send OTP to current email
   */
  const sendCurrentEmailOTP = useCallback(async (employeeId: string): Promise<EmailChangeResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/employees/${employeeId}/email/send-otp`);

      if (response.data.success) {
        message.success(response.data.message || 'OTP sent to your email');
        return { success: true };
      }

      throw new Error(response.data.error?.message || 'Failed to send OTP');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);
      message.error(errorMessage);
      return {
        success: false,
        error: { message: errorMessage, code: err.response?.data?.error?.code }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify OTP for current email
   */
  const verifyCurrentEmailOTP = useCallback(async (
    employeeId: string,
    otp: string
  ): Promise<EmailChangeResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/employees/${employeeId}/email/verify-current`, { otp });

      if (response.data.success) {
        message.success('Current email verified successfully');
        return { success: true };
      }

      throw new Error(response.data.error?.message || 'OTP verification failed');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'OTP verification failed';
      setError(errorMessage);
      message.error(errorMessage);
      return {
        success: false,
        error: { message: errorMessage, code: err.response?.data?.error?.code }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Send OTP to new email address
   */
  const sendNewEmailOTP = useCallback(async (
    employeeId: string,
    newEmail: string
  ): Promise<EmailChangeResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/employees/${employeeId}/email/send-new-otp`, { newEmail });

      if (response.data.success) {
        message.success(response.data.message || 'OTP sent to new email address');
        return { success: true };
      }

      throw new Error(response.data.error?.message || 'Failed to send OTP');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to send OTP';
      setError(errorMessage);

      // Show specific error messages
      if (err.response?.data?.error?.code === 'EMAIL_EXISTS') {
        message.error('This email address is already registered');
      } else if (err.response?.data?.error?.code === 'SAME_EMAIL') {
        message.error('New email cannot be the same as current email');
      } else {
        message.error(errorMessage);
      }

      return {
        success: false,
        error: { message: errorMessage, code: err.response?.data?.error?.code }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Verify OTP for new email and update email
   */
  const updateEmail = useCallback(async (
    employeeId: string,
    newEmail: string,
    otp: string
  ): Promise<EmailChangeResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/employees/${employeeId}/email/update-email`, {
        newEmail,
        otp
      });

      if (response.data.success) {
        message.success(response.data.message || 'Email updated successfully');

        // Check if password was reset
        if (response.data.data?.passwordReset) {
          message.info('Please check your new email for the login credentials');
        }

        return {
          success: true,
          data: response.data.data
        };
      }

      throw new Error(response.data.error?.message || 'Failed to update email');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update email';
      setError(errorMessage);
      message.error(errorMessage);
      return {
        success: false,
        error: { message: errorMessage, code: err.response?.data?.error?.code }
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if email is available (not exists in Clerk or Database)
   */
  const checkEmailAvailability = useCallback(async (
    email: string,
    employeeId?: string
  ): Promise<EmailAvailabilityResult | null> => {
    setError(null);

    // Basic email format check first (don't make API call for invalid emails)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return {
        available: false,
        valid: false,
        message: 'Invalid email format'
      };
    }

    try {
      const params = new URLSearchParams({ email });
      if (employeeId) {
        params.append('employeeId', employeeId);
      }

      const response = await api.get(`/employees/check-email?${params.toString()}`);

      if (response.data.success) {
        return response.data.data;
      }

      return null;
    } catch (err: any) {
      // Don't show error for availability check - just return null
      console.error('[Email Change] Email availability check failed:', err);
      return null;
    }
  }, []);

  return {
    loading,
    error,
    sendCurrentEmailOTP,
    verifyCurrentEmailOTP,
    sendNewEmailOTP,
    updateEmail,
    checkEmailAvailability
  };
};

export default useEmailChange;
