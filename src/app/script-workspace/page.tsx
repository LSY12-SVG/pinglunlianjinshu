'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppShell, PageHeader } from '@/components/shared/page-header';
import { GradientCard } from '@/components/shared/gradient-card';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { Typewriter } from '@/components/shared/typewriter';
import { mockScript, segmentTypeLabels, intentLabels, intentColors, mockComments } from '@/data/mock';
import { ScriptSegment } from '@/types';
import { useAIStream } from '@/hooks/use-ai-stream';
import {
  FileText, Wand2, Download, Edit3, Check, X,
  GripVertical, Sparkles, Link2, Copy,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const segmentColors: Record<string, string> = {
  hook: '#FF4FD8',
  opening: '#7B61FF',
  body: '#52E5FF',
  turn: '#4ADE80',
  climax: '#FFB347',
  closing: '#818CF8',
  cta: '#F472B6',
};

const REWRITE_SYSTEM_PROMPT = `你是 Comment Alchemy 的 AI 脚本改写引擎。你的职责是在保持创作者风格的前提下改写脚本段落。

规则：
1. 严格保持原文的语气、调性和节奏感
2. 改写要更精炼、更有冲击力
3. 保留原文的核心信息和情感锚点
4. 用中文输出，风格要接地气、有力量感
5. 只输出改写后的文本，不要加任何解释或前缀`;

function buildRewritePrompt(segment: ScriptSegment, fullScriptTitle: string): string {
  const sourceTexts = segment.sourceComments
    .map(cid => {
      const c = mockComments.find(cm => cm.id === cid);
      return c ? `"${c.content}" (杠杆${c.leverageScore}, ${intentLabels[c.intent.primary]})` : null;
    })
    .filter(Boolean)
    .join('\n');

  return `请改写以下脚本段落，保持风格守恒。

## 脚本标题：${fullScriptTitle}
## 当前段落类型：${segmentTypeLabels[segment.type]}
## 当前内容：
${segment.content}

${sourceTexts ? `## 来源评论（改写时可参考这些原始洞察）：\n${sourceTexts}` : ''}

请直接输出改写后的文本，不要加任何解释、前缀或标注。改写要更有冲击力但保持原有风格调性。`;
}

export default function ScriptWorkspacePage() {
  const [segments, setSegments] = useState<ScriptSegment[]>(mockScript.segments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const { content: rewriteContent, status: rewriteStatus, startStream: startRewriteStream, reset: resetRewrite } = useAIStream();

  const isRewriting = ['analyzing', 'processing', 'generating'].includes(rewriteStatus.stage);

  const handleEdit = (segment: ScriptSegment) => {
    setEditingId(segment.id);
    setEditContent(segment.content);
  };

  const handleSave = (id: string) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, content: editContent } : s));
    setEditingId(null);
  };

  const handleRewrite = useCallback(async (segment: ScriptSegment) => {
    setRewritingId(segment.id);
    // Clear any previous rewrite for this segment
    setSegments(prev => prev.map(s => s.id === segment.id ? { ...s, aiRewrite: undefined } : s));
    resetRewrite();

    const prompt = buildRewritePrompt(segment, mockScript.title);
    await startRewriteStream(REWRITE_SYSTEM_PROMPT, prompt);
  }, [startRewriteStream, resetRewrite]);

  // When streaming completes, update the segment with the rewrite
  const handleAcceptRewrite = (id: string) => {
    setSegments(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, content: rewriteContent, aiRewrite: undefined };
      }
      return s;
    }));
    setRewritingId(null);
    resetRewrite();
  };

  const handleRejectRewrite = () => {
    setRewritingId(null);
    resetRewrite();
  };

  const handleExport = () => {
    const fullScript = segments.map(s => `[${segmentTypeLabels[s.type]}]\n${s.content}`).join('\n\n');
    navigator.clipboard.writeText(fullScript);
  };

  const totalWords = segments.reduce((acc, s) => acc + s.wordCount, 0);

  return (
    <AppShell>
      <PageHeader
        title="脚本工作台"
        subtitle="分段编辑 · AI改写 · 风格守恒"
        actions={
          <div className="flex items-center gap-3">
            <AIStatusIndicator
              status={isRewriting
                ? rewriteStatus
                : { stage: 'idle', message: '' }
              }
            />
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Copy className="w-3.5 h-3.5" /> 复制脚本
            </Button>
            <Button size="sm" className="gap-2" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" /> 导出
            </Button>
          </div>
        }
      />

      <div className="flex gap-4">
        {/* Script Editor */}
        <div className="flex-1 space-y-3">
          {/* Script Header */}
          <GradientCard>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold">{mockScript.title}</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  总字数 {totalWords} · {segments.length} 段 · 基于激进版策略生成
                </p>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(segmentTypeLabels).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: segmentColors[key] }} />
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </GradientCard>

          {/* Segments */}
          {segments.map((segment, i) => (
            <motion.div
              key={segment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GradientCard>
                <div className="p-5">
                  {/* Segment Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground/30 cursor-grab" />
                    <Badge
                      className="text-[10px]"
                      style={{ backgroundColor: segmentColors[segment.type] + '22', color: segmentColors[segment.type] }}
                    >
                      {segmentTypeLabels[segment.type]}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">{segment.wordCount} 字</span>
                    {segment.sourceComments.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{segment.sourceComments.length} 条评论源</span>
                      </div>
                    )}
                  </div>

                  {/* Content / Editing */}
                  {editingId === segment.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        className="min-h-[100px] bg-secondary/30 border-border text-sm resize-none rounded-xl"
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => handleSave(segment.id)} className="gap-1">
                          <Check className="w-3 h-3" /> 保存
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="gap-1">
                          <X className="w-3 h-3" /> 取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/80 leading-relaxed">{segment.content}</p>
                  )}

                  {/* AI Rewrite - streaming version */}
                  <AnimatePresence>
                    {rewritingId === segment.id && (isRewriting || rewriteContent) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <div className="p-3 rounded-xl border border-brand-purple/20 bg-brand-purple/5">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3 h-3 text-brand-purple" />
                            <span className="text-[10px] font-semibold text-brand-purple">AI 改写版本</span>
                            {isRewriting && (
                              <span className="text-[10px] text-brand-purple/60">
                                {rewriteStatus.stage === 'analyzing' ? '连接中...' : '生成中...'}
                              </span>
                            )}
                          </div>
                          {isRewriting && !rewriteContent ? (
                            <div className="flex items-center gap-2">
                              <motion.div className="flex gap-1">
                                {[0, 1, 2].map(j => (
                                  <motion.div
                                    key={j}
                                    className="w-1.5 h-1.5 rounded-full bg-brand-purple"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: j * 0.2 }}
                                  />
                                ))}
                              </motion.div>
                              <span className="text-xs text-muted-foreground">正在分析风格并生成改写...</span>
                            </div>
                          ) : rewriteContent ? (
                            <>
                              <Typewriter content={rewriteContent} className="text-sm text-foreground/70 whitespace-pre-wrap leading-relaxed" />
                              {!isRewriting && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.3 }}
                                  className="flex items-center gap-2 mt-2"
                                >
                                  <Button size="sm" variant="outline" onClick={() => handleAcceptRewrite(segment.id)} className="gap-1 text-[10px] h-7">
                                    <Check className="w-3 h-3" /> 采纳
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={handleRejectRewrite} className="gap-1 text-[10px] h-7">
                                    <X className="w-3 h-3" /> 拒绝
                                  </Button>
                                  <span className="text-[10px] text-muted-foreground ml-auto">由 DeepSeek V3 生成</span>
                                </motion.div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost" size="sm"
                      className="gap-1 text-[10px] h-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEdit(segment)}
                      disabled={isRewriting}
                    >
                      <Edit3 className="w-3 h-3" /> 编辑
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="gap-1 text-[10px] h-7 text-muted-foreground hover:text-brand-purple"
                      onClick={() => handleRewrite(segment)}
                      disabled={isRewriting}
                    >
                      {isRewriting && rewritingId === segment.id ? (
                        <>
                          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                            <Wand2 className="w-3 h-3" />
                          </motion.div>
                          改写中...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3" /> AI改写
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Source Comments */}
                  {segment.sourceComments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground mb-2 block">来源评论</span>
                      <div className="space-y-1.5">
                        {segment.sourceComments.map(cid => {
                          const c = mockComments.find(cm => cm.id === cid);
                          if (!c) return null;
                          return (
                            <div key={cid} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: intentColors[c.intent.primary] }} />
                              <span className="text-[10px] text-foreground/60 line-clamp-1 flex-1">{c.content}</span>
                              <span className="text-[10px] text-muted-foreground">杠杆{c.leverageScore}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </GradientCard>
            </motion.div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="w-[300px] space-y-4">
          {/* Script Stats */}
          <GradientCard>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4">脚本统计</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">总字数</span>
                  <span className="text-sm font-bold">{totalWords}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">段落数</span>
                  <span className="text-sm font-bold">{segments.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">评论源</span>
                  <span className="text-sm font-bold">{new Set(segments.flatMap(s => s.sourceComments)).size} 条</span>
                </div>
                <Separator />
                <div>
                  <span className="text-xs text-muted-foreground block mb-2">段落分布</span>
                  <div className="flex gap-1 h-3 rounded-full overflow-hidden">
                    {segments.map(s => (
                      <div
                        key={s.id}
                        className="rounded-full transition-all"
                        style={{
                          backgroundColor: segmentColors[s.type],
                          flex: s.wordCount,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </GradientCard>

          {/* Style Consistency */}
          <GradientCard>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-purple" />
                风格守恒指数
              </h3>
              <div className="space-y-3">
                {[
                  { label: '语气一致', value: 92 },
                  { label: '节奏匹配', value: 85 },
                  { label: '情感连贯', value: 88 },
                  { label: '品牌调性', value: 90 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-medium">{item.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full brand-gradient"
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GradientCard>

          {/* AI Rewrite Guide */}
          <GradientCard>
            <div className="p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-brand-pink" />
                AI 改写说明
              </h3>
              <div className="space-y-2 text-[10px] text-muted-foreground">
                <p>点击段落下方的"AI改写"按钮，AI 将基于评论洞察在保持风格的前提下改写该段落。</p>
                <p>改写采用流式输出，你可以实时查看生成过程，并选择"采纳"或"拒绝"。</p>
                <p className="text-brand-purple">当前模型：DeepSeek V3</p>
              </div>
            </div>
          </GradientCard>
        </div>
      </div>
    </AppShell>
  );
}
