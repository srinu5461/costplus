import { QueryClient } from '@tanstack/react-query';

// Create a QueryClient instance with optimized settings for large datasets
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - don't refetch within this window
      gcTime: 10 * 60 * 1000, // 10 minutes cache retention
      retry: 2,
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
    },
  },
});
