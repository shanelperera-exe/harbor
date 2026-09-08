import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  IconProjects, IconBlueprints, IconGroups, 
  IconObservability, IconWebhooks, IconSettings 
} from './SideNav';
import UserAvatar from '../ui/UserAvatar';

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSettings2() {
  return (
    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 8.38008C13.5 8.25508 13.5 8.13008 13.5 8.00008C13.5 7.87008 13.5 7.74508 13.5 7.61508L14.46 6.77508C14.637 6.61911 14.7531 6.40559 14.7879 6.17228C14.8226 5.93897 14.7738 5.70088 14.65 5.50008L13.47 3.50008C13.3823 3.34821 13.2562 3.22207 13.1044 3.13431C12.9526 3.04655 12.7804 3.00026 12.605 3.00008C12.4963 2.99925 12.3882 3.01614 12.285 3.05008L11.07 3.46008C10.8602 3.32068 10.6414 3.19541 10.415 3.08508L10.16 1.82508C10.1143 1.59488 9.98905 1.3881 9.80623 1.24093C9.62341 1.09376 9.39466 1.01558 9.16 1.02008H6.82C6.58535 1.01558 6.3566 1.09376 6.17378 1.24093C5.99096 1.3881 5.86573 1.59488 5.82 1.82508L5.565 3.08508C5.33697 3.19538 5.11649 3.32066 4.905 3.46008L3.715 3.03008C3.61065 3.00289 3.50259 2.99276 3.395 3.00008C3.21964 3.00026 3.04741 3.04655 2.89559 3.13431C2.74376 3.22207 2.61769 3.34821 2.53 3.50008L1.35 5.50008C1.2333 5.70058 1.18993 5.93541 1.22733 6.16436C1.26473 6.39332 1.38057 6.60214 1.555 6.75508L2.5 7.62008C2.5 7.74508 2.5 7.87008 2.5 8.00008C2.5 8.13008 2.5 8.25508 2.5 8.38508L1.555 9.22508C1.37564 9.37908 1.25663 9.59165 1.2191 9.82505C1.18158 10.0585 1.22795 10.2976 1.35 10.5001L2.53 12.5001C2.61769 12.6519 2.74376 12.7781 2.89559 12.8659C3.04741 12.9536 3.21964 12.9999 3.395 13.0001C3.50368 13.0009 3.61176 12.984 3.715 12.9501L4.93 12.5401C5.13977 12.6795 5.35859 12.8048 5.585 12.9151L5.84 14.1751C5.88573 14.4053 6.01096 14.6121 6.19378 14.7592C6.3766 14.9064 6.60535 14.9846 6.84 14.9801H9.2C9.43466 14.9846 9.66341 14.9064 9.84623 14.7592C10.029 14.6121 10.1543 14.4053 10.2 14.1751L10.455 12.9151C10.683 12.8048 10.9035 12.6795 11.115 12.5401L12.325 12.9501C12.4282 12.984 12.5363 13.0009 12.645 13.0001C12.8204 12.9999 12.9926 12.9536 13.1444 12.8659C13.2962 12.7781 13.4223 12.6519 13.51 12.5001L14.65 10.5001C14.7667 10.2996 14.8101 10.0648 14.7727 9.8358C14.7353 9.60685 14.6194 9.39802 14.445 9.24508L13.5 8.38008ZM12.605 12.0001L10.89 11.4201C10.4885 11.7601 10.0297 12.026 9.535 12.2051L9.18 14.0001H6.82L6.465 12.2251C5.97422 12.0409 5.51786 11.7755 5.115 11.4401L3.395 12.0001L2.215 10.0001L3.575 8.80008C3.48255 8.28251 3.48255 7.75265 3.575 7.23508L2.215 6.00008L3.395 4.00008L5.11 4.58008C5.51147 4.24003 5.97031 3.97421 6.465 3.79508L6.82 2.00008H9.18L9.535 3.77508C10.0258 3.95929 10.4821 4.22465 10.885 4.56008L12.605 4.00008L13.785 6.00008L12.425 7.20008C12.5175 7.71765 12.5175 8.24751 12.425 8.76508L13.785 10.0001L12.605 12.0001Z" />
      <path d="M8 11.0001C7.40666 11.0001 6.82664 10.8241 6.33329 10.4945C5.83995 10.1648 5.45543 9.69631 5.22837 9.14813C5.0013 8.59995 4.94189 7.99675 5.05765 7.41481C5.1734 6.83287 5.45913 6.29832 5.87868 5.87876C6.29824 5.4592 6.83279 5.17348 7.41473 5.05773C7.99668 4.94197 8.59988 5.00138 9.14805 5.22844C9.69623 5.45551 10.1648 5.84002 10.4944 6.33337C10.8241 6.82672 11 7.40674 11 8.00008C11.004 8.39516 10.9292 8.78707 10.7798 9.15286C10.6305 9.51865 10.4096 9.85096 10.1303 10.1303C9.85089 10.4097 9.51857 10.6305 9.15278 10.7799C8.787 10.9292 8.39508 11.0041 8 11.0001ZM8 6.00008C7.73568 5.99392 7.47285 6.04145 7.22741 6.13978C6.98198 6.23811 6.75904 6.3852 6.57208 6.57216C6.38512 6.75912 6.23803 6.98205 6.1397 7.22749C6.04137 7.47292 5.99385 7.73575 6 8.00008C5.99385 8.26441 6.04137 8.52724 6.1397 8.77267C6.23803 9.01811 6.38512 9.24105 6.57208 9.42801C6.75904 9.61496 6.98198 9.76206 7.22741 9.86039C7.47285 9.95872 7.73568 10.0062 8 10.0001C8.26433 10.0062 8.52716 9.95872 8.7726 9.86039C9.01803 9.76206 9.24097 9.61496 9.42793 9.42801C9.61489 9.24105 9.76198 9.01811 9.86031 8.77267C9.95864 8.52724 10.0062 8.26441 10 8.00008C10.0062 7.73575 9.95864 7.47292 9.86031 7.22749C9.76198 6.98205 9.61489 6.75912 9.42793 6.57216C9.24097 6.3852 9.01803 6.23811 8.7726 6.13978C8.52716 6.04145 8.26433 5.99392 8 6.00008Z" />
    </svg>
  );
}

function IconTheme() {
  return (
    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2.51172H2C1.73478 2.51172 1.48043 2.61708 1.29289 2.80461C1.10536 2.99215 1 3.2465 1 3.51172V11.5117C1 11.7769 1.10536 12.0313 1.29289 12.2188C1.48043 12.4064 1.73478 12.5117 2 12.5117H6V14.5117H4V15.5117H12V14.5117H10V12.5117H14C14.2652 12.5117 14.5196 12.4064 14.7071 12.2188C14.8946 12.0313 15 11.7769 15 11.5117V3.51172C15 3.2465 14.8946 2.99215 14.7071 2.80461C14.5196 2.61708 14.2652 2.51172 14 2.51172ZM9 14.5117H7V12.5117H9V14.5117ZM14 11.5117H2V3.51172H14V11.5117Z" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 15H9C9.26512 14.9997 9.5193 14.8942 9.70677 14.7068C9.89424 14.5193 9.9997 14.2651 10 14V12.5H9V14H3V2H9V3.5H10V2C9.9997 1.73488 9.89424 1.4807 9.70677 1.29323C9.5193 1.10576 9.26512 1.0003 9 1H3C2.73488 1.0003 2.4807 1.10576 2.29323 1.29323C2.10576 1.4807 2.0003 1.73488 2 2V14C2.0003 14.2651 2.10576 14.5193 2.29323 14.7068C2.4807 14.8942 2.73488 14.9997 3 15Z" />
      <path d="M10.293 10.293L12.086 8.5H5V7.5H12.086L10.293 5.707L11 5L14 8L11 11L10.293 10.293Z" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z" />
    </svg>
  );
}




// ─── Theme helpers ─────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark' | 'system';

function getStoredTheme(): Theme {
  return (localStorage.getItem('harbor_theme') as Theme) ?? 'system';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('harbor_theme', theme);
}

// ─── Profile dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown({
  username,
  email,
  avatarSvg,
  onClose,
}: {
  username: string;
  email: string;
  avatarSvg: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  // 'main' | 'theme'
  const [panel, setPanel] = useState<'main' | 'theme'>('main');
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  function handleSignOut() {
    localStorage.removeItem('harbor_token');
    localStorage.removeItem('harbor_user');
    onClose();
    navigate('/login');
  }

  function handleTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  const baseItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'hover:bg-gray-100 dark:hover:bg-[#fafafa] ' +
    'hover:text-gray-900 dark:hover:text-[#272727] ' +
    'focus:outline-none transition-colors duration-100';

  const activeItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-blue-600 dark:text-blue-400 ' +
    'bg-blue-50 dark:bg-blue-950/50 ' +
    'hover:bg-blue-100 dark:hover:bg-blue-950/50 ' +
    'hover:text-blue-700 dark:hover:text-blue-300 ' +
    'focus:outline-none transition-colors duration-100';


  const backItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-gray-400 dark:text-[#b3b3b3] ' +
    'hover:bg-gray-100 dark:hover:bg-[#fafafa] ' +
    'hover:text-gray-900 dark:hover:text-[#272727] ' +
    'focus:outline-none transition-colors duration-100';

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
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

  return (
    <div
      role="listbox"
      className="absolute right-0 top-full mt-1 z-50 w-[18rem] p-4 bg-white dark:bg-[#0d0d0d] border border-black dark:border-[#4d4d4d] shadow-none dark:shadow-lg outline-none overflow-hidden"
      style={{ animation: 'dropdownIn 0.1s ease-out' }}
    >
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* ── Main panel ── */}
      <div
        className="transition-all duration-100 ease-out"
        style={{
          display: panel === 'main' ? 'block' : 'none',
          opacity: panel === 'main' ? 1 : 0,
          transform: panel === 'main' ? 'translateX(0)' : 'translateX(-8px)',
        }}
      >
        <ul role="presentation">
          {/* User info */}
          <li className="w-full flex items-center mb-2 py-2 px-3">
            <div className="flex w-full gap-3 items-center">
              <div className="flex-shrink-0">
                <UserAvatar svgString={avatarSvg} username={username} size={40} />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{username}</span>
                <span className="text-[12px] text-gray-400 dark:text-[#b3b3b3] break-all">{email}</span>
              </div>
            </div>
          </li>

          {/* Account settings */}
          <li role="option">
            <Link
              to="/settings"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={onClose}
            >
              <IconSettings2 />
              <span className="flex-1 text-left truncate">Account settings</span>
            </Link>
          </li>

          {/* Theme — opens sub-panel */}
          <li role="option">
            <button
              type="button"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={() => setPanel('theme')}
            >
              <IconTheme />
              <span className="flex-1 text-left truncate">Theme</span>
              <IconChevronRight />
            </button>
          </li>

          {/* Separator */}
          <li role="separator" className="px-3 py-2">
            <div className="w-full h-px bg-gray-300 dark:bg-[#4d4d4d]" />
          </li>

          {/* Sign out */}
          <li role="option">
            <button
              type="button"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={handleSignOut}
            >
              <IconSignOut />
              <span className="flex-1 text-left truncate">Sign out</span>
            </button>
          </li>
        </ul>
      </div>

      {/* ── Theme sub-panel ── */}
      <div
        className="transition-all duration-100 ease-out"
        style={{
          display: panel === 'theme' ? 'block' : 'none',
          opacity: panel === 'theme' ? 1 : 0,
          transform: panel === 'theme' ? 'translateX(0)' : 'translateX(8px)',
        }}
      >
        <ul role="presentation">
          {/* Back */}
          <li>
            <button
              type="button"
              className={backItemClass + ' flex items-center space-x-2.5'}
              onClick={() => setPanel('main')}
            >
              <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 8L10 3L10.7 3.7L6.4 8L10.7 12.3L10 13L5 8Z" />
              </svg>
              <span className="flex-1 text-left truncate">Back</span>
            </button>
          </li>

          {/* Theme options */}
          {themeOptions.map(opt => {
            const isActive = theme === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={isActive ? activeItemClass + ' flex items-center space-x-2.5' : baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
                  onClick={() => handleTheme(opt.value)}
                >
                  {opt.icon}
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  {isActive && (
                    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.5 12L2 7.49997L2.707 6.79297L6.5 10.5855L13.293 3.79297L14 4.49997L6.5 12Z" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────


export default function DashboardHeader({
  mobileMenuOpen,
  onToggleMobileMenu
}: {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
} = {}) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function readUser() {
    try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
    catch { return {}; }
  }

  const [storedUser, setStoredUser] = useState(readUser);
  const currentUsername: string  = storedUser.username  ?? '';
  const currentEmail: string     = storedUser.email     ?? '';
  const avatarSvg: string | null = storedUser.avatarSvg ?? null;

  // Re-read whenever localStorage changes (e.g. after navigating back from login)
  useEffect(() => {
    setStoredUser(readUser());
    function onStorage() { setStoredUser(readUser()); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const routeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    '/dashboard':    { label: 'Dashboard',    icon: <IconBlueprints /> },
    '/projects':     { label: 'Projects',     icon: <IconProjects /> },
    '/environments': { label: 'Environments', icon: <IconGroups /> },
    '/deployments':  { label: 'Deployments',  icon: <IconWebhooks /> },
    '/reports':      { label: 'Reports',      icon: <IconObservability /> },
    '/settings':     { label: 'Settings',     icon: <IconSettings /> },
  };

  const currentRoute = routeConfig[location.pathname] || { label: 'Dashboard', icon: <IconBlueprints /> };

  return (
    <header
      data-testid="ribbonnav"
      role="banner"
      className="sticky top-0 z-[30] w-full flex h-14 pe-3 sm:pe-4 bg-white dark:bg-[#090909] text-gray-900 dark:text-white border-b border-solid border-gray-300 dark:border-[#4d4d4d] transition-colors duration-300"
    >
      {/* Logo + workspace */}
      <div className="flex-shrink-0 inline-flex items-center gap-x-4 sm:gap-x-5 px-3 sm:px-4 h-full border-r border-gray-300 sm:border-gray-300 dark:border-[#4d4d4d] dark:sm:border-[#4d4d4d] bg-white dark:bg-[#090909] transition-colors duration-300 w-auto md:w-[294px]">
        <div className="inline-flex items-center justify-center h-full sm:border-r border-gray-300 sm:border-gray-300 dark:border-[#4d4d4d] dark:sm:border-[#4d4d4d] sm:pr-4 gap-x-1 sm:gap-x-0 transition-colors duration-300">
          <button 
            type="button" 
            className="md:hidden flex-shrink-0 flex items-center justify-center w-10 h-10 mr-1 focus:outline-none text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded-md"
            onClick={onToggleMobileMenu}
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
          <a className="flex-shrink-0 flex items-center justify-center focus:outline-none" href="/">
            <img src="/logos/harbor_primary.svg" alt="Harbor" className="w-7 h-7 sm:w-8 sm:h-8 object-contain dark:hidden invert" />
            <img src="/logos/harbor_primary.svg" alt="Harbor" className="w-7 h-7 sm:w-8 sm:h-8 object-contain hidden dark:block" />
          </a>
        </div>
        <div className="w-full inline-flex items-center space-x-2">
          <div className="inline-flex relative items-center h-auto">
            <button data-testid="workspace-switcher" type="button" className="h-10 focus:outline-none flex items-center p-1.5 bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded-none" style={{ maxWidth: '240px' }}>
              <div className="flex items-center space-x-2.5 h-10 text-[15px] overflow-x-hidden">
                <span className="truncate" title="My Workspace">My Workspace</span>
                <svg fill="currentColor" aria-hidden="true" className="flex-shrink-0 w-4 h-4" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 14L4.5 10.5L5.205 9.795L8 12.585L10.795 9.795L11.5 10.5L8 14Z"></path>
                  <path d="M8 2L11.5 5.5L10.795 6.205L8 3.415L5.205 6.205L4.5 5.5L8 2Z"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb + search */}
      <div className="hidden sm:flex sm:ps-6 border-r border-gray-300 sm:border-e sm:border-solid sm:border-gray-300 dark:border-[#4d4d4d] dark:sm:border-[#4d4d4d] flex-grow h-full items-center transition-colors duration-300">
        <div className="flex-grow flex items-center justify-between">
          <nav>
            <ol className="flex m-0 p-0">
              <li className="inline-flex items-center text-[15px]">
                <span className="text-gray-900 dark:text-white flex items-center space-x-2.5 focus:outline-none text-[15px] transition-colors duration-300" aria-current="page">
                  <div className="shrink-0 flex items-center justify-center text-current [&>svg]:w-[18px] [&>svg]:h-[18px]">
                    {currentRoute.icon}
                  </div>
                  <span>
                    <span className="whitespace-nowrap sm:text-wrap">{currentRoute.label}</span>
                  </span>
                </span>
              </li>
            </ol>
          </nav>
          <div className="me-4">
            <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors h-9 py-1.5 px-3 focus:outline-none items-center hidden sm:flex group/button rounded-none">
              <div className="inline-flex w-[18px] h-[18px] me-2">
                <svg fill="currentColor" aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.5 13.7931L10.7239 10.017C11.6313 8.9277 12.0838 7.5305 11.9872 6.11608C11.8907 4.70165 11.2525 3.37891 10.2055 2.423C9.15855 1.4671 7.78335 0.951637 6.366 0.983845C4.94865 1.01605 3.59828 1.59345 2.59581 2.59593C1.59333 3.5984 1.01593 4.94877 0.983723 6.36612C0.951515 7.78347 1.46698 9.15867 2.42288 10.2057C3.37879 11.2526 4.70153 11.8908 6.11596 11.9873C7.53038 12.0839 8.92758 11.6314 10.0169 10.7241L13.7929 14.5001L14.5 13.7931ZM2 6.50012C2 5.6101 2.26392 4.74007 2.75838 4.00005C3.25285 3.26003 3.95565 2.68325 4.77792 2.34266C5.60019 2.00207 6.50499 1.91295 7.3779 2.08658C8.25082 2.26022 9.05264 2.6888 9.68198 3.31814C10.3113 3.94747 10.7399 4.7493 10.9135 5.62221C11.0872 6.49513 10.998 7.39993 10.6575 8.22219C10.3169 9.04446 9.74008 9.74726 9.00006 10.2417C8.26004 10.7362 7.39001 11.0001 6.5 11.0001C5.30693 10.9988 4.1631 10.5243 3.31948 9.68064C2.47585 8.83701 2.00132 7.69319 2 6.50012Z"></path>
                </svg>
              </div>
              Search
              <kbd className="inline-flex items-center space-x-1 px-1 py-0.5 h-[22px] w-fit text-[12px] font-mono font-medium leading-none text-gray-500 dark:text-[#a1a1aa] bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#4d4d4d] ms-2.5 rounded-none transition-colors duration-300">
                <svg aria-hidden="true" width="8" height="5" viewBox="0 0 7 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M0.564 3.72L3.132 0.42H4.08L6.636 3.72H5.568L3.612 1.296H3.588L1.644 3.72H0.564Z"></path>
                </svg>
                <span className="sr-only">Ctrl</span>
                <span className="sr-only">+</span>
                <span aria-hidden="true" className="select-none">K</span>
                <span className="sr-only">K</span>
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center sm:ps-4 sm:gap-2.5 gap-1 ml-auto">
        {/* Mobile Search button */}
        <div className="inline-flex sm:hidden relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors h-9 w-9 p-0 focus:outline-none flex items-center justify-center rounded-none">
            <svg fill="currentColor" aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.5 13.7931L10.7239 10.017C11.6313 8.9277 12.0838 7.5305 11.9872 6.11608C11.8907 4.70165 11.2525 3.37891 10.2055 2.423C9.15855 1.4671 7.78335 0.951637 6.366 0.983845C4.94865 1.01605 3.59828 1.59345 2.59581 2.59593C1.59333 3.5984 1.01593 4.94877 0.983723 6.36612C0.951515 7.78347 1.46698 9.15867 2.42288 10.2057C3.37879 11.2526 4.70153 11.8908 6.11596 11.9873C7.53038 12.0839 8.92758 11.6314 10.0169 10.7241L13.7929 14.5001L14.5 13.7931ZM2 6.50012C2 5.6101 2.26392 4.74007 2.75838 4.00005C3.25285 3.26003 3.95565 2.68325 4.77792 2.34266C5.60019 2.00207 6.50499 1.91295 7.3779 2.08658C8.25082 2.26022 9.05264 2.6888 9.68198 3.31814C10.3113 3.94747 10.7399 4.7493 10.9135 5.62221C11.0872 6.49513 10.998 7.39993 10.6575 8.22219C10.3169 9.04446 9.74008 9.74726 9.00006 10.2417C8.26004 10.7362 7.39001 11.0001 6.5 11.0001C5.30693 10.9988 4.1631 10.5243 3.31948 9.68064C2.47585 8.83701 2.00132 7.69319 2 6.50012Z"></path>
            </svg>
          </button>
        </div>

        {/* New button */}
        <div className="hidden sm:inline-flex relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white border border-solid border-gray-300 dark:border-[#4d4d4d] transition-colors h-9 py-1.5 px-3 focus:outline-none flex items-center rounded-none">
            <div className="flex gap-1.5 flex-row items-center">
              <svg fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true" width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.5 7.5V2.5H7.5V7.5H2.5V8.5H7.5V13.5H8.5V8.5H13.5V7.5H8.5Z"></path>
              </svg>
              <span>New</span>
            </div>
          </button>
        </div>

        {/* Help button */}
        <div className="hidden sm:inline-flex relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white border border-solid border-gray-300 dark:border-[#4d4d4d] transition-colors h-9 py-1.5 px-3 focus:outline-none flex items-center rounded-none">
            <svg fill="currentColor" aria-label="Help" width="18" height="18" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM8 14C6.81332 14 5.65328 13.6481 4.66658 12.9888C3.67989 12.3295 2.91085 11.3925 2.45673 10.2961C2.0026 9.19974 1.88378 7.99334 2.11529 6.82946C2.3468 5.66557 2.91825 4.59647 3.75736 3.75736C4.59648 2.91824 5.66558 2.3468 6.82946 2.11529C7.99335 1.88378 9.19975 2.0026 10.2961 2.45672C11.3925 2.91085 12.3295 3.67988 12.9888 4.66658C13.6481 5.65327 14 6.81331 14 8C14 9.5913 13.3679 11.1174 12.2426 12.2426C11.1174 13.3679 9.5913 14 8 14Z"></path>
              <path d="M8 12.5C8.41422 12.5 8.75 12.1642 8.75 11.75C8.75 11.3358 8.41422 11 8 11C7.58579 11 7.25 11.3358 7.25 11.75C7.25 12.1642 7.58579 12.5 8 12.5Z"></path>
              <path d="M8.5 4H7.75C7.45434 3.99934 7.16147 4.05709 6.88819 4.16993C6.61491 4.28277 6.36661 4.44848 6.15754 4.65754C5.94848 4.8666 5.78277 5.1149 5.66993 5.38818C5.55709 5.66146 5.49934 5.95434 5.5 6.25V6.5H6.5V6.25C6.5 5.91848 6.6317 5.60054 6.86612 5.36612C7.10054 5.1317 7.41848 5 7.75 5H8.5C8.83152 5 9.14947 5.1317 9.38389 5.36612C9.61831 5.60054 9.75 5.91848 9.75 6.25C9.75 6.58152 9.61831 6.89946 9.38389 7.13388C9.14947 7.3683 8.83152 7.5 8.5 7.5H7.5V9.75H8.5V8.5C9.09674 8.5 9.66904 8.26295 10.091 7.84099C10.5129 7.41903 10.75 6.84674 10.75 6.25C10.75 5.65326 10.5129 5.08097 10.091 4.65901C9.66904 4.23705 9.09674 4 8.5 4Z"></path>
            </svg>
          </button>
        </div>

        {/* Profile avatar + dropdown */}
        <div ref={dropdownRef} className="inline-flex relative h-full items-center">
          <button
            id="profile-menu-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-label="Open profile menu"
            onClick={() => setDropdownOpen(v => !v)}
            className={
              'text-[15px] font-medium transition-colors h-9 w-9 p-0 focus:outline-none flex items-center justify-center rounded-none ' +
              (dropdownOpen
                ? 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white')
            }
          >
            <span className="max-w-full inline-flex items-center flex-shrink-0 scale-[0.85] sm:scale-100 origin-center transition-transform">
              <UserAvatar svgString={avatarSvg} username={currentUsername} size={36} />
            </span>
          </button>

          {dropdownOpen && (
            <ProfileDropdown
              username={currentUsername}
              email={currentEmail}
              avatarSvg={avatarSvg}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
