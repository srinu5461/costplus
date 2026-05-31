/**
 * Production-Ready Logging Utility
 * 
 * Usage:
 * - logger.info('User logged in', { userId: 123 })
 * - logger.warn('API slow response', { duration: 5000 })
 * - logger.error('Payment failed', error)
 * 
 * Features:
 * - Environment-aware (verbose in dev, minimal in prod)
 * - Structured logging with context
 * - Safe error serialization
 * - Production error tracking ready
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    // Detect environment
    this.isDevelopment = import.meta.env?.DEV || false;
    this.isProduction = import.meta.env?.PROD || false;
  }

  /**
   * Debug logs - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    console.log(`🔍 [DEBUG] ${message}`, context || '');
  }

  /**
   * Info logs - development only by default
   * Set showInProduction=true for critical info
   */
  info(message: string, context?: LogContext, showInProduction = false): void {
    if (!this.isDevelopment && !showInProduction) return;
    
    if (this.isDevelopment) {
      console.log(`ℹ️ [INFO] ${message}`, context || '');
    } else if (showInProduction) {
      // In production, send to external logging service (Sentry, LogRocket, etc.)
      console.info(message, context);
    }
  }

  /**
   * Warning logs - always shown
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context || '');
    } else {
      // In production, send to external logging service
      console.warn(message, context);
    }
  }

  /**
   * Error logs - always shown
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorInfo = this.serializeError(error);
    
    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${message}`, {
        ...errorInfo,
        ...context,
      });
    } else {
      // In production, send to external error tracking
      console.error(message, {
        ...errorInfo,
        ...context,
      });
      
      // TODO: Send to Sentry or similar service
      // Sentry.captureException(error, { extra: context });
    }
  }

  /**
   * Performance tracking
   */
  performance(label: string, duration: number, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    console.log(`⚡ [PERF] ${label}: ${duration.toFixed(2)}ms`, context || '');
  }

  /**
   * API request logging
   */
  apiRequest(method: string, url: string, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    console.log(`🌐 [API] ${method} ${url}`, context || '');
  }

  /**
   * API response logging
   */
  apiResponse(method: string, url: string, status: number, duration?: number, context?: LogContext): void {
    if (!this.isDevelopment) return;
    
    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    const durationStr = duration ? ` (${duration.toFixed(0)}ms)` : '';
    console.log(`${emoji} [API] ${method} ${url} - ${status}${durationStr}`, context || '');
  }

  /**
   * Safely serialize errors
   */
  private serializeError(error?: Error | any): any {
    if (!error) return {};
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }
    
    return { error: String(error) };
  }

  /**
   * Group logs (development only)
   */
  group(label: string, callback: () => void): void {
    if (!this.isDevelopment) {
      callback();
      return;
    }
    
    console.group(`📦 ${label}`);
    callback();
    console.groupEnd();
  }

  /**
   * Table display (development only)
   */
  table(data: any[], label?: string): void {
    if (!this.isDevelopment) return;
    
    if (label) {
      console.log(`📊 ${label}`);
    }
    console.table(data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
