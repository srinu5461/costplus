/**
 * STATIC HEADER CONFIGURATION
 *
 * This file controls the header/menubar settings.
 * Edit this file to change header content - changes are instant (no database needed).
 */

export const headerConfig = {
  logo: 'Costplus100',
  logoUrl: '', // URL to logo image (leave empty to use SVG logo)
  phone: '1300 667 676', // Displays in header and trust badge
  workingHours: 'Mon-Fri: 9:00 AM - 5:00 PM AEST',
  navigation: [
    { label: 'Home', path: '/', enabled: true, order: 0 },
    { label: 'All Products', path: '/products', enabled: true, order: 1 },
    { label: 'Brands', path: '/brands', enabled: true, order: 2 },
    { label: 'About', path: '/about', enabled: true, order: 3 },
    { label: 'Contact', path: '/contact', enabled: true, order: 4 },
  ],
};
