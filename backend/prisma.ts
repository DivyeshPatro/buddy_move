import { PrismaClient } from "@prisma/client";

// In-memory fallback DB storage
let fallbackDb: any = null;
let fallbackModeActive = false;

export function setFallbackDb(db: any) {
  fallbackDb = db;
}

export function getFallbackDb() {
  return fallbackDb;
}

export function setFallbackMode(active: boolean) {
  fallbackModeActive = active;
}

export function isFallbackMode() {
  return fallbackModeActive;
}

// ── Enum case reconciliation ───────────────────────────────────────────────
// Prisma models declare enums in UPPER_SNAKE (ACTIVE, CANCELLED, FORWARD, …) so
// every caller queries with the uppercase form. The fallback store (db.json) is
// written by the running app, which uses the frontend's lowercase domain values
// ("active", "cancelled", "forward"). A strict `!==` therefore never matched and
// admin queries such as `match.findMany({ where: { status: "ACTIVE" } })` came
// back empty — which is why Ride Management showed no connected rides.
//
// Only these known enum-backed columns are compared case-insensitively; every
// other field (ids, names, emails, tokens) keeps exact-match semantics.
const ENUM_FIELDS = new Set([
  "status",
  "direction",
  "role",
  "gender",
  "adminRole",
  "verificationStatus",
  "vehicleType",
  "planType",
  "type",
  "channel",
  "ticketType",
  "provider",
]);

function enumEquals(key: string, a: any, b: any): boolean {
  if (a === b) return true;
  if (!ENUM_FIELDS.has(key)) return false;
  if (typeof a !== "string" || typeof b !== "string") return false;
  return a.toLowerCase() === b.toLowerCase();
}

function enumIncludes(key: string, list: any[], itemVal: any): boolean {
  return list.some(v => enumEquals(key, itemVal, v));
}

// Check conditions for item queries
function matchesCondition(item: any, cond: any): boolean {
  if (!cond) return true;
  for (const [key, val] of Object.entries(cond)) {
    if (key === 'OR') {
      if (!Array.isArray(val)) continue;
      if (!val.some(subCond => matchesCondition(item, subCond))) return false;
    } else if (key === 'AND') {
      if (!Array.isArray(val)) continue;
      if (!val.every(subCond => matchesCondition(item, subCond))) return false;
    } else if (key === 'NOT') {
      if (Array.isArray(val)) {
        if (val.some(subCond => matchesCondition(item, subCond))) return false;
      } else {
        if (matchesCondition(item, val)) return false;
      }
    } else {
      const itemVal = item[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('in' in val) {
          if (!Array.isArray(val.in)) return false;
          if (!enumIncludes(key, val.in, itemVal)) return false;
        } else if ('notIn' in val) {
          if (!Array.isArray(val.notIn)) return false;
          if (enumIncludes(key, val.notIn, itemVal)) return false;
        } else if ('contains' in val) {
          if (typeof itemVal !== 'string') return false;
          const search = String(val.contains).toLowerCase();
          if (!itemVal.toLowerCase().includes(search)) return false;
        } else if ('gt' in val) {
          if (itemVal == null || itemVal <= val.gt) return false;
        } else if ('lt' in val) {
          if (itemVal == null || itemVal >= val.lt) return false;
        } else if ('gte' in val) {
          if (itemVal == null || itemVal < val.gte) return false;
        } else if ('lte' in val) {
          if (itemVal == null || itemVal > val.lte) return false;
        } else if ('equals' in val) {
          if (!enumEquals(key, itemVal, val.equals)) return false;
        } else if ('not' in val) {
          if (enumEquals(key, itemVal, val.not)) return false;
        } else {
          if (JSON.stringify(itemVal) !== JSON.stringify(val)) return false;
        }
      } else {
        if (!enumEquals(key, itemVal, val)) return false;
      }
    }
  }
  return true;
}

function getModelArray(modelName: string): any[] {
  const d = getFallbackDb();
  if (!d) return [];
  switch (modelName.toLowerCase()) {
    case 'user': return d.users || [];
    case 'vehicle': return d.vehicles || [];
    case 'ride': return d.rides || [];
    case 'riderequest': return d.requests || [];
    case 'subscription': return d.subscriptions || [];
    case 'match': return d.matches || [];
    case 'trip': return d.trips || [];
    case 'hostactivityday': return d.hostActivityDays || [];
    case 'payment': return d.payments || [];
    case 'wallet': {
      const wallets = d.wallets || {};
      return Object.values(wallets).map((w: any) => ({
        userId: w.userId,
        credits: w.credits,
        createdAt: w.createdAt || new Date(),
        updatedAt: w.updatedAt || new Date()
      }));
    }
    case 'wallettransaction': {
      const wallets = d.wallets || {};
      return Object.values(wallets).flatMap((w: any) => (w.history || []).map((h: any) => ({
        id: h.id,
        walletId: w.userId,
        amount: h.amount,
        type: h.type,
        description: h.description,
        timestamp: h.timestamp ? new Date(h.timestamp) : new Date()
      })));
    }
    case 'chatmessage': return d.chatMessages || [];
    case 'supportticket': return d.tickets || [];
    case 'notification': return d.notifications || [];
    case 'auditlog': return d.auditLogs || [];
    case 'appconfig': {
      const configKeys = ["systemSettings", "pricingConfig", "themeConfig", "brandingConfig", "featureFlags", "tripValidationConfig"];
      return configKeys.filter(k => d[k] !== undefined).map(k => ({
        key: k,
        data: d[k]
      }));
    }
    case 'guestcredit': return d.guestCredits || [];
    case 'promocode': return d.promoCodes || [];
    case 'voucher': return d.vouchers || [];
    case 'cmspage': return d.cmsPages || [];
    case 'subscriptionplan': return d.subscriptionPlans || [];
    case 'notificationtemplate': return d.notificationTemplates || [];
    default: return [];
  }
}

function setModelArray(modelName: string, arr: any[]) {
  const d = getFallbackDb();
  if (!d) return;
  switch (modelName.toLowerCase()) {
    case 'user': d.users = arr; break;
    case 'vehicle': d.vehicles = arr; break;
    case 'ride': d.rides = arr; break;
    case 'riderequest': d.requests = arr; break;
    case 'subscription': d.subscriptions = arr; break;
    case 'match': d.matches = arr; break;
    case 'trip': d.trips = arr; break;
    case 'hostactivityday': d.hostActivityDays = arr; break;
    case 'payment': d.payments = arr; break;
    case 'wallet': {
      const wallets = d.wallets || {};
      for (const w of arr) {
        if (!wallets[w.userId]) wallets[w.userId] = { userId: w.userId, credits: w.credits, history: [] };
        else {
          wallets[w.userId].credits = w.credits;
        }
      }
      d.wallets = wallets;
      break;
    }
    case 'wallettransaction': {
      const wallets = d.wallets || {};
      const txByWallet: Record<string, any[]> = {};
      for (const t of arr) {
        if (!txByWallet[t.walletId]) txByWallet[t.walletId] = [];
        txByWallet[t.walletId].push(t);
      }
      for (const [wId, txs] of Object.entries(txByWallet)) {
        if (!wallets[wId]) wallets[wId] = { userId: wId, credits: 0, history: [] };
        wallets[wId].history = txs;
      }
      d.wallets = wallets;
      break;
    }
    case 'chatmessage': d.chatMessages = arr; break;
    case 'supportticket': d.tickets = arr; break;
    case 'notification': d.notifications = arr; break;
    case 'auditlog': d.auditLogs = arr; break;
    case 'appconfig': {
      for (const cfg of arr) {
        d[cfg.key] = cfg.data;
      }
      break;
    }
    case 'guestcredit': d.guestCredits = arr; break;
    case 'promocode': d.promoCodes = arr; break;
    case 'voucher': d.vouchers = arr; break;
    case 'cmspage': d.cmsPages = arr; break;
    case 'subscriptionplan': d.subscriptionPlans = arr; break;
    case 'notificationtemplate': d.notificationTemplates = arr; break;
  }
}

function createModelProxy(modelName: string) {
  return {
    findMany: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args.where) {
        list = list.filter(item => matchesCondition(item, args.where));
      }
      if (args.orderBy) {
        const orderKeys = Object.keys(args.orderBy);
        if (orderKeys.length > 0) {
          const key = orderKeys[0];
          const dir = args.orderBy[key];
          list = [...list].sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            if (valA === valB) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;
            const diff = valA < valB ? -1 : 1;
            return dir === 'desc' ? -diff : diff;
          });
        }
      }
      if (args.skip) {
        list = list.slice(args.skip);
      }
      if (args.take) {
        list = list.slice(0, args.take);
      }
      return list;
    },
    findFirst: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args.where) {
        list = list.filter(item => matchesCondition(item, args.where));
      }
      return list[0] || null;
    },
    findUnique: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args.where) {
        list = list.filter(item => matchesCondition(item, args.where));
      }
      return list[0] || null;
    },
    count: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args.where) {
        list = list.filter(item => matchesCondition(item, args.where));
      }
      return list.length;
    },
    create: async (args: any = {}) => {
      const list = getModelArray(modelName);
      const newItem = {
        id: args.data.id || (args.data.userId ? `id_${args.data.userId}` : `id_${Math.random().toString(36).substring(2, 10)}`),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data
      };
      list.push(newItem);
      setModelArray(modelName, list);
      return newItem;
    },
    createMany: async (args: any = {}) => {
      const list = getModelArray(modelName);
      const datas = Array.isArray(args.data) ? args.data : [args.data];
      const newItems = datas.map((d: any) => ({
        id: d.id || `id_${Math.random().toString(36).substring(2, 10)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...d
      }));
      list.push(...newItems);
      setModelArray(modelName, list);
      return { count: newItems.length };
    },
    update: async (args: any = {}) => {
      const list = getModelArray(modelName);
      const index = list.findIndex(item => matchesCondition(item, args.where));
      if (index === -1) throw new Error(`Record to update not found for ${modelName}`);
      const updated = {
        ...list[index],
        ...args.data,
        updatedAt: new Date()
      };
      list[index] = updated;
      setModelArray(modelName, list);
      return updated;
    },
    updateMany: async (args: any = {}) => {
      const list = getModelArray(modelName);
      let count = 0;
      const newList = list.map(item => {
        if (matchesCondition(item, args.where)) {
          count++;
          return {
            ...item,
            ...args.data,
            updatedAt: new Date()
          };
        }
        return item;
      });
      setModelArray(modelName, newList);
      return { count };
    },
    delete: async (args: any = {}) => {
      const list = getModelArray(modelName);
      const index = list.findIndex(item => matchesCondition(item, args.where));
      if (index === -1) throw new Error(`Record to delete not found for ${modelName}`);
      const deleted = list[index];
      const newList = list.filter((_, i) => i !== index);
      setModelArray(modelName, newList);
      return deleted;
    },
    deleteMany: async (args: any = {}) => {
      const list = getModelArray(modelName);
      let count = 0;
      const newList = list.filter(item => {
        if (matchesCondition(item, args.where)) {
          count++;
          return false;
        }
        return true;
      });
      setModelArray(modelName, newList);
      return { count };
    },
    upsert: async (args: any = {}) => {
      const list = getModelArray(modelName);
      const index = list.findIndex(item => matchesCondition(item, args.where));
      if (index !== -1) {
        const updated = {
          ...list[index],
          ...args.update,
          updatedAt: new Date()
        };
        list[index] = updated;
        setModelArray(modelName, list);
        return updated;
      } else {
        const newItem = {
          id: args.where?.id || `id_${Math.random().toString(36).substring(2, 10)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.create
        };
        list.push(newItem);
        setModelArray(modelName, list);
        return newItem;
      }
    },
    groupBy: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args.by && args.by.includes('status')) {
        const groups: Record<string, number> = {};
        for (const item of list) {
          const key = item.status || 'OPEN';
          groups[key] = (groups[key] || 0) + 1;
        }
        return Object.entries(groups).map(([status, count]) => ({
          status,
          _count: count
        }));
      }
      return [];
    },
    aggregate: async (args: any = {}) => {
      let list = getModelArray(modelName);
      if (args._sum && args._sum.credits) {
        const sum = list.reduce((s, x) => s + (Number(x.credits) || 0), 0);
        return {
          _sum: {
            credits: sum
          }
        };
      }
      return { _sum: {} };
    }
  };
}

let realPrismaClient: any = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL !== "") {
  try {
    const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
    realPrismaClient = globalForPrisma.prisma ?? new PrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = realPrismaClient;
    }
  } catch (e) {
    console.warn("[AI Studio] Failed to initialize PrismaClient, will use fallback mode:", e);
  }
}

const mockPrismaInstance = new Proxy({}, {
  get(target: any, prop: string | symbol) {
    if (typeof prop === 'string') {
      if (prop === '$connect') {
        return async () => {
          if (realPrismaClient && !fallbackModeActive) {
            try {
              await realPrismaClient.$connect();
              return;
            } catch (e) {
              console.warn("[AI Studio] Prisma connection failed, switching to fallback mode:", e);
              fallbackModeActive = true;
            }
          }
          console.log("[mock-prisma] Simulated database connection success (in fallback mode).");
        };
      }
      if (prop === '$disconnect') {
        return async () => {
          if (realPrismaClient && !fallbackModeActive) {
            await realPrismaClient.$disconnect();
          }
        };
      }
      if (prop === '$transaction') {
        return async (cb: (tx: any) => Promise<any>) => {
          return cb(prisma);
        };
      }
      // Return the model proxy
      return createModelProxy(prop);
    }
    return undefined;
  }
});

export const prisma = new Proxy({}, {
  get(target: any, prop: string | symbol) {
    if (realPrismaClient && !fallbackModeActive) {
      const realVal = (realPrismaClient as any)[prop];
      if (typeof realVal === 'function') {
        return function(this: any, ...args: any[]) {
          try {
            const res = realVal.apply(realPrismaClient, args);
            if (res instanceof Promise) {
              return res.catch((e) => {
                console.warn(`[AI Studio] Real Prisma failed on ${String(prop)}, falling back:`, e);
                fallbackModeActive = true;
                const mockModel = (mockPrismaInstance as any)[prop];
                if (typeof mockModel === 'function') {
                  return mockModel.apply(mockPrismaInstance, args);
                }
                // If it's a property (like a model), return proxy methods
                const fn = mockModel ? mockModel[args[0]] : null;
                if (typeof fn === 'function') {
                  return fn.apply(mockModel, args.slice(1));
                }
                return mockPrismaInstance;
              });
            }
            return res;
          } catch (e) {
            console.warn(`[AI Studio] Real Prisma sync failure on ${String(prop)}, falling back:`, e);
            fallbackModeActive = true;
            return (mockPrismaInstance as any)[prop];
          }
        };
      }
      // Return the property/model (proxied so async calls catch errors)
      const model = realVal;
      if (model && typeof model === 'object') {
        return new Proxy(model, {
          get(modelTarget: any, modelProp: string | symbol) {
            const modelVal = modelTarget[modelProp];
            if (typeof modelVal === 'function') {
              return function(this: any, ...args: any[]) {
                return modelVal.apply(modelTarget, args).catch((e: any) => {
                  console.warn(`[AI Studio] Real Prisma model call failed on ${String(prop)}.${String(modelProp)}, falling back:`, e);
                  fallbackModeActive = true;
                  const mockModel = (mockPrismaInstance as any)[prop];
                  return mockModel[modelProp].apply(mockModel, args);
                });
              };
            }
            return modelVal;
          }
        });
      }
      return realVal;
    }
    return (mockPrismaInstance as any)[prop];
  }
}) as unknown as PrismaClient;
export default prisma;
