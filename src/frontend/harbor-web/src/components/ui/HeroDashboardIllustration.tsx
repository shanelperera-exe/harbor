import { useEffect, useState, useRef } from 'react';

// ─── Sparkline chart component ────────────────────────────────────────────────
function Sparkline({ color = '#8a05ff', delay = 0 }: { color?: string; delay?: number }) {
  const [offset, setOffset] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset(prev => (prev + 0.5) % 100);
    }, 50);
    const timer = setTimeout(() => {}, delay);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [delay]);

  const generatePath = () => {
    const points = [];
    for (let i = 0; i <= 100; i += 5) {
      const y = 15 + Math.sin((i + offset) * 0.08) * 8 + Math.cos((i + offset * 1.5) * 0.05) * 4;
      points.push(`${i},${y}`);
    }
    return `M ${points.join(' L ')}`;
  };

  return (
    <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
      <path
        ref={pathRef}
        d={generatePath()}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({
  icon,
  name,
  status,
  metrics,
  delay = 0,
}: {
  icon: React.ReactNode;
  name: string;
  status?: string;
  metrics: { label: string; color?: string }[];
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`border border-[#272727] bg-[#0d0d0d] transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#272727]">
        <div className="flex items-center gap-2">
          <span className="text-[#858585]">{icon}</span>
          <span className="text-[11px] text-white font-medium tracking-wide">{name}</span>
        </div>
        {status && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00c89b]" />
            <span className="text-[9px] text-[#00c89b] tracking-wider">{status}</span>
          </div>
        )}
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`px-2.5 py-2 ${i % 2 !== 0 ? 'border-l border-[#272727]' : ''} ${
              i < metrics.length - 2 ? 'border-b border-[#272727]' : ''
            }`}
          >
            <div className="text-[8px] text-[#858585] uppercase tracking-widest mb-1">{m.label}</div>
            <div className="h-5">
              <Sparkline color={m.color || '#8a05ff'} delay={i * 200 + delay} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Grid cell helper ─────────────────────────────────────────────────────────
function GridCell({
  className = '',
  borderB,
  borderL,
  borderR,
}: {
  className?: string;
  borderB?: boolean;
  borderL?: boolean;
  borderR?: boolean;
}) {
  const borders = [
    borderB ? 'border-b' : '',
    borderL ? 'border-l' : '',
    borderR ? 'border-r' : '',
  ].join(' ');

  return (
    <div
      className={`size-[var(--col)] border-[#272727] ${borders} ${className}`}
      aria-hidden="true"
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HeroDashboardIllustration() {
  return (
    <div
      className="relative max-lg:hidden"
      style={{ '--col': '71px' } as React.CSSProperties}
    >
      {/* Row 1: 3 cells */}
      <div className="flex justify-end">
        <GridCell borderB />
        <GridCell borderB borderL />
        <GridCell borderB borderL />
      </div>

      {/* Row 2: 4 cells */}
      <div className="flex justify-end">
        <GridCell borderB />
        <GridCell borderB borderL />
        <GridCell borderB borderL />
        <GridCell borderB borderL />
      </div>

      {/* Row 3: 4 cells (no bottom border) */}
      <div className="flex justify-end">
        <GridCell borderL />
        <GridCell borderL />
        <GridCell borderL />
        <GridCell borderL />
      </div>

      {/* Terminal box */}
      <div
        className="ml-[var(--col)] border border-r-0 border-[#272727]"
        style={{ aspectRatio: '45/32' }}
      >
        <div className="px-4 py-3 font-mono text-[13px] text-[#00c89b]">
          <span className="text-[#858585]">$</span> git push
        </div>
      </div>

      {/* Bottom grid row + decoration */}
      <div className="relative">
        <div className="absolute bottom-full left-0 flex">
          <GridCell borderB />
          <GridCell borderB borderL />
        </div>
        <div className="flex">
          <GridCell borderB borderL />
          <GridCell borderB borderL />
          <GridCell borderB borderL />
          <GridCell borderB borderL />
          <GridCell borderB borderL />
          <GridCell borderB borderL />
        </div>
      </div>

      {/* Dashboard illustration overlay */}
      <div
        className="absolute right-0 w-full"
        style={{
          top: 'var(--col)',
          aspectRatio: '630/591',
        }}
      >
        <div className="relative w-full h-full">
          {/* Production label */}
          <div
            className="absolute text-[11px] text-[#858585] uppercase tracking-[0.2em] font-medium"
            style={{ top: '15%', left: '14%' }}
          >
            Production
          </div>

          {/* Dashboard cards */}
          <div
            className="absolute grid grid-cols-2 gap-3"
            style={{ top: '22%', left: '14%', right: '2%' }}
          >
            <ServiceCard
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1" />
                  <line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="0.8" />
                  <path d="M1 6 Q3 4 6 4 Q9 4 11 6" stroke="currentColor" strokeWidth="0.8" fill="none" />
                  <path d="M1 6 Q3 8 6 8 Q9 8 11 6" stroke="currentColor" strokeWidth="0.8" fill="none" />
                </svg>
              }
              name="app-backend"
              status="Available"
              metrics={[
                { label: 'Memory', color: '#8a05ff' },
                { label: 'CPU', color: '#8a05ff' },
                { label: 'Instances' },
                { label: 'Requests' },
              ]}
              delay={200}
            />
            <ServiceCard
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="3" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1" />
                  <line x1="3" y1="1" x2="9" y2="1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
              }
              name="app-backend"
              metrics={[
                { label: 'Memory', color: '#8a05ff' },
                { label: 'CPU', color: '#8a05ff' },
                { label: 'Instances' },
                { label: 'Requests' },
              ]}
              delay={500}
            />
            <ServiceCard
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <ellipse cx="6" cy="3" rx="5" ry="2" stroke="currentColor" strokeWidth="1" />
                  <path d="M1 3 v6 c0 1.1 2.2 2 5 2 s5-.9 5-2 V3" stroke="currentColor" strokeWidth="1" fill="none" />
                  <path d="M1 6 c0 1.1 2.2 2 5 2 s5-.9 5-2" stroke="currentColor" strokeWidth="0.8" fill="none" />
                </svg>
              }
              name="app-database"
              status="Available"
              metrics={[
                { label: 'Memory', color: '#8a05ff' },
                { label: 'CPU', color: '#8a05ff' },
                { label: 'Storage' },
                { label: 'Connections' },
              ]}
              delay={800}
            />
            <ServiceCard
              icon={
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                  <line x1="1" y1="4" x2="11" y2="4" stroke="currentColor" strokeWidth="0.8" />
                </svg>
              }
              name="app-frontend"
              metrics={[
                { label: 'Bandwidth', color: '#8a05ff' },
              ]}
              delay={1100}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
