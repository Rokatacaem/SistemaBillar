import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MesasPage from './pages/MesasPage';
import TurnosPage from './pages/TurnosPage';
import PedidosPage from './pages/PedidosPage';
import ReportesPage from './pages/ReportesPage';
import Navbar from './components/Navbar';

function AppRoutes() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<MesasPage />} />
        <Route path="/turnos" element={<TurnosPage />} />
        <Route path="/pedidos" element={<PedidosPage />} />
        <Route path="/reportes" element={<ReportesPage />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;