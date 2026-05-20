import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Receitas from './pages/Receitas';
import Despesas from './pages/Despesas';
import OrcamentoPublico from './pages/OrcamentoPublico';
import Products from './pages/Products';
import Quotes from './pages/Quotes';
import Caixa from './pages/Caixa';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loading">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="full-loading">Carregando...</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Caixa />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="receitas"   element={<Receitas />} />
            <Route path="despesas"   element={<Despesas />} />
            <Route path="products"   element={<Products />} />
            <Route path="quotes"     element={<Quotes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
