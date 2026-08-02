import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: number | string;     // number → animated count-up; string → shown as-is
  subtitle?: string;
  prefix?: string;            // e.g. "₹"
  accent?: string;           // hex accent for the icon chip
  index?: number;            // for staggered entrance
  onClick?: () => void;
  loading?: boolean;
}

// Count-up animation for numeric values (no external lib).
function useCountUp(target: number, run: boolean, ms = 600) {
  const [n, setN] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(from + (target - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, run, ms]);
  return n;
}

export function StatSkeleton() {
  return (
    <div className="bg-white border border-[#ffb300]/15 rounded-2xl p-4 animate-pulse">
      <div className="w-10 h-10 rounded-xl bg-[#eef0f3] mb-3" />
      <div className="h-3 w-20 bg-[#eef0f3] rounded mb-2" />
      <div className="h-6 w-16 bg-[#eef0f3] rounded" />
    </div>
  );
}

export default function StatCard({ icon: Icon, label, value, subtitle, prefix = '', accent = '#ffb300', index = 0, onClick, loading }: StatCardProps) {
  const isNum = typeof value === 'number';
  // Hook must run unconditionally (before any early return) to keep hook order stable.
  const counted = useCountUp(isNum ? (value as number) : 0, isNum && !loading);
  if (loading) return <StatSkeleton />;
  const display = isNum ? Math.round(counted).toLocaleString('en-IN') : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={`bg-white border border-[#ffb300]/15 rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:border-[#ffb300]/40 transition-colors' : ''}`}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: accent + '22' }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <p className="text-[11px] uppercase tracking-wider font-bold text-[#2a2e34]/50">{label}</p>
      <p className="text-2xl font-black text-[#2a2e34] mt-0.5">{prefix}{display}</p>
      {subtitle && <p className="text-[11px] text-[#2a2e34]/50 mt-0.5 line-clamp-1">{subtitle}</p>}
    </motion.div>
  );
}
