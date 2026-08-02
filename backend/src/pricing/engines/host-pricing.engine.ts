import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HostPricingEngine {
  constructor(private prisma: PrismaService) {}

  async calcPlanCost(planType: '7d' | '15d' | '1m'): Promise<number> {
    const cfg = await this.getConfig();
    return planType === '7d' ? cfg.host7dPrice
      : planType === '15d' ? cfg.host15dPrice
      : cfg.hostMonthlyPrice;
  }

  async calcDistanceSlab(distanceKm: number): Promise<number> {
    const cfg = await this.getConfig();
    return distanceKm <= 5 ? cfg.hostUpto5kmSlab : cfg.hostAbove5kmSlab;
  }

  async calcPayout(planType: '7d' | '15d' | '1m', distanceKm: number): Promise<number> {
    const planCost = await this.calcPlanCost(planType);
    const slab = await this.calcDistanceSlab(distanceKm);
    return parseFloat((planCost + slab).toFixed(2));
  }

  private async getConfig() {
    const cfg = await this.prisma.pricingConfig.findFirst({ where: { isActive: true } });
    if (!cfg) throw new Error('No active pricing config found');
    return {
      hostUpto5kmSlab:  Number(cfg.hostUpto5kmSlab),
      hostAbove5kmSlab: Number(cfg.hostAbove5kmSlab),
      host7dPrice:      Number(cfg.host7dPrice),
      host15dPrice:     Number(cfg.host15dPrice),
      hostMonthlyPrice: Number(cfg.hostMonthlyPrice),
    };
  }
}
