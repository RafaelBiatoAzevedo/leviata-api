import { PrismaClient } from '@prisma/client';
import countries from '../data/countries.json';

export async function seedCountries(prisma: PrismaClient) {
  console.log('🌎 Seeding countries...');

  for (const country of countries) {
    await prisma.country.upsert({
      where: {
        code: country.code,
      },
      update: {},
      create: {
        code: country.code,
        name: country.name,
      },
    });
  }

  console.log(`✅ ${countries.length} countries seeded.`);
}
