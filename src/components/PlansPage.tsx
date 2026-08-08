import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sunrise, Sunset, Clock, Loader, ArrowRight, ArrowLeft, AlertTriangle,
  RefreshCw, CalendarClock, MapPin, CheckCircle,
} from 'lucide-react';
import { User, Subscription, CommuteDirection } from '../types';
import PlacePicker, { PlaceValue } from './PlacePicker';
import RouteMap from './RouteMap';
import PricingPlans from './PricingPlans';
import PaymentSummary from './PaymentSummary';
import { startCheckout } from '../lib/checkout';
import { calcGuestFinalPrice, calcHostSubscriptionPrice, planLabelToType, formatINR } from '../lib/pricing';

interface PlansPageProps {
  currentUser: User;
  onGoToCommute: () => void;
  onRefreshWallet?: () => void;
}

type PlanName = '7-Day Plan' | '15-Day Plan' | 'Monthly Plan';

// Distance used to PREVIEW the cards before the user enters a route. The image
// reference shows an 8 km route; once a real route is set up its distance takes over.
const DEFAULT_PREVIEW_KM = 8;

const DIRECTIONS: { key: CommuteDirection; label: string; icon: typeof Sunrise; defaultTime: string }[] = [
  { key: 'forward', label: 'Morning · Home → Destination', icon: Sunrise, defaultTime: '09:00' },
  { key: 'return', label: 'Evening · Destination → Home', icon: Sunset, defaultTime: '18:00' },
];

const daysLeft = (endDate?: string) =>
  endDate ? Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)) : 0;

/**
 * Plans tab (navbar "Plans" icon). Leads with the pricing-cards section — the
 * user picks a pass first, then we collect the route address on "Pay & Continue"
 * and show the branded payment summary before Razorpay.
 */
export default function PlansPage({ currentUser, onGoToCommute, onRefreshWallet }: PlansPageProps) {
  const isHost = currentUser.role === 'host';
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // cards (pick a plan) → setup (enter route) → summary (pay)
  const [phase, setPhase] = useState<'cards' | 'setup' | 'summary'>('cards');
  const [planName, setPlanName] = useState<PlanName | null>(null);

  // ── Route setup form state ──
  const [direction, setDirection] = useState<CommuteDirection>('forward'); // guest only
  const [home, setHome] = useState<PlaceValue>({ address: '' });
  const [dest, setDest] = useState<PlaceValue>({ address: '' });
  const [time, setTime] = useState('09:00');          // guest leg departure
  const [forwardTime, setForwardTime] = useState('09:00'); // host morning
  const [returnTime, setReturnTime] = useState('18:00');   // host evening
  const [distanceKm, setDistanceKm] = useState(0);
  const [distanceSource, setDistanceSource] = useState('');
  const [computing, setComputing] = useState(false);

  // ── Payment summary state ──
  const [quote, setQuote] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const s = await fetch(`/api/subscriptions/${currentUser.id}`).then(r => r.json());
      setSubs(Array.isArray(s) ? s : []);
    } catch { setError('Something went wrong loading your plans.'); }
    finally { setLoading(false); }
  }, [currentUser.id]);
  useEffect(() => { load(); }, [load]);

  const activeSubs = useMemo(() => subs.filter(s => s.status === 'active'), [subs]);

  // Preview the cards on the user's existing route distance when they have one,
  // otherwise on a representative default.
  const previewKm = useMemo(() => {
    const withRoute = activeSubs.find(s => (s.distanceKm || 0) > 0);
    return withRoute?.distanceKm || DEFAULT_PREVIEW_KM;
  }, [activeSubs]);

  // Best-effort prefill of Home/Destination from an existing pass so renewals and
  // second-direction purchases don't retype the route.
  const prefillRoute = useCallback((dir: CommuteDirection) => {
    if (isHost) {
      const h = subs.find(s => s.role === 'host');
      if (h) { setHome({ address: h.origin || '', geo: h.originGeo }); setDest({ address: h.destination || '', geo: h.destGeo }); }
      return;
    }
    // A guest sub stores origin/destination in travel order; reverse for 'return'.
    const fwd = subs.find(s => s.role === 'guest' && s.direction === 'forward');
    const ret = subs.find(s => s.role === 'guest' && s.direction === 'return');
    if (fwd) { setHome({ address: fwd.origin || '', geo: fwd.originGeo }); setDest({ address: fwd.destination || '', geo: fwd.destGeo }); }
    else if (ret) { setHome({ address: ret.destination || '', geo: ret.destGeo }); setDest({ address: ret.origin || '', geo: ret.originGeo }); }
    setTime(DIRECTIONS.find(d => d.key === dir)?.defaultTime || '09:00');
  }, [isHost, subs]);

  // Card picked → enter the route-setup phase.
  const handleSelectPlan = (name: PlanName) => {
    setError(''); setPlanName(name);
    setDistanceKm(0); setDistanceSource('');
    prefillRoute(direction);
    setPhase('setup');
  };

  // Auto-calculate the real route distance once both addresses are chosen.
  useEffect(() => {
    if (phase !== 'setup') return;
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
  }, [phase, home.address, dest.address, home.geo?.lat, dest.geo?.lat]);

  // Route confirmed → fetch the authoritative price breakdown (guest), then summary.
  const goToSummary = async () => {
    if (!home.address || !dest.address) { setError('Set Home and Destination first.'); return; }
    if (distanceKm <= 0) { setError('Calculating route distance — one moment…'); return; }
    setError('');
    if (!isHost && planName) {
      try {
        const res = await fetch('/api/subscriptions/calculate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'guest', planType: planLabelToType(planName), distanceKm }),
        });
        setQuote(await res.json());
      } catch { setQuote(null); }
    }
    setPhase('summary');
  };

  // "Pay" → launch Razorpay, then activate the pass.
  const pay = async () => {
    if (!planName) return;
    setPaying(true); setError('');
    // Guest legs store origin/destination in travel order (reversed for 'return').
    const legOrigin = direction === 'forward' ? home : dest;
    const legDestination = direction === 'forward' ? dest : home;
    const subDetails = isHost
      ? { origin: home.address, destination: dest.address, originGeo: home.geo, destGeo: dest.geo, forwardTime, returnTime }
      : { direction, origin: legOrigin.address, destination: legDestination.address, originGeo: legOrigin.geo, destGeo: legDestination.geo, departureTime: time };
    const result = await startCheckout({ planName, role: isHost ? 'host' : 'guest', distanceKm, subDetails });
    setPaying(false);
    if (!result.success) { setError(result.error || 'Payment failed'); return; }
    setPhase('cards'); setPlanName(null); setQuote(null);
    await load();
    onRefreshWallet?.();
  };

  // ── Payment summary (after route, before Razorpay) ──
  if (phase === 'summary' && planName) {
    if (isHost) {
      const amount = calcHostSubscriptionPrice(distanceKm, planLabelToType(planName));
      return (
        <PaymentSummary
          role="host" planName={planName} amount={amount} distanceKm={distanceKm}
          origin={home.address} destination={dest.address}
          paying={paying} error={error}
          onPay={pay} onCancel={() => { setError(''); setPhase('setup'); }}
        />
      );
    }
    const fallback = calcGuestFinalPrice({ distanceKm, plan: planLabelToType(planName) }).finalPrice;
    const sdOrigin = direction === 'forward' ? home.address : dest.address;
    const sdDest = direction === 'forward' ? dest.address : home.address;
    return (
      <PaymentSummary
        role="guest" planName={planName}
        amount={quote?.finalPrice ?? fallback}
        planPrice={quote?.planPrice}
        welcomeCredit={quote?.welcomeCredit ?? 0}
        walletCredit={quote?.walletCredit ?? 0}
        distanceKm={distanceKm}
        origin={sdOrigin} destination={sdDest}
        direction={direction} departureTime={time}
        paying={paying} error={error}
        onPay={pay} onCancel={() => { setError(''); setQuote(null); setPhase('setup'); }}
      />
    );
  }

  // ── Route setup (after a plan is picked) ──
  if (phase === 'setup' && planName) {
    const hasRoute = distanceKm > 0;
    return (
      <div className="max-w-lg mx-auto px-4 py-8 pb-32">
        <button onClick={() => { setError(''); setPhase('cards'); }} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2a2e34]/60 hover:text-[#2a2e34]">
          <ArrowLeft className="w-4 h-4" /> Back to plans
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-black text-[#2a2e34]">Set up your route</h2>
          <p className="text-sm text-[#2a2e34]/60 mt-0.5">
            {planName.replace(' Plan', '')} pass — we price it on your real route, then auto-assign your buddy after payment.
          </p>
        </div>

        <div className="bg-white border border-[#ffb300]/20 rounded-2xl p-5 space-y-3">
          {/* Direction (guest only) */}
          {!isHost && (
            <div>
              <label className="block text-xs font-semibold text-[#b57e00] uppercase tracking-wider mb-1.5">Direction</label>
              <div className="grid grid-cols-2 gap-2">
                {DIRECTIONS.map(d => {
                  const Icon = d.icon;
                  const active = direction === d.key;
                  return (
                    <button
                      key={d.key}
                      onClick={() => { setDirection(d.key); setTime(d.defaultTime); }}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${active ? 'bg-[#ffb300]/15 border-[#ffb300] text-[#2a2e34]' : 'bg-[#eef0f3] border-transparent text-[#2a2e34]/60 hover:border-[#ffb300]/40'}`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-[#b57e00]" /> {d.key === 'forward' ? 'Morning' : 'Evening'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <PlacePicker label="Home" placeholder="Your home address" value={home} onChange={setHome} />
          <PlacePicker label="Destination (Office / College)" placeholder="Where you commute to" value={dest} onChange={setDest} />
          {(home.geo || dest.geo) && (
            <div className="my-2">
              <RouteMap originGeo={home.geo} destinationGeo={dest.geo} originAddress={home.address} destinationAddress={dest.address} />
            </div>
          )}

          {/* Departure time(s) */}
          {isHost ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#b57e00] uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1" />Morning</label>
                <input type="time" value={forwardTime} onChange={e => setForwardTime(e.target.value)} className="w-full bg-[#eef0f3] border border-[#ffb300]/25 rounded-xl py-2.5 px-3 text-[#2a2e34] text-sm focus:outline-none focus:border-[#ffb300]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#b57e00] uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1" />Evening</label>
                <input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} className="w-full bg-[#eef0f3] border border-[#ffb300]/25 rounded-xl py-2.5 px-3 text-[#2a2e34] text-sm focus:outline-none focus:border-[#ffb300]" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#b57e00] uppercase tracking-wider mb-1"><Clock className="w-3 h-3 inline mr-1" />Departure time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-[#eef0f3] border border-[#ffb300]/25 rounded-xl py-2.5 px-3 text-[#2a2e34] text-sm focus:outline-none focus:border-[#ffb300]" />
            </div>
          )}

          <div className="text-[11px] text-[#2a2e34]/60">
            {computing ? 'Calculating route distance…' : hasRoute
              ? <>Route distance: <span className="text-[#b57e00] font-bold">{distanceKm} km</span> {distanceSource === 'estimate' ? '(estimated — pick from address suggestions for exact)' : '(auto-detected)'}</>
              : 'Select Home & Destination to detect distance.'}
          </div>

          {error && <div className="text-[11px] text-rose-600">{error}</div>}

          <button
            onClick={goToSummary}
            disabled={!hasRoute || computing}
            className="w-full bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] font-black py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {computing ? 'Detecting route…' : <>Continue to payment <ArrowRight className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    );
  }

  // ── Cards (default) — pick a plan first ──
  return (
    <div className="min-h-full bg-neutral-100">
      {/* Active passes summary (so existing-pass users can renew/upgrade from the cards) */}
      {!loading && activeSubs.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-8">
          <div className="flex flex-wrap gap-2">
            {activeSubs.map(s => {
              const left = daysLeft(s.endDate);
              const dirLabel = s.role === 'host' ? 'Host' : s.direction === 'return' ? 'Evening' : 'Morning';
              return (
                <span key={s.id} className="inline-flex items-center gap-1.5 bg-white border border-emerald-200 text-[#2a2e34] text-[11px] font-semibold px-3 py-1.5 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  {dirLabel} · {s.planName} · {left} day{left === 1 ? '' : 's'} left
                </span>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <div className="flex items-center justify-between gap-3 bg-rose-50 border border-rose-300 text-rose-700 text-sm p-3 rounded-xl">
            <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</span>
            <button onClick={load} className="flex items-center gap-1 font-bold"><RefreshCw className="w-3.5 h-3.5" /> Retry</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-72 bg-white border border-neutral-200 rounded-2xl animate-pulse" />)}
        </div>
      ) : isHost ? (
        // Hosts don't choose a plan — they pay a one-time activation fee and see
        // earnings projections in the Host Hub. So this tab just points there.
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white border border-[#ffb300]/25 rounded-2xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-[#b57e00] mx-auto mb-2" />
            {activeSubs.some(s => s.role === 'host') ? (
              <>
                <p className="text-sm font-bold text-[#2a2e34]">Your ride offer is active</p>
                <p className="text-xs text-[#2a2e34]/55 mt-1 mb-3">Manage your route, assigned guests and activity-based payout in the Host Hub.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#2a2e34]">Activate your ride offer</p>
                <p className="text-xs text-[#2a2e34]/55 mt-1 mb-3">Hosts pay a one-time activation fee (₹49 / ₹99) — no plan to choose. Set your route in the Host Hub to see your earnings projection.</p>
              </>
            )}
            <button onClick={onGoToCommute} className="bg-[#ffb300] hover:bg-[#e09d00] text-[#2a2e34] font-bold py-2.5 px-5 rounded-xl text-sm inline-flex items-center gap-2">Go to Host Hub <ArrowRight className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <PricingPlans role="guest" distanceKm={previewKm} onSelect={handleSelectPlan} />
      )}
    </div>
  );
}
