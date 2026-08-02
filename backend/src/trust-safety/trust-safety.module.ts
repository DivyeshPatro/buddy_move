import { Module } from '@nestjs/common';
import { TrustSafetyService } from './trust-safety.service';

@Module({ providers: [TrustSafetyService], exports: [TrustSafetyService] })
export class TrustSafetyModule {}
