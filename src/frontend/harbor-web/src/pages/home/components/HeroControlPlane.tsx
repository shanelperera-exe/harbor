import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Cpu, Activity, CheckCircle2, Play, RotateCcw, ShieldCheck, Globe } from 'lucide-react';

interface DeployStage {
  id: string;
  label: string;
  sub: string;
  log: string;
  time: string;
}

const STAGES: DeployStage[] = [
  {
    id: 'git',
    label: 'Git Push',
    sub: 'main @ 4f2c9ab',
    log: '[00:01] Webhook verified (HMAC-SHA256) • acme/harbor-core@main',
    time: '0.4s',
  },
  {
    id: 'build',
    label: 'CI Build',
    sub: 'Docker Layer Cache',
    log: '[00:09] Container image built & pushed • sha256:9a4f...e81c',
    time: '8.2s',
  },
  {
    id: 'kafka',
    label: 'Kafka Event',
    sub: 'deployment-events',
    log: '[00:11] Published DeploymentReady → reconciling 3 replicas',
    time: '1.1s',
  },
  {
    id: 'live',
    label: 'Live Edge',
    sub: '200 OK • TLS 1.3',
    log: '[00:14] Zero-downtime cutover complete → https://api.acme.dev',
    time: '2.9s',
  },
];

const SERVICES = [
  {
    name: 'api-gateway',
    region: 'us-east-1',
    latency: '14ms',
    rps: '2.4k/s',
    color: '#2563eb',
    points: [18, 16, 20, 14, 15, 11, 13, 10, 12, 9, 11, 8],
  },
  {
    name: 'checkout-api',
    region: 'eu-west-1',
    latency: '22ms',
    rps: '1.1k/s',
    color: '#3b82f6',
    points: [20, 18, 15, 17, 13, 14, 12, 10, 11, 9, 10, 8],
  },
  {
    name: 'event-worker',
    region: 'ap-south-1',
    latency: '9ms',
    rps: '4.8k/s',
    color: '#37cd8f',
    points: [16, 14, 17, 15, 12, 13, 10, 12, 9, 11, 8, 9],
  },
];

function MiniSparkline({ points, color, phase }: { points: number[]; color: string; phase: number }) {
  const shifted = points.map((p, idx) => {
    const wave = Math.sin((idx + phase) * 0.85) * 2.5;
    return Math.max(4, Math.min(26, p + wave));
  });
  const stepX = 100 / (shifted.length - 1);
  const d = shifted
    .map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  const area = `${d} L 100 28 L 0 28 Z`;

  return (
    <svg viewBox="0 0 100 28" className="w-full h-7 overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} fillOpacity="0.1" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HeroControlPlane() {
  const [activeStage, setActiveStage] = useState(3);
  const [deployCount, setDeployCount] = useState(142);
  const [isRunning, setIsRunning] = useState(false);
  const [sparkPhase, setSparkPhase] = useState(0);

  // Subtle live telemetry wave
  useEffect(() => {
    const id = setInterval(() => {
      setSparkPhase((p) => (p + 1) % 360);
    }, 650);
    return () => clearInterval(id);
  }, []);

  const triggerDeploy = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setActiveStage(0);
  }, [isRunning]);

  // Step through stages during an active deploy simulation
  useEffect(() => {
    if (!isRunning) return;
    if (activeStage < STAGES.length - 1) {
      const timer = setTimeout(() => {
        setActiveStage((s) => s + 1);
      }, 950);
      return () => clearTimeout(timer);
    } else {
      const doneTimer = setTimeout(() => {
        setIsRunning(false);
        setDeployCount((c) => c + 1);
      }, 700);
      return () => clearTimeout(doneTimer);
    }
  }, [isRunning, activeStage]);

  // Trigger one smooth automatic walkthrough shortly after initial load
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      triggerDeploy();
    }, 1100);
    return () => clearTimeout(initialTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = ((activeStage + 1) / STAGES.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[660px] border border-gray-300 dark:border-[#2e3244] bg-white dark:bg-[#0d0f18] rounded-[2px] overflow-hidden select-none"
    >
      {/* Top Window Chrome */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-[#252938] bg-[#fafafa] dark:bg-[#111420] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-[#2e3244]" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-[#2e3244]" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-[#2e3244]" />
          </div>
          <span className="font-mono text-[11px] text-gray-500 dark:text-[#8f95ab] truncate">
            harbor / acme-platform / <span className="text-gray-900 dark:text-white">production</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-700 dark:text-[#37cd8f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#37cd8f] animate-pulse" />
            v2.4.{deployCount}
          </span>
          <button
            type="button"
            onClick={triggerDeploy}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-60 text-white font-mono text-[11px] rounded-[2px] transition-colors cursor-pointer"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin" />
                <span>Deploying</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Simulate Deploy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Animated Release Pipeline Strip */}
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#252938] relative overflow-hidden">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-gray-600 dark:text-[#9ca3af]">
            <GitBranch className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#3b82f6]" />
            <span>RELEASE PIPELINE</span>
          </div>
          <span className="font-mono text-[11px] text-[#2563eb] dark:text-[#3b82f6] tabular-nums">
            {isRunning ? `Stage ${activeStage + 1}/${STAGES.length}` : 'All checks passed • 12.6s'}
          </span>
        </div>

        {/* SVG Pipeline Nodes + Flowing Connectors */}
        <div className="relative">
          {/* Desktop horizontal connector line behind cards */}
          <div className="hidden sm:block absolute top-[22px] left-[12%] right-[12%] h-[2px] bg-gray-200 dark:bg-[#232738] z-0">
            <motion.div
              className="h-full bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#37cd8f]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
            {STAGES.map((stage, idx) => {
              const isCompleted = idx < activeStage || (!isRunning && idx === STAGES.length - 1);
              const isCurrent = idx === activeStage && isRunning;
              return (
                <motion.button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    if (!isRunning) setActiveStage(idx);
                  }}
                  animate={{
                    borderColor: isCurrent
                      ? '#2563eb'
                      : isCompleted
                        ? 'rgba(55, 205, 143, 0.45)'
                        : undefined,
                  }}
                  className={`p-2.5 text-left border rounded-[2px] transition-colors cursor-pointer bg-white dark:bg-[#111420] ${
                    isCurrent
                      ? 'border-[#2563eb] bg-[#2563eb]/5 dark:bg-[#2563eb]/10'
                      : isCompleted
                        ? 'border-emerald-500/40'
                        : 'border-gray-200 dark:border-[#262a3a]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`w-5 h-5 rounded-[2px] flex items-center justify-center font-mono text-[10px] font-medium ${
                        isCurrent
                          ? 'bg-[#2563eb] text-white'
                          : isCompleted
                            ? 'bg-[#37cd8f]/15 text-emerald-700 dark:text-[#37cd8f]'
                            : 'bg-gray-100 dark:bg-[#1b1f2e] text-gray-500 dark:text-[#6b7280]'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                    </span>
                    <span className="font-mono text-[10px] text-gray-400 dark:text-[#6e748b] tabular-nums">
                      {stage.time}
                    </span>
                  </div>
                  <div className="text-[12px] font-medium text-gray-900 dark:text-white leading-tight">
                    {stage.label}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 dark:text-[#7f869e] truncate mt-0.5">
                    {stage.sub}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Service Mesh Telemetry Cards */}
      <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#252938] bg-[#fafafa]/60 dark:bg-[#0b0d14]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 font-mono text-[11px] text-gray-600 dark:text-[#9ca3af]">
            <Activity className="w-3.5 h-3.5 text-[#37cd8f]" />
            <span>LIVE CLUSTER TOPOLOGY</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-gray-500 dark:text-[#7f869e]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#2563eb] dark:text-[#3b82f6]" />
              AES-256-GCM
            </span>
            <span className="inline-flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#37cd8f]" />
              3 regions
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SERVICES.map((svc, idx) => (
            <div
              key={svc.name}
              className="p-3 border border-gray-200 dark:border-[#252938] bg-white dark:bg-[#111420] rounded-[2px] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] font-medium text-gray-900 dark:text-white truncate">
                  {svc.name}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#37cd8f] shrink-0" />
              </div>

              <MiniSparkline points={svc.points} color={svc.color} phase={sparkPhase + idx * 2} />

              <div className="flex items-center justify-between font-mono text-[10px] text-gray-500 dark:text-[#868da6] pt-1 border-t border-gray-100 dark:border-[#1c2030] tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5" />
                  {svc.latency}
                </span>
                <span>{svc.rps}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live Stream Output Strip */}
      <div className="px-4 py-3 bg-[#0b0d14] text-gray-200 font-mono text-[11px] leading-[1.7] min-h-[76px] flex flex-col justify-center">
        <AnimatePresence mode="popLayout">
          {STAGES.slice(0, activeStage + 1)
            .slice(-2)
            .map((stage) => (
              <motion.div
                key={`${deployCount}-${stage.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2 truncate"
              >
                <span
                  className={
                    stage.id === 'live'
                      ? 'text-[#37cd8f] shrink-0'
                      : 'text-[#3b82f6] shrink-0'
                  }
                >
                  ▸
                </span>
                <span
                  className={
                    stage.id === 'live' ? 'text-white truncate' : 'text-[#9ca3af] truncate'
                  }
                >
                  {stage.log}
                </span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

