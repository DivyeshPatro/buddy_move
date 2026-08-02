import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Bell, Bike, ShieldCheck, Package, Coins, Tag, Megaphone, CheckCheck, Gift } from 'lucide-react';

type NotificationType =
  | 'buddy_found' | 'ride' | 'verification' | 'subscription'
  | 'wallet' | 'promo' | 'voucher' | 'announcement' | 'system';

interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  meta?: Record<string, any>;
}

interface NotificationBellProps {
  userId: string;
  isScrolled?: boolean;
  isDarkNavbar?: boolean;
  // Optional deep-link handler; the app decides where each notification routes.
  onNavigate?: (n: AppNotification) => void;
}

// Icon + accent per notification kind.
const TYPE_META: Record<NotificationType, { icon: React.ComponentType<any>; color: string }> = {
  buddy_found:  { icon: Bike,        color: '#16a34a' },
  ride:         { icon: Bike,        color: '#2563eb' },
  verification: { icon: ShieldCheck, color: '#7c3aed' },
  subscription: { icon: Package,     color: '#ea580c' },
  wallet:       { icon: Coins,       color: '#ca8a04' },
  promo:        { icon: Tag,         color: '#db2777' },
  voucher:      { icon: Gift,        color: '#9333ea' },
  announcement: { icon: Megaphone,   color: '#0891b2' },
  system:       { icon: Bell,        color: '#475569' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString();
}

export default function NotificationBell({ userId, isScrolled, isDarkNavbar, onNavigate }: NotificationBellProps) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  // Snapshot of which items were unread when the panel was opened, so they keep
  // their "new" highlight for the duration the panel is open even after we clear
  // the badge by marking them read on the server.
  const [seenUnread, setSeenUnread] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/notifications/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(Number(data.unread) || 0);
    } catch { /* offline — keep last feed */ }
  }, [userId]);

  // Initial load + poll every 30s.
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch { /* best effort */ }
    setUnread(0);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }, [userId]);

  const toggle = () => {
    const next = !open;
    if (next) {
      setSeenUnread(new Set(items.filter(n => !n.read).map(n => n.id)));
      if (unread > 0) void markAllRead();
    }
    setOpen(next);
  };

  const iconColor = isScrolled ? '#2a2e34' : isDarkNavbar ? '#e9eaec' : '#2a2e34';
  const btnBorder = isScrolled
    ? 'border !border-[#2a2e34]/25 hover:!bg-[#2a2e34]/10'
    : isDarkNavbar
      ? 'border !border-[#ffb300]/15 hover:!bg-[#e9eaec]/10'
      : 'border !border-[#2a2e34]/20 hover:!bg-[#2a2e34]/10';

  return (
    <div className="relative" ref={ref}>
      <button
        id="navbar_notification_bell"
        onClick={toggle}
        title="Notifications"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className={`relative p-2.5 bg-transparent rounded-xl transition-all cursor-pointer ${btnBorder}`}
      >
        <Bell className="w-4 h-4" style={{ color: iconColor }} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none shadow">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id="notification_dropdown"
          className="absolute right-0 mt-2 w-[330px] max-w-[88vw] bg-white dark:bg-[#1f2226] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-fade-in font-sans"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {items.some(n => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-bold text-[#c98a00] hover:text-[#a06d00] flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/60">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">You're all caught up</p>
              </div>
            ) : (
              items.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.system;
                const Icon = meta.icon;
                const isNew = seenUnread.has(n.id);
                const clickable = !!onNavigate;
                return (
                  <div
                    key={n.id}
                    onClick={clickable ? () => { onNavigate!(n); setOpen(false); } : undefined}
                    className={`flex gap-3 px-4 py-3 transition-colors ${isNew ? 'bg-[#ffb300]/5' : ''} ${clickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
                  >
                    <div
                      className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: meta.color + '1A' }}
                    >
                      <Icon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">{n.title}</p>
                        {isNew && <span className="mt-1 w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
