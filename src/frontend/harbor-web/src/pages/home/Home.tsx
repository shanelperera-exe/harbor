import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import lottie from 'lottie-web';
import { ArrowRightIcon } from '../../components/ui/icons';
import ThemeToggle from '../../components/ui/ThemeToggle';

const SYMBOLS = '!<>-_\\/[]@{}—$=+*^?#________';
const WORDS = ['developers', 'fast startups', 'agile teams', 'enterprises', 'innovators', 'agencies'];
const SCRAMBLE_SPEED = 30;
const WORD_DELAY = 2500;

const DynamicHeading = () => {
  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    let currentScrambleFrames = 0;
    const targetWord = WORDS[wordIndex];
    const maxScrambleFrames = 2;
    let phase = 'TYPING';
    let timeoutId: ReturnType<typeof setTimeout>;

    const interval = setInterval(() => {
      if (phase === 'TYPING') {
        if (charIndex < targetWord.length) {
          setDisplayText(
            targetWord
              .substring(0, charIndex + 1)
              .split('')
              .map((char, index) => {
                if (index < charIndex) return char;
                return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
              })
              .join('')
          );

          currentScrambleFrames++;
          if (currentScrambleFrames >= maxScrambleFrames) {
            charIndex++;
            currentScrambleFrames = 0;
          }
        } else {
          setDisplayText(targetWord);
          phase = 'PAUSING';
          timeoutId = setTimeout(() => {
            phase = 'DELETING';
          }, WORD_DELAY);
        }
      } else if (phase === 'DELETING') {
        if (charIndex > 0) {
          setDisplayText(
            targetWord
              .substring(0, charIndex)
              .split('')
              .map((char, index) => {
                if (index < charIndex - 1) return char;
                return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
              })
              .join('')
          );

          currentScrambleFrames++;
          if (currentScrambleFrames >= maxScrambleFrames) {
            charIndex--;
            currentScrambleFrames = 0;
          }
        } else {
          setDisplayText('');
          phase = 'PAUSING';
          clearInterval(interval);
          setTimeout(() => {
            setWordIndex((prev) => (prev + 1) % WORDS.length);
          }, 400);
        }
      }
    }, SCRAMBLE_SPEED);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [wordIndex]);

  return (
    <h1 className="font-['Roobert',sans-serif] font-roobert text-[52px] lg:text-[80px] text-gray-900 dark:text-white leading-[1.05] tracking-tight font-light text-left">
      The deployment
      <br />
      platform built for
      <br />
      <div className="mt-1 flex flex-wrap items-center">
        <span className="bg-gradient-to-r from-[#2563eb] to-[#38bdf8] bg-clip-text text-transparent pb-2 lg:pb-0">
          {displayText}
        </span>
        <div className="inline-flex h-[1em] w-[0.6ch] items-center align-middle ml-2 opacity-100 animate-blink">
          <div className="h-[90%] w-full bg-black dark:bg-white"></div>
        </div>
      </div>
    </h1>
  );
};

const SERVICE_TYPES = [
  { id: 'static', label: 'Static site', checked: true, icon: 'monitor' },
  { id: 'web', label: 'Web service', checked: true, icon: 'monitor' },
  { id: 'sandboxes', label: 'Sandboxes', checked: true, icon: 'globe' },
  { id: 'workflow', label: 'Workflow', checked: true, icon: 'workflow' },
  { id: 'worker', label: 'Background Worker', checked: false, icon: 'worker' },
  { id: 'cron', label: 'Cron Job', checked: true, icon: 'clock' },
  { id: 'postgres', label: 'Postgres', checked: false, icon: 'db', muted: true },
];

const INTEGRATIONS = [
  { name: 'GitHub & Actions', desc: 'Connect repositories, branches, and automated CI/CD workflows in one click.', tag: 'Git & CI/CD' },
  { name: 'Amazon Web Services', desc: 'Monitor deployments and stream live runtime logs from AWS workloads.', tag: 'Cloud Provider' },
  { name: 'Microsoft Azure', desc: 'Unify visibility across Azure container apps and cloud environments.', tag: 'Cloud Provider' },
  { name: 'Google Cloud', desc: 'Track releases and stream logs from Cloud Run and GKE clusters.', tag: 'Cloud Provider' },
  { name: 'Kubernetes', desc: 'Observe pod health, rollouts, and real-time container logs in your browser.', tag: 'Containers' },
  { name: 'Docker', desc: 'Deploy and monitor containerized services with zero configuration drift.', tag: 'Containers' },
  { name: 'Vercel', desc: 'Keep frontend previews and production edge deployments in sync with your backend.', tag: 'App Platform' },
  { name: 'Render', desc: 'Track web services, workers, and automatic deploys from one dashboard.', tag: 'App Platform' },
  { name: 'Railway', desc: 'Centralize service URLs, logs, and environment configurations effortlessly.', tag: 'App Platform' },
  { name: 'DigitalOcean', desc: 'Manage App Platform and droplet deployments alongside the rest of your stack.', tag: 'Cloud Provider' },
];

const ENTERPRISE_PILLARS = [
  {
    badge: '01 / SECURITY',
    title: 'Zero-Trust Secret Management',
    description:
      'Protect API keys, database credentials, and signing tokens with bank-grade encryption. Scope variables strictly to Development, Staging, or Production.',
  },
  {
    badge: '02 / RELIABILITY',
    title: 'Instant Rollbacks & Release History',
    description:
      'Every commit, build, and deployment is versioned. If a release misbehaves in production, redeploy a known-good version in seconds.',
  },
  {
    badge: '03 / GOVERNANCE',
    title: 'Role-Based Access & Team Controls',
    description:
      'Give developers the autonomy to ship while keeping administrators in control of production environments, custom domains, and workspace access.',
  },
  {
    badge: '04 / COMPLIANCE',
    title: 'One-Click Audit Reports',
    description:
      'Export complete deployment histories filtered by project, environment, status, or date range in CSV or PDF for compliance and stakeholder reviews.',
  },
];

function ServiceTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'monitor':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2.5" y="3.5" width="15" height="10" rx="1" />
          <path d="M7 16.5h6M10 13.5v3" />
        </svg>
      );
    case 'globe':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7" />
          <path d="M3 10h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14" />
        </svg>
      );
    case 'workflow':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="2.5" />
          <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5 5l2.2 2.2M12.8 12.8L15 15M15 5l-2.2 2.2M7.2 12.8L5 15" />
        </svg>
      );
    case 'worker':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 6h14M3 10h9M3 14h6M14 11l3 2.5-3 2.5v-5z" />
        </svg>
      );
    case 'clock':
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10.5" r="6.5" />
          <path d="M10 7v3.8l2.5 1.5M8 2.5h4" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="10" cy="5.5" rx="6" ry="2.5" />
          <path d="M4 5.5v9c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-9M4 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5" />
        </svg>
      );
  }
}

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('harbor_token');
  const animationContainer = useRef<HTMLDivElement>(null);
  const [selectedServiceType, setSelectedServiceType] = useState('web');
  const [activeEnvTab, setActiveEnvTab] = useState<'Development' | 'Staging' | 'Production'>('Production');
  const [revealSecrets, setRevealSecrets] = useState(false);

  useEffect(() => {
    if (animationContainer.current) {
      const anim = lottie.loadAnimation({
        container: animationContainer.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: '/animations/hero-wide.json',
      });
      return () => anim.destroy();
    }
  }, []);

  const envSecrets: Record<'Development' | 'Staging' | 'Production', { key: string; value: string; encrypted: boolean }[]> = {
    Production: [
      { key: 'APP_PUBLIC_URL', value: 'https://api.acme.com', encrypted: false },
      { key: 'NODE_ENV', value: 'production', encrypted: false },
      { key: 'STRIPE_LIVE_SECRET_KEY', value: 'sk_live_51Nx92J...8k2P', encrypted: true },
      { key: 'OPENAI_API_KEY', value: 'sk-proj-98f72a1c44e9b0d31f2a', encrypted: true },
    ],
    Staging: [
      { key: 'APP_PUBLIC_URL', value: 'https://staging-api.acme.com', encrypted: false },
      { key: 'NODE_ENV', value: 'staging', encrypted: false },
      { key: 'STRIPE_LIVE_SECRET_KEY', value: 'sk_test_51Nx92J...4q9L', encrypted: true },
      { key: 'OPENAI_API_KEY', value: 'sk-stg-44c81e9a02f1b7c65d1e', encrypted: true },
    ],
    Development: [
      { key: 'APP_PUBLIC_URL', value: 'http://localhost:3000', encrypted: false },
      { key: 'NODE_ENV', value: 'development', encrypted: false },
      { key: 'STRIPE_LIVE_SECRET_KEY', value: 'sk_test_local_mock_key', encrypted: true },
      { key: 'OPENAI_API_KEY', value: 'sk-dev-local-sandbox-key', encrypted: true },
    ],
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white relative overflow-x-hidden">
      {/* ── 1. HERO SECTION ─────────────────────────────────────────────────────── */}
      <section className="w-full min-h-[92vh] flex flex-col justify-center items-start px-5 lg:px-[78px] pt-[130px] lg:pt-[16vh] pb-20 border-b border-gray-200 dark:border-[#2e3244] relative">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-12 lg:gap-8 z-10">
          <div className="w-full lg:w-1/2 flex flex-col justify-start">
            <DynamicHeading />

            <p className="mt-6 lg:mt-8 text-[18px] lg:text-[22px] text-gray-600 dark:text-[#a1a1aa] font-light max-w-[650px] leading-[1.6] font-sans">
              Centralize your DevOps lifecycle. Manage projects, configure environments, and monitor application deployments through a single, intuitive dashboard.
            </p>

            <div className="mt-10 lg:mt-12 flex flex-wrap items-center gap-4">
              <Link
                to={isLoggedIn ? '/projects' : '/register'}
                className="ease transition-colors group relative z-[1] flex cursor-pointer items-center overflow-hidden whitespace-nowrap justify-between motion-safe:duration-150 motion-reduce:duration-0 lg:motion-safe:duration-300 lg:motion-reduce:duration-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:text-white dark:hover:text-white lg:hover:text-white dark:lg:hover:text-white h-[64px] text-[18px] py-[18px] px-[26px] gap-[15px] lg:[--button-arrow-offset:2px] font-sans rounded-[2px]"
                style={{ letterSpacing: '0.2px', lineHeight: '150%' }}
              >
                <span className="ease pointer-events-none absolute inset-0 z-[0] block h-full w-full opacity-100 transition-transform origin-right scale-x-0 lg:group-hover:origin-left lg:group-hover:scale-x-100 motion-safe:duration-300 bg-[#2563eb]"></span>
                <span className="ease relative z-[1] inline-block transition-transform motion-safe:duration-300 translate-x-0 group-hover:translate-x-[var(--button-arrow-offset)]">
                  {isLoggedIn ? 'Dashboard' : 'Get Started'}
                </span>
                <ArrowRightIcon className="ease relative z-[1] translate-x-0 transition-transform motion-safe:duration-300 group-hover:-translate-x-[var(--button-arrow-offset)] w-[15px] h-[15px] rotate-0 transform" />
              </Link>

              <a
                href="#how-it-works"
                className="h-[64px] px-[24px] inline-flex items-center justify-center border border-gray-300 dark:border-[#3f445a] text-[17px] text-gray-800 dark:text-gray-200 hover:border-[#2563eb] dark:hover:border-[#38bdf8] transition-colors rounded-[2px]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end mt-8 lg:mt-0 pointer-events-none relative">
            <div className="w-full max-w-[680px] aspect-square lg:aspect-auto relative flex items-center justify-center">
              <div className="w-full h-full relative z-10" ref={animationContainer}></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. HOW IT WORKS ("Click, click, done.") SECTION ─────────────────────── */}
      <section
        id="how-it-works"
        data-module-type="howItWorks"
        className="w-full border-b border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0d0d0d] transition-colors"
      >
        <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[78px] py-20 lg:py-28 flex flex-col gap-14 lg:gap-[68px]">
          <h2
            className="font-['Roobert',sans-serif] font-roobert text-[42px] lg:text-[64px] font-normal tracking-tight leading-[1.08] text-gray-900 dark:text-white"
            data-text-style="heading-xxl"
          >
            <span className="burn" data-on="view" data-in="true">
              <span className="sr-only">Click, click, done.</span>
              <span aria-hidden="true">
                <span className="burn__word">Click,</span>{' '}
                <span className="burn__word">click,</span>{' '}
                <span className="burn__word">done.</span>
              </span>
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-10 xl:gap-14 items-start">
            {/* ── STEP 1: Create a service ── */}
            <div className="min-w-0 relative flex flex-col gap-8">
              <div className="lg:min-h-[148px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#6c35f5] text-white font-sans text-[15px] font-medium">
                  <span>1</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Create a service
                  </h3>
                  <p className="text-[16px] lg:text-[17px] text-gray-600 dark:text-[#b3b3b3] leading-[1.6] font-light">
                    Choose what you need to run your apps, APIs, agent logic, databases, cron jobs, and more.
                  </p>
                </div>
              </div>

              {/* Step 1 Graphic Mockup: + New service selector */}
              <div className="w-full max-w-[360px] flex flex-col font-sans select-none">
                <div className="h-[46px] px-4 flex items-center gap-3 bg-white dark:bg-[#141414] border border-gray-300 dark:border-[#272727] text-gray-800 dark:text-[#e3e3e3] text-[14px]">
                  <span className="text-lg leading-none text-gray-500 dark:text-gray-400">+</span>
                  <span>New service</span>
                </div>
                <div className="mt-1.5 bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-[#272727] py-1.5 flex flex-col">
                  {SERVICE_TYPES.map((item) => {
                    const isSelected = selectedServiceType === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedServiceType(item.id)}
                        className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-[14px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#968dfa] text-[#0d0d0d] font-medium'
                            : item.muted
                              ? 'text-gray-400 dark:text-[#55534f] hover:bg-gray-100 dark:hover:bg-[#141414]'
                              : 'text-gray-700 dark:text-[#c7c7c7] hover:bg-gray-100 dark:hover:bg-[#141414]'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <ServiceTypeIcon type={item.icon} />
                          <span>{item.label}</span>
                        </span>
                        {(item.checked || isSelected) && (
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4.5 10.5l3.5 3.5 7.5-7.5" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── STEP 2: Push your code ── */}
            <div className="min-w-0 relative flex flex-col gap-8">
              <div className="lg:min-h-[148px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#6c35f5] text-white font-sans text-[15px] font-medium">
                  <span>2</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Push your code
                  </h3>
                  <p className="text-[16px] lg:text-[17px] text-gray-600 dark:text-[#b3b3b3] leading-[1.6] font-light">
                    Just connect your repo. Harbor detects your workflow and deploys it to the right environment.
                  </p>
                </div>
              </div>

              {/* Step 2 Graphic Mockup: Branch/Build config + terminal output */}
              <div className="w-full max-w-[360px] flex flex-col gap-3">
                <div className="p-4 bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-[#272727] flex flex-col gap-3">
                  <div className="grid grid-cols-[105px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#8f8f8f]">Branch</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#272727] flex items-center gap-2 font-mono text-[12px] text-gray-900 dark:text-white">
                      <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878z" />
                      </svg>
                      <span>main</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[105px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#8f8f8f]">Build Command</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#272727] flex items-center font-mono text-[12px] text-gray-900 dark:text-white">
                      npm build
                    </div>
                  </div>

                  <div className="grid grid-cols-[105px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#8f8f8f]">Start Command</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#141414] border border-gray-200 dark:border-[#272727] flex items-center font-mono text-[12px] text-gray-900 dark:text-white">
                      npm start
                    </div>
                  </div>

                  <div className="grid grid-cols-[105px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#6b6b6b]">Auto-Deploy</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-[#222222] flex items-center justify-between text-[12px] text-gray-500 dark:text-[#6b6b6b]">
                      <span>On Commit</span>
                      <span>⌄</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-[#272727] font-mono text-[12px] leading-[1.75] flex flex-col">
                  <div className="text-gray-500 dark:text-[#8f8f8f]">
                    <span className="text-[#968dfa]">==&gt;</span> Running build command &apos;npm build&apos;...
                  </div>
                  <div className="text-gray-700 dark:text-[#c7c7c7]">✓ Built in 2.74s</div>
                  <div className="text-gray-500 dark:text-[#8f8f8f]">
                    <span className="text-[#968dfa]">==&gt;</span> Uploading build...
                  </div>
                  <div className="text-gray-900 dark:text-white font-medium">
                    <span className="text-[#968dfa]">==&gt;</span> Your site is live 🎉
                  </div>
                </div>
              </div>
            </div>

            {/* ── STEP 3: Harbor does the rest ── */}
            <div className="min-w-0 relative flex flex-col gap-8">
              <div className="lg:min-h-[148px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#6c35f5] text-white font-sans text-[15px] font-medium">
                  <span>3</span>
                </div>
                <div className="flex flex-col gap-3">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Harbor does the rest
                  </h3>
                  <p className="text-[16px] lg:text-[17px] text-gray-600 dark:text-[#b3b3b3] leading-[1.6] font-light">
                    Get instant networking, scaling, previews, deploys, rollbacks, and monitoring.
                  </p>
                </div>
              </div>

              {/* Step 3 Graphic Mockup: git push + live deployment feed */}
              <div className="w-full max-w-[360px] flex flex-col gap-3">
                <div className="px-1 font-mono text-[12px] leading-[1.7]">
                  <div className="text-gray-400 dark:text-[#55534f]">~/site $ git commit -am &quot;Final tweaks&quot;</div>
                  <div className="text-gray-600 dark:text-[#8f8f8f]">[main 4f2c9ab] Final tweaks</div>
                  <div className="text-[#6c35f5] dark:text-[#968dfa]">~/site $ git push</div>
                </div>

                <div className="p-4 bg-white dark:bg-[#0d0d0d] border border-gray-300 dark:border-[#272727] flex flex-col">
                  <div className="pb-3 border-b border-gray-200 dark:border-[#222222] flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[12px] text-gray-600 dark:text-[#b3b3b3]">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                      </svg>
                      <span>username / your-repo</span>
                      <span className="text-gray-400">•</span>
                      <span className="font-mono">main</span>
                    </div>
                    <span className="text-[12px] text-[#6c35f5] dark:text-[#968dfa]">https://yourwebsite.com</span>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-[#222222]">
                    {[
                      { title: 'Automatic Deploy live: Final tweaks', time: '1:20:50 PM' },
                      { title: "Automatic Deploy live: Fix Claude's code", time: '1:20:42 PM' },
                      { title: 'Manual Deploy live', time: '9:50:12 AM' },
                    ].map((deploy, idx) => (
                      <div key={idx} className="py-3 flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-[#37cd8f] text-[#0d0d0d] flex items-center justify-center shrink-0">
                          <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M2.5 6l2.5 2.5 4.5-5" />
                          </svg>
                        </span>
                        <div className="flex flex-col">
                          <span className="text-[12px] text-gray-800 dark:text-[#e3e3e3]">{deploy.title}</span>
                          <span className="font-mono text-[10px] text-gray-500 dark:text-[#6b6b6b]">{deploy.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. PRODUCT FEATURES (BENTO GRID) ────────────────────────────────────── */}
      <section id="features" className="w-full border-b border-gray-200 dark:border-[#2e3244] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px]">
        <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-14">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-mono text-[12px] uppercase tracking-widest text-[#2563eb] dark:text-[#38bdf8]">
                Everything You Need to Ship
              </span>
              <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[54px] font-normal tracking-tight leading-[1.1]">
                Zero-friction deployments. Total visibility.
              </h2>
            </div>
            <p className="text-[16px] lg:text-[18px] text-gray-600 dark:text-[#a1a1aa] max-w-[480px] font-light">
              Stop juggling disconnected CI tabs, cloud consoles, and secret spreadsheets. Harbor brings your entire release workflow into one place.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Card 1: Multi-Environment & Secret Management */}
            <div className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#11131c] p-7 lg:p-9 flex flex-col justify-between gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] dark:text-[#38bdf8] border border-[#2563eb]/30">
                    Environment Management
                  </span>
                  <button
                    type="button"
                    onClick={() => setRevealSecrets((v) => !v)}
                    className="font-mono text-[12px] text-gray-600 dark:text-gray-300 hover:text-[#2563eb] dark:hover:text-[#38bdf8] cursor-pointer underline"
                  >
                    {revealSecrets ? 'Hide values' : 'Reveal values'}
                  </button>
                </div>
                <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal">
                  Environments &amp; Encrypted Secrets
                </h3>
                <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                  Isolate Development, Staging, and Production configurations for every project. Manage environment variables and sensitive API keys with one-click masking.
                </p>
              </div>

              <div className="border border-gray-300 dark:border-[#272a3a] bg-white dark:bg-[#0b0c12]">
                <div className="flex border-b border-gray-200 dark:border-[#272a3a]">
                  {(['Development', 'Staging', 'Production'] as const).map((env) => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setActiveEnvTab(env)}
                      className={`px-4 py-2.5 font-mono text-[12px] border-r border-gray-200 dark:border-[#272a3a] cursor-pointer transition-colors ${
                        activeEnvTab === env
                          ? 'bg-[#2563eb] text-white font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#161824]'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-gray-200 dark:divide-[#1e202e] font-mono text-[12px]">
                  {envSecrets[activeEnvTab].map((row) => (
                    <div key={row.key} className="px-4 py-2.5 flex items-center justify-between gap-4">
                      <span className="text-gray-800 dark:text-gray-200">{row.key}</span>
                      <span className="text-gray-500 dark:text-[#8f8f8f] truncate">
                        {row.encrypted && !revealSecrets ? '••••••••••••••••••••••••' : row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature Card 2: Live Log Streaming */}
            <div className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#11131c] p-7 lg:p-9 flex flex-col justify-between gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-[#37cd8f] border border-emerald-500/30">
                    Real-Time Observability
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[12px] text-emerald-600 dark:text-[#37cd8f]">
                    <span className="w-2 h-2 rounded-full bg-[#37cd8f] animate-pulse"></span>
                    Live stream active
                  </span>
                </div>
                <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal">
                  Instant Live Build &amp; Runtime Logs
                </h3>
                <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                  Watch your builds and production services in real time. Filter by severity, search across log lines, and diagnose issues the moment they happen.
                </p>
              </div>

              <div className="border border-gray-300 dark:border-[#272a3a] bg-[#0b0c12] text-gray-200 p-4 font-mono text-[12px] leading-[1.8]">
                <div className="text-[#8f8f8f]">10:42:01 [BUILD]   Cloning repository acme/checkout-web (branch: main)...</div>
                <div className="text-[#38bdf8]">10:42:04 [DEPLOY]  Build succeeded in 2.7s — rolling out to production</div>
                <div className="text-[#37cd8f]">10:42:06 [HEALTH]  GET /healthz responded 200 OK in 4ms</div>
                <div className="text-[#ecd60e]">10:42:07 [LIVE]    Service is live at https://checkout.acme.com</div>
              </div>
            </div>

            {/* Feature Card 3: Custom Domains & Verification */}
            <div className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#11131c] p-7 lg:p-9 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="w-fit font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-purple-500/10 text-[#6c35f5] dark:text-[#b3b1fa] border border-purple-500/30">
                  Custom Domains
                </span>
                <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal">
                  One-Click Domains &amp; DNS Verification
                </h3>
                <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                  Attach custom domains to any service, verify DNS records automatically, and designate primary production endpoints with zero downtime.
                </p>
              </div>

              <div className="border border-gray-300 dark:border-[#272a3a] bg-white dark:bg-[#0b0c12] divide-y divide-gray-200 dark:divide-[#1e202e] font-mono text-[12px]">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-gray-900 dark:text-white">app.yourcompany.com</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#2563eb]/15 text-[#2563eb] dark:text-[#38bdf8]">PRIMARY</span>
                  </div>
                  <span className="text-[#37cd8f]">✓ DNS Verified</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">staging.yourcompany.com</span>
                  <span className="text-[#37cd8f]">✓ DNS Verified</span>
                </div>
              </div>
            </div>

            {/* Feature Card 4: Deployment Analytics & Audit Reports */}
            <div className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#11131c] p-7 lg:p-9 flex flex-col justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="w-fit font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-sky-500/10 text-sky-600 dark:text-[#38bdf8] border border-sky-500/30">
                  Insights &amp; Reports
                </span>
                <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal">
                  Deployment Metrics &amp; Exportable Reports
                </h3>
                <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                  Track deployment frequency, success rates, and build durations across every team. Export clean CSV or PDF reports whenever you need them.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="p-3.5 border border-gray-300 dark:border-[#272a3a] bg-white dark:bg-[#0b0c12]">
                  <div className="text-[11px] text-gray-500 dark:text-[#8f8f8f]">SUCCESS RATE</div>
                  <div className="mt-1 text-[22px] text-[#37cd8f]">99.8%</div>
                </div>
                <div className="p-3.5 border border-gray-300 dark:border-[#272a3a] bg-white dark:bg-[#0b0c12]">
                  <div className="text-[11px] text-gray-500 dark:text-[#8f8f8f]">AVG DEPLOY</div>
                  <div className="mt-1 text-[22px] text-gray-900 dark:text-white">28s</div>
                </div>
                <div className="p-3.5 border border-gray-300 dark:border-[#272a3a] bg-white dark:bg-[#0b0c12]">
                  <div className="text-[11px] text-gray-500 dark:text-[#8f8f8f]">EXPORTS</div>
                  <div className="mt-1 text-[22px] text-[#38bdf8]">CSV &amp; PDF</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MULTI-CLOUD INTEGRATIONS SECTION ─────────────────────────────────── */}
      <section id="integrations" className="w-full border-b border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0d0e14] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px]">
        <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-12">
          <div className="flex flex-col gap-3 max-w-[680px]">
            <span className="font-mono text-[12px] uppercase tracking-widest text-[#2563eb] dark:text-[#38bdf8]">
              Seamless Integrations
            </span>
            <h2 className="font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[52px] font-normal tracking-tight leading-[1.1]">
              Works with the cloud stack you already run.
            </h2>
            <p className="text-[16px] lg:text-[18px] text-gray-600 dark:text-[#a1a1aa] font-light leading-[1.6]">
              Connect GitHub and bring all of your cloud providers, container clusters, and app platforms into one unified Harbor workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-gray-200 dark:border-[#27272f]">
            {INTEGRATIONS.map((item) => (
              <div
                key={item.name}
                className="p-6 border-r border-b border-gray-200 dark:border-[#27272f] bg-white dark:bg-[#111218] hover:bg-gray-50 dark:hover:bg-[#171922] transition-colors flex flex-col justify-between gap-4"
              >
                <span className="w-fit font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 bg-gray-100 dark:bg-[#1d202d] text-gray-600 dark:text-[#b3b1fa]">
                  {item.tag}
                </span>
                <div>
                  <h3 className="font-['Roobert',sans-serif] text-[19px] font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </h3>
                  <p className="mt-1.5 text-[13px] text-gray-500 dark:text-[#8f8f8f] leading-[1.5]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SECURITY, GOVERNANCE & TEAM SCALE SECTION ────────────────────────── */}
      <section id="enterprise" className="w-full border-b border-gray-200 dark:border-[#2e3244] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px]">
        <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="font-mono text-[12px] uppercase tracking-widest text-[#2563eb] dark:text-[#38bdf8]">
                Enterprise-Ready by Default
              </span>
              <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[52px] font-normal tracking-tight leading-[1.1]">
                Built for fast-moving teams that care about security.
              </h2>
            </div>
            <p className="text-[16px] lg:text-[18px] text-gray-600 dark:text-[#a1a1aa] max-w-[520px] font-light">
              Whether you are launching your first service or managing dozens of production environments across a growing organization, Harbor scales with you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {ENTERPRISE_PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="p-6 border border-gray-200 dark:border-[#2e3244] bg-white dark:bg-[#0d0e14] flex flex-col justify-between gap-6"
              >
                <div className="flex flex-col gap-3">
                  <span className="font-mono text-[11px] text-[#2563eb] dark:text-[#38bdf8]">{pillar.badge}</span>
                  <h3 className="font-['Roobert',sans-serif] text-[22px] font-normal text-gray-900 dark:text-white leading-snug">
                    {pillar.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                    {pillar.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-[#1f2230] flex items-center gap-2 font-mono text-[11px] text-[#37cd8f]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#37cd8f]"></span>
                  <span>Included on all workspaces</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. CLOSING CTA SECTION ──────────────────────────────────────────────── */}
      <section className="w-full py-24 lg:py-32 px-5 md:px-10 lg:px-[78px] bg-[#111218] text-white border-b border-[#27272f]">
        <div className="mx-auto w-full max-w-[1440px] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <div className="flex flex-col gap-4 max-w-[700px]">
            <h2 className="font-['Roobert',sans-serif] font-roobert text-[40px] lg:text-[60px] font-light tracking-tight leading-[1.06]">
              Move from commit to production in seconds.
            </h2>
            <p className="text-[18px] text-[#b3b3b3] font-light leading-[1.6]">
              Create your free Harbor account, connect your GitHub repositories, and ship your next release with complete confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to={isLoggedIn ? '/dashboard' : '/register'}
              className="ease transition-colors group relative z-[1] flex cursor-pointer items-center overflow-hidden whitespace-nowrap justify-between bg-white text-black hover:text-white h-[64px] text-[18px] py-[18px] px-[28px] gap-[15px] rounded-[2px]"
            >
              <span className="ease pointer-events-none absolute inset-0 z-[0] block h-full w-full origin-right scale-x-0 group-hover:origin-left group-hover:scale-x-100 transition-transform duration-300 bg-[#2563eb]"></span>
              <span className="relative z-[1]">{isLoggedIn ? 'Go to Dashboard' : 'Get Started for Free'}</span>
              <ArrowRightIcon className="relative z-[1] w-[15px] h-[15px]" />
            </Link>
            {!isLoggedIn && (
              <Link
                to="/login"
                className="h-[64px] px-[26px] inline-flex items-center justify-center border border-[#3f445a] text-white hover:border-white transition-colors text-[17px] rounded-[2px]"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="w-full py-12 px-5 md:px-10 lg:px-[78px] bg-white dark:bg-[#0d0e14] text-gray-600 dark:text-[#8f8f8f] text-[14px]">
        <div className="mx-auto w-full max-w-[1440px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logos/harbor_light_notext.svg" alt="Harbor Logo" className="h-6 w-auto" />
            <span className="font-['Roobert',sans-serif] text-xl text-gray-900 dark:text-white lowercase">harbor</span>
            <span className="text-gray-400">•</span>
            <span>The Cloud Deployment &amp; Visibility Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#features" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Features
            </a>
            <a href="#integrations" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Integrations
            </a>
            <a href="#enterprise" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Enterprise
            </a>
            <span className="flex items-center gap-2 font-mono text-[12px] text-[#37cd8f]">
              <span className="w-2 h-2 rounded-full bg-[#37cd8f]"></span>
              All systems operational
            </span>
          </div>
        </div>
      </footer>

      <ThemeToggle />
    </div>
  );
}
