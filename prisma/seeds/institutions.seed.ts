import { PrismaClient } from '@prisma/client';

import institutions from '../data/institutions.json';

export async function seedInstitutions(prisma: PrismaClient) {
  console.log('🏛️ Seeding institutions...');

  for (const institution of institutions) {
    const country = await prisma.country.findUnique({
      where: {
        code: institution.countryCode,
      },
    });

    if (!country) {
      throw new Error(
        `Country "${institution.countryCode}" not found for institution "${institution.name}".`,
      );
    }

    await prisma.institution.upsert({
      where: {
        name: institution.name,
      },
      update: {},
      create: {
        name: institution.name,
        acronym: institution.acronym,
        countryId: country.id,
      },
    });
  }

  console.log(`✅ ${institutions.length} institutions seeded.`);
}
