// ============================================================
// Real JWT auth — replaces the old hardcoded "JWT-MOVEBUDDY-SIMULAT" token.
// Access + refresh tokens, signed and verified with secrets from .env.
// ============================================================
import jwt from "jsonwebtoken";
import type { User } from "../src/types";
import { logger } from "./logger";

// Secrets are read lazily (inside the functions below) rather than at module
// load — in ESM, imported modules evaluate before server.ts runs dotenv.config(),
// so reading process.env at the top level would see empty values.
const ACCESS_TTL = () => process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TTL = () => process.env.JWT_REFRESH_EXPIRES_IN || "30d";

const isProd = () => process.env.NODE_ENV === "production";

// Fail CLOSED in production: a missing secret must never fall back to a
// predictable value (that would let anyone forge valid tokens). In non-prod we
// allow a labelled dev secret so local development works without setup.
let warned = false;
function requireSecret(name: "JWT_SECRET" | "JWT_REFRESH_SECRET", devFallback: string): string {
  const s = process.env[name];
  if (s) return s;
  if (isProd()) {
    throw new Error(`[auth] ${name} is not set. Refusing to start in production with an insecure fallback secret.`);
  }
  if (!warned) {
    warned = true;
    logger.warn({ secretName: name }, "[auth] missing secret — using insecure dev secret");
  }
  return devFallback;
}
function accessKey(): string {
  return requireSecret("JWT_SECRET", "insecure-dev-access-secret");
}
function refreshKey(): string {
  return requireSecret("JWT_REFRESH_SECRET", "insecure-dev-refresh-secret");
}

export interface AccessPayload {
  sub: string; // user id
  role: string;
  adminRole?: string;
}

/** Issue a signed access token (short-lived) + refresh token (long-lived). */
const allowedRoles = new Set(['guest', 'host', 'admin']);

export function signTokens(user: User): { token: string; refreshToken: string } {
  // Roles reach us in either case: the app's own domain values are lowercase
  // ('admin'), while anything sourced from a Prisma UserRole enum is UPPER
  // ('ADMIN'). A case-sensitive lookup silently downgraded an admin to 'guest',
  // which made every admin endpoint answer 403 "not an admin account" — with the
  // UI still showing the SUPER_ADMIN badge, because the client reads the user
  // record rather than the token. Normalise before validating.
  const normalized = String(user.role || '').toLowerCase();
  const role = allowedRoles.has(normalized) ? normalized : 'guest';
  if (normalized && role !== normalized) {
    logger.warn({ userId: user.id, claimedRole: user.role }, "[auth] unrecognised role — issuing token as guest");
  }
  const adminRole = (user as any).adminRole;
  const payload: AccessPayload = {
    sub: user.id,
    role,
    adminRole: adminRole ? String(adminRole).toUpperCase() : undefined,
  };
  const token = jwt.sign(payload, accessKey(), { expiresIn: ACCESS_TTL() } as jwt.SignOptions);
  const refreshToken = jwt.sign({ sub: user.id }, refreshKey(), { expiresIn: REFRESH_TTL() } as jwt.SignOptions);
  return { token, refreshToken };
}

/** Verify an access token; returns the decoded payload or null if invalid/expired. */
export function verifyAccessToken(token: string): AccessPayload | null {
  try {
    return jwt.verify(token, accessKey()) as AccessPayload;
  } catch {
    return null;
  }
}

/** Verify a refresh token; returns { sub } or null. */
export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, refreshKey()) as { sub: string };
  } catch {
    return null;
  }
}

/** Extract a Bearer token from an Authorization header. */
export function bearerFrom(req: any): string | null {
  const h = (req.headers?.authorization as string) || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

/**
 * Express middleware that requires a valid access token.
 * On success attaches req.auth = AccessPayload. Not yet applied to every route
 * (frontend must send the Authorization header first) — available for protected routes.
 */
export function requireAuth(req: any, res: any, next: any) {
  const token = bearerFrom(req);
  if (!token) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.auth = payload;
  next();
}
