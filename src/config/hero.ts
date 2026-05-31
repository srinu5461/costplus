/**
 * STATIC HERO BANNER CONFIGURATION
 *
 * This file controls the homepage hero banner.
 * Edit this file to change hero content - changes are instant (no database needed).
 */

export const heroConfig = {
  title: 'Professional Catering Equipment Australia',
  subtitle: 'Australia\'s premier supplier of commercial catering equipment. Shop 13,777+ professional products from leading brands at competitive prices.',
  image: '/hero-banner.png', // ⚡ STATIC IMAGE: Served from /public for instant preloading

  // Call-to-action buttons
  buttons: [
    { label: 'Shop All Products', path: '/products', primary: true },
    { label: 'View Brands', path: '/brands', primary: false },
  ],

  // Features displayed below hero
  features: [
    {
      icon: 'shield',
      title: 'Commercial Grade',
      description: 'All equipment meets NSF and professional kitchen standards',
    },
    {
      icon: 'truck',
      title: 'Fast Delivery',
      description: 'Quick dispatch and reliable shipping across Australia',
    },
    {
      icon: 'headphones',
      title: 'Expert Support',
      description: 'Our specialists help you choose the right equipment',
    },
  ],
};
