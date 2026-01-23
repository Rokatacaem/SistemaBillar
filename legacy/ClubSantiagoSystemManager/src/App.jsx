import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './modules/auth/LoginPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import MembersPage from './modules/members/MembersPage';
import MemberForm from './modules/members/MemberForm';
import TablesPage from './modules/tables/TablesPage';
import ProductsPage from './modules/products/ProductsPage';
import ShiftsPage from './modules/shifts/ShiftsPage';
import MembershipPage from './modules/members/MembershipPage';
import MainLayout from './components/layout/MainLayout';
import PrinterEmulator from './components/PrinterEmulator';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;

  return children;
};

function AppContent() {
  return (
    <>
      <PrinterEmulator />
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Layout Routes */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<MemberForm />} />
          <Route path="/members/edit/:id" element={<MemberForm />} />
          <Route path="/tables" element={<TablesPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/shifts" element={<ShiftsPage />} />
          <Route path="/memberships" element={<MembershipPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
