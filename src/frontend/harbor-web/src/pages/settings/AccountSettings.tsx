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
import { LuCircleAlert } from "react-icons/lu";
import UserAvatar from "../../components/ui/UserAvatar";
import { clearAuthSession } from "../../services/authSession";
import { useTheme } from "../../contexts/ThemeContext";

const authApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
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
        <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.00001 11C7.40666 11 6.82664 10.8241 6.3333 10.4944C5.83995 10.1648 5.45543 9.69623 5.22837 9.14805C5.00131 8.59987 4.9419 7.99667 5.05765 7.41473C5.17341 6.83279 5.45913 6.29824 5.87869 5.87868C6.29825 5.45912 6.83279 5.1734 7.41474 5.05764C7.99668 4.94189 8.59988 5.0013 9.14806 5.22836C9.69624 5.45542 10.1648 5.83994 10.4944 6.33329C10.8241 6.82664 11 7.40666 11 8C11.0043 8.39515 10.9296 8.78717 10.7803 9.15307C10.6311 9.51897 10.4102 9.85138 10.1308 10.1308C9.85139 10.4102 9.51898 10.6311 9.15308 10.7803C8.78718 10.9296 8.39516 11.0043 8.00001 11ZM8.00001 6C7.73572 5.99401 7.47297 6.04164 7.22761 6.14003C6.98225 6.23842 6.75937 6.38552 6.57245 6.57244C6.38552 6.75937 6.23843 6.98224 6.14004 7.2276C6.04165 7.47296 5.99401 7.73572 6.00001 8C5.99401 8.26428 6.04165 8.52704 6.14004 8.7724C6.23843 9.01776 6.38552 9.24063 6.57245 9.42756C6.75937 9.61448 6.98225 9.76158 7.22761 9.85997C7.47297 9.95836 7.73572 10.006 8.00001 10C8.26429 10.006 8.52705 9.95836 8.77241 9.85997C9.01777 9.76158 9.24064 9.61448 9.42757 9.42756C9.61449 9.24063 9.76159 9.01776 9.85998 8.7724C9.95837 8.52704 10.006 8.26428 10 8C10.006 7.73572 9.95837 7.47296 9.85998 7.2276C9.76159 6.98224 9.61449 6.75937 9.42757 6.57244C9.24064 6.38552 9.01777 6.23842 8.77241 6.14003C8.52705 6.04164 8.26429 5.99401 8.00001 6Z" />
          <path d="M14.6524 5.522L13.4721 3.4781C13.3566 3.27775 13.1753 3.12364 12.9589 3.04207C12.7426 2.9605 12.5046 2.95652 12.2857 3.0308L11.0686 3.44245C10.8589 3.30119 10.6397 3.17451 10.4126 3.0633L10.1608 1.804C10.1154 1.57726 9.99295 1.37324 9.81413 1.22665C9.63532 1.08006 9.41123 0.999966 9.18001 1H6.82001C6.58879 0.999966 6.3647 1.08006 6.18588 1.22665C6.00707 1.37324 5.88458 1.57726 5.83926 1.804L5.58741 3.0633C5.35781 3.17331 5.13616 3.29919 4.92406 3.44L3.71436 3.0308C3.49539 2.95652 3.25744 2.9605 3.04109 3.04207C2.82473 3.12364 2.64338 3.27775 2.52796 3.4781L1.34766 5.522C1.23211 5.72224 1.18948 5.95631 1.22703 6.18443C1.26457 6.41254 1.37998 6.62061 1.55361 6.77325L2.51906 7.62165C2.51051 7.74735 2.50001 7.87235 2.50001 8C2.50001 8.1289 2.50501 8.25635 2.51391 8.3828L1.55361 9.2268C1.37998 9.37944 1.26457 9.58751 1.22703 9.81562C1.18948 10.0437 1.23211 10.2778 1.34766 10.4781L2.52796 12.522C2.64338 12.7224 2.82473 12.8765 3.04109 12.958C3.25744 13.0396 3.49539 13.0436 3.71436 12.9693L4.93141 12.5576C5.14108 12.699 5.36027 12.8257 5.58741 12.9368L5.83926 14.1961C5.8846 14.4228 6.0071 14.6268 6.18591 14.7734C6.36472 14.92 6.5888 15 6.82001 15H9.00001V14H6.82001L6.46501 12.2246C5.97398 12.0423 5.51815 11.7765 5.11761 11.4389L3.39391 12.022L2.21391 9.9781L3.57656 8.78055C3.48335 8.2635 3.48217 7.73406 3.57306 7.2166L2.21376 6.022L3.39431 3.9781L5.10766 4.55765C5.51098 4.21985 5.97024 3.95513 6.46471 3.77545L6.82001 2H9.18001L9.53501 3.7754C10.026 3.95776 10.4819 4.22355 10.8824 4.56105L12.6058 3.97805L13.7858 6.02195L12.3869 7.24805L13.0462 8L14.4462 6.7732C14.6198 6.6206 14.7353 6.41255 14.7729 6.18445C14.8104 5.95634 14.7679 5.72226 14.6524 5.522Z" />
          <path d="M11.5 13.09L10.205 11.795L9.50001 12.5L11.5 14.5L15 11L14.295 10.295L11.5 13.09Z" />
        </svg>
      ),
    },
    {
      value: 'light',
      label: 'Light',
      icon: (
        <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.5 1.51172H7.5V3.99172H8.5V1.51172Z" />
          <path d="M12.597 3.20343L10.8433 4.95706L11.5504 5.66416L13.3041 3.91054L12.597 3.20343Z" />
          <path d="M15 8.01172H12.52V9.01172H15V8.01172Z" />
          <path d="M11.5534 11.3564L10.8463 12.0635L12.5999 13.8171L13.307 13.11L11.5534 11.3564Z" />
          <path d="M8.5 13.0317H7.5V15.5117H8.5V13.0317Z" />
          <path d="M4.45197 11.3593L2.69834 13.1129L3.40545 13.82L5.15907 12.0664L4.45197 11.3593Z" />
          <path d="M3.48 8.01172H1V9.01172H3.48V8.01172Z" />
          <path d="M3.40253 3.20635L2.69542 3.91346L4.44905 5.66708L5.15615 4.95998L3.40253 3.20635Z" />
          <path d="M8 6.51172C8.39556 6.51172 8.78224 6.62902 9.11114 6.84878C9.44004 7.06854 9.69638 7.3809 9.84776 7.74635C9.99913 8.1118 10.0387 8.51394 9.96157 8.9019C9.8844 9.28986 9.69392 9.64623 9.41421 9.92593C9.13451 10.2056 8.77814 10.3961 8.39018 10.4733C8.00222 10.5505 7.60009 10.5109 7.23463 10.3595C6.86918 10.2081 6.55682 9.95176 6.33706 9.62286C6.1173 9.29396 6 8.90728 6 8.51172C6 7.98129 6.21071 7.47258 6.58579 7.09751C6.96086 6.72243 7.46957 6.51172 8 6.51172ZM8 5.51172C7.40666 5.51172 6.82664 5.68767 6.33329 6.01731C5.83994 6.34695 5.45542 6.81549 5.22836 7.36367C5.0013 7.91185 4.94189 8.51505 5.05764 9.09699C5.1734 9.67893 5.45912 10.2135 5.87868 10.633C6.29824 11.0526 6.83279 11.3383 7.41473 11.4541C7.99667 11.5698 8.59987 11.5104 9.14805 11.2834C9.69623 11.0563 10.1648 10.6718 10.4944 10.1784C10.8241 9.68508 11 9.10506 11 8.51172C11 7.71607 10.6839 6.95301 10.1213 6.3904C9.55871 5.82779 8.79565 5.51172 8 5.51172Z" />
        </svg>
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.75126 3.21852C6.52204 4.19713 6.49085 5.21171 6.65953 6.20255C6.82821 7.1934 7.19334 8.1405 7.73346 8.98815C8.27357 9.83579 8.97776 10.5669 9.80458 11.1383C10.6314 11.7098 11.5642 12.1102 12.548 12.3158C12.0307 12.8509 11.4112 13.2767 10.7263 13.5678C10.0413 13.8589 9.30482 14.0094 8.56056 14.0105C8.49131 14.0105 8.42146 14.013 8.35166 14.0105C7.05599 13.9646 5.81731 13.4664 4.85075 12.6023C3.88418 11.7383 3.25081 10.5629 3.06063 9.28047C2.87044 7.99801 3.13547 6.68945 3.80967 5.58206C4.48387 4.47467 5.52466 3.63841 6.75126 3.21852ZM7.49001 2.01172C7.46074 2.01176 7.43153 2.01437 7.40271 2.01952C5.81059 2.30231 4.37942 3.16423 3.38485 4.43924C2.39029 5.71426 1.90269 7.3122 2.01597 8.92527C2.12925 10.5383 2.8354 12.0524 3.9984 13.1759C5.1614 14.2994 6.69899 14.9529 8.31501 15.0104C8.39706 15.0134 8.47911 15.0104 8.56046 15.0104C9.60987 15.0109 10.644 14.7588 11.5754 14.2753C12.5068 13.7918 13.308 13.0911 13.9115 12.2326C13.9604 12.1586 13.9889 12.073 13.9943 11.9845C13.9996 11.8959 13.9815 11.8076 13.9418 11.7283C13.902 11.6489 13.8421 11.5815 13.7681 11.5327C13.694 11.4839 13.6084 11.4555 13.5198 11.4504C12.5209 11.3627 11.5555 11.0466 10.6983 10.5263C9.84106 10.0061 9.11494 9.29572 8.57605 8.45009C8.03716 7.60446 7.69993 6.64624 7.59045 5.64949C7.48096 4.65274 7.60213 3.64416 7.94461 2.70172C7.97375 2.62632 7.98445 2.54504 7.97582 2.46467C7.96719 2.38429 7.93949 2.30714 7.89501 2.23964C7.85054 2.17214 7.79058 2.11624 7.72014 2.07659C7.64969 2.03695 7.57079 2.0147 7.49001 2.01172Z" />
        </svg>
      ),
    },
  ];

  const logThemeOptions: Array<{ value: LogThemePreference; label: string; icon: ReactNode }> = [
    {
      value: 'match-dashboard',
      label: 'Match Dashboard (Default)',
      icon: (
        <svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2.51172H2C1.73478 2.51172 1.48043 2.61708 1.29289 2.80461C1.10536 2.99215 1 3.2465 1 3.51172V11.5117C1 11.7769 1.10536 12.0313 1.29289 12.2188C1.48043 12.4064 1.73478 12.5117 2 12.5117H6V14.5117H4V15.5117H12V14.5117H10V12.5117H14C14.2652 12.5117 14.5196 12.4064 14.7071 12.2188C14.8946 12.0313 15 11.7769 15 11.5117V3.51172C15 3.2465 14.8946 2.99215 14.7071 2.80461C14.5196 2.61708 14.2652 2.51172 14 2.51172ZM9 14.5117H7V12.5117H9V14.5117ZM14 11.5117H2V3.51172H14V11.5117Z"></path>
        </svg>
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
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
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
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
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
                                      <span className="flex items-center justify-between space-x-1.5"><svg fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg><span>Edit</span></span>
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
                                        <svg fill="currentColor" aria-hidden="true" className={`absolute top-0 bottom-0 my-auto right-3 transition-transform ${themeDropdownOpen ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
                                                  <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16"><path d="M6.5 12L2 7.49997L2.707 6.79297L6.5 10.5855L13.293 3.79297L14 4.49997L6.5 12Z" /></svg>
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
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
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
                                        <svg fill="currentColor" aria-hidden="true" className={`absolute top-0 bottom-0 my-auto right-3 transition-transform ${logThemeDropdownOpen ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
                                                        <svg fill="currentColor" aria-hidden="true" className="inline-flex ml-2" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M6.5 12L2 7.49997L2.707 6.79297L6.5 10.5855L13.293 3.79297L14 4.49997L6.5 12Z" /></svg>
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
                                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg></div>
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
                                      <svg viewBox="0 0 16 16" height="28" width="28" data-slot="geist-icon" style={{ color: 'currentColor' }}>
                                        <path fill="currentColor" fillRule="evenodd" d="M13.26 3.5H2.74L8 8.01zM1.5 4.42v7.08a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V4.42L8.49 9.57 8 9.99l-.49-.42zM0 2h16v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 11.5V2" clipRule="evenodd"></path>
                                      </svg>
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
                                              <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2.49892 1.79373L1.79194 2.50096L3.4999 4.20832L4.20688 3.50109L2.49892 1.79373Z"></path><path d="M12.4979 11.789L11.7907 12.496L13.4981 14.2039L14.2053 13.4969L12.4979 11.789Z"></path><path d="M6.5 1H5.5V3H6.5V1Z"></path><path d="M3 5.5H1V6.5H3V5.5Z"></path><path d="M15 9.5H13V10.5H15V9.5Z"></path><path d="M10.5 13H9.5V15H10.5V13Z"></path><path d="M8.29 10.535L6.435 12.395C6.24918 12.5808 6.02858 12.7282 5.78579 12.8288C5.54301 12.9294 5.28279 12.9811 5.02 12.9811C4.75721 12.9811 4.49699 12.9294 4.25421 12.8288C4.01142 12.7282 3.79082 12.5808 3.605 12.395C3.22972 12.0197 3.01889 11.5107 3.01889 10.98C3.01889 10.4493 3.22972 9.94028 3.605 9.565L5.465 7.705L4.755 7L2.9 8.86C2.61533 9.13707 2.38853 9.46792 2.23275 9.83334C2.07697 10.1988 1.99531 10.5915 1.99252 10.9887C1.98973 11.386 2.06586 11.7798 2.21649 12.1474C2.36712 12.515 2.58925 12.849 2.87 13.13C3.15032 13.408 3.48277 13.628 3.84828 13.7773C4.21379 13.9266 4.60518 14.0023 5 14C5.40168 14.0004 5.79944 13.921 6.17023 13.7665C6.54101 13.612 6.87743 13.3855 7.16 13.1L9 11.245L8.29 10.535Z"></path><path d="M7.705 5.465L9.565 3.605C9.75082 3.41918 9.97142 3.27178 10.2142 3.17121C10.457 3.07065 10.7172 3.01889 10.98 3.01889C11.2428 3.01889 11.503 3.07065 11.7458 3.17121C11.9886 3.27178 12.2092 3.41918 12.395 3.605C12.5808 3.79082 12.7282 4.01142 12.8288 4.25421C12.9294 4.49699 12.9811 4.75721 12.9811 5.02C12.9811 5.28279 12.9294 5.54301 12.8288 5.78579C12.7282 6.02858 12.5808 6.24918 12.395 6.435L10.535 8.295L11.245 9L13.1 7.14C13.3847 6.86293 13.6115 6.53208 13.7673 6.16666C13.923 5.80123 14.0047 5.40851 14.0075 5.01127C14.0103 4.61404 13.9341 4.2202 13.7835 3.85262C13.6329 3.48505 13.4107 3.15104 13.13 2.87C12.8497 2.59196 12.5172 2.37198 12.1517 2.22269C11.7862 2.07339 11.3948 1.99772 11 2C10.5983 1.99961 10.2006 2.07897 9.82977 2.23346C9.45899 2.38795 9.12257 2.61451 8.84 2.9L7 4.755L7.705 5.465Z"></path></svg>
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
                                                <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2.49892 1.79373L1.79194 2.50096L3.4999 4.20832L4.20688 3.50109L2.49892 1.79373Z"></path><path d="M12.4979 11.789L11.7907 12.496L13.4981 14.2039L14.2053 13.4969L12.4979 11.789Z"></path><path d="M6.5 1H5.5V3H6.5V1Z"></path><path d="M3 5.5H1V6.5H3V5.5Z"></path><path d="M15 9.5H13V10.5H15V9.5Z"></path><path d="M10.5 13H9.5V15H10.5V13Z"></path><path d="M8.29 10.535L6.435 12.395C6.24918 12.5808 6.02858 12.7282 5.78579 12.8288C5.54301 12.9294 5.28279 12.9811 5.02 12.9811C4.75721 12.9811 4.49699 12.9294 4.25421 12.8288C4.01142 12.7282 3.79082 12.5808 3.605 12.395C3.22972 12.0197 3.01889 11.5107 3.01889 10.98C3.01889 10.4493 3.22972 9.94028 3.605 9.565L5.465 7.705L4.755 7L2.9 8.86C2.61533 9.13707 2.38853 9.46792 2.23275 9.83334C2.07697 10.1988 1.99531 10.5915 1.99252 10.9887C1.98973 11.386 2.06586 11.7798 2.21649 12.1474C2.36712 12.515 2.58925 12.849 2.87 13.13C3.15032 13.408 3.48277 13.628 3.84828 13.7773C4.21379 13.9266 4.60518 14.0023 5 14C5.40168 14.0004 5.79944 13.921 6.17023 13.7665C6.54101 13.612 6.87743 13.3855 7.16 13.1L9 11.245L8.29 10.535Z"></path><path d="M7.705 5.465L9.565 3.605C9.75082 3.41918 9.97142 3.27178 10.2142 3.17121C10.457 3.07065 10.7172 3.01889 10.98 3.01889C11.2428 3.01889 11.503 3.07065 11.7458 3.17121C11.9886 3.27178 12.2092 3.41918 12.395 3.605C12.5808 3.79082 12.7282 4.01142 12.8288 4.25421C12.9294 4.49699 12.9811 4.75721 12.9811 5.02C12.9811 5.28279 12.9294 5.54301 12.8288 5.78579C12.7282 6.02858 12.5808 6.24918 12.395 6.435L10.535 8.295L11.245 9L13.1 7.14C13.3847 6.86293 13.6115 6.53208 13.7673 6.16666C13.923 5.80123 14.0047 5.40851 14.0075 5.01127C14.0103 4.61404 13.9341 4.2202 13.7835 3.85262C13.6329 3.48505 13.4107 3.15104 13.13 2.87C12.8497 2.59196 12.5172 2.37198 12.1517 2.22269C11.7862 2.07339 11.3948 1.99772 11 2C10.5983 1.99961 10.2006 2.07897 9.82977 2.23346C9.45899 2.38795 9.12257 2.61451 8.84 2.9L7 4.755L7.705 5.465Z"></path></svg>
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
                                                <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2.49892 1.79373L1.79194 2.50096L3.4999 4.20832L4.20688 3.50109L2.49892 1.79373Z"></path><path d="M12.4979 11.789L11.7907 12.496L13.4981 14.2039L14.2053 13.4969L12.4979 11.789Z"></path><path d="M6.5 1H5.5V3H6.5V1Z"></path><path d="M3 5.5H1V6.5H3V5.5Z"></path><path d="M15 9.5H13V10.5H15V9.5Z"></path><path d="M10.5 13H9.5V15H10.5V13Z"></path><path d="M8.29 10.535L6.435 12.395C6.24918 12.5808 6.02858 12.7282 5.78579 12.8288C5.54301 12.9294 5.28279 12.9811 5.02 12.9811C4.75721 12.9811 4.49699 12.9294 4.25421 12.8288C4.01142 12.7282 3.79082 12.5808 3.605 12.395C3.22972 12.0197 3.01889 11.5107 3.01889 10.98C3.01889 10.4493 3.22972 9.94028 3.605 9.565L5.465 7.705L4.755 7L2.9 8.86C2.61533 9.13707 2.38853 9.46792 2.23275 9.83334C2.07697 10.1988 1.99531 10.5915 1.99252 10.9887C1.98973 11.386 2.06586 11.7798 2.21649 12.1474C2.36712 12.515 2.58925 12.849 2.87 13.13C3.15032 13.408 3.48277 13.628 3.84828 13.7773C4.21379 13.9266 4.60518 14.0023 5 14C5.40168 14.0004 5.79944 13.921 6.17023 13.7665C6.54101 13.612 6.87743 13.3855 7.16 13.1L9 11.245L8.29 10.535Z"></path><path d="M7.705 5.465L9.565 3.605C9.75082 3.41918 9.97142 3.27178 10.2142 3.17121C10.457 3.07065 10.7172 3.01889 10.98 3.01889C11.2428 3.01889 11.503 3.07065 11.7458 3.17121C11.9886 3.27178 12.2092 3.41918 12.395 3.605C12.5808 3.79082 12.7282 4.01142 12.8288 4.25421C12.9294 4.49699 12.9811 4.75721 12.9811 5.02C12.9811 5.28279 12.9294 5.54301 12.8288 5.78579C12.7282 6.02858 12.5808 6.24918 12.395 6.435L10.535 8.295L11.245 9L13.1 7.14C13.3847 6.86293 13.6115 6.53208 13.7673 6.16666C13.923 5.80123 14.0047 5.40851 14.0075 5.01127C14.0103 4.61404 13.9341 4.2202 13.7835 3.85262C13.6329 3.48505 13.4107 3.15104 13.13 2.87C12.8497 2.59196 12.5172 2.37198 12.1517 2.22269C11.7862 2.07339 11.3948 1.99772 11 2C10.5983 1.99961 10.2006 2.07897 9.82977 2.23346C9.45899 2.38795 9.12257 2.61451 8.84 2.9L7 4.755L7.705 5.465Z"></path></svg>
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
                                      <svg fill="currentColor" aria-hidden="true" className="group-open:rotate-180 w-4 h-4 transition-transform" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
                                                <svg fill="currentColor" className="w-3 h-3 text-gray-500 dark:text-[#b3b3b3] mx-1" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M12 7.51172H11V4.51172C11 3.71607 10.6839 2.95301 10.1213 2.3904C9.55871 1.82779 8.79565 1.51172 8 1.51172C7.20435 1.51172 6.44129 1.82779 5.87868 2.3904C5.31607 2.95301 5 3.71607 5 4.51172V7.51172H4C3.73478 7.51172 3.48043 7.61708 3.29289 7.80461C3.10536 7.99215 3 8.2465 3 8.51172V14.5117C3 14.7769 3.10536 15.0313 3.29289 15.2188C3.48043 15.4064 3.73478 15.5117 4 15.5117H12C12.2652 15.5117 12.5196 15.4064 12.7071 15.2188C12.8946 15.0313 13 14.7769 13 14.5117V8.51172C13 8.2465 12.8946 7.99215 12.7071 7.80461C12.5196 7.61708 12.2652 7.51172 12 7.51172ZM6 4.51172C6 3.98129 6.21071 3.47258 6.58579 3.09751C6.96086 2.72243 7.46957 2.51172 8 2.51172C8.53043 2.51172 9.03914 2.72243 9.41421 3.09751C9.78929 3.47258 10 3.98129 10 4.51172V7.51172H6V4.51172ZM4 8.51172H12V14.5117H4V8.51172Z"></path></svg>
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
                                            <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13 14H3C2.73489 13.9996 2.48075 13.8942 2.29329 13.7067C2.10583 13.5193 2.00036 13.2651 2 13V3C2.00036 2.73489 2.10583 2.48075 2.29329 2.29329C2.48075 2.10583 2.73489 2.00036 3 2H8V3H3V13H13V8H14V13C13.9996 13.2651 13.8942 13.5193 13.7067 13.7067C13.5193 13.8942 13.2651 13.9996 13 14Z"></path><path d="M10 1V2H13.293L9 6.293L9.707 7L14 2.707V6H15V1H10Z"></path></svg>
                                            <span className="flex-1 text-left truncate">Configure on GitHub</span>
                                          </div>
                                        </button>
                                        <button type="button" disabled={disconnectingProvider === 'github'} onClick={() => void disconnectLoginMethod('github')} className="w-full flex relative text-[14px] text-red-600 dark:text-[#f4b3b7] py-2 px-3 whitespace-nowrap focus-visible:outline-none cursor-pointer hover:bg-red-50 dark:hover:bg-[#390508] hover:text-red-700 dark:hover:text-[#fce9ea] disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm">
                                          <div className="w-full flex items-center space-x-2.5">
                                            <svg fill="currentColor" className="w-4 h-4 shrink-0" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2.49892 1.79373L1.79194 2.50096L3.4999 4.20832L4.20688 3.50109L2.49892 1.79373Z"></path><path d="M12.4979 11.789L11.7907 12.496L13.4981 14.2039L14.2053 13.4969L12.4979 11.789Z"></path><path d="M6.5 1H5.5V3H6.5V1Z"></path><path d="M3 5.5H1V6.5H3V5.5Z"></path><path d="M15 9.5H13V10.5H15V9.5Z"></path><path d="M10.5 13H9.5V15H10.5V13Z"></path><path d="M8.29 10.535L6.435 12.395C6.24918 12.5808 6.02858 12.7282 5.78579 12.8288C5.54301 12.9294 5.28279 12.9811 5.02 12.9811C4.75721 12.9811 4.49699 12.9294 4.25421 12.8288C4.01142 12.7282 3.79082 12.5808 3.605 12.395C3.22972 12.0197 3.01889 11.5107 3.01889 10.98C3.01889 10.4493 3.22972 9.94028 3.605 9.565L5.465 7.705L4.755 7L2.9 8.86C2.61533 9.13707 2.38853 9.46792 2.23275 9.83334C2.07697 10.1988 1.99531 10.5915 1.99252 10.9887C1.98973 11.386 2.06586 11.7798 2.21649 12.1474C2.36712 12.515 2.58925 12.849 2.87 13.13C3.15032 13.408 3.48277 13.628 3.84828 13.7773C4.21379 13.9266 4.60518 14.0023 5 14C5.40168 14.0004 5.79944 13.921 6.17023 13.7665C6.54101 13.612 6.87743 13.3855 7.16 13.1L9 11.245L8.29 10.535Z"></path><path d="M7.705 5.465L9.565 3.605C9.75082 3.41918 9.97142 3.27178 10.2142 3.17121C10.457 3.07065 10.7172 3.01889 10.98 3.01889C11.2428 3.01889 11.503 3.07065 11.7458 3.17121C11.9886 3.27178 12.2092 3.41918 12.395 3.605C12.5808 3.79082 12.7282 4.01142 12.8288 4.25421C12.9294 4.49699 12.9811 4.75721 12.9811 5.02C12.9811 5.28279 12.9294 5.54301 12.8288 5.78579C12.7282 6.02858 12.5808 6.24918 12.395 6.435L10.535 8.295L11.245 9L13.1 7.14C13.3847 6.86293 13.6115 6.53208 13.7673 6.16666C13.923 5.80123 14.0047 5.40851 14.0075 5.01127C14.0103 4.61404 13.9341 4.2202 13.7835 3.85262C13.6329 3.48505 13.4107 3.15104 13.13 2.87C12.8497 2.59196 12.5172 2.37198 12.1517 2.22269C11.7862 2.07339 11.3948 1.99772 11 2C10.5983 1.99961 10.2006 2.07897 9.82977 2.23346C9.45899 2.38795 9.12257 2.61451 8.84 2.9L7 4.755L7.705 5.465Z"></path></svg>
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
                                    <svg className="animate-spin h-5 w-5 text-gray-900 dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
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
                                    href="https://github.com/apps/harbordev/installations/new"
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
                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M7 6.66699H6V12.667H7V6.66699Z"></path><path d="M10 6.66699H9V12.667H10V6.66699Z"></path><path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path><path d="M10 1.66699H6V2.66699H10V1.66699Z"></path></svg></div>
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
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
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
      
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setIsDeleteModalOpen(false); setDeleteConfirmationText(''); } }}>
          <div className="inline-block w-full text-left align-middle transform page-primary bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-lg border border-solid border-gray-300 dark:border-[#525252] max-w-xl rounded-sm">
            <form onSubmit={deleteAccount}>
              <div className="flex flex-col gap-2 items-start border-solid border-b border-gray-300 dark:border-[#525252] p-6 relative">
                <div className="w-full">
                  <h1 className="text-[28px] leading-[32px] font-medium text-strong mb-1 font-['Roobert',sans-serif]">Delete Harbor Account</h1>
                </div>
                <button type="button" aria-label="Close modal" onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationText(''); }} className="flex p-0 w-6 h-6 items-center justify-center text-gray-500 hover:text-gray-900 dark:text-[#8f8f8f] dark:hover:text-white absolute right-4 top-4">
                  <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path></svg>
                </button>
              </div>
              
              <div className="text-[16px] leading-relaxed text-gray-800 dark:text-[#e3e3e3] p-6 space-y-4 font-normal">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-sm border border-red-100 dark:border-red-900/30 flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <LuCircleAlert className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p>This will delete all existing services, databases, data, Projects, and environment groups in your account.</p>
                    <p className="mt-2">Deleting your account can <span className="font-bold underline">NOT</span> be reversed.</p>
                  </div>
                </div>
                <div>Type <span className="font-mono font-bold text-red-600 dark:text-red-400 bg-gray-100 dark:bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#333] select-all shadow-sm">sudo delete my account</span> in the text box below and click the delete button.</div>
                {deleteError && (
                  <p role="alert" className="text-[16px] text-red-600 dark:text-red-400">{deleteError}</p>
                )}
                
                <div className="flex flex-col">
                  <div className="flex relative">
                    <input 
                      autoComplete="off" 
                      spellCheck="false" 
                      id="delete-confirm-input" 
                      className="h-10 w-full border border-gray-300 bg-transparent px-3 text-[16px] text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white transition-colors rounded-sm" 
                      type="text" 
                      value={deleteConfirmationText} 
                      onChange={(e) => setDeleteConfirmationText(e.target.value)} 
                      name="confirm" 
                    />
                  </div>
                </div>
              </div>
              
              <div className="w-full flex justify-start space-x-2 p-6 border-solid border-t border-gray-300 dark:border-[#525252]">
                <button 
                  type="submit" 
                  disabled={isDeletingAccount || deleteConfirmationText !== 'sudo delete my account'}
                  className={`type-interface-01 text-[16px] h-10 py-2.5 px-3 flex items-center group/button transition-colors rounded-sm ${
                    deleteConfirmationText === 'sudo delete my account' && !isDeletingAccount
                      ? 'bg-[#e23642] hover:bg-[#c0222d] text-white cursor-pointer'
                      : 'bg-[#e23642] text-white opacity-30 cursor-not-allowed'
                  }`}
                >
                  {isDeletingAccount ? (
                    'Deleting...'
                  ) : (
                    <>
                      <div className="inline-flex w-4 h-4 me-1.5"><svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M7 6.66699H6V12.667H7V6.66699Z"></path><path d="M10 6.66699H9V12.667H10V6.66699Z"></path><path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path><path d="M10 1.66699H6V2.66699H10V1.66699Z"></path></svg></div>
                      Delete Harbor Account
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  disabled={isDeletingAccount}
                  onClick={() => { setIsDeleteModalOpen(false); setDeleteConfirmationText(''); }} 
                  className="type-interface-01 text-[16px] text-gray-900 bg-white hover:bg-gray-100 dark:bg-[#1a1a1a] dark:text-[#e3e3e3] dark:hover:bg-[#272727] border border-solid border-gray-300 dark:border-[#525252] h-10 py-2.5 px-3 flex items-center group/button disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
