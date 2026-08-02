import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommutePatternsService {
  constructor(private readonly prisma: PrismaService) {}
}
