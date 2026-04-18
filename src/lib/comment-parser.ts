import { Comment, CommentIntent } from '@/types';

export interface ParsedComment {
  content: string;
  author: string;
  likes?: number;
  timestamp?: string;
  replyCount?: number;
}

export function parsePastedText(text: string): ParsedComment[] {
  const lines = text.split('\n').filter(l => l.trim());
  const comments: ParsedComment[] = [];

  for (const line of lines) {
    // Try formats:
    // 1. "作者：内容" or "作者:内容"
    // 2. "内容 —— 作者"
    // 3. "内容" (plain text, no author)

    let author = '匿名用户';
    let content = line.trim();

    const colonMatch = line.match(/^(.{1,10})[：:]\s*(.+)$/);
    if (colonMatch) {
      author = colonMatch[1].trim();
      content = colonMatch[2].trim();
    } else {
      const dashMatch = line.match(/^(.+?)\s*[—\-–]{1,2}\s*(.{1,10})$/);
      if (dashMatch) {
        content = dashMatch[1].trim();
        author = dashMatch[2].trim();
      }
    }

    if (content.length >= 2) {
      comments.push({ content, author });
    }
  }

  return comments;
}

export function parseCSV(text: string): ParsedComment[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const comments: ParsedComment[] = [];

  // Find column indices
  const contentIdx = header.findIndex(h => ['内容', '评论', 'comment', 'text', 'content'].includes(h));
  const authorIdx = header.findIndex(h => ['作者', '用户', 'author', 'user', 'nickname', '昵称'].includes(h));
  const likesIdx = header.findIndex(h => ['点赞', 'likes', 'like_count', 'digg_count'].includes(h));
  const replyIdx = header.findIndex(h => ['回复', 'reply', 'reply_count', 'comment_count'].includes(h));
  const timeIdx = header.findIndex(h => ['时间', 'date', 'time', 'create_time', 'timestamp'].includes(h));

  // If no content column found, try using first column
  const useContentIdx = contentIdx >= 0 ? contentIdx : 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const content = cols[useContentIdx];
    if (!content || content.length < 2) continue;

    comments.push({
      content,
      author: authorIdx >= 0 ? (cols[authorIdx] || '匿名用户') : '匿名用户',
      likes: likesIdx >= 0 ? parseInt(cols[likesIdx]) || 0 : 0,
      replyCount: replyIdx >= 0 ? parseInt(cols[replyIdx]) || 0 : 0,
      timestamp: timeIdx >= 0 ? cols[timeIdx] : new Date().toISOString(),
    });
  }

  return comments;
}

export function parseDouyinJSON(data: unknown): ParsedComment[] {
  const comments: ParsedComment[] = [];

  // Handle Douyin Open Platform comment list format
  const items = Array.isArray(data) ? data :
    (data as Record<string, unknown>)?.data ? Array.isArray((data as Record<string, unknown>).data) ? (data as Record<string, unknown>).data as unknown[] : [] :
    (data as Record<string, unknown>)?.comments ? Array.isArray((data as Record<string, unknown>).comments) ? (data as Record<string, unknown>).comments as unknown[] : [] : [];

  for (const item of items) {
    const obj = item as Record<string, unknown>;
    const content = String(obj.content || obj.text || obj.comment_content || '');
    if (!content || content.length < 2) continue;

    const nickName = String(obj.nick_name || obj.nickname || (typeof obj.user === 'string' ? obj.user : '') || obj.author || '匿名用户');

    comments.push({
      content,
      author: nickName,
      likes: Number(obj.digg_count || obj.like_count || obj.likes || 0),
      replyCount: Number(obj.reply_count || obj.comment_count || obj.replyCount || 0),
      timestamp: String(obj.create_time || obj.created_at || obj.timestamp || new Date().toISOString()),
    });
  }

  return comments;
}

export function rawToComment(parsed: ParsedComment, index: number): Comment {
  return {
    id: `imported-${Date.now()}-${index}`,
    content: parsed.content,
    author: parsed.author,
    avatar: parsed.author.slice(0, 1).toUpperCase(),
    timestamp: parsed.timestamp || new Date().toISOString(),
    likes: parsed.likes || 0,
    sentiment: 'neutral',
    intent: {
      primary: 'emotion',
      confidence: 0,
      description: '待 AI 分析',
    },
    leverageScore: 0,
    clusterId: '',
    tags: [],
    replyCount: parsed.replyCount || 0,
  };
}
