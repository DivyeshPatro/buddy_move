import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MapsService } from './maps.service';

@ApiTags('maps')
@ApiBearerAuth()
@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}
}
