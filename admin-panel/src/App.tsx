import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { syncDown } from './services/sync.service';
import {
  getDeliveries,
  updateDelivery,
  addDeliveryNotification,
  getBusiness,
} from './services/storage.service';
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
import AdminLogin from './pages/AdminLogin';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Chat from './pages/Chat';

// Business portal
import BusinessLayout from './portals/business/BusinessLayout';
import BusinessDashboard from './portals/business/pages/BusinessDashboard';
import NewDelivery from './portals/business/pages/NewDelivery';
import BusinessDeliveries from './portals/business/pages/BusinessDeliveries';
import BusinessChat from './portals/business/pages/BusinessChat';
import BusinessProfile from './portals/business/pages/BusinessProfile';

// Courier portal
import CourierLayout from './portals/courier/CourierLayout';
import CourierDashboard from './portals/courier/pages/CourierDashboard';
import AvailableDeliveries from './portals/courier/pages/AvailableDeliveries';
import CourierDeliveries from './portals/courier/pages/CourierDeliveries';
import CourierChat from './portals/courier/pages/CourierChat';
import CourierProfile from './portals/courier/pages/CourierProfile';

// Determine the correct home path based on stored role
function getRoleHome(): string {
  const role = localStorage.getItem('admin_role');
  if (role === 'business') return '/business/dashboard';
  if (role === 'courier') return '/courier/dashboard';
  return '/dashboard';
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Check every minute for scheduled deliveries whose time has arrived */
function checkScheduledDeliveries() {
  const now = new Date();
  const deliveries = getDeliveries();
  for (const d of deliveries) {
    if (d.status === 'scheduled' && d.scheduledAt) {
      if (new Date(d.scheduledAt) <= now) {
        // Time arrived — switch to pending and send notification
        updateDelivery(d.id, { status: 'pending' });
        const biz = getBusiness(d.businessId);
        addDeliveryNotification({
          businessId: d.businessId,
          businessName: biz?.businessName ?? d.businessName,
          pickupAddress: d.pickupAddress,
          dropAddress: d.dropAddress,
          description: d.description,
          price: d.price,
          requiredVehicle: d.requiredVehicle,
          paymentMethod: d.paymentMethod,
          customerPaid: d.customerPaid,
          scheduledAt: d.scheduledAt,
        });
        console.log(`[scheduler] Activated scheduled delivery ${d.id}`);
      }
    }
  }
}

const App: React.FC = () => {
  // On every app start: pull latest data from Supabase into localStorage
  useEffect(() => {
    syncDown();
    checkScheduledDeliveries(); // check on startup too
    const t = setInterval(checkScheduledDeliveries, 60_000); // every minute
    return () => clearInterval(t);
  }, []);

  return (
    <Provider store={store}>
      <div dir="rtl">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/djf-2691" element={<AdminLogin />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                localStorage.getItem('admin_token')
                  ? <Navigate to={getRoleHome()} replace />
                  : <Navigate to="/login" replace />
              }
            />

            {/* ── Admin portal ── */}
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
              <Route path="/chat" element={<Chat />} />
              <Route path="/live-map" element={<LiveMap />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/bonuses" element={<Bonuses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* ── Business portal ── */}
            <Route
              path="/business"
              element={
                <ProtectedRoute>
                  <BusinessLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/business/dashboard" replace />} />
              <Route path="dashboard" element={<BusinessDashboard />} />
              <Route path="new-delivery" element={<NewDelivery />} />
              <Route path="deliveries" element={<BusinessDeliveries />} />
              <Route path="chat" element={<BusinessChat />} />
              <Route path="profile" element={<BusinessProfile />} />
            </Route>

            {/* ── Courier portal ── */}
            <Route
              path="/courier"
              element={
                <ProtectedRoute>
                  <CourierLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/courier/dashboard" replace />} />
              <Route path="dashboard" element={<CourierDashboard />} />
              <Route path="available" element={<AvailableDeliveries />} />
              <Route path="deliveries" element={<CourierDeliveries />} />
              <Route path="chat" element={<CourierChat />} />
              <Route path="profile" element={<CourierProfile />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      </div>
    </Provider>
  );
};

export default App;
