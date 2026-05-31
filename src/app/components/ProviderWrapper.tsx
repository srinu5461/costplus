import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { CMSProvider } from '../context/CMSContext';
import { AdminProvider } from '../context/AdminContext';
import { CartProvider } from '../context/CartContext';
import { CacheProvider } from '../../utils/cache';
import { queryClient } from '../../utils/queryClient';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Maintenance } from '../pages/Maintenance';
import { logger } from '../utils/env';
import { Toaster } from './ui/sonner';

// v2.0 - Added AdminProvider to fix admin authentication
// v2.1 - Added timeout protection for maintenance check to prevent hang
export function ProviderWrapper() {
  console.log('🚀 ProviderWrapper: COMPONENT CALLED');

  const location = useLocation();
  const [maintenanceMode, setMaintenanceMode] = useState<{ enabled: false; message: string }>({ enabled: false, message: '' });
  const [loading, setLoading] = useState(false); // Changed to false to allow instant load

  // Check if current route is admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  console.log('🚀 ProviderWrapper: Current path is', location.pathname);
  console.log('🚀 ProviderWrapper: Is admin route?', isAdminRoute);

  logger.info('ProviderWrapper: Current path is', location.pathname);
  logger.info('ProviderWrapper: Is admin route?', isAdminRoute);

  useEffect(() => {
    // Check maintenance mode in background without blocking render
    checkMaintenanceMode();
  }, []);

  const checkMaintenanceMode = async () => {
    try {
      logger.info('Checking maintenance mode...');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/maintenance`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        logger.info('Maintenance mode data:', data);
        logger.info('Is enabled?', data.enabled);
        logger.info('Current route:', location.pathname);
        logger.info('Is admin route?', location.pathname.startsWith('/admin'));
        setMaintenanceMode(data);
      } else {
        // If response not OK, default to maintenance off
        setMaintenanceMode({ enabled: false, message: '' });
      }
    } catch (error: any) {
      // Don't log AbortError - it's expected when timeout triggers
      if (error?.name !== 'AbortError') {
        logger.error('Failed to check maintenance mode:', error);
      } else {
        logger.info('Maintenance mode check timed out (defaulting to off)');
      }
      // If check fails, assume maintenance is off
      setMaintenanceMode({ enabled: false, message: '' });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31837] mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  logger.info('ProviderWrapper render - Maintenance enabled:', maintenanceMode?.enabled);
  logger.info('ProviderWrapper render - Is admin route:', isAdminRoute);
  logger.info('ProviderWrapper render - Should show maintenance:', maintenanceMode?.enabled && !isAdminRoute);

  // Always wrap in providers, but show maintenance content if needed
  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider>
        <CMSProvider>
          <AdminProvider>
            <CartProvider>
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    fontFamily: 'inherit',
                  },
                  className: 'toast',
                }}
              />
              {maintenanceMode?.enabled && !isAdminRoute ? (
                <Maintenance message={maintenanceMode.message} />
              ) : (
                <Suspense fallback={
                  <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E31837] mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading...</p>
                    </div>
                  </div>
                }>
                  <Outlet />
                </Suspense>
              )}
            </CartProvider>
          </AdminProvider>
        </CMSProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
}