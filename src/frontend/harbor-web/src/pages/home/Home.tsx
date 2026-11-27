import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, MotionConfig } from 'motion/react';
import {
  ShieldCheck,
  RotateCcw,
  Users,
  FileSpreadsheet,
  Lock,
  Radio,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { ArrowRightIcon } from '../../components/ui/icons';
import ThemeToggle from '../../components/ui/ThemeToggle';
import HeroControlPlane from './components/HeroControlPlane';
import ArchitectureDiagram from './components/ArchitectureDiagram';
import HowItWorksSection from './components/HowItWorksSection';
import FeaturesBentoSection from './components/FeaturesBentoSection';
import IntegrationsSection from './components/IntegrationsSection';
import HarborFooter from './components/HarborFooter';

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
    let pauseTimeoutId: ReturnType<typeof setTimeout>;
    let nextWordTimeoutId: ReturnType<typeof setTimeout>;

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
          pauseTimeoutId = setTimeout(() => {
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
          nextWordTimeoutId = setTimeout(() => {
            setWordIndex((prev) => (prev + 1) % WORDS.length);
          }, 400);
        }
      }
    }, SCRAMBLE_SPEED);

    return () => {
      clearInterval(interval);
      clearTimeout(pauseTimeoutId);
      clearTimeout(nextWordTimeoutId);
    };
  }, [wordIndex]);

  return (
    <h1 className="font-['Roobert',sans-serif] font-roobert text-[46px] sm:text-[58px] lg:text-[74px] text-gray-900 dark:text-white leading-[1.04] tracking-tight font-light text-left">
      The deployment
      <br />
      platform built for
      <br />
      <div className="mt-1 flex flex-wrap items-center min-h-[1.15em]">
        <span className="bg-gradient-to-r from-[#2563eb] to-[#3b82f6] bg-clip-text text-transparent pb-1 lg:pb-0">
          {displayText}
        </span>
        <div className="inline-flex h-[0.95em] w-[0.5ch] items-center align-middle ml-2 opacity-100 animate-blink">
          <div className="h-[88%] w-full bg-gray-900 dark:bg-white" />
        </div>
      </div>
    </h1>
  );
};

const HERO_STATS = [
  { label: 'AVG DEPLOY TIME', value: '< 28s', accent: 'text-gray-900 dark:text-white' },
  { label: 'ENCRYPTION AT REST', value: 'AES-256', accent: 'text-[#2563eb] dark:text-[#3b82f6]' },
  { label: 'LOG STREAM LATENCY', value: '18ms', accent: 'text-emerald-700 dark:text-[#37cd8f]' },
  { label: 'LOG ADAPTERS', value: '9 Clouds', accent: 'text-gray-900 dark:text-white' },
];

const ENTERPRISE_PILLARS = [
  {
    badge: '01 / SECURITY',
    title: 'Zero-Trust Secret Management',
    description:
      'Protect API keys, database credentials, and signing tokens with AES-256-GCM authenticated encryption scoped strictly to Dev, Staging, or Production.',
    icon: <ShieldCheck className="w-5 h-5 text-[#2563eb] dark:text-[#3b82f6]" />,
  },
  {
    badge: '02 / RELIABILITY',
    title: 'One-Click Redeploy & Release History',
    description:
      'Every commit, build, and deployment is recorded. If a release misbehaves in production, redeploy a known-good version in one click.',
    icon: <RotateCcw className="w-5 h-5 text-[#2563eb] dark:text-[#3b82f6]" />,
  },
  {
    badge: '03 / GOVERNANCE',
    title: 'Role-Based Access & Team Controls',
    description:
      'Give developers the autonomy to ship while keeping administrators in control of production environments, custom domains, and Redis-backed session revocation.',
    icon: <Users className="w-5 h-5 text-[#2563eb] dark:text-[#3b82f6]" />,
  },
  {
    badge: '04 / COMPLIANCE',
    title: 'One-Click Audit & DORA Reports',
    description:
      'Export complete deployment histories filtered by project, environment, status, or date range in CSV or PDF for compliance and stakeholder reviews.',
    icon: <FileSpreadsheet className="w-5 h-5 text-[#2563eb] dark:text-[#3b82f6]" />,
  },
];

const SECURITY_CONTROLS = [
  { icon: <Lock className="w-3.5 h-3.5" />, label: 'AES-256-GCM Secret Vault' },
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'HMAC-SHA256 Webhook Signatures' },
  { icon: <Radio className="w-3.5 h-3.5" />, label: 'Real-Time Log Token Scrubbing' },
  { icon: <Cpu className="w-3.5 h-3.5" />, label: 'Redis Distributed JWT Blacklist' },
];

export default function Home() {
  const isLoggedIn = !!localStorage.getItem('harbor_token');

  return (
    <MotionConfig reducedMotion="user">
      <div className="w-full min-h-screen flex flex-col bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white relative overflow-x-hidden">
        {/* ── 1. HERO SECTION ─────────────────────────────────────────────────── */}
        <section className="w-full min-h-[92vh] flex flex-col justify-center items-start px-5 md:px-10 lg:px-[78px] pt-[112px] lg:pt-[132px] pb-16 lg:pb-24 border-b border-gray-200 dark:border-[#2e3244] relative harbor-grid-bg">
          {/* Top-to-bottom subtle fade so architectural grid stays refined */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white dark:from-[oklch(0.21_0.03_263.45)]/60 dark:via-transparent dark:to-[oklch(0.21_0.03_263.45)]"
          />

          <div className="w-full max-w-[1440px] mx-auto flex flex-col xl:flex-row justify-between items-start xl:items-center gap-12 xl:gap-10 relative z-10">
            {/* Left Copy & CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="w-full xl:w-[48%] flex flex-col justify-start"
            >
              <div className="mb-6 inline-flex w-fit items-center gap-2.5 px-3 py-1.5 border border-gray-300 dark:border-[#2e3244] bg-white/90 dark:bg-[#111420]/90 rounded-[2px] font-mono text-[11px] tracking-wider uppercase text-gray-700 dark:text-[#b4bacd]">
                <span className="w-2 h-2 rounded-full bg-[#37cd8f] animate-pulse" />
                <span>Multi-Cloud Deployment Control Plane</span>
              </div>

              <DynamicHeading />

              <p className="mt-6 text-[17px] lg:text-[20px] text-gray-600 dark:text-[#a1a1aa] font-light max-w-[590px] leading-[1.6] font-sans">
                Centralize your DevOps lifecycle. Orchestrate GitHub Actions, encrypt environment secrets, stream live SignalR logs, and ship across every cloud from one crisp workspace.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to={isLoggedIn ? '/projects' : '/register'}
                  className="ease transition-colors group relative z-[1] flex cursor-pointer items-center overflow-hidden whitespace-nowrap justify-between motion-safe:duration-150 motion-reduce:duration-0 lg:motion-safe:duration-300 lg:motion-reduce:duration-0 bg-gray-900 dark:bg-white text-white dark:text-black hover:text-white dark:hover:text-white lg:hover:text-white dark:lg:hover:text-white h-[58px] text-[17px] py-[16px] px-[26px] gap-[15px] lg:[--button-arrow-offset:2px] font-sans rounded-[2px]"
                  style={{ letterSpacing: '0.2px', lineHeight: '150%' }}
                >
                  <span className="ease pointer-events-none absolute inset-0 z-[0] block h-full w-full opacity-100 transition-transform origin-right scale-x-0 lg:group-hover:origin-left lg:group-hover:scale-x-100 motion-safe:duration-300 bg-[#2563eb]" />
                  <span className="ease relative z-[1] inline-block transition-transform motion-safe:duration-300 translate-x-0 group-hover:translate-x-[var(--button-arrow-offset)]">
                    {isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}
                  </span>
                  <ArrowRightIcon className="ease relative z-[1] translate-x-0 transition-transform motion-safe:duration-300 group-hover:-translate-x-[var(--button-arrow-offset)] w-[15px] h-[15px] rotate-0 transform" />
                </Link>

                <a
                  href="#architecture"
                  className="h-[58px] px-[24px] inline-flex items-center justify-center border border-gray-300 dark:border-[#3f445a] bg-white/80 dark:bg-[#111420]/80 text-[16px] text-gray-800 dark:text-gray-200 hover:border-[#2563eb] dark:hover:border-[#3b82f6] transition-colors rounded-[2px]"
                >
                  Explore Architecture
                </a>
              </div>

              {/* Compact Architectural Telemetry Bar */}
              <div className="mt-10 pt-6 border-t border-gray-200 dark:border-[#2e3244] grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-[600px]">
                {HERO_STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className={`font-mono text-[22px] font-medium tabular-nums ${stat.accent}`}>
                      {stat.value}
                    </span>
                    <span className="font-mono text-[11px] tracking-wider text-gray-500 dark:text-[#9aa3bc] mt-0.5">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Interactive Live Deployment Control Plane */}
            <div className="w-full xl:w-[52%] flex justify-start xl:justify-end">
              <HeroControlPlane />
            </div>
          </div>
        </section>

        {/* ── 2. INTERACTIVE ANIMATED ARCHITECTURE DIAGRAM ────────────────────── */}
        <ArchitectureDiagram />

        {/* ── 3. HOW IT WORKS ("Click, click, done.") ─────────────────────────── */}
        <HowItWorksSection />

        {/* ── 4. INTERACTIVE PRODUCT FEATURES BENTO GRID ──────────────────────── */}
        <FeaturesBentoSection />

        {/* ── 5. MULTI-CLOUD INTEGRATIONS SHOWCASE ────────────────────────────── */}
        <IntegrationsSection />

        {/* ── 6. SECURITY, GOVERNANCE & TEAM SCALE ────────────────────────────── */}
        <section
          id="enterprise"
          className="w-full border-b border-gray-200 dark:border-[#2e3244] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px] bg-white dark:bg-[oklch(0.21_0.03_263.45)]"
        >
          <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-12">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <span className="font-mono text-[13px] uppercase tracking-widest text-[#2563eb] dark:text-[#3b82f6] font-medium">
                  Enterprise-Ready by Default
                </span>
                <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[52px] font-normal tracking-tight leading-[1.08] text-gray-900 dark:text-white">
                  Built for fast-moving teams that care about security.
                </h2>
              </div>
              <p className="text-[17px] lg:text-[19px] text-gray-600 dark:text-[#a1a1aa] max-w-[520px] font-light">
                Whether you are launching your first service or managing dozens of production environments across a growing organization, Harbor scales with you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {ENTERPRISE_PILLARS.map((pillar, idx) => (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                  className="group p-6 border border-gray-200 dark:border-[#2e3244] hover:border-[#2563eb] dark:hover:border-[#2563eb] bg-[#fafafa] dark:bg-[#111420] rounded-[2px] flex flex-col justify-between gap-6 transition-colors"
                >
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12.5px] font-medium text-[#2563eb] dark:text-[#3b82f6]">
                        {pillar.badge}
                      </span>
                      <span className="w-9 h-9 border border-gray-200 dark:border-[#2a2f42] bg-white dark:bg-[#0b0d14] rounded-[2px] flex items-center justify-center group-hover:border-[#2563eb] transition-colors">
                        {pillar.icon}
                      </span>
                    </div>
                    <h3 className="font-['Roobert',sans-serif] text-[22px] font-normal text-gray-900 dark:text-white leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-[15.5px] text-gray-600 dark:text-[#b4bacd] leading-[1.6] font-light">
                      {pillar.description}
                    </p>
                  </div>
                  <div className="pt-3.5 border-t border-gray-200 dark:border-[#1f2334] flex items-center gap-2 font-mono text-[12.5px] text-emerald-700 dark:text-[#37cd8f]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Included on all workspaces</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Security Architecture Strip */}
            <div className="p-5 border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0d0f17] rounded-[2px] flex flex-wrap items-center justify-between gap-4">
              {SECURITY_CONTROLS.map((ctrl) => (
                <div
                  key={ctrl.label}
                  className="flex items-center gap-2.5 font-mono text-[13.5px] text-gray-700 dark:text-[#d1d5e3]"
                >
                  <span className="text-[#2563eb] dark:text-[#3b82f6]">{ctrl.icon}</span>
                  <span>{ctrl.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. ANIMATED SAAS FOOTER WITH CTA & OVERSIZED WORDMARK ───────────── */}
        <HarborFooter isLoggedIn={isLoggedIn} />

        <ThemeToggle />
      </div>
    </MotionConfig>
  );
}
