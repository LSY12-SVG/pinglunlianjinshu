'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Map,
  Wand2,
  FileText,
  RefreshCcw,
  Home,
  FlaskConical,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/app-store';

const navItems = [
  { href: '/', icon: Home, label: 'Landing' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/comment-map', icon: Map, label: '评论地图' },
  { href: '/strategy-studio', icon: Wand2, label: '策略工坊' },
  { href: '/script-workspace', icon: FileText, label: '脚本工作台' },
  { href: '/feedback-loop', icon: RefreshCcw, label: '反馈回路' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { setImportModalOpen } = useAppStore();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[72px] bg-sidebar border-r border-sidebar-border flex flex-col items-center py-6 z-50">
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-white" />
        </div>
      </div>

      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={item.label}>
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-sidebar-accent"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <div
                  className={cn(
                    'relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}

        {/* Import Button */}
        <button
          onClick={() => setImportModalOpen(true)}
          title="导入评论"
          className="mt-2 w-12 h-12 rounded-xl flex items-center justify-center transition-colors text-sidebar-foreground/50 hover:text-brand-cyan hover:bg-sidebar-accent/50"
        >
          <Upload className="w-5 h-5" />
        </button>
      </nav>

      <div className="mt-auto">
        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground">
          U
        </div>
      </div>
    </aside>
  );
}
