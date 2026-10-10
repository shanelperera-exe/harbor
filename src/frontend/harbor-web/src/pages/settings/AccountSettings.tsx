import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FaGithubAlt, FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { IoCopyOutline, IoEllipsisHorizontal } from "react-icons/io5";
import { IoMdCheckmark, IoLogoGithub } from "react-icons/io";
import { MdOutlinePublic } from "react-icons/md";
import { RiLinksFill, RiSaveLine } from "react-icons/ri";
import { PiPassword, PiEye, PiEyeSlash } from "react-icons/pi";
import { FiExternalLink } from "react-icons/fi";

import UserAvatar from "../../components/ui/UserAvatar";
import { clearAuthSession } from "../../services/authSession";
import { useTheme } from "../../contexts/ThemeContext";
import { Icon } from '../../components/icons';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';

const authApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
// The GitHub App to install is per-environment, so the slug is supplied at build time
// (--build-arg VITE_GITHUB_APP_SLUG, or VITE_GITHUB_APP_SLUG in .env). Installing a
// different app than the one the backend holds credentials for yields an installation the
// backend never sees. Without a slug, fall back to the account's installation list instead of
// a link to a nonexistent app.
const githubAppSlug = import.meta.env.VITE_GITHUB_APP_SLUG?.trim();
const githubAppInstallUrl = githubAppSlug
  ? `https://github.com/apps/${encodeURIComponent(githubAppSlug)}/installations/new`
  : 'https://github.com/settings/installations';
type ThemePreference = 'system' | 'light' | 'dark';
type LogThemePreference = 'match-dashboard' | 'light' | 'dark';

const providerLabels: Record<string, string> = {
  google: 'Google',
  github: 'GitHub',
};

const providerDisplayName = (provider: string) => providerLabels[provider.toLowerCase()] ?? provider;

const timeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + 'y ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + 'mo ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + 'd ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + 'h ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + 'm ago';
  return 'just now';
};

export default function AccountSettings() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [isEditingLogTheme, setIsEditingLogTheme] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [logThemeDropdownOpen, setLogThemeDropdownOpen] = useState(false);
  const [credentialOptionsOpen, setCredentialOptionsOpen] = useState(false);
  const { theme: contextTheme, setTheme: setThemeContext } = useTheme();
  const [copiedId, setCopiedId] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(contextTheme);
  const [savedTheme, setSavedTheme] = useState<ThemePreference>(contextTheme);
  const getInitialLogTheme = (): LogThemePreference => {
    const saved = localStorage.getItem('harbor_log_theme');
    return saved === 'light' || saved === 'dark' || saved === 'match-dashboard' ? saved : 'match-dashboard';
  };
  const [logTheme, setLogTheme] = useState(getInitialLogTheme);
  const [savedLogTheme, setSavedLogTheme] = useState(getInitialLogTheme);
  const [preferencesError, setPreferencesError] = useState('');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securityNotice, setSecurityNotice] = useState('');
  const [disconnectingProvider, setDisconnectingProvider] = useState('');
  const [signinMethodDropdownOpen, setSigninMethodDropdownOpen] = useState<string | null>(null);
  const themeOptions: Array<{ value: ThemePreference; label: string; icon: ReactNode }> = [
    {
      value: 'system',
      label: 'System',
      icon: (
        <Icon name="monitor" className="w-4 h-4 shrink-0" />
      ),
    },
    {
      value: 'light',
      label: 'Light',
      icon: (
        <Icon name="sun" className="w-4 h-4 shrink-0" />
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <Icon name="moon" className="w-4 h-4 shrink-0" />
      ),
    },
  ];

  const logThemeOptions: Array<{ value: LogThemePreference; label: string; icon: ReactNode }> = [
    {
      value: 'match-dashboard',
      label: 'Match Dashboard (Default)',
      icon: (
        <Icon name="screen" />
      ),
    },
    { ...themeOptions[1], value: 'light' },
    { ...themeOptions[2], value: 'dark' },
  ];

  
  function readUser() {
    try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
    catch { return {}; }
  }
  const [storedUser] = useState(readUser);
  const [profile, setProfile] = useState<{
    id: number;
    publicId: string;
    username: string;
    email: string;
    role: string;
    avatarSvg: string | null;
    loginMethods: string[];
    providerUsernames: Record<string, string | null | undefined>;
    hasPassword: boolean;
    githubInstallationId?: number | null;
    preferences?: {
      dashboardTheme: ThemePreference;
      logTheme: LogThemePreference;
    };
  }>({
    id: storedUser.id ?? 0,
    publicId: storedUser.publicId ?? '',
    username: storedUser.username ?? '',
    email: storedUser.email ?? '',
    role: storedUser.role ?? '',
    avatarSvg: storedUser.avatarSvg ?? null,
    loginMethods: Array.isArray(storedUser.loginMethods) ? storedUser.loginMethods : [],
    providerUsernames: storedUser.providerUsernames ?? {},
    hasPassword: storedUser.hasPassword === true,
    githubInstallationId: storedUser.githubInstallationId ?? null,
    preferences: storedUser.preferences,
  });
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const connectedProviders = profile.loginMethods.map((method) => method.toLowerCase());
  const isProviderConnected = (provider: string) => connectedProviders.includes(provider.toLowerCase());
const hasGithubDeploymentCredential = connectedProviders.includes('github');
  const [githubAccountData, setGithubAccountData] = useState<{owner: string, count: number, repositories?: any[]} | null>(null);
  const hasGithubInstallation = profile.githubInstallationId != null || githubAccountData != null;
  const [isRefreshingGitHub, setIsRefreshingGitHub] = useState(false);

  useEffect(() => {
    async function loadGithubData() {
      if (!isProviderConnected('github')) return;
      
      const token = localStorage.getItem('harbor_token');
      if (!token) return;
      if (profile.githubInstallationId == null) return;
      
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBase}/projects/githubintegration/repositories`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        const data = await response.json().catch(() => ({}));
        if (response.ok && data.data) {
          const repos = data.data;
          setGithubAccountData({
            owner: repos.length > 0 ? repos[0].owner : 'Connected',
            count: repos.length,
            repositories: repos,
          });
        }
      } catch (err) {
        console.error('Failed to load github data', err);
      }
    }
    
    void loadGithubData();
  }, [profile.loginMethods, profile.githubInstallationId]);

  useEffect(() => {
    const handleFocus = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const authApiBase = import.meta.env.VITE_AUTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('harbor_token');
        if (!token) return;
        const response = await fetch(`${authApiBase}/auth/me`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            const userProfile = data.data;
            if (userProfile.loginMethods?.map((m: string) => m.toLowerCase()).includes('github') && userProfile.githubInstallationId == null) {
              setIsRefreshingGitHub(true);
              try {
                const refreshResp = await fetch(`${authApiBase}/auth/github/refresh-installation`, {
                  method: 'POST',
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                  }
                });
                if (refreshResp.ok) {
                  const refreshData = await refreshResp.json();
                  if (refreshData.installationId) {
                    userProfile.githubInstallationId = refreshData.installationId;
                  }
                }
              } catch (e) {
                console.error('Failed to refresh github installation', e);
              } finally {
                setIsRefreshingGitHub(false);
              }
            }
            setProfile(userProfile);
          }
        }
      } catch (err) {
        console.error('Failed to refresh profile on focus', err);
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);
    void handleFocus();
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, []);

  const currentUsername: string = profile.username;
  const currentEmail: string = profile.email;
  const avatarSvg: string | null = profile.avatarSvg;

  const [name, setName] = useState(currentUsername);
  const [email, setEmail] = useState(currentEmail);

  async function linkLoginMethod(provider: string) {
    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setSecurityError('You must be signed in to connect a login method.');
      return;
    }

    setSecurityError('');
    try {
      const response = await fetch(`${authApiBase}/auth/external/${provider}/link`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        throw new Error(data?.detail || data?.message || `Unable to connect ${providerDisplayName(provider)}.`);
      }

      window.location.assign(data.url.startsWith('http') ? data.url : `${authApiBase}${data.url.replace('/api', '')}`);
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : `Unable to connect ${providerDisplayName(provider)}.`);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('harbor_token');
    if (!token) return;

    async function loadProfile() {
      try {
        const response = await fetch(`${authApiBase}/auth/me`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responseData?.message || responseData?.detail || 'Unable to load profile.');
        }

        const nextProfile = responseData.data;
        setProfile(nextProfile);
        setName(nextProfile.username);
        setEmail(nextProfile.email);
        if (nextProfile.preferences) {
          const nextTheme = nextProfile.preferences.dashboardTheme as ThemePreference;
          const nextLogTheme = nextProfile.preferences.logTheme as LogThemePreference;
          setTheme(nextTheme);
          setSavedTheme(nextTheme);
          setLogTheme(nextLogTheme);
          setSavedLogTheme(nextLogTheme);
          localStorage.setItem('harbor_log_theme', nextLogTheme);
          window.dispatchEvent(new Event('harbor-log-theme-change'));
        }
        localStorage.setItem('harbor_user', JSON.stringify(nextProfile));
        window.dispatchEvent(new Event('storage'));
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : 'Unable to load profile.');
      }
    }

    void loadProfile();
  }, []);

  async function saveProfile(field: 'name' | 'email') {
    const nextUsername = name.trim();
    const nextEmail = email.trim();
    if (!nextUsername || !nextEmail) {
      setProfileError('Username and email are required.');
      return;
    }

    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setProfileError('You must be signed in to update your profile.');
      return;
    }

    setProfileError('');
    setIsSavingProfile(true);
    try {
      const response = await fetch(`${authApiBase}/auth/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ username: nextUsername, email: nextEmail }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || 'Unable to save profile.');
      }

      const nextProfile = responseData.data;
      setProfile(nextProfile);
      setName(nextProfile.username);
      setEmail(nextProfile.email);
      localStorage.setItem('harbor_user', JSON.stringify(nextProfile));
      window.dispatchEvent(new Event('storage'));
      if (field === 'name') setIsEditingName(false);
      if (field === 'email') setIsEditingEmail(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Unable to save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setPasswordError('You must be signed in to change your password.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch(`${authApiBase}/auth/password`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ newPassword }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || 'Unable to change password.');
      }

      setNewPassword('');
      setConfirmPassword('');
      setProfile((current) => ({ ...current, hasPassword: true }));
      setPasswordNotice('Password changed successfully.');
      window.setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordNotice('');
      }, 900);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Unable to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function savePreferences(nextTheme = theme, nextLogTheme = logTheme) {
    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setPreferencesError('You must be signed in to update preferences.');
      return;
    }

    setPreferencesError('');
    setIsSavingPreferences(true);
    try {
      const response = await fetch(`${authApiBase}/auth/preferences`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ dashboardTheme: nextTheme, logTheme: nextLogTheme }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || 'Unable to save preferences.');
      }

      const preferences = responseData.data;
      const savedDashboardTheme = preferences.dashboardTheme as ThemePreference;
      const savedExplorerTheme = preferences.logTheme as LogThemePreference;
      setTheme(savedDashboardTheme);
      setSavedTheme(savedDashboardTheme);
      setLogTheme(savedExplorerTheme);
      setSavedLogTheme(savedExplorerTheme);
      setIsEditingTheme(false);
      setIsEditingLogTheme(false);
      setThemeDropdownOpen(false);
      setLogThemeDropdownOpen(false);
      setProfile((current) => {
        const nextProfile = { ...current, preferences };
        localStorage.setItem('harbor_user', JSON.stringify(nextProfile));
        window.dispatchEvent(new Event('storage'));
        return nextProfile;
      });
    } catch (error) {
      setPreferencesError(error instanceof Error ? error.message : 'Unable to save preferences.');
    } finally {
      setIsSavingPreferences(false);
    }
  }

  async function disconnectLoginMethod(provider: string) {
    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setSecurityError('You must be signed in to disconnect a login method.');
      return;
    }

    const normalizedProvider = provider.toLowerCase();
    setSecurityError('');
    setSecurityNotice('');
    setDisconnectingProvider(normalizedProvider);
    try {
      const response = await fetch(`${authApiBase}/auth/external/${normalizedProvider}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || `Unable to disconnect ${providerDisplayName(provider)}.`);
      }

      const nextProfile = responseData.data;
      setProfile(nextProfile);
      setName(nextProfile.username);
      setEmail(nextProfile.email);
      if (normalizedProvider === 'github') setGithubAccountData(null);
      localStorage.setItem('harbor_user', JSON.stringify(nextProfile));
      window.dispatchEvent(new Event('storage'));
      setSecurityNotice(`${providerDisplayName(provider)} disconnected.`);
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : `Unable to disconnect ${providerDisplayName(provider)}.`);
    } finally {
      setDisconnectingProvider('');
      setCredentialOptionsOpen(false);
    }
  }

  async function deleteAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteConfirmationText !== 'sudo delete my account') return;

    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setDeleteError('You must be signed in to delete your account.');
      return;
    }

    setDeleteError('');
    setIsDeletingAccount(true);
    try {
      const response = await fetch(`${authApiBase}/auth/me`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || 'Unable to delete your account.');
      }

      clearAuthSession();
      setThemeContext('system');
      localStorage.removeItem('harbor_log_theme');
      navigate('/login', { replace: true });
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete your account.');
    } finally {
      setIsDeletingAccount(false);
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'profile', 'appearance', 'account-security', 'delete-account'
      ];
      
      let current = 'profile';
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Adjust threshold based on offset
          if (rect.top <= 120) {
            current = section;
          }
        }
      }
      const scrollContainer = document.querySelector('main.overflow-auto') || document.documentElement;
      
      const isScrollable = scrollContainer.scrollHeight > scrollContainer.clientHeight;
      const isAtBottom = isScrollable && Math.round(scrollContainer.scrollTop + scrollContainer.clientHeight) >= scrollContainer.scrollHeight - 10;
      
      if (isAtBottom && scrollContainer.scrollTop > 0) {
        current = sections[sections.length - 1];
      }
      
      setActiveSection(current);
    };

    const scrollContainerElement = document.querySelector('main.overflow-auto') || window;
    scrollContainerElement.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    
    return () => scrollContainerElement.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'profile', label: 'Profile' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'account-security', label: 'Account Security' },
    { id: 'delete-account', label: 'Delete Account' }
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeSection);
  const indicatorOffset = Math.max(0, activeIndex) * 2.75; // 2.75rem = h-11

  return (
    <div className="w-full lg:max-w-[calc(100vw-294px)]">
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
        <div>
          <div className="my-6 md:my-12 flex justify-between">
            <div className="">
              <div className="">
                <h1 className="text-[36px] font-[500] leading-[40px] tracking-[-0.32px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Account settings</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-8">
            <div className="relative flex-shrink-0 hidden xl:block xl:sticky xl:h-full xl:max-h-[calc(100vh_-_3.5rem)] xl:top-14 custom-scrollbar overflow-y-auto">
              <nav aria-labelledby="_r_3f_">
                <span id="_r_3f_" className="sr-only">Table of contents</span>
                <ul className="relative min-w-[12rem] border-l border-solid border-gray-300 dark:border-[#525252]">
                  <div 
                    className="opacity-100 absolute top-3 -left-px w-[2px] h-5 bg-blue-600 dark:bg-blue-500 rounded-full motion-safe:transition motion-safe:duration-300 motion-safe:ease-out-cubic" 
                    style={{ transform: `translateY(${indicatorOffset}rem)` }}
                  ></div>
                  {navItems.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id} className="flex items-center h-11 py-2 pl-5">
                        <a 
                          aria-selected={isActive} 
                          className={`text-[18px] font-medium ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-[#a1a1aa]'} hover:text-gray-800 dark:hover:text-[#e3e3e3] transition-colors`} 
                          href={`#${item.id}`}
                        >
                          {item.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>
            
            <div className="flex-1 space-y-10">
              <div data-id="profile" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="profile" className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20 rounded-sm">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Profile</h2>
                            {profileError && (
                              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{profileError}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="type-body-02 text-primary">
                      <div className="flex gap-8 flex-col">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="name" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">User name</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); void saveProfile('name'); }}>
                                <div className="flex flex-col">
                                  <div className="flex relative">
                                    <input 
                                      id="name" 
                                      readOnly={!isEditingName} 
                                      className={`h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors ${
                                        isEditingName 
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                          : "input-background--readonly input-text--readonly caret-transparent"
                                      }`}
                                      type="text" 
                                      value={name}
                                      onChange={(e) => setName(e.target.value)}
                                      name="name" 
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingName ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingName(false); setName(currentUsername); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] rounded-sm">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingProfile || name.trim() === currentUsername} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>Save changes</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingName(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button rounded-sm" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="email" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Email</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); void saveProfile('email'); }}>
                                <div className="flex flex-col">
                                  <div className="flex relative">
                                    <input 
                                      id="email" 
                                      readOnly={!isEditingEmail} 
                                      className={`h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors ${
                                        isEditingEmail 
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                          : "input-background--readonly input-text--readonly caret-transparent"
                                      }`}
                                      type="email" 
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      name="email" 
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingEmail ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingEmail(false); setEmail(currentEmail); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] rounded-sm">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingProfile || email.trim() === currentEmail} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>Save changes</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingEmail(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button rounded-sm" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="user-avatar" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Avatar</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <div id="user-avatar">
                                <div className="flex flex-col items-start space-y-2">
                                  <span className="max-w-full inline-flex items-center flex-shrink-0">
                                    <UserAvatar svgString={avatarSvg} username={currentUsername} size={64} className="rounded-sm" />
                                  </span>
                                  <div className="inline-flex relative">
                                    <button data-testid="avatar-edit-button" type="button" id="menu-_r_3i_" aria-haspopup="true" aria-expanded="false" aria-controls="button-_r_3i_" className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center" >
                                      <span className="flex items-center justify-between space-x-1.5"><Icon name="editPencil" aria-hidden="true" /><span>Edit</span></span>
                                    </button>
                                  </div>
                                  <input data-testid="avatar-file-input" accept="image/png, image/jpeg" hidden type="file" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="userId" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">User ID</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); }}>
                                <div className="flex flex-col">
                                  <div className="flex relative items-center">
                                    <span className="text-gray-900 dark:text-[#f0f0f0] font-normal truncate type-interface-01 font-geist-mono bg-gray-100 dark:bg-[#1a1a1a] px-2 py-1 rounded-sm border border-gray-300 dark:border-[#525252]">
                                      {profile.publicId || ''}
                                    </span>
                                    {profile.publicId && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(profile.publicId);
                                          setCopiedId(true);
                                          setTimeout(() => setCopiedId(false), 2000);
                                        }}
                                        className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors"
                                        title="Copy user ID"
                                      >
                                        {copiedId ? <IoMdCheckmark className="w-4 h-4 text-blue-600 dark:text-blue-500" /> : <IoCopyOutline className="w-4 h-4 text-gray-600 dark:text-gray-400" />}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div data-id="appearance" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="appearance" className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20 rounded-sm">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Appearance</h2>
                            {preferencesError && (
                              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{preferencesError}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="type-body-02 text-primary">
                      <div className="flex gap-8 flex-col">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="themeSetting" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Dashboard Theme</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); setIsEditingTheme(false); }}>
                                <div className="group">
                                  <label id="themeSetting-label" className="inline-block type-label-01 text-primary mb-2 sr-only">themeSetting</label>
                                  <div className="relative">
                                    <button 
                                      id="themeSetting" 
                                      type="button" 
                                      disabled={!isEditingTheme}
                                      onClick={() => isEditingTheme && setThemeDropdownOpen(!themeDropdownOpen)}
                                      aria-expanded="false" 
                                      aria-haspopup="listbox" 
                                      aria-labelledby="themeSetting-label themeSetting" 
                                      className={`type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors h-10 text-left flex items-center ${
                                        isEditingTheme
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                          : "input-background--readonly input-text--readonly caret-transparent"
                                      }`}
                                    >
                                      <span className="flex flex-1 items-center min-w-0 pr-6">
                                        <span className="inline-flex mr-2">
                                          {themeOptions.find(opt => opt.value === theme)?.icon}
                                        </span>
                                        <span className="w-full truncate">{themeOptions.find(opt => opt.value === theme)?.label}</span>
                                      </span>
                                      {isEditingTheme && (
                                        <Icon name="chevronDown" className={`absolute top-0 bottom-0 my-auto right-3 transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                      )}
                                    </button>
                                    
                                    {isEditingTheme && themeDropdownOpen && (
                                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] shadow-lg rounded-sm">
                                        <ul className="py-1">
                                          {themeOptions.map((opt) => (
                                            <li key={opt.value}>
                                              <button
                                                type="button"
                                                   onClick={() => {
                                                     setTheme(opt.value);
                                                     setThemeContext(opt.value);
                                                     setThemeDropdownOpen(false);
                                                   }}
                                                className="w-full flex items-center px-3 py-2 text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-[#8ad6ff] hover:text-black dark:hover:bg-[#1a1a1a] dark:hover:text-[#ffffff] transition-colors"
                                              >
                                                {opt.icon}
                                                <span className="ml-2 flex-1 text-left">{opt.label}</span>
                                                {theme === opt.value && (
                                                  <Icon name="check" className="w-4 h-4 shrink-0" />
                                                )}
                                              </button>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingTheme ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingTheme(false); setTheme(savedTheme); setThemeDropdownOpen(false); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] rounded-sm">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingPreferences || theme === savedTheme} onClick={(e) => {
                                        e.preventDefault(); 
                                        void savePreferences(theme as ThemePreference, savedLogTheme as LogThemePreference);
                                      }} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>{isSavingPreferences ? 'Saving...' : 'Save changes'}</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingTheme(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button rounded-sm" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="logThemeSetting" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Log Explorer Theme</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <form noValidate onSubmit={(e) => { e.preventDefault(); setIsEditingLogTheme(false); }}>
                                <div className="group">
                                  <label id="logThemeSetting-label" className="inline-block type-label-01 text-primary mb-2 sr-only">logThemeSetting</label>
                                  <div className="relative">
                                    <button 
                                      id="logThemeSetting" 
                                      type="button" 
                                      disabled={!isEditingLogTheme}
                                      onClick={() => isEditingLogTheme && setLogThemeDropdownOpen(!logThemeDropdownOpen)}
                                      aria-expanded="false" 
                                      aria-haspopup="listbox" 
                                      aria-labelledby="logThemeSetting-label logThemeSetting" 
                                      className={`type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-gray-300 dark:border-[#525252] rounded-sm appearance-none outline-none transition-colors h-10 text-left flex items-center ${
                                        isEditingLogTheme
                                          ? "bg-transparent text-primary focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                          : "input-background--readonly input-text--readonly caret-transparent"
                                      }`}
                                    >
                                      <span className="flex flex-1 items-center min-w-0 pr-6">
                                        <span className="inline-flex mr-2">
                                          {logThemeOptions.find(opt => opt.value === logTheme)?.icon}
                                        </span>
                                        <span className="w-full truncate">{logThemeOptions.find(opt => opt.value === logTheme)?.label}</span>
                                      </span>
                                      {isEditingLogTheme && (
                                        <Icon name="chevronDown" className={`absolute top-0 bottom-0 my-auto right-3 transition-transform ${logThemeDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                                      )}
                                    </button>
                                    
                                    {isEditingLogTheme && logThemeDropdownOpen && (
                                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] shadow-lg outline-none rounded-sm">
                                        <ul role="listbox" className="list-none p-2 custom-scrollbar max-h-80 overflow-y-auto overscroll-contain">
                                          {logThemeOptions.map((opt) => {
                                            const isActive = logTheme === opt.value;
                                            return (
                                              <li key={opt.value} role="option" aria-selected={isActive} className="flex items-center w-full type-interface-01">
                                                <div className="w-full">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setLogTheme(opt.value);
                                                      setLogThemeDropdownOpen(false);
                                                    }}
                                                    className={`w-full flex relative type-interface-01 py-2 px-3 whitespace-nowrap focus-visible:outline-none cursor-pointer hover:menu-item-text--hover hover:menu-item-background--hover ${
                                                      isActive ? 'menu-item-text--active menu-item-background--active before:content-[""] before:absolute before:left-0 before:top-0 before:w-0.5 before:h-full before:menu-item-indicator-background' : 'menu-item-text'
                                                    }`}
                                                  >
                                                    <span className="flex flex-1 items-center min-w-0">
                                                      <span className="inline-flex mr-2">
                                                        {opt.icon}
                                                      </span>
                                                      <span className="w-full text-left truncate">{opt.label}</span>
                                                      {isActive && (
                                                        <Icon name="check" className="inline-flex ml-2" aria-hidden="true" />
                                                      )}
                                                    </span>
                                                  </button>
                                                </div>
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-end mt-4">
                                  {isEditingLogTheme ? (
                                    <div className="flex items-center gap-3">
                                      <button type="button" onClick={() => { setIsEditingLogTheme(false); setLogTheme(savedLogTheme); setLogThemeDropdownOpen(false); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-gray-300 dark:border-[#525252] rounded-sm">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingPreferences || logTheme === savedLogTheme} onClick={(e) => {
                                        e.preventDefault();
                                        void savePreferences(savedTheme as ThemePreference, logTheme as LogThemePreference);
                                      }} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center space-x-2 rounded-sm font-medium text-black bg-white">
                                        <RiSaveLine className="w-5 h-5" />
                                        <span>{isSavingPreferences ? 'Saving...' : 'Save changes'}</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingLogTheme(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button rounded-sm" >
                                      <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
                                      Edit
                                    </button>
                                  )}
                                </div>
                              </form>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div data-id="account-security" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="account-security" className="p-6 md:p-8 page-primary border border-solid border-gray-300 dark:border-[#525252] scroll-mt-20 mb-8 rounded-sm">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Account Security</h2>
                            {securityError && (
                              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">{securityError}</p>
                            )}
                            {securityNotice && (
                              <p role="status" className="mt-2 text-sm text-green-600 dark:text-green-400">{securityNotice}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-[16px] text-gray-900 dark:text-[#e3e3e3]">
                      <div className="space-y-8 flex-col">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10 mb-8">
                          <div className="col-span-1">
                            <label className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Password</label>
                            <p className="text-[16px] text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case"></p>
                          </div>
                          <div className="col-span-2">
                            <button type="button" onClick={() => { setPasswordError(''); setPasswordNotice(''); setIsPasswordModalOpen(true); }} className="text-[16px] font-medium text-gray-900 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-white dark:hover:text-black border border-solid border-gray-300 dark:border-[#525252] h-10 py-2.5 px-3 flex items-center space-x-2 transition-colors rounded-sm">
                              <PiPassword className="w-5 h-5" />
                              <span>{profile.hasPassword ? 'Change password' : 'Create password'}</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10 mb-8">
                          <div>
                            <label className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Sign-in Methods</label>
                            <p className="text-[16px] text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case">Use these methods to sign in to your Harbor account.</p>
                          </div>
                          <div className="col-span-2">
                            <ul className="bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] rounded-sm list-none m-0 p-0 [&>li:not(:last-child)]:border-b [&>li:not(:last-child)]:border-gray-200 dark:[&>li:not(:last-child)]:border-white/10">
                              <li className="p-5 flex flex-col items-stretch justify-start flex-initial hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors first:rounded-t-sm last:rounded-b-sm">
                                <section className="flex items-center gap-4">
                                  <div className="left flex flex-1 items-center gap-4 min-w-0">
                                    <div className="space-between flex w-full items-center gap-3">
                                      <Icon name="mail" style={{ color: 'currentColor' }} data-slot="geist-icon" />
                                      <div className="flex flex-1 grow flex-col">
                                        <h4 className="text-[16px] font-medium">Email</h4>
                                        <p className="text-copy-14 text-gray-900 dark:text-[#f0f0f0]">{profile.email}</p>
                                      </div>
                                      <div className="relative">
                                        <button
                                          type="button"
                                          onClick={() => setSigninMethodDropdownOpen(signinMethodDropdownOpen === 'email' ? null : 'email')}
                                          className="outline-none m-0 p-0 border-0 bg-transparent cursor-pointer flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 h-8 w-8 rounded-sm transition-colors"
                                          title="More options"
                                        >
                                          <IoEllipsisHorizontal className="w-5 h-5" />
                                        </button>
                                        {signinMethodDropdownOpen === 'email' && (
                                          <div className="absolute right-0 top-full mt-1 z-[100] min-w-[160px] bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] rounded-sm overflow-hidden py-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSigninMethodDropdownOpen(null);
                                                const profileSection = document.getElementById('profile');
                                                if (profileSection) {
                                                  profileSection.scrollIntoView({ behavior: 'smooth' });
                                                }
                                              }}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-900 dark:text-[#f0f0f0] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                                            >
                                              <FiExternalLink className="w-4 h-4" />
                                              Manage
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => void disconnectLoginMethod('email')}
                                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-red-600 dark:text-[#f4b3b7] hover:bg-red-50 dark:hover:bg-[#390508] transition-colors"
                                            >
                                              <Icon name="unlink" className="w-4 h-4 shrink-0" />
                                              Disconnect
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </section>
                              </li>

                              <li className="p-5 flex flex-col items-stretch justify-start flex-initial hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors first:rounded-t-sm last:rounded-b-sm">
                                <section className="flex items-center gap-4">
                                  <div className="left flex flex-1 items-center gap-4 min-w-0">
                                    <div className="space-between flex min-h-[40px] w-full items-center gap-3">
                                      <FcGoogle className="w-7 h-7" />
                                      <div className="flex grow flex-col">
                                        <h4 className="text-[16px] font-medium">Google</h4>
                                        <p className="text-copy-14 text-gray-900 dark:text-[#f0f0f0]" data-testid="account/social-provider/username/google">
                                          {isProviderConnected('google')
                                            ? (profile.providerUsernames?.google ?? 'Connected')
                                            : 'Not connected'}
                                        </p>
                                      </div>
                                      {isProviderConnected('google') ? (
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => setSigninMethodDropdownOpen(signinMethodDropdownOpen === 'google' ? null : 'google')}
                                            className="outline-none m-0 p-0 border-0 bg-transparent cursor-pointer flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 h-8 w-8 rounded-sm transition-colors"
                                            title="More options"
                                          >
                                            <IoEllipsisHorizontal className="w-5 h-5" />
                                          </button>
                                          {signinMethodDropdownOpen === 'google' && (
                                            <div className="absolute right-0 top-full mt-1 z-[100] min-w-[160px] bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] rounded-sm shadow-md overflow-hidden py-1">
                                              <button
                                                type="button"
                                                onClick={() => { void linkLoginMethod('google'); setSigninMethodDropdownOpen(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-900 dark:text-[#f0f0f0] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                                              >
                                                <FiExternalLink className="w-4 h-4" />
                                                Manage in Google
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => void disconnectLoginMethod('google')}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-red-600 dark:text-[#f4b3b7] hover:bg-red-50 dark:hover:bg-[#390508] transition-colors"
                                              >
                                                <Icon name="unlink" className="w-4 h-4 shrink-0" />
                                                Disconnect
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => void linkLoginMethod('google')}
                                          className="text-white bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium !px-3 max-w-full items-center justify-center transition-[border-color, background,color,transform,box-shadow] duration-[time:150ms] ease-in-out data-[focus]:transition-none data-[focus]:shadow-[var(--ds-focus-ring)] [&_svg]:shrink-0 text-(length:--geist-form-small-font) h-[32px] rounded-sm"
                                        >
                                          Connect
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </section>
                              </li>

                              <li className="p-5 flex flex-col items-stretch justify-start flex-initial hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors first:rounded-t-sm last:rounded-b-sm">
                                <section className="flex items-center gap-4">
                                  <div className="left flex flex-1 items-center gap-4 min-w-0">
                                    <div className="space-between flex min-h-[40px] w-full items-center gap-3">
                                      <IoLogoGithub className="w-7 h-7 text-gray-900 dark:text-white" />
                                      <div className="flex grow flex-col">
                                        <h4 className="text-[16px] font-medium">GitHub</h4>
                                        <p className="text-copy-14 text-gray-900 dark:text-[#f0f0f0]" data-testid="account/social-provider/username/github">
                                          {isProviderConnected('github')
                                            ? (profile.providerUsernames?.github ?? 'Connected')
                                            : 'Not connected'}
                                        </p>
                                      </div>
                                      {isProviderConnected('github') ? (
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => setSigninMethodDropdownOpen(signinMethodDropdownOpen === 'github' ? null : 'github')}
                                            className="outline-none m-0 p-0 border-0 bg-transparent cursor-pointer flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 h-8 w-8 rounded-sm transition-colors"
                                            title="More options"
                                          >
                                            <IoEllipsisHorizontal className="w-5 h-5" />
                                          </button>
                                          {signinMethodDropdownOpen === 'github' && (
                                            <div className="absolute right-0 top-full mt-1 z-[100] min-w-[160px] bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] rounded-sm shadow-md overflow-hidden py-1">
                                              <button
                                                type="button"
                                                onClick={() => { void linkLoginMethod('github'); setSigninMethodDropdownOpen(null); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-900 dark:text-[#f0f0f0] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors"
                                              >
                                                <FiExternalLink className="w-4 h-4" />
                                                Manage in GitHub
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => void disconnectLoginMethod('github')}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-red-600 dark:text-[#f4b3b7] hover:bg-red-50 dark:hover:bg-[#390508] transition-colors"
                                              >
                                                <Icon name="unlink" className="w-4 h-4 shrink-0" />
                                                Disconnect
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => void linkLoginMethod('github')}
                                          className="text-white bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-white dark:text-black dark:hover:bg-gray-200 font-medium !px-3 max-w-full items-center justify-center transition-[border-color, background,color,transform,box-shadow] duration-[time:150ms] ease-in-out data-[focus]:transition-none data-[focus]:shadow-[var(--ds-focus-ring)] [&_svg]:shrink-0 text-(length:--geist-form-small-font) h-[32px] rounded-sm"
                                        >
                                          Connect
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </section>
                              </li>
                            </ul>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div>
                            <label className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Git Deployment Credentials</label>
                            <p className="text-[16px] text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case">Credentials are used to detect code changes in your repo and deploy your services.</p>
                          </div>
                          <div className="col-span-2">
                            <ul className="space-y-2 mb-4">
                              {hasGithubDeploymentCredential ? (
                              <li key="github">
                                <div className="grid [grid-template-columns:1fr_auto] [grid-template-rows:auto_1fr] relative">
                                  <details className="group [grid-column:1/-1] [grid-row:1/3]">
                                    <summary className="border border-solid border-gray-300 dark:border-[#525252] py-3 px-3 grid grid-cols-[max-content_max-content_1fr_max-content] items-center gap-2 cursor-pointer text-gray-900 dark:text-[#e3e3e3] hover:text-black dark:hover:text-[#f0f0f0] bg-white dark:bg-[oklch(0.21_0.03_263.45)] hover:bg-gray-50 dark:hover:bg-[#1a1a1a] focus-visible:outline-none list-none marker:hidden [&::-webkit-details-marker]:hidden transition-colors rounded-sm">
                                      <Icon name="chevronDown" className="group-open:rotate-180 w-4 h-4 transition-transform" aria-hidden="true" />
                                       <span className="block">
                                        <IoLogoGithub className="w-7 h-7 text-gray-900 dark:text-white flex-shrink-0" />
                                      </span>
                                      <span className="text-[18px] font-medium text-gray-900 dark:text-white">
                                        {githubAccountData?.owner || (hasGithubInstallation ? 'Loading...' : (profile.providerUsernames?.github || 'GitHub'))}
                                      </span>
                                    </summary>
                                    <div className="border-x border-b border-solid border-gray-300 dark:border-[#525252] pt-3 pr-3 pb-3 pl-9 [max-height:14.25rem] [overflow:auto] bg-gray-50 dark:bg-[oklch(0.21_0.03_263.45)] rounded-sm">
                                      <h6 className="text-[12px] font-medium text-gray-500 dark:text-[#b3b3b3]">
                                        {hasGithubInstallation ? 'Repositories you have access to' : 'Please install the GitHub app to load your repositories'}
                                      </h6>
                                      <ul className="-mb-1 mt-2">
                                        {githubAccountData?.repositories?.map((repo) => (
                                          <li key={repo.id}>
                                            <a rel="noopener noreferrer" className="group p-1 cursor-pointer focus-visible:outline-none text-gray-900 dark:text-[#f0f0f0] hover:text-[#2563eb] dark:hover:text-[#60a5fa] active:text-[#93c5fd] no-underline flex items-center h-9 px-3 py-2 text-[14px] -ml-3 hover:!bg-transparent" target="_blank" href={repo.htmlUrl || '#'}>
                                              <span className="flex flex-row space-x-1 items-center truncate">
                                                <span className="truncate group-hover:underline">{repo.owner}</span>
                                                <span className="text-gray-500 dark:text-[#b3b3b3]">/</span>
                                                <span className="truncate group-hover:underline">{repo.name}</span>
                                              </span>
                                              {(repo.private || repo.Private) && (
                                                <Icon name="lock" className="w-3 h-3 text-gray-500 dark:text-[#b3b3b3] mx-1" />
                                              )}
                                              {!(repo.private || repo.Private) && (
                                                <MdOutlinePublic className="w-3 h-3 text-gray-500 dark:text-[#b3b3b3] mx-1" />
                                              )}
                                              <span className="hidden md:inline-block text-[12px] text-gray-500 dark:text-[#b3b3b3] px-2 text-nowrap ml-auto">
                                                <time dateTime={repo.updatedAt}>{repo.updatedAt ? timeAgo(repo.updatedAt) : ''}</time>
                                              </span>
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </details>
                                  
                                   <div className="[grid-column:-2/-1] [grid-row:1/1] justify-self-end border border-solid border-transparent py-3 px-3 flex relative items-center">
                                     <button type="button" aria-expanded={credentialOptionsOpen} aria-haspopup="menu" onClick={() => setCredentialOptionsOpen(!credentialOptionsOpen)} className="outline-none m-0 p-0 border-0 bg-transparent cursor-pointer flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 h-8 w-8 rounded-sm transition-colors">
                                       <span className="sr-only">Options</span>
                                       <IoEllipsisHorizontal className="w-5 h-5" />
                                     </button>
                                    
                                    {credentialOptionsOpen && (
                                      <div className="min-w-[208px] p-4 bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-lg border border-solid border-gray-300 dark:border-[#525252] outline-none absolute z-50 top-full right-0 mt-1 rounded-sm">
                                        <button type="button" onClick={() => { setCredentialOptionsOpen(false); window.open('https://github.com/settings/installations', '_blank'); }} className="w-full flex relative text-[14px] text-gray-900 dark:text-[#e3e3e3] py-2 px-3 whitespace-nowrap focus-visible:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#272727] transition-colors rounded-sm">
                                          <div className="w-full flex items-center space-x-2.5">
                                            <Icon name="box" className="w-4 h-4 shrink-0" />
                                            <span className="flex-1 text-left truncate">Configure on GitHub</span>
                                          </div>
                                        </button>
                                        <button type="button" disabled={disconnectingProvider === 'github'} onClick={() => void disconnectLoginMethod('github')} className="w-full flex relative text-[14px] text-red-600 dark:text-[#f4b3b7] py-2 px-3 whitespace-nowrap focus-visible:outline-none cursor-pointer hover:bg-red-50 dark:hover:bg-[#390508] hover:text-red-700 dark:hover:text-[#fce9ea] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm">
                                          <div className="w-full flex items-center space-x-2.5">
                                            <Icon name="unlink" className="w-4 h-4 shrink-0" />
                                            <span className="flex-1 text-left truncate">{disconnectingProvider === 'github' ? 'Disconnecting...' : 'Disconnect credential'}</span>
                                          </div>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </li>
                              ) : (
                                <li className="border border-dashed border-gray-300 dark:border-[#525252] py-3 px-3 rounded-sm text-[16px] text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case">
                                  No Git deployment credentials configured.
                                </li>
                              )}
                            </ul>
                            
                            {hasGithubDeploymentCredential ? (
                              hasGithubInstallation ? (
                                <div className="flex items-center text-[16px] text-gray-900 dark:text-[#e3e3e3] font-medium space-x-2.5">
                                  <FaGithubAlt className="w-5 h-5 text-gray-900 dark:text-white" />
                                  <span>GitHub Connected</span>
                                  <RiLinksFill className="w-5 h-5 text-gray-500 dark:text-[#a1a1aa]" />
                                </div>
                              ) : isRefreshingGitHub ? (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center text-[16px] text-gray-900 dark:text-[#e3e3e3] font-medium space-x-2.5">
                                    <Icon name="spinner" className="animate-spin h-5 w-5 text-gray-900 dark:text-white" />
                                    <span>Syncing GitHub Installation...</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center text-[16px] text-gray-900 dark:text-[#e3e3e3] font-medium space-x-2.5">
                                    <FaGithubAlt className="w-5 h-5 text-gray-900 dark:text-white" />
                                    <span>GitHub Authorized (Install Required)</span>
                                  </div>
                                  <a
                                    href={githubAppInstallUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[17px] font-medium text-white bg-[#24292e] hover:bg-[#1b1f23] dark:bg-white dark:text-black dark:hover:bg-gray-200 py-1.5 px-3 flex items-center transition-all rounded-sm outline-none"
                                  >
                                    <span className="me-2.5 flex items-center">
                                      <FaGithub className="w-[24px] h-[24px] flex-shrink-0 text-white dark:text-black" />
                                    </span>
                                    <span>Install GitHub App</span>
                                  </a>
                                </div>
                              )
                            ) : (
                              <div className="relative inline-block">
                                <button 
                                  type="button" 
                                  onClick={() => void linkLoginMethod('github')}
                                  className="text-[17px] font-medium text-white bg-[#24292e] hover:bg-[#1b1f23] dark:bg-white dark:text-black dark:hover:bg-gray-200 py-1.5 px-3 flex items-center transition-all rounded-sm outline-none"
                                >
                                  <span className="me-2.5 flex items-center">
                                    <FaGithub className="w-[24px] h-[24px] flex-shrink-0 text-white dark:text-black" />
                                  </span>
                                  <span>Connect GitHub</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="delete-account" className="scroll-mt-24 xl:scroll-mt-20 mt-12 pt-8 border-t border-gray-300 dark:border-[#525252]">
                <div className="flex flex-col gap-2 mb-6">
                  <h2 className="text-[26px] font-[500] leading-[32px] tracking-[-0.24px] text-gray-900 dark:text-[#f0f0f0]" style={{ fontFamily: 'Roobert, sans-serif' }}>Danger Zone</h2>
                </div>
                <div className="border border-red-500 dark:border-red-600/50 rounded-sm overflow-hidden">
                  <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
                    <div>
                      <h4 className="text-[16px] font-medium text-gray-900 dark:text-[#f0f0f0]">Delete Harbor Account</h4>
                      <p className="text-[14px] text-gray-500 dark:text-[#b3b3b3] mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                    </div>
                    <button type="button" onClick={() => setIsDeleteModalOpen(true)} className="type-interface-01 bg-[#e23642] hover:bg-[#c0222d] text-white transition-colors h-10 py-2.5 px-3 flex items-center group/button rounded-sm whitespace-nowrap shrink-0">
                      <div className="inline-flex w-4 h-4 me-1.5"><Icon name="trash" /></div>
                      Delete Harbor Account
                    </button>
                  </div>
                </div>
              </div>

              </div>
            </div>
          </div>
      </main>
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isChangingPassword) setIsPasswordModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="w-full max-w-md border border-gray-300 bg-white p-6 shadow-xl rounded-sm dark:border-[#525252] dark:bg-[oklch(0.21_0.03_263.45)]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="change-password-title" className="flex items-center space-x-2 text-[24px] font-medium text-gray-900 dark:text-white">
                  <PiPassword className="w-6 h-6" />
                  <span>{profile.hasPassword ? 'Change password' : 'Create password'}</span>
                </h2>
                <p className="mt-1 text-[16px] text-gray-600 dark:text-[#c7c7c7] leading-[24px] font-normal tracking-[0.16px] normal-case">Create a new password for your Harbor account.</p>
              </div>
              <button type="button" aria-label="Close change password dialog" disabled={isChangingPassword} onClick={() => setIsPasswordModalOpen(false)} className="text-2xl leading-none text-gray-500 hover:text-gray-900 disabled:opacity-50 dark:hover:text-white">&times;</button>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-[16px] font-medium text-gray-900 dark:text-white">New password</label>
                <div className="relative">
                  <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 w-full border border-gray-300 bg-transparent px-3 pr-10 text-[16px] text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white rounded-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none">
                    {showPassword ? <PiEyeSlash className="h-5 w-5" /> : <PiEye className="h-5 w-5" />}
                  </button>
                </div>
                {newPassword.length > 0 && (() => {
                  const criteria = [
                    { label: '8+ characters', met: newPassword.length >= 8 },
                    { label: 'Number', met: /\d/.test(newPassword) },
                    { label: 'Uppercase letter', met: /[A-Z]/.test(newPassword) },
                    { label: 'Special character', met: /[^A-Za-z0-9]/.test(newPassword) }
                  ];
                  const strength = criteria.filter(c => c.met).length;
                  return (
                    <div className="flex flex-col space-y-2 mt-2">
                      <div className="flex space-x-1.5 h-1">
                        {[1, 2, 3, 4].map(level => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full transition-colors duration-300 ${
                              strength >= level
                                ? (strength < 2 ? 'bg-red-500' : strength < 3 ? 'bg-yellow-500' : strength < 4 ? 'bg-blue-500' : 'bg-green-500')
                                : 'bg-gray-200 dark:bg-[#333]'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[14px] pt-1">
                        {criteria.map((c, i) => (
                          <div key={i} className={`flex items-center space-x-2 ${c.met ? 'text-green-600 dark:text-green-500' : 'text-gray-500 dark:text-[#8f8f8f]'}`}>
                            <div className={`flex items-center justify-center w-3.5 h-3.5 border flex-shrink-0 transition-colors duration-300 ${c.met ? 'bg-transparent border-green-600 dark:border-green-500 text-green-600 dark:text-green-500' : 'bg-transparent border-gray-400 dark:border-gray-500 text-gray-400 dark:text-gray-500'}`}>
                              {c.met ? (
                                <Icon name="checkStroke" className="w-2.5 h-2.5" />
                              ) : (
                                <Icon name="closeHeavy" className="w-2.5 h-2.5" />
                              )}
                            </div>
                            <span className="truncate">{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-[16px] font-medium text-gray-900 dark:text-white">Confirm password</label>
                <div className="relative">
                  <input id="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-10 w-full border border-gray-300 bg-transparent px-3 pr-10 text-[16px] text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white rounded-sm" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none">
                    {showConfirmPassword ? <PiEyeSlash className="h-5 w-5" /> : <PiEye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              {passwordError && <p role="alert" className="text-[16px] text-red-600 dark:text-red-400">{passwordError}</p>}
              {passwordNotice && <p role="status" className="text-[16px] text-green-600 dark:text-green-400">{passwordNotice}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" disabled={isChangingPassword} onClick={() => setIsPasswordModalOpen(false)} className="h-10 border border-gray-300 dark:border-[#525252] px-3 text-[16px] text-gray-900 disabled:opacity-50 dark:text-white rounded-sm">Cancel</button>
                <button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword} className="h-10 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-white dark:hover:bg-gray-200 px-4 text-[16px] font-medium text-white dark:text-black disabled:cursor-not-allowed disabled:opacity-50 rounded-sm">{isChangingPassword ? 'Saving...' : profile.hasPassword ? 'Change password' : 'Create password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteConfirmationText(''); }}
        onConfirm={deleteAccount}
        title="Delete Harbor Account"
        warningMessage={
          <div>
            <p>This will delete all existing services, databases, data, Projects, and environment groups in your account.</p>
            <p className="mt-2">Deleting your account can <span className="font-bold underline">NOT</span> be reversed.</p>
          </div>
        }
        expectedConfirmText="sudo delete my account"
        confirmText={deleteConfirmationText}
        setConfirmText={setDeleteConfirmationText}
        isDeleting={isDeletingAccount}
        deleteButtonLabel="Delete account"
      >
        {deleteError && (
          <p role="alert" className="text-[16px] text-red-600 dark:text-red-400 mb-4">{deleteError}</p>
        )}
      </DeleteConfirmationModal>
    </div>
  );
}
