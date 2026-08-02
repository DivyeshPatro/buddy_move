import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BrandingService } from './branding.service';

@ApiTags('branding')
@ApiBearerAuth()
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}
}
