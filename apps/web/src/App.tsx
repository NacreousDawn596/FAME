import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import StaffLoginPage from './pages/StaffLoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import StudentStatusPage from './pages/StudentStatusPage';
import RegulatorDashboardPage from './pages/RegulatorDashboardPage';
import RoomMapPage from './pages/RoomMapPage';
import AdminCampaignsPage from './pages/AdminCampaignsPage';
import RosterPage from './pages/RosterPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PublicDisplayPage from './pages/PublicDisplayPage';
import AppShell from './components/AppShell';

function StaffRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner" /></div>;
  if (!me || me.kind !== 'staff') return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner" /></div>;
  if (!me || me.kind !== 'staff') return <Navigate to="/login" replace />;
  if (me.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

function StudentRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner" /></div>;
  if (!me || me.kind !== 'student') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<StaffLoginPage />} />
      <Route path="/register/:campaignId" element={<StudentRegisterPage />} />
      <Route path="/display/:campaignId" element={<PublicDisplayPage />} />
      <Route
        path="/student"
        element={<StudentRoute><StudentStatusPage /></StudentRoute>}
      />
      <Route
        path="/dashboard"
        element={<StaffRoute><AppShell><RegulatorDashboardPage /></AppShell></StaffRoute>}
      />
      <Route
        path="/campaigns/:campaignId/map"
        element={<StaffRoute><AppShell><RoomMapPage /></AppShell></StaffRoute>}
      />
      <Route
        path="/campaigns/:campaignId/roster"
        element={<StaffRoute><AppShell><RosterPage /></AppShell></StaffRoute>}
      />
      <Route
        path="/campaigns/:campaignId/analytics"
        element={<StaffRoute><AppShell><AnalyticsPage /></AppShell></StaffRoute>}
      />
      <Route
        path="/admin"
        element={<AdminRoute><AppShell><AdminCampaignsPage /></AppShell></AdminRoute>}
      />
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Landing() {
  const { me, loading } = useAuth();
  if (loading) return <div className="loading-center"><span className="spinner" /></div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.kind === 'student') return <Navigate to="/student" replace />;
  if (me.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}
