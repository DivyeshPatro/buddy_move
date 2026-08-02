import { randomUUID } from "crypto";
import type { Subscription, GeoPoint, Match, CommuteDirection } from "../src/types";
import { planTypeOf, planDaysOf, guestPlanPrice } from "./pricing";

export interface ActivationDeps {
  db: any;
  saveDB: (state: any) => Promise<void>;
  geocode: (address: string) => Promise<GeoPoint | null>;
  withLock: <T>(key: string, fn: () => Promise<T>, ttlMs?: number) => Promise<T>;
  tryMatchGuestSub: (state: any, guestSub: Subscription) => Promise<Match | null>;
  runMatchSweep: (state: any) => Promise<Match[]>;
  notifyUser: (userId: string, title: string, body: string, type: string, meta?: any) => any;
  notifyBuddyFound: (match: Match) => void;
  logger: { error: (obj: any, msg: string) => void; info: (obj: any, msg: string) => void; warn: (obj: any, msg: string) => void };
}

interface CreateSubscriptionOpts {
  userId: string; role?: string; direction?: string; origin?: string; destination?: string;
  originGeo?: GeoPoint; destGeo?: GeoPoint; departureTime?: string; forwardTime?: string; returnTime?: string;
  planName: string; distanceKm?: number; amountPaid: number; paymentId?: string;
  pickupRadiusM?: number; dropRadiusM?: number;
}

function withTimeout<T>(p: Promise<T>, ms: number, label = "operation"): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function createPendingSubscription(opts: CreateSubscriptionOpts, db: any): Subscription {
  const { userId, planName } = opts;
  const subRole: 'guest' | 'host' = opts.role === 'host' ? 'host' : 'guest';
  const direction = opts.direction as CommuteDirection | undefined;

  const origin = String(opts.origin || "").trim();
  const destination = String(opts.destination || "").trim();
  if (!origin) throw new Error("Origin address is required and cannot be empty");
  if (!destination) throw new Error("Destination address is required and cannot be empty");
  if (origin.toLowerCase() === destination.toLowerCase()) {
    throw new Error("Origin and destination must be different addresses");
  }

  const cfg = db.pricingConfig;
  const priorGuest = subRole === 'guest'
    ? db.subscriptions.filter(s => s.userId === userId && s.role === 'guest')
    : [];
  const lastGuest = [...priorGuest].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
  const grossPlanPrice = subRole === 'guest' ? guestPlanPrice(cfg, planName, opts.distanceKm ?? 0) : Number(opts.amountPaid);
  const duration = planDaysOf(planTypeOf(planName));
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + duration);

  // Expire any prior overlapping subscription
  db.subscriptions = db.subscriptions.map(s => {
    if (s.userId !== userId || s.status !== "active") return s;
    if (subRole === 'guest' && s.role === 'guest' && s.direction === direction) {
      if (s.matchId) {
        const oldMatch = db.matches.find(m => m.id === s.matchId && m.status === "active");
        if (oldMatch) oldMatch.status = "cancelled" as const;
      }
      return { ...s, status: "expired" as const };
    }
    if (subRole === 'host' && s.role === 'host') {
      for (const m of db.matches) {
        if (m.hostSubscriptionId === s.id && m.status === "active") m.status = "cancelled" as const;
      }
      return { ...s, status: "expired" as const };
    }
    return s;
  });

  const newSub: Subscription = {
    id: "sub_" + randomUUID().replace(/-/g, "").substring(0, 7),
    userId, planName, durationDays: duration,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    amountPaid: Number(opts.amountPaid),
    planPrice: grossPlanPrice,
    status: "pending", role: subRole,
    origin, destination,
    distanceKm: opts.distanceKm != null ? Number(opts.distanceKm) : undefined,
    matchId: null,
    originGeo: opts.originGeo,
    destGeo: opts.destGeo,
    pickupRadiusM: opts.pickupRadiusM,
    dropRadiusM: opts.dropRadiusM,
    ...(subRole === 'guest' ? { direction, departureTime: opts.departureTime } : { forwardTime: opts.forwardTime, returnTime: opts.returnTime }),
  };
  db.subscriptions.push(newSub);

  if (!db.wallets[userId]) db.wallets[userId] = { userId, credits: 0, history: [] };
  db.wallets[userId].history.unshift({
    id: "tx_sub_" + randomUUID().replace(/-/g, "").substring(0, 7),
    amount: Number(opts.amountPaid), type: "debit",
    description: `Commute Pass: ${planName} (${subRole === 'guest' ? direction : 'host network'})${opts.paymentId ? ` [${opts.paymentId}]` : ''}`,
    timestamp: new Date().toISOString()
  });

  return newSub;
}

export async function processActivation(sub: Subscription, deps: ActivationDeps): Promise<void> {
  const userId = sub.userId;
  const planName = sub.planName;
  const subRole = sub.role ?? 'guest';
  const direction = sub.direction;
  const origin = sub.origin!;
  const destination = sub.destination!;
  const lockKey = subRole === 'guest' ? `sub:${userId}:${direction}` : `sub:${userId}:host`;

  try {
    await deps.withLock(lockKey, async () => {
      const activationStart = Date.now();
      const timing: Record<string, number> = {
        geocodeOriginMs: 0, geocodeDestinationMs: 0,
        tryMatchGuestSubMs: 0, runMatchSweepMs: 0,
        findBuddyForGuestMs: 0, endpointMetersMs: 0, getDistanceKmMs: 0,
      };

      // ── GEOCODING (parallel with timeout) ─────────────────────────────
      sub.status = "geocoding" as const;
      await deps.saveDB(deps.db);
      const geocodeStart = Date.now();
      const [originGeo, destGeo] = await withTimeout(
        Promise.all([
          (origin ? deps.geocode(origin) : Promise.resolve(null)).catch(() => null),
          (destination ? deps.geocode(destination) : Promise.resolve(null)).catch(() => null),
        ]),
        15000,
        "geocode"
      );
      timing.geocodeOriginMs = Date.now() - geocodeStart;
      timing.geocodeDestinationMs = timing.geocodeOriginMs;
      sub.originGeo = originGeo || undefined;
      sub.destGeo = destGeo || undefined;

      // ── WALLET CREDITS (upgrade/loyalty) ──────────────────────────────
      const cfg = deps.db.pricingConfig;
      const priorGuest = subRole === 'guest'
        ? deps.db.subscriptions.filter(s => s.userId === userId && s.role === 'guest' && s.id !== sub.id)
        : [];
      const lastGuest = [...priorGuest].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
      const grossPlanPrice = sub.planPrice ?? sub.amountPaid;

      if (subRole === 'guest' && priorGuest.length > 0) {
        const pt = planTypeOf(planName);
        const lastType = lastGuest ? planTypeOf(lastGuest.planName) : undefined;
        let creditAmt = 0, creditLabel = '';
        if (lastType === '7d' && (pt === '15d' || pt === '1m')) {
          creditAmt = Math.round(Math.min(grossPlanPrice * (cfg.upgradeIncentivePercent / 100), cfg.upgradeIncentiveCap));
          creditLabel = 'Upgrade incentive';
        } else if (pt === '1m') {
          const lastGross = Number((lastGuest as any)?.planPrice ?? lastGuest?.amountPaid) || 0;
          if (lastGross > 0) {
            creditAmt = Math.round(Math.min(Math.max(lastGross * (cfg.loyaltyCreditPercent / 100), cfg.loyaltyCreditMin), cfg.loyaltyCreditMax));
            creditLabel = 'Loyalty credit';
          }
        }
        if (creditAmt > 0) {
          deps.db.wallets[userId].credits += creditAmt;
          deps.db.wallets[userId].history.unshift({
            id: "tx_credit_" + randomUUID().replace(/-/g, "").substring(0, 7),
            amount: creditAmt, type: "credit",
            description: `${creditLabel} (${planName})`,
            timestamp: new Date().toISOString(),
          });
          deps.notifyUser(userId, `${creditLabel} added`, `₹${creditAmt} ${creditLabel.toLowerCase()} was added to your wallet.`, "wallet", { amount: creditAmt, balance: deps.db.wallets[userId].credits });
        }
      }

      // ── ACTIVATE (before matching so concurrent activations see each
      //    other as eligible candidates) ──────────────────────────────────
      sub.status = "active" as const;
      await deps.saveDB(deps.db);

      // ── MATCHING (with timeout) ───────────────────────────────────────
      sub.status = "matching" as const;
      await deps.saveDB(deps.db);
      let matches: Match[] = [];
      if (subRole === 'guest') {
        const tryMatchStart = Date.now();
        const m = await withTimeout(deps.tryMatchGuestSub(deps.db as any, sub), 30000, "tryMatchGuestSub").catch(() => null);
        timing.tryMatchGuestSubMs = Date.now() - tryMatchStart;
        if (m) {
          matches = [m];
          sub.matchId = m.id;
          sub.status = "active" as const;
        } else {
          sub.status = "active" as const;
        }
      } else {
        const sweepStart = Date.now();
        const sweep = await withTimeout(deps.runMatchSweep(deps.db as any), 30000, "runMatchSweep").catch(() => []);
        timing.runMatchSweepMs = Date.now() - sweepStart;
        matches = sweep;
        sub.status = "active" as const;
      }

      // ── FINALISE ──────────────────────────────────────────────────────
      await deps.saveDB(deps.db);
      matches.forEach(deps.notifyBuddyFound);

      deps.notifyUser(
        userId,
        "Subscription active",
        `Your ${planName} ${subRole === 'guest' ? 'commute pass' : 'host plan'} is now active${sub.endDate ? ` until ${sub.endDate}` : ''}.`,
        "subscription",
        { subscriptionId: sub.id, planName }
      );
    }).catch((err: any) => {
      sub.status = "failed" as const;
      deps.saveDB(deps.db).catch(() => {});
      deps.logger.error({ err, userId, subscriptionId: sub.id }, "[activation] lock acquisition failed");
    });
  } catch (err: any) {
    sub.status = "failed" as const;
    try { await deps.saveDB(deps.db); } catch {}
    deps.logger.error({ err, userId, subscriptionId: sub.id }, "[activation] background processing failed");
  }
}

export function activateSubscriptionAsync(
  opts: CreateSubscriptionOpts,
  deps: ActivationDeps
): Subscription {
  const sub = createPendingSubscription(opts, deps.db);
  setImmediate(() => {
    processActivation(sub, deps).catch((err: any) => {
      deps.logger.error({ err, userId: opts.userId, subscriptionId: sub.id }, "[activation] background error");
    });
  });
  return sub;
}
