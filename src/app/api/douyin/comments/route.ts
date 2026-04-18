import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { videoUrl } = await req.json();

  // Douyin Open Platform requires OAuth 2.0 authorization.
  // In a production environment, you would:
  // 1. Redirect user to Douyin OAuth page for authorization
  // 2. Exchange code for access_token
  // 3. Call /video/comment/list/ API with access_token

  // For now, return a helpful error indicating OAuth is needed
  return NextResponse.json({
    error: 'oauth_required',
    message: '抖音开放平台需要 OAuth 授权才能获取评论。请使用"粘贴 JSON"方式导入。',
    videoUrl,
    // Provide instructions for manual export
    instructions: {
      step1: '登录抖音创作者后台 (creator.douyin.com)',
      step2: '进入"评论区管理"',
      step3: '导出目标视频的评论数据',
      step4: '将 JSON 数据粘贴到"粘贴 JSON"标签页',
    },
    // Mock some comments for demo purposes
    comments: [
      { content: '这个内容太有深度了，比其他博主好太多', nick_name: '深度用户', digg_count: 234, create_time: new Date().toISOString() },
      { content: '能不能多出一些这样的系列？', nick_name: '催更达人', digg_count: 156, create_time: new Date().toISOString() },
      { content: '说出了我一直想说但说不出口的话', nick_name: '共鸣者', digg_count: 89, create_time: new Date().toISOString() },
      { content: '建议把节奏再快一点，3分钟能讲完更好', nick_name: '快节奏', digg_count: 67, create_time: new Date().toISOString() },
      { content: '完全不同意你的观点，太理想化了', nick_name: '理性派', digg_count: 312, create_time: new Date().toISOString() },
    ],
  }, { status: 200 });
}
