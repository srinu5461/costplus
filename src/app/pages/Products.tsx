import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link, useParams, useNavigate } from 'react-router';
import { ProductCard } from '../components/ProductCard';
import { useCMS, CategoryNode } from '../context/CMSContext';
import { useProducts } from '../../hooks/useProducts';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Search, SlidersHorizontal, ChevronRight, ChevronDown, Home, ChevronLeft, X } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { buildCategoryTree } from '../utils/categoryTree';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Slider } from '../components/ui/slider';
import { Separator } from '../components/ui/separator';
import { logger } from '../utils/logger';
import { slugToCategory, categoryToSlug } from '../utils/slugify';
import { SEOHead, generateBreadcrumbSchema } from '../components/SEOHead';

export function Products() {
  // ✅ Get metadata from CMS (categories, header, footer)
  let data;
  let cmsLoading = true;
  try {
    const cms = useCMS();
    data = cms.data;
    cmsLoading = cms.loading;
  } catch (e) {
    logger.error('Products: CMSProvider not available, using empty data', e);
    cmsLoading = false;
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
  }

  // ⚡ Get products from CDN JSON (instant load with fallback)
  const { data: productsFromCDN, isLoading: productsLoading, isError: productsError } = useProducts();

  // ✅ SMART FALLBACK: Use CDN if available, otherwise use CMS products
  const cmsProducts = data.products || [];
  const products = (productsFromCDN && productsFromCDN.length > 0)
    ? productsFromCDN
    : cmsProducts;

  // Show loading skeleton while we have nothing to show yet
  const hasAnyProducts = products.length > 0;
  const loading = cmsLoading || (productsLoading && !hasAnyProducts);
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  
  // Convert slug to category name if using slug-based URL
  const categoryFromSlug = categorySlug 
    ? slugToCategory(categorySlug, data.categoryTree || []) 
    : null;
  
  const categoryParam = categoryFromSlug || searchParams.get('category') || 'All Equipment';
  const sectionParam = searchParams.get('section'); // Get section filter
  const searchParam = searchParams.get('search') || ''; // Get search from URL
  const multibuyParam = searchParams.get('multibuy') === 'true'; // Multi-buy filter
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam); // Initialize with URL param
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Featured sections state
  const [featuredIds, setFeaturedIds] = useState<string[]>([]);
  const [popularIds, setPopularIds] = useState<string[]>([]);
  const [promotionIds, setPromotionIds] = useState<string[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  
  // Section configuration state
  const [sectionsConfig, setSectionsConfig] = useState<Array<{
    id: string;
    name: string;
    description: string;
    active: boolean;
    displayOrder: number;
  }>>([]);
  
  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [showInStockOnly, setShowInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<string>('featured');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const PRODUCTS_PER_PAGE = 20;
  
  // Mobile filter state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debug logging
  useEffect(() => {
    const dataSource = productsFromCDN && productsFromCDN.length > 0 ? 'CDN JSON' : 'CMS API (fallback)';

    logger.debug('Products Page - Data loaded', {
      totalProducts: products.length,
      loading,
      searchParam,
      categoryParam,
      sectionParam,
      searchQuery,
      selectedCategory,
      dataSource,
      productsLoading,
      productsError,
    });

    // Log fallback info
    if (productsError) {
      console.warn('⚠️  CDN JSON failed, using CMS API fallback:', productsError);
    }
    if (dataSource === 'CDN JSON') {
      console.log(`✅ [Products Page] Using CDN JSON (${products.length} products)`);
    } else {
      console.log(`ℹ️  [Products Page] Using CMS API fallback (${products.length} products)`);
    }
  }, [products, loading, searchParam, categoryParam, sectionParam, searchQuery, selectedCategory, productsFromCDN, productsLoading, productsError]);

  // Fetch featured sections
  useEffect(() => {
    if (sectionParam) {
      fetchFeaturedSections();
    } else {
      setSectionsLoading(false);
    }
  }, [sectionParam]);

  const fetchFeaturedSections = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/featured-sections`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey || ''}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        logger.info('Featured sections loaded on Products page', data);
        setFeaturedIds(data.featured || []);
        setPopularIds(data.popular || []);
        setPromotionIds(data.promotion || []);
        setSectionsConfig(data.config || []);
      }
    } catch (error) {
      logger.error('Failed to fetch featured sections', error);
    } finally {
      setSectionsLoading(false);
    }
  };

  // Helper to get section config by ID
  const getSectionConfig = (sectionId: string) => {
    return sectionsConfig.find(s => s.id === sectionId);
  };

  // Sync selectedCategory with URL parameter (handles nav bar links changing the URL)
  useEffect(() => {
    setSelectedCategory(categoryParam);
    setCurrentPage(1);
    setSelectedBrands(new Set());
    setShowInStockOnly(false);
  }, [categoryParam, multibuyParam]);

  // Sync searchQuery with URL parameter
  useEffect(() => {
    const newSearchQuery = searchParam;
    setSearchQuery(newSearchQuery);

    // 🔍 IMPORTANT: When search query is present, reset category to "All Equipment"
    if (newSearchQuery && newSearchQuery.trim()) {
      setSelectedCategory('All Equipment');
      // Also update URL to remove category parameter
      if (categoryParam !== 'All Equipment') {
        setSearchParams({ search: newSearchQuery });
      }
    }
  }, [searchParam]);

  // Build tree from category tree data - MEMOIZE THIS!
  const categoryTree = useMemo(() => {
    return buildCategoryTree(data.categoryTree);
  }, [data.categoryTree]);
  
  const hasTreeData = categoryTree.length > 0;

  // Auto-expand all L1 categories when the tree first loads
  useEffect(() => {
    if (categoryTree.length > 0 && expandedCategories.size === 0 && selectedCategory === 'All Equipment') {
      setExpandedCategories(new Set(categoryTree.map(n => n.fullPath)));
    }
  }, [categoryTree]);

  // Helper: Build a map from category IDs to full paths
  const categoryIdToPath = useMemo(() => {
    const map = new Map<string, string>();
    
    const buildCategoryMap = (nodes: CategoryNode[]) => {
      nodes.forEach((node) => {
        map.set(node.code, node.fullPath);
        if (node.children) {
          buildCategoryMap(node.children);
        }
      });
    };
    
    buildCategoryMap(categoryTree);
    
    return map;
  }, [categoryTree]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedCategories(newExpanded);
  };

  // Sync selectedCategory with URL parameter
  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  // Auto-expand the tree to show the selected category
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'All Equipment' && categoryTree.length > 0) {
      // Find all parent paths that need to be expanded
      const pathsToExpand = new Set<string>();
      
      // Helper function to find the node and its parents
      const findNodeAndParents = (nodes: CategoryNode[], targetPath: string, parentPath: string = ''): boolean => {
        for (const node of nodes) {
          const currentPath = node.fullPath;
          
          if (currentPath === targetPath) {
            // Found the target! Expand all parents
            if (parentPath) {
              pathsToExpand.add(parentPath);
            }
            return true;
          }
          
          if (node.children && node.children.length > 0) {
            // Check children recursively
            if (findNodeAndParents(node.children, targetPath, currentPath)) {
              // One of the children matched, so we need to expand this node
              pathsToExpand.add(currentPath);
              return true;
            }
          }
        }
        return false;
      };
      
      // Find and expand all parent paths
      findNodeAndParents(categoryTree, selectedCategory);
      
      // Update expanded categories
      if (pathsToExpand.size > 0) {
        setExpandedCategories(pathsToExpand);
      }
    }
  }, [selectedCategory, categoryTree]);

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Removed verbose console logs to reduce noise

    // Filter by section (featured/popular/promotion)
    if (sectionParam && !sectionsLoading) {
      let sectionIds: string[] = [];
      if (sectionParam === 'featured') sectionIds = featuredIds;
      else if (sectionParam === 'popular') sectionIds = popularIds;
      else if (sectionParam === 'promotion') sectionIds = promotionIds;

      if (sectionIds.length > 0) {
        filtered = filtered.filter((p) => sectionIds.includes(p.id));
        console.log(`✅ Section filtered to ${filtered.length} products for section: ${sectionParam}`);
      }
      // If no IDs configured, show all products (don't blank the page)
    }
    
    // Filter by category (support hierarchical filtering)
    if (selectedCategory !== 'All Equipment') {
      console.log('🏷️ Filtering by category:', selectedCategory);
      filtered = filtered.filter((p) => {
        // Products have categoryLevel1Id, categoryLevel2Id, categoryLevel3Id, categoryLevel4Id
        // We need to map these IDs to full paths and check if they match the selected category
        const productCategoryIds = [
          (p as any).categoryLevel1Id,
          (p as any).categoryLevel2Id,
          (p as any).categoryLevel3Id,
          (p as any).categoryLevel4Id,
        ].filter(Boolean); // Remove undefined/null values
        
        // Try to find the full path for the deepest category level
        for (let i = productCategoryIds.length - 1; i >= 0; i--) {
          const categoryId = productCategoryIds[i];
          const productFullPath = categoryIdToPath.get(categoryId);
          
          if (productFullPath) {
            // Exact match
            if (productFullPath === selectedCategory) return true;
            
            // If selecting a parent category, include all subcategories
            if (productFullPath.startsWith(selectedCategory + ' > ')) return true;
          }
        }
        
        return false;
      });
      
      console.log(`🏷️ Category filtered to ${filtered.length} products for category: ${selectedCategory}`);
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered.filter((p) => {
        const code = (p.code || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        
        return code.includes(query) || 
               name.includes(query) || 
               brand.includes(query) || 
               description.includes(query);
      });
      
      console.log(`🔍 Search results: ${filtered.length} products found for "${searchQuery}"`);
    }

    // Filter by price range
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      filtered = filtered.filter((p) => {
        const price = typeof p.price === 'string' 
          ? parseFloat(p.price.replace(/[^0-9.-]+/g, ''))
          : p.price;
        return price >= priceRange[0] && price <= priceRange[1];
      });
      
      console.log(`Price range filtered to ${filtered.length} products for range: ${priceRange}`);
    }

    // Filter by brands
    if (selectedBrands.size > 0) {
      filtered = filtered.filter((p) => selectedBrands.has(p.brand));
      
      console.log(`Brand filtered to ${filtered.length} products for brands: ${Array.from(selectedBrands)}`);
    }

    // Filter by stock availability
    if (showInStockOnly) {
      filtered = filtered.filter((p) => p.inStock);

      console.log(`In stock filtered to ${filtered.length} products`);
    }

    // Filter to multi-buy products only
    if (multibuyParam) {
      filtered = filtered.filter((p) =>
        p.hasMultiBuy === true ||
        (p.multiBuyOptions && p.multiBuyOptions.length > 0)
      );
      console.log(`Multi-buy filtered to ${filtered.length} products`);
    }

    // Sort products
    switch (sortBy) {
      case 'priceLow':
        filtered = [...filtered].sort((a, b) => {
          const priceA = typeof a.price === 'string'
            ? parseFloat(a.price.replace(/[^0-9.-]+/g, ''))
            : (typeof a.price === 'number' ? a.price : 0);
          const priceB = typeof b.price === 'string'
            ? parseFloat(b.price.replace(/[^0-9.-]+/g, ''))
            : (typeof b.price === 'number' ? b.price : 0);
          return priceA - priceB;
        });
        break;
      case 'priceHigh':
        filtered = [...filtered].sort((a, b) => {
          const priceA = typeof a.price === 'string'
            ? parseFloat(a.price.replace(/[^0-9.-]+/g, ''))
            : (typeof a.price === 'number' ? a.price : 0);
          const priceB = typeof b.price === 'string'
            ? parseFloat(b.price.replace(/[^0-9.-]+/g, ''))
            : (typeof b.price === 'number' ? b.price : 0);
          return priceB - priceA;
        });
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'featured':
      default:
        // 'featured' - keep original order, no sorting needed
        break;
    }

    // ⭐ PRIORITY PRODUCTS: Polar refrigeration (no spares), Thor cooking equipment (no small items), Apuro
    const priorityProducts: typeof filtered = [];
    const regularProducts: typeof filtered = [];

    filtered.forEach((product) => {
      const brand = (product.brand || '').toLowerCase().trim();
      const name = (product.name || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      const wholePath = (product.wholePath || '').toLowerCase();

      // Check if it's a spare part/accessory/small item
      const isSmallItem = name.includes('spare') ||
                          name.includes('part') ||
                          name.includes('seal') ||
                          name.includes('gasket') ||
                          name.includes('hinge') ||
                          name.includes('handle') ||
                          name.includes('shelf') ||
                          name.includes('replacement') ||
                          name.includes('knob') ||
                          name.includes('burner') ||
                          name.includes('tray') ||
                          name.includes('rack') ||
                          name.includes('pan') ||
                          name.includes('pot') ||
                          name.includes('utensil') ||
                          category.includes('spare') ||
                          category.includes('part') ||
                          category.includes('accessories') ||
                          category.includes('smallwares') ||
                          wholePath.includes('spare') ||
                          wholePath.includes('part') ||
                          wholePath.includes('accessories') ||
                          wholePath.includes('smallwares');

      // Check if it's refrigeration (for Polar)
      const isRefrigeration = name.includes('fridge') ||
                              name.includes('freezer') ||
                              name.includes('refrigerat') ||
                              name.includes('chiller') ||
                              name.includes('cooler') ||
                              category.includes('refrigerat') ||
                              category.includes('fridge') ||
                              category.includes('freezer') ||
                              wholePath.includes('refrigerat') ||
                              wholePath.includes('fridge') ||
                              wholePath.includes('freezer');

      // Check if it's cooking equipment (for Thor)
      const isCookingEquipment = name.includes('oven') ||
                                 name.includes('range') ||
                                 name.includes('grill') ||
                                 name.includes('fryer') ||
                                 name.includes('griddle') ||
                                 name.includes('cooker') ||
                                 name.includes('hob') ||
                                 name.includes('stove') ||
                                 name.includes('broiler') ||
                                 category.includes('cooking') ||
                                 category.includes('oven') ||
                                 category.includes('range') ||
                                 wholePath.includes('cooking') ||
                                 wholePath.includes('oven') ||
                                 wholePath.includes('range');

      // Priority logic:
      // - Polar: refrigeration equipment (NOT small items)
      // - Thor: cooking equipment (NOT small items)
      // - Apuro: all products
      const isPriorityProduct = (brand === 'polar' && isRefrigeration && !isSmallItem) ||
                                (brand === 'thor' && isCookingEquipment && !isSmallItem) ||
                                brand === 'apuro';

      if (isPriorityProduct) {
        priorityProducts.push(product);
      } else {
        regularProducts.push(product);
      }
    });

    // Sort priority products by price (highest first)
    priorityProducts.sort((a, b) => {
      const priceA = typeof a.price === 'string'
        ? parseFloat(a.price.replace(/[^0-9.-]+/g, ''))
        : (typeof a.price === 'number' ? a.price : 0);
      const priceB = typeof b.price === 'string'
        ? parseFloat(b.price.replace(/[^0-9.-]+/g, ''))
        : (typeof b.price === 'number' ? b.price : 0);
      return priceB - priceA; // Highest price first
    });

    // Combine: priority products (sorted by highest price) first, then regular products
    filtered = [...priorityProducts, ...regularProducts];

    console.log(`⭐ Priority products at top: ${priorityProducts.length} products (Polar refrigeration, Thor cooking equipment, Apuro) sorted by highest price first, then ${regularProducts.length} other products`);

    console.log('🔍 FILTERING END - Final count:', filtered.length);

    return filtered;
  }, [selectedCategory, searchQuery, products, categoryIdToPath, priceRange, selectedBrands, showInStockOnly, sortBy, sectionParam, sectionsLoading, featuredIds, popularIds, promotionIds]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === 'All Equipment') {
      navigate(multibuyParam ? '/products?multibuy=true' : '/products');
    } else {
      const slug = categoryToSlug(category);
      navigate(`/products/c/${slug}`);
    }
  };

  // Get breadcrumb trail from selected category
  const getBreadcrumbs = () => {
    // If viewing a section (featured, popular, promotion)
    if (sectionParam) {
      const sectionConfig = getSectionConfig(sectionParam);
      const sectionName = sectionConfig?.name || sectionParam.charAt(0).toUpperCase() + sectionParam.slice(1);
      return [
        { name: 'Home', path: '/' },
        { name: sectionName, path: sectionParam }
      ];
    }
    
    if (selectedCategory === 'All Equipment') {
      return [{ name: 'Home', path: '/' }, { name: multibuyParam ? 'All Multi-buy Products' : 'All Equipment', path: 'All Equipment' }];
    }
    
    const parts = selectedCategory.split(' > ');
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    let currentPath = '';
    parts.forEach((part, index) => {
      currentPath = index === 0 ? part : `${currentPath} > ${part}`;
      breadcrumbs.push({ name: part, path: currentPath });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Generate category-specific SEO content
  const generateCategorySEO = () => {
    const category = selectedCategory === 'All Equipment' ? 'Commercial Catering Equipment' : selectedCategory;
    const lastCategory = category.split(' > ').pop() || category;

    // Category-specific keywords mapping
    const categoryKeywords: Record<string, string> = {
      'refrigeration': 'commercial refrigerators, fridges, freezers, cold storage, display chillers',
      'cooking': 'commercial ovens, ranges, grills, fryers, cooking equipment',
      'oven': 'commercial ovens, convection ovens, combi ovens, pizza ovens, bakery ovens',
      'dishwash': 'commercial dishwashers, glasswashers, warewashing, kitchen dishwashing',
      'preparation': 'food prep equipment, work tables, cutting boards, prep stations',
      'food service': 'serving equipment, buffet equipment, food display, catering supplies',
      'beverage': 'coffee machines, beverage dispensers, drink equipment, bar equipment',
      'storage': 'shelving, storage containers, racking, kitchen storage',
      'cookware': 'pots, pans, commercial cookware, kitchen utensils'
    };

    // Find matching keywords
    let specificKeywords = '';
    for (const [key, keywords] of Object.entries(categoryKeywords)) {
      if (lastCategory.toLowerCase().includes(key)) {
        specificKeywords = keywords;
        break;
      }
    }

    const baseKeywords = `${lastCategory}, commercial catering equipment, catering equipment sydney, catering equipment melbourne, catering equipment brisbane, restaurant equipment, hospitality equipment, professional kitchen equipment`;
    const fullKeywords = specificKeywords ? `${specificKeywords}, ${baseKeywords}` : baseKeywords;

    return {
      title: selectedCategory === 'All Equipment'
        ? 'Commercial Catering Equipment Australia - Restaurant & Kitchen Supplies'
        : `${lastCategory} - Commercial Catering Equipment Sydney, Melbourne, Brisbane`,
      description: `Professional ${lastCategory.toLowerCase()} for commercial kitchens in Sydney, Melbourne, Brisbane, Perth, and Adelaide. ${specificKeywords ? `Including ${specificKeywords.split(',').slice(0, 3).join(',')}. ` : ''}Quality equipment at competitive prices with Australia-wide delivery. Shop online today.`,
      keywords: fullKeywords
    };
  };

  const seoContent = generateCategorySEO();

  // Get current category node and its children for display
  const getCurrentCategoryNode = () => {
    if (selectedCategory === 'All Equipment') return null;
    
    // Search recursively in category tree using fullPath
    const findNode = (nodes: CategoryNode[], targetPath: string): CategoryNode | null => {
      for (const node of nodes) {
        // Match by fullPath (e.g., "Baking Equipment > Ovens > Deck Ovens")
        if (node.fullPath === targetPath) {
          return node;
        }
        // Recursively search children
        if (node.children && node.children.length > 0) {
          const found = findNode(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findNode(categoryTree, selectedCategory);
  };

  const currentCategoryNode = getCurrentCategoryNode();
  const subcategories = currentCategoryNode?.children || [];
  
  // Show products if:
  // 1. We're viewing "All Equipment", OR
  // 2. We're at a leaf category (no children), OR
  // 3. There's an active search query (always show search results)
  // 4. We're on the multibuy page (always show multibuy products)
  const shouldShowProducts = multibuyParam || selectedCategory === 'All Equipment' || subcategories.length === 0 || searchQuery.trim().length > 0;

  // Get all unique brands from products
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    let productsForBrands = products;

    // When on multibuy page, only show brands from multibuy products
    if (multibuyParam) {
      productsForBrands = productsForBrands.filter(p =>
        p.hasMultiBuy === true || (p.multiBuyOptions && p.multiBuyOptions.length > 0)
      );
    }

    // Filter by category (support hierarchical filtering)
    if (selectedCategory !== 'All Equipment') {
      productsForBrands = productsForBrands.filter((p) => {
        const productCategoryIds = [
          (p as any).categoryLevel1Id,
          (p as any).categoryLevel2Id,
          (p as any).categoryLevel3Id,
          (p as any).categoryLevel4Id,
        ].filter(Boolean);

        for (let i = productCategoryIds.length - 1; i >= 0; i--) {
          const categoryId = productCategoryIds[i];
          const productFullPath = categoryIdToPath.get(categoryId);

          if (productFullPath) {
            if (productFullPath === selectedCategory) return true;
            if (productFullPath.startsWith(selectedCategory + ' > ')) return true;
          }
        }

        return false;
      });
    }

    // Filter by search query
    if (searchQuery) {
      productsForBrands = productsForBrands.filter((p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    productsForBrands.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });

    return Array.from(brands).sort();
  }, [products, selectedCategory, searchQuery, categoryIdToPath, multibuyParam]);

  // When on multibuy page, compute which category fullPaths have multibuy products
  const multibuyActiveCategoryPaths = useMemo(() => {
    if (!multibuyParam) return null;
    const paths = new Set<string>();
    products
      .filter(p => p.hasMultiBuy === true || (p.multiBuyOptions && p.multiBuyOptions.length > 0))
      .forEach(p => {
        const ids = [
          (p as any).categoryLevel1Id,
          (p as any).categoryLevel2Id,
          (p as any).categoryLevel3Id,
          (p as any).categoryLevel4Id,
        ].filter(Boolean);
        ids.forEach(id => {
          const fullPath = categoryIdToPath.get(id);
          if (fullPath) {
            // Add the path and all its ancestor segments
            const parts = fullPath.split(' > ');
            parts.forEach((_, i) => paths.add(parts.slice(0, i + 1).join(' > ')));
          }
        });
      });
    return paths;
  }, [multibuyParam, products, categoryIdToPath]);

  // Category tree filtered to only categories with multibuy products (when on multibuy page)
  const sidebarCategoryTree = useMemo(() => {
    if (!multibuyParam || !multibuyActiveCategoryPaths || multibuyActiveCategoryPaths.size === 0) {
      return categoryTree;
    }
    const filterNodes = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes.reduce<CategoryNode[]>((acc, node) => {
        if (!multibuyActiveCategoryPaths.has(node.fullPath)) return acc;
        const filteredChildren = node.children ? filterNodes(node.children) : [];
        acc.push({ ...node, children: filteredChildren });
        return acc;
      }, []);
    return filterNodes(categoryTree);
  }, [categoryTree, multibuyParam, multibuyActiveCategoryPaths]);

  // Get min and max prices from products
  const priceStats = useMemo(() => {
    if (products.length === 0) {
      return { min: 0, max: 10000 };
    }
    
    const prices = products.map((p) => {
      const price = typeof p.price === 'string' 
        ? parseFloat(p.price.replace(/[^0-9.-]+/g, ''))
        : p.price;
      return price;
    }).filter((p) => !isNaN(p) && p > 0);
    
    if (prices.length === 0) {
      return { min: 0, max: 10000 };
    }
    
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [products]);
  
  // Update price range when products load
  useEffect(() => {
    if (priceStats.min !== undefined && priceStats.max !== undefined) {
      setPriceRange([priceStats.min, priceStats.max]);
    }
  }, [priceStats.min, priceStats.max]);

  const toggleBrand = (brand: string) => {
    const newBrands = new Set(selectedBrands);
    if (newBrands.has(brand)) {
      newBrands.delete(brand);
    } else {
      newBrands.add(brand);
    }
    setSelectedBrands(newBrands);
  };

  const clearAllFilters = () => {
    setPriceRange([priceStats.min, priceStats.max]);
    setSelectedBrands(new Set());
    setShowInStockOnly(false);
    setSortBy('featured');
    setCurrentPage(1); // Reset to first page when clearing filters
  };
  
  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery, selectedBrands, priceRange, showInStockOnly, sortBy]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE, 
    currentPage * PRODUCTS_PER_PAGE
  );
  
  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Recursive component for rendering category tree with all levels
  const CategoryTreeNode = ({ node, level = 0, isMobile = false, onSelect }: { node: CategoryNode; level?: number; isMobile?: boolean; onSelect?: () => void }) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedCategories.has(node.fullPath);
    const isSelected = selectedCategory === node.fullPath;

    const handleClick = () => {
      if (hasChildren) {
        // Expand/collapse inline — don't navigate away
        toggleExpanded(node.fullPath);
      } else {
        // Leaf node — filter products
        handleCategoryChange(node.fullPath);
        if (isMobile && onSelect) onSelect();
      }
    };

    return (
      <div key={node.fullPath}>
        <div className="flex items-center">
          <Button
            variant={isSelected ? 'default' : 'ghost'}
            onClick={handleClick}
            className={`flex-1 justify-start text-sm ${level === 0 ? 'font-semibold' : ''}`}
            size="sm"
            style={{ paddingLeft: `${level * 12 + 12}px` }}
          >
            {hasChildren && (
              <span className="mr-1 opacity-60">
                {isExpanded ? <ChevronDown className="size-3.5 inline" /> : <ChevronRight className="size-3.5 inline" />}
              </span>
            )}
            {node.name}
            {node.productCount > 0 && (
              <span className="ml-auto text-xs opacity-60">({node.productCount})</span>
            )}
          </Button>
          {/* Filter button for parent categories */}
          {hasChildren && (
            <button
              title={`Filter by ${node.name}`}
              onClick={(e) => {
                e.stopPropagation();
                handleCategoryChange(node.fullPath);
                if (isMobile && onSelect) onSelect();
              }}
              className="text-[10px] text-slate-400 hover:text-[#E31837] px-1 shrink-0 leading-none"
            >
              ↗
            </button>
          )}
        </div>

        {/* Recursively render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children.map((child) => (
              <CategoryTreeNode key={child.fullPath} node={child} level={level + 1} isMobile={isMobile} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Show loading skeleton ONLY when actually loading data
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header Section - Skeleton */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
            {/* Breadcrumb skeleton */}
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 w-12 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-4 w-4 bg-slate-200 rounded animate-pulse"></div>
              <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
            </div>

            {/* Title skeleton - centered */}
            <div className="text-center mb-8">
              <div className="h-10 w-64 bg-slate-200 rounded mx-auto mb-3 animate-pulse"></div>
              <div className="h-5 w-96 bg-slate-200 rounded mx-auto mb-2 animate-pulse"></div>
              <div className="h-6 w-24 bg-slate-200 rounded mx-auto animate-pulse"></div>
            </div>

            {/* Search skeleton - centered */}
            <div className="max-w-xl mx-auto">
              <div className="h-12 bg-slate-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar skeleton */}
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="h-5 w-32 bg-slate-200 rounded mb-4 animate-pulse"></div>
                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="h-8 bg-slate-200 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </aside>

            {/* Products grid skeleton */}
            <div className="flex-1">
              {/* Sorting bar skeleton */}
              <div className="flex justify-between items-center mb-6">
                <div className="h-5 w-48 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-10 w-48 bg-slate-200 rounded animate-pulse"></div>
              </div>

              {/* Product cards skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <div className="h-64 bg-slate-200 animate-pulse"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                        <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      {/* SEO Meta Tags and Structured Data for Category Pages */}
      <SEOHead
        title={seoContent.title}
        description={seoContent.description}
        keywords={seoContent.keywords}
        canonical={`https://costplus100.com.au/products${categorySlug ? `/c/${categorySlug}` : selectedCategory !== 'All Equipment' ? `/c/${categoryToSlug(selectedCategory)}` : ''}`}
        schema={generateBreadcrumbSchema(breadcrumbs.map(crumb => ({
          name: crumb.name,
          url: crumb.path === '/' ? '/' : `/products/c/${categoryToSlug(crumb.path)}`
        })))}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pt-3 pb-0 w-full">
        {/* Top bar: category title centered + sort right */}
        <div className="flex items-center justify-between mb-3 border-b pb-3">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-[#2D3748]">
              {multibuyParam ? 'Multi-buy Deals'
                : sectionParam ? ((getSectionConfig(sectionParam)?.name || (sectionParam.charAt(0).toUpperCase() + sectionParam.slice(1))) + ' Products')
                : selectedCategory === 'All Equipment' ? 'All Products'
                : breadcrumbs[breadcrumbs.length - 1].name}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowMobileFilters(!showMobileFilters)}>
              <SlidersHorizontal className="size-4 mr-1" /> Filters
            </Button>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="priceLow">Price: Low to High</SelectItem>
                <SelectItem value="priceHigh">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 pb-4 sm:pb-6 lg:pb-8 w-full">

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full overflow-x-hidden">
          {/* Sidebar Filters - no breadcrumbs, starts at top */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="space-y-4 sticky top-20">
              {/* Filters Heading - matches home sidebar style */}
              <div className="bg-[#2D3748] text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-white" />
                  <span className="text-xs font-bold uppercase tracking-wider">Filters</span>
                </div>
                {(priceRange[0] !== priceStats.min || priceRange[1] !== priceStats.max || selectedBrands.size > 0 || showInStockOnly) && (
                  <button onClick={clearAllFilters} className="text-[10px] text-red-300 hover:text-white hover:underline">Clear all</button>
                )}
              </div>

              {/* Search Box in Sidebar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Categories Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-semibold">Categories</h3>
                  </div>
                  
                  <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                    {/* All Equipment */}
                    <Button
                      variant={selectedCategory === 'All Equipment' ? 'default' : 'ghost'}
                      onClick={() => handleCategoryChange('All Equipment')}
                      className="w-full justify-start font-semibold"
                      size="sm"
                    >
                      All Equipment
                    </Button>

                    {/* Recursive Category Tree - filtered to multibuy categories when on multibuy page */}
                    {hasTreeData && sidebarCategoryTree.map((node) => (
                      <CategoryTreeNode key={node.fullPath} node={node} level={0} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Price Range Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Price Range (Ex GST)</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                        <Input
                          type="number"
                          value={priceRange[0]}
                          onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                          className="h-9"
                          min={priceStats.min}
                          max={priceStats.max}
                        />
                      </div>
                      <span className="text-muted-foreground mt-5">-</span>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                        <Input
                          type="number"
                          value={priceRange[1]}
                          onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                          className="h-9"
                          min={priceStats.min}
                          max={priceStats.max}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ${priceStats.min} - ${priceStats.max}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Brand Filter Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Brand</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableBrands.map((brand) => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedBrands.has(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="rounded"
                        />
                        <span className="text-sm">{brand}</span>
                      </label>
                    ))}
                  </div>
                  <Link to="/brands" className="block mt-4">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Brands
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Availability Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium mb-4">Availability</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showInStockOnly}
                      onChange={(e) => setShowInStockOnly(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">In Stock Only</span>
                  </label>
                </CardContent>
              </Card>

              {/* Clear Filters Button */}
              {(priceRange[0] !== priceStats.min || priceRange[1] !== priceStats.max || selectedBrands.size > 0 || showInStockOnly) && (
                <Button
                  variant="outline"
                  onClick={clearAllFilters}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 w-full min-w-0">

            {/* Breadcrumbs above pagination */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap mb-3">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-1.5">
                  {index > 0 && <ChevronRight className="size-3.5" />}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-slate-800 font-semibold">{crumb.name}</span>
                  ) : crumb.path === '/' ? (
                    <Link to="/" className="hover:text-[#E31837] transition-colors">Home</Link>
                  ) : (
                    <button onClick={() => handleCategoryChange(crumb.path)} className="hover:text-[#E31837] transition-colors">{crumb.name}</button>
                  )}
                </div>
              ))}
            </div>
            {showMobileFilters && (
              <div className="lg:hidden mb-6 space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="size-5" />
                        <h2 className="text-lg font-semibold">Filters & Categories</h2>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowMobileFilters(false)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    
                    {/* Search in Mobile Filter */}
                    <div className="mb-4 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-sm"
                      />
                      {searchQuery && (
                        <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setSearchQuery('')}>
                          <X className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Categories in Mobile Filter */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Categories</h3>
                      <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
                        <Button
                          variant={selectedCategory === 'All Equipment' ? 'default' : 'ghost'}
                          onClick={() => {
                            handleCategoryChange('All Equipment');
                            setShowMobileFilters(false);
                          }}
                          className="w-full justify-start font-semibold"
                          size="sm"
                        >
                          All Equipment
                        </Button>
                        
                        {hasTreeData && sidebarCategoryTree.map((node) => (
                          <CategoryTreeNode key={node.fullPath} node={node} level={0} isMobile={true} onSelect={() => setShowMobileFilters(false)} />
                        ))}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Price Range */}
                    <div className="mb-6">
                      <h3 className="font-semibold mb-3">Price Range</h3>
                      <div className="px-2">
                        <Slider
                          min={priceStats.min}
                          max={priceStats.max}
                          step={10}
                          value={priceRange}
                          onValueChange={setPriceRange}
                          className="mb-4"
                        />
                        <div className="flex justify-between text-sm">
                          <span>${priceRange[0].toFixed(0)}</span>
                          <span>${priceRange[1].toFixed(0)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Brands */}
                    {availableBrands.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold mb-3">Brands</h3>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                          {availableBrands.map((brand) => (
                            <label key={brand} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedBrands.has(brand)}
                                onChange={() => toggleBrand(brand)}
                                className="rounded"
                              />
                              <span className="text-sm">{brand}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* In Stock Filter */}
                    <div className="mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showInStockOnly}
                          onChange={(e) => setShowInStockOnly(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm">In Stock Only</span>
                      </label>
                    </div>

                    {/* Clear Filters */}
                    {(priceRange[0] !== priceStats.min || priceRange[1] !== priceStats.max || selectedBrands.size > 0 || showInStockOnly) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          clearAllFilters();
                          setShowMobileFilters(false);
                        }}
                        className="w-full mb-2"
                      >
                        Clear All Filters
                      </Button>
                    )}
                    <Button
                      className="w-full bg-[#E31837] hover:bg-[#c0142e] text-white"
                      onClick={() => setShowMobileFilters(false)}
                    >
                      View Results
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Subcategories Section - Show when viewing a category with children */}
            {subcategories.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-3">Browse by Subcategory</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {subcategories.map((subcat) => (
                    <Card 
                      key={subcat.path}
                      className="cursor-pointer hover:shadow-lg transition-all hover:border-slate-900 overflow-hidden"
                      onClick={() => handleCategoryChange(subcat.fullPath)}
                    >
                      <CardContent className="p-0">
                        {/* Category Image */}
                        <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-2 sm:p-3">
                          {subcat.imageUrl ? (
                            <img 
                              src={subcat.imageUrl} 
                              alt={subcat.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                // Fallback to placeholder
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-slate-400 text-2xl sm:text-3xl">
                              📦
                            </div>
                          )}
                        </div>
                        {/* Category Info */}
                        <div className="p-2 sm:p-3 text-center bg-white">
                          <div className="text-xs sm:text-sm font-medium mb-1 line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem]">{subcat.name}</div>
                          <button 
                            className="text-xs text-[#E31837] hover:underline font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCategoryChange(subcat.fullPath);
                            }}
                          >
                            View category
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                {filteredProducts.length > 0 && (
                  <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-4 px-2 sm:px-0 text-center">All Products in {breadcrumbs[breadcrumbs.length - 1].name}</h2>
                  </div>
                )}
              </div>
            )}

            {/* Products Grid */}
            {productsLoading && !hasAnyProducts ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-lg overflow-hidden border bg-white">
                    <div className="h-48 bg-slate-200 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-6 w-1/2 bg-slate-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : shouldShowProducts && filteredProducts.length > 0 ? (
              <>
                {/* Pagination Controls - Top */}
                {totalPages > 1 && (
                  <div className="mb-6 flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {/* Show first page */}
                      {currentPage > 3 && (
                        <>
                          <Button
                            variant={1 === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(1)}
                            className="w-10"
                          >
                            1
                          </Button>
                          {currentPage > 4 && <span className="flex items-center px-2">...</span>}
                        </>
                      )}

                      {/* Show pages around current page */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                        .map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ))}

                      {/* Show last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="flex items-center px-2">...</span>}
                          <Button
                            variant={totalPages === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(totalPages)}
                            className="w-10"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}

                {/* Product Grid directly - sorting controls already shown at top */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-3 sm:gap-4">
                  {paginatedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination Controls - Bottom */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4 mr-1" />
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {/* Show first page */}
                      {currentPage > 3 && (
                        <>
                          <Button
                            variant={1 === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(1)}
                            className="w-10"
                          >
                            1
                          </Button>
                          {currentPage > 4 && <span className="flex items-center px-2">...</span>}
                        </>
                      )}

                      {/* Show pages around current page */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page >= currentPage - 2 && page <= currentPage + 2)
                        .map((page) => (
                          <Button
                            key={page}
                            variant={page === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        ))}

                      {/* Show last page */}
                      {currentPage < totalPages - 2 && (
                        <>
                          {currentPage < totalPages - 3 && <span className="flex items-center px-2">...</span>}
                          <Button
                            variant={totalPages === currentPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => goToPage(totalPages)}
                            className="w-10"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground text-lg mb-2">
                    No products found {selectedCategory !== 'All Equipment' ? `in ${breadcrumbs[breadcrumbs.length - 1].name}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subcategories.length > 0 
                      ? 'Browse the subcategories above or try a different search'
                      : 'Try adjusting your search or filter criteria'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Product Count Info - ALWAYS SHOW */}
            <div className="py-6 border-t mt-8">
              <p className="text-sm text-muted-foreground text-center">
                {filteredProducts.length > 0 ? (
                  <>Showing {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1} - {Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products</>
                ) : (
                  <>0 products found</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}