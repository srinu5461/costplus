/**
 * SEO Helper Functions
 * Manages meta tags for Open Graph, Twitter Cards, and general SEO
 */
import { categoryToSlug } from './slugify';

// Default fallback banner image
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1771360963016-1408c2de12c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920';

// Cache for the banner image URL
let cachedBannerImage: string | null = null;

export interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  siteName?: string;
}

/**
 * Fetches the first active banner from the database to use as OG image
 */
export const fetchBannerImage = async (): Promise<string> => {
  // Return cached value if available
  if (cachedBannerImage) {
    return cachedBannerImage;
  }

  try {
    // Try to get banner from localStorage cache first
    const cachedBanner = localStorage.getItem('costplus100_og_banner');
    const cacheTime = localStorage.getItem('costplus100_og_banner_time');
    
    if (cachedBanner && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < 3600000) { // 1 hour cache
        cachedBannerImage = cachedBanner;
        return cachedBanner;
      }
    }

    // Fetch from homepage data (already includes banners)
    const projectId = (window as any).SUPABASE_PROJECT_ID || '';
    if (!projectId) {
      return DEFAULT_BANNER;
    }

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/homepage-data`,
      {
        headers: {
          'Authorization': `Bearer ${(window as any).SUPABASE_ANON_KEY || ''}`
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.banners && data.banners.length > 0) {
        const firstActiveBanner = data.banners.find((b: any) => 
          b.active !== false && 
          b.image && 
          b.image.trim() !== '' &&
          !b.image.includes('placeholder')
        );
        
        if (firstActiveBanner && firstActiveBanner.image) {
          cachedBannerImage = firstActiveBanner.image;
          // Cache in localStorage
          localStorage.setItem('costplus100_og_banner', firstActiveBanner.image);
          localStorage.setItem('costplus100_og_banner_time', Date.now().toString());
          return firstActiveBanner.image;
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch banner for OG image, using default:', error);
  }

  return DEFAULT_BANNER;
};

/**
 * Updates all SEO meta tags in the document head
 */
export const updateSEOTags = async (config: SEOConfig) => {
  const {
    title,
    description,
    image: providedImage,
    url = 'https://costplus100.com.au',
    type = 'website',
    siteName = 'Costplus100 - Professional Catering Equipment'
  } = config;

  // Fetch banner image if not provided
  const image = providedImage || await fetchBannerImage();

  // Update document title
  document.title = title;

  // Helper to update or create meta tag
  const updateMetaTag = (selector: string, content: string) => {
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement('meta');
      const [attr, value] = selector.replace(/\[|\]/g, '').split('=');
      tag.setAttribute(attr, value.replace(/['"]/g, ''));
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Standard meta tags
  updateMetaTag('meta[name="description"]', description);
  updateMetaTag('meta[name="keywords"]', 'catering equipment, commercial kitchen, food service, hospitality supplies, professional kitchen equipment, Polar, Thor, Apuro, Sydney, Melbourne, Brisbane');

  // Open Graph (Facebook, LinkedIn, etc.)
  updateMetaTag('meta[property="og:title"]', title);
  updateMetaTag('meta[property="og:description"]', description);
  updateMetaTag('meta[property="og:image"]', image);
  updateMetaTag('meta[property="og:url"]', url);
  updateMetaTag('meta[property="og:type"]', type);
  updateMetaTag('meta[property="og:site_name"]', siteName);
  updateMetaTag('meta[property="og:locale"]', 'en_AU');

  // Twitter Card
  updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
  updateMetaTag('meta[name="twitter:title"]', title);
  updateMetaTag('meta[name="twitter:description"]', description);
  updateMetaTag('meta[name="twitter:image"]', image);
  updateMetaTag('meta[name="twitter:site"]', '@costplus100');

  // Additional SEO tags
  updateMetaTag('meta[name="robots"]', 'index, follow');
  updateMetaTag('meta[name="author"]', 'Costplus100');
  updateMetaTag('meta[name="viewport"]', 'width=device-width, initial-scale=1.0');

  // Canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.href = url;
};

/**
 * Default homepage SEO configuration
 * Image will be automatically fetched from first active banner
 */
export const homepageSEO: SEOConfig = {
  title: 'Catering Equipment & Commercial Kitchen Supplies | Cost Plus 100',
  description: 'Australia\'s premier supplier of commercial catering equipment. Shop 13,777+ professional products from leading brands like Polar, Thor, and Apuro. Competitive pricing for restaurants, hotels, and professional kitchens.',
  url: 'https://costplus100.com.au',
  type: 'website',
  siteName: 'Costplus Catering Equipment'
  // image will be automatically fetched from banners
};

/**
 * Product page SEO
 */
export const productSEO = (product: any): SEOConfig => ({
  title: `${product.name} | Costplus Catering Equipment`,
  description: product.shortDescription || product.description || `Buy ${product.name} online. ${product.brand ? `${product.brand} brand. ` : ''}Professional catering equipment with competitive pricing. Australia-wide delivery.`,
  image: product.image || product.images?.[0], // Will fallback to banner if not provided
  url: `https://costplus100.com.au/products/${product.id}`,
  type: 'product',
});

/**
 * Category page SEO
 */
export const categorySEO = (categoryName: string): SEOConfig => ({
  title: `${categoryName} | Costplus Catering Equipment`,
  description: `Browse professional ${categoryName.toLowerCase()} equipment for Sydney, Melbourne and Brisbane. Quality products at competitive prices for commercial kitchens across Australia.`,
  url: `https://costplus100.com.au/products/c/${categoryToSlug(categoryName)}`,
});

/**
 * Brand page SEO
 */
export const brandSEO = (brandName: string): SEOConfig => ({
  title: `${brandName} Products | Costplus Catering Equipment`,
  description: `Shop all ${brandName} catering equipment for Sydney, Melbourne and Brisbane. Professional quality products for commercial kitchens. Competitive pricing and fast delivery across Australia.`,
  url: `https://costplus100.com.au/brands/${encodeURIComponent(brandName.toLowerCase())}`,
});