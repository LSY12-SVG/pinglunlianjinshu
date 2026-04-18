'use client';

import { useState, useCallback, useRef } from 'react';
import { AIStatus } from '@/types';

interface UseAIStreamReturn {
  content: string;
  status: AIStatus;
  startStream: (systemPrompt: string, prompt: string) => Promise<void>;
  reset: () => void;
}

export function useAIStream(): UseAIStreamReturn {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<AIStatus>({ stage: 'idle', message: '' });
  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (systemPrompt: string, prompt: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setContent('');
    setStatus({ stage: 'analyzing', message: '正在连接 AI 模型...', progress: 10 });

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setStatus({ stage: 'generating', message: 'AI 正在生成...', progress: 30 });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (!trimmed.startsWith('data: ')) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              totalLength += delta.length;
              setContent(prev => prev + delta);
              const progress = Math.min(90, 30 + totalLength / 5);
              setStatus({ stage: 'generating', message: 'AI 正在生成...', progress });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      setStatus({ stage: 'complete', message: '生成完成', progress: 100 });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStatus({ stage: 'error', message: '生成失败，请重试', progress: 0 });
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setContent('');
    setStatus({ stage: 'idle', message: '' });
  }, []);

  return { content, status, startStream, reset };
}
