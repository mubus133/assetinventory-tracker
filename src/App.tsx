import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
import { SystemSettings } from './pages/SystemSettings';
import { Maintenance } from './pages/Maintenance';
import { AssetRequestPage } from './pages/AssetRequest';
import { RequestApproval } from './pages/RequestApproval';
import type { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-deep flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && (!user || !roles.includes(user.role))) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
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
            <ProtectedRoute roles={['Admin', 'Store Officer']}>
              <AssetAllocation />
            </ProtectedRoute>
          } />

          <Route path="/requests" element={
            <ProtectedRoute>
              <AssetRequestPage />
            </ProtectedRoute>
          } />

          <Route path="/request-approval" element={
            <ProtectedRoute roles={['Admin', 'Store Officer', 'Inventory Officer']}>
              <RequestApproval />
            </ProtectedRoute>
          } />

          <Route path="/return" element={
            <ProtectedRoute roles={['Admin', 'Store Officer']}>
              <AssetReturn />
            </ProtectedRoute>
          } />

          <Route path="/maintenance" element={
            <ProtectedRoute roles={['Admin', 'Store Officer', 'Inventory Officer']}>
              <Maintenance />
            </ProtectedRoute>
          } />

          <Route path="/search" element={
            <ProtectedRoute>
              <AssetInventory /> {/* Search is integrated into inventory for this demo */}
            </ProtectedRoute>
          } />

          <Route path="/reports" element={
            <ProtectedRoute roles={['Admin', 'Management']}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute roles={['Admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/audit" element={
            <ProtectedRoute roles={['Admin']}>
              <AuditLog />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute roles={['Admin']}>
              <SystemSettings />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
