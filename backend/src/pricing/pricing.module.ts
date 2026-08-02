import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { GuestPricingEngine } from './engines/guest-pricing.engine';
import { HostPricingEngine } from './engines/host-pricing.engine';

@Module({
  controllers: [PricingController],
  providers: [PricingService, GuestPricingEngine, HostPricingEngine],
  exports: [PricingService, GuestPricingEngine, HostPricingEngine],
})
export class PricingModule {}
