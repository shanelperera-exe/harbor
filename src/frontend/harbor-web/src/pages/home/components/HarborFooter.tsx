import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, Mail, Globe } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { ArrowRightIcon } from '../../../components/ui/icons';

interface HarborFooterProps {
  isLoggedIn: boolean;
}

const SHIELD_OUTER_PATH =
  'M 9.199219 575.097656 C 47.351562 453.019531 627.382812 26.898438 755.683594 32.730469 C 883.988281 38.5625 1484.675781 493.453125 1490.507812 575.097656 C 1496.339844 656.746094 1257.230469 1379.90625 1204.742188 1426.558594 C 1152.253906 1473.214844 376.609375 1467.382812 306.625 1426.558594 C 236.644531 1385.738281 -19.960938 668.410156 9.199219 575.097656 Z';

const SHIELD_ANCHOR_PATH =
  'M 731.414062 1334.394531 C 711.128906 1298.042969 666.742188 1284.648438 626.566406 1273.160156 C 524.398438 1243.648438 415.351562 1198.929688 364.460938 1105.191406 C 328.109375 1038.992188 328.109375 958.664062 335.371094 883.253906 C 330.671875 882.277344 325.921875 881.671875 321.125 881.441406 C 316.328125 881.210938 311.542969 881.351562 306.769531 881.871094 C 301.992188 882.390625 297.289062 883.28125 292.65625 884.539062 C 288.019531 885.796875 283.511719 887.40625 279.128906 889.375 C 280.273438 881.675781 281.425781 874.066406 282.195312 866.417969 C 304.335938 833.101562 328.300781 801.152344 354.082031 770.566406 C 379.867188 739.984375 407.304688 710.964844 436.398438 683.511719 C 434.53125 703.546875 433.820312 723.621094 434.261719 743.738281 C 434.699219 763.855469 436.289062 783.882812 439.027344 803.816406 C 441.761719 823.75 445.632812 843.464844 450.632812 862.953125 C 455.632812 882.445312 461.730469 901.585938 468.925781 920.375 C 446.34375 923.042969 424.15625 886.703125 407.332031 902.410156 C 402.316406 907.335938 401.570312 915.035156 401.1875 921.902344 C 400.429688 980.824219 426.851562 1039.75 471.59375 1078.015625 C 516.339844 1116.28125 578.355469 1133.5 636.523438 1123.554688 C 655.65625 1120.488281 675.546875 1113.609375 686.261719 1097.53125 C 696.203125 1082.992188 696.589844 1064.632812 696.589844 1047.027344 C 696.589844 917.691406 696.203125 787.976562 696.203125 658.644531 C 696.203125 644.105469 696.203125 629.566406 690.855469 616.167969 C 680.910156 592.058594 656.027344 577.558594 630.722656 571.398438 C 605.46875 564.894531 579.394531 564.894531 553.820312 560.300781 C 543.109375 558.386719 531.238281 554.179688 527.414062 544.234375 C 523.207031 533.132812 531.621094 520.894531 541.953125 516.300781 C 552.667969 511.707031 564.523438 512.449219 576.007812 513.617188 C 590.125 514.773438 604.714844 515.914062 618.867188 517.070312 C 642.207031 518.980469 667.847656 520.121094 685.066406 504.828125 C 706.878906 485.695312 703.429688 449.714844 689.277344 424.460938 C 675.121094 399.207031 652.539062 379.320312 638.808594 354.066406 C 607.433594 298.195312 626.949219 219.753906 680.523438 184.902344 C 734.097656 150.050781 813.679688 163.882812 851.945312 214.773438 C 890.59375 266.101562 882.175781 346.019531 833.980469 388.121094 C 804.902344 413.785156 807.199219 458.902344 811.792969 497.191406 C 812.5625 504.890625 816.003906 514.414062 823.34375 514.414062 C 863.121094 514.027344 902.902344 514.027344 942.679688 514.027344 C 952.636719 513.644531 964.492188 514.414062 971 522.058594 C 980.1875 532.402344 974.4375 549.609375 962.964844 557.269531 C 951.867188 564.96875 937.304688 565.304688 923.933594 566.074219 C 884.527344 567.601562 837.84375 573.773438 819.851562 608.546875 C 811.433594 624.613281 811.433594 642.976562 811.050781 660.582031 C 810.253906 790.277344 809.472656 920.007812 808.703125 1049.773438 C 808.703125 1065.835938 809.085938 1083.058594 817.890625 1096.839844 C 828.21875 1113.289062 848.121094 1120.179688 867.253906 1123.621094 C 929.617188 1134.71875 996.972656 1113.675781 1042.882812 1069.277344 C 1088.425781 1024.890625 1110.609375 957.933594 1101.421875 895.1875 C 1080.378906 902.886719 1058.949219 910.480469 1037.90625 918.140625 C 1044.503906 899.785156 1050.144531 881.136719 1054.835938 862.203125 C 1059.523438 843.265625 1063.234375 824.140625 1065.96875 804.824219 C 1068.699219 785.507812 1070.4375 766.105469 1071.183594 746.609375 C 1071.929688 727.117188 1071.679688 707.636719 1070.433594 688.167969 C 1086.714844 701.128906 1102.144531 715.027344 1116.730469 729.871094 C 1131.3125 744.710938 1144.941406 760.382812 1157.613281 776.886719 C 1170.285156 793.390625 1181.910156 810.605469 1192.480469 828.527344 C 1203.050781 846.449219 1212.496094 864.949219 1220.8125 884.023438 C 1209.710938 868.714844 1183.699219 877.515625 1175.65625 894.289062 C 1167.609375 911.058594 1171.074219 931.027344 1172.984375 949.386719 C 1182.546875 1044.28125 1136.632812 1142.625 1057.808594 1196.570312 C 973.246094 1254.3125 859.59375 1260.855469 780.78125 1325.902344 C 765.855469 1338.15625 741 1350.78125 731.414062 1334.332031 M 682.988281 283.273438 C 673.800781 313.117188 687.195312 348.316406 713.976562 364.394531 C 740.386719 380.84375 777.878906 376.636719 800.078125 354.824219 C 822.277344 333.007812 827.628906 295.898438 811.933594 268.734375 C 798.152344 245.007812 769.847656 230.46875 742.644531 233.523438 C 715.441406 236.578125 691.035156 257.25 682.988281 283.273438 Z';

const FOOTER_LINK_CLASS =
  'group/link inline-flex items-center gap-1.5 text-[15px] text-white/85 hover:text-white transition-all duration-200';

const EYEBROW_CLASS =
  'font-mono text-[11.5px] uppercase tracking-[0.16em] text-white/60 mb-5 pb-2.5 border-b border-white/15 font-medium';

export default function HarborFooter({ isLoggedIn }: HarborFooterProps) {
  const wordmarkGroupRef = useRef<SVGGElement>(null);
  const [wordmarkViewBox, setWordmarkViewBox] = useState('0 0 1254 290');

  useLayoutEffect(() => {
    let cancelled = false;

    const syncWordmarkBounds = () => {
      if (cancelled || !wordmarkGroupRef.current) return;
      const bbox = wordmarkGroupRef.current.getBBox();
      if (bbox.width <= 0 || bbox.height <= 0) return;

      const padX = 14;
      const padY = 10;
      setWordmarkViewBox(
        `${(bbox.x - padX).toFixed(1)} ${(bbox.y - padY).toFixed(1)} ${(bbox.width + padX * 2).toFixed(1)} ${(bbox.height + padY * 2).toFixed(1)}`
      );
    };

    syncWordmarkBounds();
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(syncWordmarkBounds).catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer
      className="w-full text-white relative overflow-hidden pt-20 lg:pt-28 pb-10"
      style={{
        background: 'linear-gradient(180deg, #172554 0%, #1d4ed8 65%, #2563eb 100%)',
      }}
    >
      {/* Subtle architectural blueprint lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundSize: '56px 56px',
          backgroundImage:
            'linear-gradient(to right, rgba(255, 255, 255, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.14) 1px, transparent 1px)',
        }}
      />

      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[78px] relative z-10 flex flex-col">
        {/* ── TOP FOOTER CTA ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
          className="pb-16 lg:pb-20 border-b border-white/20 flex flex-col lg:flex-row items-start lg:items-end justify-between gap-10"
        >
          <div className="flex flex-col gap-4 max-w-[720px]">
            <span className="font-mono text-[13px] uppercase tracking-[0.16em] text-white/75">
              Ready to Ship Faster?
            </span>
            <h2 className="font-['Roobert',sans-serif] font-roobert text-[40px] sm:text-[50px] lg:text-[64px] font-light tracking-tight leading-[1.04] text-white">
              Move from commit to
              <br />
              production in seconds.
            </h2>
            <p className="text-[17px] lg:text-[19px] text-white/80 font-light leading-[1.6] max-w-[580px]">
              Create your Harbor workspace, connect your GitHub repositories, and orchestrate every environment with full visibility.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link
              to={isLoggedIn ? '/dashboard' : '/register'}
              className="group relative z-[1] inline-flex cursor-pointer items-center justify-between overflow-hidden whitespace-nowrap bg-white text-[#0f172a] hover:text-white h-[60px] text-[17px] font-medium py-[16px] px-[28px] gap-[14px] rounded-[2px] transition-colors duration-300"
            >
              <span className="pointer-events-none absolute inset-0 z-[0] block h-full w-full origin-right scale-x-0 group-hover:origin-left group-hover:scale-x-100 transition-transform duration-300 bg-[#0f172a]" />
              <span className="relative z-[1]">
                {isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}
              </span>
              <ArrowRightIcon className="relative z-[1] w-[15px] h-[15px] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {!isLoggedIn && (
              <Link
                to="/login"
                className="h-[60px] px-[26px] inline-flex items-center justify-center border border-white/40 hover:border-white hover:bg-white/10 text-white transition-colors text-[17px] rounded-[2px]"
              >
                Sign In
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── MULTI-COLUMN NAVIGATION ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="py-14 lg:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] gap-10 lg:gap-12"
        >
          {/* Product */}
          <div>
            <h3 className={EYEBROW_CLASS}>01 / Product</h3>
            <ul className="flex flex-col gap-3.5">
              {[
                { label: 'Architecture', href: '#architecture' },
                { label: 'How It Works', href: '#how-it-works' },
                { label: 'Features', href: '#features' },
                { label: 'Multi-Cloud Integrations', href: '#integrations' },
                { label: 'Security & Governance', href: '#enterprise' },
              ].map((item) => (
                <li key={item.label}>
                  <a href={item.href} className={FOOTER_LINK_CLASS}>
                    <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">
                      {item.label}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-80 group-hover/link:translate-x-0 transition-all duration-200" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className={EYEBROW_CLASS}>02 / Platform</h3>
            <ul className="flex flex-col gap-3.5">
              {[
                { label: 'Dashboard', to: '/dashboard' },
                { label: 'Projects & Services', to: '/projects' },
                { label: 'Environments & Secrets', to: '/environments' },
                { label: 'Deployments', to: '/deployments' },
                { label: 'Deployment Reports', to: '/reports' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={FOOTER_LINK_CLASS}>
                    <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">
                      {item.label}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-80 group-hover/link:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Workspace */}
          <div>
            <h3 className={EYEBROW_CLASS}>03 / Workspace</h3>
            <ul className="flex flex-col gap-3.5">
              {[
                { label: 'Create Account', to: '/register' },
                { label: 'Sign In', to: '/login' },
                { label: 'Account Settings', to: '/settings' },
                { label: 'Reset Password', to: '/password-reset' },
              ].map((item) => (
                <li key={item.label}>
                  <Link to={item.to} className={FOOTER_LINK_CLASS}>
                    <span className="transition-transform duration-200 group-hover/link:translate-x-0.5">
                      {item.label}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover/link:opacity-80 group-hover/link:translate-x-0 transition-all duration-200" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Status, Contact & Connect Panel */}
          <div className="p-6 border border-white/20 bg-white/[0.06] rounded-[2px] flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 border border-[#37cd8f]/40 bg-[#37cd8f]/15 rounded-[2px] font-mono text-[12px] text-white">
                <span className="w-2 h-2 rounded-full bg-[#37cd8f] animate-pulse" />
                <span>All systems operational</span>
              </div>

              <div className="flex flex-col gap-2.5 text-[14.5px] text-white/90 pt-1">
                <a
                  href="mailto:hello@harborapp.tech"
                  className="inline-flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-white/70 shrink-0" />
                  <span>hello@harborapp.tech</span>
                </a>
                <a
                  href="https://harborapp.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/80 hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4 text-white/70 shrink-0" />
                  <span>harborapp.tech</span>
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-white/15 flex items-center justify-between gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/65">
                Follow Harbor
              </span>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://github.com/shanelperera-exe/harbor"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Harbor on GitHub"
                  className="w-9 h-9 border border-white/30 hover:border-white hover:bg-white hover:text-[#1d4ed8] rounded-[2px] flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                >
                  <FaGithub className="w-4 h-4" />
                </a>
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Harbor on LinkedIn"
                  className="w-9 h-9 border border-white/30 hover:border-white hover:bg-white hover:text-[#1d4ed8] rounded-[2px] flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                >
                  <FaLinkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* ── FULL-BLEED OVERSIZED ANIMATED BRAND WORDMARK ──────────────────── */}
      <motion.a
        href="#"
        aria-label="Harbor home"
        initial={{ opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="group relative z-10 block w-full px-4 sm:px-8 lg:px-14 mt-4 mb-8 select-none"
      >
        <svg
          viewBox={wordmarkViewBox}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-auto block"
          role="img"
          aria-label="harbor"
        >
          <g ref={wordmarkGroupRef}>
            {/* Inverted Harbor Shield Mark */}
            <g transform="translate(14, 10) scale(0.18)">
              <path fill="#ffffff" d={SHIELD_OUTER_PATH} />
              <path fill="#1e40af" d={SHIELD_ANCHOR_PATH} />
            </g>

            {/* Full-width Harbor Wordmark */}
            <text
              x="324"
              y="258"
              fill="#ffffff"
              fontFamily="'Roobert', sans-serif"
              fontSize="310"
              fontWeight="500"
              letterSpacing="-11"
            >
              harbor
            </text>
          </g>
        </svg>
      </motion.a>

      {/* ── COPYRIGHT ─────────────────────────────────────────────────────── */}
      <p className="relative z-10 text-center font-mono text-[13px] text-white/80 tracking-wide pt-2 px-5">
        © 2026 Harbor. All rights reserved.
      </p>
    </footer>
  );
}
