import { initializeApp, deleteApp } from 'firebase/app';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  getDoc,
  Timestamp,
  serverTimestamp,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  getAuth
} from 'firebase/auth';
import { db, auth } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Asset, Allocation, User, Department, Category, AuditLog, AssetRequest } from '../types';

const MASTER_ADMIN_EMAIL = 'mubarak@crescent.edu.ng';

// Error Handling for Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Convert Firestore timestamps to string dates for the UI
export const convertDoc = (d: any) => {
  const { id: _id, ...rest } = d;
  return {
    ...rest,
    id: d.id,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
    purchaseDate: d.purchaseDate instanceof Timestamp ? d.purchaseDate.toDate().toISOString() : d.purchaseDate,
    allocationDate: d.allocationDate instanceof Timestamp ? d.allocationDate.toDate().toISOString() : d.allocationDate,
    returnDate: d.returnDate instanceof Timestamp ? d.returnDate.toDate().toISOString() : d.returnDate,
    timestamp: d.timestamp instanceof Timestamp ? d.timestamp.toDate().toISOString() : d.timestamp,
  };
};

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

export const api = {
  auth: {
    login: async (credentials: any) => {
      try {
        await setPersistence(auth, browserSessionPersistence);
        
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } catch (authError: any) {
          // If master admin fails because account doesn't exist yet, try creating it
          if (email === MASTER_ADMIN_EMAIL && password === 'admin123') {
            try {
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createError: any) {
              console.error('Master bootstrap failure:', createError);
              if (createError.code === 'auth/email-already-in-use') {
                 // The Auth account exists but password might be different if they changed it
                 throw new Error('This account already exists. Please use your established password.');
              }
              throw createError;
            }
          } else {
            throw authError;
          }
        }

        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        // Return credentials. onAuthStateChanged in AuthContext will handle 
        // the final state and Firestore profile checks/bootstrapping.
        return { 
          token: await userCredential.user.getIdToken(), 
          user: userDoc.exists() ? convertDoc({ id: userDoc.id, ...userDoc.data() }) : null
        };
      } catch (error) {
        console.error('Login Error:', error);
        throw error;
      }
    },
    loginWithGoogle: async () => {
      try {
        await setPersistence(auth, browserSessionPersistence);
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        return {
          token: await userCredential.user.getIdToken(),
          firebaseUser: userCredential.user
        };
      } catch (error) {
        console.error('Google Login Error:', error);
        throw error;
      }
    },
    logout: async () => {
      await signOut(auth);
    }
  },
  assets: {
    list: async (): Promise<Asset[]> => {
      const path = 'assets';
      try {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        const sn = await getDocs(q);
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as Asset[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribe: (callback: (assets: Asset[]) => void, onError: (error: any) => void) => {
      const path = 'assets';
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (sn) => {
        callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as Asset[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    create: async (data: Partial<Asset>): Promise<Asset> => {
      const path = 'assets';
      try {
        const id = doc(collection(db, path)).id;
        const docRef = doc(db, path, id);
        await setDoc(docRef, {
          ...data,
          id,
          createdAt: serverTimestamp(),
          purchaseDate: data.purchaseDate ? Timestamp.fromDate(new Date(data.purchaseDate)) : serverTimestamp()
        });
        const newDoc = await getDoc(docRef);
        const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as Asset;
        await logAction('Asset Created', `New asset registered: ${result.name} (${result.assetId})`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    update: async (id: string, data: Partial<Asset>): Promise<Asset> => {
      const path = `assets/${id}`;
      try {
        const docRef = doc(db, 'assets', id);
        const updateData: any = { ...data };
        if (data.purchaseDate) updateData.purchaseDate = Timestamp.fromDate(new Date(data.purchaseDate));
        
        await updateDoc(docRef, updateData);
        const updatedDoc = await getDoc(docRef);
        const result = convertDoc({ id: updatedDoc.id, ...updatedDoc.data() }) as Asset;
        await logAction('Asset Updated', `Asset details modified: ${result.name} (${result.assetId})`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    delete: async (id: string): Promise<void> => {
      const path = `assets/${id}`;
      try {
        const assetRef = doc(db, 'assets', id);
        const assetSnap = await getDoc(assetRef);
        const assetName = assetSnap.exists() ? assetSnap.data()?.name : id;
        
        await deleteDoc(assetRef);
        await logAction('Asset Deleted', `Asset removed from system: ${assetName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  },
  allocations: {
    list: async (): Promise<Allocation[]> => {
      const path = 'allocations';
      try {
        const sn = await getDocs(collection(db, path));
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as Allocation[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribe: (callback: (allocations: Allocation[]) => void, onError: (error: any) => void) => {
      const path = 'allocations';
      return onSnapshot(collection(db, path), (sn) => {
        callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as Allocation[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    create: async (data: any): Promise<Allocation> => {
      const path = 'allocations';
      try {
        const id = doc(collection(db, path)).id;
        const docRef = doc(db, path, id);
        await setDoc(docRef, {
          ...data,
          id,
          allocationDate: serverTimestamp(),
          status: 'Active'
        });
        const newDoc = await getDoc(docRef);
        const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as Allocation;
        
        const assetSnap = await getDoc(doc(db, 'assets', result.assetId));
        const userSnap = await getDoc(doc(db, 'users', result.userId));
        const assetName = assetSnap.exists() ? assetSnap.data()?.name : 'Asset';
        const targetUserName = userSnap.exists() ? userSnap.data()?.name : 'Staff';
        
        await logAction('Asset Allocation', `Assigned ${assetName} to ${targetUserName}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    return: async (id: string, returnData?: { condition: string, notes: string }): Promise<Allocation> => {
      const path = `allocations/${id}`;
      try {
        const docRef = doc(db, 'allocations', id);
        await updateDoc(docRef, {
          status: 'Returned',
          returnDate: serverTimestamp(),
          returnCondition: returnData?.condition || 'Good',
          returnNotes: returnData?.notes || ''
        });
        const updatedDoc = await getDoc(docRef);
        const result = convertDoc({ id: updatedDoc.id, ...updatedDoc.data() }) as Allocation;
        
        const assetSnap = await getDoc(doc(db, 'assets', result.assetId));
        const assetName = assetSnap.exists() ? assetSnap.data()?.name : 'Asset';
        
        await logAction('Asset Return', `Asset returned: ${assetName} (Condition: ${returnData?.condition || 'Good'})`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  },
  metadata: {
    departments: async (): Promise<Department[]> => {
      const path = 'departments';
      try {
        const sn = await getDocs(collection(db, path));
        return sn.docs.map(d => ({ id: d.id, ...d.data() })) as Department[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribeDepartments: (callback: (depts: Department[]) => void, onError: (error: any) => void) => {
      const path = 'departments';
      return onSnapshot(collection(db, path), (sn) => {
        callback(sn.docs.map(d => ({ id: d.id, ...d.data() })) as Department[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    createDepartment: async (data: Partial<Department>): Promise<Department> => {
      const path = 'departments';
      try {
        const id = doc(collection(db, path)).id;
        const docRef = doc(db, path, id);
        await setDoc(docRef, { ...data, id });
        const newDoc = await getDoc(docRef);
        const result = { id: newDoc.id, ...newDoc.data() } as Department;
        await logAction('Metadata Change', `New department created: ${result.name}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    updateDepartment: async (id: string, data: Partial<Department>): Promise<Department> => {
      const path = `departments/${id}`;
      try {
        const docRef = doc(db, 'departments', id);
        await updateDoc(docRef, data);
        const updatedDoc = await getDoc(docRef);
        const result = { id: updatedDoc.id, ...updatedDoc.data() } as Department;
        await logAction('Metadata Change', `Department updated: ${result.name}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    deleteDepartment: async (id: string): Promise<void> => {
      const path = `departments/${id}`;
      try {
        const deptRef = doc(db, 'departments', id);
        const deptSnap = await getDoc(deptRef);
        const deptName = deptSnap.exists() ? deptSnap.data()?.name : id;
        
        await deleteDoc(deptRef);
        await logAction('Metadata Change', `Department deleted: ${deptName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    categories: async (): Promise<Category[]> => {
      const path = 'categories';
      try {
        const sn = await getDocs(collection(db, path));
        return sn.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribeCategories: (callback: (cats: Category[]) => void, onError: (error: any) => void) => {
      const path = 'categories';
      return onSnapshot(collection(db, path), (sn) => {
        callback(sn.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    createCategory: async (data: Partial<Category>): Promise<Category> => {
      const path = 'categories';
      try {
        const id = doc(collection(db, path)).id;
        const docRef = doc(db, path, id);
        await setDoc(docRef, { ...data, id });
        const newDoc = await getDoc(docRef);
        const result = { id: newDoc.id, ...newDoc.data() } as Category;
        await logAction('Metadata Change', `New asset type created: ${result.name}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    updateCategory: async (id: string, data: Partial<Category>): Promise<Category> => {
      const path = `categories/${id}`;
      try {
        const docRef = doc(db, 'categories', id);
        await updateDoc(docRef, data);
        const updatedDoc = await getDoc(docRef);
        const result = { id: updatedDoc.id, ...updatedDoc.data() } as Category;
        await logAction('Metadata Change', `Asset type updated: ${result.name}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    deleteCategory: async (id: string): Promise<void> => {
      const path = `categories/${id}`;
      try {
        const catRef = doc(db, 'categories', id);
        const catSnap = await getDoc(catRef);
        const catName = catSnap.exists() ? catSnap.data()?.name : id;
        
        await deleteDoc(catRef);
        await logAction('Metadata Change', `Asset type deleted: ${catName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    users: async (): Promise<User[]> => {
      const path = 'users';
      try {
        const sn = await getDocs(collection(db, path));
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as User[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribeUsers: (callback: (users: User[]) => void, onError: (error: any) => void) => {
      const path = 'users';
      return onSnapshot(collection(db, path), (sn) => {
        callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as User[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    createUser: async (data: Partial<User>): Promise<User> => {
      const path = 'users';
      try {
        if (data.email && (data as any).password) {
          // Use a unique name for the secondary app to avoid collisions
          const appName = `SecondaryAuthApp_${Date.now()}`;
          const secondaryApp = initializeApp(firebaseConfig, appName);
          const secondaryAuth = getAuth(secondaryApp);
          
          try {
            let uid: string;
            try {
              const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, (data as any).password);
              uid = userCredential.user.uid;
            } catch (err: any) {
              if (err.code === 'auth/email-already-in-use') {
                // If already in auth, try to sign in to get the UID and link to firestore
                try {
                  const userCredential = await signInWithEmailAndPassword(secondaryAuth, data.email, (data as any).password);
                  uid = userCredential.user.uid;
                } catch (signInErr: any) {
                  if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
                    throw new Error('This email is already registered with a different password. Please contact the user or use a different email.');
                  }
                  throw signInErr;
                }
              } else {
                throw err;
              }
            }

            const docRef = doc(db, 'users', uid);
            const { password: _, ...userData } = data as any;
            await setDoc(docRef, {
              ...userData,
              id: uid,
              status: userData.status || 'Active',
              createdAt: serverTimestamp()
            }, { merge: true });
            
            await signOut(secondaryAuth);
            const newDoc = await getDoc(docRef);
            const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as User;
            await logAction('User Management', `New user registered: ${result.name} (${result.role})`);
            return result;
          } finally {
            try {
              await deleteApp(secondaryApp);
            } catch (e) {
              console.error('Error deleting secondary app:', e);
            }
          }
        } else {
          const id = doc(collection(db, path)).id;
          const docRef = doc(db, path, id);
          await setDoc(docRef, {
            ...data,
            id,
            status: data.status || 'Active',
            createdAt: serverTimestamp()
          });
          const newDoc = await getDoc(docRef);
          const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as User;
          await logAction('User Management', `New user registered: ${result.name} (${result.role})`);
          return result;
        }
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    updateUser: async (id: string, data: Partial<User>): Promise<User> => {
      const path = `users/${id}`;
      try {
        const docRef = doc(db, 'users', id);
        const { password: _, ...updateData } = data as any;
        await updateDoc(docRef, updateData);
        const updatedDoc = await getDoc(docRef);
        const result = convertDoc({ id: updatedDoc.id, ...updatedDoc.data() }) as User;
        await logAction('User Management', `User profile updated: ${result.name}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    deleteUser: async (id: string): Promise<void> => {
      const path = `users/${id}`;
      try {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        const userName = userSnap.exists() ? userSnap.data()?.name : id;
        
        await deleteDoc(userRef);
        await logAction('User Management', `User accounts deactivated: ${userName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    },
    auditLogs: async (): Promise<AuditLog[]> => {
      const path = 'auditLogs';
      try {
        const q = query(collection(db, path), orderBy('timestamp', 'desc'));
        const sn = await getDocs(q);
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as AuditLog[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribeLogs: (callback: (logs: AuditLog[]) => void, onError: (error: any) => void) => {
      const path = 'auditLogs';
      const q = query(collection(db, path), orderBy('timestamp', 'desc'));
      return onSnapshot(q, (sn) => {
        callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as AuditLog[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    seedDatabase: async () => {
      // Check if departments exist
      const depts = await getDocs(collection(db, 'departments'));
      if (depts.empty) {
        await addDoc(collection(db, 'departments'), { name: 'ICT Department' });
        await addDoc(collection(db, 'departments'), { name: 'Engineering' });
      }
      
      const cats = await getDocs(collection(db, 'categories'));
      if (cats.empty) {
        await addDoc(collection(db, 'categories'), { name: 'Laptops' });
        await addDoc(collection(db, 'categories'), { name: 'Printers' });
        await addDoc(collection(db, 'categories'), { name: 'Networking' });
      }
    }
  },
  requests: {
    list: async (): Promise<AssetRequest[]> => {
      const path = 'assetRequests';
      try {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        const sn = await getDocs(q);
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as AssetRequest[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    subscribe: (callback: (requests: AssetRequest[]) => void, onError: (error: any) => void) => {
      const path = 'assetRequests';
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (sn) => {
        callback(sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as AssetRequest[]);
      }, (err) => {
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    subscribeByUser: (userId: string, callback: (requests: AssetRequest[]) => void, onError: (error: any) => void) => {
      const path = 'assetRequests';
      console.log('subscribeByUser: querying', path, 'for userId:', userId);
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (sn) => {
        const all = sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })) as AssetRequest[];
        const filtered = all.filter(r => r.requesterId === userId);
        console.log('subscribeByUser: total docs:', all.length, 'filtered for user:', filtered.length);
        callback(filtered);
      }, (err) => {
        console.error('subscribeByUser: onSnapshot error:', err);
        handleFirestoreError(err, OperationType.GET, path);
        onError(err);
      });
    },
    listByUser: async (userId: string): Promise<AssetRequest[]> => {
      const path = 'assetRequests';
      try {
        const sn = await getDocs(collection(db, path));
        return sn.docs.map(d => convertDoc({ id: d.id, ...d.data() })).filter(r => r.requesterId === userId) as AssetRequest[];
      } catch (error) {
        return handleFirestoreError(error, OperationType.LIST, path);
      }
    },
    create: async (data: Omit<AssetRequest, 'id' | 'status' | 'createdAt'>): Promise<AssetRequest> => {
      const path = 'assetRequests';
      try {
        console.log('Creating asset request with data:', data);
        const id = doc(collection(db, path)).id;
        const docRef = doc(db, path, id);
        await setDoc(docRef, {
          ...data,
          id,
          status: 'Pending',
          createdAt: serverTimestamp()
        });
        const newDoc = await getDoc(docRef);
        const result = convertDoc({ id: newDoc.id, ...newDoc.data() }) as AssetRequest;
        await logAction('Asset Request Created', `Request for ${data.quantity}x ${data.categoryName} by ${data.requesterName}`);
        return result;
      } catch (error) {
        return handleFirestoreError(error, OperationType.CREATE, path);
      }
    },
    approve: async (id: string, approvedQuantity: number, adminNotes: string): Promise<void> => {
      const path = `assetRequests/${id}`;
      try {
        const docRef = doc(db, 'assetRequests', id);
        
        const user = auth.currentUser;
        let adminName = 'Admin';
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) adminName = userDoc.data()?.name;
        }

        await updateDoc(docRef, {
          status: 'Approved',
          approvedQuantity,
          adminNotes,
          reviewedBy: user?.uid,
          reviewedByName: adminName,
          reviewedAt: serverTimestamp()
        });
        
        const reqDoc = await getDoc(docRef);
        const reqData = reqDoc.data() as AssetRequest;
        await logAction('Asset Request Approved', `Approved ${approvedQuantity}x ${reqData.categoryName} for ${reqData.requesterName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    disapprove: async (id: string, adminNotes: string): Promise<void> => {
      const path = `assetRequests/${id}`;
      try {
        const docRef = doc(db, 'assetRequests', id);
        
        const user = auth.currentUser;
        let adminName = 'Admin';
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) adminName = userDoc.data()?.name;
        }

        await updateDoc(docRef, {
          status: 'Disapproved',
          adminNotes,
          reviewedBy: user?.uid,
          reviewedByName: adminName,
          reviewedAt: serverTimestamp()
        });

        const reqDoc = await getDoc(docRef);
        const reqData = reqDoc.data() as AssetRequest;
        await logAction('Asset Request Disapproved', `Disapproved request for ${reqData.categoryName} from ${reqData.requesterName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    fulfill: async (id: string): Promise<void> => {
      const path = `assetRequests/${id}`;
      try {
        const docRef = doc(db, 'assetRequests', id);
        await updateDoc(docRef, {
          status: 'Fulfilled'
        });
        const reqDoc = await getDoc(docRef);
        const reqData = reqDoc.data() as AssetRequest;
        await logAction('Asset Request Fulfilled', `Fulfilled request for ${reqData.categoryName} to ${reqData.requesterName}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }
};
