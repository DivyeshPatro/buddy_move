import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import NumberFlow from '@number-flow/react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { CheckCheck, Check, Loader, ArrowLeft } from 'lucide-react';
import {
  calcGuestFinalPrice,
  calcHostSubscriptionPrice,
  planDisplayDays,
  formatINR,
  normalizePlanType,
  type PlanType,
} from '../lib/pricing';

type PlanName = '7-Day Plan' | '15-Day Plan' | 'Monthly Plan';

interface Props {
  role: 'guest' | 'host';
  distanceKm: number;
  onSelect: (planName: PlanName) => void;
  onBack?: () => void;
  busyPlan?: string | null;
}

const PLAN_ORDER = ['1m', '15d', '7d'];

const NAME_MAP: Record<string, PlanName> = {
  '7d': '7-Day Plan', '15d': '15-Day Plan', '1m': 'Monthly Plan',
};

function usePlans(role: 'guest' | 'host') {
  const [apiPlans, setApiPlans] = React.useState<any[]>([]);
  const [plansLoading, setPlansLoading] = React.useState(true);
  React.useEffect(() => {
    fetch('/api/subscription-plans')
      .then(r => r.json())
      .then(data => {
        const filtered = Array.isArray(data)
          ? data.filter((p: any) => p.role === role && p.isActive)
          : [];
        filtered.sort((a: any, b: any) =>
          PLAN_ORDER.indexOf(normalizePlanType(a.planType)) -
          PLAN_ORDER.indexOf(normalizePlanType(b.planType))
        );
        setApiPlans(filtered);
      })
      .catch(() => setApiPlans([]))
      .finally(() => setPlansLoading(false));
  }, [role]);
  return { apiPlans, plansLoading };
}

export default function PricingPlans({ role, distanceKm, onSelect, onBack, busyPlan }: Props) {
  const { apiPlans, plansLoading } = usePlans(role);

  const priced = useMemo(() => {
    if (apiPlans.length === 0) return [];
    return apiPlans.map((plan: any) => {
      const pt = normalizePlanType(plan.planType);
      const price = role === 'guest'
        ? calcGuestFinalPrice({ distanceKm, plan: pt }).finalPrice
        : calcHostSubscriptionPrice(distanceKm, pt);
      const perDay = Math.round((price / planDisplayDays(pt)) * 10) / 10;
      const features = Array.isArray(plan.features) ? plan.features : [];
      return {
        pt,
        price,
        perDay,
        name: NAME_MAP[pt],
        label: plan.badge || (pt === '1m' ? 'Best Value' : pt === '15d' ? 'Popular' : 'Starter'),
        popular: pt === '1m',
        guestFeatures: features,
        hostFeatures: features,
      };
    });
  }, [apiPlans, role, distanceKm]);

  const [selected, setSelected] = useState<PlanType>('1m');
  const sel = priced.find((p) => p.pt === selected) || priced[0];
  const selBusy = busyPlan === sel?.name;

  if (plansLoading) {
    return (
      <div className="min-h-full w-full bg-neutral-100 px-4 py-8">
        <div className="max-w-5xl mx-auto hidden md:grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-72 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="max-w-5xl mx-auto md:hidden space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (priced.length === 0) {
    return (
      <div className="min-h-full w-full bg-neutral-100 px-4 py-16 flex items-center justify-center">
        <p className="text-sm text-gray-400">No plans available right now.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-neutral-100 px-4 py-8 md:py-10">
      <div className="max-w-5xl mx-auto">
        {onBack && (
          <button onClick={onBack} className="mb-4 hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-black">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        <div className="text-center md:text-left mb-6 md:mb-8">
          <h2 className="text-3xl md:text-5xl font-bold md:font-semibold text-gray-900">Choose your MoveBuddy {role === 'host' ? 'Host' : 'Commute'} plan</h2>
          <p className="text-sm text-gray-600 mt-2">
            {role === 'guest'
              ? 'Pick a pass for this route — we auto-assign your buddy after payment. No browsing, no choosing.'
              : 'One subscription covers both directions. You earn only for rides you actually complete.'}
          </p>
        </div>

        {/* Desktop: 3-column cards */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {priced.map((p, i) => {
            const features = role === 'guest' ? p.guestFeatures : p.hostFeatures;
            const busy = busyPlan === p.name;
            return (
              <motion.div
                key={p.pt}
                initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card className={`relative border ${p.pt === '1m' ? 'ring-2 ring-orange-500 bg-orange-50' : 'bg-white border-neutral-200'}`}>
                  <CardHeader className="text-left">
                    <div className="flex justify-between items-start">
                      <h3 className="text-2xl font-semibold text-gray-900">{p.name.replace(' Plan', '')}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${p.pt === '1m' ? 'bg-orange-500 text-white' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>{p.label}</span>
                    </div>
                    <div className="flex items-baseline mt-2">
                      <span className="text-4xl font-semibold text-gray-900">
                        <NumberFlow value={p.price} format={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0 }} />
                      </span>
                      <span className="text-gray-600 ml-2 text-sm">/ {planDisplayDays(p.pt)} days</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">≈ ₹{p.perDay}/day{role === 'guest' ? ` · ${distanceKm} km route` : ''}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <button
                      disabled={busy}
                      onClick={() => onSelect(p.name)}
                      className={`w-full mb-5 p-3.5 text-base font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${
                        p.pt === '1m'
                          ? 'bg-gradient-to-t from-orange-500 to-orange-600 shadow-lg shadow-orange-500/40 border border-orange-400 text-white'
                          : 'bg-gradient-to-t from-neutral-900 to-neutral-700 shadow-lg shadow-neutral-900/30 border border-neutral-700 text-white'
                      }`}
                    >
                      {busy ? <Loader className="w-4 h-4 animate-spin" /> : null}
                      {busy ? 'Processing…' : 'Pay & Continue'}
                    </button>
                    <div className="space-y-2.5 pt-4 border-t border-neutral-200">
                      <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-500">Includes</h4>
                      <ul className="space-y-2">
                        {features.map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2.5">
                            <span className="h-5 w-5 bg-white border border-orange-500 rounded-full grid place-content-center shrink-0">
                              <CheckCheck className="h-3 w-3 text-orange-500" />
                            </span>
                            <span className="text-sm text-gray-700">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile: stacked radio-select cards + pinned action */}
        <div className="md:hidden">
          <div className="space-y-3">
            {priced.map((p) => {
              const features = role === 'guest' ? p.guestFeatures : p.hostFeatures;
              const isSel = selected === p.pt;
              return (
                <button
                  key={p.pt}
                  type="button"
                  onClick={() => setSelected(p.pt)}
                  className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all ${
                    isSel ? 'border-orange-500 bg-orange-50' : 'border-transparent bg-white shadow-sm'
                  }`}
                >
                  {(p.pt === '15d' || p.pt === '1m') && (
                    <span className={`absolute -top-2.5 right-4 text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm ${
                      p.pt === '15d' ? 'bg-orange-500 text-white' : 'bg-neutral-900 text-white'
                    }`}>
                      {p.label}
                    </span>
                  )}

                  <div className="flex items-start gap-3.5">
                    <span className={`mt-1 h-6 w-6 rounded-full grid place-content-center shrink-0 border-2 transition-colors ${
                      isSel ? 'bg-orange-500 border-orange-500' : 'border-neutral-300'
                    }`}>
                      {isSel && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight">{p.name.replace(' Plan', '')}</h3>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-gray-900 leading-tight">
                            <NumberFlow value={p.price} format={{ style: 'currency', currency: 'INR', maximumFractionDigits: 0 }} />
                          </p>
                          <p className="text-[11px] text-neutral-500">/ {planDisplayDays(p.pt)} days</p>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-500 mt-0.5">≈ ₹{p.perDay}/day{role === 'guest' ? ` · ${distanceKm} km route` : ''}</p>
                      <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{features.join(' · ')}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {sel && (
          <div className="sticky bottom-0 -mx-4 mt-6 px-4 pt-3 pb-5 bg-neutral-100/95 backdrop-blur border-t border-neutral-200">
            <p className="text-center text-sm text-neutral-600 mb-2.5">
              <span className="font-bold text-gray-900">{formatINR(sel.price)}</span> · {planDisplayDays(sel.pt)} days · ≈ ₹{sel.perDay}/day
            </p>
            <button
              onClick={() => onSelect(sel.name)}
              disabled={selBusy}
              className="w-full bg-gradient-to-t from-orange-500 to-orange-600 shadow-lg shadow-orange-500/40 border border-orange-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {selBusy ? <Loader className="w-5 h-5 animate-spin" /> : null}
              {selBusy ? 'Processing…' : 'Pay & Continue'}
            </button>
            {onBack && (
              <button onClick={onBack} className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-neutral-800">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
