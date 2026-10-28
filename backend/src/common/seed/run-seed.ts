import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { readSeedConfig, seedSuperAdmin } from './user.seed';

/** `npm run db:seed` — Nest ishga tushirmasdan SUPERADMIN yaratadi. */
async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const created = await seedSuperAdmin(
      prisma,
      readSeedConfig((key) => process.env[key]),
    );
    console.log(created ? 'SUPERADMIN yaratildi' : 'SUPERADMIN allaqachon mavjud');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
