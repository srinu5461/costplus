/**
 * Rate Limiting Middleware for Production
 * 
 * Simple in-memory rate limiter to prevent API abuse
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

export function createRateLimiter(config: RateLimitConfig) {
  return async (c: any, next: () => Promise<void>) => {
    // Get identifier (IP address or authenticated user ID)
    const identifier = c.req.header('x-forwarded-for') || 
                      c.req.header('x-real-ip') || 
                      'anonymous';
    
    const now = Date.now();
    const key = `${identifier}:${c.req.path}`;
    
    let entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(key, entry);
    }
    
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return c.json(
        { 
          error: config.message || 'Too many requests, please try again later.',
          retryAfter,
        },
        429,
        {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        }
      );
    }
    
    // Add rate limit headers
    const remaining = config.maxRequests - entry.count;
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', entry.resetTime.toString());
    
    await next();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  }),
  
  // Standard rate limit for API endpoints
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many requests. Please slow down.',
  }),
  
  // Lenient rate limit for public endpoints
  public: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120,
  }),
  
  // Strict rate limit for expensive operations
  expensive: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'This operation is resource intensive. Please try again in a minute.',
  }),
};
