'use client';

import { motion } from 'framer-motion';
import { Comment } from '@/types';
import { intentLabels, intentColors } from '@/data/mock';
import { Heart, MessageCircle } from 'lucide-react';

interface CommentNodeProps {
  comment: Comment;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (comment: Comment) => void;
  x: number;
  y: number;
}

export function CommentNode({
  comment,
  isHovered,
  isSelected,
  onHover,
  onSelect,
  x,
  y,
}: CommentNodeProps) {
  const nodeSize = Math.max(30, Math.min(60, comment.leverageScore * 0.6));
  const intentColor = intentColors[comment.intent.primary] || '#7B61FF';

  return (
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, delay: Math.random() * 0.5 }}
      onMouseEnter={() => onHover(comment.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(comment)}
      className="cursor-pointer"
    >
      <circle
        cx={x}
        cy={y}
        r={nodeSize / 2}
        fill={intentColor}
        fillOpacity={isSelected ? 0.4 : isHovered ? 0.3 : 0.15}
        stroke={intentColor}
        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0.5}
        strokeOpacity={isSelected ? 1 : isHovered ? 0.8 : 0.4}
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[10px] font-medium pointer-events-none select-none"
      >
        {comment.author.slice(0, 2)}
      </text>

      {(isHovered || isSelected) && (
        <foreignObject
          x={x - 120}
          y={y - nodeSize / 2 - 100}
          width={240}
          height={90}
          className="pointer-events-none"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-3 shadow-xl">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ backgroundColor: intentColor + '22', color: intentColor }}
              >
                {intentLabels[comment.intent.primary]}
              </span>
              <span className="text-[10px] text-muted-foreground">杠杆 {comment.leverageScore}</span>
            </div>
            <p className="text-xs text-foreground line-clamp-2">{comment.content}</p>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{comment.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{comment.replyCount}</span>
            </div>
          </div>
        </foreignObject>
      )}
    </motion.g>
  );
}
