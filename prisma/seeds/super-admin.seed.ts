import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedSuperAdmin(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash('123456', 10);

  const user = await prisma.user.upsert({
    where: {
      email: 'larissabiato@leviata.com',
    },
    update: {},
    create: {
      email: 'larissabiato@leviata.com',
      password: passwordHash,
      firstName: 'Larissa',
      lastName: 'Biato',
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('SUPER ADMIN criado:', user.email);
}
