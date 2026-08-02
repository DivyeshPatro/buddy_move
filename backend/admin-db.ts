import crypto from "crypto";
import prisma from "./prisma";
import { logger } from "./logger";
import { encryptPii, decryptPii } from "./crypto";

function fromDbUser(u: any) {
  return {
    id: u.id, name: u.name, email: u.email, phone: u.phone,
    role: u.role?.toLowerCase(), gender: u.gender?.toLowerCase(),
    adminRole: u.adminRole, companyOrCollege: u.companyOrCollege,
    isIdVerified: u.isIdVerified, isCompanyVerified: u.isCompanyVerified,
    avatarUrl: u.avatarUrl, buddyScore: u.buddyScore, rating: u.rating,
    reliabilityScore: u.reliabilityScore,
    verificationStatus: u.verificationStatus?.toLowerCase() || "none",
    licenceNumber: decryptPii(u.licenceNumber),
    aadhaarNumber: decryptPii(u.aadhaarNumber),
    selfieImage: u.selfieImage, licenceImageUrl: u.licenceImageUrl,
    aadhaarImageUrl: u.aadhaarImageUrl, vehicleRcNumber: u.vehicleRcNumber,
    vehicleRcImageUrl: u.vehicleRcImageUrl,
    verificationSubmittedAt: u.verificationSubmittedAt?.toISOString(),
    bio: u.bio, createdAt: u.createdAt?.toISOString(),
  };
}

function fromDbSub(s: any) {
  return {
    id: s.id, userId: s.userId, planName: s.planName,
    durationDays: s.durationDays, startDate: s.startDate, endDate: s.endDate,
    amountPaid: s.amountPaid, planPrice: s.planPrice,
    status: s.status?.toLowerCase(), role: s.role,
    direction: s.direction?.toLowerCase(), origin: s.origin,
    destination: s.destination, departureTime: s.departureTime,
    forwardTime: s.forwardTime, returnTime: s.returnTime,
    distanceKm: s.distanceKm, matchId: s.matchId,
    createdAt: s.createdAt?.toISOString(),
  };
}

export async function adminGetUsers(search?: string) {
  const where: any = {};
  if (search) {
    const q = search.toLowerCase();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  const users = await prisma.user.findMany({ where, orderBy: { createdAt: "desc" } });
  const userIds = users.map(u => u.id);

  const wallets = await prisma.wallet.findMany({ where: { userId: { in: userIds } } });
  const walletMap: Record<string, number> = {};
  for (const w of wallets) walletMap[w.userId] = w.credits;

  const activeSubs = await prisma.subscription.findMany({
    where: { userId: { in: userIds }, status: "ACTIVE" },
  });
  const subMap: Record<string, any> = {};
  for (const s of activeSubs) subMap[s.userId] = fromDbSub(s);

  const adminUserIds = new Set(users.filter(u => u.role === "ADMIN").map(u => u.id));

  return users.map(u => ({
    ...fromDbUser(u),
    status: u.role === "ADMIN" ? "active" : (u.isIdVerified ? "active" : "pending"),
    walletCredits: walletMap[u.id] || 0,
    activeSubscription: subMap[u.id] || null,
  }));
}

export async function adminGetUserById(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  const sub = await prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE" },
  });
  return {
    ...fromDbUser(u),
    status: u.role === "ADMIN" ? "active" : (u.isIdVerified ? "active" : "pending"),
    walletCredits: wallet?.credits || 0,
    activeSubscription: sub ? fromDbSub(sub) : null,
  };
}

export async function adminUpdateUserStatus(userId: string, action: string, reason?: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return null;

  if (action === "suspend" || action === "ban") {
    await prisma.user.update({ where: { id: userId }, data: { isIdVerified: false } });
  } else if (action === "activate") {
    await prisma.user.update({ where: { id: userId }, data: { isIdVerified: true } });
  } else if (action === "verify") {
    await prisma.user.update({
      where: { id: userId },
      data: { isIdVerified: true, verificationStatus: "VERIFIED" },
    });
  } else if (action === "reject") {
    await prisma.user.update({
      where: { id: userId },
      data: { isIdVerified: false, verificationStatus: "REJECTED" },
    });
  } else if (action === "reset") {
    await prisma.user.update({
      where: { id: userId },
      data: { isIdVerified: false, verificationStatus: "NONE" },
    });
  }

  return adminGetUserById(userId);
}

export async function adminGetMatches(status?: string) {
  const where: any = {};
  if (status && status !== "all") where.status = status.toUpperCase();

  const matches = await prisma.match.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const guestIds = matches.map(m => m.guestId);
  const hostIds = matches.map(m => m.hostId);
  const allUserIds = [...new Set([...guestIds, ...hostIds])];
  const users = await prisma.user.findMany({ where: { id: { in: allUserIds } } });
  const userMap: Record<string, any> = {};
  for (const u of users) {
    userMap[u.id] = { id: u.id, name: u.name, avatarUrl: u.avatarUrl, phone: u.phone };
  }

  const subIds = matches.map(m => m.guestSubscriptionId).filter(Boolean);
  const subs = await prisma.subscription.findMany({ where: { id: { in: subIds } } });
  const subMap: Record<string, any> = {};
  for (const s of subs) subMap[s.id] = fromDbSub(s);

  const todayStr = new Date().toISOString().split("T")[0];
  const activityDays = await prisma.hostActivityDay.findMany({
    where: {
      subscriptionId: { in: subIds },
      rideCompleted: true,
    },
  });
  const activityCount: Record<string, number> = {};
  for (const a of activityDays) {
    activityCount[a.subscriptionId] = (activityCount[a.subscriptionId] || 0) + 1;
  }

  const allMatchUserIds = new Set([...guestIds, ...hostIds]);
  const openTickets = await prisma.supportTicket.findMany({
    where: { status: "OPEN" },
  });
  const disputeCount: Record<string, number> = {};
  for (const t of openTickets) {
    if (t.guestId) disputeCount[t.guestId] = (disputeCount[t.guestId] || 0) + 1;
    if (t.hostId) disputeCount[t.hostId] = (disputeCount[t.hostId] || 0) + 1;
  }

  return matches.map(m => {
    const guestSub = m.guestSubscriptionId ? subMap[m.guestSubscriptionId] : null;
    return {
      ...m,
      guest: userMap[m.guestId] || null,
      host: userMap[m.hostId] || null,
      route: guestSub
        ? { origin: guestSub.origin, destination: guestSub.destination, departureTime: guestSub.departureTime }
        : null,
      completedDays: activityCount[m.hostSubscriptionId] || 0,
      openDisputes: (disputeCount[m.guestId] || 0) + (disputeCount[m.hostId] || 0),
    };
  });
}

export async function adminGetKycQueue() {
  const users = await prisma.user.findMany({
    where: { verificationStatus: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  return users.map(fromDbUser);
}

export async function adminGetTickets(status?: string) {
  const where: any = {};
  if (status && status !== "all") where.status = status.toUpperCase();

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const userIds = [...new Set(tickets.map(t => t.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.id] = u.name;

  return tickets.map(t => ({
    id: t.id, userId: t.userId, userName: userMap[t.userId] || "Unknown",
    subject: t.subject, status: t.status.toLowerCase(),
    ticketType: t.ticketType, category: t.category,
    description: t.description, screenshotUrl: t.screenshotUrl,
    guestId: t.guestId, hostId: t.hostId, rideId: t.rideId,
    createdAt: t.createdAt?.toISOString(),
  }));
}

export async function adminGetTicketsCountByStatus(): Promise<Record<string, number>> {
  const all = await prisma.supportTicket.groupBy({ by: ["status"], _count: true });
  const result: Record<string, number> = { all: 0, open: 0, resolved: 0, approved: 0, rejected: 0 };
  for (const row of all) {
    const key = row.status.toLowerCase();
    result[key] = row._count;
    result.all += row._count;
  }
  return result;
}

export async function adminUpdateTicketStatus(ticketId: string, action: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;

  const newStatus = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "RESOLVED";
  await prisma.supportTicket.update({ where: { id: ticketId }, data: { status: newStatus } });

  if (action === "approve" && ticket.ticketType === "partner_change" && ticket.guestId) {
    await prisma.subscription.updateMany({
      where: { userId: ticket.guestId, status: "ACTIVE" },
      data: { isPartnerLocked: false, partnerChangeApproved: true } as any,
    });
  }

  return { success: true };
}

export async function adminGetWallets() {
  const wallets = await prisma.wallet.findMany({ orderBy: { credits: "desc" } });
  const userIds = wallets.map(w => w.userId);
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap: Record<string, any> = {};
  for (const u of users) userMap[u.id] = { name: u.name, email: u.email };

  return wallets.map(w => ({
    userId: w.userId,
    userName: userMap[w.userId]?.name || "Unknown",
    userEmail: userMap[w.userId]?.email || "",
    credits: w.credits,
    history: [],
  }));
}

export async function adminCreditWallet(userId: string, action: "credit" | "deduct", amount: number, reason: string) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { userId } });
    if (!wallet) return null;

    const amt = Math.max(0, amount);
    const newCredits = action === "credit" ? wallet.credits + amt : Math.max(0, wallet.credits - amt);

    await tx.wallet.update({ where: { userId }, data: { credits: newCredits } });

    const txn = await tx.walletTransaction.create({
      data: {
        id: "tx_" + crypto.randomUUID().replace(/-/g, "").substring(0, 6),
        walletId: userId,
        amount: amt,
        type: action,
        description: reason || `Admin ${action}`,
        timestamp: new Date(),
      },
    });

    return { userId, credits: newCredits, transaction: txn };
  });
}

export async function adminGetPayments(status?: string) {
  const where: any = {};
  if (status && status !== "all") where.status = status.toUpperCase();

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const userIds = [...new Set(payments.map(p => p.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap: Record<string, { name: string; email: string }> = {};
  for (const u of users) userMap[u.id] = { name: u.name, email: u.email };

  return payments.map(p => ({
    id: p.id,
    userId: p.userId,
    userName: userMap[p.userId]?.name || "Unknown",
    userEmail: userMap[p.userId]?.email || "",
    provider: p.provider,
    providerOrderId: p.providerOrderId,
    providerPaymentId: p.providerPaymentId,
    amount: p.amount,
    currency: p.currency,
    status: p.status.toLowerCase(),
    subscriptionId: p.subscriptionId,
    planName: (p.notes as any)?.planName || null,
    role: (p.notes as any)?.role || null,
    createdAt: p.createdAt?.toISOString(),
    updatedAt: p.updatedAt?.toISOString(),
  }));
}

export async function adminGetAuditLogs(page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" }, skip, take: limit }),
    prisma.auditLog.count(),
  ]);
  return { logs, total, page, pages: Math.ceil(total / limit) };
}

export async function adminGetAnalytics() {
  const [totalUsers, verifiedUsers, totalRides, completedRides] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isIdVerified: true } }),
    prisma.ride.count(),
    prisma.rideRequest.count({ where: { status: "COMPLETED" as any } }),
  ]);
  const activeUsers = totalUsers;
  const activeRides = await prisma.ride.count({ where: { availableSeats: { gt: 0 } } });
  const subs = await prisma.subscription.findMany({ select: { amountPaid: true, status: true, startDate: true } });
  const totalRevenue = subs.reduce((s, x) => s + x.amountPaid, 0);
  const activeSubscriptions = subs.filter(s => s.status === "ACTIVE").length;
  const pendingKYC = await prisma.user.count({ where: { verificationStatus: "PENDING" } });
  const walletAgg = await prisma.wallet.aggregate({ _sum: { credits: true } });
  const totalWalletBalance = walletAgg._sum.credits || 0;

  const dowNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const last7: string[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last7.push(d.toISOString().split("T")[0]); }
  const dow = (iso: string) => dowNames[new Date(iso).getDay()];

  const revenueChart = last7.map(date => ({
    day: dow(date),
    revenue: subs.filter(s => s.startDate === date).reduce((s, x) => s + x.amountPaid, 0),
  }));

  const usersByDate = await prisma.user.groupBy({
    by: ["createdAt"],
    _count: true,
  });
  const userCountByDate: Record<string, number> = {};
  for (const row of usersByDate) {
    if (row.createdAt) {
      const d = row.createdAt.toISOString().split("T")[0];
      userCountByDate[d] = (userCountByDate[d] || 0) + row._count;
    }
  }
  const userGrowth = last7.map(date => ({ day: dow(date), users: userCountByDate[date] || 0 }));

  const ridesByDate = await prisma.ride.groupBy({
    by: ["departureDate"],
    _count: true,
  });
  const rideCountByDate: Record<string, number> = {};
  for (const row of ridesByDate) {
    rideCountByDate[row.departureDate] = (rideCountByDate[row.departureDate] || 0) + row._count;
  }
  const rideGrowth = last7.map(date => ({ day: dow(date), rides: rideCountByDate[date] || 0 }));

  return {
    kpis: { totalUsers, verifiedUsers, activeUsers, totalRides, completedRides, activeRides, totalRevenue, activeSubscriptions, pendingKYC, totalWalletBalance },
    charts: { revenueChart, userGrowth, rideGrowth },
  };
}

export async function adminGetRevenue() {
  const subs = await prisma.subscription.findMany({ orderBy: { startDate: "desc" } });
  const subscriptionRevenue = subs.reduce((sum, s) => sum + s.amountPaid, 0);
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRevenue = subs.filter(s => s.startDate === todayStr).reduce((s, x) => s + x.amountPaid, 0);

  const userIds = [...new Set(subs.map(s => s.userId))];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
  const userMap: Record<string, string> = {};
  for (const u of users) userMap[u.id] = u.name;

  return {
    today: todayRevenue,
    monthly: subscriptionRevenue,
    subscriptionRevenue,
    walletRevenue: 0,
    refundAmount: 0,
    netRevenue: subscriptionRevenue,
    breakdown: subs.map(s => ({
      id: s.id, userId: s.userId,
      userName: userMap[s.userId] || "Unknown",
      plan: s.planName, amount: s.amountPaid,
      date: s.startDate, status: s.status,
    })),
  };
}

export async function adminAddAuditLog(adminId: string, adminName: string, action: string, target: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        id: "log_" + crypto.randomUUID().replace(/-/g, "").substring(0, 8),
        actorId: adminId,
        action,
        targetId: target,
        details: { adminName, details } as any,
        timestamp: new Date(),
      },
    });
  } catch (e) {
    logger.error({ err: e }, "[admin-db] audit log write failed");
  }
}

export async function adminGetDBState() {
  const [
    users, rides, requests, subscriptions, matches, trips,
    hostActivityDays, payments, chatMessages, tickets,
    notifications, guestCredits, wallets, auditLogs,
    promoCodes, vouchers, cmsPages, subscriptionPlans, notificationTemplates,
    systemSettings, pricingConfig, themeConfig, brandingConfig, featureFlags,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }).then(us => us.map(fromDbUser)),
    prisma.ride.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.rideRequest.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.subscription.findMany({ orderBy: { createdAt: "desc" } }).then(ss => ss.map(fromDbSub)),
    prisma.match.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.trip.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.hostActivityDay.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.payment.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.chatMessage.findMany({ orderBy: { timestamp: "asc" } }),
    prisma.supportTicket.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.notification.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.guestCredit.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.wallet.findMany(),
    prisma.auditLog.findMany({ orderBy: { timestamp: "desc" } }),
    prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.voucher.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.cmsPage.findMany(),
    prisma.subscriptionPlan.findMany(),
    prisma.notificationTemplate.findMany(),
    loadConfigKey("systemSettings"),
    loadConfigKey("pricingConfig"),
    loadConfigKey("themeConfig"),
    loadConfigKey("brandingConfig"),
    loadConfigKey("featureFlags"),
  ]);

  const walletRecord: Record<string, any> = {};
  const txns = await prisma.walletTransaction.findMany({ orderBy: { timestamp: "desc" } });
  for (const w of wallets) {
    walletRecord[w.userId] = {
      userId: w.userId, credits: w.credits,
      history: txns.filter(t => t.walletId === w.userId).map(t => ({
        id: t.id, amount: t.amount, type: t.type,
        description: t.description, timestamp: t.timestamp?.toISOString(),
      })),
    };
  }

  return {
    users, rides, requests, subscriptions, matches, trips,
    hostActivityDays, payments, chatMessages, tickets, notifications,
    guestCredits, wallets: walletRecord, auditLogs, promoCodes, vouchers,
    cmsPages, subscriptionPlans, notificationTemplates,
    systemSettings: systemSettings || {}, pricingConfig: pricingConfig || {},
    themeConfig: themeConfig || {}, brandingConfig: brandingConfig || {},
    featureFlags: featureFlags || {},
    userStatus: {},
  };
}

async function loadConfigKey(key: string): Promise<any> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    if (!row) return null;
    return typeof row.data === "object" ? row.data : JSON.parse(row.data as string);
  } catch { return null; }
}
