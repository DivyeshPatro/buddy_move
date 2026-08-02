import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QueuesService } from './queues.service';

@ApiTags('queues')
@ApiBearerAuth()
@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}
}
