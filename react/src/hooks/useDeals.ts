import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { Socket } from 'socket.io-client';

export interface Deal {
  id: string;
  _id?: string; // For backward compatibility
  name: string;
  initials?: string;
  stage: 'New' | 'Prospect' | 'Proposal' | 'Won' | 'Lost';
  dealValue: number;
  tags?: string[];
  expectedClosedDate: string;
  owner: {
    name: string;
    avatar?: string;
  };
  probability: number;
  status: 'Won' | 'Lost' | 'Open';
  address?: string;
  contact?: {
    email?: string;
    phone?: string;
  };
  
  // Legacy fields for backward compatibility
  pipeline?: string;
  currency?: string;
  value?: number; // Legacy field
  dueDate?: string;
  followupDate?: string;
  priority?: 'High' | 'Medium' | 'Low';
  createdAt: string;
  updatedAt: string;
}

export interface DealFilters {
  status?: string | string[];
  startDate?: string;
  endDate?: string;
  dueStartDate?: string;
  dueEndDate?: string;
}

export const useDeals = () => {
  const socket = useSocket() as Socket | null;
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeals = useCallback((filters: DealFilters = {}) => {
    if (!socket) {
      console.warn('[useDeals] Socket not available');
      return;
    }
    setLoading(true);
    setError(null);
    socket.emit('deal:getAll', filters);
  }, [socket]);

  const createDeal = useCallback(async (dealData: Partial<Deal>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }
    return new Promise((resolve) => {
      socket.emit('deal:create', dealData);
      const handle = (response: any) => {
        if (response.done) {
          message.success('Deal created');
          fetchDeals();
          resolve(true);
        } else {
          message.error(response.error || 'Failed to create deal');
          resolve(false);
        }
        socket.off('deal:create-response', handle);
      };
      socket.on('deal:create-response', handle);
    });
  }, [socket, fetchDeals]);

  const updateDeal = useCallback(async (dealId: string, updateData: Partial<Deal>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }
    return new Promise((resolve) => {
      socket.emit('deal:update', { dealId, update: updateData });
      const handle = (response: any) => {
        if (response.done) {
          message.success('Deal updated');
          fetchDeals();
          resolve(true);
        } else {
          message.error(response.error || 'Failed to update deal');
          resolve(false);
        }
        socket.off('deal:update-response', handle);
      };
      socket.on('deal:update-response', handle);
    });
  }, [socket, fetchDeals]);

  const deleteDeal = useCallback(async (dealId: string): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }
    return new Promise((resolve) => {
      socket.emit('deal:delete', { dealId });
      const handle = (response: any) => {
        if (response.done) {
          message.success('Deal deleted');
          fetchDeals();
          resolve(true);
        } else {
          message.error(response.error || 'Failed to delete deal');
          resolve(false);
        }
        socket.off('deal:delete-response', handle);
      };
      socket.on('deal:delete-response', handle);
    });
  }, [socket, fetchDeals]);

  const getDealById = useCallback(async (dealId: string): Promise<Deal | null> => {
    if (!socket) {
      message.error('Socket connection not available');
      return null;
    }
    return new Promise((resolve) => {
      socket.emit('deal:getById', dealId);
      const handle = (response: any) => {
        if (response.done) {
          resolve(response.data);
        } else {
          message.error(response.error || 'Failed to get deal');
          resolve(null);
        }
        socket.off('deal:getById-response', handle);
      };
      socket.on('deal:getById-response', handle);
    });
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleList = (response: any) => {
      setLoading(false);
      if (response.done) {
        setDeals(response.data || []);
        setError(null);
      } else {
        setDeals([]);
        setError(response.error || 'Failed to load deals');
      }
    };
    const handleCreated = (response: any) => { if (response.done) fetchDeals(); };
    const handleUpdated = (response: any) => { if (response.done) fetchDeals(); };
    const handleDeleted = (response: any) => { if (response.done) fetchDeals(); };

    socket.on('deal:getAll-response', handleList);
    socket.on('deal:deal-created', handleCreated);
    socket.on('deal:deal-updated', handleUpdated);
    socket.on('deal:deal-deleted', handleDeleted);
    return () => {
      socket.off('deal:getAll-response', handleList);
      socket.off('deal:deal-created', handleCreated);
      socket.off('deal:deal-updated', handleUpdated);
      socket.off('deal:deal-deleted', handleDeleted);
    };
  }, [socket, fetchDeals]);

  return {
    deals,
    loading,
    error,
    fetchDeals,
    createDeal,
    updateDeal,
    deleteDeal,
    getDealById,
  };
};


