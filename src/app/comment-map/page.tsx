'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { forceSimulation, forceManyBody, forceCenter, forceCollide, forceLink, forceX, forceY } from 'd3-force';
import { AppShell, PageHeader } from '@/components/shared/page-header';
import { GradientCard } from '@/components/shared/gradient-card';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { LeverageScoreRing } from '@/components/shared/leverage-score';
import { useAppStore } from '@/stores/app-store';
import { ImportModal } from '@/components/shared/import-modal';
import { intentLabels, intentColors } from '@/data/mock';
import { Comment, CommentCluster } from '@/types';
import { Heart, MessageCircle, Filter, X, ZoomIn, ZoomOut, Maximize2, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SimNode {
  id: string;
  comment: Comment;
  clusterId: string;
  leverageScore: number;
  radius: number;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: SimNode | string;
  target: SimNode | string;
  strength: number;
  clusterColor: string;
}

const WIDTH = 1200;
const HEIGHT = 800;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

function getClusterCenter(clusterId: string, clusters: CommentCluster[]): { x: number; y: number } {
  const cluster = clusters.find(c => c.id === clusterId);
  if (!cluster) return { x: CENTER_X, y: CENTER_Y };
  return { x: cluster.centroid.x / 100 * WIDTH, y: cluster.centroid.y / 100 * HEIGHT };
}

export default function CommentMapPage() {
  const { comments, clusters, setImportModalOpen, isUsingImportedData } = useAppStore();
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [intentFilter, setIntentFilter] = useState<string | null>(null);
  const [clusterFilter, setClusterFilter] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredComments = useMemo(() => {
    let result = comments;
    if (intentFilter) result = result.filter(c => c.intent.primary === intentFilter);
    if (clusterFilter) result = result.filter(c => c.clusterId === clusterFilter);
    return result;
  }, [intentFilter, clusterFilter]);

  const filteredClusters = useMemo(() => {
    if (!clusterFilter) return clusters;
    return clusters.filter(cl => cl.id === clusterFilter);
  }, [clusterFilter]);

  // Build links: each comment connects to its cluster centroid and to same-cluster neighbors
  const { initialNodes, links } = useMemo(() => {
    const n: SimNode[] = filteredComments.map(c => {
      const center = getClusterCenter(c.clusterId, clusters);
      return {
        id: c.id,
        comment: c,
        clusterId: c.clusterId,
        leverageScore: c.leverageScore,
        radius: Math.max(24, Math.min(56, c.leverageScore * 0.56)),
        x: center.x + (Math.random() - 0.5) * 80,
        y: center.y + (Math.random() - 0.5) * 80,
      };
    });

    const l: SimLink[] = [];
    filteredComments.forEach(c => {
      const cluster = clusters.find(cl => cl.id === c.clusterId);
      if (!cluster) return;
      const siblings = filteredComments.filter(s => s.clusterId === c.clusterId && s.id !== c.id);
      siblings.forEach(s => {
        if (c.id < s.id) {
          l.push({
            source: c.id,
            target: s.id,
            strength: 0.3,
            clusterColor: cluster.color,
          });
        }
      });
    });

    return { initialNodes: n, links: l };
  }, [filteredComments, clusters]);

  // Run force simulation
  useEffect(() => {
    if (initialNodes.length === 0) {
      setNodes([]);
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    const simNodes = initialNodes.map(n => ({ ...n }));

    const clusterXForces = forceX<SimNode>((d) => getClusterCenter(d.clusterId, clusters).x).strength(0.15);
    const clusterYForces = forceY<SimNode>((d) => getClusterCenter(d.clusterId, clusters).y).strength(0.15);

    const simulation = forceSimulation<SimNode>(simNodes)
      .force('charge', forceManyBody<SimNode>().strength(d => -d.leverageScore * 1.5 - 80))
      .force('center', forceCenter(CENTER_X, CENTER_Y).strength(0.05))
      .force('collision', forceCollide<SimNode>().radius(d => d.radius + 12).strength(0.8))
      .force('clusterX', clusterXForces)
      .force('clusterY', clusterYForces)
      .force('link', forceLink<SimNode, SimLink>(links.map(l => ({ ...l })))
        .id(d => (d as SimNode).id)
        .strength(0.05)
        .distance(60)
      )
      .alphaDecay(0.02)
      .on('tick', () => {
        setNodes([...simNodes.map(n => ({ ...n }))]);
      })
      .on('end', () => {
        setIsSimulating(false);
      });

    return () => {
      simulation.stop();
    };
  }, [initialNodes, links, clusters]);

  // Compute related node IDs for hover highlighting
  const relatedIds = useMemo(() => {
    if (!hoveredCommentId) return new Set<string>();
    const hovered = filteredComments.find(c => c.id === hoveredCommentId);
    if (!hovered) return new Set<string>([hoveredCommentId]);
    const related = new Set<string>();
    related.add(hoveredCommentId);
    filteredComments.forEach(c => {
      if (c.clusterId === hovered.clusterId) related.add(c.id);
    });
    filteredComments.forEach(c => {
      if (c.intent.primary === hovered.intent.primary) related.add(c.id);
    });
    return related;
  }, [hoveredCommentId, filteredComments]);

  // Compute viewBox from pan/zoom
  const viewBox = useMemo(() => {
    const w = WIDTH / zoom;
    const h = HEIGHT / zoom;
    const x = (WIDTH - w) / 2 + pan.x / zoom;
    const y = (HEIGHT - h) / 2 + pan.y / zoom;
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * 0.001;
    setZoom(prev => Math.max(0.4, Math.min(3, prev - delta * prev)));
  }, []);

  // Debounced hover with generous delay to prevent flickering
  const handleNodeHover = useCallback((id: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (id === null) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredCommentId(null);
      }, 150);
    } else {
      setHoveredCommentId(id);
    }
  }, []);

  // Cleanup hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="评论地图"
        subtitle={isUsingImportedData ? `已导入 ${comments.length} 条真实评论` : '可视化评论意图集群与杠杆分分布'}
        actions={
          <div className="flex items-center gap-3">
            <AIStatusIndicator
              status={isSimulating
                ? { stage: 'processing', message: '力导向布局计算中...', progress: 60 }
                : { stage: 'complete', message: `地图已渲染 · ${filteredClusters.length} 个意图集群 · ${filteredComments.length} 条评论`, progress: 100 }
              }
            />
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setImportModalOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> 导入评论
            </Button>
          </div>
        }
      />

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Map Area */}
        <div className="flex-1">
          <GradientCard className="h-full">
            <div className="p-4 h-full flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">意图筛选</span>
                  {Object.entries(intentLabels).map(([key, label]) => (
                    <Badge
                      key={key}
                      variant={intentFilter === key ? 'default' : 'outline'}
                      className="cursor-pointer text-sm transition-all"
                      style={intentFilter === key ? { backgroundColor: intentColors[key], borderColor: intentColors[key] } : { borderColor: intentColors[key] + '44', color: intentColors[key] }}
                      onClick={() => setIntentFilter(intentFilter === key ? null : key)}
                    >
                      {label}
                    </Badge>
                  ))}
                  {(intentFilter || clusterFilter) && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-sm gap-1" onClick={() => { setIntentFilter(null); setClusterFilter(null); }}>
                      <X className="w-3.5 h-3.5" /> 清除筛选
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(Math.max(0.4, zoom - 0.2))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setZoom(Math.min(2.5, zoom + 0.2))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Canvas Map */}
              <div
                ref={containerRef}
                className="flex-1 rounded-2xl bg-secondary/20 overflow-hidden relative cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <svg
                  ref={svgRef}
                  viewBox={viewBox}
                  className="w-full h-full select-none"
                  style={{ transition: isDragging ? 'none' : 'viewBox 0.1s ease-out' }}
                >
                  <defs>
                    {/* Glow filters with stronger intensity */}
                    <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#52E5FF" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowPurple" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#7B61FF" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowPink" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#FF4FD8" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowGreen" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#4ADE80" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#FFB347" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="glowPinkSoft" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feFlood floodColor="#F472B6" floodOpacity="0.5" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>

                    {/* Radial gradients for cluster regions */}
                    {filteredClusters.map(cluster => (
                      <radialGradient key={cluster.id} id={`clusterBg-${cluster.id}`}>
                        <stop offset="0%" stopColor={cluster.color} stopOpacity="0.12" />
                        <stop offset="70%" stopColor={cluster.color} stopOpacity="0.04" />
                        <stop offset="100%" stopColor={cluster.color} stopOpacity="0" />
                      </radialGradient>
                    ))}
                  </defs>

                  {/* Cluster background regions */}
                  {filteredClusters.map(cluster => {
                    const center = getClusterCenter(cluster.id, clusters);
                    const clusterNodes = nodes.filter(n => n.clusterId === cluster.id);
                    if (clusterNodes.length === 0) return null;
                    const maxDist = Math.max(120, ...clusterNodes.map(n =>
                      Math.sqrt((n.x - center.x) ** 2 + (n.y - center.y) ** 2)
                    )) + 40;
                    return (
                      <g key={cluster.id}>
                        <circle
                          cx={center.x}
                          cy={center.y}
                          r={maxDist}
                          fill={`url(#clusterBg-${cluster.id})`}
                          className="cursor-pointer transition-opacity"
                          opacity={clusterFilter === cluster.id ? 1 : 0.6}
                          onClick={() => setClusterFilter(clusterFilter === cluster.id ? null : cluster.id)}
                        />
                        <circle
                          cx={center.x}
                          cy={center.y}
                          r={maxDist}
                          fill="none"
                          stroke={cluster.color}
                          strokeWidth={0.5}
                          strokeOpacity={0.15}
                          strokeDasharray="6 4"
                        />
                        <text
                          x={center.x}
                          y={center.y - maxDist + 20}
                          textAnchor="middle"
                          className="fill-muted-foreground text-sm font-semibold select-none pointer-events-none"
                          opacity={0.8}
                        >
                          {cluster.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Links */}
                  {links.map((link, i) => {
                    const source = typeof link.source === 'string' ? nodes.find(n => n.id === link.source) : link.source as SimNode;
                    const target = typeof link.target === 'string' ? nodes.find(n => n.id === link.target) : link.target as SimNode;
                    if (!source || !target) return null;

                    const isHighlighted = hoveredCommentId && (relatedIds.has(source.id) && relatedIds.has(target.id));
                    const dimmed = hoveredCommentId && !isHighlighted;

                    return (
                      <line
                        key={`link-${i}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke={link.clusterColor}
                        strokeWidth={isHighlighted ? 2.5 : 0.8}
                        strokeOpacity={dimmed ? 0.03 : isHighlighted ? 0.5 : 0.1}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node, index) => {
                    const c = node.comment;
                    const intentColor = intentColors[c.intent.primary];
                    const isHovered = hoveredCommentId === node.id;
                    const isSelected = selectedComment?.id === node.id;
                    const isRelated = hoveredCommentId ? relatedIds.has(node.id) : true;
                    const dimmed = hoveredCommentId && !isRelated;

                    const glowFilterMap: Record<string, string> = {
                      '#52E5FF': 'url(#glowCyan)',
                      '#7B61FF': 'url(#glowPurple)',
                      '#FF4FD8': 'url(#glowPink)',
                      '#4ADE80': 'url(#glowGreen)',
                      '#FFB347': 'url(#glowOrange)',
                      '#F472B6': 'url(#glowPinkSoft)',
                      '#818CF8': 'url(#glowPurple)',
                    };

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onMouseEnter={() => handleNodeHover(node.id)}
                        onMouseLeave={() => handleNodeHover(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComment(selectedComment?.id === node.id ? null : c);
                        }}
                        opacity={dimmed ? 0.12 : 1}
                        style={{ transition: 'opacity 0.3s' }}
                      >
                        {/* Outer pulse ring for hovered/selected - dual ring animation */}
                        {(isHovered || isSelected) && (
                          <>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.radius + 8}
                              fill="none"
                              stroke={intentColor}
                              strokeWidth={1.5}
                              strokeOpacity={0.3}
                            >
                              <animate
                                attributeName="r"
                                values={`${node.radius + 6};${node.radius + 18};${node.radius + 6}`}
                                dur="2s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="stroke-opacity"
                                values="0.4;0.05;0.4"
                                dur="2s"
                                repeatCount="indefinite"
                              />
                            </circle>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.radius + 4}
                              fill="none"
                              stroke={intentColor}
                              strokeWidth={0.8}
                              strokeOpacity={0.2}
                            >
                              <animate
                                attributeName="r"
                                values={`${node.radius + 4};${node.radius + 24};${node.radius + 4}`}
                                dur="2.5s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="stroke-opacity"
                                values="0.2;0;0.2"
                                dur="2.5s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          </>
                        )}

                        {/* Main circle */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isHovered ? node.radius + 5 : node.radius}
                          fill={intentColor}
                          fillOpacity={isSelected ? 0.4 : isHovered ? 0.35 : isRelated && hoveredCommentId ? 0.25 : 0.15}
                          stroke={intentColor}
                          strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1}
                          strokeOpacity={isSelected ? 1 : isHovered ? 1 : 0.5}
                          filter={isHovered || isSelected ? (glowFilterMap[intentColor] || 'url(#glowPurple)') : undefined}
                          style={{ transition: 'r 0.25s ease-out, fill-opacity 0.3s, stroke-opacity 0.3s, stroke-width 0.2s' }}
                        />

                        {/* Leverage score label */}
                        <text
                          x={node.x}
                          y={node.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="fill-foreground font-bold pointer-events-none select-none"
                          fontSize={isHovered || isSelected ? 14 : 12}
                          opacity={isHovered || isSelected ? 1 : 0.75}
                          style={{ transition: 'font-size 0.2s ease-out, opacity 0.2s' }}
                        >
                          {node.leverageScore}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating tooltip - improved with larger hit area */}
                <AnimatePresence>
                  {hoveredCommentId && (() => {
                    const c = filteredComments.find(cm => cm.id === hoveredCommentId);
                    if (!c) return null;
                    const cluster = clusters.find(cl => cl.id === c.clusterId);
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute bottom-4 left-4 right-4 glass-card rounded-2xl p-5"
                        onMouseEnter={() => handleNodeHover(hoveredCommentId)}
                        onMouseLeave={() => handleNodeHover(null)}
                      >
                        <div className="flex items-center gap-3 mb-2.5">
                          <span
                            className="text-sm px-2.5 py-1 rounded-full font-medium"
                            style={{ backgroundColor: intentColors[c.intent.primary] + '22', color: intentColors[c.intent.primary] }}
                          >
                            {intentLabels[c.intent.primary]}
                          </span>
                          <span className="text-sm text-brand-cyan font-semibold">杠杆分 {c.leverageScore}</span>
                          {cluster && (
                            <span className="text-sm text-muted-foreground ml-auto flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cluster.color }} />
                              {cluster.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed mb-2">{c.content}</p>
                        <p className="text-sm text-muted-foreground italic">{c.intent.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{c.likes}</span>
                          <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{c.replyCount}</span>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </div>
            </div>
          </GradientCard>
        </div>

        {/* Sidebar Detail Panel */}
        <div className="w-[380px]">
          <GradientCard className="h-full">
            <div className="p-5 h-full flex flex-col">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-brand-purple" />
                评论详情
              </h3>

              {selectedComment ? (
                <ScrollArea className="flex-1">
                  <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <LeverageScoreRing score={selectedComment.leverageScore} size={60} />
                      <div className="text-right">
                        <Badge
                          className="text-sm"
                          style={{ backgroundColor: intentColors[selectedComment.intent.primary] + '22', color: intentColors[selectedComment.intent.primary] }}
                        >
                          {intentLabels[selectedComment.intent.primary]}
                        </Badge>
                        <div className="mt-1.5 text-sm text-muted-foreground">
                          置信度 {Math.round(selectedComment.intent.confidence * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/30">
                      <p className="text-sm leading-relaxed">{selectedComment.content}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">意图解析</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed">{selectedComment.intent.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-secondary/30 text-center">
                        <div className="text-lg font-bold">{selectedComment.likes}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <Heart className="w-3.5 h-3.5" /> 点赞
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-secondary/30 text-center">
                        <div className="text-lg font-bold">{selectedComment.replyCount}</div>
                        <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> 回复
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">标签</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedComment.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">所属集群</h4>
                      {(() => {
                        const cluster = clusters.find(cl => cl.id === selectedComment.clusterId);
                        if (!cluster) return null;
                        return (
                          <div className="p-3.5 rounded-xl bg-secondary/30 border border-border/30">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                              <span className="text-sm font-medium">{cluster.label}</span>
                              <span className="text-sm text-muted-foreground ml-auto">平均杠杆 {cluster.avgLeverageScore}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{cluster.description}</p>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Related comments */}
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">同集群评论</h4>
                      <div className="space-y-2">
                        {filteredComments
                          .filter(c => c.clusterId === selectedComment.clusterId && c.id !== selectedComment.id)
                          .slice(0, 3)
                          .map(c => (
                            <div
                              key={c.id}
                              className="p-2.5 rounded-lg bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-colors"
                              onClick={() => setSelectedComment(c)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="text-sm px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: intentColors[c.intent.primary] + '22', color: intentColors[c.intent.primary] }}
                                >
                                  {intentLabels[c.intent.primary]}
                                </span>
                                <span className="text-sm text-brand-cyan ml-auto">杠杆 {c.leverageScore}</span>
                              </div>
                              <p className="text-sm text-foreground/70 line-clamp-1">{c.content}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                    <Filter className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-base text-muted-foreground mb-1">点击地图节点</p>
                  <p className="text-sm text-muted-foreground/60">查看评论详情与意图解析</p>
                </div>
              )}

              {/* Cluster Legend */}
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-muted-foreground mb-3">集群图例</h4>
                <div className="space-y-2">
                  {clusters.map(cluster => {
                    const count = clusterFilter
                      ? cluster.id === clusterFilter ? cluster.comments.length : 0
                      : cluster.comments.length;
                    if (clusterFilter && cluster.id !== clusterFilter) return null;
                    return (
                      <button
                        key={cluster.id}
                        onClick={() => setClusterFilter(clusterFilter === cluster.id ? null : cluster.id)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-colors ${
                          clusterFilter === cluster.id ? 'bg-secondary' : 'hover:bg-secondary/50'
                        }`}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }} />
                        <span className="text-sm flex-1">{cluster.label}</span>
                        <span className="text-sm text-muted-foreground">{count} 条</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </GradientCard>
        </div>
      </div>
      <ImportModal />
    </AppShell>
  );
}
