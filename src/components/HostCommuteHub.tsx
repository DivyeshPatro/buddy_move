import { useEffect, useMemo, useState } from 'react';
import { User, Subscription } from '../types';
import PlacePicker, { PlaceValue } from './PlacePicker';
import RouteMap from './RouteMap';
import PaymentSummary from './PaymentSummary';
import { startCheckout } from '../lib/checkout';
import { formatINR, calcHostSlab, calcHostEarningsProjection, type PlanType } from '../lib/pricing';
import { Loader, CheckCircle, Clock, Wallet, ArrowRight, TrendingUp, BadgeIndianRupee, Info, Play } from 'lucide-react';
import TripCard from './TripCard';
import { useTrip } from '../hooks/useTrip';
import { useLiveTracking } from '../hooks/useLiveTracking';

interface Props { currentUser: User; onRefreshWallet: () => void; }

interface HostMatch {
  id: string; direction: 'forward' | 'return'; proximityTierM: number; score: number;
  buddy: { id: string; name: string; avatarUrl: string; rating: number } | null;
}
interface Payout {
  hasActiveSubscription: boolean; planName?: string; totalDays?: number;
  eligibleActiveDays?: number; maxPayout?: number; payout: number; formula?: string;
}

// Earnings-projection labels. NOT purchasable plans — they only show how much a
// host could earn for that many active ride days. Display labels stay friendly.
const PROJECTIONS: { plan: PlanType; label: string; badge?: string }[] = [
  { plan: '7d', label: '7-Day Plan' },
  { plan: '15d', label: '15-Day Plan', badge: 'Popular' },
  { plan: '1m', label: 'Monthly Plan', badge: 'Best Value' },
];

export default function HostCommuteHub({ currentUser, onRefreshWallet }: Props) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [matches, setMatches] = useState<HostMatch[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false); // showing the activation payment summary
  const [distanceKm, setDistanceKm] = useState(0);
  const [distanceSource, setDistanceSource] = useState('');
  const [computing, setComputing] = useState(false);
  const [err, setErr] = useState('');
  const [matchBusy, setMatchBusy] = useState<string | null>(null);
  const [tripBusy, setTripBusy] = useState(false);

  const tripOps = useTrip(currentUser?.id);

  const handleBeginRide = async (tripId: string) => {
    setTripBusy(true);
    await tripOps.beginRide(tripId);
    setTripBusy(false);
  };

  const handleHostComplete = async (tripId: string) => {
    setTripBusy(true);
    await tripOps.hostCompleteRide(tripId);
    setTripBusy(false);
  };

  const handleCancelTrip = async (tripId: string, reason?: string) => {
    setTripBusy(true);
    await tripOps.cancelTrip(tripId, reason);
    setTripBusy(false);
  };

  useLiveTracking({
    tripId: tripOps.activeTrip?.id,
    userId: currentUser?.id,
    role: 'host',
    enabled: tripOps.activeTrip?.status === 'in_progress',
  });

  const [home, setHome] = useState<PlaceValue>({ address: '' });
  const [dest, setDest] = useState<PlaceValue>({ address: '' });
  const [departureTime, setDepartureTime] = useState('09:00');

  const load = async () => {
    try {
      const [subs, m, p] = await Promise.all([
        fetch(`/api/subscriptions/${currentUser.id}`).then(r => r.json()),
        fetch(`/api/matches/${currentUser.id}`).then(r => r.json()),
        fetch(`/api/host/${currentUser.id}/payout`).then(r => r.json()),
      ]);
      setSub((Array.isArray(subs) ? subs : []).find((s: Subscription) => s.role === 'host' && s.status === 'active') || null);
      setMatches(Array.isArray(m) ? m : []);
      setPayout(p);
    } catch { /* offline */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [currentUser.id]);

  // Auto-calculate the real route distance once BOTH addresses are chosen.
  useEffect(() => {
    if (!home.address || !dest.address) { setDistanceKm(0); return; }
    let cancelled = false;
    setComputing(true);
    fetch('/api/distance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: home.address, destination: dest.address, originGeo: home.geo, destGeo: dest.geo }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d?.km) { setDistanceKm(d.km); setDistanceSource(d.source || ''); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setComputing(false); });
    return () => { cancelled = true; };
  }, [home.address, dest.address, home.geo?.lat, dest.geo?.lat]);

  const hasRoute = distanceKm > 0;
  const slab = useMemo(() => (hasRoute ? calcHostSlab(distanceKm) : 0), [distanceKm, hasRoute]);
  const projections = useMemo(
    () => PROJECTIONS.map(p => ({ ...p, ...calcHostEarningsProjection(distanceKm, p.plan) })),
    [distanceKm],
  );

  // "Pay & Activate" → branded summary → Razorpay → activate. The host pays the
  // FLAT slab; the active window is monthly (earnings accrue from real activity).
  const handlePay = async () => {
    setErr(''); setPaying(true);
    const result = await startCheckout({
      planName: 'Monthly Plan', role: 'host', distanceKm,
      subDetails: { origin: home.address, destination: dest.address, originGeo: home.geo, destGeo: dest.geo, forwardTime: departureTime, returnTime: departureTime },
    });
    setPaying(false);
    if (!result.success) { setErr(result.error || 'Payment failed'); return; }
    setConfirming(false); await load(); onRefreshWallet();
  };

  const startTodayTrip = async (matchId: string) => {
    setMatchBusy(matchId);
    await tripOps.startTrip(matchId);
    setMatchBusy(null);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader className="w-6 h-6 animate-spin text-[#ffb300]" /></div>;

  // ── Activation payment summary (after "Pay & Activate") ──
  if (!sub && confirming) {
    return (
      <div className="max-w-3xl mx-auto">
        <PaymentSummary
          role="host"
          planName="Monthly Plan"
          amount={slab}
          distanceKm={distanceKm}
          origin={home.address}
          destination={dest.address}
          paying={paying}
          error={err}
          onPay={handlePay}
          onCancel={() => { setErr(''); setConfirming(false); }}
        />
      </div>
    );
  }

  // ── Not activated: route form → slab fee + earnings projections → activate ──
  if (!sub) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black !text-[#e9eaec]">Host Network</h2>
          <p className="text-sm !text-[#e9eaec]/60 mt-1">You pay a one-time activation fee (₹49 / ₹99). The cards show how much you could <span className="!text-[#ffb300] font-semibold">earn</span> based on how active you stay — no plan to buy.</p>
        </div>
        {err && <div className="!bg-rose-950/60 border-l-4 border-rose-500 !text-rose-200 text-xs p-2.5 rounded">{err}</div>}

        {/* Route form — only Home, Destination, Departure Time */}
        <div className="!bg-[#2a2e34] border !border-[#ffb300]/15 rounded-2xl p-5 space-y-3">
          <div className="text-sm font-bold !text-[#e9eaec]">Set your route to join the matching network</div>
          <PlacePicker label="Home" placeholder="Your home address" value={home} onChange={setHome} />
          <PlacePicker label="Destination (Office / College)" placeholder="Where you commute to" value={dest} onChange={setDest} />
          {(home.geo || dest.geo) && (
            <div className="my-2">
              <RouteMap originGeo={home.geo} destinationGeo={dest.geo} originAddress={home.address} destinationAddress={dest.address} />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold !text-[#ffb300] uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1" />Departure time</label>
            <input type="time" value={departureTime} onChange={e => setDepartureTime(e.target.value)} className="w-full !bg-[#1c1f22] border !border-[#ffb300]/25 rounded-xl py-2.5 px-3 !text-[#e9eaec] text-sm focus:outline-none focus:!border-[#ffb300]" />
          </div>
          <div className="text-[11px] !text-[#e9eaec]/60">
            {computing ? 'Calculating route distance…' : hasRoute
              ? <>Route distance: <span className="!text-[#ffb300] font-bold">{distanceKm} km</span> {distanceSource === 'estimate' ? '(estimated — pick from suggestions for exact)' : '(auto-detected)'}</>
              : 'Enter Home & Destination to detect distance.'}
          </div>
        </div>

        {hasRoute && (
          <>
            {/* Slab fee — the only upfront charge */}
            <div className="!bg-[#2a2e34] border !border-[#ffb300]/30 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold !text-[#ffb300] tracking-widest"><BadgeIndianRupee className="w-3.5 h-3.5" /> Activation fee · one-time</div>
                <div className="text-3xl font-black !text-[#e9eaec] mt-1">{formatINR(slab)}</div>
                <div className="text-[11px] !text-[#e9eaec]/50 mt-0.5">{distanceKm <= 5 ? 'Route up to 5 km' : 'Route over 5 km'} · pay once to activate your ride offer</div>
              </div>
              <CheckCircle className="w-7 h-7 text-emerald-400 shrink-0" />
            </div>

            {/* Earnings projections — NOT plans */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 !text-[#ffb300]" />
                <h3 className="text-sm font-bold !text-[#e9eaec]">Your potential earnings</h3>
                <span className="text-[10px] !text-[#e9eaec]/40">if you stay active for…</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {projections.map(p => (
                  <button
                    key={p.plan}
                    type="button"
                    onClick={() => { setErr(''); setConfirming(true); }}
                    className={`text-left !bg-[#2a2e34] border rounded-2xl p-4 transition-colors cursor-pointer hover:!border-[#ffb300] ${p.badge === 'Popular' ? '!border-[#ffb300]/60' : '!border-[#ffb300]/15'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black !text-[#e9eaec]">{p.label}</span>
                      {p.badge && <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${p.badge === 'Popular' ? '!bg-[#ffb300] !text-[#2a2e34]' : '!bg-[#1c1f22] !text-[#ffb300] border !border-[#ffb300]/30'}`}>{p.badge}</span>}
                    </div>
                    <div className="text-[10px] !text-[#e9eaec]/50 mt-0.5">{p.activeDays} active ride days</div>
                    <div className="text-2xl font-black !text-[#ffb300] mt-2">{formatINR(p.total)}</div>
                    <div className="text-[9px] !text-[#e9eaec]/40 uppercase tracking-wide">projected earnings</div>
                    <div className="mt-2 pt-2 border-t !border-[#ffb300]/10 space-y-0.5 text-[10px] !text-[#e9eaec]/60">
                      <div className="flex justify-between"><span>Ride earnings</span><span>{formatINR(p.rideEarnings)}</span></div>
                      <div className="flex justify-between"><span>Slab incentive</span><span>{formatINR(p.slabIncentive)}</span></div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-1 text-[10px] font-bold !text-[#ffb300] !bg-[#ffb300]/10 rounded-lg py-1.5">
                      Tap to activate · {formatINR(slab)} once <ArrowRight className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] !text-[#e9eaec]/50 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 !text-[#ffb300]/70" />
                The cards are earnings ESTIMATES, not different plans — you pay the same one-time {formatINR(slab)} fee whichever you tap. Earnings = ₹3.5/km × distance × active ride days + a slab incentive that grows with activity (full slab at ~22 active days), paid from rides you actually complete.
              </p>
            </div>

            <button
              onClick={() => { setErr(''); setConfirming(true); }}
              disabled={confirming}
              className="w-full !bg-[#ffb300] hover:!bg-[#e09d00] !text-[#2a2e34] py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {confirming ? <Loader className="w-4 h-4 animate-spin" /> : null}
              Pay {formatINR(slab)} &amp; Activate Ride Offer <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Active host + payout + assigned guests ──
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-32 space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black !text-[#e9eaec]">Host Network</h2>
        <p className="text-sm !text-[#e9eaec]/60 mt-1">You earn only for rides you actually complete.</p>
      </div>

      {/* Active trip card */}
      {tripOps.activeTrip && (
        <TripCard
          trip={tripOps.activeTrip}
          role="host"
          onBeginRide={handleBeginRide}
          onHostComplete={handleHostComplete}
          onCancelTrip={handleCancelTrip}
          busy={tripBusy}
          error={tripOps.error}
        />
      )}

      {/* When there's no active trip, show the subscription + matches UI */}
      {!tripOps.activeTrip && (
        <>
          <div className="!bg-[#2a2e34] border !border-emerald-500/25 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-400" /><span className="text-sm font-bold !text-[#e9eaec]">Active · ride offer live</span></div>
              <span className="text-[11px] !text-[#e9eaec]/60">{sub.origin} ⇄ {sub.destination}</span>
            </div>
            {payout && (
              <div className="mt-4 !bg-[#1c1f22] rounded-xl p-4 border !border-[#ffb300]/15">
                <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 !text-[#ffb300]" /><span className="text-xs font-bold !text-[#e9eaec]">Activity-based payout</span></div>
                <div className="text-2xl font-black !text-[#ffb300]">{formatINR(payout.payout)}</div>
                <div className="text-[11px] !text-[#e9eaec]/50 mt-1">{payout.formula || `${payout.eligibleActiveDays}/${payout.totalDays} active days`}</div>
              </div>
            )}
          </div>
          <div className="!bg-[#2a2e34] border !border-[#ffb300]/15 rounded-2xl p-5">
            <div className="text-sm font-bold !text-[#e9eaec] mb-3">Your assigned guests</div>
            {matches.length === 0 ? (
              <div className="text-xs !text-[#e9eaec]/50">No guests matched yet. We'll assign compatible riders on your route automatically.</div>
            ) : (
              <div className="space-y-3">
                {matches.map(m => (
                  <div key={m.id} className="!bg-[#1c1f22] rounded-xl p-3 flex items-center gap-3 border !border-[#ffb300]/15">
                    {m.buddy && <img src={m.buddy.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border !border-[#ffb300]" />}
                    <div className="flex-1">
                      <div className="text-sm font-bold !text-[#e9eaec]">{m.buddy?.name || 'Guest'}</div>
                      <div className="text-[11px] !text-[#e9eaec]/60">{m.direction === 'forward' ? 'Morning' : 'Evening'} · within {m.proximityTierM}m · match {m.score}%</div>
                    </div>
                    <button
                      onClick={() => startTodayTrip(m.id)}
                      disabled={matchBusy === m.id}
                      className="!bg-[#ffb300]/15 !text-[#ffb300] hover:!bg-[#ffb300]/25 text-[11px] font-bold px-3 py-2 rounded-lg flex items-center gap-1 disabled:opacity-60"
                    >
                      {matchBusy === m.id ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      Start Today's Commute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
