import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly production: boolean;
  /** Faqat development: Redis yo'q bo'lsa xotiradagi zaxira (13.5 faqat productionda talab qilinadi). */
  private memory: Map<string, { value: string; expiresAt: number }> | null = null;

  constructor(config: ConfigService) {
    this.production = config.get<string>('NODE_ENV') === 'production';
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST') ?? 'localhost',
      port: Number(config.get<string>('REDIS_PORT') ?? 6379),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.client.on('error', () => undefined);
  }

  async onModuleInit() {
    try {
      await this.client.connect();
    } catch {
      if (this.production) throw new Error('Redis ga ulanib bo\'lmadi');
      this.logger.warn('Redis topilmadi — development uchun xotiradagi zaxira ishlatilmoqda');
      this.memory = new Map();
    }
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (this.memory) {
      this.memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      return;
    }
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async get(key: string): Promise<string | null> {
    if (this.memory) {
      const entry = this.memory.get(key);
      if (!entry || entry.expiresAt < Date.now()) {
        this.memory.delete(key);
        return null;
      }
      return entry.value;
    }
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    if (this.memory) {
      this.memory.delete(key);
      return;
    }
    await this.client.del(key);
  }

  async onModuleDestroy() {
    this.client.disconnect();
  }
}
