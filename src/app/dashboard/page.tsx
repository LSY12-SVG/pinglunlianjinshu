'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AppShell, PageHeader } from '@/components/shared/page-header';
import { GradientCard } from '@/components/shared/gradient-card';
import { LeverageScoreRing } from '@/components/shared/leverage-score';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { ImportModal } from '@/components/shared/import-modal';
import { useAppStore } from '@/stores/app-store';
import { mockTimeSeries, intentLabels, intentColors } from '@/data/mock';
import {
  MessageSquare, TrendingUp, Layers, FileText, Star, Zap,
  ArrowUpRight, ArrowDownRight, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, BarChart, Bar,
} from 'recharts';

export default function DashboardPage() {
  const { comments, clusters, setImportModalOpen, isUsingImportedData } = useAppStore();

  const stats = useMemo(() => ({
    totalComments: comments.length,
    avgLeverage: comments.length > 0 ? (comments.reduce((s, c) => s + c.leverageScore, 0) / comments.length).toFixed(1) : '0',
    activeClusters: clusters.length,
    topIntent: (() => {
      if (comments.length === 0) return '-';
      const counts: Record<string, number> = {};
      comments.forEach(c => { counts[c.intent.primary] = (counts[c.intent.primary] || 0) + 1; });
      return intentLabels[Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'emotion'];
    })(),
  }), [comments, clusters]);

  const statCards = [
    { label: '总评论数', value: stats.totalComments.toLocaleString(), icon: MessageSquare, change: '+23%', up: true },
    { label: '平均杠杆分', value: stats.avgLeverage, icon: TrendingUp, change: '+5.2', up: true },
    { label: '活跃集群', value: stats.activeClusters, icon: Layers, change: '+2', up: true },
    { label: '首要意图', value: stats.topIntent, icon: FileText, change: '', up: true },
  ];

  const intentDistribution = useMemo(() =>
    Object.entries(intentLabels).map(([key, label]) => ({
      intent: label,
      count: comments.filter(c => c.intent.primary === key).length,
      fill: intentColors[key],
    })),
  [comments]);

  const radarData = useMemo(() => {
    if (comments.length === 0) return [];
    const avg = comments.reduce((s, c) => s + c.leverageScore, 0) / comments.length;
    return [
      { dimension: '新颖性', value: Math.round(avg * 0.9) },
      { dimension: '共鸣度', value: Math.round(avg * 1.05) },
      { dimension: '可执行性', value: Math.round(avg * 0.75) },
      { dimension: '稀缺性', value: Math.round(avg * 0.65) },
      { dimension: '情感深度', value: Math.round(avg * 1.0) },
    ];
  }, [comments]);

  const topComments = useMemo(() =>
    [...comments].sort((a, b) => b.leverageScore - a.leverageScore).slice(0, 5),
  [comments]);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        subtitle={isUsingImportedData ? `已导入 ${comments.length} 条真实评论` : '评论区创作燃料总览'}
        actions={
          <div className="flex items-center gap-3">
            <AIStatusIndicator
              status={{ stage: 'complete', message: `已分析 ${comments.length} 条评论 · ${clusters.length} 个集群`, progress: 100 }}
            />
            <Button size="sm" className="gap-2" onClick={() => setImportModalOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> 导入评论
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          >
            <GradientCard gradient>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <s.icon className="w-4 h-4 text-brand-purple" />
                  </div>
                </div>
                <div className="text-2xl font-bold mb-1">{s.value}</div>
                {s.change && (
                  <div className={`flex items-center gap-1 text-xs ${s.up ? 'text-green-400' : 'text-red-400'}`}>
                    {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {s.change} 较上周
                  </div>
                )}
              </div>
            </GradientCard>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <motion.div
          className="col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <GradientCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">评论趋势 & 杠杆分</h3>
                <span className="text-xs text-muted-foreground">近 7 天</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTimeSeries}>
                    <defs>
                      <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52E5FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#52E5FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7B61FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7B61FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#7A7A8C', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#7A7A8C', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#E8E8ED' }} />
                    <Area type="monotone" dataKey="comments" stroke="#52E5FF" fill="url(#gradCyan)" strokeWidth={2} />
                    <Area type="monotone" dataKey="leverage" stroke="#7B61FF" fill="url(#gradPurple)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <GradientCard>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4">杠杆分维度</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: '#7A7A8C', fontSize: 10 }} />
                    <Radar dataKey="value" stroke="#7B61FF" fill="#7B61FF" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GradientCard>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <GradientCard>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4">意图分布</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={intentDistribution} layout="vertical">
                    <XAxis type="number" tick={{ fill: '#7A7A8C', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="intent" tick={{ fill: '#7A7A8C', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {intentDistribution.map((entry, index) => (
                        <rect key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        <motion.div
          className="col-span-2"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <GradientCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">高杠杆评论 TOP 5</h3>
                <Zap className="w-4 h-4 text-brand-cyan" />
              </div>
              <div className="space-y-3">
                {topComments.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
                    className="flex items-start gap-4 p-3 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <LeverageScoreRing score={c.leverageScore} size={40} showLabel={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">{c.author}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: intentColors[c.intent.primary] + '22', color: intentColors[c.intent.primary] }}
                        >
                          {intentLabels[c.intent.primary]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{c.content}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3 h-3" /> {c.likes}
                    </div>
                  </motion.div>
                ))}
                {topComments.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-2">暂无评论数据</p>
                    <Button size="sm" variant="outline" onClick={() => setImportModalOpen(true)} className="gap-2">
                      <Upload className="w-3.5 h-3.5" /> 导入评论
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </GradientCard>
        </motion.div>
      </div>

      <ImportModal />
    </AppShell>
  );
}
