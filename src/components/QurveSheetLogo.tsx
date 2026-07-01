import React from 'react';

interface QurveSheetLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'light' | 'dark' | 'color';
}

export default function QurveSheetLogo({
  className = '',
  size = 32,
  showText = false,
  textSize = 'md',
  variant = 'color'
}: QurveSheetLogoProps) {
  // SVG proportions are designed on a 200x200 viewport
  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        {/* Main Q-ring Gradient */}
        <linearGradient id="qRingGrad" x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
          <stop offset="50%" stopColor="#10b981" /> {/* Emerald 500 */}
          <stop offset="100%" stopColor="#2563eb" /> {/* Blue 600 */}
        </linearGradient>

        {/* Q-tail Wave Gradient */}
        <linearGradient id="waveGrad" x1="80" y1="100" x2="170" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a8a" /> {/* Blue 900 */}
          <stop offset="40%" stopColor="#2563eb" /> {/* Blue 600 */}
          <stop offset="100%" stopColor="#06b6d4" /> {/* Cyan 500 */}
        </linearGradient>

        {/* Bar Chart Columns Gradient */}
        <linearGradient id="barGrad" x1="110" y1="150" x2="130" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>

        {/* Rising Curve Line Gradient */}
        <linearGradient id="curveGrad" x1="100" y1="140" x2="160" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* 1. Behind the scene: Faint spreadsheet grid card */}
      <g opacity="0.85">
        <rect x="66" y="48" width="66" height="58" rx="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
        {/* Horizontal grid lines */}
        <line x1="66" y1="62" x2="132" y2="62" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="66" y1="74" x2="132" y2="74" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="66" y1="86" x2="132" y2="86" stroke="#e2e8f0" strokeWidth="1" />
        {/* Vertical grid lines */}
        <line x1="82" y1="48" x2="82" y2="106" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="98" y1="48" x2="98" y2="106" stroke="#e2e8f0" strokeWidth="1" />
        <line x1="114" y1="48" x2="114" y2="106" stroke="#e2e8f0" strokeWidth="1" />
        
        {/* Grid filled headers */}
        <rect x="82" y="74" width="16" height="12" fill="#10b981" fillOpacity="0.8" rx="1.5" />
        <rect x="98" y="74" width="16" height="12" fill="#a7f3d0" fillOpacity="0.8" rx="1.5" />
        <rect x="66" y="86" width="16" height="10" fill="#93c5fd" fillOpacity="0.8" rx="1.5" />
        <rect x="82" y="86" width="16" height="10" fill="#3b82f6" fillOpacity="0.8" rx="1.5" />
      </g>

      {/* 2. Main Q Ring */}
      <path
        d="M 125 168 C 170 155 190 100 167 55 C 144 10 82 5 50 45 C 18 85 24 148 70 168 C 90 177 110 174 125 168 Z"
        stroke="url(#qRingGrad)"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />

      {/* 3. Bar Chart Columns (Bottom Right) */}
      <rect x="110" y="96" width="6" height="24" rx="2" fill="url(#barGrad)" />
      <rect x="119" y="90" width="6" height="30" rx="2" fill="url(#barGrad)" />
      <rect x="128" y="84" width="6" height="36" rx="2" fill="url(#barGrad)" />

      {/* 4. Rising Curve Line */}
      <path
        d="M 104 116 Q 112 104 121 103 T 139 90"
        stroke="url(#curveGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Curve Nodes */}
      <circle cx="104" cy="116" r="2.5" fill="#10b981" />
      <circle cx="121" cy="103" r="2.5" fill="#0ea5e9" />
      <circle cx="139" cy="90" r="2.5" fill="#06b6d4" />

      {/* 5. Smooth Q-tail Wave (At the bottom of the circle) */}
      <path
        d="M 82 130 C 95 120 115 125 130 140 C 145 155 165 150 185 138 C 170 152 145 160 128 144 C 112 129 96 128 82 130 Z"
        fill="url(#waveGrad)"
      />
    </svg>
  );

  if (!showText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {svgContent}
      </div>
    );
  }

  // Text sizes mapping
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-2xl'
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {svgContent}
      <div className="flex items-center leading-none">
        <span className={`font-extrabold tracking-tight ${sizeClasses[textSize]} text-slate-900 dark:text-white`}>
          Qurve
        </span>
        <span className={`font-semibold tracking-tight ${sizeClasses[textSize]} text-cyan-500 dark:text-cyan-400`}>
          Sheet
        </span>
      </div>
    </div>
  );
}
