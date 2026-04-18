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
  const nodeSize = Math.max(36, Math.min(70, comment.leverageScore * 0.7));
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
        className="fill-foreground text-sm font-medium pointer-events-none select-none"
      >
        {comment.author.slice(0, 2)}
      </text>

      {(isHovered || isSelected) && (
        <foreignObject
          x={x - 140}
          y={y - nodeSize / 2 - 120}
          width={280}
          height={110}
          className="pointer-events-none"
        >
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-sm px-2.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: intentColor + '22', color: intentColor }}
              >
                {intentLabels[comment.intent.primary]}
              </span>
              <span className="text-sm text-muted-foreground">杠杆 {comment.leverageScore}</span>
            </div>
            <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{comment.content}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{comment.likes}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{comment.replyCount}</span>
            </div>
          </div>
        </foreignObject>
      )}
    </motion.g>
  );
}
