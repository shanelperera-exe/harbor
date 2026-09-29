import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/home/Home';
import CreateAccount from './pages/auth/CreateAccount';
import Login from './pages/auth/Login';
import PasswordReset from './pages/auth/PasswordReset';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Projects from './pages/projects/Projects';
import CreateProject from './pages/projects/CreateProject';
import ProjectSettings from './pages/projects/ProjectSettings';
import Deployments from './pages/deployments/Deployments';
import ProjectEnvironments from './pages/projects/ProjectEnvironments';
import EnvironmentSettings from './pages/projects/EnvironmentSettings';
import Environments from './pages/environments/Environments';
import AccountSettings from './pages/settings/AccountSettings';
import ExternalAuthCallback from './pages/auth/ExternalAuthCallback';
import GitHubAppInstallCallback from './pages/auth/GitHubAppInstallCallback';
import NewService from './pages/services/NewService';
import NewServiceRepoSelection from './pages/services/NewServiceRepoSelection';
import NewServiceConfigure from './pages/services/NewServiceConfigure';
import ServiceDetails from './pages/services/ServiceDetails';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<CreateAccount />} />
        <Route path="/login" element={<Login />} />
        <Route path="/password-reset" element={<PasswordReset />} />
        <Route path="/oauth/callback" element={<ExternalAuthCallback />} />
        <Route path="/github/install/callback" element={<GitHubAppInstallCallback />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<DashboardLayout />}>
        <Route index element={<Projects />} />
        <Route path="new" element={<CreateProject />} />
        <Route path=":id/settings" element={<ProjectSettings />} />
        <Route path=":projectId/services/new" element={<NewService />} />
        <Route path=":projectId/services/new/:serviceType" element={<NewServiceRepoSelection />} />
        <Route path=":projectId/services/new/:serviceType/configure" element={<NewServiceConfigure />} />
        <Route path=":id/environments" element={<ProjectEnvironments />} />
        <Route path=":projectId/environments/:envId/settings" element={<EnvironmentSettings />} />
        <Route path=":projectId/services/:serviceId/*" element={<ServiceDetails />} />

      </Route>
      <Route path="/environments" element={<DashboardLayout />}>
        <Route index element={<Environments />} />
      </Route>
      <Route path="/deployments" element={<DashboardLayout />}>
        <Route index element={<Deployments />} />
      </Route>
      <Route path="/settings" element={<DashboardLayout />}>
        <Route index element={<AccountSettings />} />
      </Route>
    </Routes>
  );
}

export default App;