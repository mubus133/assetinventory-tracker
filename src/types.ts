/**
 * Asset Management System Types
 */

export type UserRole = 'Admin' | 'Staff' | 'Store Officer' | 'Department Staff' | 'Inventory Officer' | 'Management';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export type AssetStatus = 'Available' | 'Allocated' | 'Maintenance' | 'Disposed';

export interface Asset {
  id: string;
  assetId: string; // Unique institutional ID
  name: string;
  categoryId: string;
  departmentId: string;
  status: AssetStatus;
  purchaseDate: string;
  description: string;
  createdAt: string;
}

export interface Allocation {
  id: string;
  assetId: string;
  userId: string;
  allocationDate: string;
  returnDate?: string;
  status: 'Active' | 'Returned';
  notes: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}
