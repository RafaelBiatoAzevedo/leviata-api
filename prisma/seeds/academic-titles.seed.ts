import { PrismaClient } from '@prisma/client';

import academicTitles from '../data/academic-titles.json';

export async function seedAcademicTitles(prisma: PrismaClient) {
  console.log('🎓 Seeding academic titles...');

  for (const title of academicTitles) {
    await prisma.academicTitle.upsert({
      where: {
        abbreviation: title.abbreviation,
      },
      update: {},
      create: {
        name: title.name,
        abbreviation: title.abbreviation,
      },
    });
  }

  console.log(`✅ ${academicTitles.length} academic titles seeded.`);
}
