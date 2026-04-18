'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell, PageHeader } from '@/components/shared/page-header';
import { GradientCard } from '@/components/shared/gradient-card';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { mockFeedback, mockTimeSeries, mockComments, intentLabels, intentColors } from '@/data/mock';
import {
  TrendingUp, TrendingDown, Eye, Users, Zap, BarChart3,
  ArrowUpRight, ArrowDownRight, RefreshCcw, Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar,
} from 'recharts';

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  performance: { icon: Eye, color: '#52E5FF', label: '内容表现' },
  audience: { icon: Users, color: '#7B61FF', label: '受众行为' },
  algorithm: { icon: Zap, color: '#FF4FD8', label: '算法推荐' },
};

export default function FeedbackLoopPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const performanceFeedback = mockFeedback.filter(f => f.type === 'performance');
  const audienceFeedback = mockFeedback.filter(f => f.type === 'audience');
  const algorithmFeedback = mockFeedback.filter(f => f.type === 'algorithm');

  return (
    <AppShell>
      <PageHeader
        title="反馈回路"
        subtitle="发布后效果追踪，数据驱动下一轮迭代"
        actions={
          <div className="flex items-center gap-3">
            <AIStatusIndicator
              status={isRefreshing
                ? { stage: 'processing', message: '正在同步最新数据...', progress: 60 }
                : { stage: 'complete', message: '数据已同步 · 最近更新 2 分钟前', progress: 100 }
              }
            />
            <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {mockFeedback.slice(0, 3).map((f, i) => {
          const config = typeConfig[f.type];
          const Icon = config.icon;
          const isUp = f.change > 0;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <GradientCard gradient>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">{f.metric}</span>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.color + '22' }}>
                      <Icon className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-1">{f.value}{f.metric.includes('率') ? '%' : ''}</div>
                  <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isUp ? '+' : ''}{f.change} vs 上期
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{f.insight}</p>
                </div>
              </GradientCard>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Trend Chart */}
        <motion.div
          className="col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GradientCard>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">效果趋势</h3>
                <Tabs defaultValue="engagement">
                  <TabsList className="h-7">
                    <TabsTrigger value="engagement" className="text-[10px] h-5">互动率</TabsTrigger>
                    <TabsTrigger value="leverage" className="text-[10px] h-5">杠杆分</TabsTrigger>
                    <TabsTrigger value="comments" className="text-[10px] h-5">评论数</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockTimeSeries}>
                    <defs>
                      <linearGradient id="fbGradCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52E5FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#52E5FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fbGradPink" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4FD8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF4FD8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: '#7A7A8C', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#7A7A8C', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#12121A', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="engagement" stroke="#52E5FF" fill="url(#fbGradCyan)" strokeWidth={2} />
                    <Area type="monotone" dataKey="leverage" stroke="#FF4FD8" fill="url(#fbGradPink)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GradientCard>
        </motion.div>

        {/* Feedback Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GradientCard className="h-full">
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-purple" />
                AI 洞察
              </h3>
              <div className="space-y-3">
                {mockFeedback.map(f => {
                  const config = typeConfig[f.type];
                  const isUp = f.change > 0;
                  return (
                    <div key={f.id} className="p-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.color }} />
                        <span className="text-[10px] font-medium">{f.metric}</span>
                        <span className={`text-[10px] ml-auto ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? '+' : ''}{f.change}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{f.insight}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </GradientCard>
        </motion.div>
      </div>

      {/* Iteration Suggestions */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GradientCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-brand-purple" />
                下一步迭代建议
              </h3>
              <Badge variant="outline" className="text-[10px]">基于反馈数据自动生成</Badge>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  title: '增加情感钩子密度',
                  desc: '完播率提升15.2%，主要归因于评论区原话的情感钩子效果。建议下次脚本前30秒增加2个情感锚点。',
                  priority: '高',
                  color: '#FF4FD8',
                },
                {
                  title: '深化方法论段落',
                  desc: '收藏率提升1.4%，方法论段落收藏率最高。建议在主体段增加更多可执行的框架和步骤。',
                  priority: '中',
                  color: '#7B61FF',
                },
                {
                  title: '优化搜索关键词',
                  desc: '"创业复盘"搜索排名上升至第3位。建议在标题和描述中继续强化此关键词布局。',
                  priority: '低',
                  color: '#52E5FF',
                },
              ].map((suggestion, i) => (
                <div key={i} className="p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: suggestion.color }} />
                    <span className="text-xs font-semibold">{suggestion.title}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{suggestion.desc}</p>
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: suggestion.color + '44', color: suggestion.color }}>
                    优先级: {suggestion.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </GradientCard>
      </motion.div>
    </AppShell>
  );
}
