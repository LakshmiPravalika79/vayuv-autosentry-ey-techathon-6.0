import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import type { UserRole } from './types';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Vehicles from './pages/Vehicles';
import VehicleDetail from './pages/VehicleDetail';
import Telemetry from './pages/Telemetry';
import Predictions from './pages/Predictions';
import DigitalTwin from './pages/DigitalTwin';
import Appointments from './pages/Appointments';
import Feedback from './pages/Feedback';
import RCAInsights from './pages/RCAInsights';
import UEBAAlerts from './pages/UEBAAlerts';
import Settings from './pages/Settings';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles && user && !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Smart Dashboard that renders based on role
function SmartDashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  
  return isAdmin ? <AdminDashboard /> : <Dashboard />;
}

function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<SmartDashboard />} />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicles/:id" element={<VehicleDetail />} />
        <Route path="/telemetry" element={<Telemetry />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/digital-twin" element={<DigitalTwin />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/rca-insights" element={<RCAInsights />} />
        <Route path="/ueba-alerts" element={<UEBAAlerts />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
