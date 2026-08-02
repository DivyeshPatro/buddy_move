import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CacheService } from './cache.service';

@ApiTags('cache')
@ApiBearerAuth()
@Controller('cache')
export class CacheController {
  constructor(private readonly cacheService: CacheService) {}
}
