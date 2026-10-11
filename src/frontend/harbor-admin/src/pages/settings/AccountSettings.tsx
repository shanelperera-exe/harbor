import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { clearAuthSession } from '../../services/authSession';
import UserAvatar from '../../components/ui/UserAvatar';
import {
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Server,
  LogOut,
  Monitor,
  Sun,
  Moon
} from 'lucide-react';

const authApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [user, setUser] = useState<{ username: string; email: string; role: string; avatarSvg: string | null }>({
    username: 'Admin',
    email: '',
    role: 'Admin',
    avatarSvg: null
  });

  // Change password states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('harbor_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUser({
          username: u.username || 'Admin',
          email: u.email || '',
          role: u.role || 'Admin',
          avatarSvg: u.avatarSvg || null
        });
      }
    } catch {
      // ignore
    }
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const token = localStorage.getItem('harbor_token');
      const response = await fetch(`${authApiBase}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || data?.message || 'Failed to update password.');
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleLogout() {
    clearAuthSession();
    navigate('/login');
  }

  return (
    <div className="w-full h-full p-6 lg:px-12 xl:px-20 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#202124] transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-gray-300 dark:border-[#3c4043]">
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
            Platform Settings & Credentials
          </h1>
          <p className="text-gray-500 dark:text-[#9aa0a6] mt-1 text-sm font-normal">
            Administrative credentials, interface theme selection, and control center parameters.
          </p>
        </div>

        {/* Profile Card */}
        <div className="p-5 rounded-sm border border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] space-y-5">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#3c4043] pb-3">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Operator Identity</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-mono bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Role: {user.role}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <UserAvatar
              username={user.username}
              svgString={user.avatarSvg}
              size={52}
              className="rounded-sm"
            />
            <div className="space-y-0.5">
              <p className="text-base font-medium text-gray-900 dark:text-white">{user.username}</p>
              <p className="text-xs font-mono text-gray-500 dark:text-[#9aa0a6]">{user.email || 'admin@harbor.local'}</p>
              <p className="text-[11px] text-gray-400 dark:text-[#9aa0a6] pt-1 font-normal">
                Elevated privileges enabled for cross-tenant infrastructure operations and deployments.
              </p>
            </div>
          </div>
        </div>

        {/* Appearance / Theme */}
        <div className="p-5 rounded-sm border border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] space-y-4">
          <div>
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Interface Theme</h2>
            <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-0.5">
              Select display palette for the Harbor operator console.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center gap-3 p-3 rounded-sm border transition-all text-left ${
                theme === 'system'
                  ? 'border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/30 text-[#2563eb] dark:text-blue-400'
                  : 'border-gray-300 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#2c2d30] text-gray-700 dark:text-gray-300'
              }`}
            >
              <Monitor className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">System</p>
                <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6]">Match operating system</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center gap-3 p-3 rounded-sm border transition-all text-left ${
                theme === 'light'
                  ? 'border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/30 text-[#2563eb] dark:text-blue-400'
                  : 'border-gray-300 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#2c2d30] text-gray-700 dark:text-gray-300'
              }`}
            >
              <Sun className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Light</p>
                <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6]">Clean high-contrast</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-3 p-3 rounded-sm border transition-all text-left ${
                theme === 'dark'
                  ? 'border-[#2563eb] bg-blue-50/50 dark:bg-blue-950/30 text-[#2563eb] dark:text-blue-400'
                  : 'border-gray-300 dark:border-[#3c4043] hover:bg-gray-50 dark:hover:bg-[#2c2d30] text-gray-700 dark:text-gray-300'
              }`}
            >
              <Moon className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium">Dark</p>
                <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6]">Obsidian (#202124)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Security & Password */}
        <div className="p-5 rounded-sm border border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">Admin Credentials</h2>
              <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-0.5">
                Update administrative password to secure control plane access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-gray-300 dark:border-[#3c4043] hover:bg-gray-100 dark:hover:bg-[#2c2d30] text-xs font-medium transition-colors"
            >
              <Key className="w-3.5 h-3.5 text-gray-500" />
              Change Password
            </button>
          </div>
        </div>

        {/* System & Connectivity Information */}
        <div className="p-5 rounded-sm border border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] space-y-3">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">System Connectivity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-sm bg-gray-50 dark:bg-[#28292c] border border-gray-200 dark:border-[#3c4043]">
              <span className="text-gray-500 dark:text-[#9aa0a6] flex items-center gap-1.5 font-mono">
                <Server className="w-3.5 h-3.5" /> API Gateway
              </span>
              <span className="font-mono text-xs text-gray-900 dark:text-white truncate max-w-[180px]" title={authApiBase}>
                {authApiBase}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-sm bg-gray-50 dark:bg-[#28292c] border border-gray-200 dark:border-[#3c4043]">
              <span className="text-gray-500 dark:text-[#9aa0a6] font-mono">Control Plane Version</span>
              <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                v1.4.2-operator
              </span>
            </div>
          </div>
        </div>

        {/* Sign Out Card */}
        <div className="p-5 rounded-sm border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-red-700 dark:text-red-400">End Operator Session</h2>
            <p className="text-xs text-gray-600 dark:text-[#9aa0a6] mt-0.5">
              Invalidates active bearer token and clears local administrative session.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#3c4043] pb-3">
              <h3 className="text-base font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Update Password
              </h3>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full h-9 px-3 pr-9 text-xs bg-transparent border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-[#2563eb] text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full h-9 px-3 pr-9 text-xs bg-transparent border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-[#2563eb] text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Confirm New Password</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full h-9 px-3 text-xs bg-transparent border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-[#2563eb] text-gray-900 dark:text-white"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-sm">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 p-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  <p>Password updated successfully!</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2c2d30] rounded-sm transition-colors border border-gray-300 dark:border-[#3c4043]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-3 py-1.5 text-xs bg-[#2563eb] hover:bg-blue-700 text-white font-medium rounded-sm transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
