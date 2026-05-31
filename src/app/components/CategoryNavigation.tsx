import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { Menu, X, ChevronDown, ChevronRight, BookOpen, Users, Sparkles, TrendingUp, Tag, Award, Grid3x3, Home } from 'lucide-react';
import { useCMS, CategoryNode } from '../context/CMSContext';
import { categoryToSlug } from '../utils/slugify';
import { buildCategoryTree } from '../utils/categoryTree';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { staticCategories } from '../../config/categories';

interface MenuBrand {
  id: string;
  name: string;
  slug: string;
  path?: string; // Custom path (optional, defaults to /brands/{slug})
  sortOrder: number;
  enabled: boolean;
}

export function CategoryNavigation() {
  // Safely handle cases where CMSProvider might not be available
  let data, loading;
  try {
    const cms = useCMS();
    data = cms.data;
    loading = cms.loading;
  } catch (e) {
    data = { categoryTree: [] };
    loading = false;
    return null;
  }
  
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [menuBrands, setMenuBrands] = useState<MenuBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [showFullTree, setShowFullTree] = useState(false);
  const [menuSettings, setMenuSettings] = useState({ showPromotions: true, showBrands: true });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ⚡ CACHE: Memoize category tree to prevent rebuilding on every render
  const fullCategoryTree = useMemo(() => {
    return buildCategoryTree(data.categoryTree);
  }, [data.categoryTree]);

  // ⚡ STATIC FALLBACK: Convert static categories to CategoryNode format
  const staticCategoryNodes = useMemo(() => {
    return staticCategories.map(cat => ({
      name: cat.name,
      slug: cat.slug,
      code: cat.slug,
      path: cat.path,
      fullPath: cat.path,
      level: 1,
      parent: '',
      imageUrl: '',
      productCount: 0,
      hasChildren: false,
      children: [],
      enabled: cat.enabled
    }));
  }, []);

  // ⚡ L1-ONLY tree for initial display (instant load)
  const l1CategoryTree = useMemo(() => {
    // If no data loaded yet, use static categories
    if (fullCategoryTree.length === 0) {
      return staticCategoryNodes;
    }
    // Only show top-level categories (no children) initially
    return fullCategoryTree.map(cat => ({
      ...cat,
      children: [] // Hide children initially for instant display
    }));
  }, [fullCategoryTree, staticCategoryNodes]);

  // Use L1-only tree initially, then switch to full tree after delay
  const categoryTree = showFullTree ? fullCategoryTree : l1CategoryTree;
  const topLevelCategories = categoryTree.filter(cat => cat.enabled !== false);

  // ⚡ Progressively show full tree after L1 is rendered
  useEffect(() => {
    if (fullCategoryTree.length > 0 && !showFullTree) {
      // Show L1 immediately, then reveal L2/L3 after 100ms
      const timer = setTimeout(() => {
        setShowFullTree(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fullCategoryTree, showFullTree]);

  // Load menu brands from database
  useEffect(() => {
    const loadMenuBrands = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/menu-brands`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // Filter to only show enabled brands
          const enabledBrands = (data.brands || [])
            .filter((brand: MenuBrand) => brand.enabled)
            .sort((a: MenuBrand, b: MenuBrand) => a.sortOrder - b.sortOrder);
          setMenuBrands(enabledBrands);
        }
      } catch (error) {
        console.error('Error loading menu brands:', error);
      } finally {
        setBrandsLoading(false);
      }
    };

    loadMenuBrands();
  }, []);

  // Load menu settings (non-blocking)
  useEffect(() => {
    let mounted = true;

    const loadMenuSettings = async () => {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/settings/menu`,
          {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (response.ok && mounted) {
          const data = await response.json();
          if (data.success && data.menuSettings) {
            setMenuSettings(data.menuSettings);
          }
        }
      } catch (error) {
        console.error('Error loading menu settings:', error);
        // Silently fail - keep default settings
      }
    };

    // Load settings asynchronously without blocking
    setTimeout(() => {
      if (mounted) loadMenuSettings();
    }, 0);

    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ⚡ ALWAYS SHOW MENU: Never show loading skeleton, always show static content
  // Static categories will display while data loads

  return (
    <nav className="bg-[#424B54] text-white shadow-md relative z-40 border-b-2 border-slate-600">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-[52px] flex items-center gap-0">
          <div className="relative" ref={dropdownRef}>
            {/* Main Trigger Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2.5 px-5 py-2 h-[52px] bg-[#2D3748] hover:bg-[#1a202c] transition-colors border-r-2 border-slate-600"
            >
              {isOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
              <span className="font-medium text-sm tracking-wide">All Categories</span>
            </button>

            {/* Dropdown - L1 categories on left, L2 on hover */}
            {isOpen && (
              <div className="absolute left-0 top-full mt-2 bg-white text-slate-900 shadow-2xl rounded-lg border border-slate-200 w-[800px] max-h-[70vh] flex overflow-hidden">
                {/* LEFT: L1 Categories List */}
                <div className="w-1/3 border-r border-slate-200 overflow-y-auto bg-slate-50">
                  {topLevelCategories.map((l1Category) => {
                    const hasChildren = l1Category.children && l1Category.children.length > 0;
                    const isHovered = hoveredCategory === l1Category.fullPath;

                    return (
                      <Link
                        key={l1Category.fullPath}
                        to={`/products/c/${categoryToSlug(l1Category.fullPath)}`}
                        className={`block px-4 py-3 border-b border-slate-200 hover:bg-white transition-colors ${
                          isHovered ? 'bg-white border-l-4 border-l-[#E31837]' : ''
                        }`}
                        onMouseEnter={() => setHoveredCategory(l1Category.fullPath)}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isHovered ? 'text-[#E31837]' : 'text-slate-900'}`}>
                            {l1Category.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {l1Category.productCount > 0 && (
                              <span className="text-xs text-slate-500">
                                {l1Category.productCount}
                              </span>
                            )}
                            {hasChildren && (
                              <ChevronRight className={`size-4 ${isHovered ? 'text-[#E31837]' : 'text-slate-400'}`} />
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* RIGHT: L2 Subcategories (shown on hover) */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {hoveredCategory ? (
                    (() => {
                      const selectedCategory = topLevelCategories.find(
                        cat => cat.fullPath === hoveredCategory
                      );

                      if (!selectedCategory) return null;

                      if (!selectedCategory.children || selectedCategory.children.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                            No subcategories
                          </div>
                        );
                      }

                      return (
                        <div>
                          <h3 className="text-base font-bold text-[#2D3748] mb-4 pb-2 border-b border-slate-200">
                            {selectedCategory.name}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedCategory.children.map((l2Category: CategoryNode) => (
                              <Link
                                key={l2Category.path}
                                to={`/products/c/${categoryToSlug(l2Category.fullPath)}`}
                                className="block px-3 py-2 text-sm text-slate-700 hover:text-[#E31837] hover:bg-slate-50 rounded transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{l2Category.name}</span>
                                  {l2Category.productCount > 0 && (
                                    <span className="text-xs text-slate-500">
                                      {l2Category.productCount}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      Hover over a category to see subcategories
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Home Link */}
          <Link
            to="/"
            className="flex items-center gap-2.5 px-5 py-2 h-[52px] hover:bg-[#2D3748] transition-colors border-r-2 border-slate-600"
          >
            <Home className="size-4" />
            <span className="font-medium text-sm tracking-wide">Home</span>
          </Link>

          {/* Catalogue Link - Costplus $100 Catalogue */}
          <Link
            to="/products"
            className="flex items-center gap-1.5 px-4 py-2 h-[52px] hover:bg-[#2D3748] transition-colors border-r-2 border-slate-600"
          >
            <BookOpen className="size-4 shrink-0" />
            <div className="flex flex-col items-center leading-tight">
              <span className="text-sm font-semibold whitespace-nowrap">
                Costplus <span className="text-white font-black text-base">$100</span>
              </span>
              <span className="text-sm font-semibold">Catalogue</span>
            </div>
          </Link>

          {/* Brands Link */}
          {menuSettings.showBrands && (
            <Link
              to="/brands"
              className="flex items-center gap-2.5 px-5 py-2 h-[52px] hover:bg-[#2D3748] transition-colors border-r-2 border-slate-600"
            >
              <Award className="size-4" />
              <span className="font-medium text-sm tracking-wide">Brands</span>
            </Link>
          )}

          {/* Promotions Link */}
          {menuSettings.showPromotions && (
            <Link
              to="/promotions"
              className="flex items-center gap-2.5 px-5 py-2 h-[52px] hover:bg-[#2D3748] transition-colors border-r-2 border-slate-600"
            >
              <Tag className="size-4" />
              <span className="font-medium text-sm tracking-wide">Promotions</span>
            </Link>
          )}

          {/* Dynamic Menu Brands */}
          {!brandsLoading && menuBrands.map((brand) => (
            <Link
              key={brand.id}
              to={brand.path || `/brands/${brand.slug}?sort=priceHigh`}
              className="flex items-center gap-2.5 px-5 py-2 h-[52px] hover:bg-[#2D3748] transition-colors border-r-2 border-slate-600"
            >
              <span className="font-medium text-sm tracking-wide">{brand.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}