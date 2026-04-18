'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell, PageHeader } from '@/components/shared/page-header';
import { GradientCard } from '@/components/shared/gradient-card';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { mockStrategies, strategyTypeLabels, intentLabels, intentColors, mockComments } from '@/data/mock';
import { StrategyMode } from '@/types';
import { useAIStream } from '@/hooks/use-ai-stream';
import { Typewriter } from '@/components/shared/typewriter';
import { Shield, Scale, Flame, ChevronRight, Sparkles, AlertTriangle, Target, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

const modeConfig: Record<StrategyMode, { icon: React.ElementType; color: string; label: string }> = {
  conservative: { icon: Shield, color: '#4ADE80', label: '保守版' },
  balanced: { icon: Scale, color: '#52E5FF', label: '平衡版' },
  aggressive: { icon: Flame, color: '#FF4FD8', label: '激进版' },
};

const SYSTEM_PROMPT = `你是 Comment Alchemy 的 AI 创作策略引擎。你的职责是基于评论区的数据分析，生成风格守恒的短视频脚本大纲。

规则：
1. 必须严格保持创作者已有的语言风格和调性
2. 脚本大纲必须明确包含：钩子→开场→主体→转折→高潮→收尾→行动号召 的结构
3. 每个环节要标注引用了哪条评论的洞察
4. 大纲要具体到可以立即展开写成完整脚本的程度
5. 用中文输出，风格要接地气、有力量感、不啰嗦`;

function buildStrategyPrompt(mode: StrategyMode): string {
  const strategy = mockStrategies.find(s => s.type === mode)!;
  const highLeverageComments = mockComments
    .filter(c => c.leverageScore >= 70)
    .sort((a, b) => b.leverageScore - a.leverageScore)
    .slice(0, 8);

  const commentsText = highLeverageComments.map(c =>
    `[${intentLabels[c.intent.primary]}|杠杆${c.leverageScore}] "${c.content}" — ${c.author}`
  ).join('\n');

  return `基于以下评论数据和策略方向，生成一个完整的短视频脚本大纲：

## 策略模式：${strategyTypeLabels[mode]} — ${strategy.title}
策略描述：${strategy.description}
核心动作：${strategy.keyMoves.join('；')}
风险等级：${strategy.riskLevel}% | 预期影响：${strategy.estimatedImpact}%

## 高杠杆评论（来源数据）：
${commentsText}

请生成风格守恒的脚本大纲，每个环节用【钩子】【开场】【主体】【转折】【高潮】【收尾】【行动号召】标注，并说明引用了哪条评论的洞察。`;
}

export default function StrategyStudioPage() {
  const [activeMode, setActiveMode] = useState<StrategyMode>('balanced');
  const { content: generatedOutline, status: aiStatus, startStream, reset: resetStream } = useAIStream();
  const isGenerating = ['analyzing', 'processing', 'generating'].includes(aiStatus.stage);

  const activeStrategy = mockStrategies.find(s => s.type === activeMode)!;

  const handleGenerate = useCallback(() => {
    const prompt = buildStrategyPrompt(activeMode);
    startStream(SYSTEM_PROMPT, prompt);
  }, [activeMode, startStream]);

  const handleModeChange = useCallback((mode: StrategyMode) => {
    setActiveMode(mode);
    resetStream();
  }, [resetStream]);

  return (
    <AppShell>
      <PageHeader
        title="策略工坊"
        subtitle="基于评论意图生成风格守恒的创作策略"
        actions={
          <AIStatusIndicator
            status={isGenerating
              ? aiStatus
              : generatedOutline
                ? { stage: 'complete', message: '脚本大纲已生成', progress: 100 }
                : { stage: 'complete', message: '已解析 6 个意图集群', progress: 100 }
            }
          />
        }
      />

      {/* Mode Selector */}
      <div className="flex gap-3 mb-8">
        {(Object.entries(modeConfig) as [StrategyMode, typeof modeConfig.conservative][]).map(([mode, config]) => {
          const Icon = config.icon;
          return (
            <motion.button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${
                activeMode === mode
                  ? 'border-transparent bg-card shadow-lg'
                  : 'border-border bg-transparent hover:bg-secondary/30'
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: config.color + '22' }}>
                <Icon className="w-5 h-5" style={{ color: config.color }} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold">{config.label}</div>
                <div className="text-sm text-muted-foreground/80">
                  {mode === 'conservative' ? '低风险稳健' : mode === 'balanced' ? '中等风险' : '高风险高回报'}
                </div>
              </div>
              {activeMode === mode && (
                <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: config.color }} />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Strategy Detail */}
        <div className="col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GradientCard gradient>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: modeConfig[activeMode].color + '22' }}
                    >
                      {(() => { const Icon = modeConfig[activeMode].icon; return <Icon className="w-6 h-6" style={{ color: modeConfig[activeMode].color }} />; })()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{activeStrategy.title}</h2>
                      <p className="text-sm text-muted-foreground/80">{strategyTypeLabels[activeMode]} · 风格守恒策略</p>
                    </div>
                  </div>

                  <p className="text-sm text-foreground/80 mb-6">{activeStrategy.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4" style={{ color: modeConfig[activeMode].color }} />
                        <span className="text-xs font-semibold">风险等级</span>
                      </div>
                      <Progress value={activeStrategy.riskLevel} className="h-2 mb-1" />
                      <span className="text-sm text-muted-foreground/80">{activeStrategy.riskLevel}%</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-secondary/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4" style={{ color: modeConfig[activeMode].color }} />
                        <span className="text-xs font-semibold">预期影响</span>
                      </div>
                      <Progress value={activeStrategy.estimatedImpact} className="h-2 mb-1" />
                      <span className="text-sm text-muted-foreground/80">{activeStrategy.estimatedImpact}%</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold mb-3">核心策略动作</h3>
                  <div className="space-y-2">
                    {activeStrategy.keyMoves.map((move, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.08 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: modeConfig[activeMode].color + '22', color: modeConfig[activeMode].color }}>
                          {i + 1}
                        </div>
                        <span className="text-sm">{move}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GradientCard>

              {/* Script Outline - AI Streaming */}
              <GradientCard className="mt-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-brand-purple" />
                      脚本大纲预览
                    </h3>
                    <div className="flex items-center gap-2">
                      {generatedOutline && !isGenerating && (
                        <Button variant="ghost" size="sm" onClick={resetStream} className="text-[10px]">
                          重新生成
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="gap-1"
                      >
                        {isGenerating ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </motion.div>
                            AI 生成中...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            生成大纲
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isGenerating && !generatedOutline ? (
                    <div className="space-y-3">
                      <AIStatusIndicator status={aiStatus} />
                      <div className="p-4 rounded-2xl bg-secondary/20">
                        <div className="flex items-center gap-2">
                          <motion.div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-brand-purple"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                              />
                            ))}
                          </motion.div>
                          <span className="text-sm text-muted-foreground">正在解析评论意图并匹配风格模板...</span>
                        </div>
                      </div>
                    </div>
                  ) : generatedOutline ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 rounded-2xl bg-secondary/20"
                    >
                      <Typewriter content={generatedOutline} className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed" />
                      {aiStatus.stage === 'complete' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="mt-4 flex items-center gap-3"
                        >
                          <Link href="/script-workspace">
                            <Button size="sm" className="gap-2">
                              进入脚本工作台 <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                          <span className="text-sm text-muted-foreground/70">由 DeepSeek V3 生成</span>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-secondary/10 text-center">
                      <p className="text-sm text-muted-foreground mb-2">点击"生成大纲"预览风格守恒脚本框架</p>
                      <p className="text-sm text-muted-foreground/60">AI 将基于高杠杆评论生成完整脚本结构</p>
                    </div>
                  )}
                </div>
              </GradientCard>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Source Comments Panel */}
        <div>
          <GradientCard className="h-full">
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4">策略来源评论</h3>
              <div className="space-y-3">
                {mockComments
                  .filter(c => c.leverageScore >= 70)
                  .sort((a, b) => b.leverageScore - a.leverageScore)
                  .slice(0, 6)
                  .map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-3 rounded-2xl bg-secondary/20 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: intentColors[c.intent.primary] + '22', color: intentColors[c.intent.primary] }}
                        >
                          {intentLabels[c.intent.primary]}
                        </span>
                        <span className="text-sm text-muted-foreground/80 ml-auto">杠杆 {c.leverageScore}</span>
                      </div>
                      <p className="text-xs text-foreground/70 line-clamp-2">{c.content}</p>
                    </motion.div>
                  ))}
              </div>
            </div>
          </GradientCard>
        </div>
      </div>
    </AppShell>
  );
}
