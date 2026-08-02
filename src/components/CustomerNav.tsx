import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Bike, CreditCard, User as UserIcon, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';

export type CustomerView = 'dashboard' | 'commute' | 'plans' | 'profile' | 'settings';

interface NavItem { id: CustomerView; label: string; icon: React.ComponentType<any>; }

const ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'commute', label: 'Commute', icon: Bike },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface CustomerNavProps {
  view: CustomerView;
  onChange: (v: CustomerView) => void;
  onSos: () => void;
  commuteLabel?: string; // "My Commute" (guest) vs "Host Hub" (host)
}

// MoveBuddy-themed account nav: a sliding-pill icon menu (inactive = icon only,
// active = icon + label on a yellow pill) plus a distinct red SOS action.
// Colours follow the site palette (#ffb300 / #2a2e34 / white) — not a theme lib.
export default function CustomerNav({ view, onChange, onSos, commuteLabel }: CustomerNavProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 pt-5 flex items-center justify-between gap-2">
      <nav className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-[#ffb300]/30 shadow-sm overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(item => {
          const Icon = item.icon;
          const active = item.id === view;
          const label = item.id === 'commute' && commuteLabel ? commuteLabel : item.label;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              title={label}
              className="relative px-3 py-2 rounded-full flex items-center gap-1.5 shrink-0"
            >
              {active && (
                <motion.span
                  layoutId="customer-nav-pill"
                  className="absolute inset-0 rounded-full bg-[#ffb300]"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className={`relative z-10 flex items-center gap-1.5 text-xs font-bold ${active ? 'text-[#2a2e34]' : 'text-[#2a2e34]/55'}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {/* Label only for the active item (icon-only when inactive) */}
                {active && <span className="whitespace-nowrap">{label}</span>}
              </span>
            </button>
          );
        })}
      </nav>

      {/* SOS — always-visible emergency action, outlined red (not part of the selection) */}
      <button
        onClick={onSos}
        title="Emergency SOS"
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-transparent border-2 border-[#dc2626] text-[#dc2626] hover:bg-[#dc2626]/10 text-xs font-bold transition-colors"
      >
        <ShieldAlert className="w-4 h-4" />
        <span className="hidden sm:inline">SOS</span>
      </button>
    </div>
  );
}
