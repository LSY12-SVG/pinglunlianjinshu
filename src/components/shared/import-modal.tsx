'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { parsePastedText, parseCSV, parseDouyinJSON, rawToComment } from '@/lib/comment-parser';
import { Comment, CommentCluster } from '@/types';
import { intentLabels, intentColors } from '@/data/mock';
import {
  Upload, FileText, Clipboard, Globe, X, Sparkles,
  AlertCircle, CheckCircle2, Loader2, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AIStatusIndicator } from '@/components/shared/ai-status-indicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedPreview {
  author: string;
  content: string;
  likes?: number;
}

export function ImportModal() {
  const { importModalOpen, setImportModalOpen, setComments, setClusters, importStatus, setImportStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState('paste');
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<ParsedPreview[]>([]);
  const [rawComments, setRawComments] = useState<ReturnType<typeof parsePastedText>>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setImportModalOpen(false);
    setPasteText('');
    setPreview([]);
    setRawComments([]);
    setImportStatus({ stage: 'idle', message: '' });
  };

  const handlePasteParse = useCallback(() => {
    const parsed = parsePastedText(pasteText);
    setRawComments(parsed);
    setPreview(parsed.map(p => ({ author: p.author, content: p.content, likes: p.likes })));
  }, [pasteText]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.csv')) {
        const parsed = parseCSV(text);
        setRawComments(parsed);
        setPreview(parsed.map(p => ({ author: p.author, content: p.content, likes: p.likes })));
      } else if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(text);
          const parsed = parseDouyinJSON(json);
          setRawComments(parsed);
          setPreview(parsed.map(p => ({ author: p.author, content: p.content, likes: p.likes })));
        } catch {
          setImportStatus({ stage: 'error', message: 'JSON 格式解析失败' });
        }
      } else {
        const parsed = parsePastedText(text);
        setRawComments(parsed);
        setPreview(parsed.map(p => ({ author: p.author, content: p.content, likes: p.likes })));
      }
    };
    reader.readAsText(file);
  }, [setImportStatus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleAnalyze = useCallback(async () => {
    if (rawComments.length === 0) return;

    setImportStatus({ stage: 'analyzing', message: `正在分析 ${rawComments.length} 条评论...`, progress: 10 });

    try {
      // Call AI analysis API
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: rawComments }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      setImportStatus({ stage: 'processing', message: '正在处理分析结果...', progress: 70 });
      const { analysis } = await response.json();

      // Parse AI response - extract JSON from possible markdown blocks
      let analysisResults: Array<{
        index: number;
        sentiment: string;
        intent: { primary: string; confidence: number; description: string };
        leverageScore: number;
        tags: string[];
      }> = [];

      try {
        const cleaned = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        analysisResults = JSON.parse(cleaned);
      } catch {
        // Fallback: assign default values
        analysisResults = rawComments.map((_, i) => ({
          index: i,
          sentiment: 'neutral',
          intent: { primary: 'emotion', confidence: 0.5, description: '自动分类' },
          leverageScore: 50,
          tags: ['导入'],
        }));
      }

      // Merge analysis into comments
      const comments: Comment[] = rawComments.map((raw, i) => {
        const a = analysisResults.find(r => r.index === i) || analysisResults[i];
        const comment = rawToComment(raw, i);
        if (a) {
          comment.sentiment = a.sentiment as Comment['sentiment'];
          comment.intent = {
            primary: a.intent.primary as Comment['intent']['primary'],
            confidence: a.intent.confidence,
            description: a.intent.description,
          };
          comment.leverageScore = a.leverageScore;
          comment.tags = a.tags;
        }
        return comment;
      });

      setImportStatus({ stage: 'processing', message: '正在聚类...', progress: 85 });

      // Simple clustering by intent type
      const clusterMap = new Map<string, Comment[]>();
      comments.forEach(c => {
        const key = c.intent.primary;
        if (!clusterMap.has(key)) clusterMap.set(key, []);
        clusterMap.get(key)!.push(c);
      });

      const clusterColors = ['#7B61FF', '#52E5FF', '#FF4FD8', '#4ADE80', '#FFB347', '#F472B6', '#818CF8'];
      let colorIdx = 0;
      const clusters: CommentCluster[] = [];

      clusterMap.forEach((clusterComments, intentType) => {
        const avgX = 15 + Math.random() * 70;
        const avgY = 15 + Math.random() * 70;
        const color = clusterColors[colorIdx % clusterColors.length];
        colorIdx++;

        const assignedComments = clusterComments.map(c => ({ ...c, clusterId: `cluster-imported-${intentType}` }));
        comments.forEach((c, i) => {
          if (c.intent.primary === intentType) {
            comments[i] = { ...comments[i], clusterId: `cluster-imported-${intentType}` };
          }
        });

        clusters.push({
          id: `cluster-imported-${intentType}`,
          label: intentLabels[intentType] || intentType,
          comments: assignedComments,
          centroid: { x: avgX, y: avgY },
          color,
          avgLeverageScore: Math.round(assignedComments.reduce((s, c) => s + c.leverageScore, 0) / assignedComments.length),
          dominantIntent: intentType as CommentCluster['dominantIntent'],
          description: `${intentLabels[intentType] || intentType}类评论集群，共 ${assignedComments.length} 条`,
        });
      });

      setComments(comments);
      setClusters(clusters);
      setImportStatus({ stage: 'complete', message: `已导入 ${comments.length} 条评论，生成 ${clusters.length} 个集群`, progress: 100 });

      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (err) {
      setImportStatus({ stage: 'error', message: '分析失败，请检查网络或重试', progress: 0 });
    }
  }, [rawComments, setComments, setClusters, setImportStatus]);

  if (!importModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-[680px] max-h-[85vh] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
            <div>
              <h2 className="text-lg font-bold">导入评论</h2>
              <p className="text-xs text-muted-foreground mt-0.5">粘贴文本、上传 CSV 或连接抖音开放平台</p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6 pt-4">
            <TabsList className="w-full mb-4 bg-secondary/50">
              <TabsTrigger value="paste" className="flex-1 gap-2 text-xs">
                <Clipboard className="w-3.5 h-3.5" /> 粘贴文本
              </TabsTrigger>
              <TabsTrigger value="csv" className="flex-1 gap-2 text-xs">
                <FileText className="w-3.5 h-3.5" /> CSV / JSON
              </TabsTrigger>
              <TabsTrigger value="douyin" className="flex-1 gap-2 text-xs">
                <Globe className="w-3.5 h-3.5" /> 抖音平台
              </TabsTrigger>
            </TabsList>

            {/* Paste Tab */}
            <TabsContent value="paste" className="mt-0">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  每行一条评论。支持格式：纯文本 / "作者：内容" / "内容 —— 作者"
                </p>
                <Textarea
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  placeholder={"能不能讲讲你是怎么从0到1做起来的？\n创业小王：建议出个失败案例系列\n你说的那个转行经历太真实了 —— Alice"}
                  className="min-h-[160px] bg-secondary/30 border-border text-sm resize-none rounded-xl"
                />
                <Button onClick={handlePasteParse} disabled={!pasteText.trim()} size="sm" className="gap-2">
                  <Sparkles className="w-3.5 h-3.5" /> 解析评论
                </Button>
              </div>
            </TabsContent>

            {/* CSV Tab */}
            <TabsContent value="csv" className="mt-0">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  支持 CSV（含表头：内容,作者,点赞）和抖音导出的 JSON 文件
                </p>
                <div
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                    dragOver ? 'border-brand-purple bg-brand-purple/5' : 'border-border hover:border-brand-purple/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">拖拽文件到此处，或</p>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    选择文件
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-3">支持 .csv .json .txt</p>
                </div>
              </div>
            </TabsContent>

            {/* Douyin Tab */}
            <TabsContent value="douyin" className="mt-0">
              <DouyinImportTab onImport={(parsed) => {
                setRawComments(parsed);
                setPreview(parsed.map(p => ({ author: p.author, content: p.content, likes: p.likes })));
              }} />
            </TabsContent>
          </Tabs>

          {/* Preview + Actions */}
          {preview.length > 0 && (
            <div className="px-6 pb-6">
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">预览 ({preview.length} 条)</h3>
                  <Button variant="ghost" size="sm" className="text-[10px] gap-1 text-muted-foreground" onClick={() => { setPreview([]); setRawComments([]); }}>
                    <Trash2 className="w-3 h-3" /> 清除
                  </Button>
                </div>

                <ScrollArea className="max-h-[180px]">
                  <div className="space-y-1.5">
                    {preview.slice(0, 20).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                        <span className="text-[10px] text-muted-foreground w-5 shrink-0">{i + 1}</span>
                        <span className="text-[10px] text-brand-purple shrink-0">{p.author}</span>
                        <span className="text-xs text-foreground/70 line-clamp-1 flex-1">{p.content}</span>
                        {p.likes !== undefined && p.likes > 0 && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{p.likes} 赞</span>
                        )}
                      </div>
                    ))}
                    {preview.length > 20 && (
                      <p className="text-[10px] text-muted-foreground text-center">还有 {preview.length - 20} 条未显示...</p>
                    )}
                  </div>
                </ScrollArea>

                {/* AI Status */}
                {importStatus.stage !== 'idle' && (
                  <div className="mt-3">
                    <AIStatusIndicator status={importStatus} />
                  </div>
                )}

                {/* Import Button */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    AI 将自动分析意图、计算杠杆分并聚类
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleClose}>取消</Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleAnalyze}
                      disabled={rawComments.length === 0 || ['analyzing', 'processing'].includes(importStatus.stage)}
                    >
                      {['analyzing', 'processing'].includes(importStatus.stage) ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> 分析中...
                        </>
                      ) : importStatus.stage === 'complete' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已完成
                        </>
                      ) : importStatus.stage === 'error' ? (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" /> 重试
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> 开始分析并导入
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Douyin Import Tab
function DouyinImportTab({ onImport }: { onImport: (parsed: ReturnType<typeof parsePastedText>) => void }) {
  const [method, setMethod] = useState<'url' | 'json'>('url');
  const [videoUrl, setVideoUrl] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUrlFetch = useCallback(async () => {
    if (!videoUrl.trim()) return;
    setLoading(true);
    setError('');

    try {
      // Try to extract video ID from Douyin URL
      const videoIdMatch = videoUrl.match(/video\/(\d+)/) || videoUrl.match(/modal_id=(\d+)/) || videoUrl.match(/\/(\d{19})/);
      if (!videoIdMatch) {
        setError('无法从 URL 中提取视频 ID，请检查链接格式');
        setLoading(false);
        return;
      }

      // Use our API to fetch comments via Douyin Open Platform
      const response = await fetch('/api/douyin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, videoId: videoIdMatch[1] }),
      });

      if (!response.ok) {
        throw new Error('获取评论失败');
      }

      const data = await response.json();
      const parsed = parseDouyinJSON(data.comments || data);
      if (parsed.length === 0) {
        setError('未能获取到评论，请尝试粘贴 JSON 数据方式');
      } else {
        onImport(parsed);
      }
    } catch {
      setError('获取失败。抖音开放平台需要 OAuth 授权，请尝试下方"粘贴 JSON"方式');
    } finally {
      setLoading(false);
    }
  }, [videoUrl, onImport]);

  const handleJsonParse = useCallback(() => {
    try {
      const json = JSON.parse(jsonText);
      const parsed = parseDouyinJSON(json);
      if (parsed.length === 0) {
        setError('未能从 JSON 中解析出评论');
      } else {
        onImport(parsed);
        setError('');
      }
    } catch {
      setError('JSON 格式错误，请检查');
    }
  }, [jsonText, onImport]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-2">
        <Button
          variant={method === 'url' ? 'default' : 'outline'}
          size="sm"
          className="text-xs gap-1"
          onClick={() => setMethod('url')}
        >
          <Globe className="w-3 h-3" /> 视频链接
        </Button>
        <Button
          variant={method === 'json' ? 'default' : 'outline'}
          size="sm"
          className="text-xs gap-1"
          onClick={() => setMethod('json')}
        >
          <FileText className="w-3 h-3" /> 粘贴 JSON
        </Button>
      </div>

      {method === 'url' ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            粘贴抖音视频链接，自动获取评论（需要抖音开放平台授权）
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.douyin.com/video/..."
              className="flex-1 px-3 py-2 text-sm bg-secondary/30 border border-border rounded-xl focus:outline-none focus:border-brand-purple"
            />
            <Button size="sm" onClick={handleUrlFetch} disabled={loading || !videoUrl.trim()} className="gap-1 shrink-0">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
              获取
            </Button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            从抖音创作者后台导出的评论 JSON 数据，直接粘贴
          </p>
          <Textarea
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder='[{"content": "评论内容", "nick_name": "用户名", "digg_count": 10}]'
            className="min-h-[120px] bg-secondary/30 border-border text-xs font-mono resize-none rounded-xl"
          />
          <Button size="sm" onClick={handleJsonParse} disabled={!jsonText.trim()} className="gap-2">
            <Sparkles className="w-3.5 h-3.5" /> 解析 JSON
          </Button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      <div className="p-3 rounded-xl bg-secondary/20 text-[10px] text-muted-foreground">
        <strong className="text-foreground">提示：</strong>抖音开放平台完整接入需要 OAuth 授权流程。
        如需获取真实评论，推荐使用"粘贴 JSON"方式，将抖音创作者后台导出的数据直接粘贴。
      </div>
    </div>
  );
}
