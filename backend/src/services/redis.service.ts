import Redis from 'ioredis';
import { logger } from '../utils/logger';

export class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;

    // Skip Redis connection if no URL provided
    if (!redisUrl) {
      logger.warn('No REDIS_URL provided, running without Redis cache');
      return;
    }

    try {
      // Upstash and other cloud Redis use TLS (rediss://)
      const redisOptions: any = {
        retryStrategy: (times: number) => {
          if (times > 3) {
            logger.error('Redis connection failed after 3 retries');
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      };

      // Handle TLS for Upstash (rediss:// URLs)
      if (redisUrl.startsWith('rediss://')) {
        redisOptions.tls = { rejectUnauthorized: false };
      }

      // Main client for general operations
      this.client = new Redis(redisUrl, redisOptions);

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Redis client connected');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        logger.error('Redis client error:', err.message);
      });

      // Try to connect
      await this.client.connect();
      await this.client.ping();
      this.isConnected = true;
      logger.info('Redis connection verified');
    } catch (error: any) {
      logger.warn('Redis connection failed, running without cache:', error.message);
      this.client = null;
      this.isConnected = false;
      // Don't throw - allow app to run without Redis
    }
  }

  public getClient(): Redis | null {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  // Cache operations
  public async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Silently fail cache operations
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client) return;
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.client) return false;
    const result = await this.client.exists(key);
    return result === 1;
  }

  // JSON operations
  public async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  public async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // Pub/Sub operations
  public async publish(channel: string, message: unknown): Promise<void> {
    if (!this.publisher) return;
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
    await this.publisher.publish(channel, messageStr);
    logger.debug(`Published to ${channel}:`, message);
  }

  public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.subscriber) return;
    
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(msg);
      }
    });
    logger.info(`Subscribed to channel: ${channel}`);
  }

  public async unsubscribe(channel: string): Promise<void> {
    if (!this.subscriber) return;
    await this.subscriber.unsubscribe(channel);
    logger.info(`Unsubscribed from channel: ${channel}`);
  }

  // List operations (for queues)
  public async lpush(key: string, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.lpush(key, value);
  }

  public async rpop(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.rpop(key);
  }

  public async lrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) return [];
    return this.client.lrange(key, start, stop);
  }

  // Hash operations
  public async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.hset(key, field, value);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.hget(key, field);
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) return {};
    return this.client.hgetall(key);
  }

  public async hdel(key: string, field: string): Promise<void> {
    if (!this.client) return;
    await this.client.hdel(key, field);
  }

  // Increment/Decrement
  public async incr(key: string): Promise<number> {
    if (!this.client) return 0;
    return this.client.incr(key);
  }

  public async incrby(key: string, amount: number): Promise<number> {
    if (!this.client) return 0;
    return this.client.incrby(key, amount);
  }

  // TTL operations
  public async expire(key: string, seconds: number): Promise<void> {
    if (!this.client) return;
    await this.client.expire(key, seconds);
  }

  public async ttl(key: string): Promise<number> {
    if (!this.client) return -1;
    return this.client.ttl(key);
  }

  // Cleanup
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
    logger.info('Redis connections closed');
  }
}

// Export singleton instance
export const redis = RedisService.getInstance();
