import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GuestPricingEngine {
  constructor(private prisma: PrismaService) {}

  async calcBasePrice(distanceKm: number): Promise<number> {
    const cfg = await this.getConfig();
    if (distanceKm <= cfg.guestBaseKmLimit) return cfg.guestBasePrice;
    return cfg.guestBasePrice + (distanceKm - cfg.guestBaseKmLimit) * cfg.guestIncrementPerKm;
  }

  async calcPlanPrice(distanceKm: number, planType: '7d' | '15d' | '1m'): Promise<number> {
    const cfg = await this.getConfig();
    const base = await this.calcBasePrice(distanceKm);
    const mul = planType === '7d' ? cfg.guest7dMultiplier
      : planType === '15d' ? cfg.guest15dMultiplier
      : cfg.guestMonthlyMultiplier;
    return parseFloat((base * mul).toFixed(2));
  }

  calcRenewalCredit(planPrice: number, creditPercent: number, creditCap: number): number {
    return parseFloat(Math.min(planPrice * (creditPercent / 100), creditCap).toFixed(2));
  }

  calcLoyaltyCashback(lastMonthPrice: number, percent: number, min: number, max: number): number {
    const raw = lastMonthPrice * (percent / 100);
    return parseFloat(Math.min(Math.max(raw, min), max).toFixed(2));
  }

  private async getConfig() {
    const cfg = await this.prisma.pricingConfig.findFirst({ where: { isActive: true } });
    if (!cfg) throw new Error('No active pricing config found');
    return {
      guestBaseKmLimit:       Number(cfg.guestBaseKmLimit),
      guestBasePrice:         Number(cfg.guestBasePrice),
      guestIncrementPerKm:    Number(cfg.guestIncrementPerKm),
      guest7dMultiplier:      Number(cfg.guest7dMultiplier),
      guest15dMultiplier:     Number(cfg.guest15dMultiplier),
      guestMonthlyMultiplier: Number(cfg.guestMonthlyMultiplier),
    };
  }
}
