import { NextRequest } from 'next/server';

export const runtime = 'edge';

const SYSTEM_PROMPT = `你是一个评论分析引擎。分析用户给出的评论列表，为每条评论返回 JSON 格式的分析结果。

对每条评论，你需要判断：
1. sentiment: positive / negative / neutral / mixed
2. intent: primary 意图类型（request / emotion / suggestion / praise / criticism / question / reference），confidence 置信度 0-1，description 一句话描述意图
3. leverageScore: 创作杠杆分 0-100（综合新颖性、共鸣度、可执行性、稀缺性、情感深度）
4. tags: 2-3个标签

返回纯 JSON 数组，不要加 markdown 代码块标记。格式：
[{"index":0,"sentiment":"...","intent":{"primary":"...","confidence":0.9,"description":"..."},"leverageScore":85,"tags":["...","..."]}]`;

export async function POST(req: NextRequest) {
  const { comments } = await req.json();

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.siliconflow.cn';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  const commentsText = comments.map((c: { content: string; author: string }, i: number) =>
    `[${i}] ${c.author}: ${c.content}`
  ).join('\n');

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `分析以下评论：\n\n${commentsText}` },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(errorText, { status: response.status });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  return new Response(JSON.stringify({ analysis: content }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
