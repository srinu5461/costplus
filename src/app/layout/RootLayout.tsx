import { Outlet, useLocation } from 'react-router';
import { Suspense, useEffect } from 'react';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AIChatbot } from '../components/AIChatbot';
import { LoadingScreen } from '../components/LoadingScreen';
import { TrustBadges } from '../components/TrustBadges';
import { SEOHead } from '../components/SEOHead';

export function RootLayout() {
  const location = useLocation();

  // Force scroll to top on every route change
  useEffect(() => {
    console.log('[RootLayout] Route changed to:', location.pathname, '- Scrolling to top');
    console.log('[RootLayout] Before scroll - window.scrollY:', window.scrollY);

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    setTimeout(() => {
      console.log('[RootLayout] After scroll - window.scrollY:', window.scrollY);
      if (window.scrollY !== 0) {
        console.error('[RootLayout] SCROLL FAILED - still at position:', window.scrollY);
      }
    }, 100);
  }, [location.pathname, location.search]); // Run whenever path or search params change

  return (
    <div className="min-h-screen flex flex-col w-full max-w-[100vw] overflow-x-hidden">
      <SEOHead />
      <Header />
      <TrustBadges />
      <main className="flex-1 w-full">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}