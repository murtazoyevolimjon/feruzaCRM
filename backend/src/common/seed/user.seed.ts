import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../bcrypt/bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface SuperAdminSeed {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  position: string;
}

/** SUPERADMIN yo'q bo'lsa yaratadi. Yaratilgan bo'lsa true. */
export async function seedSuperAdmin(
  prisma: PrismaClient,
  seed: SuperAdminSeed,
): Promise<boolean> {
  const email = seed.email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return false;

  await prisma.user.create({
    data: {
      email,
      fullName: seed.fullName,
      password: await hashPassword(seed.password),
      role: seed.role,
      position: seed.position,
      hire_date: new Date('2026-01-01'),
    },
  });
  return true;
}

export function readSeedConfig(get: (key: string) => string | undefined): SuperAdminSeed {
  const email = get('SUPERADMIN_EMAIL');
  const password = get('SUPERADMIN_PASSWORD');
  if (!email || !password) {
    throw new Error('SUPERADMIN_EMAIL va SUPERADMIN_PASSWORD env da berilishi shart');
  }
  return {
    email,
    password,
    fullName: get('SUPERADMIN_FULLNAME') ?? 'SuperAdmin',
    role: (get('SUPERADMIN_ROLE') as Role | undefined) ?? Role.SUPERADMIN,
    position: get('SUPERADMIN_POSIT') ?? 'ADMIN',
  };
}

@Injectable()
export class UserSeeder implements OnModuleInit {
  private readonly logger = new Logger(UserSeeder.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const created = await seedSuperAdmin(
      this.prisma,
      readSeedConfig((key) => this.config.get<string>(key)),
    );
    if (created) this.logger.log('SUPERADMIN yaratildi');
  }
}
