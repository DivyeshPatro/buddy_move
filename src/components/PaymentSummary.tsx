import React from 'react';
import { ArrowLeft, Bike, MapPin, Loader, Lock, ShieldCheck } from 'lucide-react';
import { formatINR } from '../lib/pricing';

interface PaymentSummaryProps {
  role: 'guest' | 'host';
  planName: string;                 // e.g. "22 Day Plan"
  amount: number;                   // rupees — final amount payable
  planPrice?: number;               // gross plan price (before welcome discount)
  welcomeCredit?: number;           // Month-1 discount on the amount
  walletCredit?: number;            // upgrade/loyalty credit added to wallet
  distanceKm: number;
  origin?: string;
  destination?: string;
  direction?: 'forward' | 'return'; // guest only
  departureTime?: string;           // guest only
  paying?: boolean;
  error?: string;
  onPay: () => void;
  onCancel: () => void;
}

// Friendly duration shown on the summary (display only; the charge is unchanged).
const durationOf = (planName: string) =>
  (/month/i.test(planName) || planName.includes('30') || planName.includes('22')) ? 30
    : (planName.includes('15') || planName.includes('11')) ? 15
    : 7;

// A labelled summary row.
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-neutral-100 last:border-0">
    <span className="text-xs font-medium text-neutral-500 shrink-0 pt-0.5">{label}</span>
    <span className="text-sm text-neutral-900 text-right font-medium">{children}</span>
  </div>
);

/**
 * Branded MoveBuddy pre-payment order summary. Shown after a plan is chosen and
 * BEFORE Razorpay opens, so the user always knows exactly what they're paying
 * for. The actual payment still happens in Razorpay's secure window.
 */
export default function PaymentSummary({
  role, planName, amount, planPrice, welcomeCredit = 0, walletCredit = 0,
  distanceKm, origin, destination, direction, departureTime,
  paying = false, error, onPay, onCancel,
}: PaymentSummaryProps) {
  const days = durationOf(planName);
  const dirLabel = direction === 'forward'
    ? 'Morning · Home → Destination'
    : direction === 'return'
      ? 'Evening · Destination → Home'
      : 'Both directions';
  const perDay = days > 0 ? Math.round((amount / days) * 10) / 10 : amount;

  return (
    <div className="min-h-full w-full bg-neutral-100 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <button onClick={onCancel} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-black">
          <ArrowLeft className="w-4 h-4" /> Back to plans
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Branded header */}
          <div className="bg-[#ffb300] px-6 py-5 flex items-center gap-3">
            <div className="bg-[#2a2e34] p-2 rounded-xl">
              <Bike className="w-5 h-5 text-[#ffb300]" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#2a2e34]/70">{role === 'host' ? 'MoveBuddy Host' : 'MoveBuddy Subscription'}</p>
              <h2 className="text-lg font-black text-[#2a2e34] leading-tight">
                {role === 'host' ? 'Ride Offer Activation' : `Commute Pass · ${planName.replace(' Plan', '')}`}
              </h2>
            </div>
          </div>

          {/* Order summary */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Order summary</p>
            {role === 'host'
              ? <Row label="Activation">One-time fee · active window {days} days</Row>
              : <Row label="Plan">{planName} · {days} days</Row>}
            {(origin || destination) && (
              <Row label="Route">
                <span className="inline-flex items-start gap-1.5 text-right">
                  <MapPin className="w-3.5 h-3.5 text-[#ffb300] mt-0.5 shrink-0" />
                  <span className="break-words max-w-[16rem]">{origin} <span className="text-neutral-400">→</span> {destination}</span>
                </span>
              </Row>
            )}
            {role === 'guest' && <Row label="Direction">{dirLabel}</Row>}
            {role === 'guest' && departureTime && <Row label="Departure">{departureTime}</Row>}
            {distanceKm > 0 && <Row label="Distance">{distanceKm} km</Row>}

            {/* Plan price + welcome discount (when it applies) */}
            {welcomeCredit > 0 && planPrice != null && (
              <>
                <div className="flex items-center justify-between pt-3 text-sm text-neutral-600">
                  <span>Plan price</span><span>{formatINR(planPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-600">
                  <span>Welcome credit (Month 1)</span><span>− {formatINR(welcomeCredit)}</span>
                </div>
              </>
            )}

            {/* Total */}
            <div className="flex items-end justify-between pt-3 mt-1 border-t border-neutral-200">
              <div>
                <p className="text-xs text-neutral-500">Amount payable</p>
                <p className="text-[11px] text-neutral-400">≈ {formatINR(perDay)}/day</p>
              </div>
              <p className="text-3xl font-black text-neutral-900">{formatINR(amount)}</p>
            </div>

            {walletCredit > 0 && (
              <p className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                🎁 {formatINR(walletCredit)} {role === 'guest' ? 'credit' : ''} will be added to your wallet after this purchase.
              </p>
            )}
            {role === 'host' && (
              <p className="mt-2 text-[11px] text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                One-time activation fee. You then earn per completed ride during your active period (₹3.5/km × active ride-days + a prorated slab bonus).
              </p>
            )}
          </div>

          {/* How it works */}
          <div className="px-6 pb-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 mb-1">How payment works</p>
              {[
                'Tap “Pay” below',
                'Complete payment in the secure Razorpay window (UPI or card)',
                'You’ll return here and your pass activates automatically',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-700">
                  <span className="w-4 h-4 rounded-full bg-[#ffb300] text-[#2a2e34] text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mx-6 mb-3 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold rounded-xl">{error}</div>
          )}

          {/* Pay */}
          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={onPay}
              disabled={paying}
              className="w-full bg-gradient-to-t from-neutral-900 to-neutral-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/30 border border-neutral-700 disabled:opacity-60 transition"
            >
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {paying ? 'Opening secure payment…' : `Pay ${formatINR(amount)}`}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Secured by Razorpay · UPI &amp; cards accepted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
