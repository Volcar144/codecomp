/**
 * Redis client configuration for CodeComp
 * Used for:
 * - Rate limiting Piston API requests (5 req/sec limit)
 * - Queuing execution requests when rate limit is exceeded
 * - Caching leaderboards and other frequently accessed data
 */

import Redis from "ioredis";

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis client with retry strategy
let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    redis.on("connect", () => {
      console.log("Redis connected successfully");
    });
  }

  return redis;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Key prefixes for different use cases
export const REDIS_KEYS = {
  // Rate limiting
  PISTON_RATE_LIMIT: "piston:ratelimit",
  PISTON_QUEUE: "piston:queue",
  
  // Execution results cache
  EXECUTION_RESULT: "execution:result:",
  
  // Leaderboard cache
  LEADERBOARD: "leaderboard:",
  
  // Session data
  USER_SESSION: "session:",
} as const;
