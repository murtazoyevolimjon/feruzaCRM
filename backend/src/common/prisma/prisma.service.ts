import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const url = config.getOrThrow<string>('DATABASE_URL');
    const isLocal = /@(localhost|127\.0\.0\.1|postgres)(:|\/)/.test(url);
    const pool = new Pool({
      connectionString: url,
      // Supabase kabi tashqi bazalar SSL talab qiladi
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
