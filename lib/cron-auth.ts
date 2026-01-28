/**
 * Cron Job Authentication Utilities
 * Verifies requests are from cron-job.org by checking IP addresses
 */

import { NextRequest } from "next/server";

const CRON_JOB_ORG_NODES_URL = "https://api.cron-job.org/executor-nodes.json";

// Cache for allowed IPs (refresh every 5 minutes)
let cachedIPs: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the cron secret from environment (read at runtime for testability)
 */
function getCronSecret(): string | undefined {
  return process.env.CRON_SECRET;
}

/**
 * Fetch allowed IP addresses from cron-job.org
 */
async function fetchAllowedIPs(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached IPs if still valid
  if (cachedIPs.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return cachedIPs;
  }

  try {
    const response = await fetch(CRON_JOB_ORG_NODES_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error("Failed to fetch cron-job.org IPs:", response.status);
      // Return cached IPs as fallback if fetch fails
      return cachedIPs;
    }

    const data = await response.json();
    
    if (data.ipAddresses && Array.isArray(data.ipAddresses)) {
      cachedIPs = data.ipAddresses;
      cacheTimestamp = now;
      return cachedIPs;
    }

    console.error("Invalid response format from cron-job.org:", data);
    return cachedIPs;
  } catch (error) {
    console.error("Error fetching cron-job.org IPs:", error);
    // Return cached IPs as fallback
    return cachedIPs;
  }
}

/**
 * Get the client IP address from a NextRequest
 */
function getClientIP(request: NextRequest): string | null {
  // Check various headers that might contain the real IP
  // Order matters: most reliable sources first
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    return ips[0] || null;
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // CF-Connecting-IP for Cloudflare
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIP = request.headers.get("true-client-ip");
  if (trueClientIP) {
    return trueClientIP;
  }

  return null;
}

export interface CronAuthResult {
  authorized: boolean;
  error?: string;
  clientIP?: string;
}

/**
 * Verify that a request is authorized for cron job execution
 * Checks both the secret and the IP address
 */
export async function verifyCronRequest(request: NextRequest): Promise<CronAuthResult> {
  // 1. Check the authorization header for the secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = getCronSecret();
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return {
      authorized: false,
      error: "Invalid or missing cron secret",
    };
  }

  // 2. Get the client IP
  const clientIP = getClientIP(request);
  
  if (!clientIP) {
    console.warn("Could not determine client IP for cron request");
    // In production, you might want to reject requests without a determinable IP
    // For now, we'll allow it if the secret is correct (for local testing)
    if (process.env.NODE_ENV === "development") {
      return { authorized: true, clientIP: "unknown (dev mode)" };
    }
    return {
      authorized: false,
      error: "Could not determine client IP address",
    };
  }

  // 3. Fetch allowed IPs and verify
  const allowedIPs = await fetchAllowedIPs();
  
  // If we couldn't fetch IPs and have no cache, reject in production
  if (allowedIPs.length === 0) {
    console.error("No allowed IPs available for cron verification");
    // Allow in development for testing
    if (process.env.NODE_ENV === "development") {
      return { authorized: true, clientIP };
    }
    return {
      authorized: false,
      error: "Unable to verify cron job IP addresses",
    };
  }

  // 4. Check if the client IP is in the allowed list
  if (!allowedIPs.includes(clientIP)) {
    console.warn(`Cron request from unauthorized IP: ${clientIP}`);
    return {
      authorized: false,
      error: `Unauthorized IP address: ${clientIP}`,
      clientIP,
    };
  }

  return {
    authorized: true,
    clientIP,
  };
}

/**
 * Quick check to see if cron authentication is configured
 */
export function isCronAuthConfigured(): boolean {
  return !!getCronSecret();
}
