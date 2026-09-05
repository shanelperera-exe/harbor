import './App.css';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/home/Home';
import CreateAccount from './pages/auth/CreateAccount';
import Login from './pages/auth/Login';
import PasswordReset from './pages/auth/PasswordReset';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/dashboard/Dashboard';
import CreateService from './pages/dashboard/CreateService';

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<CreateAccount />} />
        <Route path="/login" element={<Login />} />
        <Route path="/password-reset" element={<PasswordReset />} />
      </Route>
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="new" element={<CreateService />} />
      </Route>
    </Routes>
  );
}

export default App;
