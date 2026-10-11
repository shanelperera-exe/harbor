import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Mail,
  FolderGit2
} from 'lucide-react';
import { fetchAllUsers, updateUserRole, toggleUserStatus, type AdminUser } from '../../services/userService';
import { formatDistanceToNow, format } from '../../utils/dateUtils';
import UserAvatar from '../../components/ui/UserAvatar';

export default function UsersManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Admin' | 'User'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAllUsers();
      setUsers(data);
    } catch {
      setMessage({ text: 'Failed to load user directory.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleToggle = async (user: AdminUser) => {
    const newRole = user.role === 'Admin' ? 'User' : 'Admin';
    if (!window.confirm(`Are you sure you want to change ${user.username}'s role to ${newRole}?`)) return;
    
    setActionLoadingId(user.id);
    try {
      await updateUserRole(user.id, newRole);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      setMessage({ text: `Updated ${user.username} role to ${newRole}`, type: 'success' });
    } catch {
      setMessage({ text: `Failed to update role for ${user.username}`, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusToggle = async (user: AdminUser) => {
    const actionLabel = user.status === 'active' ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${user.username}?`)) return;

    setActionLoadingId(user.id);
    try {
      await toggleUserStatus(user.id, user.status);
      const nextStatus = user.status === 'active' ? 'suspended' : 'active';
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: nextStatus } : u));
      setMessage({ text: `Account for ${user.username} is now ${nextStatus}`, type: 'success' });
    } catch {
      setMessage({ text: `Failed to update status for ${user.username}`, type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.publicId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter(u => u.role === 'Admin').length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
    };
  }, [users]);

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Users & Tenants Directory
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-[#2c2d30] border border-gray-300 dark:border-[#3c4043] text-gray-600 dark:text-[#bdc1c6]">
              {users.length} registered
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Cross-tenant identity management, administrative privilege elevation, and account controls.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Alert toast */}
      {message && (
        <div className={`mt-4 p-3 rounded-sm border text-xs font-mono flex items-center justify-between ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
        }`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="hover:underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider">Total Users</div>
          <div className="text-xl font-medium mt-1 text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="text-[11px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-wider">Admins</div>
          <div className="text-xl font-medium mt-1 text-gray-900 dark:text-white">{stats.admins}</div>
        </div>
        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Tenants</div>
          <div className="text-xl font-medium mt-1 text-gray-900 dark:text-white">{stats.active}</div>
        </div>
        <div className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124]">
          <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider">Suspended</div>
          <div className="text-xl font-medium mt-1 text-gray-900 dark:text-white">{stats.suspended}</div>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by username, email, or public ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9aa0a6]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">Standard User</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50/75 dark:bg-[#28292c] text-gray-600 dark:text-[#9aa0a6] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Identity</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Projects</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading user records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isActionBusy = actionLoadingId === user.id;

                  return (
                    <tr 
                      key={user.id} 
                      className="hover:bg-gray-50/80 dark:hover:bg-[#27282b] transition-colors"
                    >
                      {/* Identity */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <UserAvatar username={user.username} svgString={user.avatarSvg || null} size={28} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {user.username}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 dark:text-[#9aa0a6] truncate">
                              {user.publicId}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-[#bdc1c6]">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-2.5 px-3">
                        {user.role === 'Admin' ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-mono text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-[#bdc1c6] font-mono text-[10px]">
                            <span>User</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        {user.status === 'active' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                            active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
                            suspended
                          </span>
                        )}
                      </td>

                      {/* Projects */}
                      <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-[#bdc1c6]">
                        <div className="flex items-center space-x-1">
                          <FolderGit2 className="w-3.5 h-3.5 text-gray-400" />
                          <span>{user.projectCount}</span>
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-2.5 px-3 text-gray-500 dark:text-[#9aa0a6] text-[11px] whitespace-nowrap">
                        {format(user.createdAt, 'MMM dd, yyyy')}
                        <span className="block text-[10px] text-gray-400 dark:text-[#9aa0a6]">
                          {formatDistanceToNow(user.createdAt, { addSuffix: true })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleRoleToggle(user)}
                            disabled={isActionBusy}
                            title={user.role === 'Admin' ? 'Demote to User' : 'Elevate to Admin'}
                            className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            {user.role === 'Admin' ? (
                              <>
                                <ShieldAlert className="w-3 h-3 text-amber-500" />
                                <span>Demote</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3 h-3 text-blue-500" />
                                <span>Elevate</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusToggle(user)}
                            disabled={isActionBusy}
                            title={user.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                            className={`px-2 py-1 border rounded-sm text-[11px] font-normal transition-colors disabled:opacity-50 inline-flex items-center space-x-1 ${
                              user.status === 'active'
                                ? 'border-gray-300 dark:border-[#3c4043] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                                : 'border-gray-300 dark:border-[#3c4043] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            }`}
                          >
                            {user.status === 'active' ? (
                              <>
                                <UserX className="w-3 h-3" />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
