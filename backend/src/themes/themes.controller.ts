import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ThemesService } from './themes.service';

@ApiTags('themes')
@ApiBearerAuth()
@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}
}
