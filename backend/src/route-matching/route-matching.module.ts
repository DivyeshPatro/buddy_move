import { Module } from '@nestjs/common';
import { RouteMatchingService } from './route-matching.service';

@Module({ providers: [RouteMatchingService], exports: [RouteMatchingService] })
export class RouteMatchingModule {}
