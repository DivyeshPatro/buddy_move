/**
 * Move Buddy — Pure Pricing Engine (frontend mirror of backend pricing_config)
 *
 * These values MUST stay in sync with the backend defaults in
 * backend/server.ts `defaultState.pricingConfig`. All UI prices are derived
 * from these functions — never hardcode a rupee value in a component.
 */

export type PlanType = '7d' | '15d' | '1m';

export function normalizePlanType(pt: string): PlanType {
  if (pt === 'PLAN_1M' || pt === '1m') return '1m';
  if (pt === 'PLAN_15D' || pt === '15d') return '15d';
  return '7d';
}

// Mirror of backend pricing_config defaults (display only — server is authoritative)
export const PRICING_CONFIG = {
  guestBaseKmLimit: 5,
  guestBasePrice: 30,
  guestIncrementPerKm: 5,
  // Billable working days (weekends excluded) — the basis for guest pricing.
  guest7dWorkingDays: 5,
  guest15dWorkingDays: 11,
  guestMonthlyWorkingDays: 22,
  // Editable multipliers — default 1.0 (not applied) for the initial months.
  guest7dMultiplier: 1.0,
  guest15dMultiplier: 1.0,
  guestMonthlyMultiplier: 1.0,
  hostUpto5kmSlab: 49,
  hostAbove5kmSlab: 99,
  hostRatePerKm: 3.5,
  welcomeCreditFlat: 100,
  welcomeCreditPercent: 10,
  welcomeCreditCap: 100,
  upgradeIncentivePercent: 10,
  upgradeIncentiveCap: 100,
  loyaltyCreditPercent: 3,
  loyaltyCreditMin: 10,
  loyaltyCreditMax: 40,
};

// Working-day basis that drives ALL pricing/validity. Do NOT change — host charge
// and savings derive from these. (5/11/22 = billable working days, weekends excluded.)
const PLAN_DAYS: Record<PlanType, number> = { '7d': 5, '15d': 11, '1m': 22 };
// Friendly, user-facing duration shown on cards/summaries ONLY. Decoupled from the
// pricing math above: a "7-Day Plan" markets 7 days but bills 5 working days, etc.
const PLAN_DISPLAY_DAYS: Record<PlanType, number> = { '7d': 7, '15d': 15, '1m': 30 };
const WORKING_DAYS: Record<PlanType, keyof typeof PRICING_CONFIG> = {
  '7d': 'guest7dWorkingDays', '15d': 'guest15dWorkingDays', '1m': 'guestMonthlyWorkingDays',
};

/** Billable working days for a plan. */
export function planWorkingDays(plan: PlanType): number {
  return PRICING_CONFIG[WORKING_DAYS[plan]] as number;
}

/** Maps the UI plan label ('22 Day Plan' etc.) to a PlanType code. Tolerates the
 *  legacy 7/15/30 labels so older data still resolves. */
export function planLabelToType(label: string): PlanType {
  const l = (label || '').toLowerCase();
  if (l.includes('22') || l.includes('30') || l.includes('month')) return '1m';
  if (l.includes('11') || l.includes('15')) return '15d';
  return '7d'; // "5 Day", legacy "7 Day"
}

/** Working-day basis for a plan (5/11/22) — used for pricing/validity, NOT display. */
export function planDays(plan: PlanType): number {
  return PLAN_DAYS[plan];
}

/** Friendly duration to SHOW users (7/15/30). Display only — never feeds pricing. */
export function planDisplayDays(plan: PlanType): number {
  return PLAN_DISPLAY_DAYS[plan];
}

/** Weekly units for the (slab ÷ 4) × weeks model: 5/11/22 days → 1/2/4 weeks. */
export function planWeeks(plan: PlanType): number {
  return Math.min(4, Math.max(1, Math.round(planDays(plan) / 5.5)));
}

/** Guest base route price PER DAY (one direction) — distance based. */
export function calcGuestBasePrice(distanceKm: number): number {
  const cfg = PRICING_CONFIG;
  const d = Math.max(0, distanceKm);
  if (d <= cfg.guestBaseKmLimit) return cfg.guestBasePrice;
  return cfg.guestBasePrice + (d - cfg.guestBaseKmLimit) * cfg.guestIncrementPerKm;
}

/** Guest GROSS plan price = base route price × WORKING days × plan multiplier. */
export function calcGuestPlanPrice(distanceKm: number, plan: PlanType): number {
  const cfg = PRICING_CONFIG;
  const base = calcGuestBasePrice(distanceKm);
  const mult =
    plan === '7d' ? cfg.guest7dMultiplier
    : plan === '15d' ? cfg.guest15dMultiplier
    : cfg.guestMonthlyMultiplier;
  return Math.round(base * planWorkingDays(plan) * mult);
}

/** Welcome credit (Month 1) — best of flat OR percent (capped). Discount on amount paid. */
export function calcWelcomeCredit(planPrice: number): number {
  const cfg = PRICING_CONFIG;
  const pct = Math.min(planPrice * (cfg.welcomeCreditPercent / 100), cfg.welcomeCreditCap);
  return Math.round(Math.max(cfg.welcomeCreditFlat, pct));
}

export interface GuestPriceParams {
  distanceKm: number;
  plan: PlanType;
}

export interface GuestPriceResult {
  basePrice: number;      // base route price per day
  planPrice: number;      // gross plan price
  finalPrice: number;     // shown on cards (gross; welcome discount applied at checkout, server-side)
  perDay: number;
}

/** Card pricing — shows the GROSS plan price (welcome/loyalty handled server-side). */
export function calcGuestFinalPrice(params: GuestPriceParams): GuestPriceResult {
  const { distanceKm, plan } = params;
  const basePrice = calcGuestBasePrice(distanceKm);
  const planPrice = calcGuestPlanPrice(distanceKm, plan);
  const perDay = Math.round((planPrice / planWorkingDays(plan)) * 100) / 100;
  return { basePrice, planPrice, finalPrice: planPrice, perDay };
}

/** Flat distance slab the host pays ONCE to activate: ₹49 ≤5km, ₹99 >5km.
 *  This is the only upfront host charge — no per-plan tier. */
export function calcHostSlab(distanceKm: number): number {
  const cfg = PRICING_CONFIG;
  return Math.max(0, distanceKm) <= cfg.guestBaseKmLimit ? cfg.hostUpto5kmSlab : cfg.hostAbove5kmSlab;
}

/** Host upfront activation charge = the flat slab (kept for PaymentSummary callers). */
export function calcHostSubscriptionPrice(distanceKm: number, _plan?: PlanType): number {
  return calcHostSlab(distanceKm);
}

// Active ride days each plan label PROJECTS (display labels stay 7/15/Monthly).
const PLAN_ACTIVE_DAYS: Record<PlanType, number> = { '7d': 5, '15d': 11, '1m': 22 };
/** Active ride days assumed by a plan's earnings projection (5/11/22). */
export function planActiveDays(plan: PlanType): number {
  return PLAN_ACTIVE_DAYS[plan];
}

/** Weekly units from ACTUAL active ride days: round(days÷5.5), capped [0,4].
 *  5→1, 11→2, 16-17→3, 22→4 (= full slab). Drives the slab incentive. */
export function activeWeekUnits(activeDays: number): number {
  return Math.min(4, Math.round(Math.max(0, activeDays) / 5.5));
}

export interface HostEarningsProjection {
  activeDays: number;     // assumed active ride days for this projection
  rideEarnings: number;   // ₹3.5 × km × activeDays
  slabIncentive: number;  // (slab ÷ 4) × weeks(activeDays)
  total: number;          // rideEarnings + slabIncentive
}

/** Projected host earnings for a plan label: (₹3.5 × km × activeDays) + (slab÷4)×weeks.
 *  A PROJECTION only — it does NOT change the flat slab the host pays. */
export function calcHostEarningsProjection(distanceKm: number, plan: PlanType): HostEarningsProjection {
  const km = Math.max(0, distanceKm);
  const slab = calcHostSlab(km);
  const activeDays = planActiveDays(plan);
  const rideEarnings = Math.round(PRICING_CONFIG.hostRatePerKm * km * activeDays * 100) / 100;
  const slabIncentive = Math.round(slab / 4 * activeWeekUnits(activeDays) * 100) / 100;
  return { activeDays, rideEarnings, slabIncentive, total: Math.round((rideEarnings + slabIncentive) * 100) / 100 };
}

/** Format a rupee value as ₹XX in en-IN. */
export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

// Reference solo-commute fare (auto / bike-taxi) used only for the savings
// comparison shown to the user. ~₹13/km one-way.
export const SOLO_PER_KM = 13;

export interface SavingsResult {
  individual: number;        // cost if commuting alone for the plan period
  moveBuddy: number;         // cost with a MoveBuddy pass
  saved: number;
  savedPct: number;
  co2KgSaved: number;        // approx CO2 avoided by sharing
  monthlyProjection: number; // savings normalised to 30 days
}

/** Individual vs MoveBuddy cost comparison for one direction over a plan period. */
export function calcGuestSavings(distanceKm: number, plan: PlanType): SavingsResult {
  const days = planDays(plan);
  const d = Math.max(0, distanceKm);
  const individual = Math.round(d * SOLO_PER_KM) * days; // one trip/day for this direction
  const moveBuddy = calcGuestFinalPrice({ distanceKm: d, plan }).finalPrice;
  const saved = Math.max(0, individual - moveBuddy);
  const savedPct = individual > 0 ? Math.round((saved / individual) * 100) : 0;
  const co2KgSaved = Math.round(d * days * 0.062 * 10) / 10; // ~62 g/km saved by sharing
  const monthlyProjection = days > 0 ? Math.round((saved / days) * 30) : 0;
  return { individual, moveBuddy, saved, savedPct, co2KgSaved, monthlyProjection };
}
