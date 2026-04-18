'use client';

import { motion } from 'framer-motion';

interface TypewriterProps {
  content: string;
  className?: string;
  speed?: number;
}

export function Typewriter({ content, className = '', speed = 12 }: TypewriterProps) {
  const chars = content.split('');
  const displayChars = chars.slice(0, Math.floor(chars.length));

  return (
    <div className={className}>
      {displayChars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.03, delay: i * (speed / 1000) }}
        >
          {char}
        </motion.span>
      ))}
      <motion.span
        className="inline-block w-[2px] h-[1em] bg-brand-purple ml-[1px] align-text-bottom"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
      />
    </div>
  );
}
