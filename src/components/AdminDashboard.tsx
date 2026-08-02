import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  LayoutDashboard, Users, Car, DollarSign, Wallet,
  ShieldCheck, Bell, FileText, Flag, Tag, BarChart2,
  HeadphonesIcon, ScrollText, Settings,
  Menu, X, TrendingUp, Package, Upload, Megaphone,
  CheckCircle, XCircle, RefreshCw, Plus, Trash2, CreditCard,
  Edit3, Save, Send, AlertTriangle,
  UserCheck, Search, Star, Award, Lock, Gift
} from 'lucide-react';
import { User, AdminRole } from '../types';

const SECTION_PERMISSIONS: Record<string, AdminRole[]> = {
  dashboard:     ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'OPERATIONS'],
  users:         ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  rides:         ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS'],
  kyc:           ['SUPER_ADMIN', 'ADMIN'],
  pricing:       ['SUPER_ADMIN'],
  subscriptions: ['SUPER_ADMIN', 'ADMIN'],
  wallet:        ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
  payments:      ['SUPER_ADMIN', 'ADMIN', 'FINANCE'],
  promos:        ['SUPER_ADMIN', 'ADMIN'],
  vouchers:      ['SUPER_ADMIN', 'ADMIN'],
  notifications: ['SUPER_ADMIN', 'ADMIN'],
  cms:           ['SUPER_ADMIN', 'ADMIN'],
  branding:      ['SUPER_ADMIN'],
  flags:         ['SUPER_ADMIN'],
  analytics:     ['SUPER_ADMIN', 'ADMIN', 'FINANCE', 'SUPPORT', 'OPERATIONS'],
  support:       ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'],
  audit:         ['SUPER_ADMIN', 'ADMIN'],
  settings:      ['SUPER_ADMIN'],
};

interface AdminContextType {
  currentUser: User;
  adminRole: AdminRole;
  api: ReturnType<typeof makeApi>;
  can: (section: string) => boolean;
  canDo: (...roles: AdminRole[]) => boolean;
}

const AdminCtx = createContext<AdminContextType | null>(null);
const useAdmin = () => useContext(AdminCtx)!;

const NAV = [
  { id: 'dashboard',      label: 'Dashboard',           icon: LayoutDashboard,  group: 'Overview' },
  { id: 'users',          label: 'User Management',     icon: Users,            group: 'People' },
  { id: 'rides',          label: 'Ride Management',     icon: Car,              group: 'People' },
  { id: 'kyc',            label: 'KYC & Verification',  icon: ShieldCheck,      group: 'People' },
  { id: 'pricing',        label: 'Pricing Engine',      icon: DollarSign,       group: 'Business' },
  { id: 'subscriptions',  label: 'Subscription Plans',  icon: Package,          group: 'Business' },
  { id: 'wallet',         label: 'Wallet Manager',      icon: Wallet,           group: 'Business' },
  { id: 'payments',       label: 'Payments',            icon: CreditCard,       group: 'Business' },
  { id: 'promos',         label: 'Promo Codes',         icon: Tag,              group: 'Business' },
  { id: 'vouchers',       label: 'Vouchers',            icon: Gift,             group: 'Business' },
  { id: 'notifications',  label: 'Notifications',       icon: Bell,             group: 'Engage' },
  { id: 'cms',            label: 'CMS Pages',           icon: FileText,         group: 'Engage' },
  { id: 'branding',       label: 'Branding',            icon: Upload,           group: 'Platform' },
  { id: 'flags',          label: 'Feature Flags',       icon: Flag,             group: 'Platform' },
  { id: 'analytics',      label: 'Analytics',           icon: BarChart2,        group: 'Insights' },
  { id: 'support',        label: 'Support Center',      icon: HeadphonesIcon,   group: 'Insights' },
  { id: 'audit',          label: 'Audit Logs',          icon: ScrollText,       group: 'Insights' },
  { id: 'settings',       label: 'System Settings',     icon: Settings,         group: 'System' },
];
const groups = Array.from(new Set(NAV.map(n => n.group)));

const AccessDenied = ({ section, required }: { section: string; required: AdminRole[] }) => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
      <Lock className="w-8 h-8 text-red-400" />
    </div>
    <div className="text-center">
      <h2 className="text-lg font-bold text-gray-800">Access Denied</h2>
      <p className="text-sm text-gray-500 mt-1">You don't have permission to view <b>{section}</b>.</p>
      <p className="text-xs text-gray-400 mt-2">
        Required: <span className="font-mono text-red-500">{required.join(' | ')}</span>
      </p>
    </div>
  </div>
);

const Card = ({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`} onClick={onClick}>{children}</div>
);

const BG_COLORS: Record<string, string> = {
  green: 'bg-green-50', red: 'bg-red-50', blue: 'bg-blue-50',
  amber: 'bg-amber-50', indigo: 'bg-indigo-50', purple: 'bg-purple-50',
  teal: 'bg-teal-50', emerald: 'bg-emerald-50', orange: 'bg-orange-50',
  pink: 'bg-pink-50', gray: 'bg-gray-50', yellow: 'bg-yellow-50',
  violet: 'bg-violet-50', white: 'bg-white',
};
const TEXT_COLORS: Record<string, string> = {
  green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600',
  amber: 'text-amber-600', indigo: 'text-indigo-600', purple: 'text-purple-600',
  teal: 'text-teal-600', emerald: 'text-emerald-600', orange: 'text-orange-600',
  pink: 'text-pink-600', gray: 'text-gray-600', yellow: 'text-yellow-600',
  violet: 'text-violet-600', white: 'text-white',
};
const BADGE_COLORS: Record<string, string> = {
  green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700', amber: 'bg-amber-100 text-amber-700',
  indigo: 'bg-indigo-100 text-indigo-700', purple: 'bg-purple-100 text-purple-700',
  teal: 'bg-teal-100 text-teal-700', emerald: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700', pink: 'bg-pink-100 text-pink-700',
  gray: 'bg-gray-100 text-gray-700', yellow: 'bg-yellow-100 text-yellow-700',
  violet: 'bg-violet-100 text-violet-700',
};

const ErrorBanner = ({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) => {
  if (!message) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 hover:bg-red-100 rounded"><X className="w-4 h-4" /></button>
      )}
    </div>
  );
};

const ConfirmModal = ({ open, title, message, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel?: string; variant?: string;
  onConfirm: () => void; onCancel: () => void;
}) => {
  if (!open) return null;
  const btnColor = variant === 'danger' ? 'bg-red-600 hover:bg-red-700' :
    variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700';
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium rounded-lg text-white ${btnColor}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

const PaginationControls = ({ page, total, limit, onChange }: {
  page: number; total: number; limit: number; onChange: (p: number) => void;
}) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-gray-500">Showing {from} - {to} of {total}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onChange(page - 1)} disabled={page <= 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40">Previous</button>
        <span className="px-3 py-1.5 text-xs font-medium text-gray-700">{page} / {totalPages}</span>
        <button onClick={() => onChange(page + 1)} disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
};

function makeApi(adminId: string) {
  const h = { 'Content-Type': 'application/json', 'X-Admin-Id': adminId };
  const handleResponse = async (res: Response) => {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let msg = `Request failed (${res.status})`;
      try { const j = JSON.parse(text); msg = j.error || j.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  };
  return {
    get:  (url: string) => fetch(url, { headers: { 'X-Admin-Id': adminId } }).then(handleResponse),
    put:  (url: string, body: unknown) => fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(body) }).then(handleResponse),
    post: (url: string, body: unknown) => fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(handleResponse),
    del:  (url: string) => fetch(url, { method: 'DELETE', headers: { 'X-Admin-Id': adminId } }).then(handleResponse),
  };
}

const KpiCard = ({ label, value, sub, icon: Icon, color = 'indigo' }: any) => (
  <Card className="p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${BG_COLORS[color] || BG_COLORS.indigo}`}>
      <Icon className={`w-5 h-5 ${TEXT_COLORS[color] || TEXT_COLORS.indigo}`} />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </Card>
);

const Badge = ({ text, color = 'gray' }: { text: string; color?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${BADGE_COLORS[color] || BADGE_COLORS.gray}`}>{text}</span>
);

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = { active: 'green', suspended: 'yellow', banned: 'red', pending: 'amber', verified: 'green', none: 'gray', rejected: 'red' };
  return <Badge text={status} color={map[status] || 'gray'} />;
};

const Input = ({ label, ...props }: any) => (
  <div>
    {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
    <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" {...props} />
  </div>
);

const Textarea = ({ label, ...props }: any) => (
  <div>
    {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
    <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y" rows={4} {...props} />
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }: any) => {
  const base = 'inline-flex items-center gap-2 rounded-lg font-medium transition-all disabled:opacity-50';
  const sz = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }[size];
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    ghost: 'text-indigo-600 hover:bg-indigo-50',
  }[variant];
  return <button className={`${base} ${sz} ${v} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
    {label && <span className="text-sm text-gray-700">{label}</span>}
  </label>
);

const DashboardSection = () => {
  const { api } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api.get('/api/admin/analytics').then(setData).catch(e => setError(e.message)); }, [api]);
  if (error) return <ErrorBanner message={error} onDismiss={() => setError(null)} />;
  if (!data) return <p className="text-gray-400 p-6">Loading...</p>;
  const { kpis, charts } = data;

  const simpleBar = (items: any[], key: string) => (
    <div className="space-y-2">
      {items.map((d: any) => {
        const max = Math.max(...items.map((x: any) => x[key]));
        const pct = max > 0 ? (d[key] / max) * 100 : 0;
        return (
          <div key={d.day} className="flex items-center gap-3">
            <span className="w-8 text-xs text-gray-500">{d.day}</span>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-xs text-gray-600 text-right">{d[key]}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Users" value={kpis.totalUsers} sub={`${kpis.verifiedUsers} verified`} icon={Users} color="indigo" />
        <KpiCard label="Active Rides" value={kpis.activeRides} sub={`${kpis.totalRides} total`} icon={Car} color="blue" />
        <KpiCard label="Revenue" value={`$${kpis.totalRevenue?.toLocaleString('en-IN')}`} sub={`${kpis.activeSubscriptions} active subs`} icon={DollarSign} color="green" />
        <KpiCard label="Pending KYC" value={kpis.pendingKYC} sub="awaiting review" icon={ShieldCheck} color="amber" />
        <KpiCard label="Active Users" value={kpis.activeUsers} sub="not banned" icon={UserCheck} color="emerald" />
        <KpiCard label="Completed Rides" value={kpis.completedRides} icon={CheckCircle} color="teal" />
        <KpiCard label="Wallet Balance" value={`$${(kpis.totalWalletBalance || 0).toLocaleString('en-IN')}`} sub="across all users" icon={Wallet} color="purple" />
        <KpiCard label="Active Subs" value={kpis.activeSubscriptions} icon={Package} color="orange" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue This Week ($)</h3>
          {simpleBar(charts.revenueChart, 'revenue')}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">User Growth This Week</h3>
          {simpleBar(charts.userGrowth, 'users')}
        </Card>
      </div>
    </div>
  );
};

const UsersSection = () => {
  const { api, canDo } = useAdmin();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(() => {
    const params = `?page=${page}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
    api.get(`/api/admin/users${params}`).then(d => {
      if (d.error) { setError(d.error); return; }
      const list = Array.isArray(d) ? d : d.data || d.results || d;
      setUsers(list);
      setTotal(d.total || list.length);
    }).catch(e => setError(e.message));
  }, [search, page, api]);

  useEffect(() => { load(); }, [load]);

  const action = async (userId: string, act: string, reason = '') => {
    setActing(userId + act);
    try {
      await api.put(`/api/admin/users/${userId}/action`, { action: act, reason });
      load();
    } catch (e: any) { setError(e.message); }
    setActing(null);
  };

  const [confirm, setConfirm] = useState<{ action: string; user: any } | null>(null);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal
        open={!!confirm} title={`${confirm?.action} User`}
        message={`Are you sure you want to ${confirm?.action} "${confirm?.user?.name}" (${confirm?.user?.email})?`}
        confirmLabel={confirm?.action || 'Confirm'}
        variant={confirm?.action === 'ban' ? 'danger' : 'warning'}
        onConfirm={() => { if (confirm) { action(confirm.user.id, confirm.action); setConfirm(null); } }}
        onCancel={() => setConfirm(null)}
      />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Btn onClick={load} variant="secondary" size="md"><RefreshCw className="w-4 h-4" /></Btn>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>{['User', 'Role', 'Wallet', 'Status', 'KYC', 'Subscription', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge text={u.role} color={u.role === 'admin' ? 'purple' : u.role === 'host' ? 'blue' : 'gray'} /></td>
                  <td className="px-4 py-3 font-medium">${u.walletCredits}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={u.verificationStatus || 'none'} /></td>
                  <td className="px-4 py-3">{u.activeSubscription ? <Badge text={u.activeSubscription.planName} color="green" /> : <span className="text-gray-300">-</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {canDo('SUPER_ADMIN', 'ADMIN') && u.status !== 'suspended' && u.role !== 'admin' && (
                        <Btn size="sm" variant="warning" onClick={() => setConfirm({ action: 'suspend', user: u })} disabled={acting === u.id + 'suspend'}>Suspend</Btn>
                      )}
                      {canDo('SUPER_ADMIN', 'ADMIN') && u.status === 'suspended' && (
                        <Btn size="sm" variant="success" onClick={() => action(u.id, 'activate')}>Activate</Btn>
                      )}
                      {canDo('SUPER_ADMIN', 'ADMIN') && u.status !== 'banned' && u.role !== 'admin' && (
                        <Btn size="sm" variant="danger" onClick={() => setConfirm({ action: 'ban', user: u })}>Ban</Btn>
                      )}
                      {canDo('SUPER_ADMIN', 'ADMIN') && !u.isIdVerified && (
                        <Btn size="sm" variant="success" onClick={() => action(u.id, 'verify')}>Verify</Btn>
                      )}
                      {!canDo('SUPER_ADMIN', 'ADMIN') && (
                        <span className="text-xs text-gray-400 italic">View only</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <PaginationControls page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
};

const matchStatusColor: Record<string, string> = { active: 'green', cancelled: 'red', completed: 'gray' };

const RidesSection = () => {
  const { api } = useAdmin();
  const [matches, setMatches] = useState<any[]>([]);
  const [filter, setFilter] = useState<'active' | 'all' | 'cancelled' | 'completed'>('active');
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(() => {
    api.get(`/api/admin/matches?status=${filter}&page=${page}&limit=${limit}`).then(d => {
      if (d.error) { setError(d.error); return; }
      const list = Array.isArray(d) ? d : d.data || d.results || d;
      setMatches(list);
      setTotal(d.total || list.length);
    }).catch(e => setError(e.message));
  }, [api, filter, page]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (matchId: string, action: 'cancel' | 'complete' | 'reassign') => {
    setActing(matchId + action);
    try {
      const reason = action === 'cancel' ? (window.prompt('Reason for cancelling this pairing? (optional)') || '') : '';
      const res = await api.put(`/api/admin/matches/${matchId}/action`, { action, reason });
      if (action === 'reassign') {
        setMsg(res?.rematched ? 'Guest was reassigned to a new buddy.' : 'Cancelled - no alternative buddy available right now.');
        setTimeout(() => setMsg(''), 4000);
      }
      load();
    } catch (e: any) { setError(e.message); }
    setActing(null);
  };

  const [confirmCancel, setConfirmCancel] = useState<any>(null);
  const activeCount = matches.filter((m: any) => m.status === 'active').length;

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal
        open={!!confirmCancel} title="Cancel Ride" confirmLabel="Cancel"
        message={`Are you sure you want to cancel the pairing between "${confirmCancel?.guest?.name || confirmCancel?.guestName}" and "${confirmCancel?.host?.name || confirmCancel?.hostName}"?`}
        onConfirm={() => { if (confirmCancel) { doAction(confirmCancel.id, 'cancel'); setConfirmCancel(null); } }}
        onCancel={() => setConfirmCancel(null)}
      />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Ride Management <span className="text-gray-400 font-normal text-sm">. buddy matches</span></h2>
          <p className="text-xs text-gray-500">{matches.length} {filter === 'all' ? 'total' : filter} pairings{filter === 'all' ? ` . ${activeCount} active` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1); }}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All</option>
          </select>
          <Btn onClick={load} variant="secondary" size="md"><RefreshCw className="w-4 h-4" /></Btn>
        </div>
      </div>
      {msg && <p className="text-sm text-indigo-600">{msg}</p>}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>{['Guest', 'Host', 'Route', 'Direction', 'Match', 'Activity', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {matches.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={m.guest?.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{m.guest?.name || m.guestName}</p>
                        <p className="text-[10px] text-gray-400">{m.guest?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={m.host?.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                      <div>
                        <p className="text-xs font-medium text-gray-900">{m.host?.name || m.hostName}</p>
                        <p className="text-[10px] text-gray-400">{m.host?.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {m.route ? (
                      <><p className="text-xs font-medium">{m.route.origin || '-'}</p><p className="text-xs text-gray-400">{'>'} {m.route.destination || '-'}</p></>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge text={m.direction === 'forward' ? 'To work' : 'To home'} color={m.direction === 'forward' ? 'blue' : 'purple'} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-bold text-gray-900">{m.score}%</p>
                    <p className="text-[10px] text-gray-400">{(m.proximityTierM || 0) >= 1000 ? `${m.proximityTierM / 1000}km` : `${m.proximityTierM}m`}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p className="text-gray-700">{m.completedDays || 0} ride-days</p>
                    {m.openDisputes > 0 && <p className="text-[10px] text-rose-500 font-semibold">{m.openDisputes} open dispute{m.openDisputes > 1 ? 's' : ''}</p>}
                  </td>
                  <td className="px-4 py-3"><Badge text={m.status} color={matchStatusColor[m.status] || 'gray'} /></td>
                  <td className="px-4 py-3">
                    {m.status === 'active' ? (
                      <div className="flex gap-1 flex-wrap">
                        <Btn size="sm" variant="secondary" disabled={acting === m.id + 'reassign'} onClick={() => doAction(m.id, 'reassign')}>Reassign</Btn>
                        <Btn size="sm" variant="success" disabled={acting === m.id + 'complete'} onClick={() => doAction(m.id, 'complete')}>Complete</Btn>
                        <Btn size="sm" variant="danger" disabled={acting === m.id + 'cancel'} onClick={() => setConfirmCancel(m)}>Cancel</Btn>
                      </div>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <Car className="w-8 h-8 text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">
                        No {filter === 'all' ? '' : filter} matches yet
                      </p>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                        Matches appear automatically once guests and hosts purchase
                        subscriptions and the matching engine pairs them.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <PaginationControls page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
};

const DocRow = ({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
    {value ? <span className={`text-sm text-gray-900 text-right break-all ${mono ? 'font-mono tracking-wide' : ''}`}>{value}</span> : <span className="text-xs text-gray-300 italic">Not collected</span>}
  </div>
);

const DocImage = ({ label, url }: { label: string; url?: string }) => {
  const isPdf = !!url && url.toLowerCase().endsWith('.pdf');
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
      {url ? (
        isPdf ? (
          <a href={url} target="_blank" rel="noreferrer" className="w-full h-24 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-500 hover:bg-gray-50">
            <FileText className="w-6 h-6" /><span className="text-[10px] font-semibold">View PDF</span>
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="block">
            <img src={url} alt={label} className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:opacity-90" />
          </a>
        )
      ) : (
        <div className="w-full h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-[10px] text-gray-300 text-center px-1">Not collected</div>
      )}
    </div>
  );
};

const KYCDetailModal = ({ user, onClose, onApprove, onReject, busy }: {
  user: any; onClose: () => void; busy: boolean;
  onApprove: () => void; onReject: (reason: string) => void;
}) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-gray-900">Verification Review</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <img src={user.avatarUrl} className="w-14 h-14 rounded-full object-cover border border-gray-200" alt="" />
            <div>
              <p className="font-bold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email} . {user.phone}</p>
              <p className="text-xs text-amber-600 mt-0.5">Submitted: {user.verificationSubmittedAt ? new Date(user.verificationSubmittedAt).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Live Selfie</p>
            {user.selfieImage ? <img src={user.selfieImage} alt="Selfie" referrerPolicy="no-referrer" className="w-32 h-32 rounded-xl object-cover border-2 border-indigo-200" /> : <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-300 text-center px-2">No selfie captured</div>}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Documents</p>
            <Card className="px-4 py-1">
              <DocRow label="Driving Licence No." value={user.licenceNumber} mono />
              <DocRow label="Aadhaar No." value={user.aadhaarNumber} mono />
              <DocRow label="Vehicle RC No." value={user.vehicleRcNumber} mono />
            </Card>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <DocImage label="Licence scan" url={user.licenceImageUrl} />
              <DocImage label="Aadhaar scan" url={user.aadhaarImageUrl} />
              <DocImage label="Vehicle RC" url={user.vehicleRcImageUrl} />
            </div>
            <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">Click a scan to open it full size. Review the document numbers and scans against the live selfie before approving.</p>
          </div>
          {rejecting && (
            <Textarea label="Reason for rejection (sent to the user)" value={reason} onChange={(e: any) => setReason(e.target.value)} rows={2} placeholder="e.g. Aadhaar number does not match the name on the selfie." />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          {rejecting ? (
            <><Btn variant="secondary" size="md" onClick={() => setRejecting(false)}>Back</Btn><Btn variant="danger" size="md" disabled={busy} onClick={() => onReject(reason)}><XCircle className="w-4 h-4" /> Confirm Reject</Btn></>
          ) : (
            <><Btn variant="secondary" size="md" onClick={() => setRejecting(true)}><XCircle className="w-4 h-4" /> Reject</Btn><Btn variant="success" size="md" disabled={busy} onClick={onApprove}><CheckCircle className="w-4 h-4" /> Approve</Btn></>
          )}
        </div>
      </div>
    </div>
  );
};

const KYCSection = () => {
  const { api } = useAdmin();
  const [queue, setQueue] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { api.get('/api/admin/kyc-queue').then(setQueue).catch(e => setError(e.message)); }, [api]);
  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, action: 'verify' | 'reject', reason = '') => {
    setBusy(true);
    try {
      await api.put(`/api/admin/users/${userId}/action`, { action, reason });
      setSelected(null);
      load();
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <p className="text-sm text-gray-500">{queue.length} users awaiting KYC verification</p>
      {queue.length === 0 && (
        <Card className="p-12 flex flex-col items-center gap-3 text-center">
          <CheckCircle className="w-12 h-12 text-green-400" />
          <p className="text-lg font-semibold text-gray-700">All clear!</p>
          <p className="text-sm text-gray-400">No pending KYC requests</p>
        </Card>
      )}
      <div className="grid gap-4">
        {queue.map((u: any) => (
          <Card key={u.id} className="p-4 flex items-center justify-between hover:border-indigo-200 hover:shadow-md transition cursor-pointer" onClick={() => setSelected(u)}>
            <div className="flex items-center gap-3">
              <img src={u.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-xs text-gray-400">{u.email} . {u.phone}</p>
                <p className="text-xs text-amber-600 mt-0.5">Submitted: {u.verificationSubmittedAt ? new Date(u.verificationSubmittedAt).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <Btn variant="ghost" size="sm" onClick={() => setSelected(u)}>Review</Btn>
              <Btn variant="success" size="sm" disabled={busy} onClick={() => act(u.id, 'verify')}><CheckCircle className="w-3 h-3" /> Approve</Btn>
              <Btn variant="danger" size="sm" onClick={() => setSelected(u)}><XCircle className="w-3 h-3" /> Reject</Btn>
            </div>
          </Card>
        ))}
      </div>
      {selected && (
        <KYCDetailModal user={selected} busy={busy} onClose={() => setSelected(null)} onApprove={() => act(selected.id, 'verify')} onReject={(reason) => act(selected.id, 'reject', reason)} />
      )}
    </div>
  );
};

const PricingSection = () => {
  const { api } = useAdmin();
  const [cfg, setCfg] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [previewDist, setPreviewDist] = useState(10);
  const [previewPlan, setPreviewPlan] = useState('1m');

  useEffect(() => { api.get('/api/admin/pricing-config').then(setCfg).catch(e => setError(e.message)); }, []);

  const save = async () => {
    try {
      await api.put('/api/admin/pricing-config', cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message); }
  };

  const calcPreview = async () => {
    const res = await api.post('/api/subscriptions/calculate', { role: 'guest', distanceKm: previewDist, planType: previewPlan, isRenewal: false });
    setPreview(res);
  };

  const Field = ({ label, field, step = '1' }: { label: string; field: string; step?: string }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="number" step={step} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        value={cfg?.[field] ?? ''} onChange={e => setCfg((c: any) => ({ ...c, [field]: parseFloat(e.target.value) || 0 }))} />
    </div>
  );

  if (!cfg) return error ? <ErrorBanner message={error} /> : <p className="text-gray-400 p-6">Loading...</p>;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Pricing Engine</h2>
          <p className="text-sm text-gray-500">All changes take effect immediately - no deployment needed</p>
        </div>
        <Btn onClick={save} variant={saved ? 'success' : 'primary'}><Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}</Btn>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Guest Base Pricing</h3>
          <Field label="Base KM Limit (km)" field="guestBaseKmLimit" />
          <Field label="Base Price ($)" field="guestBasePrice" />
          <Field label="Increment per KM beyond limit ($)" field="guestIncrementPerKm" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" /> Guest Working Days</h3>
          <p className="text-[11px] text-gray-500 -mt-2">Billable days (weekends excluded). Plan price = BRP x working days x multiplier.</p>
          <Field label="7-Day -> Working Days" field="guest7dWorkingDays" />
          <Field label="15-Day -> Working Days" field="guest15dWorkingDays" />
          <Field label="Monthly -> Working Days" field="guestMonthlyWorkingDays" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Package className="w-4 h-4 text-blue-500" /> Guest Plan Multipliers</h3>
          <p className="text-[11px] text-gray-500 -mt-2">Default 1.0 (off). Raise for surge/seasonal pricing.</p>
          <Field label="7-Day Multiplier" field="guest7dMultiplier" step="0.1" />
          <Field label="15-Day Multiplier" field="guest15dMultiplier" step="0.1" />
          <Field label="Monthly Multiplier" field="guestMonthlyMultiplier" step="0.1" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Car className="w-4 h-4 text-purple-500" /> Host Pricing & Earnings</h3>
          <p className="text-[11px] text-gray-500 -mt-2">Host pays the slab upfront; earns $rate x distance x active ride-days + prorated slab.</p>
          <Field label="Earnings Rate ($ per km/day)" field="hostRatePerKm" step="0.1" />
          <Field label="Upfront Slab <=5km ($)" field="hostUpto5kmSlab" />
          <Field label="Upfront Slab >5km ($)" field="hostAbove5kmSlab" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Award className="w-4 h-4 text-amber-500" /> Welcome Credit (Month 1)</h3>
          <p className="text-[11px] text-gray-500 -mt-2">Discount on first subscription - best of flat OR percent (capped).</p>
          <Field label="Flat Credit ($)" field="welcomeCreditFlat" />
          <Field label="Credit Percent (%)" field="welcomeCreditPercent" />
          <Field label="Max Credit Cap ($)" field="welcomeCreditCap" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-pink-500" /> Upgrade Incentive</h3>
          <p className="text-[11px] text-gray-500 -mt-2">7-Day {'>'} 15/Monthly upgrade - credited to wallet immediately.</p>
          <Field label="Incentive Percent (%)" field="upgradeIncentivePercent" />
          <Field label="Max Incentive ($)" field="upgradeIncentiveCap" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Star className="w-4 h-4 text-green-500" /> Loyalty Credit</h3>
          <p className="text-[11px] text-gray-500 -mt-2">Monthly only, 2nd cycle onward - added to wallet.</p>
          <Field label="Credit Percent (%)" field="loyaltyCreditPercent" />
          <Field label="Min Credit ($)" field="loyaltyCreditMin" />
          <Field label="Max Credit ($)" field="loyaltyCreditMax" />
        </Card>
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-teal-500" /> Price Preview</h3>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Distance (km)</label>
            <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={previewDist} onChange={e => setPreviewDist(Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={previewPlan} onChange={e => setPreviewPlan(e.target.value)}>
              <option value="7d">7-Day</option><option value="15d">15-Day</option><option value="1m">Monthly</option>
            </select>
          </div>
          <Btn onClick={calcPreview} variant="secondary" className="w-full justify-center">Calculate</Btn>
          {preview && (
            <div className="text-xs space-y-1 bg-indigo-50 rounded-lg p-3">
              <p>Base route price/day: <b>${preview.brp}</b></p>
              <p>{preview.brp} x {preview.workingDays} working days x {preview.multiplier} = <b>${preview.planPrice}</b></p>
              {preview.welcomeCredit > 0 && <p className="text-emerald-700">- ${preview.welcomeCredit} welcome credit (Month 1 discount)</p>}
              <p className="font-bold text-indigo-700 text-sm">Guest pays: ${preview.finalPrice}</p>
              {preview.walletCredit > 0 && <p className="text-emerald-700">$ {preview.walletCredit} {'>'} wallet</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const SubscriptionsSection = () => {
  const { api } = useAdmin();
  const [plans, setPlans] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ role: 'guest', planType: '7d', name: '', durationDays: 5, multiplier: 1, isActive: true, badge: '', features: '' });

  const load = () => api.get('/api/admin/subscription-plans').then(setPlans).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const body = { ...form, features: form.features ? form.features.split('\n').filter(Boolean) : [] };
      if (editing) { await api.put(`/api/admin/subscription-plans/${editing.id}`, body); }
      else { await api.post('/api/admin/subscription-plans', body); }
      load(); setEditing(null); setCreating(false);
    } catch (e: any) { setError(e.message); }
  };

  const deactivate = async (id: string) => { try { await api.del(`/api/admin/subscription-plans/${id}`); load(); } catch (e: any) { setError(e.message); } };
  const startEdit = (p: any) => { setForm({ ...p, features: (p.features || []).join('\n') }); setEditing(p); setCreating(true); };

  const [confirmDeact, setConfirmDeact] = useState<any>(null);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal open={!!confirmDeact} title="Deactivate Plan" confirmLabel="Deactivate"
        message={`Are you sure you want to deactivate "${confirmDeact?.name}"? Users won't be able to purchase this plan.`}
        onConfirm={() => { if (confirmDeact) { deactivate(confirmDeact.id); setConfirmDeact(null); } }}
        onCancel={() => setConfirmDeact(null)} />
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Subscription Plans</h2>
        <Btn onClick={() => { setForm({ role: 'guest', planType: '7d', name: '', durationDays: 5, multiplier: 1, isActive: true, badge: '', features: '' }); setEditing(null); setCreating(true); }}>
          <Plus className="w-4 h-4" /> New Plan</Btn>
      </div>
      {creating && (
        <Card className="p-5 border-2 border-indigo-200 space-y-4">
          <h3 className="font-semibold text-gray-800">{editing ? 'Edit Plan' : 'Create Plan'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.role} onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                <option value="guest">Guest</option><option value="host">Host</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Plan Type</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={form.planType} onChange={e => setForm((f: any) => ({ ...f, planType: e.target.value }))}>
                <option value="7d">7 Days</option><option value="15d">15 Days</option><option value="1m">Monthly</option>
              </select>
            </div>
            <Input label="Plan Name" value={form.name} onChange={(e: any) => setForm((f: any) => ({ ...f, name: e.target.value }))} />
            <Input label="Duration (days)" type="number" value={form.durationDays} onChange={(e: any) => setForm((f: any) => ({ ...f, durationDays: Number(e.target.value) }))} />
            <Input label="Multiplier" type="number" step="0.1" value={form.multiplier} onChange={(e: any) => setForm((f: any) => ({ ...f, multiplier: parseFloat(e.target.value) }))} />
            <Input label="Badge (e.g. Popular)" value={form.badge} onChange={(e: any) => setForm((f: any) => ({ ...f, badge: e.target.value }))} />
          </div>
          <Textarea label="Features (one per line)" value={form.features} onChange={(e: any) => setForm((f: any) => ({ ...f, features: e.target.value }))} rows={3} />
          <div className="flex gap-2">
            <Btn onClick={save} variant="primary"><Save className="w-4 h-4" /> Save Plan</Btn>
            <Btn onClick={() => { setCreating(false); setEditing(null); }} variant="secondary">Cancel</Btn>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p: any) => (
          <Card key={p.id} className={`p-4 relative ${!p.isActive ? 'opacity-50' : ''}`}>
            {p.badge && <span className="absolute top-3 right-3 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{p.badge}</span>}
            <div className="flex items-center gap-2 mb-2">
              <Badge text={p.role} color={p.role === 'guest' ? 'blue' : 'purple'} />
              <Badge text={p.planType} color="gray" />
            </div>
            <h3 className="font-bold text-gray-900">{p.name}</h3>
            <p className="text-xs text-gray-500">{p.durationDays} days {p.multiplier ? `. x${p.multiplier} multiplier` : ''}</p>
            {p.features?.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {p.features.map((f: string, i: number) => <li key={i} className="text-xs text-gray-600 flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500" />{f}</li>)}
              </ul>
            )}
            <div className="flex gap-2 mt-3">
              <Btn size="sm" variant="secondary" onClick={() => startEdit(p)}><Edit3 className="w-3 h-3" /></Btn>
              {p.isActive && <Btn size="sm" variant="danger" onClick={() => setConfirmDeact(p)}><Trash2 className="w-3 h-3" /></Btn>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const WalletSection = () => {
  const { api } = useAdmin();
  const [wallets, setWallets] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [action, setAction] = useState('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = () => api.get(`/api/admin/wallets?page=${page}&limit=${limit}`).then(d => {
    if (d.error) { setError(d.error); return; }
    const list = Array.isArray(d) ? d : d.data || d.results || d;
    setWallets(list);
    setTotal(d.total || list.length);
  }).catch(e => setError(e.message));

  useEffect(() => { load(); }, [page]);

  const [confirmExec, setConfirmExec] = useState(false);
  const doAction = async () => {
    if (!selectedUser || !amount) return;
    setConfirmExec(false);
    try {
      await api.post('/api/admin/wallet/action', { userId: selectedUser, action, amount: Number(amount), reason });
      setMsg(`${action === 'credit' ? 'Credited' : 'Deducted'} $${amount} successfully`);
      setAmount(''); setReason('');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal open={confirmExec} title={`${action === 'credit' ? 'Credit' : 'Deduct'} Wallet`}
        message={`Are you sure you want to ${action} $${amount} ${selectedUser ? `for ${wallets.find(w => w.userId === selectedUser)?.userName || selectedUser}` : ''}?`}
        confirmLabel="Execute" variant={action === 'credit' ? 'success' : 'danger'}
        onConfirm={doAction} onCancel={() => setConfirmExec(false)} />
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">Manual Wallet Operation</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selectedUser || ''} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Select user...</option>
              {wallets.map((w: any) => <option key={w.userId} value={w.userId}>{w.userName} (${w.credits})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={action} onChange={e => setAction(e.target.value)}>
              <option value="credit">Credit (Add)</option><option value="deduct">Deduct (Remove)</option>
            </select>
          </div>
          <Input label="Amount ($)" type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} />
          <Input label="Reason" value={reason} onChange={(e: any) => setReason(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Btn onClick={() => setConfirmExec(true)} variant={action === 'credit' ? 'success' : 'danger'} disabled={!selectedUser || !amount}>
            <Wallet className="w-4 h-4" /> Execute</Btn>
          {msg && <p className="text-sm text-green-600">{msg}</p>}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>{['User', 'Balance', 'Transactions'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {wallets.map((w: any) => (
                <tr key={w.userId}>
                  <td className="px-4 py-3"><p className="font-medium">{w.userName}</p><p className="text-xs text-gray-400">{w.userEmail}</p></td>
                  <td className="px-4 py-3 font-bold text-gray-900">${w.credits}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{w.history?.length || 0} transactions</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <PaginationControls page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
};

const PaymentsSection = () => {
  const { api } = useAdmin();
  const [payments, setPayments] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'created' | 'success' | 'failed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(() => {
    api.get(`/api/admin/payments?status=${filter}&page=${page}&limit=${limit}`).then(d => {
      if (d.error) { setError(d.error); return; }
      const list = Array.isArray(d) ? d : d.data || d.results || d;
      setPayments(list);
      setTotal(d.total || list.length);
    }).catch(e => setError(e.message));
  }, [api, filter, page]);

  useEffect(() => { load(); }, [load]);

  const statusColor: Record<string, string> = { success: 'green', failed: 'red', created: 'amber' };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Payments</h2>
          <p className="text-xs text-gray-500">{total} total transactions</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm" value={filter} onChange={e => { setFilter(e.target.value as any); setPage(1); }}>
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="created">Pending</option>
          </select>
          <Btn onClick={load} variant="secondary" size="md"><RefreshCw className="w-4 h-4" /></Btn>
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>{['User', 'Plan', 'Amount', 'Provider Order ID', 'Status', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{p.userName}</p>
                    <p className="text-xs text-gray-400">{p.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.planName ? <Badge text={p.planName} color="blue" /> : <span className="text-gray-300">-</span>}
                    {p.role && <p className="text-[10px] text-gray-400 mt-0.5">{p.role}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{p.amount}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.providerOrderId || '-'}</td>
                  <td className="px-4 py-3"><Badge text={p.status} color={statusColor[p.status] || 'gray'} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <PaginationControls page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
};

const NotificationsSection = () => {
  const { api } = useAdmin();
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [audience, setAudience] = useState('all');
  const [selTemplate, setSelTemplate] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/api/admin/notification-templates').then(setTemplates).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const saveTemplate = async (t: any) => { try { await api.put(`/api/admin/notification-templates/${t.id}`, t); load(); setEditing(null); } catch (e: any) { setError(e.message); } };
  const broadcast = async () => { try { const res = await api.post('/api/admin/notifications/broadcast', { templateId: selTemplate, audience, customMessage: broadcastMsg }); setResult(res); } catch (e: any) { setError(e.message); } };

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Send Broadcast</h3>
          <Megaphone className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={audience} onChange={e => setAudience(e.target.value)}>
              <option value="all">All Users</option>
              <option value="subscribers">Active Subscribers</option>
              <option value="college">College Users</option>
              <option value="active">Active Users</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value={selTemplate} onChange={e => setSelTemplate(e.target.value)}>
              <option value="">Select template...</option>
              {templates.filter((t: any) => t.isActive).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Textarea label="Custom message (optional)" value={broadcastMsg} onChange={(e: any) => setBroadcastMsg(e.target.value)} rows={1} />
        </div>
        <div className="flex items-center gap-3">
          <Btn onClick={broadcast} variant="primary"><Send className="w-4 h-4" /> Send Broadcast</Btn>
          {result && <p className="text-sm text-green-600">Sent to {result.sent} users successfully</p>}
        </div>
      </Card>
      <h3 className="font-semibold text-gray-800">Notification Templates</h3>
      <div className="grid gap-4">
        {templates.map((t: any) => (
          <Card key={t.id} className="p-4">
            {editing?.id === t.id ? (
              <div className="space-y-3">
                <Input label="Title" value={editing.title} onChange={(e: any) => setEditing((x: any) => ({ ...x, title: e.target.value }))} />
                <Textarea label="Body" value={editing.body} onChange={(e: any) => setEditing((x: any) => ({ ...x, body: e.target.value }))} rows={2} />
                <div className="flex gap-2">
                  <Btn size="sm" onClick={() => saveTemplate(editing)}><Save className="w-3 h-3" /> Save</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</Btn>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{t.name}</h4>
                    <Badge text={t.channel} color={t.channel === 'push' ? 'blue' : t.channel === 'sms' ? 'green' : 'purple'} />
                    <Badge text={t.isActive ? 'Active' : 'Disabled'} color={t.isActive ? 'green' : 'gray'} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{t.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.body}</p>
                </div>
                <Btn size="sm" variant="secondary" onClick={() => setEditing({ ...t })}><Edit3 className="w-3 h-3" /></Btn>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

const CMSSection = () => {
  const { api } = useAdmin();
  const [pages, setPages] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/api/admin/cms').then(p => { setPages(p); if (p.length > 0) setActive((prev: any) => prev ?? p[0]); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!active) return;
    try {
      await api.put(`/api/admin/cms/${active.slug}`, { title: active.title, content: active.content });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="flex gap-4 h-[600px]">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="w-48 shrink-0 space-y-1">
        {pages.map((p: any) => (
          <button key={p.id} onClick={() => setActive({ ...p })}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${active?.slug === p.slug ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
            {p.title}
          </button>
        ))}
      </div>
      {active && (
        <Card className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <Input label="Page Title" value={active.title} onChange={(e: any) => setActive((a: any) => ({ ...a, title: e.target.value }))} />
            <Btn onClick={save} variant={saved ? 'success' : 'primary'} className="ml-4 self-end shrink-0">
              <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save'}</Btn>
          </div>
          <div className="flex-1 overflow-hidden">
            <label className="block text-xs font-medium text-gray-600 mb-1">Content (Markdown)</label>
            <textarea className="w-full h-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              value={active.content} onChange={e => setActive((a: any) => ({ ...a, content: e.target.value }))} />
          </div>
          <p className="text-xs text-gray-400">Last updated: {new Date(active.updatedAt).toLocaleString()}</p>
        </Card>
      )}
    </div>
  );
};

const BrandingSection = () => {
  const { api } = useAdmin();
  const [branding, setBranding] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { api.get('/api/branding').then(setBranding).catch(e => setError(e.message)); }, [api]);

  const save = async () => {
    if (!branding) return;
    try { await api.put('/api/admin/branding', branding); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e: any) { setError(e.message); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('File must be under 2MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imageData = ev.target?.result as string;
      try {
        const res = await api.post('/api/admin/branding/upload-logo', { imageData });
        if (res?.logoUrl) setBranding((b: any) => ({ ...b, logoUrl: res.logoUrl }));
      } catch (e: any) { setError(e.message); }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!branding) return error ? <ErrorBanner message={error} /> : <p className="text-gray-400 p-6">Loading...</p>;

  return (
    <div className="space-y-5 max-w-2xl">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Branding Management</h2>
          <p className="text-sm text-gray-500">Changes apply instantly - no deployment needed</p>
        </div>
        <Btn onClick={save} variant={saved ? 'success' : 'primary'}><Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}</Btn>
      </div>
      <Card className="p-5 space-y-5">
        <h3 className="font-semibold text-gray-800">Logo</h3>
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center">
            {branding.logoUrl ? <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Upload className="w-6 h-6 text-gray-300" />}
          </div>
          <div className="space-y-2">
            <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <Btn onClick={() => fileRef.current?.click()} variant="secondary" disabled={uploading}><Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Logo'}</Btn>
            <p className="text-xs text-gray-400">PNG or JPG, max 2MB. Replaces existing logo.</p>
            <Input label="Or paste image URL" value={branding.logoUrl} onChange={(e: any) => setBranding((b: any) => ({ ...b, logoUrl: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="App Name" value={branding.appName} onChange={(e: any) => setBranding((b: any) => ({ ...b, appName: e.target.value }))} />
          <Input label="Tagline" value={branding.tagline} onChange={(e: any) => setBranding((b: any) => ({ ...b, tagline: e.target.value }))} />
          <Input label="Support Email" type="email" value={branding.supportEmail} onChange={(e: any) => setBranding((b: any) => ({ ...b, supportEmail: e.target.value }))} />
          <Input label="Support Phone" value={branding.supportPhone} onChange={(e: any) => setBranding((b: any) => ({ ...b, supportPhone: e.target.value }))} />
        </div>
      </Card>
    </div>
  );
};

const FlagsSection = () => {
  const { api } = useAdmin();
  const [flags, setFlags] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.get('/api/feature-flags').then(setFlags).catch(e => setError(e.message)); }, []);

  const toggle = async (key: string) => {
    try {
      await api.put('/api/admin/feature-flags', { [key]: !flags[key] });
      setFlags((f: any) => ({ ...f, [key]: !f[key] }));
      setSaved(true); setTimeout(() => setSaved(false), 1500);
    } catch (e: any) { setError(e.message); }
  };

  const FLAG_META: Record<string, { label: string; desc: string; color: string }> = {
    walletEnabled:         { label: 'Wallet',              desc: 'Users can hold and spend wallet credits',     color: 'purple' },
    subscriptionsEnabled:  { label: 'Subscriptions',       desc: 'Enable subscription purchase flow',           color: 'blue' },
    referralEnabled:       { label: 'Referral System',     desc: 'Users can invite friends and earn rewards',   color: 'green' },
    sosEnabled:            { label: 'SOS Emergency',       desc: 'Emergency alert button during rides',         color: 'red' },
    premiumEnabled:        { label: 'Premium Features',    desc: 'Unlock advanced analytics for hosts',         color: 'amber' },
    adsEnabled:            { label: 'Ads',                 desc: 'Show promotional content on feeds',           color: 'orange' },
    liveTrackingEnabled:   { label: 'Live Tracking',       desc: 'Real-time GPS location sharing during rides', color: 'teal' },
    chatEnabled:           { label: 'In-app Chat',         desc: 'Messaging between guests and hosts',          color: 'indigo' },
    promoCodesEnabled:     { label: 'Promo Codes',         desc: 'Users can apply discount codes at checkout',  color: 'pink' },
  };

  if (!flags) return error ? <ErrorBanner message={error} /> : <p className="text-gray-400 p-6">Loading...</p>;

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Feature Flags</h2>
          <p className="text-sm text-gray-500">Toggle features on/off - changes apply immediately without deployment</p>
        </div>
        {saved && <p className="text-sm text-green-600 font-medium">Saved</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(FLAG_META).map(([key, meta]) => (
          <Card key={key} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${BG_COLORS[meta.color] || BG_COLORS.gray}`}>
                <Flag className={`w-4 h-4 ${TEXT_COLORS[meta.color] || TEXT_COLORS.gray}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">{meta.label}</p>
                <p className="text-xs text-gray-500">{meta.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <code className="text-xs text-gray-400 font-mono hidden md:block">{key} = {String(flags[key])}</code>
              <Toggle checked={flags[key]} onChange={() => toggle(key)} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const PromosSection = () => {
  const { api } = useAdmin();
  const [promos, setPromos] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', discountPercent: 10, usageLimit: 100, expiryDate: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/api/admin/promo-codes').then(setPromos).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => { try { await api.post('/api/admin/promo-codes', { ...form, isActive: true }); load(); setCreating(false); setForm({ code: '', discountPercent: 10, usageLimit: 100, expiryDate: '', description: '' }); } catch (e: any) { setError(e.message); } };
  const deactivate = async (id: string) => { try { await api.del(`/api/admin/promo-codes/${id}`); load(); } catch (e: any) { setError(e.message); } };

  const [confirmDeact, setConfirmDeact] = useState<any>(null);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal open={!!confirmDeact} title="Deactivate Promo Code" confirmLabel="Deactivate"
        message={`Are you sure you want to deactivate "${confirmDeact?.code}"? Users won't be able to use this code.`}
        onConfirm={() => { if (confirmDeact) { deactivate(confirmDeact.id); setConfirmDeact(null); } }}
        onCancel={() => setConfirmDeact(null)} />
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Promo Codes</h2>
        <Btn onClick={() => setCreating(c => !c)}><Plus className="w-4 h-4" /> New Code</Btn>
      </div>
      {creating && (
        <Card className="p-5 border-2 border-indigo-200 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Promo Code" value={form.code} onChange={(e: any) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SUMMER20" />
            <Input label="Discount %" type="number" value={form.discountPercent} onChange={(e: any) => setForm(f => ({ ...f, discountPercent: Number(e.target.value) }))} />
            <Input label="Usage Limit" type="number" value={form.usageLimit} onChange={(e: any) => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))} />
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e: any) => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            <div className="col-span-2"><Input label="Description" value={form.description} onChange={(e: any) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2"><Btn onClick={create}><Save className="w-4 h-4" /> Create</Btn><Btn variant="secondary" onClick={() => setCreating(false)}>Cancel</Btn></div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {promos.map((p: any) => (
          <Card key={p.id} className={`p-4 ${!p.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-lg font-bold text-indigo-700">{p.code}</code>
                  <Badge text={`${p.discountPercent}% off`} color="amber" />
                  {!p.isActive && <Badge text="Deactivated" color="red" />}
                </div>
                <p className="text-xs text-gray-500">{p.description}</p>
                <p className="text-xs text-gray-400 mt-1">Used: {p.usedCount}/{p.usageLimit} . Expires: {p.expiryDate}</p>
              </div>
              {p.isActive && <Btn size="sm" variant="danger" onClick={() => setConfirmDeact(p)}><Trash2 className="w-3 h-3" /></Btn>}
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(p.usedCount / p.usageLimit) * 100}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const VouchersSection = () => {
  const { api } = useAdmin();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', amount: 100, usageLimit: 100, expiryDate: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/api/admin/vouchers').then(d => setVouchers(Array.isArray(d) ? d : [])).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    setErr('');
    try {
      const res = await api.post('/api/admin/vouchers', { ...form });
      if (res?.error) { setErr(res.error); return; }
      load(); setCreating(false); setForm({ code: '', amount: 100, usageLimit: 100, expiryDate: '', description: '' });
    } catch (e: any) { setError(e.message); }
  };

  const deactivate = async (id: string) => { try { await api.del(`/api/admin/vouchers/${id}`); load(); } catch (e: any) { setError(e.message); } };

  const [confirmDeact, setConfirmDeact] = useState<any>(null);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <ConfirmModal open={!!confirmDeact} title="Deactivate Voucher" confirmLabel="Deactivate"
        message={`Are you sure you want to deactivate "${confirmDeact?.code}"? Users won't be able to redeem this voucher.`}
        onConfirm={() => { if (confirmDeact) { deactivate(confirmDeact.id); setConfirmDeact(null); } }}
        onCancel={() => setConfirmDeact(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Vouchers</h2>
          <p className="text-xs text-gray-500">One-time wallet-credit codes. Creating one notifies every user.</p>
        </div>
        <Btn onClick={() => { setErr(''); setCreating(c => !c); }}><Plus className="w-4 h-4" /> New Voucher</Btn>
      </div>
      {creating && (
        <Card className="p-5 border-2 border-indigo-200 space-y-4">
          {err && <p className="text-sm text-rose-600">{err}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Input label="Voucher Code" value={form.code} onChange={(e: any) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. WELCOME100" />
            <Input label="Credit Amount ($)" type="number" value={form.amount} onChange={(e: any) => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            <Input label="Usage Limit (total)" type="number" value={form.usageLimit} onChange={(e: any) => setForm(f => ({ ...f, usageLimit: Number(e.target.value) }))} />
            <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={(e: any) => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
            <div className="col-span-2"><Input label="Description" value={form.description} onChange={(e: any) => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2"><Btn onClick={create}><Save className="w-4 h-4" /> Create & Notify</Btn><Btn variant="secondary" onClick={() => setCreating(false)}>Cancel</Btn></div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {vouchers.map((v: any) => (
          <Card key={v.id} className={`p-4 ${!v.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-lg font-bold text-purple-700">{v.code}</code>
                  <Badge text={`$${v.amount}`} color="green" />
                  {!v.isActive && <Badge text="Deactivated" color="red" />}
                </div>
                <p className="text-xs text-gray-500">{v.description}</p>
                <p className="text-xs text-gray-400 mt-1">Redeemed: {v.redemptionCount}/{v.usageLimit}{v.expiryDate ? ` . Expires: ${v.expiryDate}` : ''}</p>
              </div>
              {v.isActive && <Btn size="sm" variant="danger" onClick={() => setConfirmDeact(v)}><Trash2 className="w-3 h-3" /></Btn>}
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, (v.redemptionCount / Math.max(1, v.usageLimit)) * 100)}%` }} />
            </div>
          </Card>
        ))}
        {vouchers.length === 0 && <p className="text-sm text-gray-400 col-span-2 text-center py-8">No vouchers yet</p>}
      </div>
    </div>
  );
};

const AnalyticsSection = () => {
  const { api } = useAdmin();
  const [data, setData] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get('/api/admin/analytics'), api.get('/api/admin/revenue')])
      .then(([a, r]) => { setData(a); setRevenue(r); })
      .catch(e => setError(e.message));
  }, []);

  if (!data || !revenue) return <p className="text-gray-400 p-6">Loading...</p>;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Today Revenue" value={`$${revenue.today?.toLocaleString('en-IN')}`} icon={TrendingUp} color="green" />
        <KpiCard label="Monthly Revenue" value={`$${revenue.monthly?.toLocaleString('en-IN')}`} icon={DollarSign} color="indigo" />
        <KpiCard label="Subscription Rev" value={`$${revenue.subscriptionRevenue?.toLocaleString('en-IN')}`} icon={Package} color="blue" />
        <KpiCard label="Net Revenue" value={`$${revenue.netRevenue?.toLocaleString('en-IN')}`} sub={`-$${revenue.refundAmount} refunds`} icon={Award} color="emerald" />
      </div>
      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Revenue Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>{['User', 'Plan', 'Amount', 'Date', 'Status'].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {revenue.breakdown?.map((r: any) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm">{r.userName}</td>
                  <td className="px-4 py-2"><Badge text={r.plan} color="blue" /></td>
                  <td className="px-4 py-2 font-medium">${r.amount}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{r.date}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const SupportSection = () => {
  const { api } = useAdmin();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const load = useCallback(() => {
    api.get(`/api/admin/tickets?status=${filter}&page=${page}&limit=${limit}`).then(d => {
      if (d.error) { setError(d.error); return; }
      const list = Array.isArray(d) ? d : d.data || d.results || d;
      setTickets(list);
      setTotal(d.total || list.length);
    }).catch(e => setError(e.message));
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (ticketId: string, action: string) => {
    try {
      await api.post('/api/admin/tickets/action', { ticketId, action });
      load();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex gap-2">
        {['all', 'open', 'resolved', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {tickets.map((t: any) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={t.status} />
                  {t.ticketType && <Badge text={t.ticketType} color="blue" />}
                </div>
                <p className="font-medium text-gray-900">{t.subject}</p>
                <p className="text-xs text-gray-400">{t.userName} . {new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Btn size="sm" variant="success" onClick={() => doAction(t.id, 'approve')}>Approve</Btn>
                <Btn size="sm" variant="danger" onClick={() => doAction(t.id, 'reject')}>Reject</Btn>
                <Btn size="sm" variant="secondary" onClick={() => doAction(t.id, 'resolve')}>Resolve</Btn>
              </div>
            </div>
          </Card>
        ))}
        {tickets.length === 0 && <p className="text-center py-10 text-gray-400">No tickets in this category</p>}
      </div>
      <PaginationControls page={page} total={total} limit={limit} onChange={setPage} />
    </div>
  );
};

const AuditSection = () => {
  const { api } = useAdmin();
  const [data, setData] = useState<any>({ logs: [], total: 0, page: 1 });
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => { api.get(`/api/admin/audit-logs?page=${page}&limit=${limit}`).then(setData).catch(e => setError(e.message)); }, [page]);

  const ACTION_COLORS: Record<string, string> = {
    USER_SUSPEND: 'amber', USER_BAN: 'red', USER_VERIFY: 'green', USER_RESET: 'blue',
    PRICING_UPDATED: 'purple', THEME_UPDATED: 'pink', BRANDING_UPDATED: 'indigo',
    PLAN_CREATED: 'green', PLAN_DEACTIVATED: 'red', LOGO_UPLOADED: 'blue',
    BROADCAST_SENT: 'teal', WALLET_CREDIT: 'green', WALLET_DEDUCT: 'red',
    CMS_UPDATED: 'orange', PROMO_CREATED: 'emerald', PROMO_DEACTIVATED: 'red',
    FEATURE_FLAGS_UPDATED: 'violet', RIDE_CANCEL: 'red',
  };

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Audit Logs</h2>
          <p className="text-sm text-gray-500">{data.total} total actions logged - never deleted</p>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => api.get(`/api/admin/audit-logs?page=${page}&limit=${limit}`).then(setData)}><RefreshCw className="w-4 h-4" /></Btn>
      </div>
      {data.logs.length === 0 ? (
        <Card className="p-12 text-center">
          <ScrollText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No audit logs yet. Actions you take in the admin panel will appear here.</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-gray-50">
            {data.logs.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 px-5 py-3">
                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${TEXT_COLORS[ACTION_COLORS[log.action] || 'gray']?.replace('text-', 'bg-')?.replace('-600', '-500') || 'bg-gray-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge text={log.action.replace(/_/g, ' ')} color={ACTION_COLORS[log.action] || 'gray'} />
                    <span className="text-sm font-medium text-gray-700">{log.target}</span>
                  </div>
                  {log.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{log.adminName}</p>
                  <p className="text-xs text-gray-300">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  <p className="text-xs text-gray-300">{new Date(log.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <PaginationControls page={data.page || page} total={data.total || 0} limit={limit} onChange={p => { setPage(p); setData((d: any) => ({ ...d, page: p })); }} />
    </div>
  );
};

const SettingsSection = () => {
  const { api } = useAdmin();
  const [cfg, setCfg] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.get('/api/admin/settings').then(setCfg).catch(e => setError(e.message)); }, [api]);

  const save = async () => {
    try { await api.post('/api/admin/settings', cfg); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch (e: any) { setError(e.message); }
  };

  if (!cfg) return error ? <ErrorBanner message={error} /> : null;

  return (
    <div className="space-y-5 max-w-xl">
      <ErrorBanner message={error} onDismiss={() => setError(null)} />
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">System Settings</h2>
        <Btn onClick={save} variant={saved ? 'success' : 'primary'}><Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save'}</Btn>
      </div>
      <Card className="p-5 space-y-4">
        <Input label="Banner Text" value={cfg.bannerText} onChange={(e: any) => setCfg((c: any) => ({ ...c, bannerText: e.target.value }))} />
        <Input label="Per KM Rate ($)" type="number" value={cfg.perKmRate} onChange={(e: any) => setCfg((c: any) => ({ ...c, perKmRate: Number(e.target.value) }))} />
        <Toggle checked={cfg.allowWomenOnlyMode} onChange={v => setCfg((c: any) => ({ ...c, allowWomenOnlyMode: v }))} label="Allow Women-Only Mode" />
      </Card>
    </div>
  );
};

const SECTIONS: Record<string, React.ComponentType> = {
  dashboard: DashboardSection, users: UsersSection, rides: RidesSection,
  kyc: KYCSection, pricing: PricingSection, subscriptions: SubscriptionsSection,
  wallet: WalletSection, payments: PaymentsSection, notifications: NotificationsSection,
  cms: CMSSection, branding: BrandingSection, flags: FlagsSection,
  promos: PromosSection, vouchers: VouchersSection, analytics: AnalyticsSection,
  support: SupportSection, audit: AuditSection, settings: SettingsSection,
};

interface AdminDashboardProps {
  currentUser: User;
  onSettingsSaved?: (s: any) => void;
  onRefreshWallet?: () => void;
}

export default function AdminDashboard({ currentUser, onSettingsSaved, onRefreshWallet }: AdminDashboardProps) {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const adminRole = (currentUser.adminRole ?? 'ADMIN') as AdminRole;
  const api = React.useMemo(() => makeApi(currentUser.id), [currentUser.id]);
  const can    = (section: string) => (SECTION_PERMISSIONS[section] ?? []).includes(adminRole);
  const canDo  = (...roles: AdminRole[]) => roles.includes(adminRole);

  const ctxValue: AdminContextType = { currentUser, adminRole, api, can, canDo };
  const visibleNav = NAV.filter(n => can(n.id));
  const Section = SECTIONS[active] || DashboardSection;
  const activeNav = NAV.find(n => n.id === active);
  const showLabels = sidebarOpen || mobileNavOpen;

  const ROLE_COLORS: Record<AdminRole, string> = {
    SUPER_ADMIN: 'text-purple-600 bg-purple-50',
    ADMIN:       'text-indigo-600 bg-indigo-50',
    FINANCE:     'text-green-600  bg-green-50',
    SUPPORT:     'text-blue-600   bg-blue-50',
    OPERATIONS:  'text-amber-600  bg-amber-50',
  };

  return (
    <AdminCtx.Provider value={ctxValue}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {mobileNavOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileNavOpen(false)} />
        )}
        <aside className={`bg-white border-r border-gray-100 flex flex-col z-40
          fixed inset-y-0 left-0 w-64 transition-transform duration-200 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:transition-[width] ${sidebarOpen ? 'md:w-60' : 'md:w-16'} md:shrink-0`}>
          <div className="h-14 flex items-center px-4 border-b border-gray-100 gap-3">
            {showLabels && (
              <div>
                <p className="text-sm font-bold text-gray-900">Admin Panel</p>
                <p className="text-xs text-gray-400">Move Buddy</p>
              </div>
            )}
            <button onClick={() => { if (mobileNavOpen) setMobileNavOpen(false); else setSidebarOpen(o => !o); }} className="ml-auto p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              {showLabels ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {groups.map(group => {
              const groupItems = visibleNav.filter(n => n.group === group);
              if (groupItems.length === 0) return null;
              return (
                <div key={group}>
                  {showLabels && <p className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-gray-400 font-semibold">{group}</p>}
                  {groupItems.map(n => {
                    const Icon = n.icon;
                    return (
                      <button key={n.id} onClick={() => { setActive(n.id); setMobileNavOpen(false); }}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all ${active === n.id ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        <Icon className="w-4 h-4 shrink-0" />
                        {showLabels && <span className="truncate">{n.label}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          {showLabels && (
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center gap-2 px-2 py-2">
                <img src={currentUser.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{currentUser.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[adminRole]}`}>{adminRole}</span>
                </div>
              </div>
            </div>
          )}
        </aside>
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="sticky top-0 z-10 h-14 bg-white border-b border-gray-100 flex items-center px-4 sm:px-6 gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-bold text-gray-900 truncate">{activeNav?.label}</h1>
            <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">
              <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[adminRole]}`}>{adminRole}</span>
              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Live</span>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            {can(active) ? <Section /> : <AccessDenied section={activeNav?.label ?? active} required={SECTION_PERMISSIONS[active] ?? []} />}
          </div>
        </main>
      </div>
    </AdminCtx.Provider>
  );
}

