import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Radio, Shield, RotateCcw, ArrowRight } from 'lucide-react';
import { useResolvedTheme } from '../../../contexts/ThemeContext';

type FlowId = 'deploy' | 'logs' | 'secrets' | 'redeploy';

interface FlowConfig {
  id: FlowId;
  label: string;
  accent: string;
  accentTextDark: string;
  protocol: string;
  latency: string;
  summary: string;
  activeNodes: string[];
  activePaths: string[];
  badge: { x: number; y: number; text: string };
  icon: React.ReactNode;
}

const FLOWS: FlowConfig[] = [
  {
    id: 'deploy',
    label: 'Automated Deploy',
    accent: '#2563eb',
    accentTextDark: '#3b82f6',
    protocol: 'GitHub Dispatch + Kafka',
    latency: '~12.4s p50',
    summary:
      'Push to main routes through YARP Gateway → Projects & Deployment Engine → GitHub Actions dispatch, reconciled asynchronously over Kafka into your cloud runtime.',
    activeNodes: ['github', 'gateway', 'project', 'deploy', 'kafka', 'clouds'],
    activePaths: ['p-git-gw', 'p-gw-project', 'p-gw-deploy', 'p-deploy-kafka', 'p-kafka-cloud'],
    badge: { x: 896, y: 148, text: 'deployment-events' },
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    id: 'logs',
    label: 'Live Log Stream',
    accent: '#10b981',
    accentTextDark: '#37cd8f',
    protocol: 'SignalR WSS /hubs/logs',
    latency: '18ms stream',
    summary:
      '9 cloud & container log adapters ingest runtime output, automatically redact API keys & bearer tokens, and stream clean logs to your browser over WebSockets.',
    activeNodes: ['clouds', 'reporting', 'gateway', 'browser'],
    activePaths: ['p-cloud-report', 'p-report-gw', 'p-gw-browser'],
    badge: { x: 896, y: 410, text: 'WSS • Scrubbed' },
    icon: <Radio className="w-4 h-4" />,
  },
  {
    id: 'secrets',
    label: 'AES-256 Secrets',
    accent: '#6c35f5',
    accentTextDark: '#8b5cf6',
    protocol: 'AES-256-GCM + RBAC',
    latency: '< 3ms decrypt',
    summary:
      'Environment variables and API credentials are encrypted at rest per stage (Dev / Staging / Prod) and validated via JWT + Redis token revocation.',
    activeNodes: ['browser', 'gateway', 'auth', 'project', 'env', 'clouds'],
    activePaths: ['p-browser-gw', 'p-gw-auth', 'p-gw-project', 'p-gw-env', 'p-env-cloud'],
    badge: { x: 896, y: 122, text: 'AES-256-GCM' },
    icon: <Shield className="w-4 h-4" />,
  },
  {
    id: 'redeploy',
    label: 'One-Click Redeploy',
    accent: '#2563eb',
    accentTextDark: '#3b82f6',
    protocol: 'POST /deployments/{id}/redeploy',
    latency: 'Versioned Release',
    summary:
      'Every deployment record and commit SHA is preserved. Re-trigger a known-good release in one click via GitHub Actions and log the full audit trail in Reporting.',
    activeNodes: ['browser', 'gateway', 'deploy', 'kafka', 'reporting', 'clouds'],
    activePaths: ['p-browser-gw', 'p-gw-deploy', 'p-deploy-kafka', 'p-kafka-cloud', 'p-deploy-report'],
    badge: { x: 896, y: 294, text: 'Redeploy Dispatch' },
    icon: <RotateCcw className="w-4 h-4" />,
  },
];

interface DiagramNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  subtitle: string;
  extraLine?: string;
  statusLine?: string;
  tag: string;
}

const NODES: DiagramNode[] = [
  { id: 'github', x: 24, y: 92, w: 192, h: 84, title: 'GitHub & Actions', subtitle: 'Push • Webhooks • CI', tag: 'SOURCE' },
  { id: 'browser', x: 24, y: 312, w: 192, h: 84, title: 'Developer Console', subtitle: 'React UI • SignalR', tag: 'CLIENT' },
  { id: 'gateway', x: 284, y: 198, w: 202, h: 94, title: 'YARP API Gateway', subtitle: 'Routing • CORS • WSS', tag: 'INGRESS' },
  { id: 'auth', x: 560, y: 48, w: 204, h: 68, title: 'Auth + Redis', subtitle: 'JWT • RBAC • Blacklist', tag: 'IDENTITY' },
  { id: 'project', x: 560, y: 128, w: 204, h: 68, title: 'Projects & Git', subtitle: 'Services • Domains', tag: 'CATALOG' },
  { id: 'env', x: 560, y: 208, w: 204, h: 68, title: 'Environment Vault', subtitle: 'AES-256-GCM Secrets', tag: 'CONFIG' },
  { id: 'deploy', x: 560, y: 288, w: 204, h: 68, title: 'Deployment Engine', subtitle: 'Dispatch • Redeploy', tag: 'CORE' },
  { id: 'reporting', x: 560, y: 368, w: 204, h: 68, title: 'Reporting & Logs', subtitle: 'Reports • Log Scrubber', tag: 'OBSERVE' },
  { id: 'kafka', x: 822, y: 184, w: 148, h: 78, title: 'Apache Kafka', subtitle: 'Event Stream', tag: 'BROKER' },
  {
    id: 'clouds',
    x: 1004,
    y: 174,
    w: 164,
    h: 126,
    title: 'Cloud Runtimes',
    subtitle: 'AWS • Azure • GCP',
    extraLine: 'K8s • Docker • Vercel',
    statusLine: '9 log adapters active',
    tag: 'TARGETS',
  },
];

interface DiagramPath {
  id: string;
  d: string;
}

const PATHS: DiagramPath[] = [
  // GitHub -> Gateway
  { id: 'p-git-gw', d: 'M 216 134 C 250 134, 250 226, 284 226' },
  // Browser -> Gateway
  { id: 'p-browser-gw', d: 'M 216 354 C 250 354, 250 264, 284 264' },
  // Gateway -> Browser (reverse for live logs)
  { id: 'p-gw-browser', d: 'M 284 264 C 250 264, 250 354, 216 354' },
  // Gateway -> Auth
  { id: 'p-gw-auth', d: 'M 486 212 C 524 212, 524 82, 560 82' },
  // Gateway -> Project
  { id: 'p-gw-project', d: 'M 486 228 C 524 228, 524 162, 560 162' },
  // Gateway -> Env
  { id: 'p-gw-env', d: 'M 486 244 C 524 244, 524 242, 560 242' },
  // Gateway -> Deploy
  { id: 'p-gw-deploy', d: 'M 486 260 C 524 260, 524 322, 560 322' },
  // Reporting -> Gateway (reverse for live logs)
  { id: 'p-report-gw', d: 'M 560 402 C 524 402, 524 276, 486 276' },
  // Deploy -> Kafka
  { id: 'p-deploy-kafka', d: 'M 764 312 C 794 312, 794 223, 822 223' },
  // Kafka -> Clouds
  { id: 'p-kafka-cloud', d: 'M 970 223 C 986 223, 986 223, 1004 223' },
  // Env -> Clouds
  { id: 'p-env-cloud', d: 'M 764 230 C 858 134, 932 134, 1004 198' },
  // Deploy -> Reporting (audit)
  { id: 'p-deploy-report', d: 'M 662 356 L 662 368' },
  // Clouds -> Reporting (log adapters)
  { id: 'p-cloud-report', d: 'M 1004 278 C 930 402, 848 402, 764 402' },
];

export default function ArchitectureDiagram() {
  const [activeFlowId, setActiveFlowId] = useState<FlowId>('deploy');
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const activeFlow = FLOWS.find((f) => f.id === activeFlowId) ?? FLOWS[0];
  const displayAccent = isDark ? activeFlow.accentTextDark : activeFlow.accent;

  const baseStroke = isDark ? '#32384f' : '#cbd5e1';
  const nodeBg = isDark ? '#111524' : '#ffffff';
  const nodeHeaderBg = isDark ? '#161b2e' : '#f8fafc';
  const nodeInactiveBorder = isDark ? '#2a3045' : '#e2e8f0';
  const titleColor = isDark ? '#ffffff' : '#0f172a';
  const subColor = isDark ? '#9aa3bc' : '#475569';
  const zoneColor = isDark ? '#7b85a1' : '#64748b';

  return (
    <section
      id="architecture"
      className="w-full border-b border-gray-200 dark:border-[#2e3244] bg-white dark:bg-[oklch(0.21_0.03_263.45)] py-20 lg:py-28 px-5 md:px-10 lg:px-[78px]"
    >
      <div className="mx-auto w-full max-w-[1440px] flex flex-col gap-10">
        {/* Header + Interactive Flow Selector */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-[680px]">
            <span className="font-mono text-[13px] uppercase tracking-widest text-[#2563eb] dark:text-[#3b82f6] font-medium">
              Interactive Architecture
            </span>
            <h2 className="mt-2 font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[52px] font-normal tracking-tight leading-[1.08] text-gray-900 dark:text-white">
              One control plane. Every release orchestrated.
            </h2>
            <p className="mt-3 text-[17px] lg:text-[19px] text-gray-600 dark:text-[#a1a1aa] font-light leading-[1.6]">
              Explore how Harbor routes Git triggers, encrypted secrets, Kafka lifecycle events, and live SignalR logs across 5 isolated microservices.
            </p>
          </div>

          {/* Interactive Scenario Pills */}
          <div
            className="flex flex-wrap gap-2 p-1.5 border border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#111420] rounded-[2px]"
            role="tablist"
            aria-label="Architecture data flow scenarios"
          >
            {FLOWS.map((flow) => {
              const selected = flow.id === activeFlowId;
              return (
                <button
                  key={flow.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFlowId(flow.id)}
                  className={`relative px-4 py-2.5 font-mono text-[12.5px] flex items-center gap-2 rounded-[2px] cursor-pointer transition-colors ${
                    selected
                      ? 'text-white font-medium'
                      : 'text-gray-600 dark:text-[#b4bacd] hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="arch-active-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-[2px]"
                      style={{ backgroundColor: flow.accent }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {flow.icon}
                    <span>{flow.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Diagram Frame */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="border border-gray-300 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0c0e16] rounded-[2px] overflow-hidden"
        >
          {/* Diagram Top Bar */}
          <div className="px-5 py-3.5 border-b border-gray-200 dark:border-[#232738] bg-white dark:bg-[#111420] flex flex-wrap items-center justify-between gap-4 font-mono text-[12px]">
            <div className="flex items-center gap-3">
              <span
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{ backgroundColor: displayAccent }}
              />
              <span className="text-gray-900 dark:text-white uppercase tracking-wider font-medium">
                ACTIVE ROUTE: {activeFlow.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-gray-500 dark:text-[#9aa3bc]">
              <span>
                PROTOCOL: <strong className="text-gray-900 dark:text-white font-medium">{activeFlow.protocol}</strong>
              </span>
              <span>
                MODE: <strong style={{ color: displayAccent }} className="font-medium">{activeFlow.latency}</strong>
              </span>
            </div>
          </div>

          {/* Responsive Architectural SVG Canvas */}
          <div className="w-full overflow-x-auto harbor-grid-bg p-4 sm:p-6 lg:p-8">
            <svg
              viewBox="0 0 1190 468"
              className="w-full min-w-[820px] h-auto block"
              role="img"
              aria-label={`Harbor microservices architecture diagram showing ${activeFlow.label}`}
            >
              <defs>
                <marker
                  id="arrow-active"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6.5"
                  markerHeight="6.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill={displayAccent} />
                </marker>
              </defs>

              {/* Zone Labels — clean spacing above boxes */}
              <text x="24" y="22" fill={zoneColor} fontSize="11" fontFamily="Geist Mono, monospace" letterSpacing="1.6">
                01 / ENTRY &amp; CLIENTS
              </text>
              <text x="284" y="22" fill={zoneColor} fontSize="11" fontFamily="Geist Mono, monospace" letterSpacing="1.6">
                02 / UNIFIED INGRESS
              </text>
              <text x="544" y="22" fill={zoneColor} fontSize="11" fontFamily="Geist Mono, monospace" letterSpacing="1.6">
                03 / 5 ISOLATED MICROSERVICES
              </text>
              <text x="822" y="22" fill={zoneColor} fontSize="11" fontFamily="Geist Mono, monospace" letterSpacing="1.6">
                04 / EVENT BUS &amp; CLOUDS
              </text>

              {/* Microservices boundary box — cleanly below zone label */}
              <rect
                x="544"
                y="36"
                width="236"
                height="414"
                rx="2"
                fill={isDark ? 'rgba(17, 21, 36, 0.35)' : 'rgba(255, 255, 255, 0.45)'}
                stroke={isDark ? '#2a3047' : '#cbd5e1'}
                strokeDasharray="5 5"
                strokeWidth="1.25"
              />

              {/* Connection Paths */}
              {PATHS.map((p) => {
                const isActive = activeFlow.activePaths.includes(p.id);
                return (
                  <g key={p.id}>
                    <path
                      d={p.d}
                      fill="none"
                      stroke={isActive ? displayAccent : baseStroke}
                      strokeOpacity={isActive ? 0.32 : 0.7}
                      strokeWidth={isActive ? 2.5 : 1.25}
                    />
                    {isActive && (
                      <>
                        <path
                          d={p.d}
                          fill="none"
                          stroke={displayAccent}
                          strokeWidth="2.25"
                          strokeDasharray="7 6"
                          className="animate-harbor-dash"
                          markerEnd="url(#arrow-active)"
                        />
                        <circle r="4.5" fill={displayAccent}>
                          <animateMotion dur="2s" repeatCount="indefinite" path={p.d} />
                        </circle>
                        <circle r="3.5" fill={displayAccent} opacity="0.55">
                          <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path={p.d} />
                        </circle>
                      </>
                    )}
                  </g>
                );
              })}

              {/* Active Protocol Pill Callout */}
              <g>
                <rect
                  x={activeFlow.badge.x - 68}
                  y={activeFlow.badge.y - 12}
                  width="136"
                  height="24"
                  rx="2"
                  fill={isDark ? '#0c0e16' : '#ffffff'}
                  stroke={displayAccent}
                  strokeWidth="1.25"
                />
                <text
                  x={activeFlow.badge.x}
                  y={activeFlow.badge.y + 4}
                  textAnchor="middle"
                  fill={displayAccent}
                  fontSize="10.5"
                  fontWeight="500"
                  fontFamily="Geist Mono, monospace"
                >
                  {activeFlow.badge.text}
                </text>
              </g>

              {/* Architectural Nodes */}
              {NODES.map((node) => {
                const isActive = activeFlow.activeNodes.includes(node.id);
                return (
                  <g key={node.id} style={{ transition: 'opacity 250ms ease' }} opacity={isActive ? 1 : 0.72}>
                    {/* Outer Card */}
                    <rect
                      x={node.x}
                      y={node.y}
                      width={node.w}
                      height={node.h}
                      rx="2"
                      fill={nodeBg}
                      stroke={isActive ? displayAccent : nodeInactiveBorder}
                      strokeWidth={isActive ? 2 : 1.25}
                    />
                    {/* Top Header Band */}
                    <rect
                      x={node.x + 1}
                      y={node.y + 1}
                      width={node.w - 2}
                      height="22"
                      fill={nodeHeaderBg}
                    />
                    <line
                      x1={node.x}
                      y1={node.y + 23}
                      x2={node.x + node.w}
                      y2={node.y + 23}
                      stroke={isActive ? displayAccent : nodeInactiveBorder}
                      strokeOpacity={isActive ? 0.35 : 0.8}
                      strokeWidth="1"
                    />
                    {/* Active Left Accent Bar */}
                    {isActive && (
                      <rect
                        x={node.x}
                        y={node.y}
                        width="4"
                        height={node.h}
                        fill={displayAccent}
                      />
                    )}
                    {/* Tag */}
                    <text
                      x={node.x + 14}
                      y={node.y + 15.5}
                      fill={isActive ? displayAccent : subColor}
                      fontSize="9.5"
                      fontWeight="500"
                      fontFamily="Geist Mono, monospace"
                      letterSpacing="1.2"
                    >
                      {node.tag}
                    </text>
                    {/* Live Status Dot + Subtle Ring */}
                    {isActive && (
                      <circle
                        cx={node.x + node.w - 14}
                        cy={node.y + 12}
                        r="5.5"
                        fill={displayAccent}
                        opacity="0.2"
                      />
                    )}
                    <circle
                      cx={node.x + node.w - 14}
                      cy={node.y + 12}
                      r="3"
                      fill={isActive ? displayAccent : nodeInactiveBorder}
                    />
                    {/* Title */}
                    <text
                      x={node.x + 14}
                      y={node.y + 43}
                      fill={titleColor}
                      fontSize="14"
                      fontWeight="500"
                      fontFamily="Roobert, PP Neue Montreal, sans-serif"
                    >
                      {node.title}
                    </text>
                    {/* Subtitle */}
                    <text
                      x={node.x + 14}
                      y={node.y + 60}
                      fill={subColor}
                      fontSize="11"
                      fontFamily="Geist Mono, monospace"
                    >
                      {node.subtitle}
                    </text>
                    {/* Optional extra lines for Cloud Runtimes */}
                    {node.extraLine && (
                      <text
                        x={node.x + 14}
                        y={node.y + 79}
                        fill={subColor}
                        fontSize="11"
                        fontFamily="Geist Mono, monospace"
                      >
                        {node.extraLine}
                      </text>
                    )}
                    {node.statusLine && (
                      <g>
                        <circle
                          cx={node.x + 18}
                          cy={node.y + 104}
                          r="3"
                          fill={isActive ? '#37cd8f' : subColor}
                        />
                        <text
                          x={node.x + 27}
                          y={node.y + 108}
                          fill={isActive ? '#37cd8f' : subColor}
                          fontSize="10.5"
                          fontFamily="Geist Mono, monospace"
                        >
                          {node.statusLine}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Flow Telemetry Inspector */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-[#232738] bg-white dark:bg-[#111420] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeFlow.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="text-[15px] text-gray-700 dark:text-[#d1d5e3] font-light leading-relaxed max-w-[840px]"
              >
                {activeFlow.summary}
              </motion.p>
            </AnimatePresence>

            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 font-mono text-[13px] text-[#2563eb] dark:text-[#3b82f6] hover:underline shrink-0 font-medium"
            >
              <span>Walk through the workflow</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
