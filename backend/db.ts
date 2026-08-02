import fs from "fs";
import prisma, { setFallbackDb, setFallbackMode, isFallbackMode } from "./prisma";
import { logger } from "./logger";
import { encryptPii, decryptPii } from "./crypto";

const FALLBACK_DB_PATH = "./db.json";

export function dbEnabled(): boolean {
  return true;
}

export async function initDb(): Promise<void> {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    await prisma.$connect();
    logger.info("[db] Connected to PostgreSQL via Prisma.");
  } catch (e) {
    logger.warn({ err: e }, "[db] Prisma DB connection failed. Activating local file-based database fallback.");
    setFallbackMode(true);
  }
}

export async function loadState(defaults: any): Promise<any> {
  if (isFallbackMode()) {
    logger.info("[db] Fallback mode active — loading state from local file.");
    if (fs.existsSync(FALLBACK_DB_PATH)) {
      try {
        const fileData = fs.readFileSync(FALLBACK_DB_PATH, "utf8");
        const parsed = JSON.parse(fileData);
        const state = { ...defaults, ...parsed };
        setFallbackDb(state);
        logger.info("[db] Loaded state from local file db.json successfully.");
        return state;
      } catch (err) {
        logger.error({ err }, "[db] Failed to parse local db.json, using seeded defaults.");
      }
    }
    logger.info("[db] Seeding default state and writing to db.json.");
    setFallbackDb(defaults);
    try {
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(defaults, null, 2), "utf8");
    } catch (err) {
      logger.error({ err }, "[db] Failed to write initial db.json.");
    }
    return defaults;
  }

  const configCount = await prisma.appConfig.count();
  if (configCount === 0) {
    logger.info("[db] Empty database — seeding default state.");
    await seedDatabase(defaults);
    return defaults;
  }

  const state: any = { ...defaults };

  const [
    users,
    rides,
    requests,
    subscriptions,
    matches,
    trips,
    hostActivityDays,
    payments,
    chatMessages,
    tickets,
    notifications,
    guestCredits,
    wallets,
    auditLogs,
    userStatus,
    promoCodes,
    vouchers,
    cmsPages,
    subscriptionPlans,
    notificationTemplates,
    cfg,
  ] = await Promise.all([
    loadUsers(),
    prisma.ride.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.rideRequest.findMany({ orderBy: { createdAt: "desc" } }),
    loadSubscriptions(),
    prisma.match.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.trip.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.hostActivityDay.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.chatMessage.findMany({ orderBy: { timestamp: "asc" } }),
    loadTickets(),
    loadNotifications(),
    prisma.guestCredit.findMany({ orderBy: { createdAt: "desc" } }),
    loadWallets(),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" } }),
    loadUserStatus(),
    prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.voucher.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.cmsPage.findMany(),
    prisma.subscriptionPlan.findMany(),
    prisma.notificationTemplate.findMany(),
    loadConfig(),
  ]);

  state.users = users;
  state.rides = rides;
  state.requests = requests;
  state.subscriptions = subscriptions;
  state.matches = matches;
  state.trips = trips;
  state.hostActivityDays = hostActivityDays;
  state.payments = payments.map(fromDbPayment);
  state.chatMessages = chatMessages;
  state.tickets = tickets;
  state.notifications = notifications;
  state.guestCredits = guestCredits;
  state.wallets = wallets;
  state.auditLogs = auditLogs;
  state.userStatus = userStatus;
  state.promoCodes = promoCodes;
  state.vouchers = vouchers;
  state.cmsPages = cmsPages;
  if (subscriptionPlans.length > 0) state.subscriptionPlans = subscriptionPlans;
  state.notificationTemplates = notificationTemplates;

  if (cfg.systemSettings) state.systemSettings = { ...state.systemSettings, ...cfg.systemSettings };
  if (cfg.pricingConfig) state.pricingConfig = { ...state.pricingConfig, ...cfg.pricingConfig };
  if (cfg.themeConfig) state.themeConfig = { ...state.themeConfig, ...cfg.themeConfig };
  if (cfg.brandingConfig) state.brandingConfig = { ...state.brandingConfig, ...cfg.brandingConfig };
  if (cfg.featureFlags) state.featureFlags = { ...state.featureFlags, ...cfg.featureFlags };

  logger.info({ users: state.users.length, rides: state.rides.length }, "[db] Loaded state from PostgreSQL");
  return state;
}

function fromDbUser(u: any): any {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role.toLowerCase(),
    gender: u.gender.toLowerCase(),
    adminRole: u.adminRole,
    companyOrCollege: u.companyOrCollege,
    isIdVerified: u.isIdVerified,
    isCompanyVerified: u.isCompanyVerified,
    avatarUrl: u.avatarUrl,
    buddyScore: u.buddyScore,
    rating: u.rating,
    reliabilityScore: u.reliabilityScore,
    verificationStatus: u.verificationStatus?.toLowerCase() || "none",
    // PII fields are decrypted from encrypted-at-rest storage
    licenceNumber: decryptPii(u.licenceNumber),
    aadhaarNumber: decryptPii(u.aadhaarNumber),
    selfieImage: u.selfieImage,
    licenceImageUrl: u.licenceImageUrl,
    aadhaarImageUrl: u.aadhaarImageUrl,
    vehicleRcNumber: u.vehicleRcNumber,
    vehicleRcImageUrl: u.vehicleRcImageUrl,
    verificationSubmittedAt: u.verificationSubmittedAt?.toISOString(),
    bio: u.bio,
    createdAt: u.createdAt?.toISOString(),
  };
}

function toDbUser(u: any): any {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || null,
    role: (u.role || "guest").toUpperCase(),
    gender: (u.gender || "other").toUpperCase(),
    adminRole: u.adminRole || null,
    companyOrCollege: u.companyOrCollege || null,
    isIdVerified: u.isIdVerified || false,
    isCompanyVerified: u.isCompanyVerified || false,
    avatarUrl: u.avatarUrl || "",
    buddyScore: u.buddyScore ?? 50,
    rating: u.rating ?? 0,
    reliabilityScore: u.reliabilityScore ?? 50,
    verificationStatus: (u.verificationStatus || "none").toUpperCase(),
    // PII fields are encrypted at rest
    licenceNumber: encryptPii(u.licenceNumber),
    aadhaarNumber: encryptPii(u.aadhaarNumber),
    selfieImage: u.selfieImage || null,
    licenceImageUrl: u.licenceImageUrl || null,
    aadhaarImageUrl: u.aadhaarImageUrl || null,
    vehicleRcNumber: u.vehicleRcNumber || null,
    vehicleRcImageUrl: u.vehicleRcImageUrl || null,
    verificationSubmittedAt: u.verificationSubmittedAt ? new Date(u.verificationSubmittedAt) : null,
    bio: u.bio || null,
  };
}

async function loadUsers(): Promise<any[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return users.map(fromDbUser);
}

function fromDbSub(s: any): any {
  return {
    id: s.id,
    userId: s.userId,
    planName: s.planName,
    durationDays: s.durationDays,
    startDate: s.startDate,
    endDate: s.endDate,
    amountPaid: s.amountPaid,
    planPrice: s.planPrice,
    status: s.status.toLowerCase(),
    role: s.role,
    direction: s.direction?.toLowerCase(),
    origin: s.origin,
    destination: s.destination,
    departureTime: s.departureTime,
    forwardTime: s.forwardTime,
    returnTime: s.returnTime,
    distanceKm: s.distanceKm,
    matchId: s.matchId,
    createdAt: s.createdAt?.toISOString(),
  };
}

function toDbSub(s: any): any {
  return {
    id: s.id,
    userId: s.userId,
    planName: s.planName,
    durationDays: s.durationDays || 0,
    startDate: s.startDate || new Date().toISOString().split("T")[0],
    endDate: s.endDate || "",
    amountPaid: s.amountPaid || 0,
    planPrice: s.planPrice || null,
    status: (s.status || "active").toUpperCase(),
    role: s.role || "guest",
    direction: s.direction ? s.direction.toUpperCase() : null,
    origin: s.origin || null,
    destination: s.destination || null,
    departureTime: s.departureTime || null,
    forwardTime: s.forwardTime || null,
    returnTime: s.returnTime || null,
    distanceKm: s.distanceKm || null,
    matchId: s.matchId || null,
  };
}

async function loadSubscriptions(): Promise<any[]> {
  const subs = await prisma.subscription.findMany({ orderBy: { createdAt: "desc" } });
  return subs.map(fromDbSub);
}

async function loadTickets(): Promise<any[]> {
  const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } });
  return tickets.map((t: any) => ({
    id: t.id,
    userId: t.userId,
    subject: t.subject,
    status: t.status.toLowerCase(),
    ticketType: t.ticketType,
    category: t.category,
    description: t.description,
    screenshotUrl: t.screenshotUrl,
    guestId: t.guestId,
    hostId: t.hostId,
    rideId: t.rideId,
    createdAt: t.createdAt?.toISOString(),
    messages: [],
  }));
}

async function loadNotifications(): Promise<any[]> {
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: "desc" } });
  return notifications.map((n: any) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    body: n.body,
    type: n.type,
    read: n.read,
    meta: n.meta,
    createdAt: n.createdAt?.toISOString(),
  }));
}

async function loadWallets(): Promise<Record<string, any>> {
  const [wallets, txns] = await Promise.all([
    prisma.wallet.findMany(),
    prisma.walletTransaction.findMany({ orderBy: { timestamp: "desc" } }),
  ]);
  const txnsByWallet = new Map<string, any[]>();
  for (const t of txns) {
    if (!txnsByWallet.has(t.walletId)) txnsByWallet.set(t.walletId, []);
    txnsByWallet.get(t.walletId)!.push(t);
  }
  const result: Record<string, any> = {};
  for (const w of wallets) {
    const history = (txnsByWallet.get(w.userId) || []).map((t: any) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      timestamp: t.timestamp?.toISOString(),
    }));
    result[w.userId] = {
      userId: w.userId,
      credits: w.credits,
      history,
    };
  }
  return result;
}

function loadUserStatus(): Record<string, string> {
  return {};
}

async function loadConfig(): Promise<Record<string, any>> {
  const rows = await prisma.appConfig.findMany();
  const result: Record<string, any> = {};
  for (const row of rows) {
    try { result[row.key] = typeof row.data === "object" ? row.data : JSON.parse(row.data as string); }
    catch { result[row.key] = row.data; }
  }
  return result;
}

export async function persistNow(state: any): Promise<void> {
  try {
    await persistAll(state);
  } catch (e) {
    logger.error({ err: e }, "[db] persist error");
  }
}

export function saveState(state: any): Promise<void> {
  return persistAll(state).catch((e) => logger.error({ err: e }, "[db] persist error"));
}

async function persistAll(state: any): Promise<void> {
  if (!state) return;

  if (isFallbackMode()) {
    try {
      setFallbackDb(state);
      fs.writeFileSync(FALLBACK_DB_PATH, JSON.stringify(state, null, 2), "utf8");
    } catch (err) {
      logger.error({ err }, "[db] Fallback save failed");
    }
    return;
  }

  console.log("DBP1: persistAll start");
  console.log("DBP2: persisting users");
  await safeUpsert(prisma.user, state.users.map(toDbUser), "id");
  console.log("DBP3: persisting rides");
  await safeUpsert(prisma.ride, state.rides, "id");
  console.log("DBP4: persisting rideRequests");
  await safeUpsert(prisma.rideRequest, state.requests, "id");
  console.log("DBP5: persisting subscriptions");
  await safeUpsert(prisma.subscription, (state.subscriptions || []).map(toDbSub), "id");
  console.log("DBP6: persisting matches");
  await safeUpsert(prisma.match, state.matches, "id");
  console.log("DBP7: persisting trips");
  await safeUpsert(prisma.trip, state.trips, "id");
  console.log("DBP8: persisting hostActivityDays");
  await safeUpsert(prisma.hostActivityDay, state.hostActivityDays, "id");
  console.log("DBP9: persisting payments");
  await safeUpsert(prisma.payment, (state.payments || []).map(toDbPayment), "id");
  console.log("DBP10: persisting chatMessages");
  await safeUpsert(prisma.chatMessage, state.chatMessages, "id");
  console.log("DBP11: persisting supportTickets");
  await safeUpsert(prisma.supportTicket, state.tickets, "id");
  console.log("DBP12: persisting guestCredits");
  await safeUpsert(prisma.guestCredit, state.guestCredits, "id");
  console.log("DBP13: persisting auditLogs");
  await safeUpsert(prisma.auditLog, state.auditLogs, "id");
  console.log("DBP14: persisting promoCodes");
  await safeUpsert(prisma.promoCode, state.promoCodes, "id");
  console.log("DBP15: persisting vouchers");
  await safeUpsert(prisma.voucher, state.vouchers, "id");
  console.log("DBP16: persisting cmsPages");
  await safeUpsert(prisma.cmsPage, state.cmsPages, "id");
  console.log("DBP17: persisting subscriptionPlans");
  await safeUpsert(prisma.subscriptionPlan, state.subscriptionPlans, "id");
  console.log("DBP18: persisting notificationTemplates");
  await safeUpsert(prisma.notificationTemplate, state.notificationTemplates, "id");

  console.log("DBP19: persisting notifications");
  await persistNotifications(state.notifications);
  console.log("DBP20: persisting wallets");
  await persistWallets(state.wallets);
  console.log("DBP21: persisting config");
  await persistConfig(state);
  console.log("DBP22: persistAll end");
}

// The Prisma column is `notes` (Json) and `status` is a DB enum (UPPERCASE);
// in-memory payments use lowercase status, like the API layer.
export function fromDbPayment(p: any): any {
  if (!p) return p;
  const { updatedAt, ...rest } = p;
  return {
    ...rest,
    status: String(p.status || "created").toLowerCase(),
    notes: p.notes || undefined,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  };
}

export function toDbPayment(p: any): any {
  if (!p) return p;
  const { updatedAt, ...rest } = p;
  return {
    ...rest,
    status: String(p.status || "created").toUpperCase(),
    notes: p.notes || undefined,
    createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
  };
}

async function safeUpsert(model: any, items: any[], key: string): Promise<void> {
  if (!items || items.length === 0) return;
  const chunkSize = 50;
  let failed = 0;
  let firstError: unknown = null;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    try {
      await model.createMany({ data: chunk, skipDuplicates: true });
    } catch {
      for (const item of chunk) {
        try {
          await model.upsert({
            where: { [key]: item[key] },
            create: item,
            update: item,
          });
        } catch (e) {
          failed++;
          if (!firstError) firstError = e;
        }
      }
    }
  }
  if (failed > 0) {
    logger.error(
      { err: firstError, failed, total: items.length },
      "[db] safeUpsert: rows failed to persist — data exists only in memory"
    );
  }
}

async function persistNotifications(notifications: any[]): Promise<void> {
  if (!notifications || notifications.length === 0) return;
  for (const n of notifications) {
    try {
      await prisma.notification.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          userId: n.userId,
          title: n.title,
          body: n.body,
          type: n.type || "system",
          read: n.read || false,
          meta: n.meta || undefined,
          channel: "PUSH",
        },
        update: {
          read: n.read || false,
        },
      });
    } catch {}
  }
}

async function persistWallets(wallets: Record<string, any>): Promise<void> {
  if (!wallets) return;
  for (const [userId, w] of Object.entries(wallets)) {
    const wallet = w as any;
    try {
      await prisma.wallet.upsert({
        where: { userId },
        create: { userId, credits: wallet.credits || 0 },
        update: { credits: wallet.credits || 0 },
      });
      if (wallet.history) {
        for (const txn of wallet.history) {
          try {
            await prisma.walletTransaction.upsert({
              where: { id: txn.id },
              create: {
                id: txn.id,
                walletId: userId,
                amount: txn.amount || 0,
                type: txn.type || "credit",
                description: txn.description || "",
                timestamp: txn.timestamp ? new Date(txn.timestamp) : new Date(),
              },
              update: {
                amount: txn.amount || 0,
                type: txn.type || "credit",
                description: txn.description || "",
              },
            });
          } catch {}
        }
      }
    } catch {}
  }
}

async function persistConfig(state: any): Promise<void> {
  const configKeys = ["systemSettings", "pricingConfig", "themeConfig", "brandingConfig", "featureFlags", "tripValidationConfig"];
  for (const key of configKeys) {
    if (state[key] === undefined) continue;
    try {
      await prisma.appConfig.upsert({
        where: { key },
        create: { key, data: state[key] as any },
        update: { data: state[key] as any },
      });
    } catch {}
  }
}

async function seedDatabase(defaults: any): Promise<void> {
  if (defaults.users?.length) {
    await safeUpsert(prisma.user, defaults.users.map(toDbUser), "id");
  }
  if (defaults.rides?.length) await safeUpsert(prisma.ride, defaults.rides, "id");
  if (defaults.requests?.length) await safeUpsert(prisma.rideRequest, defaults.requests, "id");
  if (defaults.subscriptions?.length) await safeUpsert(prisma.subscription, defaults.subscriptions.map(toDbSub), "id");
  if (defaults.matches?.length) await safeUpsert(prisma.match, defaults.matches, "id");
  if (defaults.trips?.length) await safeUpsert(prisma.trip, defaults.trips, "id");
  if (defaults.hostActivityDays?.length) await safeUpsert(prisma.hostActivityDay, defaults.hostActivityDays, "id");
  if (defaults.payments?.length) await safeUpsert(prisma.payment, defaults.payments.map(toDbPayment), "id");
  if (defaults.chatMessages?.length) await safeUpsert(prisma.chatMessage, defaults.chatMessages, "id");
  if (defaults.tickets?.length) await safeUpsert(prisma.supportTicket, defaults.tickets, "id");
  if (defaults.notifications?.length) await persistNotifications(defaults.notifications);
  if (defaults.wallets) await persistWallets(defaults.wallets);
  if (defaults.auditLogs?.length) await safeUpsert(prisma.auditLog, defaults.auditLogs, "id");
  if (defaults.promoCodes?.length) await safeUpsert(prisma.promoCode, defaults.promoCodes, "id");
  if (defaults.vouchers?.length) await safeUpsert(prisma.voucher, defaults.vouchers, "id");
  if (defaults.cmsPages?.length) await safeUpsert(prisma.cmsPage, defaults.cmsPages, "id");
  if (defaults.subscriptionPlans?.length) await safeUpsert(prisma.subscriptionPlan, defaults.subscriptionPlans, "id");
  if (defaults.notificationTemplates?.length) await safeUpsert(prisma.notificationTemplate, defaults.notificationTemplates, "id");
  await persistConfig(defaults);
}
