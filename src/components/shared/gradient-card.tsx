'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
}

export function GradientCard({ children, className = '', gradient = false, hover = true }: GradientCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      transition={{ duration: 0.2 }}
      className={`
        relative rounded-3xl overflow-hidden
        ${gradient ? 'p-[1px]' : ''}
        ${className}
      `}
    >
      {gradient && (
        <div className="absolute inset-0 brand-gradient rounded-3xl" />
      )}
      <div className={`relative rounded-3xl bg-card ${gradient ? 'm-[1px]' : ''}`}>
        {children}
      </div>
    </motion.div>
  );
}
