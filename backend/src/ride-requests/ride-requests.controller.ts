import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RideRequestsService } from './ride-requests.service';

@ApiTags('ride-requests')
@ApiBearerAuth()
@Controller('ride-requests')
export class RideRequestsController {
  constructor(private readonly rideRequestsService: RideRequestsService) {}
}
