import React from 'react';

export interface HasebBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
  className?: string;
  showPulse?: boolean;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-12 h-12 rounded-2xl',
  xl: 'w-16 h-16 rounded-2xl',
};

const SVG_SIZE_MAP = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

export const HasebBrandLogo: React.FC<HasebBrandLogoProps> = ({
  size = 'md',
  theme = 'corporate_slate',
  className = '',
}) => {
  // Non-green, eye-soothing executive gradient stops for the Haseb Emblem
  const getGradientPalette = () => {
    switch (theme) {
      case 'haseb_royal':
        return {
          bgClass: 'bg-gradient-to-br from-[#1e1b4b] via-[#4338ca] to-[#6366f1] shadow-indigo-950/25',
          ringClass: 'ring-1 ring-indigo-300/35',
          accentStop1: '#c7d2fe',
          accentStop2: '#818cf8',
          goldDot: '#fbbf24',
        };
      case 'swiss_light':
        return {
          bgClass: 'bg-gradient-to-br from-[#0c4a6e] via-[#0284c7] to-[#38bdf8] shadow-sky-900/25',
          ringClass: 'ring-1 ring-sky-200/40',
          accentStop1: '#bae6fd',
          accentStop2: '#38bdf8',
          goldDot: '#fbbf24',
        };
      case 'haseb_sand':
        return {
          bgClass: 'bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#d97706] shadow-amber-950/25',
          ringClass: 'ring-1 ring-amber-200/40',
          accentStop1: '#fde68a',
          accentStop2: '#fbbf24',
          goldDot: '#ffffff',
        };
      case 'obsidian_dark':
        return {
          bgClass: 'bg-gradient-to-br from-[#0f172a] via-[#1d4ed8] to-[#3b82f6] shadow-blue-950/60',
          ringClass: 'ring-1 ring-blue-400/40',
          accentStop1: '#bfdbfe',
          accentStop2: '#60a5fa',
          goldDot: '#fbbf24',
        };
      case 'corporate_slate':
      default:
        return {
          bgClass: 'bg-gradient-to-br from-[#172554] via-[#1d4ed8] to-[#2563eb] shadow-blue-900/25',
          ringClass: 'ring-1 ring-blue-200/35',
          accentStop1: '#bfdbfe',
          accentStop2: '#60a5fa',
          goldDot: '#fbbf24',
        };
    }
  };

  const palette = getGradientPalette();
  const gradId = `haseb-emblem-grad-${theme}-${size}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none shadow-md transition-transform duration-200 group-hover:scale-[1.03] ${SIZE_MAP[size]} ${palette.bgClass} ${palette.ringClass} ${className}`}
      aria-hidden="true"
    >
      {/* Subtle inner glass highlight */}
      <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/20 to-transparent" />

      {/* Bespoke Geometric Kufic "ح" (Haa) + Ascending Financial Ledger Emblem */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 ${SVG_SIZE_MAP[size]}`}
      >
        <defs>
          <linearGradient id={gradId} x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor={palette.accentStop1} />
            <stop offset="100%" stopColor={palette.accentStop2} />
          </linearGradient>
        </defs>

        {/* Outer Architectural Octagonal Corner Accents */}
        <path
          d="M18 8H46L56 18V46L46 56H18L8 46V18L18 8Z"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Ascending Financial Balance Pillars (Top-Left Precision Bars) */}
        <rect x="15" y="21" width="4.5" height="9" rx="2.25" fill={palette.accentStop1} opacity="0.88" />
        <rect x="22" y="16" width="4.5" height="14" rx="2.25" fill="#ffffff" opacity="0.96" />
        <rect x="29" y="12" width="4.5" height="18" rx="2.25" fill={palette.goldDot} />

        {/* Stylized Geometric Kufic Letter "ح" (Haa) Monogram */}
        <path
          d="M15 35.5H47.5L36.5 23.5"
          stroke={`url(#${gradId})`}
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 35.5C32.5 35.5 20.5 40.5 20.5 47.5C20.5 52 26.5 54 36.5 54H48"
          stroke="#ffffff"
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Golden Precision Verification Node */}
        <circle cx="47.5" cy="21" r="3.6" fill={palette.goldDot} />
      </svg>
    </div>
  );
};
