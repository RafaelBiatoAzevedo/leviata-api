import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AcademicTitlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.academicTitle.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }
}
