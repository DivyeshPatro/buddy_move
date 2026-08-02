import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Users, Bell, Package, Coins, Star, Bike, MapPin, ArrowRight,
  CheckCircle, Loader, Activity, TrendingUp, Sunrise, Sunset, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { User, UserRole, CustomerView } from '../types';
import StatCard, { StatSkeleton } from './StatCard';

interface CustomerDashboardProps {
  currentUser: User;
  onGoToCommute: () => void;     // switch to the commute hub (the action surface)
  onRefreshWallet?: () => void;
  onToggleRole?: (newRole: UserRole, targetView?: CustomerView) => void;
}

interface Sub { id: string; planName: string; direction?: 'forward' | 'return'; origin?: string; destination?: string; departureTime?: string; endDate?: string; status?: string; role?: string; distanceKm?: number; }
interface Match { id: string; direction: 'forward' | 'return'; proximityTierM: number; score: number; status?: string; youAre?: string; buddy: { name: string; avatarUrl: string; rating: number } | null; route: { origin?: string; destination?: string } | null; }
interface Tx { id: string; amount: number; type: 'credit' | 'debit'; description: string; timestamp: string; }
interface Payout { hasActiveSubscription: boolean; payout: number; eligibleActiveDays?: number; rideEarnings?: number; slabIncentive?: number; distanceKm?: number; formula?: string; }

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const dirLabel = (d?: string) => (d === 'forward' ? 'Morning · Home → Destination' : 'Evening · Destination → Home');
const fmtINR = (n: number) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
const fmtDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

export default function CustomerDashboard({ currentUser, onGoToCommute, onRefreshWallet, onToggleRole }: CustomerDashboardProps) {
  const isHost = currentUser.role === 'host';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subs, setSubs] = useState<Sub[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [wallet, setWallet] = useState<{ credits: number; history: Tx[] } | null>(null);
  const [unread, setUnread] = useState(0);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [rowErr, setRowErr] = useState('');

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true); setError('');
    try {
      const calls: Promise<any>[] = [
        fetch(`/api/subscriptions/${currentUser.id}`).then(r => r.json()),
        fetch(`/api/matches/${currentUser.id}`).then(r => r.json()),
        fetch(`/api/wallet/${currentUser.id}`).then(r => r.json()),
        fetch(`/api/notifications/${currentUser.id}`).then(r => r.json()),
        isHost ? fetch(`/api/host/${currentUser.id}/payout`).then(r => r.json()) : Promise.resolve(null),
      ];
      const [s, m, w, n, p] = await Promise.all(calls);
      setSubs(Array.isArray(s) ? s : []);
      setMatches(Array.isArray(m) ? m : []);
      setWallet(w && typeof w.credits === 'number' ? w : { credits: 0, history: [] });
      setUnread(Number(n?.unread) || 0);
      setPayout(p);
    } catch {
      setError('Something went wrong loading your dashboard.');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [currentUser.id, isHost]);

  useEffect(() => { load(); }, [load]);

  const completeRide = async (matchId: string) => {
    setCompleting(matchId); setRowErr('');
    try {
      const res = await fetch('/api/rides/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Could not mark ride complete');
      // Refresh the real earnings/active-days + wallet.
      const p = await fetch(`/api/host/${currentUser.id}/payout`).then(r => r.json());
      setPayout(p);
      onRefreshWallet?.();
    } catch (e: any) {
      setRowErr(e?.message || 'Could not mark ride complete. Try again.');
      setTimeout(() => setRowErr(''), 4000);
    } finally {
      setCompleting(null);
    }
  };

  const firstName = (currentUser.name || '').split(' ')[0] || 'there';
  const history = (wallet?.history || []).slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
      {/* Greeting */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-black text-[#2a2e34]">{greeting()}, {firstName} 👋</h2>
          <p className="text-sm text-[#2a2e34]/60 mt-0.5">{isHost ? 'Your host activity & earnings at a glance.' : 'Your passes, buddies & wallet at a glance.'}</p>
        </div>
        <img src={currentUser.avatarUrl} alt="" className="w-11 h-11 rounded-full object-cover border-2 border-[#ffb300]/40 shrink-0" />
      </div>
      {/* Premium Mode Selector Toggle Card */}
      <div className="mb-6 bg-white dark:bg-[#1f2226] border border-[#ffb300]/25 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="p-3 bg-[#ffb300]/15 rounded-2xl hidden sm:block shrink-0">
            <Bike className="w-6 h-6 text-[#b57e00]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#2a2e34] dark:text-[#e9eaec]">Currently in {isHost ? 'Host Mode (Offer Rides)' : 'Guest Mode (Find Rides)'}</h3>
            <p className="text-xs text-[#2a2e34]/60 dark:text-[#e9eaec]/60 mt-0.5">Switch modes to {isHost ? 'find and request ride passes' : 'publish routes and earn credits'}.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[#eef0f3] dark:bg-slate-900 rounded-full border border-[#ffb300]/15 shrink-0">
          <button
            onClick={() => onToggleRole?.('guest', 'dashboard')}
            className={`px-4 py-2 text-xs font-black tracking-wider uppercase rounded-full transition-all cursor-pointer ${
              !isHost
                ? 'bg-[#ffb300] text-[#2a2e34] shadow-md font-black'
                : 'text-[#2a2e34]/65 dark:text-[#e9eaec]/65 hover:text-[#2a2e34] dark:hover:text-[#e9eaec]'
            }`}
          >
            Guest (Find Ride)
          </button>
          <button
            onClick={() => onToggleRole?.('host', 'dashboard')}
            className={`px-4 py-2 text-xs font-black tracking-wider uppercase rounded-full transition-all cursor-pointer ${
              isHost
                ? 'bg-[#ffb300] text-[#2a2e34] shadow-md font-black'
                : 'text-[#2a2e34]/65 dark:text-[#e9eaec]/65 hover:text-[#2a2e34] dark:hover:text-[#e9eaec]'
            }`}
          >
            Host (Offer Ride)
          </button>
        </div>
      </div>
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 bg-rose-50 border border-rose-300 text-rose-700 text-sm p-3 rounded-xl">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
          <button onClick={load} className="flex items-center gap-1 font-bold text-rose-700 hover:text-rose-900"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          <>{[0, 1, 2, 3].map(i => <StatSkeleton key={i} />)}</>
        ) : isHost ? (
          <>
            <StatCard icon={Coins} label="Total Earnings" value={payout?.payout || 0} prefix="₹" accent="#16a34a" index={0} subtitle="activity-based" />
            <StatCard icon={Activity} label="Active Ride-Days" value={payout?.eligibleActiveDays || 0} accent="#2563eb" index={1} subtitle="rides completed" />
            <StatCard icon={Users} label="Assigned Buddies" value={matches.length} accent="#ea580c" index={2} subtitle="current passengers" />
            <StatCard icon={Star} label="Rating" value={currentUser.rating ? `${currentUser.rating} ★` : 'New'} accent="#ca8a04" index={3} subtitle={`buddy score ${currentUser.buddyScore ?? '—'}`} />
          </>
        ) : (
          <>
            <StatCard icon={Package} label="Active Passes" value={subs.length} accent="#7c3aed" index={0} subtitle="of 2 directions" />
            <StatCard icon={Wallet} label="Wallet Balance" value={wallet?.credits || 0} prefix="₹" accent="#16a34a" index={1} subtitle="available credits" />
            <StatCard icon={Users} label="Buddies Matched" value={matches.length} accent="#2563eb" index={2} subtitle="commute partners" />
            <StatCard icon={Bell} label="Notifications" value={unread} accent="#db2777" index={3} subtitle="unread" />
          </>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => <div key={i} className="h-20 bg-white border border-[#ffb300]/10 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={isHost ? 'host' : 'guest'}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* HOST: earnings breakdown */}
            {isHost && payout?.hasActiveSubscription && (
              <Section title="Earnings breakdown" icon={TrendingUp}>
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat label="Ride earnings" value={fmtINR(payout.rideEarnings || 0)} />
                  <MiniStat label="Slab incentive" value={fmtINR(payout.slabIncentive || 0)} />
                  <MiniStat label="Total payout" value={fmtINR(payout.payout || 0)} accent />
                </div>
                {payout.formula && <p className="text-[11px] text-[#2a2e34]/50 mt-2 font-mono">{payout.formula}</p>}
              </Section>
            )}

            {/* Buddies / assigned passengers */}
            <Section title={isHost ? 'Assigned buddies' : 'Your buddies'} icon={Users}>
              {matches.length === 0 ? (
                <Empty text={isHost ? 'No buddies assigned yet — guests are auto-matched to your route.' : "Finding your buddy… we'll notify you when matched."} />
              ) : (
                <div className="space-y-2">
                  {matches.map(m => (
                    <div key={m.id} className="flex items-center gap-3 bg-[#eef0f3] rounded-xl p-3 border border-[#ffb300]/10">
                      <img src={m.buddy?.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-[#ffb300]/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#2a2e34] truncate">{m.buddy?.name || 'Buddy'}</p>
                        <p className="text-[11px] text-[#2a2e34]/55 truncate flex items-center gap-1">
                          {m.direction === 'forward' ? <Sunrise className="w-3 h-3" /> : <Sunset className="w-3 h-3" />}
                          {m.route?.origin} → {m.route?.destination} · {m.score}% match
                        </p>
                      </div>
                      {isHost && m.status !== 'completed' && (
                        <button
                          onClick={() => completeRide(m.id)}
                          disabled={completing === m.id}
                          className="shrink-0 bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-60"
                        >
                          {completing === m.id ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Ride done
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {rowErr && <p className="mt-2 text-[11px] text-rose-600">{rowErr}</p>}
            </Section>

            {/* Active passes (guest) / subscription (host) */}
            <Section title={isHost ? 'Your network subscription' : 'Active passes'} icon={Package}>
              {subs.length === 0 ? (
                <Empty text={isHost ? 'No active host subscription. Join the network to start earning.' : 'No active passes. Set up a commute to get matched.'} />
              ) : (
                <div className="space-y-2">
                  {subs.map(s => (
                    <div key={s.id} className="bg-[#eef0f3] rounded-xl p-3 border border-[#ffb300]/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#b57e00]">{isHost ? 'Host Network' : dirLabel(s.direction)}</span>
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full font-bold">{s.planName}</span>
                      </div>
                      <p className="text-[11px] text-[#2a2e34]/60 mt-1 truncate flex items-center gap-1"><MapPin className="w-3 h-3 text-[#b57e00]" />{s.origin} → {s.destination}</p>
                      {s.endDate && <p className="text-[10px] text-[#2a2e34]/40 mt-0.5">Valid until {s.endDate}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Recent wallet activity (real ledger) */}
            <Section title="Recent activity" icon={Activity}>
              {history.length === 0 ? (
                <Empty text="No transactions yet." />
              ) : (
                <div className="space-y-1.5">
                  {history.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between bg-[#eef0f3] rounded-lg px-3 py-2 border border-[#ffb300]/5">
                      <div className="min-w-0">
                        <p className="text-xs text-[#2a2e34] truncate">{tx.description}</p>
                        <p className="text-[10px] text-[#2a2e34]/40">{fmtDate(tx.timestamp)}</p>
                      </div>
                      <span className={`text-xs font-bold font-mono shrink-0 ml-2 ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'credit' ? '+' : '−'}₹{tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={onGoToCommute} className="text-left bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] rounded-2xl p-4 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <Bike className="w-6 h-6" />
                  <div>
                    <p className="font-black text-sm">{isHost ? 'Manage host network' : 'Set up / manage commute'}</p>
                    <p className="text-[11px] opacity-80">{isHost ? 'Route, assigned guests, complete rides' : 'Routes, buddies & subscribe'}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button onClick={load} className="text-left bg-white hover:bg-[#eef0f3] border border-[#ffb300]/30 text-[#2a2e34] rounded-2xl p-4 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-6 h-6 text-[#b57e00]" />
                  <div>
                    <p className="font-black text-sm">Refresh data</p>
                    <p className="text-[11px] text-[#2a2e34]/55">Pull the latest from your account</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-[#b57e00]" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

const Section = ({ title, icon: Icon, children }: { title: string; icon: import("react").ComponentType<any>; children: import("react").ReactNode }) => (
  <div>
    <h3 className="text-xs font-bold uppercase tracking-wider text-[#2a2e34]/50 mb-2 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-[#b57e00]" /> {title}</h3>
    {children}
  </div>
);

const Empty = ({ text }: { text: string }) => (
  <div className="bg-[#eef0f3] rounded-xl p-5 border border-dashed border-[#ffb300]/15 text-center text-xs text-[#2a2e34]/50">{text}</div>
);

const MiniStat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`rounded-xl p-3 border ${accent ? 'bg-[#ffb300]/10 border-[#ffb300]/30' : 'bg-[#eef0f3] border-[#ffb300]/10'}`}>
    <p className="text-[10px] uppercase tracking-wide text-[#2a2e34]/50">{label}</p>
    <p className={`text-lg font-black ${accent ? 'text-[#b57e00]' : 'text-[#2a2e34]'}`}>{value}</p>
  </div>
);
