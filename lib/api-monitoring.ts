/**
 * API Monitoring Utilities
 * Captures request metrics and sends to PostHog
 */

import { NextRequest, NextResponse } from "next/server";
import { getPostHogClient } from "./posthog-server";
import { auth } from "./auth";
import { headers } from "next/headers";

interface APIMetrics {
  endpoint: string;
  method: string;
  status_code: number;
  response_time: number;
  user_id?: string;
  error?: string;
  request_size?: number;
  response_size?: number;
}

/**
 * Wraps an API handler to capture metrics
 */
export function withAPIMonitoring<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options?: {
    captureBody?: boolean;
    captureUserId?: boolean;
  }
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const startTime = performance.now();
    const endpoint = new URL(request.url).pathname;
    const method = request.method;
    
    let userId: string | undefined;
    let response: NextResponse;
    let errorMessage: string | undefined;

    try {
      // Optionally get user ID
      if (options?.captureUserId !== false) {
        try {
          const session = await auth.api.getSession({
            headers: await headers(),
          });
          userId = session?.user?.id;
        } catch {
          // Ignore auth errors for monitoring
        }
      }

      // Execute the actual handler
      response = await handler(request, ...args);
    } catch (error) {
      // Handle errors
      errorMessage = error instanceof Error ? error.message : "Unknown error";
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Capture metrics
    captureAPIMetrics({
      endpoint,
      method,
      status_code: response.status,
      response_time: responseTime,
      user_id: userId,
      error: errorMessage,
    });

    return response;
  };
}

/**
 * Capture API metrics to PostHog
 */
export function captureAPIMetrics(metrics: APIMetrics) {
  try {
    const posthog = getPostHogClient();
    
    posthog.capture({
      distinctId: metrics.user_id || "anonymous",
      event: "api_request_completed",
      properties: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        status_code: metrics.status_code,
        response_time: metrics.response_time,
        has_error: !!metrics.error,
        error_message: metrics.error,
        // Categorize response time
        response_time_bucket: getResponseTimeBucket(metrics.response_time),
        // Categorize status
        status_category: getStatusCategory(metrics.status_code),
      },
    });
  } catch (error) {
    // Don't let monitoring errors affect API responses
    console.error("Failed to capture API metrics:", error);
  }
}

/**
 * Standalone function to capture metrics without wrapping
 * Use this in existing handlers with full request/response objects
 */
export async function trackAPIRequestFull(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  userId?: string
) {
  const endpoint = new URL(request.url).pathname;
  const responseTime = Math.round(performance.now() - startTime);

  captureAPIMetrics({
    endpoint,
    method: request.method,
    status_code: response.status,
    response_time: responseTime,
    user_id: userId,
  });
}

/**
 * Simple tracking function for manual use
 * @param endpoint - API endpoint path (e.g., "/api/skill")
 * @param method - HTTP method (e.g., "GET", "POST")
 * @param statusCode - HTTP status code
 * @param responseTime - Response time in ms
 * @param userId - Optional user ID
 */
export function trackAPIRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  userId?: string
) {
  captureAPIMetrics({
    endpoint,
    method,
    status_code: statusCode,
    response_time: responseTime,
    user_id: userId,
  });
}

function getResponseTimeBucket(ms: number): string {
  if (ms < 100) return "fast (<100ms)";
  if (ms < 500) return "normal (100-500ms)";
  if (ms < 1000) return "slow (500ms-1s)";
  if (ms < 5000) return "very_slow (1-5s)";
  return "timeout (>5s)";
}

function getStatusCategory(status: number): string {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "redirect";
  if (status >= 400 && status < 500) return "client_error";
  if (status >= 500) return "server_error";
  return "unknown";
}

/**
 * Create a timer for manual tracking
 */
export function createAPITimer() {
  const startTime = performance.now();
  return {
    startTime,
    elapsed: () => Math.round(performance.now() - startTime),
  };
}
