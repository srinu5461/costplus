/**
 * Production Environment Configuration
 * 
 * This file centralizes all environment-dependent configuration
 * to make the application production-ready.
 */

export const ENV = {
  // Environment mode
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  
  // API Configuration
  api: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },
  
  // Feature Flags
  features: {
    enableDebugPanel: import.meta.env.DEV,
    enableConsoleLogging: import.meta.env.DEV,
    enableErrorReporting: import.meta.env.PROD,
    enableAnalytics: import.meta.env.PROD,
  },
  
  // Performance
  performance: {
    imageLoadingStrategy: 'lazy' as const,
    enableCodeSplitting: true,
    enableCaching: import.meta.env.PROD,
  },
  
  // SEO
  seo: {
    siteName: 'Costplus100 - Professional Catering Equipment',
    siteUrl: import.meta.env.PROD 
      ? 'https://costplus100.com.au' 
      : 'http://localhost:3000',
    defaultImage: '/og-image.jpg',
    twitterHandle: '@costplus100',
  },
  
  // Brand
  brand: {
    name: 'Costplus100',
    phone: '1300 000 000',
    email: 'sales@costplus100.com.au',
    supportEmail: 'support@costplus100.com.au',
    address: 'Sydney, Australia',
  },
  
  // Payment
  payment: {
    currency: 'AUD',
    taxRate: 0.10, // 10% GST
  },
} as const;

/**
 * Conditional logger that only logs in development
 */
export const logger = {
  log: (...args: any[]) => {
    if (ENV.features.enableConsoleLogging) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
    if (ENV.features.enableErrorReporting) {
      // TODO: Send to error tracking service
      // Example: Sentry.captureException(args[0]);
    }
  },
  warn: (...args: any[]) => {
    if (ENV.features.enableConsoleLogging) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (ENV.features.enableConsoleLogging) {
      console.info(...args);
    }
  },
};

/**
 * API fetch wrapper with retry logic and timeout
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = ENV.api.retryAttempts
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ENV.api.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok && retries > 0 && response.status >= 500) {
      // Retry on server errors
      await new Promise(resolve => setTimeout(resolve, ENV.api.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0 && (error instanceof TypeError || error.name === 'AbortError')) {
      // Retry on network errors or timeouts
      await new Promise(resolve => setTimeout(resolve, ENV.api.retryDelay));
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: ENV.payment.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get responsive image URL with optimization
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  quality = 80
): string {
  if (!url || !url.includes('unsplash.com')) {
    return url;
  }

  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  params.append('q', quality.toString());
  params.append('auto', 'format');
  params.append('fit', 'crop');

  return `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
}
