import { useEffect, useState } from "react";
import UserAvatar from "../../components/ui/UserAvatar";

const authApiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 17 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0">
      <path d="M15.706 8.167C15.706 7.647 15.659 7.147 15.573 6.667H8.666V9.507H12.613C12.439 10.42 11.92 11.194 11.139 11.714V13.56H13.519C14.906 12.28 15.706 10.4 15.706 8.167Z" fill="#4285F4" />
      <path d="M8.666 15.667C10.646 15.667 12.313 15.014 13.519 13.56L11.139 11.714C10.486 12.154 9.646 12.414 8.666 12.414C6.773 12.414 5.166 11.134 4.586 9.427H2.126V11.334C3.326 13.714 5.793 15.667 8.666 15.667Z" fill="#34A853" />
      <path d="M4.586 9.427C4.439 8.987 4.353 8.514 4.353 8.011C4.353 7.507 4.439 7.034 4.586 6.594V4.687H2.126C1.626 5.674 1.333 6.787 1.333 8.011C1.333 9.234 1.626 10.347 2.126 11.334L4.586 9.427Z" fill="#FBBC05" />
      <path d="M8.666 3.607C9.746 3.607 10.706 3.98 11.473 4.7L13.573 2.6C12.299 1.414 10.646 0.667 8.666 0.667C5.793 0.667 3.326 2.62 2.126 5L4.586 6.907C5.166 5.2 6.773 3.607 8.666 3.607Z" fill="#EA4335" />
    </svg>
  );
}

export default function AccountSettings() {
  const [activeSection, setActiveSection] = useState('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingTheme, setIsEditingTheme] = useState(false);
  const [isEditingLogTheme, setIsEditingLogTheme] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [logThemeDropdownOpen, setLogThemeDropdownOpen] = useState(false);
  const [loginMethodDropdownOpen, setLoginMethodDropdownOpen] = useState(false);
  const [linkedLoginMethods, setLinkedLoginMethods] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('harbor_login_methods') ?? '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  });
  const [credentialDropdownOpen, setCredentialDropdownOpen] = useState(false);
  const getInitialTheme = () => {
    const saved = localStorage.getItem('harbor_theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  };
  const [theme, setTheme] = useState(getInitialTheme());
  const [savedTheme, setSavedTheme] = useState(getInitialTheme());
  const getInitialLogTheme = () => localStorage.getItem('harbor_log_theme') ?? 'match-dashboard';
  const [logTheme, setLogTheme] = useState(getInitialLogTheme);
  const [savedLogTheme, setSavedLogTheme] = useState(getInitialLogTheme);

  function applyDashboardTheme(selectedTheme: string) {
    const shouldUseDark = selectedTheme === 'dark' || (
      selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches
    );
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }

  useEffect(() => {
    applyDashboardTheme(theme);
  }, [theme]);

  const themeOptions = [
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

  const logThemeOptions = [
    {
      value: 'match-dashboard',
      label: 'Match Dashboard (Default)',
      icon: (
        <svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2.51172H2C1.73478 2.51172 1.48043 2.61708 1.29289 2.80461C1.10536 2.99215 1 3.2465 1 3.51172V11.5117C1 11.7769 1.10536 12.0313 1.29289 12.2188C1.48043 12.4064 1.73478 12.5117 2 12.5117H6V14.5117H4V15.5117H12V14.5117H10V12.5117H14C14.2652 12.5117 14.5196 12.4064 14.7071 12.2188C14.8946 12.0313 15 11.7769 15 11.5117V3.51172C15 3.2465 14.8946 2.99215 14.7071 2.80461C14.5196 2.61708 14.2652 2.51172 14 2.51172ZM9 14.5117H7V12.5117H9V14.5117ZM14 11.5117H2V3.51172H14V11.5117Z"></path>
        </svg>
      ),
    },
    themeOptions[1],
    themeOptions[2],
  ];

  
  function readUser() {
    try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
    catch { return {}; }
  }
  const [storedUser] = useState(readUser);
  const [profile, setProfile] = useState({
    username: storedUser.username ?? '',
    email: storedUser.email ?? '',
    role: storedUser.role ?? '',
    avatarSvg: storedUser.avatarSvg ?? null,
  });
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const deploymentCredentials: string[] = [];

  const currentUsername: string = profile.username;
  const currentEmail: string = profile.email;
  const avatarSvg: string | null = profile.avatarSvg;

  const [name, setName] = useState(currentUsername);
  const [email, setEmail] = useState(currentEmail);

  function linkLoginMethod(provider: string) {
    setLinkedLoginMethods((current) => {
      const next = current.includes(provider) ? current : [...current, provider];
      localStorage.setItem('harbor_login_methods', JSON.stringify(next));
      return next;
    });
    setLoginMethodDropdownOpen(false);
  }

  useEffect(() => {
    const token = localStorage.getItem('harbor_token');
    if (!token) return;

    async function loadProfile() {
      try {
        const response = await fetch(`${authApiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const responseData = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(responseData?.message || responseData?.detail || 'Unable to load profile.');
        }

        const nextProfile = responseData.data;
        setProfile(nextProfile);
        setName(nextProfile.username);
        setEmail(nextProfile.email);
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
        },
        body: JSON.stringify({ newPassword }),
      });
      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData?.detail || responseData?.message || 'Unable to change password.');
      }

      setNewPassword('');
      setConfirmPassword('');
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

  useEffect(() => {
    const handleScroll = () => {
      const sections = [
        'profile', 'appearance', 'account-security'
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
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'profile', label: 'Profile' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'account-security', label: 'Account Security' }
  ];

  const activeIndex = navItems.findIndex(item => item.id === activeSection);
  const indicatorOffset = Math.max(0, activeIndex) * 2.25; // 2.25rem = h-9

  return (
    <div className="w-full lg:max-w-[calc(100vw-294px)]">
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
        <div>
          <div className="my-6 md:my-12 flex justify-between">
            <div className="">
              <div className="">
                <h1 className="text-[32px] font-[500] leading-[36px] tracking-[-0.32px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Account settings</h1>
              </div>
            </div>
          </div>
          <div className="flex flex-row-reverse gap-8">
            <div className="relative flex-shrink-0 hidden xl:block xl:sticky xl:h-full xl:max-h-[calc(100vh_-_3.5rem)] xl:top-14 custom-scrollbar overflow-y-auto">
              <nav aria-labelledby="_r_3f_">
                <span id="_r_3f_" className="sr-only">Table of contents</span>
                <ul className="relative min-w-[11.5rem] border-l border-solid sidecar-border">
                  <div 
                    className="opacity-100 absolute top-0 -left-px w-px h-9 border-l border-solid sidecar-border--active motion-safe:transition motion-safe:duration-300 motion-safe:ease-out-cubic" 
                    style={{ transform: `translateY(${indicatorOffset}rem)` }}
                  ></div>
                  {navItems.map(item => {
                    const isActive = activeSection === item.id;
                    return (
                      <li key={item.id} className="flex items-center h-9 py-2 pl-4">
                        <a 
                          aria-selected={isActive} 
                          className={`type-body-02 ${isActive ? 'sidecar-text--active active:text-strong' : 'sidecar-text'} hover:underline active:no-underline`} 
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
                  <div id="profile" className="p-6 md:p-8 page-primary border border-solid border-[#6b6b6b] scroll-mt-20">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[24px] font-[500] leading-[28px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Profile</h2>
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
                              <label htmlFor="name" className="inline-block text-lg font-bold text-primary mb-1">User name</label>
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
                                      className={`h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-[#6b6b6b] rounded-none appearance-none outline-none transition-colors ${
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
                                      <button type="button" onClick={() => { setIsEditingName(false); setName(currentUsername); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-[#6b6b6b]">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingProfile || name.trim() === currentUsername} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center rounded-none font-medium text-black bg-white">
                                        Save changes
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingName(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button" >
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
                              <label htmlFor="email" className="inline-block text-lg font-bold text-primary mb-1">Email</label>
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
                                      className={`h-10 truncate type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-[#6b6b6b] rounded-none appearance-none outline-none transition-colors ${
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
                                      <button type="button" onClick={() => { setIsEditingEmail(false); setEmail(currentEmail); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-[#6b6b6b]">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={isSavingProfile || email.trim() === currentEmail} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center rounded-none font-medium text-black bg-white">
                                        Save changes
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingEmail(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button" >
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
                              <label htmlFor="user-avatar" className="inline-block text-lg font-bold text-primary mb-1">Avatar</label>
                            </div>
                          </div>
                          <div className="col-span-2 text-secondary">
                            <div>
                              <div id="user-avatar">
                                <div className="flex flex-col items-start space-y-2">
                                  <span className="max-w-full inline-flex items-center flex-shrink-0">
                                    <UserAvatar svgString={avatarSvg} username={currentUsername} size={64} className="rounded-none" />
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
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div data-id="appearance" className="scroll-mt-24 xl:scroll-mt-20">
                <div>
                  <div id="appearance" className="p-6 md:p-8 page-primary border border-solid border-[#6b6b6b] scroll-mt-20">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[24px] font-[500] leading-[28px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Appearance</h2>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="type-body-02 text-primary">
                      <div className="flex gap-8 flex-col">
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div className="col-span-1">
                            <div className="flex items-center">
                              <label htmlFor="themeSetting" className="inline-block text-lg font-bold text-primary mb-1">Dashboard Theme</label>
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
                                      className={`type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-[#6b6b6b] rounded-none appearance-none outline-none transition-colors h-10 text-left flex items-center ${
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
                                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#0d0d0d] border border-[#6b6b6b] shadow-lg">
                                        <ul className="py-1">
                                          {themeOptions.map((opt) => (
                                            <li key={opt.value}>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTheme(opt.value);
                                                  setThemeDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-[#e3e3e3] hover:bg-[#8ad6ff] hover:text-black dark:hover:bg-[#1a1a1a] dark:hover:text-[#ffffff] transition-colors"
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
                                      <button type="button" onClick={() => { setIsEditingTheme(false); setTheme(savedTheme); setThemeDropdownOpen(false); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-[#6b6b6b]">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={theme === savedTheme} onClick={(e) => { 
                                        e.preventDefault(); 
                                        setSavedTheme(theme); 
                                        setIsEditingTheme(false); 
                                        setThemeDropdownOpen(false); 
                                        localStorage.setItem('harbor_theme', theme);
                                        applyDashboardTheme(theme);
                                      }} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center rounded-none font-medium text-black bg-white">
                                        Save changes
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingTheme(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button" >
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
                              <label htmlFor="logThemeSetting" className="inline-block text-lg font-bold text-primary mb-1">Log Explorer Theme</label>
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
                                      className={`type-interface-01 w-full m-0 py-2.5 px-3 placeholder:input-text--placeholder border border-solid border-[#6b6b6b] rounded-none appearance-none outline-none transition-colors h-10 text-left flex items-center ${
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
                                      <div className="absolute z-10 w-full mt-1 shadow-menu menu-background border border-solid menu-border outline-none border-t-transparent">
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
                                                    className={`w-full flex relative type-interface-01 py-2 px-3 whitespace-nowrap focus-visible:outline focus:outline-focus-action outline-2 cursor-pointer hover:menu-item-text--hover hover:menu-item-background--hover ${
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
                                      <button type="button" onClick={() => { setIsEditingLogTheme(false); setLogTheme(savedLogTheme); setLogThemeDropdownOpen(false); }} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover h-10 py-2.5 px-3 flex items-center border border-solid border-[#6b6b6b]">
                                        Cancel
                                      </button>
                                      <button type="submit" disabled={logTheme === savedLogTheme} onClick={(e) => {
                                        e.preventDefault();
                                        setSavedLogTheme(logTheme);
                                        setIsEditingLogTheme(false);
                                        setLogThemeDropdownOpen(false);
                                        localStorage.setItem('harbor_log_theme', logTheme);
                                        window.dispatchEvent(new Event('harbor-log-theme-change'));
                                      }} className="type-interface-01 button-primary-text button-primary-background hover:button-primary-background--hover disabled:opacity-50 disabled:cursor-not-allowed h-10 py-2.5 px-4 flex items-center rounded-none font-medium text-black bg-white">
                                        Save changes
                                      </button>
                                    </div>
                                  ) : (
                                    <button type="button" onClick={() => setIsEditingLogTheme(true)} className="type-interface-01 button-ghost-text hover:button-ghost-background--hover hover:button-ghost-text--hover active:button-ghost-background--active active:button-ghost-text--active h-10 py-2.5 px-3 flex items-center group/button" >
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
                  <div id="account-security" className="p-6 md:p-8 page-primary border border-solid border-[#6b6b6b] scroll-mt-20 mb-8">
                    <div className="mb-8">
                      <div className="flex justify-between small:items-center">
                        <div className="flex-1 small:pr-4">
                          <div className="">
                            <h2 className="text-[24px] font-[500] leading-[28px] tracking-[-0.24px] text-strong" style={{ fontFamily: 'Roobert, sans-serif' }}>Account Security</h2>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-[14px] text-gray-900 dark:text-[#e3e3e3]">
                      <div className="space-y-8 flex-col">
                        
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10 mb-8">
                          <div className="col-span-1">
                            <label className="inline-block text-lg font-bold text-primary mb-1">Password</label>
                            <p className="text-[14px] text-gray-500 dark:text-[#a1a1aa]"></p>
                          </div>
                          <div className="col-span-2">
                            <button type="button" onClick={() => { setPasswordError(''); setPasswordNotice(''); setIsPasswordModalOpen(true); }} className="text-[14px] font-medium text-gray-900 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] border border-solid border-[#6b6b6b] h-10 py-2.5 px-3 flex items-center transition-colors">
                              Change password
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10 mb-8">
                          <div>
                            <label className="inline-block text-lg font-bold text-primary mb-1">Login Methods</label>
                            <p className="text-[14px] text-gray-500 dark:text-[#a1a1aa]">Use these methods to sign in to your Harbor account.</p>
                          </div>
                          <div className="col-span-2">
                            {linkedLoginMethods.length > 0 && (
                            <ul className="space-y-2 mb-4">
                              <li>
                                <div className="border border-solid border-[#6b6b6b] py-1 px-3 grid grid-cols-[max-content_1fr_max-content] items-center gap-2">
                                  <span className="block">
                                    <svg width="17" height="16" viewBox="0 0 17 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-4 h-4"><path d="M15.706 8.16699C15.706 7.64699 15.6593 7.14699 15.5727 6.66699H8.66602V9.50699H12.6127C12.4393 10.4203 11.9193 11.1937 11.1393 11.7137V13.5603H13.5193C14.906 12.2803 15.706 10.4003 15.706 8.16699Z" fill="#4285F4"></path><path d="M8.66581 15.3337C10.6458 15.3337 12.3058 14.6804 13.5191 13.5604L11.1391 11.7137C10.4858 12.1537 9.65247 12.4204 8.66581 12.4204C6.75914 12.4204 5.13914 11.1337 4.55914 9.40039H2.11914V11.2937C3.32581 13.6871 5.79914 15.3337 8.66581 15.3337Z" fill="#34A853"></path><path d="M4.55967 9.39289C4.41301 8.95289 4.32634 8.48622 4.32634 7.99956C4.32634 7.51289 4.41301 7.04622 4.55967 6.60622V4.71289H2.11967C1.61967 5.69956 1.33301 6.81289 1.33301 7.99956C1.33301 9.18622 1.61967 10.2996 2.11967 11.2862L4.01967 9.80622L4.55967 9.39289Z" fill="#FBBC05"></path><path d="M8.66581 3.58699C9.74581 3.58699 10.7058 3.96033 11.4725 4.68033L13.5725 2.58033C12.2991 1.39366 10.6458 0.666992 8.66581 0.666992C5.79914 0.666992 3.32581 2.31366 2.11914 4.71366L4.55914 6.60699C5.13914 4.87366 6.75914 3.58699 8.66581 3.58699Z" fill="#EA4335"></path></svg>
                                  </span>
                                  <span className="text-[14px] leading-[40px] font-medium text-gray-900 dark:text-white">{currentEmail}</span>
                                </div>
                              </li>
                            </ul>
                            )}
                            
                            <div className="relative inline-block">
                              <button type="button" onClick={() => setLoginMethodDropdownOpen(!loginMethodDropdownOpen)} aria-expanded={loginMethodDropdownOpen} className="text-[14px] font-medium text-gray-900 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] border border-solid border-[#6b6b6b] h-10 py-2.5 px-3 flex items-center transition-colors">
                                <span className="me-1.5 flex items-center gap-1">
                                  <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]"><GoogleIcon /></span>
                                  <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]">
                                    <svg width="15" height="15" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0 text-black dark:text-white" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                                  </span>
                                </span>
                                <span className="me-3">Add login method</span>
                                <svg fill="currentColor" aria-hidden="true" className={`w-4 h-4 transition-transform ${loginMethodDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                              </button>
                              
                              {loginMethodDropdownOpen && (
                                <div className="min-w-[208px] p-2 bg-white dark:bg-[#0d0d0d] border border-solid border-[#6b6b6b] shadow-lg outline-none absolute z-50 left-0 top-full mt-1">
                                  <button type="button" onClick={() => linkLoginMethod('google')} className="w-full flex relative text-[14px] text-gray-900 dark:text-[#e3e3e3] py-2 px-3 focus-visible:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded">
                                    <div className="w-full flex items-center space-x-2.5">
                                      <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]"><GoogleIcon /></span>
                                      <span className="flex-1 text-left truncate font-medium">Google</span>
                                    </div>
                                  </button>
                                  <button type="button" onClick={() => linkLoginMethod('github')} className="w-full flex relative text-[14px] text-gray-900 dark:text-[#e3e3e3] py-2 px-3 focus-visible:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded">
                                    <div className="w-full flex items-center space-x-2.5">
                                      <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]">
                                        <svg width="15" height="15" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0 text-black dark:text-white" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                                      </span>
                                      <span className="flex-1 text-left truncate font-medium">GitHub</span>
                                    </div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                          <div>
                            <label className="inline-block text-lg font-bold text-primary mb-1">Git Deployment Credentials</label>
                            <p className="text-[14px] text-gray-500 dark:text-[#a1a1aa]">Credentials are used to detect code changes in your repo and deploy your services.</p>
                          </div>
                          <div className="col-span-2">
                            <ul className="space-y-2 mb-4">
                              {deploymentCredentials.length > 0 ? (
                              <li>
                                <div className="">
                                  <details className="group border border-solid border-gray-300 dark:border-[#525252]">
                                    <summary className="py-2 px-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors list-none [&::-webkit-details-marker]:hidden">
                                      <svg fill="currentColor" aria-hidden="true" className="group-open:rotate-180 w-4 h-4 transition-transform text-gray-500 dark:text-[#a1a1aa]" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                                      <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]">
                                        <svg width="15" height="15" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0 text-black dark:text-white" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                                      </span>
                                      <span className="text-[14px] font-medium text-gray-900 dark:text-white flex-1">{currentUsername}</span>
                                      
                                      <button type="button" className="h-8 w-8 flex items-center justify-center rounded transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#272727]" onClick={(e) => e.preventDefault()}>
                                        <span className="sr-only">Options</span>
                                        <svg fill="currentColor" aria-hidden="true" className="w-4 h-4" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4 9C4.55228 9 5 8.55228 5 8C5 7.44772 4.55228 7 4 7C3.44772 7 3 7.44772 3 8C3 8.55228 3.44772 9 4 9Z"></path><path d="M8 9C8.55228 9 9 8.55228 9 8C9 7.44772 8.55228 7 8 7C7.44772 7 7 7.44772 7 8C7 8.55228 7.44772 9 8 9Z"></path><path d="M12 9C12.5523 9 13 8.55228 13 8C13 7.44772 12.5523 7 12 7C11.4477 7 11 7.44772 11 8C11 8.55228 11.4477 9 12 9Z"></path></svg>
                                      </button>
                                    </summary>
                                    <div className="border-t border-solid border-gray-300 dark:border-[#525252] p-4 pl-10 bg-gray-50 dark:bg-[#090909]">
                                      <h6 className="text-[12px] text-gray-500 dark:text-[#a1a1aa]">No repositories found.</h6>
                                    </div>
                                  </details>
                                </div>
                              </li>
                              ) : (
                                <li className="border border-dashed border-gray-300 dark:border-[#525252] py-3 px-3 text-[14px] text-gray-500 dark:text-[#a1a1aa]">
                                  No Git deployment credentials configured.
                                </li>
                              )}
                            </ul>
                            
                            <div className="relative inline-block">
                              <button type="button" onClick={() => setCredentialDropdownOpen(!credentialDropdownOpen)} aria-expanded={credentialDropdownOpen} className="text-[14px] font-medium text-gray-900 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] border border-solid border-[#6b6b6b] h-10 py-2.5 px-3 flex items-center transition-colors">
                                <span className="me-1.5 flex items-center">
                                  <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]">
                                    <svg width="15" height="15" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0 text-black dark:text-white" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                                  </span>
                                </span>
                                <span className="me-3">Add credential</span>
                                <svg fill="currentColor" aria-hidden="true" className={`w-4 h-4 transition-transform ${credentialDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                              </button>
                              
                              {credentialDropdownOpen && (
                                <div className="min-w-[208px] p-2 bg-white dark:bg-[#0d0d0d] border border-solid border-[#6b6b6b] shadow-lg outline-none absolute z-50 left-0 top-full mt-1">
                                  <button type="button" onClick={() => setCredentialDropdownOpen(false)} className="w-full flex relative text-[14px] text-gray-900 dark:text-[#e3e3e3] py-2 px-3 focus-visible:outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded">
                                    <div className="w-full flex items-center space-x-2.5">
                                      <span className="block border border-solid border-gray-300 dark:border-[#525252] p-0.5 relative rounded-[0.25rem] bg-white dark:bg-[#1a1a1a]">
                                        <svg width="15" height="15" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="flex-shrink-0 text-black dark:text-white" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                                      </span>
                                      <span className="flex-1 text-left truncate font-medium">GitHub</span>
                                    </div>
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
              </div>

              </div>
            </div>
          </div>
      </main>
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isChangingPassword) setIsPasswordModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="w-full max-w-md border border-gray-300 bg-white p-6 shadow-xl dark:border-[#525252] dark:bg-[#0d0d0d]">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="change-password-title" className="text-xl font-medium text-gray-900 dark:text-white">Change password</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-[#a1a1aa]">Create a new password for your Harbor account.</p>
              </div>
              <button type="button" aria-label="Close change password dialog" disabled={isChangingPassword} onClick={() => setIsPasswordModalOpen(false)} className="text-2xl leading-none text-gray-500 hover:text-gray-900 disabled:opacity-50 dark:hover:text-white">&times;</button>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">New password</label>
                <input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 w-full border border-gray-300 bg-transparent px-3 text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white" />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-gray-900 dark:text-white">Confirm password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-10 w-full border border-gray-300 bg-transparent px-3 text-gray-900 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] dark:border-[#525252] dark:text-white" />
              </div>
              {passwordError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
              {passwordNotice && <p role="status" className="text-sm text-green-600 dark:text-green-400">{passwordNotice}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" disabled={isChangingPassword} onClick={() => setIsPasswordModalOpen(false)} className="h-10 border border-[#6b6b6b] px-3 text-sm text-gray-900 disabled:opacity-50 dark:text-white">Cancel</button>
                <button type="submit" disabled={isChangingPassword || !newPassword || !confirmPassword} className="h-10 bg-white px-4 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50">{isChangingPassword ? 'Changing...' : 'Change password'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
