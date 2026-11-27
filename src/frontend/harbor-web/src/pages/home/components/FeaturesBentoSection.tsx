import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, Pause, Play, ShieldCheck, CheckCircle2, Globe, BarChart3 } from 'lucide-react';

type EnvName = 'Development' | 'Staging' | 'Production';
type LogLevel = 'ALL' | 'BUILD' | 'DEPLOY' | 'HEALTH' | 'REDACT';
type Timeframe = '7D' | '30D' | '90D';

const ENV_SECRETS: Record<EnvName, { key: string; value: string; encrypted: boolean }[]> = {
  Production: [
    { key: 'APP_PUBLIC_URL', value: 'https://api.acme.example', encrypted: false },
    { key: 'ASPNETCORE_ENVIRONMENT', value: 'Production', encrypted: false },
    { key: 'PAYMENT_SIGNING_SECRET', value: 'whsec_demo_prod_91a8c4f2', encrypted: true },
    { key: 'DATABASE_ENCRYPTION_KEY', value: 'aes256_demo_k9m4p2x7q1v8', encrypted: true },
  ],
  Staging: [
    { key: 'APP_PUBLIC_URL', value: 'https://staging.acme.example', encrypted: false },
    { key: 'ASPNETCORE_ENVIRONMENT', value: 'Staging', encrypted: false },
    { key: 'PAYMENT_SIGNING_SECRET', value: 'whsec_demo_stg_44b2e1a9', encrypted: true },
    { key: 'DATABASE_ENCRYPTION_KEY', value: 'aes256_demo_stg_x2n8r5t3', encrypted: true },
  ],
  Development: [
    { key: 'APP_PUBLIC_URL', value: 'http://localhost:5000', encrypted: false },
    { key: 'ASPNETCORE_ENVIRONMENT', value: 'Development', encrypted: false },
    { key: 'PAYMENT_SIGNING_SECRET', value: 'whsec_demo_local_mock', encrypted: true },
    { key: 'DATABASE_ENCRYPTION_KEY', value: 'aes256_demo_local_dev', encrypted: true },
  ],
};

const LOG_STREAM_POOL = [
  { ts: '10:42:01', tag: 'BUILD', color: 'text-[#9ca3af]', msg: 'Cloning acme/checkout-api (branch: main, sha: 4f2c9ab)...' },
  { ts: '10:42:03', tag: 'BUILD', color: 'text-[#9ca3af]', msg: 'Restored cached Docker layers (saved 14.2s)' },
  { ts: '10:42:05', tag: 'DEPLOY', color: 'text-[#3b82f6]', msg: 'Build succeeded in 2.7s — rolling out to Azure ACA' },
  { ts: '10:42:06', tag: 'REDACT', color: 'text-[#a78bfa]', msg: 'Sanitized outgoing log: Authorization: Bearer [REDACTED]' },
  { ts: '10:42:07', tag: 'HEALTH', color: 'text-[#37cd8f]', msg: 'GET /health/ready responded 200 OK in 4ms (3/3 pods)' },
  { ts: '10:42:08', tag: 'DEPLOY', color: 'text-[#3b82f6]', msg: 'Kafka event emitted: DeploymentSucceeded (partition 0)' },
  { ts: '10:42:09', tag: 'HEALTH', color: 'text-[#37cd8f]', msg: 'Edge TLS 1.3 route active → https://checkout.acme.example' },
];

const METRICS_BY_RANGE: Record<
  Timeframe,
  {
    successRate: string;
    avgDeploy: string;
    totalDeploys: string;
    bars: number[];
    labels: string[];
  }
> = {
  '7D': {
    successRate: '99.8%',
    avgDeploy: '24s',
    totalDeploys: '48',
    bars: [54, 72, 66, 88, 92, 78, 96],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
  '30D': {
    successRate: '99.5%',
    avgDeploy: '28s',
    totalDeploys: '194',
    bars: [62, 68, 74, 81, 79, 91, 95],
    labels: ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'Now'],
  },
  '90D': {
    successRate: '99.2%',
    avgDeploy: '31s',
    totalDeploys: '542',
    bars: [42, 55, 64, 70, 82, 89, 97],
    labels: ['M1', 'M1.5', 'M2', 'M2.5', 'M3', 'M3.5', 'Now'],
  },
};

const DNS_STEPS = ['Attach Domain', 'DNS Record Check', 'DNS Verified', 'Primary Set'];

export default function FeaturesBentoSection() {
  const [activeEnvTab, setActiveEnvTab] = useState<EnvName>('Production');
  const [revealSecrets, setRevealSecrets] = useState(false);

  const [logFilter, setLogFilter] = useState<LogLevel>('ALL');
  const [streamPaused, setStreamPaused] = useState(false);
  const [streamTick, setStreamTick] = useState(4);

  const [dnsStep, setDnsStep] = useState(3);
  const [verifyingDns, setVerifyingDns] = useState(false);

  const [timeframe, setTimeframe] = useState<Timeframe>('7D');

  // Continuously advance live log stream
  useEffect(() => {
    if (streamPaused) return;
    const id = setInterval(() => {
      setStreamTick((t) => t + 1);
    }, 1800);
    return () => clearInterval(id);
  }, [streamPaused]);

  // Animate DNS verification pipeline when user clicks re-verify
  useEffect(() => {
    if (!verifyingDns) return;
    if (dnsStep < DNS_STEPS.length - 1) {
      const t = setTimeout(() => setDnsStep((s) => s + 1), 520);
      return () => clearTimeout(t);
    } else {
      const done = setTimeout(() => setVerifyingDns(false), 350);
      return () => clearTimeout(done);
    }
  }, [verifyingDns, dnsStep]);

  const visibleLogs = Array.from({ length: 5 }, (_, i) => {
    const idx = (streamTick + i) % LOG_STREAM_POOL.length;
    return { ...LOG_STREAM_POOL[idx], key: `${streamTick + i}` };
  }).filter((entry) => logFilter === 'ALL' || entry.tag === logFilter);

  const metrics = METRICS_BY_RANGE[timeframe];

  return (
    <section
      id="features"
      className="w-full border-b border-gray-200 dark:border-[#2e3244] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px] bg-white dark:bg-[oklch(0.21_0.03_263.45)]"
    >
      <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-widest text-[#2563eb] dark:text-[#3b82f6]">
              Everything You Need to Ship
            </span>
            <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[54px] font-normal tracking-tight leading-[1.08] text-gray-900 dark:text-white">
              Zero-friction deployments. Total visibility.
            </h2>
          </div>
          <p className="text-[16px] lg:text-[18px] text-gray-600 dark:text-[#a1a1aa] max-w-[480px] font-light">
            Stop juggling disconnected CI tabs, cloud consoles, and secret spreadsheets. Harbor brings your entire release workflow into one place.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Environments & AES-256-GCM Secrets */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#111420] p-7 lg:p-9 flex flex-col justify-between gap-7 rounded-[2px]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] dark:text-[#3b82f6] border border-[#2563eb]/30 rounded-[2px]">
                  <Lock className="w-3 h-3" />
                  AES-256-GCM Vault
                </span>
                <button
                  type="button"
                  onClick={() => setRevealSecrets((v) => !v)}
                  className="inline-flex items-center gap-1.5 font-mono text-[12px] text-gray-600 dark:text-gray-300 hover:text-[#2563eb] dark:hover:text-[#3b82f6] cursor-pointer"
                >
                  {revealSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{revealSecrets ? 'Mask secrets' : 'Reveal values'}</span>
                </button>
              </div>
              <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal text-gray-900 dark:text-white">
                Environments &amp; Encrypted Secrets
              </h3>
              <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                Isolate Development, Staging, and Production configurations per service. Encrypt API keys and database credentials at rest with one-click masking.
              </p>
            </div>

            <div className="border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px] overflow-hidden">
              <div className="flex border-b border-gray-200 dark:border-[#272b3d]">
                {(['Development', 'Staging', 'Production'] as const).map((env) => {
                  const active = activeEnvTab === env;
                  return (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setActiveEnvTab(env)}
                      className={`relative px-4 py-2.5 font-mono text-[12px] border-r border-gray-200 dark:border-[#272b3d] cursor-pointer transition-colors ${
                        active
                          ? 'text-white font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#151826]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="bento-env-tab"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                          className="absolute inset-0 bg-[#2563eb]"
                        />
                      )}
                      <span className="relative z-10">{env}</span>
                    </button>
                  );
                })}
              </div>
              <div className="divide-y divide-gray-200 dark:divide-[#1d2030] font-mono text-[12px]">
                {ENV_SECRETS[activeEnvTab].map((row) => (
                  <motion.div
                    key={`${activeEnvTab}-${row.key}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-2.5 flex items-center justify-between gap-4"
                  >
                    <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200 truncate">
                      {row.encrypted && (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#3b82f6] shrink-0" />
                      )}
                      <span className="truncate">{row.key}</span>
                    </span>
                    <span
                      className={`truncate ${
                        row.encrypted && !revealSecrets
                          ? 'text-gray-400 dark:text-[#666d85] tracking-widest'
                          : 'text-emerald-700 dark:text-[#37cd8f]'
                      }`}
                    >
                      {row.encrypted && !revealSecrets ? '••••••••••••••••••••' : row.value}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Card 2: Live SignalR Log Streaming + Secret Scrubbing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#111420] p-7 lg:p-9 flex flex-col justify-between gap-7 rounded-[2px]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-[#37cd8f] border border-emerald-500/30 rounded-[2px]">
                  SignalR WebSockets
                </span>
                <button
                  type="button"
                  onClick={() => setStreamPaused((p) => !p)}
                  className="inline-flex items-center gap-1.5 font-mono text-[12px] text-emerald-700 dark:text-[#37cd8f] cursor-pointer"
                >
                  <span className={`w-2 h-2 rounded-full bg-[#37cd8f] ${streamPaused ? '' : 'animate-pulse'}`} />
                  <span>{streamPaused ? 'Paused' : 'Live stream'}</span>
                  {streamPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                </button>
              </div>
              <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal text-gray-900 dark:text-white">
                Instant Live Build &amp; Runtime Logs
              </h3>
              <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                Stream full-duplex logs over `/hubs/logs` with built-in regex scrubbing that automatically redacts API keys, tokens, and connection strings.
              </p>
            </div>

            <div className="border border-gray-300 dark:border-[#272b3d] bg-[#0b0d14] rounded-[2px] overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1e2233] flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                {(['ALL', 'BUILD', 'DEPLOY', 'HEALTH', 'REDACT'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLogFilter(lvl)}
                    className={`px-2 py-0.5 rounded-[2px] cursor-pointer transition-colors ${
                      logFilter === lvl
                        ? 'bg-[#2563eb] text-white'
                        : 'text-[#868da6] hover:text-white bg-[#141724]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <div className="p-4 font-mono text-[11.5px] leading-[1.85] min-h-[154px] flex flex-col justify-center">
                {visibleLogs.length === 0 ? (
                  <div className="text-[#6e748b]">Waiting for matching {logFilter} events...</div>
                ) : (
                  visibleLogs.map((line) => (
                    <motion.div
                      key={line.key}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-start gap-2 truncate"
                    >
                      <span className="text-[#5d647a] shrink-0">{line.ts}</span>
                      <span className={`${line.color} shrink-0 w-[60px]`}>[{line.tag}]</span>
                      <span className="text-gray-200 truncate">{line.msg}</span>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </motion.div>

          {/* Card 3: Custom Domains & Animated DNS Pipeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#111420] p-7 lg:p-9 flex flex-col justify-between gap-7 rounded-[2px]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-indigo-500/10 text-[#6c35f5] dark:text-[#a5b4fc] border border-indigo-500/30 rounded-[2px]">
                  <Globe className="w-3 h-3" />
                  Custom Domains &amp; DNS
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!verifyingDns) {
                      setDnsStep(0);
                      setVerifyingDns(true);
                    }
                  }}
                  className="font-mono text-[11px] text-[#2563eb] dark:text-[#3b82f6] hover:underline cursor-pointer"
                >
                  {verifyingDns ? 'Verifying...' : 'Re-run DNS check'}
                </button>
              </div>
              <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal text-gray-900 dark:text-white">
                One-Click Domains &amp; DNS Verification
              </h3>
              <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                Attach custom domains to any service, verify DNS records automatically, and designate primary production endpoints with zero downtime.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Animated 4-step DNS verification bar */}
              <div className="p-3.5 border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px]">
                <div className="grid grid-cols-4 gap-2">
                  {DNS_STEPS.map((label, idx) => {
                    const done = idx <= dnsStep;
                    return (
                      <div key={label} className="flex flex-col gap-1.5">
                        <div className="h-1 bg-gray-200 dark:bg-[#1e2233] overflow-hidden rounded-[1px]">
                          <motion.div
                            className="h-full bg-[#37cd8f]"
                            initial={false}
                            animate={{ width: done ? '100%' : '0%' }}
                            transition={{ duration: 0.35 }}
                          />
                        </div>
                        <span
                          className={`font-mono text-[10px] truncate ${
                            done ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-[#5d647a]'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] divide-y divide-gray-200 dark:divide-[#1d2030] font-mono text-[12px] rounded-[2px]">
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-gray-900 dark:text-white truncate">app.harborapp.tech</span>
                    <span className="px-1.5 py-0.5 text-[10px] bg-[#2563eb]/15 text-[#2563eb] dark:text-[#3b82f6] rounded-[2px] shrink-0">
                      PRIMARY
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#37cd8f] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {dnsStep === 3 ? 'DNS Verified' : DNS_STEPS[dnsStep]}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-gray-600 dark:text-gray-400 truncate">staging.harborapp.tech</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#37cd8f] shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DNS Verified
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 4: DORA Metrics & Animated Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#111420] p-7 lg:p-9 flex flex-col justify-between gap-7 rounded-[2px]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-wider px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] dark:text-[#3b82f6] border border-[#2563eb]/30 rounded-[2px]">
                  <BarChart3 className="w-3.5 h-3.5" />
                  DORA Insights &amp; Audit
                </span>
                <div className="flex items-center border border-gray-300 dark:border-[#2a2f42] rounded-[2px] overflow-hidden font-mono text-[11px]">
                  {(['7D', '30D', '90D'] as const).map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setTimeframe(range)}
                      className={`px-2.5 py-1 cursor-pointer transition-colors ${
                        timeframe === range
                          ? 'bg-[#2563eb] text-white'
                          : 'bg-white dark:bg-[#0b0d14] text-gray-600 dark:text-[#868da6] hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              <h3 className="font-['Roobert',sans-serif] font-roobert text-[26px] font-normal text-gray-900 dark:text-white">
                Deployment Metrics &amp; Exportable Reports
              </h3>
              <p className="text-[15px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                Track deployment frequency, success rates, and recovery times across every team. Export clean CSV or PDF audit reports in one click.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Animated Deployment Frequency Bar Chart */}
              <div className="p-4 border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px]">
                <div className="flex items-end justify-between gap-2 h-[74px]">
                  {metrics.bars.map((val, idx) => (
                    <div key={metrics.labels[idx]} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5">
                      <div className="w-full flex-1 flex items-end">
                        <motion.div
                          initial={false}
                          animate={{ height: `${val}%` }}
                          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: idx * 0.03 }}
                          className={`w-full rounded-t-[1px] ${
                            idx === metrics.bars.length - 1
                              ? 'bg-[#37cd8f]'
                              : 'bg-[#2563eb]/80 dark:bg-[#3b82f6]/75'
                          }`}
                        />
                      </div>
                      <span className="font-mono text-[9.5px] text-gray-400 dark:text-[#6e748b]">
                        {metrics.labels[idx]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono tabular-nums">
                <div className="p-3 border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px]">
                  <div className="text-[10px] text-gray-500 dark:text-[#868da6]">SUCCESS RATE</div>
                  <div className="mt-1 text-[20px] text-emerald-700 dark:text-[#37cd8f]">{metrics.successRate}</div>
                </div>
                <div className="p-3 border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px]">
                  <div className="text-[10px] text-gray-500 dark:text-[#868da6]">AVG DEPLOY</div>
                  <div className="mt-1 text-[20px] text-gray-900 dark:text-white">{metrics.avgDeploy}</div>
                </div>
                <div className="p-3 border border-gray-300 dark:border-[#272b3d] bg-white dark:bg-[#0b0d14] rounded-[2px]">
                  <div className="text-[10px] text-gray-500 dark:text-[#868da6]">TOTAL DEPLOYS</div>
                  <div className="mt-1 text-[20px] text-[#2563eb] dark:text-[#3b82f6]">{metrics.totalDeploys}</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

