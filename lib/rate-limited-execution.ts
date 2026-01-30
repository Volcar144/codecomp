/**
 * Rate-limited Piston API execution service
 * 
 * Implements a sliding window rate limiter with queue for excess requests.
 * Piston public API limit: 5 requests/second
 * 
 * When rate limit is exceeded, requests are queued in Redis and processed
 * in order as capacity becomes available.
 * 
 * PRIORITY QUEUE:
 * Pro/Family/Team users have access to a priority queue that is processed
 * before the regular queue. This ensures paid users get faster execution times.
 */

import { getRedisClient, isRedisAvailable, REDIS_KEYS } from "./redis";
import { executeCode as directExecuteCode, ExecutionResult } from "./code-execution";

// Rate limit configuration
const RATE_LIMIT = 5; // requests per second
const WINDOW_SIZE_MS = 1000; // 1 second window
const MAX_QUEUE_SIZE = 100; // Maximum queued requests
const MAX_PRIORITY_QUEUE_SIZE = 50; // Maximum priority queued requests
const QUEUE_TIMEOUT_MS = 30000; // 30 seconds max wait time
const PRIORITY_QUEUE_TIMEOUT_MS = 15000; // 15 seconds max wait for priority
const POLL_INTERVAL_MS = 50; // Check queue every 50ms

// Redis keys for priority queue
const PRIORITY_QUEUE_KEY = `${REDIS_KEYS.PISTON_QUEUE}:priority`;

interface QueuedRequest {
  id: string;
  code: string;
  language: string;
  input: string;
  timestamp: number;
  priority?: boolean;
  timeoutSeconds?: number;
}

interface QueuePosition {
  position: number;
  estimatedWaitMs: number;
  isPriority: boolean;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Check if we can make a request under the rate limit
 * Uses Redis sorted set for sliding window tracking
 */
async function canMakeRequest(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const windowStart = now - WINDOW_SIZE_MS;
    
    // Remove old entries outside the window
    await redis.zremrangebyscore(REDIS_KEYS.PISTON_RATE_LIMIT, 0, windowStart);
    
    // Count requests in current window
    const count = await redis.zcard(REDIS_KEYS.PISTON_RATE_LIMIT);
    
    return count < RATE_LIMIT;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // If Redis fails, allow the request (fail open)
    return true;
  }
}

/**
 * Record a request in the rate limit window
 */
async function recordRequest(): Promise<void> {
  try {
    const redis = getRedisClient();
    const now = Date.now();
    const requestId = generateRequestId();
    
    // Add to sorted set with timestamp as score
    await redis.zadd(REDIS_KEYS.PISTON_RATE_LIMIT, now, requestId);
    
    // Set expiry on the key (cleanup)
    await redis.expire(REDIS_KEYS.PISTON_RATE_LIMIT, 10);
  } catch (error) {
    console.error("Failed to record request:", error);
  }
}

/**
 * Add a request to the queue (regular or priority)
 */
async function addToQueue(request: QueuedRequest, priority: boolean = false): Promise<number> {
  const redis = getRedisClient();
  const queueKey = priority ? PRIORITY_QUEUE_KEY : REDIS_KEYS.PISTON_QUEUE;
  const maxSize = priority ? MAX_PRIORITY_QUEUE_SIZE : MAX_QUEUE_SIZE;
  
  // Check queue size
  const queueSize = await redis.llen(queueKey);
  if (queueSize >= maxSize) {
    throw new Error(priority 
      ? "Priority queue is full. Please try again in a moment."
      : "Execution queue is full. Please try again later."
    );
  }
  
  // Mark the request with priority flag
  request.priority = priority;
  
  // Add to queue
  await redis.rpush(queueKey, JSON.stringify(request));
  
  return queueSize + 1;
}

/**
 * Get queue position for a request (checks both priority and regular queues)
 */
async function getQueuePosition(requestId: string): Promise<QueuePosition | null> {
  const redis = getRedisClient();
  
  // Check priority queue first
  const priorityQueue = await redis.lrange(PRIORITY_QUEUE_KEY, 0, -1);
  for (let i = 0; i < priorityQueue.length; i++) {
    const item = JSON.parse(priorityQueue[i]) as QueuedRequest;
    if (item.id === requestId) {
      return {
        position: i + 1,
        estimatedWaitMs: Math.ceil((i + 1) / RATE_LIMIT) * WINDOW_SIZE_MS,
        isPriority: true,
      };
    }
  }
  
  // Check regular queue
  const regularQueue = await redis.lrange(REDIS_KEYS.PISTON_QUEUE, 0, -1);
  for (let i = 0; i < regularQueue.length; i++) {
    const item = JSON.parse(regularQueue[i]) as QueuedRequest;
    if (item.id === requestId) {
      // Position accounts for priority queue items ahead
      const effectivePosition = priorityQueue.length + i + 1;
      return {
        position: effectivePosition,
        estimatedWaitMs: Math.ceil(effectivePosition / RATE_LIMIT) * WINDOW_SIZE_MS,
        isPriority: false,
      };
    }
  }
  
  return null;
}

/**
 * Process the next item in the queue (priority queue first)
 */
async function processQueueItem(): Promise<{ request: QueuedRequest; result: ExecutionResult } | null> {
  const redis = getRedisClient();
  
  // Check if we can make a request
  if (!(await canMakeRequest())) {
    return null;
  }
  
  // Try priority queue first
  let item = await redis.lpop(PRIORITY_QUEUE_KEY);
  let isPriority = true;
  
  // Fall back to regular queue if priority is empty
  if (!item) {
    item = await redis.lpop(REDIS_KEYS.PISTON_QUEUE);
    isPriority = false;
  }
  
  if (!item) {
    return null;
  }
  
  const request = JSON.parse(item) as QueuedRequest;
  const timeoutMs = isPriority ? PRIORITY_QUEUE_TIMEOUT_MS : QUEUE_TIMEOUT_MS;
  
  // Check if request has timed out
  if (Date.now() - request.timestamp > timeoutMs) {
    // Skip timed out requests
    return null;
  }
  
  // Record the request in rate limit window
  await recordRequest();
  
  // Execute with the request's timeout setting
  const timeoutSeconds = request.timeoutSeconds || 10;
  const result = await directExecuteCode(request.code, request.language, request.input, timeoutSeconds);
  
  // Store result in Redis for retrieval
  const resultKey = `${REDIS_KEYS.EXECUTION_RESULT}${request.id}`;
  await redis.setex(resultKey, 300, JSON.stringify(result)); // 5 minute expiry
  
  return { request, result };
}

/**
 * Wait for a queued request to complete
 */
async function waitForResult(requestId: string, timeoutMs: number = QUEUE_TIMEOUT_MS): Promise<ExecutionResult> {
  const redis = getRedisClient();
  const startTime = Date.now();
  const resultKey = `${REDIS_KEYS.EXECUTION_RESULT}${requestId}`;
  
  while (Date.now() - startTime < timeoutMs) {
    // Check if result is available
    const result = await redis.get(resultKey);
    if (result) {
      await redis.del(resultKey); // Clean up
      return JSON.parse(result) as ExecutionResult;
    }
    
    // Check queue position
    const position = await getQueuePosition(requestId);
    if (!position) {
      // Not in queue and no result - something went wrong
      // Check one more time for result
      const finalCheck = await redis.get(resultKey);
      if (finalCheck) {
        await redis.del(resultKey);
        return JSON.parse(finalCheck) as ExecutionResult;
      }
      
      // Request was processed but we missed the result, or it timed out
      throw new Error("Request processing failed. Please try again.");
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  
  throw new Error("Execution timed out in queue. Please try again.");
}

/**
 * Start the queue processor (should run as background task)
 * This continuously processes queued requests
 */
let processorRunning = false;
let processorInterval: NodeJS.Timeout | null = null;

export function startQueueProcessor(): void {
  if (processorRunning) return;
  
  processorRunning = true;
  processorInterval = setInterval(async () => {
    try {
      await processQueueItem();
    } catch (error) {
      console.error("Queue processor error:", error);
    }
  }, POLL_INTERVAL_MS);
  
  console.log("Piston queue processor started");
}

export function stopQueueProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
  processorRunning = false;
  console.log("Piston queue processor stopped");
}

/**
 * Rate-limited code execution
 * 
 * If under rate limit, executes immediately.
 * If over rate limit, queues the request and waits for result.
 * Falls back to direct execution if Redis is unavailable.
 * 
 * @param code - The code to execute
 * @param language - Programming language
 * @param input - Standard input for the program
 * @param timeoutSeconds - Execution timeout (default: 10s free, 30s pro)
 * @param priority - Whether to use priority queue (Pro users)
 */
export async function executeCodeRateLimited(
  code: string,
  language: string,
  input: string = "",
  timeoutSeconds: number = 10,
  priority: boolean = false
): Promise<ExecutionResult> {
  // Check if Redis is available
  const redisAvailable = await isRedisAvailable();
  
  if (!redisAvailable) {
    // Fall back to direct execution without rate limiting
    console.warn("Redis unavailable, executing without rate limiting");
    return directExecuteCode(code, language, input, timeoutSeconds);
  }
  
  // Check rate limit
  if (await canMakeRequest()) {
    // Under limit - execute immediately
    await recordRequest();
    return directExecuteCode(code, language, input, timeoutSeconds);
  }
  
  // Over limit - queue the request
  // Priority users go to the priority queue which is processed first
  const requestId = generateRequestId();
  const request: QueuedRequest = {
    id: requestId,
    code,
    language,
    input,
    timestamp: Date.now(),
    priority,
    timeoutSeconds,
  };
  
  const position = await addToQueue(request, priority);
  console.log(`Request ${requestId} queued at position ${position}${priority ? ' (PRIORITY)' : ''}`);
  
  // Start processor if not running
  startQueueProcessor();
  
  // Wait for result (priority has shorter timeout since queue is smaller)
  const waitTimeout = priority ? PRIORITY_QUEUE_TIMEOUT_MS : QUEUE_TIMEOUT_MS;
  return waitForResult(requestId, waitTimeout);
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(): Promise<{
  requestsInWindow: number;
  limit: number;
  queueSize: number;
  priorityQueueSize: number;
  available: boolean;
}> {
  const redisAvailable = await isRedisAvailable();
  
  if (!redisAvailable) {
    return {
      requestsInWindow: 0,
      limit: RATE_LIMIT,
      queueSize: 0,
      priorityQueueSize: 0,
      available: false,
    };
  }
  
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - WINDOW_SIZE_MS;
  
  // Clean old entries
  await redis.zremrangebyscore(REDIS_KEYS.PISTON_RATE_LIMIT, 0, windowStart);
  
  const requestsInWindow = await redis.zcard(REDIS_KEYS.PISTON_RATE_LIMIT);
  const queueSize = await redis.llen(REDIS_KEYS.PISTON_QUEUE);
  const priorityQueueSize = await redis.llen(PRIORITY_QUEUE_KEY);
  
  return {
    requestsInWindow,
    limit: RATE_LIMIT,
    queueSize,
    priorityQueueSize,
    available: true,
  };
}
