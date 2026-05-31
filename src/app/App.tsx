import { RouterProvider } from 'react-router';
import { router } from './routes';
import { useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import '../styles/index.css';

// Force rebuild - v5.2 - Fixed SEO Tags & Space-Separated Brand Titles
export default function App() {
  useEffect(() => {
    // 💡 FIX 1: Frontload high-value keywords and separate the brand name with spaces
    document.title = 'Catering Equipment & Commercial Kitchen Supplies | Cost Plus 100';

    // Set up default Open Graph and SEO meta tags
    const setMetaTag = (property: string, content: string, isProperty: boolean = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // 💡 FIX 2: Added transparent "Cost Plus 100" pricing descriptions for better organic search clicks
    setMetaTag('description', "Shop 13,000+ commercial catering equipment products at wholesale prices. True transparency with Cost Plus 100 pricing on professional restaurant kitchen gear across Australia.");
    setMetaTag('keywords', 'catering equipment, commercial kitchen equipment, catering supplies Australia, restaurant equipment, commercial catering, kitchen equipment Perth, catering equipment Perth, cost plus catering');
    setMetaTag('robots', 'index, follow');

    // Open Graph meta tags (Fixed brand name separation here too)
    setMetaTag('og:title', 'Catering Equipment & Commercial Kitchen Supplies | Cost Plus 100', true);
    setMetaTag('og:description', "Shop 13,000+ commercial catering equipment products at wholesale prices. True transparency with Cost Plus 100 pricing on professional restaurant kitchen gear.", true);
    setMetaTag('og:image', 'https://costplus100.com.au/og-image.png', true);
    setMetaTag('og:image:width', '1200', true);
    setMetaTag('og:image:height', '630', true);
    setMetaTag('og:url', 'https://costplus100.com.au/', true);
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:site_name', 'Cost Plus 100', true);

    // Twitter Card meta tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', 'Catering Equipment & Commercial Kitchen Supplies | Cost Plus 100');
    setMetaTag('twitter:description', "Shop 13,000+ commercial catering equipment products at wholesale prices. True transparency with Cost Plus 100 pricing.");
    setMetaTag('twitter:image', 'https://costplus100.com.au/og-image.png');

    // Add canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://costplus100.com.au/';

    // ✅ PRELOAD CRITICAL IMAGES: Add preload tags for instant homepage hero loading
    const preloadImages = [
      { href: '/og-image.png', as: 'image', fetchpriority: 'high' },
      { href: '/hero-banner.png', as: 'image', fetchpriority: 'high' }
    ];

    preloadImages.forEach(({ href, as, fetchpriority }) => {
      const existingPreload = document.querySelector(`link[rel="preload"][href="${href}"]`);
      if (!existingPreload) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = as;
        link.href = href;
        if (fetchpriority) {
          link.setAttribute('fetchpriority', fetchpriority);
        }
        document.head.appendChild(link);
      }
    });

    // Create or update favicon
    const updateFavicon = (href: string, type: string = 'image/x-icon') => {
      const existingLinks = document.querySelectorAll('link[rel*="icon"]');
      existingLinks.forEach(link => link.remove());

      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = type;
      link.href = href;
      document.head.appendChild(link);

      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = href;
      document.head.appendChild(appleLink);
    };

    updateFavicon('/favicon.svg', 'image/svg+xml');
  }, []); 

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}