'use client';

import { motion } from 'framer-motion';

interface LeverageScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function LeverageScoreRing({ score, size = 48, showLabel = true, className = '' }: LeverageScoreRingProps) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 85) return '#52E5FF';
    if (s >= 65) return '#7B61FF';
    if (s >= 45) return '#FFB347';
    return '#FF4FD8';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold" style={{ color: getColor(score) }}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">杠杆分</span>
      )}
    </div>
  );
}
