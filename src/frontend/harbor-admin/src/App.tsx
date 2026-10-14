import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import PasswordReset from './pages/auth/PasswordReset';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import SystemHealth from './pages/health/SystemHealth';
import Observability from './pages/observability/Observability';
import UsersManagement from './pages/users/UsersManagement';
import Projects from './pages/projects/Projects';
import GlobalDomains from './pages/domains/GlobalDomains';
import Environments from './pages/environments/Environments';
import Deployments from './pages/deployments/Deployments';
import DeploymentReport from './pages/reports/DeploymentReport';
import AuditLogs from './pages/audit/AuditLogs';
import AccountSettings from './pages/settings/AccountSettings';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/password-reset" element={<PasswordReset />} />
      </Route>

      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/health" element={<SystemHealth />} />
        <Route path="/observability" element={<Observability />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/domains" element={<GlobalDomains />} />
        <Route path="/environments" element={<Environments />} />
        <Route path="/deployments" element={<Deployments />} />
        <Route path="/reports" element={<DeploymentReport />} />
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/settings" element={<AccountSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
