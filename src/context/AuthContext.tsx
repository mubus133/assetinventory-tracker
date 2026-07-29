import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

const MASTER_ADMIN_EMAIL = 'mubarak@crescent.edu.ng';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          // Bootstrap Master Admin if record doesn't exist but Email matches
          if (!userDoc.exists() && firebaseUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
            try {
              const adminData = {
                id: firebaseUser.uid,
                name: 'Mubarak',
                email: firebaseUser.email,
                role: 'Admin',
                status: 'Active',
                departmentId: 'ICT',
                createdAt: serverTimestamp()
              };
              await setDoc(userDocRef, adminData);
              userDoc = await getDoc(userDocRef);
            } catch (bootstrapErr) {
              console.error('Master admin bootstrap failed in context:', bootstrapErr);
            }
          }

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const userWithId = { ...userData, id: userDoc.id };
            console.log('AuthContext: user loaded', userWithId.email, 'id:', userWithId.id, 'docId:', userDoc.id);
            setUser(userWithId);
            setToken(await firebaseUser.getIdToken());
          } else {
            // User authenticated with Firebase but no record in Firestore (and not master admin)
            console.warn('Authenticated user has no record in systems. Access Denied.');
            await auth.signOut();
            setUser(null);
            setToken(null);
          }
        } catch (error) {
          console.error('Auth state error:', error);
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await auth.signOut();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
