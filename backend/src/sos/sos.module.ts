import { Module } from '@nestjs/common';
import { SosService } from './sos.service';

@Module({ providers: [SosService], exports: [SosService] })
export class SosModule {}
