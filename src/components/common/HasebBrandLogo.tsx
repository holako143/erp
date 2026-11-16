import React, { useId } from 'react';

export interface HasebBrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'corporate_slate' | 'swiss_light' | 'haseb_royal' | 'haseb_sand' | 'obsidian_dark';
  className?: string;
  showPulse?: boolean;
  animated?: boolean;
}

const SIZE_MAP = {
  sm: 'w-9 h-9 rounded-xl',
  md: 'w-11 h-11 rounded-2xl',
  lg: 'w-14 h-14 rounded-2xl',
  xl: 'w-20 h-20 rounded-3xl',
};

const SVG_SIZE_MAP = {
  sm: 'w-6 h-6',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-14 h-14',
};

export const HasebBrandLogo: React.FC<HasebBrandLogoProps> = ({
  size = 'md',
  theme = 'corporate_slate',
  className = '',
  showPulse = true,
  animated = true,
}) => {
  const uniqueId = useId().replace(/:/g, '');
  const isKinetic = animated && showPulse;
  const isHeroSize = size === 'lg' || size === 'xl';

  const getGradientPalette = () => {
    switch (theme) {
      case 'haseb_royal':
        return {
          bgClass:
            'bg-gradient-to-br from-[#17143b] via-[#3730a3] to-[#6366f1] shadow-lg shadow-indigo-950/35',
          ringClass: 'ring-1 ring-indigo-300/45',
          glowColor: 'rgba(99, 102, 241, 0.42)',
          accentStop1: '#e0e7ff',
          accentStop2: '#818cf8',
          goldDot: '#fbbf24',
          orbitStroke: 'rgba(199, 210, 254, 0.45)',
        };
      case 'swiss_light':
        return {
          bgClass:
            'bg-gradient-to-br from-[#082f49] via-[#0284c7] to-[#38bdf8] shadow-lg shadow-sky-900/30',
          ringClass: 'ring-1 ring-sky-200/50',
          glowColor: 'rgba(14, 165, 233, 0.36)',
          accentStop1: '#e0f2fe',
          accentStop2: '#38bdf8',
          goldDot: '#fbbf24',
          orbitStroke: 'rgba(186, 230, 253, 0.5)',
        };
      case 'haseb_sand':
        return {
          bgClass:
            'bg-gradient-to-br from-[#451a03] via-[#b45309] to-[#d97706] shadow-lg shadow-amber-950/35',
          ringClass: 'ring-1 ring-amber-200/45',
          glowColor: 'rgba(217, 119, 6, 0.38)',
          accentStop1: '#fef3c7',
          accentStop2: '#fbbf24',
          goldDot: '#ffffff',
          orbitStroke: 'rgba(253, 230, 138, 0.48)',
        };
      case 'obsidian_dark':
        return {
          bgClass:
            'bg-gradient-to-br from-[#0a1224] via-[#1d4ed8] to-[#38bdf8] shadow-lg shadow-blue-950/65',
          ringClass: 'ring-1 ring-blue-300/45',
          glowColor: 'rgba(59, 130, 246, 0.45)',
          accentStop1: '#dbeafe',
          accentStop2: '#60a5fa',
          goldDot: '#fbbf24',
          orbitStroke: 'rgba(147, 197, 253, 0.48)',
        };
      case 'corporate_slate':
      default:
        return {
          bgClass:
            'bg-gradient-to-br from-[#0f172a] via-[#1e40af] to-[#2563eb] shadow-lg shadow-blue-950/35',
          ringClass: 'ring-1 ring-blue-200/45',
          glowColor: 'rgba(37, 99, 235, 0.38)',
          accentStop1: '#dbeafe',
          accentStop2: '#60a5fa',
          goldDot: '#fbbf24',
          orbitStroke: 'rgba(191, 219, 254, 0.48)',
        };
    }
  };

  const palette = getGradientPalette();
  const strokeGradId = `haseb-stroke-${uniqueId}`;
  const goldGradId = `haseb-gold-${uniqueId}`;
  const shieldFillId = `haseb-shield-${uniqueId}`;

  return (
    <div
      data-testid="haseb-brand-logo"
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden transition-transform duration-200 group-hover:scale-[1.04] ${
        isKinetic && isHeroSize ? 'haseb-logo-float' : ''
      } ${SIZE_MAP[size]} ${palette.bgClass} ${palette.ringClass} ${className}`}
      style={{ boxShadow: `0 8px 20px -6px ${palette.glowColor}` }}
      aria-hidden="true"
    >
      {/* Subtle top-edge bevel highlight */}
      <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] bg-gradient-to-b from-white/25 via-transparent to-black/20" />

      {/* Kinetic glass sheen sweep across the emblem */}
      {isKinetic && (
        <div
          className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent haseb-logo-sheen"
        />
      )}

      {/* Prominent Architectural Geometric Crest + Kinetic Kufic "ح" & Ledger Pillars */}
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 ${SVG_SIZE_MAP[size]}`}
      >
        <defs>
          <linearGradient id={strokeGradId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor={palette.accentStop1} />
            <stop offset="100%" stopColor={palette.accentStop2} />
          </linearGradient>
          <linearGradient id={goldGradId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fde68a" />
            <stop offset="55%" stopColor={palette.goldDot} />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id={shieldFillId} x1="32" y1="6" x2="32" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
        </defs>

        {/* Kinetic Segmented Precision Orbit Ring */}
        <g className={isKinetic ? 'haseb-logo-orbit' : ''}>
          <circle
            cx="32"
            cy="32"
            r="27.5"
            stroke={palette.orbitStroke}
            strokeWidth="1.4"
            strokeDasharray="10 6 3 6"
            strokeLinecap="round"
          />
          <circle cx="32" cy="4.5" r="1.9" fill={palette.goldDot} />
          <circle cx="32" cy="59.5" r="1.5" fill="#ffffff" opacity="0.7" />
        </g>

        {/* Inner Architectural Octagonal Ledger Shield */}
        <path
          d="M19.5 10.5H44.5L53.5 19.5V44.5L44.5 53.5H19.5L10.5 44.5V19.5L19.5 10.5Z"
          fill={`url(#${shieldFillId})`}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Kinetic Ascending Financial Ledger Pillars */}
        <rect
          x="16.5"
          y="21"
          width="4.4"
          height="9"
          rx="2.2"
          fill={palette.accentStop1}
          className={isKinetic ? 'haseb-logo-pillar-1' : ''}
        />
        <rect
          x="23"
          y="16.5"
          width="4.4"
          height="13.5"
          rx="2.2"
          fill="#ffffff"
          className={isKinetic ? 'haseb-logo-pillar-2' : ''}
        />
        <rect
          x="29.5"
          y="12.5"
          width="4.4"
          height="17.5"
          rx="2.2"
          fill={`url(#${goldGradId})`}
          className={isKinetic ? 'haseb-logo-pillar-3' : ''}
        />

        {/* Bold Stylized Geometric Kufic Letter "ح" (Haa) Monogram */}
        <path
          d="M16 35.5H47L36.5 24"
          stroke={`url(#${strokeGradId})`}
          strokeWidth="5.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 35.5C32.5 35.5 20.5 40 20.5 46.8C20.5 51.2 26.5 53 36.5 53H47.5"
          stroke="#ffffff"
          strokeWidth="5.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulsing Apex Golden Verification Node */}
        <circle
          cx="46.5"
          cy="21"
          r="3.8"
          fill={`url(#${goldGradId})`}
          className={isKinetic ? 'haseb-logo-node' : ''}
        />
      </svg>
    </div>
  );
};
