'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { AIStatus } from '@/types';

interface AIStatusIndicatorProps {
  status: AIStatus;
  className?: string;
}

const stageConfig: Record<AIStatus['stage'], { icon: React.ElementType; color: string }> = {
  idle: { icon: Brain, color: 'text-muted-foreground' },
  analyzing: { icon: Loader2, color: 'text-brand-cyan' },
  processing: { icon: Sparkles, color: 'text-brand-purple' },
  generating: { icon: Sparkles, color: 'text-brand-pink' },
  complete: { icon: CheckCircle2, color: 'text-green-400' },
  error: { icon: AlertCircle, color: 'text-red-400' },
};

export function AIStatusIndicator({ status, className = '' }: AIStatusIndicatorProps) {
  const { icon: Icon, color } = stageConfig[status.stage];
  const isAnimated = ['analyzing', 'processing', 'generating'].includes(status.stage);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status.stage}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 text-sm ${className}`}
      >
        <Icon className={`w-4 h-4 ${color} ${isAnimated ? 'animate-spin' : ''}`} />
        <span className={color}>{status.message}</span>
        {status.progress !== undefined && isAnimated && (
          <div className="w-16 h-1 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full brand-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${status.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
