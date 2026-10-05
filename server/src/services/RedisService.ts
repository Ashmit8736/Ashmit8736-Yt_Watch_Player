import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

export class RedisService {
  private static pubClient: Redis | null = null;
  private static subClient: Redis | null = null;
  private static isConnected: boolean = false;

  public static async initialize(io: Server): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      console.log('ℹ️  No REDIS_URL/REDIS_HOST provided. Running with default in-memory Socket.io adapter.');
      return false;
    }

    try {
      const options = redisUrl ? redisUrl : { host: redisHost, port: Number(process.env.REDIS_PORT) || 6379 };
      this.pubClient = new Redis(options as any, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      io.adapter(createAdapter(this.pubClient, this.subClient));
      this.isConnected = true;
      console.log('✅ Connected to Redis Pub/Sub! Scalable multi-instance WebSocket clustering is active.');
      return true;
    } catch (err: any) {
      console.warn('⚠️ Could not connect to Redis server (' + err.message + '). Falling back to in-memory adapter.');
      this.isConnected = false;
      return false;
    }
  }

  public static getStatus(): { isRedisActive: boolean } {
    return { isRedisActive: this.isConnected };
  }
}
