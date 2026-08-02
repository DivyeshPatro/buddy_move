import { Module } from '@nestjs/common';
import { HostPayoutsService } from './host-payouts.service';

@Module({ providers: [HostPayoutsService], exports: [HostPayoutsService] })
export class HostPayoutsModule {}
