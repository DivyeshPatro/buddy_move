import type { Subscription } from "../src/types";

export interface PricingConfig {
  guestBaseKmLimit: number;
  guestBasePrice: number;
  guestIncrementPerKm: number;
  guest7dWorkingDays: number;
  guest15dWorkingDays: number;
  guestMonthlyWorkingDays: number;
  guest7dMultiplier: number;
  guest15dMultiplier: number;
  guestMonthlyMultiplier: number;
  hostUpto5kmSlab: number;
  hostAbove5kmSlab: number;
  hostRatePerKm: number;
  welcomeCreditFlat: number;
  welcomeCreditPercent: number;
  welcomeCreditCap: number;
  upgradeIncentivePercent: number;
  upgradeIncentiveCap: number;
  loyaltyCreditPercent: number;
  loyaltyCreditMin: number;
  loyaltyCreditMax: number;
}

export type PlanType = '7d' | '15d' | '1m';

export function planTypeOf(planName: string): PlanType {
  const n = String(planName || "");
  if (n.includes("22") || n.includes("30") || /month/i.test(n)) return '1m';
  if (n.includes("11") || n.includes("15")) return '15d';
  return '7d';
}

export function planDaysOf(pt: PlanType): number {
  return pt === '7d' ? 5 : pt === '15d' ? 11 : 22;
}

export function weekUnits(days: number): number {
  return Math.round(Math.max(0, Number(days) || 0) / 5.5);
}

export function workingDaysOf(cfg: PricingConfig, pt: PlanType): number {
  return pt === '7d' ? cfg.guest7dWorkingDays : pt === '15d' ? cfg.guest15dWorkingDays : cfg.guestMonthlyWorkingDays;
}

export function guestMultiplierOf(cfg: PricingConfig, pt: PlanType): number {
  return pt === '7d' ? cfg.guest7dMultiplier : pt === '15d' ? cfg.guest15dMultiplier : cfg.guestMonthlyMultiplier;
}

export function guestBaseRoutePrice(cfg: PricingConfig, distanceKm: number): number {
  const dist = Math.max(0, Number(distanceKm) || 0);
  return dist <= cfg.guestBaseKmLimit
    ? cfg.guestBasePrice
    : cfg.guestBasePrice + (dist - cfg.guestBaseKmLimit) * cfg.guestIncrementPerKm;
}

export function guestPlanPrice(cfg: PricingConfig, planName: string, distanceKm: number): number {
  const pt = planTypeOf(planName);
  return Math.round(guestBaseRoutePrice(cfg, distanceKm) * workingDaysOf(cfg, pt) * guestMultiplierOf(cfg, pt));
}

export function guestWelcomeCredit(cfg: PricingConfig, planPrice: number): number {
  const pct = Math.min(planPrice * (cfg.welcomeCreditPercent / 100), cfg.welcomeCreditCap);
  return Math.round(Math.max(cfg.welcomeCreditFlat, pct));
}

export function hostSlab(cfg: PricingConfig, distanceKm: number): number {
  return (Math.max(0, Number(distanceKm) || 0) <= cfg.guestBaseKmLimit) ? cfg.hostUpto5kmSlab : cfg.hostAbove5kmSlab;
}

export function isFirstGuestSubscription(subscriptions: Subscription[], userId: string): boolean {
  return !subscriptions.some(s => s.userId === userId && s.role === 'guest');
}

export function computePlanAmount(role: 'guest' | 'host', planName: string, distanceKm: number, cfg: PricingConfig, subscriptions: Subscription[], userId?: string): number {
  if (role === 'host') {
    return Math.round(hostSlab(cfg, distanceKm));
  }
  const planPrice = guestPlanPrice(cfg, planName, distanceKm);
  if (userId && isFirstGuestSubscription(subscriptions, userId)) {
    return Math.max(0, planPrice - guestWelcomeCredit(cfg, planPrice));
  }
  return planPrice;
}
