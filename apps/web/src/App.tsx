import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import StaffLoginPage from './pages/StaffLoginPage';
import SuperAdminLoginPage from './pages/SuperAdminLoginPage';
import StudentRegisterPage from './pages/StudentRegisterPage';
import StudentStatusPage from './pages/StudentStatusPage';
import RegulatorDashboardPage from './pages/RegulatorDashboardPage';
import RoomMapPage from './pages/RoomMapPage';
import AdminCampaignsPage from './pages/AdminCampaignsPage';
import RosterPage from './pages/RosterPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PublicDisplayPage from './pages/PublicDisplayPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import AppShell from './components/AppShell';
import AdminShell from './components/AdminShell';
import AdminOverviewPage from './pages/admin/AdminOverviewPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminConfigurationPage from './pages/admin/AdminConfigurationPage';
import AdminHealthPage from './pages/admin/AdminHealthPage';
import AdminDataPage from './pages/admin/AdminDataPage';
import AdminSecurityPage from './pages/admin/AdminSecurityPage';
import AdminCompaniesPage from './pages/admin/AdminCompaniesPage';

function Loading() {
  return <div className="loading-center"><span className="spinner" /></div>;
}

function StaffRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me || me.kind !== 'staff') return <Navigate to="/login" replace />;
  return children;
}

function SuperAdminRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me || me.kind !== 'staff') return <Navigate to="/admin/login" replace />;
  if (me.role !== 'SUPERADMIN') return <AccessDeniedPage />;
  return children;
}

function StudentRoute({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me || me.kind !== 'student') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<StaffLoginPage />} />
      <Route path="/admin/login" element={<SuperAdminLoginPage />} />
      <Route path="/register/:campaignId" element={<StudentRegisterPage />} />
      <Route path="/display/:campaignId" element={<PublicDisplayPage />} />
      <Route path="/student" element={<StudentRoute><StudentStatusPage /></StudentRoute>} />

      {/* Staff (organizer / ordinary admin) */}
      <Route path="/dashboard" element={<StaffRoute><AppShell><RegulatorDashboardPage /></AppShell></StaffRoute>} />
      <Route path="/campaigns" element={<StaffRoute><AppShell><AdminCampaignsPage /></AppShell></StaffRoute>} />
      <Route path="/campaigns/:campaignId/map" element={<StaffRoute><AppShell><RoomMapPage /></AppShell></StaffRoute>} />
      <Route path="/campaigns/:campaignId/roster" element={<StaffRoute><AppShell><RosterPage /></AppShell></StaffRoute>} />
      <Route path="/campaigns/:campaignId/analytics" element={<StaffRoute><AppShell><AnalyticsPage /></AppShell></StaffRoute>} />

      {/* Superadmin control center */}
      <Route path="/admin" element={<SuperAdminRoute><AdminShell><AdminOverviewPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/operations" element={<SuperAdminRoute><AdminShell><RegulatorDashboardPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/campaigns" element={<SuperAdminRoute><AdminShell><AdminCampaignsPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/campaigns/:campaignId/map" element={<SuperAdminRoute><AdminShell><RoomMapPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/campaigns/:campaignId/roster" element={<SuperAdminRoute><AdminShell><RosterPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/campaigns/:campaignId/analytics" element={<SuperAdminRoute><AdminShell><AnalyticsPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/users" element={<SuperAdminRoute><AdminShell><AdminUsersPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/companies" element={<SuperAdminRoute><AdminShell><AdminCompaniesPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/notifications" element={<SuperAdminRoute><AdminShell><AdminNotificationsPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/audit" element={<SuperAdminRoute><AdminShell><AdminAuditPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/health" element={<SuperAdminRoute><AdminShell><AdminHealthPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/configuration" element={<SuperAdminRoute><AdminShell><AdminConfigurationPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/data" element={<SuperAdminRoute><AdminShell><AdminDataPage /></AdminShell></SuperAdminRoute>} />
      <Route path="/admin/security" element={<SuperAdminRoute><AdminShell><AdminSecurityPage /></AdminShell></SuperAdminRoute>} />

      <Route path="/" element={<Landing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Landing() {
  const { me, loading } = useAuth();
  if (loading) return <Loading />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.kind === 'student') return <Navigate to="/student" replace />;
  if (me.role === 'SUPERADMIN') return <Navigate to="/admin" replace />;
  if (me.role === 'ADMIN') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
