import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WebsocketService } from './websocket.service';

@ApiTags('websocket')
@ApiBearerAuth()
@Controller('websocket')
export class WebsocketController {
  constructor(private readonly websocketService: WebsocketService) {}
}
