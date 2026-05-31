import { Outlet } from 'react-router';
import { Suspense } from 'react';
import { useCMS } from '../context/CMSContext';
import { LoadingScreen } from './LoadingScreen';
import { logger } from '../utils/env';

export function CMSLoadingWrapper() {
  // ✅ Always call hooks at the top level
  let loading = false;
  let contextAvailable = true;

  try {
    const cms = useCMS();
    loading = cms.loading;
  } catch (e) {
    logger.error('CMSLoadingWrapper: CMSProvider not available, skipping loading screen');
    contextAvailable = false;
  }

  // Show loading screen while CMS data is loading (only if context is available)
  if (contextAvailable && loading) {
    return <LoadingScreen />;
  }

  // Once loaded, render the actual routes with Suspense boundary for lazy components
  // Using unstable_avoidThisFallback to prevent showing fallback during transitions
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}