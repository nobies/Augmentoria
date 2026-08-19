'use client';

import React from 'react';

interface AugmentoriaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export const AugmentoriaLogo: React.FC<AugmentoriaLogoProps> = ({
  className = '',
  size = 32,
  showText = true,
  textClassName = 'text-base font-black tracking-tight text-white',
}) => {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Precision Geometric Vortex Ribbon Loop SVG Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 group-hover:scale-105"
      >
        <defs>
          <linearGradient id="vortexGradient1" x1="15%" y1="90%" x2="50%" y2="10%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="vortexGradient2" x1="50%" y1="10%" x2="85%" y2="55%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="60%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <linearGradient id="vortexGradient3" x1="85%" y1="55%" x2="30%" y2="60%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="vortexGradient4" x1="70%" y1="65%" x2="85%" y2="90%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
          <filter id="vortexGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f43f5e" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Main Ribbon Loop Body */}
        <g filter="url(#vortexGlow)">
          {/* Left Arch Pillar */}
          <path
            d="M 50 14 L 18 84 L 32 84 L 50 38 L 68 84 L 82 84 Z"
            fill="url(#vortexGradient1)"
            opacity="0.95"
          />

          {/* Interlocking Vortex Crossbar & Play Chevron (Dimensional Fold) */}
          <path
            d="M 33 60 L 78 48 L 74 68 L 37 68 Z"
            fill="url(#vortexGradient3)"
          />

          {/* Top Right Triangular Facet */}
          <path
            d="M 50 14 L 78 48 L 62 53 L 50 32 Z"
            fill="url(#vortexGradient2)"
          />

          {/* Right Supporting Foot Accent */}
          <path
            d="M 68 84 L 78 58 L 86 84 Z"
            fill="url(#vortexGradient4)"
          />
        </g>
      </svg>

      {/* Typographic Wordmark */}
      {showText && (
        <div className="flex items-center tracking-tight">
          <span className={textClassName}>AUGMENTORIA</span>
        </div>
      )}
    </div>
  );
};
