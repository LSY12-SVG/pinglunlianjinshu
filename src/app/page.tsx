'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FlaskConical, ArrowRight, Map, Wand2, FileText, RefreshCcw } from 'lucide-react';

const features = [
  { icon: Map, title: '评论地图', desc: '可视化评论意图集群，一眼识别高杠杆洞察' },
  { icon: Wand2, title: '策略工坊', desc: '三种风险梯度的创作策略，从保守到激进' },
  { icon: FileText, title: '脚本工作台', desc: '分段编辑、AI改写、一键导出完整脚本' },
  { icon: RefreshCcw, title: '反馈回路', desc: '发布后追踪效果，数据驱动迭代' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-purple/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-pink/5 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-12 py-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold">Comment Alchemy</span>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          进入工作台 <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      <section className="relative z-10 max-w-5xl mx-auto pt-24 pb-20 text-center px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            评论区反向共创操作系统
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
        >
          把评论炼成<br /><span className="brand-gradient-text">下一期脚本</span>
        </motion.h1>

        <motion.p
          className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}
        >
          Comment Alchemy 解析评论区的创作意图，计算每条评论的杠杆分，
          生成风格守恒的创作策略，让你的每一条评论都变成下一个爆款的原材料。
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Link href="/dashboard" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl brand-gradient text-white font-medium text-sm hover:opacity-90 transition-opacity">
            开始炼金 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/comment-map" className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-secondary text-foreground text-sm hover:bg-secondary/80 transition-colors">
            查看评论地图
          </Link>
        </motion.div>
      </section>

      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="glass-card rounded-3xl p-6 hover:border-brand-purple/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-brand-purple" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center py-8 text-xs text-muted-foreground border-t border-border">
        Comment Alchemy — 评论区反向共创操作系统
      </footer>
    </div>
  );
}
