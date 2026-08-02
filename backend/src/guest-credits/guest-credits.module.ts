import { Module } from '@nestjs/common';
import { GuestCreditsService } from './guest-credits.service';

@Module({ providers: [GuestCreditsService], exports: [GuestCreditsService] })
export class GuestCreditsModule {}
