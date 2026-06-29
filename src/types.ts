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
  customId?: string;
  name: string;
}

export interface Category {
  id: string;
  customId?: string;
  name: string;
}

export type AssetStatus = 'Available' | 'Allocated' | 'Maintenance' | 'Disposed' | 'In Transit' | 'Pending Release';

export type AssetCondition = 'Good' | 'Fair' | 'Damaged' | 'Lost';

export interface Asset {
  id: string;
  assetId: string; // Unique institutional ID
  name: string;
  categoryId: string;
  departmentId: string;
  status: AssetStatus;
  condition?: AssetCondition;
  lastMaintenanceDate?: string;
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
  returnCondition?: 'Good' | 'Fair' | 'Damaged' | 'Lost';
  returnNotes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  timestamp: string;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Disapproved' | 'Fulfilled' | 'Acknowledged' | 'Released';

export interface AssetRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  departmentName: string;
  categoryId: string;
  categoryName: string;
  quantity: number;
  reason: string;
  status: RequestStatus;
  approvedQuantity?: number;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

// NEW: Department Request Workflow Types
export type DeptRequestStatus = 'Pending' | 'Admin Approved' | 'Admin Rejected' | 'Storekeeper Acknowledged' | 'Assets Released' | 'Fulfilled';

export interface DepartmentAssetRequest {
  id: string;
  requestingDepartmentId: string;
  requestingDepartmentName: string;
  requestedByUserId: string;
  requestedByUserName: string;
  requestedByUserRole: UserRole;
  status: DeptRequestStatus;
  items: DepartmentRequestItem[];
  reason: string;
  urgency: 'Low' | 'Medium' | 'High';
  
  // Admin approval workflow
  adminApprovedAt?: string;
  adminApprovedBy?: string;
  adminApprovedByName?: string;
  adminApprovalNotes?: string;
  adminRejectionReason?: string;
  
  // Storekeeper acknowledgment workflow
  storekeeperAcknowledgedAt?: string;
  storekeeperAcknowledgedBy?: string;
  storekeeperAcknowledgedByName?: string;
  storekeeperAcknowledgmentNotes?: string;
  
  // Asset release workflow
  releasedAt?: string;
  releasedBy?: string;
  releasedByName?: string;
  releaseNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRequestItem {
  assetCategoryId: string;
  assetCategoryName: string;
  quantityRequested: number;
  quantityApproved?: number;
  quantityReleased?: number;
  selectedAssetIds?: string[]; // IDs of assets selected by storekeeper
  itemNotes?: string;
}

export interface DepartmentRequestNotification {
  id: string;
  userId: string;
  departmentRequestId: string;
  type: 'NEW_REQUEST' | 'APPROVAL_NEEDED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'READY_FOR_PICKUP' | 'ASSETS_RELEASED';
  isRead: boolean;
  createdAt: string;
}
