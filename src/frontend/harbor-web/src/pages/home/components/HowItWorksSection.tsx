import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  Server,
  Workflow,
  Clock,
  Database,
  Layers,
  Check,
  RotateCcw,
  GitBranch,
  Terminal,
} from 'lucide-react';

interface ServiceOption {
  id: string;
  label: string;
  branch: string;
  buildCmd: string;
  startCmd: string;
  buildTime: string;
  liveUrl: string;
  icon: React.ReactNode;
}

const SERVICE_OPTIONS: ServiceOption[] = [
  {
    id: 'web',
    label: 'Web Service',
    branch: 'main',
    buildCmd: 'npm run build',
    startCmd: 'npm run start',
    buildTime: '2.74s',
    liveUrl: 'https://api.acme-app.dev',
    icon: <Server className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'static',
    label: 'Static Site',
    branch: 'main',
    buildCmd: 'vite build',
    startCmd: 'nginx -g "daemon off;"',
    buildTime: '1.89s',
    liveUrl: 'https://acme-app.dev',
    icon: <Globe className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'microservice',
    label: 'Microservice API',
    branch: 'release/v2',
    buildCmd: 'dotnet publish -c Release',
    startCmd: 'dotnet Harbor.Api.dll',
    buildTime: '4.12s',
    liveUrl: 'https://checkout.acme-app.dev',
    icon: <Layers className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'worker',
    label: 'Background Worker',
    branch: 'main',
    buildCmd: 'npm run build:worker',
    startCmd: 'node dist/consumer.js',
    buildTime: '2.15s',
    liveUrl: 'kafka://deployment-events',
    icon: <Workflow className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'cron',
    label: 'Cron Job',
    branch: 'main',
    buildCmd: 'npm run build:jobs',
    startCmd: 'node dist/nightly-sync.js',
    buildTime: '1.62s',
    liveUrl: '0 2 * * * (UTC)',
    icon: <Clock className="w-4 h-4 shrink-0" />,
  },
  {
    id: 'postgres',
    label: 'Managed Postgres',
    branch: 'schema/main',
    buildCmd: 'harbor db migrate --up',
    startCmd: 'postgres:15-alpine',
    buildTime: '0.94s',
    liveUrl: 'pg://harbor-prod:5432',
    icon: <Database className="w-4 h-4 shrink-0" />,
  },
];

const INITIAL_DEPLOYS = [
  { id: 'd3', sha: '4f2c9ab', title: 'Automatic Deploy live: Final tweaks', time: '1:20:50 PM', status: 'Live' },
  { id: 'd2', sha: '9b1e730', title: 'Automatic Deploy live: Add Redis cache', time: '12:44:18 PM', status: 'Previous' },
  { id: 'd1', sha: '2a8c10f', title: 'Manual Deploy live: v2.3.0 release', time: '9:50:12 AM', status: 'Archived' },
];

export default function HowItWorksSection() {
  const [selectedId, setSelectedId] = useState('web');
  const [visibleLines, setVisibleLines] = useState(4);
  const [replayKey, setReplayKey] = useState(0);
  const [rolledBack, setRolledBack] = useState(false);

  const selected = SERVICE_OPTIONS.find((s) => s.id === selectedId) ?? SERVICE_OPTIONS[0];

  const startBuildReplay = (nextId?: string) => {
    if (nextId) setSelectedId(nextId);
    setVisibleLines(1);
    setReplayKey((k) => k + 1);
  };

  // Animate build terminal lines whenever selected service or replay changes
  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleLines(2), 380),
      setTimeout(() => setVisibleLines(3), 820),
      setTimeout(() => setVisibleLines(4), 1280),
    ];
    return () => timers.forEach(clearTimeout);
  }, [selectedId, replayKey]);

  const deploys = rolledBack
    ? [
        { id: 'd-rb', sha: '9b1e730', title: 'One-Click Redeploy live: Restored 9b1e730', time: 'Just now', status: 'Live' },
        ...INITIAL_DEPLOYS.slice(0, 2).map((d) => ({ ...d, status: 'Previous' })),
      ]
    : INITIAL_DEPLOYS;

  return (
    <section
      id="how-it-works"
      data-module-type="howItWorks"
      className="w-full border-b border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0d0f17] transition-colors"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[78px] py-20 lg:py-28 flex flex-col gap-14 lg:gap-[64px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-widest text-[#2563eb] dark:text-[#3b82f6]">
              Developer Workflow
            </span>
            <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[42px] lg:text-[64px] font-normal tracking-tight leading-[1.06] text-gray-900 dark:text-white">
              Click, click, done.
            </h2>
          </div>
          <p className="text-[16px] lg:text-[18px] text-gray-600 dark:text-[#a1a1aa] max-w-[460px] font-light">
            Pick a service type on the left to watch how Harbor configures the build, deploys on push, and keeps instant rollbacks ready.
          </p>
        </div>

        {/* Animated desktop connector rail */}
        <div className="relative">
          <div className="hidden md:block absolute top-4 left-4 right-[33%] h-[1px] bg-gray-300 dark:bg-[#2a2f42] z-0 overflow-hidden">
            <motion.div
              className="h-full w-24 bg-gradient-to-r from-transparent via-[#2563eb] to-[#3b82f6]"
              animate={{ x: ['-10%', '600%'] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-10 xl:gap-14 items-start relative z-10">
            {/* ── STEP 1: Create a service ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45 }}
              className="min-w-0 flex flex-col gap-7"
            >
              <div className="lg:min-h-[144px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#2563eb] text-white font-mono text-[13px] font-medium">
                  01
                </div>
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Create a service
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                    Choose what you need to run your apps, APIs, workers, databases, or scheduled jobs.
                  </p>
                </div>
              </div>

              <div className="w-full flex flex-col font-sans select-none">
                <div className="h-[44px] px-4 flex items-center justify-between bg-white dark:bg-[#131623] border border-gray-300 dark:border-[#2a2f42] text-gray-800 dark:text-[#e3e3e3] text-[13px] rounded-t-[2px]">
                  <span className="flex items-center gap-2.5">
                    <span className="text-[#2563eb] dark:text-[#3b82f6] font-mono">+</span>
                    <span>New service</span>
                  </span>
                  <span className="font-mono text-[10px] text-gray-400 dark:text-[#6e748b]">INTERACTIVE</span>
                </div>
                <div className="bg-white dark:bg-[#0b0d14] border-x border-b border-gray-300 dark:border-[#2a2f42] py-1.5 flex flex-col rounded-b-[2px]">
                  {SERVICE_OPTIONS.map((item) => {
                    const isSelected = selectedId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => startBuildReplay(item.id)}
                        className={`relative w-full px-4 py-2.5 flex items-center justify-between text-left text-[14px] transition-colors cursor-pointer ${
                          isSelected
                            ? 'text-white font-medium'
                            : 'text-gray-700 dark:text-[#c7cbd9] hover:bg-gray-100 dark:hover:bg-[#141724]'
                        }`}
                      >
                        {isSelected && (
                          <motion.span
                            layoutId="how-it-works-service-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                            className="absolute inset-0 bg-[#2563eb]"
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </span>
                        {isSelected && <Check className="relative z-10 w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* ── STEP 2: Push your code ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="min-w-0 flex flex-col gap-7"
            >
              <div className="lg:min-h-[144px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#2563eb] text-white font-mono text-[13px] font-medium">
                  02
                </div>
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Push your code
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                    Connect your GitHub repo. Harbor detects your workflow and deploys cleanly on every commit.
                  </p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="p-4 bg-white dark:bg-[#111420] border border-gray-300 dark:border-[#2a2f42] rounded-[2px] flex flex-col gap-2.5">
                  <div className="grid grid-cols-[96px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#868da6]">Branch</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#0b0d14] border border-gray-200 dark:border-[#252938] flex items-center gap-2 font-mono text-[12px] text-gray-900 dark:text-white truncate">
                      <GitBranch className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#3b82f6] shrink-0" />
                      <span className="truncate">{selected.branch}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[96px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#868da6]">Build Cmd</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#0b0d14] border border-gray-200 dark:border-[#252938] flex items-center font-mono text-[12px] text-gray-900 dark:text-white truncate">
                      {selected.buildCmd}
                    </div>
                  </div>

                  <div className="grid grid-cols-[96px_1fr] items-center gap-2.5">
                    <span className="text-[12px] text-right text-gray-500 dark:text-[#868da6]">Start Cmd</span>
                    <div className="h-9 px-3 bg-gray-50 dark:bg-[#0b0d14] border border-gray-200 dark:border-[#252938] flex items-center font-mono text-[12px] text-gray-900 dark:text-white truncate">
                      {selected.startCmd}
                    </div>
                  </div>
                </div>

                {/* Live Animated Build Console */}
                <div className="p-4 bg-[#0b0d14] border border-gray-300 dark:border-[#2a2f42] rounded-[2px] font-mono text-[12px] leading-[1.8] min-h-[126px] flex flex-col justify-between">
                  <div className="flex flex-col">
                    {visibleLines >= 1 && (
                      <motion.div
                        key={`l1-${selected.id}-${replayKey}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[#9ca3af] truncate"
                      >
                        <span className="text-[#3b82f6]">==&gt;</span> Running &apos;{selected.buildCmd}&apos;...
                      </motion.div>
                    )}
                    {visibleLines >= 2 && (
                      <motion.div
                        key={`l2-${selected.id}-${replayKey}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-gray-200"
                      >
                        <span className="text-[#37cd8f]">✓</span> Built {selected.label.toLowerCase()} in {selected.buildTime}
                      </motion.div>
                    )}
                    {visibleLines >= 3 && (
                      <motion.div
                        key={`l3-${selected.id}-${replayKey}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-[#9ca3af]"
                      >
                        <span className="text-[#3b82f6]">==&gt;</span> Verifying health checks &amp; routing...
                      </motion.div>
                    )}
                    {visibleLines >= 4 && (
                      <motion.div
                        key={`l4-${selected.id}-${replayKey}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-white font-medium"
                      >
                        <span className="text-[#37cd8f]">==&gt;</span> Live at {selected.liveUrl}
                      </motion.div>
                    )}
                  </div>

                  <div className="pt-2 mt-2 border-t border-[#1e2233] flex items-center justify-between text-[10px] text-[#6e748b]">
                    <span className="inline-flex items-center gap-1.5">
                      <Terminal className="w-3 h-3" />
                      Auto-Deploy: On Commit
                    </span>
                    <button
                      type="button"
                      onClick={() => startBuildReplay()}
                      className="inline-flex items-center gap-1 text-[#3b82f6] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Replay
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── STEP 3: Harbor does the rest ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="min-w-0 flex flex-col gap-7"
            >
              <div className="lg:min-h-[144px] flex flex-col gap-4">
                <div className="rounded-[2px] flex w-8 h-8 items-center justify-center bg-[#2563eb] text-white font-mono text-[13px] font-medium">
                  03
                </div>
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] lg:text-[28px] font-normal text-gray-900 dark:text-white leading-tight">
                    Harbor does the rest
                  </h3>
                  <p className="text-[15px] lg:text-[16px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                    Get custom domains, real-time logs, one-click redeploys, and deployment reports in one place.
                  </p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="px-3 py-2.5 bg-white dark:bg-[#111420] border border-gray-300 dark:border-[#2a2f42] rounded-[2px] font-mono text-[12px] leading-[1.6]">
                  <div className="text-gray-400 dark:text-[#6e748b]">~/app $ git commit -am &quot;Ship v2.4&quot;</div>
                  <div className="text-[#2563eb] dark:text-[#3b82f6]">~/app $ git push origin {selected.branch}</div>
                </div>

                <div className="p-4 bg-white dark:bg-[#111420] border border-gray-300 dark:border-[#2a2f42] rounded-[2px] flex flex-col">
                  <div className="pb-3 border-b border-gray-200 dark:border-[#232738] flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-[11px] text-gray-500 dark:text-[#868da6] truncate">
                        acme / {selected.id}-service • {selected.branch}
                      </span>
                      <span className="font-mono text-[12px] text-[#2563eb] dark:text-[#3b82f6] truncate">
                        {selected.liveUrl}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRolledBack((v) => !v)}
                      className="px-2.5 py-1 border border-gray-300 dark:border-[#2f354a] hover:border-[#2563eb] dark:hover:border-[#3b82f6] font-mono text-[10px] text-gray-700 dark:text-gray-200 rounded-[2px] cursor-pointer shrink-0 transition-colors"
                    >
                      {rolledBack ? 'Reset' : 'Test Redeploy'}
                    </button>
                  </div>

                  <div className="divide-y divide-gray-200 dark:divide-[#1f2334]">
                    <AnimatePresence initial={false}>
                      {deploys.map((deploy, idx) => (
                        <motion.div
                          key={deploy.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28 }}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                idx === 0
                                  ? 'bg-[#37cd8f] text-[#0b0d14]'
                                  : 'bg-gray-200 dark:bg-[#232738] text-gray-600 dark:text-[#868da6]'
                              }`}
                            >
                              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] text-gray-900 dark:text-[#e5e7eb] truncate">
                                {deploy.title}
                              </span>
                              <span className="font-mono text-[10px] text-gray-500 dark:text-[#7f869e]">
                                {deploy.sha} • {deploy.time}
                              </span>
                            </div>
                          </div>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.5 bg-[#37cd8f]/15 text-emerald-700 dark:text-[#37cd8f] font-mono text-[10px] rounded-[2px] shrink-0">
                              LIVE
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
