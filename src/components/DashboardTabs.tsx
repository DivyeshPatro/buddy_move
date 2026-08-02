import React from 'react';
import { motion } from 'framer-motion';

interface TabDef { id: string; label: string; icon: React.ComponentType<any>; }
interface DashboardTabsProps {
  tab: string;
  onChange: (t: string) => void;
  tabs: TabDef[];
}

// Sliding pill segmented control (Framer Motion shared layout).
export default function DashboardTabs({ tab, onChange, tabs }: DashboardTabsProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-5">
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#ffb300]/30 shadow-sm">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className="relative px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="dash-tab-pill"
                  className="absolute inset-0 rounded-full bg-[#ffb300]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-[#2a2e34]' : 'text-[#2a2e34]/55'}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
