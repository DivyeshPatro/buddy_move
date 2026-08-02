import { Module } from '@nestjs/common';
import { CommutePatternsService } from './commute-patterns.service';

@Module({ providers: [CommutePatternsService], exports: [CommutePatternsService] })
export class CommutePatternsModule {}
