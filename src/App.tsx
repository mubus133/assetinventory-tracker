import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { AssetInventory } from './pages/AssetInventory';
import { AssetAllocation } from './pages/AssetAllocation';
import { AssetReturn } from './pages/AssetReturn';
import { Reports } from './pages/Reports';
import { UserManagement } from './pages/UserManagement';
import { AuditLog } from './pages/AuditLog';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/assets" element={
            <ProtectedRoute>
              <AssetInventory />
            </ProtectedRoute>
          } />

          <Route path="/allocations" element={
            <ProtectedRoute>
              <AssetAllocation />
            </ProtectedRoute>
          } />

          <Route path="/return" element={
            <ProtectedRoute>
              <AssetReturn />
            </ProtectedRoute>
          } />

          <Route path="/search" element={
            <ProtectedRoute>
              <AssetInventory /> {/* Search is integrated into inventory for this demo */}
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/audit" element={
            <ProtectedRoute>
              <AuditLog />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
