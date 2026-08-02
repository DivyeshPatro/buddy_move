import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaService) {}
}
