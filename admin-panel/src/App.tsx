import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { Layout } from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import Couriers from './pages/Couriers';
import Businesses from './pages/Businesses';
import Pricing from './pages/Pricing';
import Bonuses from './pages/Bonuses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LiveMap from './pages/LiveMap';
import Login from './pages/Login';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <div dir="rtl">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/deliveries" element={<Deliveries />} />
              <Route path="/couriers" element={<Couriers />} />
              <Route path="/businesses" element={<Businesses />} />
              <Route path="/live-map" element={<LiveMap />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/bonuses" element={<Bonuses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      </div>
    </Provider>
  );
};

export default App;
