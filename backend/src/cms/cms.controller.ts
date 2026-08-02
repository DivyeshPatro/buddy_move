import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CmsService } from './cms.service';

@ApiTags('cms')
@ApiBearerAuth()
@Controller('cms')
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}
}
