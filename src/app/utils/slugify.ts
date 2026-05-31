/**
 * Convert a category name to a URL-friendly slug
 * Example: "Commercial Kitchen Machines & Dishwashers" -> "commercial-kitchen-machines-dishwashers"
 */
export function categoryToSlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Convert a slug back to the original category format for database lookup
 * This is used to match against fullPath in the database
 */
export function slugToCategory(slug: string, categories: any[]): string | null {
  // Try to find the category by converting all categories to slugs and matching
  for (const category of categories) {
    if (categoryToSlug(category.fullPath) === slug) {
      return category.fullPath;
    }
    // Recursively check children
    if (category.children && category.children.length > 0) {
      const found = slugToCategory(slug, category.children);
      if (found) return found;
    }
  }
  return null;
}
