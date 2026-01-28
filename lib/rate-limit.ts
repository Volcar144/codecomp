/**
 * Rate Limiting Utility
 * In-memory rate limiter with sliding window algorithm
 * For production, consider using Redis for distributed rate limiting
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  message?: string;      // Custom error message
  keyGenerator?: (req: NextRequest) => string; // Custom key generator
}

// In-memory store (replace with Redis for production/distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = request.headers.get("x-real-ip");
  if (realIP) return realIP;
  
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP;
  
  return "unknown";
}

/**
 * Default key generator - uses IP + path
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = getClientIP(request);
  const path = new URL(request.url).pathname;
  return `${ip}:${path}`;
}

/**
 * Check rate limit and return result
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  cleanupExpiredEntries();
  
  const keyGen = config.keyGenerator || defaultKeyGenerator;
  const key = keyGen(request);
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if doesn't exist or window expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }
  
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const allowed = entry.count <= config.maxRequests;
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Rate limit middleware function
 * Returns null if allowed, NextResponse if rate limited
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): NextResponse | null {
  const result = checkRateLimit(request, config);
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    return NextResponse.json(
      { 
        error: config.message || "Too many requests. Please try again later.",
        retryAfter,
      },
      { 
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetTime),
        },
      }
    );
  }
  
  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  config: RateLimitConfig
): NextResponse {
  const result = checkRateLimit(request, { ...config, maxRequests: config.maxRequests + 1 }); // +1 since we already counted
  
  response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.resetTime));
  
  return response;
}

// Pre-configured rate limiters for common use cases
export const RATE_LIMITS = {
  // Code execution: 10 requests per minute
  execute: {
    windowMs: 60 * 1000,
    maxRequests: 10,
    message: "Rate limit exceeded for code execution. Please wait before trying again.",
  },
  
  // Authentication: 5 attempts per minute per IP
  auth: {
    windowMs: 60 * 1000,
    maxRequests: 5,
    message: "Too many authentication attempts. Please wait before trying again.",
  },
  
  // API general: 100 requests per minute
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    message: "API rate limit exceeded. Please slow down your requests.",
  },
  
  // Submissions: 20 per minute
  submissions: {
    windowMs: 60 * 1000,
    maxRequests: 20,
    message: "Too many submissions. Please wait before submitting again.",
  },
  
  // Password reset: 3 per hour
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    message: "Too many password reset attempts. Please try again later.",
  },
} as const;

/**
 * Create a custom rate limiter with user-based keys
 */
export function createUserRateLimiter(userId: string, config: RateLimitConfig) {
  return (request: NextRequest) => {
    const customConfig = {
      ...config,
      keyGenerator: () => `user:${userId}:${new URL(request.url).pathname}`,
    };
    return rateLimit(request, customConfig);
  };
}
