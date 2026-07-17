import 'dotenv/config';
import { seedSuperAdmin } from './seeds/super-admin.seed';

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { seedCountries } from './seeds/countries.seed';
import { seedAcademicTitles } from './seeds/academic-titles.seed';
import { seedInstitutions } from './seeds/institutions.seed';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  await seedCountries(prisma);
  await seedAcademicTitles(prisma);
  await seedInstitutions(prisma);
  await seedSuperAdmin(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
