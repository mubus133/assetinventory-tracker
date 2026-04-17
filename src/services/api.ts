import { Asset, Allocation, User, Department, Category, AuditLog } from '../types';

const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  auth: {
    login: async (credentials: any) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      if (!res.ok) throw new Error('Login failed');
      return res.json();
    }
  },
  assets: {
    list: async (): Promise<Asset[]> => {
      const res = await fetch(`${API_BASE}/assets`, { headers: getHeaders() });
      return res.json();
    },
    create: async (data: Partial<Asset>): Promise<Asset> => {
      const res = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return res.json();
    },
    update: async (id: string, data: Partial<Asset>): Promise<Asset> => {
      const res = await fetch(`${API_BASE}/assets/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return res.json();
    },
    delete: async (id: string): Promise<void> => {
      await fetch(`${API_BASE}/assets/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    }
  },
  allocations: {
    list: async (): Promise<Allocation[]> => {
      const res = await fetch(`${API_BASE}/allocations`, { headers: getHeaders() });
      return res.json();
    },
    create: async (data: { assetId: string; userId: string; notes: string }): Promise<Allocation> => {
      const res = await fetch(`${API_BASE}/allocations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return res.json();
    },
    return: async (id: string): Promise<Allocation> => {
      const res = await fetch(`${API_BASE}/allocations/${id}/return`, {
        method: 'POST',
        headers: getHeaders()
      });
      return res.json();
    }
  },
  metadata: {
    departments: async (): Promise<Department[]> => {
      const res = await fetch(`${API_BASE}/departments`, { headers: getHeaders() });
      return res.json();
    },
    categories: async (): Promise<Category[]> => {
      const res = await fetch(`${API_BASE}/categories`, { headers: getHeaders() });
      return res.json();
    },
    users: async (): Promise<User[]> => {
      const res = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      return res.json();
    },
    createUser: async (data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return res.json();
    },
    updateUser: async (id: string, data: Partial<User>): Promise<User> => {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      return res.json();
    },
    deleteUser: async (id: string): Promise<void> => {
      await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    },
    auditLogs: async (): Promise<AuditLog[]> => {
      const res = await fetch(`${API_BASE}/audit-logs`, { headers: getHeaders() });
      return res.json();
    }
  }
};
