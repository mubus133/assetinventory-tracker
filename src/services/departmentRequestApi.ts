import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDoc,
  Timestamp,
  serverTimestamp,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { DepartmentAssetRequest, DepartmentRequestItem, DeptRequestStatus } from '../types';
import { convertDoc, handleFirestoreError, OperationType } from './api';

const logAction = async (action: string, details: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    const userName = userDoc.exists() ? userDoc.data()?.name : (user.displayName || user.email || 'System User');

    await addDoc(collection(db, 'auditLogs'), {
      userId: user.uid,
      userName: userName || 'Unknown User',
      action,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Audit Logging Failed:', error);
  }
};

export const departmentRequestApi = {
  // LIST all department requests
  list: async (): Promise<DepartmentAssetRequest[]> => {
    const path = 'departmentRequests';
    try {
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const sn = await getDocs(q);
      return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as DepartmentAssetRequest[];
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  // SUBSCRIBE to all department requests (real-time)
  subscribe: (callback: (requests: DepartmentAssetRequest[]) => void, onError: (error: any) => void) => {
    const path = 'departmentRequests';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (sn) => {
      callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as DepartmentAssetRequest[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError(err);
    });
  },

  // SUBSCRIBE to department requests by specific department
  subscribeByDepartment: (departmentId: string, callback: (requests: DepartmentAssetRequest[]) => void, onError: (error: any) => void) => {
    const path = 'departmentRequests';
    const q = query(
      collection(db, path),
      where('requestingDepartmentId', '==', departmentId),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (sn) => {
      callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as DepartmentAssetRequest[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError(err);
    });
  },

  // SUBSCRIBE to requests by status (for Admin and Storekeeper dashboards)
  subscribeByStatus: (status: DeptRequestStatus, callback: (requests: DepartmentAssetRequest[]) => void, onError: (error: any) => void) => {
    const path = 'departmentRequests';
    const q = query(
      collection(db, path),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (sn) => {
      callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as DepartmentAssetRequest[]);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
      onError(err);
    });
  },

  // CREATE a new department request
  create: async (data: Omit<DepartmentAssetRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<DepartmentAssetRequest> => {
    const path = 'departmentRequests';
    try {
      const id = doc(collection(db, path)).id;
      const docRef = doc(db, path, id);

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();

      await setDoc(docRef, {
        ...data,
        id,
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newDoc = await getDoc(docRef);
      const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as DepartmentAssetRequest;

      await logAction(
        'Department Asset Request Created',
        `${data.requestingDepartmentName} requested ${data.items.reduce((sum, item) => sum + item.quantityRequested, 0)} assets`
      );

      return result;
    } catch (error) {
      return handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  // ADMIN: Approve a department request
  adminApprove: async (
    requestId: string,
    approvalNotes: string,
    itemApprovals: Array<{ index: number; quantityApproved: number }>
  ): Promise<void> => {
    const path = `departmentRequests/${requestId}`;
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const reqDoc = await getDoc(docRef);

      if (!reqDoc.exists()) throw new Error('Request not found');

      const reqData = reqDoc.data() as DepartmentAssetRequest;
      const user = auth.currentUser;

      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const adminName = userDoc.exists() ? userDoc.data()?.name : 'Admin';

      // Update quantities in items array
      const updatedItems = reqData.items.map((item, index) => {
        const approval = itemApprovals.find(a => a.index === index);
        return {
          ...item,
          quantityApproved: approval ? approval.quantityApproved : 0
        };
      });

      await updateDoc(docRef, {
        status: 'Admin Approved',
        items: updatedItems,
        adminApprovedAt: serverTimestamp(),
        adminApprovedBy: user.uid,
        adminApprovedByName: adminName,
        adminApprovalNotes: approvalNotes,
        updatedAt: serverTimestamp()
      });

      await logAction(
        'Department Request Approved by Admin',
        `Approved request from ${reqData.requestingDepartmentName} with admin notes: ${approvalNotes}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // ADMIN: Reject a department request
  adminReject: async (requestId: string, rejectionReason: string): Promise<void> => {
    const path = `departmentRequests/${requestId}`;
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const reqDoc = await getDoc(docRef);

      if (!reqDoc.exists()) throw new Error('Request not found');

      const reqData = reqDoc.data() as DepartmentAssetRequest;
      const user = auth.currentUser;

      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const adminName = userDoc.exists() ? userDoc.data()?.name : 'Admin';

      await updateDoc(docRef, {
        status: 'Admin Rejected',
        adminApprovedBy: user.uid,
        adminApprovedByName: adminName,
        adminRejectionReason: rejectionReason,
        updatedAt: serverTimestamp()
      });

      await logAction(
        'Department Request Rejected by Admin',
        `Rejected request from ${reqData.requestingDepartmentName}. Reason: ${rejectionReason}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // STOREKEEPER: Acknowledge approved request
  storekeeperAcknowledge: async (requestId: string, acknowledgmentNotes: string): Promise<void> => {
    const path = `departmentRequests/${requestId}`;
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const reqDoc = await getDoc(docRef);

      if (!reqDoc.exists()) throw new Error('Request not found');

      const reqData = reqDoc.data() as DepartmentAssetRequest;

      if (reqData.status !== 'Admin Approved') {
        throw new Error('Only admin-approved requests can be acknowledged');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const storekeeperName = userDoc.exists() ? userDoc.data()?.name : 'Store Officer';

      await updateDoc(docRef, {
        status: 'Storekeeper Acknowledged',
        storekeeperAcknowledgedAt: serverTimestamp(),
        storekeeperAcknowledgedBy: user.uid,
        storekeeperAcknowledgedByName: storekeeperName,
        storekeeperAcknowledgmentNotes: acknowledgmentNotes,
        updatedAt: serverTimestamp()
      });

      await logAction(
        'Department Request Acknowledged by Storekeeper',
        `${storekeeperName} acknowledged request from ${reqData.requestingDepartmentName}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // STOREKEEPER: Release assets for a request
  releaseAssets: async (
    requestId: string,
    releaseNotes: string,
    assetSelections: Array<{ itemIndex: number; selectedAssetIds: string[] }>
  ): Promise<void> => {
    const path = `departmentRequests/${requestId}`;
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const reqDoc = await getDoc(docRef);

      if (!reqDoc.exists()) throw new Error('Request not found');

      const reqData = reqDoc.data() as DepartmentAssetRequest;

      if (reqData.status !== 'Storekeeper Acknowledged') {
        throw new Error('Only acknowledged requests can have assets released');
      }

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const storekeeperName = userDoc.exists() ? userDoc.data()?.name : 'Store Officer';

      // Update items with selected asset IDs and quantity released
      const updatedItems = reqData.items.map((item, index) => {
        const selection = assetSelections.find(s => s.itemIndex === index);
        return {
          ...item,
          selectedAssetIds: selection?.selectedAssetIds || [],
          quantityReleased: selection?.selectedAssetIds.length || 0
        };
      });

      await updateDoc(docRef, {
        status: 'Assets Released',
        items: updatedItems,
        releasedAt: serverTimestamp(),
        releasedBy: user.uid,
        releasedByName: storekeeperName,
        releaseNotes: releaseNotes,
        updatedAt: serverTimestamp()
      });

      // Update asset statuses to "In Transit"
      for (const selection of assetSelections) {
        for (const assetId of selection.selectedAssetIds) {
          const assetRef = doc(db, 'assets', assetId);
          await updateDoc(assetRef, {
            status: 'In Transit'
          });
        }
      }

      await logAction(
        'Assets Released by Storekeeper',
        `${storekeeperName} released assets for request from ${reqData.requestingDepartmentName}`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Mark request as fulfilled after department receives assets
  markFulfilled: async (requestId: string): Promise<void> => {
    const path = `departmentRequests/${requestId}`;
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const reqDoc = await getDoc(docRef);

      if (!reqDoc.exists()) throw new Error('Request not found');

      const reqData = reqDoc.data() as DepartmentAssetRequest;

      // Update all released assets to "Available" in the new department
      if (reqData.items && Array.isArray(reqData.items)) {
        for (const item of reqData.items) {
          if (item.selectedAssetIds && Array.isArray(item.selectedAssetIds)) {
            for (const assetId of item.selectedAssetIds) {
              const assetRef = doc(db, 'assets', assetId);
              await updateDoc(assetRef, {
                status: 'Available',
                departmentId: reqData.requestingDepartmentId
              });
            }
          }
        }
      }

      await updateDoc(docRef, {
        status: 'Fulfilled',
        updatedAt: serverTimestamp()
      });

      await logAction(
        'Department Request Fulfilled',
        `Request from ${reqData.requestingDepartmentName} marked as fulfilled and assets transferred`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Get request details
  getById: async (requestId: string): Promise<DepartmentAssetRequest | null> => {
    try {
      const docRef = doc(db, 'departmentRequests', requestId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;

      return convertDoc({ id: docSnap.id, ...docSnap.data() }) as DepartmentAssetRequest;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'departmentRequests');
    }
  }
};
