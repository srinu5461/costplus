// SEO Head Component - Dynamic meta tags for better Google ranking
import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Default product image - use a professional commercial kitchen equipment image
const defaultProductImage = 'https://images.unsplash.com/photo-1589109807644-924edf14ee09?w=1080&q=80';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: string;
  canonical?: string;
  noindex?: boolean;
  schema?: any;
}

export function SEOHead({
  title = 'Catering Equipment & Commercial Kitchen Supplies | Cost Plus 100',
  description = 'Shop 13,000+ commercial catering equipment products at wholesale prices. True transparency with Cost Plus 100 pricing on professional restaurant kitchen gear across Australia.',
  keywords = 'catering equipment, commercial kitchen equipment, catering supplies Australia, restaurant equipment, commercial catering, kitchen equipment Perth, catering equipment Perth, cost plus catering',
  image = 'https://costplus100.com.au/og-image.png',
  type = 'website',
  canonical,
  noindex = false,
  schema,
}: SEOHeadProps) {
  const location = useLocation();
  const currentUrl = `https://costplus100.com.au${location.pathname}`;
  const canonicalUrl = canonical || currentUrl;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create favicon links - Run immediately, not in a function
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll('link[rel*="icon"], link[rel*="apple-touch-icon"], link[rel="manifest"]');
    existingLinks.forEach(link => link.remove());

    // Generate PNG favicon using Canvas for cross-browser compatibility
    // SVG favicons only work in Chrome - Safari/Firefox/Edge need PNG
    const generatePNGFavicon = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      // Draw dark gray circle background
      ctx.fillStyle = '#2D3748';
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();

      // Draw white "C+" text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 38px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C+', 32, 35);

      return canvas.toDataURL('image/png');
    };

    const pngFaviconUrl = generatePNGFavicon();

    if (pngFaviconUrl) {
      // Add PNG favicon (works in ALL browsers)
      const pngFavicon = document.createElement('link');
      pngFavicon.rel = 'icon';
      pngFavicon.type = 'image/png';
      pngFavicon.href = pngFaviconUrl;
      document.head.appendChild(pngFavicon);

      // Add shortcut icon (for older browsers)
      const shortcutIcon = document.createElement('link');
      shortcutIcon.rel = 'shortcut icon';
      shortcutIcon.href = pngFaviconUrl;
      document.head.appendChild(shortcutIcon);

      // Add Apple touch icon (for iOS/Safari)
      const appleTouchIcon = document.createElement('link');
      appleTouchIcon.rel = 'apple-touch-icon';
      appleTouchIcon.href = pngFaviconUrl;
      document.head.appendChild(appleTouchIcon);

      // Add 32x32 size (recommended)
      const favicon32 = document.createElement('link');
      favicon32.rel = 'icon';
      favicon32.type = 'image/png';
      favicon32.sizes = '32x32';
      favicon32.href = pngFaviconUrl;
      document.head.appendChild(favicon32);

      // Add 16x16 size (recommended)
      const favicon16 = document.createElement('link');
      favicon16.rel = 'icon';
      favicon16.type = 'image/png';
      favicon16.sizes = '16x16';
      favicon16.href = pngFaviconUrl;
      document.head.appendChild(favicon16);

      // Add manifest for PWA
      const manifestContent = {
        name: 'CostPlus Catering Equipment',
        short_name: 'CostPlus',
        description: 'Australia\'s trusted supplier for commercial kitchen equipment',
        start_url: '/',
        display: 'standalone',
        background_color: '#E31837',
        theme_color: '#E31837',
        icons: [
          {
            src: pngFaviconUrl,
            sizes: '64x64',
            type: 'image/png',
          },
        ],
      };

      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = `data:application/json,${encodeURIComponent(JSON.stringify(manifestContent))}`;
      document.head.appendChild(manifestLink);

      console.log('✅ PNG Favicon injected (cross-browser compatible)');
    }

    // Add theme color for mobile browsers
    let themeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!themeColor) {
      themeColor = document.createElement('meta');
      themeColor.name = 'theme-color';
      themeColor.content = '#2D3748';
      document.head.appendChild(themeColor);
    }

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const attr = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Standard meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);

    // Open Graph tags for social media
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:url', currentUrl, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'CostPlus Catering Equipment', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);

    // Robots meta
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Add or update structured data (Schema.org JSON-LD)
    if (schema) {
      let scriptTag = document.querySelector('#structured-data') as HTMLScriptElement;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'structured-data';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    }
  }, [title, description, keywords, image, type, currentUrl, canonicalUrl, noindex, schema]);

  return null;
}

export function generateProductSchema(product: any) {
  const price = product.price || 0;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} - Professional catering equipment`,
    image: product.image || `https://costplus100.com.au${defaultProductImage}`,
    brand: {
      '@type': 'Brand',
      name: product.brand || 'Costplus',
    },
    sku: product.code,
    manufacturer: {
      '@type': 'Organization',
      name: product.brand || product.manufacturer || 'Costplus',
    },
    offers: {
      '@type': 'Offer',
      url: `https://costplus100.com.au/products/${product.id || product.code}`,
      priceCurrency: 'AUD',
      price: price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'CostPlus Catering Equipment',
      },
    },
  };
}

// Generate breadcrumb schema
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://costplus100.com.au${item.url}`,
    })),
  };
}

// Generate organization schema
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Costplus100 Catering Equipment',
    legalName: 'COSTPLUS100 PTY LTD',
    url: 'https://costplus100.com.au',
    logo: 'https://costplus100.com.au/logo.png',
    description: 'Australia\'s leading supplier of professional catering equipment and commercial kitchen solutions',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '6/4 Loftus Street',
      addressLocality: 'Bowral',
      addressRegion: 'NSW',
      postalCode: '2576',
      addressCountry: 'AU',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+61-8-6165-8444',
      email: 'admin@costplus100.com.au',
      contactType: 'customer service',
      areaServed: 'AU',
      availableLanguage: 'English',
    },
    sameAs: [
      'https://www.facebook.com/costplus100',
      'https://www.linkedin.com/company/costplus100',
      'https://www.instagram.com/costplus100',
    ],
  };
}

// Generate LocalBusiness schema with service areas for better location-based SEO
export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Costplus100 Catering Equipment',
    image: 'https://costplus100.com.au/og-image.png',
    '@id': 'https://costplus100.com.au',
    url: 'https://costplus100.com.au',
    telephone: '+61-8-6165-8444',
    email: 'admin@costplus100.com.au',
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '6/4 Loftus Street',
      addressLocality: 'Bowral',
      addressRegion: 'NSW',
      postalCode: '2576',
      addressCountry: 'AU',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -34.4748,
      longitude: 150.4218,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
    areaServed: [
      {
        '@type': 'City',
        name: 'Sydney',
        '@id': 'https://en.wikipedia.org/wiki/Sydney',
      },
      {
        '@type': 'City',
        name: 'Melbourne',
        '@id': 'https://en.wikipedia.org/wiki/Melbourne',
      },
      {
        '@type': 'City',
        name: 'Brisbane',
        '@id': 'https://en.wikipedia.org/wiki/Brisbane',
      },
      {
        '@type': 'City',
        name: 'Perth',
        '@id': 'https://en.wikipedia.org/wiki/Perth',
      },
      {
        '@type': 'City',
        name: 'Adelaide',
        '@id': 'https://en.wikipedia.org/wiki/Adelaide',
      },
      {
        '@type': 'Country',
        name: 'Australia',
        '@id': 'https://en.wikipedia.org/wiki/Australia',
      },
    ],
    description: 'Leading supplier of commercial catering equipment in Sydney, Melbourne, Brisbane, Perth, and Adelaide. We provide professional kitchen equipment, restaurant supplies, and hospitality solutions across Australia.',
  };
}