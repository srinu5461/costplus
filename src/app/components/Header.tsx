import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, ShoppingCart, User, Menu, X, Heart, Phone, Clock, ChevronDown, ChevronRight, Tag, Award, Grid3x3, Mail, Package, LogOut, BookOpen, Home } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCMS, CategoryNode } from '../context/CMSContext';
import { logger } from '../utils/logger';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { categoryToSlug } from '../utils/slugify';
import { buildCategoryTree } from '../utils/categoryTree';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CategoryNavigation } from './CategoryNavigation';
import { QuoteModal } from './QuoteModal';
import { headerConfig } from '../../config/header';
import { useProducts } from '../../hooks/useProducts';
import { staticCategories } from '../../config/categories';
import { getSpecialsForProduct } from '../utils/bogoCalculator';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

// Logo Component with text positioned lower and closer to circle
function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <svg 
      className={className}
      viewBox="0 0 350 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Costplus100 Logo"
    >
      {/* Main Circle Background */}
      <circle cx="40" cy="40" r="34" fill="#2D3748"/>
      
      {/* C+ Text in Circle */}
      <text 
        x="40" 
        y="52" 
        fontSize="34" 
        fontWeight="900" 
        fill="white" 
        textAnchor="middle" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="-2"
      >
        C+
      </text>

      {/* 100 Badge */}
      <rect x="52" y="16" width="40" height="22" rx="11" fill="#E31837"/>
      <text
        x="72"
        y="32"
        fontSize="14"
        fontWeight="900"
        fill="white"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        100
      </text>

      {/* COSTPLUS100 Text - moved down and closer to circle */}
      <text 
        x="85" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#2D3748" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        COST
      </text>
      <text 
        x="170" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#E31837" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        PLUS
      </text>
      <text 
        x="255" 
        y="54" 
        fontSize="28" 
        fontWeight="900" 
        fill="#2D3748" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="1"
      >
        100
      </text>
      
      {/* Tagline */}
      <text 
        x="85" 
        y="70" 
        fontSize="9" 
        fontWeight="700" 
        fill="#E31837" 
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="2"
      >
        TOTAL TRANSPARENCY - NO CATCH
      </text>
    </svg>
  );
}

export function Header() {
  // ===== ALL HOOKS MUST BE AT THE TOP =====
  const { getCartCount } = useCart();
  const cms = useCMS();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [menuBrands, setMenuBrands] = useState<any[]>([]);
  const [menuSettings, setMenuSettings] = useState({ showPromotions: true, showBrands: true });
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  // ⚡ PRODUCTS FROM CDN JSON: Load products for search from CDN JSON (instant load)
  const { data: productsFromCDN } = useProducts();


  // Check if customer is logged in
  useEffect(() => {
    const checkCustomer = () => {
      logger.info('Header: Checking customer data from localStorage...');
      const customerData = localStorage.getItem('customer');
      logger.info('Header: Raw localStorage data:', customerData);

      if (customerData) {
        try {
          const parsedCustomer = JSON.parse(customerData);
          logger.info('Header: Parsed customer:', parsedCustomer);
          setCustomer(parsedCustomer);
        } catch (error) {
          logger.error('Header: Error parsing customer data:', error);
          localStorage.removeItem('customer');
        }
      } else {
        logger.info('Header: No customer data found in localStorage');
        setCustomer(null);
      }
    };

    checkCustomer();

    // Listen for storage changes (for cross-tab sync)
    window.addEventListener('storage', checkCustomer);

    // Custom event for same-tab updates
    window.addEventListener('customerLogin', checkCustomer as any);
    window.addEventListener('customerLogout', checkCustomer as any);

    logger.info('Header: Event listeners attached');

    return () => {
      window.removeEventListener('storage', checkCustomer);
      window.removeEventListener('customerLogin', checkCustomer as any);
      window.removeEventListener('customerLogout', checkCustomer as any);
    };
  }, []);

  // Debug: Log customer state changes
  useEffect(() => {
    logger.info('Header: Customer state updated:', customer);
  }, [customer]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      // Check both desktop and mobile search containers
      if (searchRef.current && !searchRef.current.contains(target) &&
          mobileSearchRef.current && !mobileSearchRef.current.contains(target)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showSearchResults]);

  // Data from providers
  const cartCount = getCartCount();

  // ⚡ PROGRESSIVE CATEGORY LOADING: Show L1 first, then L2/L3 in background
  const [showFullTree, setShowFullTree] = useState(false);

  // ⚡ CACHE: Memoize category tree to prevent rebuilding on every render
  const fullCategoryTree = useMemo(() => {
    return buildCategoryTree(cms.data.categoryTree);
  }, [cms.data.categoryTree]);

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
          const enabledBrands = (data.brands || [])
            .filter((brand: any) => brand.enabled)
            .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
          setMenuBrands(enabledBrands);
        }
      } catch (error) {
        console.error('Error loading menu brands:', error);
      }
    };

    loadMenuBrands();
  }, []);

  // Load menu settings
  useEffect(() => {
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

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.menuSettings) {
            setMenuSettings(data.menuSettings);
          }
        }
      } catch (error) {
        console.error('Error loading menu settings:', error);
      }
    };

    loadMenuSettings();
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

  const header = headerConfig;

  // Handle logout
  const handleLogout = () => {
    logger.info('Header: Logging out customer...');
    localStorage.removeItem('customer');
    setCustomer(null);
    setShowProfileMenu(false);

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('customerLogout'));

    // Navigate to home page
    navigate('/');
  };

  // Use CDN products for search (or fallback to CMS)
  const products = (productsFromCDN && productsFromCDN.length > 0)
    ? productsFromCDN
    : cms.data.products || [];

  // Search functionality - OPTIMIZED for large datasets
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      return [];
    }

    // Early return if no products available (still loading)
    if (products.length === 0) {
      return [];
    }

    console.log(`🔍 Search triggered with ${products.length} products available`);

    const query = searchQuery.toLowerCase().trim();
    const startTime = performance.now();
    const maxResults = 50;
    const results = [];

    // Early exit optimization: stop once we have enough results
    for (let i = 0; i < products.length && results.length < maxResults; i++) {
      const product = products[i];
      const code = (product.code || '').toLowerCase();
      const name = (product.name || '').toLowerCase();
      const brand = (product.brand || '').toLowerCase();

      if (code.includes(query) || name.includes(query) || brand.includes(query)) {
        results.push(product);
      }
    }

    const duration = performance.now() - startTime;
    logger.info(`✅ Search completed in ${duration.toFixed(2)}ms - Found ${results.length} results`);

    // Log the found products
    if (results.length > 0) {
      logger.info('🔍 Search Results:', results.map(p => ({
        code: p.code,
        name: p.name,
        brand: p.brand
      })));
    }

    return results;
  }, [products, searchQuery]);

  const displayedResults = searchResults.slice(0, 10);
  const hasMoreResults = searchResults.length > 10;

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim().length >= 2) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  const handleSearchInputFocus = () => {
    if (searchQuery.trim().length >= 2) {
      setShowSearchResults(true);
    }
  };

  const handleProductClick = () => {
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleViewAllResults = () => {
    logger.info('🔍 View All clicked - Query:', searchQuery, 'Results found:', searchResults.length);
    if (searchQuery.trim()) {
      const url = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
      logger.info('🔍 Navigating to:', url);
      
      // Close dropdowns and menu
      setShowSearchResults(false);
      setIsMobileMenuOpen(false);
      setSearchQuery(''); // Clear search input after navigating
      
      // Navigate
      navigate(url);
      
      // Scroll to top after a tiny delay to ensure navigation happens first
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else {
      logger.info('❌ No search query to navigate with');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
    <header className={`sticky top-0 z-50 w-full max-w-[100vw] bg-white shadow-md transition-transform duration-300 will-change-transform ${!isVisible ? '-translate-y-full' : 'translate-y-0'}`}>
      {/* Top Bar - Contact Info */}
      <div className="bg-slate-50 border-b text-sm hidden md:block w-full">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2 w-full">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
            <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-start">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Mail className="size-3.5" />
                <span className="font-medium">info@costplus100.com.au</span>
              </span>
              <span className="hidden lg:flex items-center gap-1.5 text-slate-600">
                <Clock className="size-3.5" />
                {header.workingHours}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuoteModal(true)}
                className="flex items-center gap-2 bg-[#E31837] hover:bg-[#C41230] text-white px-4 py-1.5 rounded-md transition-colors font-semibold"
              >
                <Phone className="size-3.5" />
                Get Quote
              </button>
              <Link
                to="/contact"
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-1.5 rounded-md transition-colors font-semibold"
              >
                <Mail className="size-3.5" />
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header - Logo, Search, Actions */}
      <div className="border-b bg-white w-full">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-3 md:py-4 w-full">
          {/* ROW 1: Mobile Menu, Logo, Cart */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </Button>

            {/* Logo */}
            <Link to="/" className="shrink-0 flex items-center">
              <Logo className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto" />
            </Link>
            
            {/* Search Bar - DESKTOP ONLY (inline) */}
            <div ref={searchRef} className="hidden md:flex flex-1 max-w-2xl relative">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 pointer-events-none" />
                  <input
                    type="search"
                    inputMode="search"
                    placeholder="Search products by name, code, or brand..."
                    value={searchQuery}
                    onChange={(e) => {
                      e.stopPropagation();
                      logger.info('🔍 Search input changed:', e.target.value);
                      handleSearchInputChange(e);
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      logger.info('🔍 Search focused');
                      handleSearchInputFocus();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      logger.info('🔍 Search touch start');
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      logger.info('🔍 Search clicked');
                    }}
                    className="w-full h-12 pl-12 pr-24 border-2 border-[#2D3748] rounded-lg focus:border-[#E31837] focus:ring-2 focus:ring-[#E31837]/20 outline-none transition-all text-base font-medium"
                    style={{
                      fontSize: '16px', // Prevent iOS zoom
                      touchAction: 'manipulation',
                      WebkitAppearance: 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 bg-[#E31837] hover:bg-[#E31837]/90 text-white text-sm font-bold rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      logger.info('🔍 Search submit button clicked, query:', searchQuery);
                    }}
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Search Results Dropdown - Desktop Only */}
              {showSearchResults && displayedResults.length > 0 && (
                <div className="hidden md:block absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-[500px] overflow-y-auto z-[100] pointer-events-auto">
                  <div className="p-2">
                    <p className="text-xs text-slate-500 px-3 py-2 font-medium">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </p>
                    {displayedResults.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        onClick={handleProductClick}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {/* Product Image */}
                        <div className="w-12 h-12 bg-slate-100 rounded flex-shrink-0 overflow-hidden">
                          {(product.mainImageUrl || product.image) ? (
                            <img 
                              src={product.mainImageUrl || product.image} 
                              alt={product.name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.code && (
                              <span className="text-xs text-slate-500">Code: {product.code}</span>
                            )}
                            {product.brand && (
                              <>
                                <span className="text-xs text-slate-300">•</span>
                                <span className="text-xs text-slate-500">{product.brand}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {/* Show "View details" instead of price since CDN may have stale prices */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-600 font-medium">
                            View details →
                          </p>
                        </div>
                      </Link>
                    ))}
                    {hasMoreResults && (
                      <button
                        onClick={handleViewAllResults}
                        className="w-full mt-2 p-3 text-sm font-medium text-[#E31837] hover:bg-[#E31837]/5 rounded-lg transition-colors border-t"
                      >
                        View More
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* No Results Message - Desktop Only */}
              {showSearchResults && searchQuery.trim().length >= 2 && displayedResults.length === 0 && (
                <div className="hidden md:block absolute top-full left-0 right-0 mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 p-6 text-center">
                  <Search className="size-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900 mb-1">No products found</p>
                  <p className="text-xs text-slate-500">Try searching with different keywords</p>
                </div>
              )}
            </div>

            {/* Actions - Login/Register + Cart */}
            <div className="flex items-center gap-2 shrink-0">
              {customer ? (
                <div className="relative">
                  <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-2 px-3 py-2 hover:bg-slate-50"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="bg-[#2D3748] size-8 rounded-full flex items-center justify-center">
                      <User className="size-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-900">{customer.firstName}</p>
                      <p className="text-xs text-slate-500">My Account</p>
                    </div>
                    <ChevronDown className={`size-4 text-slate-600 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {/* Mobile Profile Icon */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden p-2"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="bg-[#E31837] size-8 rounded-full flex items-center justify-center">
                      <User className="size-4 text-white" />
                    </div>
                  </Button>
                  
                  {showProfileMenu && (
                    <>
                      {/* Backdrop for closing dropdown */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowProfileMenu(false)}
                      />
                      
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-lg shadow-lg z-50">
                        {/* Customer Info Header */}
                        <div className="px-4 py-3 border-b bg-slate-50">
                          <p className="font-semibold text-slate-900">{customer.firstName} {customer.lastName}</p>
                          <p className="text-xs text-slate-600 truncate">{customer.email}</p>
                        </div>
                        
                        {/* Menu Items */}
                        <div className="py-2">
                          <Link 
                            to="/customer/dashboard" 
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <User className="size-4 text-slate-500" />
                            <span>Dashboard</span>
                          </Link>
                          <Link 
                            to="/customer/dashboard" 
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <Package className="size-4 text-slate-500" />
                            <span>My Orders</span>
                          </Link>
                          <div className="border-t my-2"></div>
                          <button
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                            onClick={handleLogout}
                          >
                            <LogOut className="size-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/customer/login" className="hidden md:block text-sm text-slate-700 hover:text-[#E31837] transition-colors px-3 py-2">
                    Login
                  </Link>
                  <span className="hidden md:block text-slate-300">|</span>
                  <Link to="/customer/login" className="hidden md:block text-sm text-slate-700 hover:text-[#E31837] transition-colors px-3 py-2">
                    Register
                  </Link>
                </>
              )}
              <Link to="/cart">
                <Button className="relative h-9 md:h-10 px-2 md:px-4 border-2 border-[#2D3748] bg-white text-[#2D3748] hover:bg-[#2D3748] hover:text-white transition-all">
                  <ShoppingCart className="size-4 md:size-5 mr-0 md:mr-2" />
                  <span className="hidden md:inline font-semibold">Cart</span>
                  {cartCount > 0 && (
                    <Badge 
                      className="ml-1 md:ml-2 bg-[#E31837] text-white hover:bg-[#E31837] text-xs px-1.5 py-0"
                    >
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            </div>
          </div>

          {/* ROW 2: Mobile Search Bar - ALWAYS VISIBLE */}
          <div ref={mobileSearchRef} className="md:hidden mt-3 relative">
            <form onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  inputMode="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => {
                    e.stopPropagation();
                    logger.info('🔍 Mobile search input changed:', e.target.value);
                    handleSearchInputChange(e);
                  }}
                  onFocus={(e) => {
                    e.stopPropagation();
                    logger.info('🔍 Mobile search focused');
                    handleSearchInputFocus();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="w-full h-10 pl-10 pr-20 border-2 border-slate-200 rounded-lg focus:border-[#E31837] outline-none transition-colors text-sm"
                  style={{
                    fontSize: '16px', // Prevent iOS zoom
                    touchAction: 'manipulation',
                    WebkitAppearance: 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                />
                <button 
                  type="submit"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 bg-[#2D3748] hover:bg-[#2D3748]/90 text-white text-sm font-semibold rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  Search
                </button>
              </div>
            </form>

            {/* Mobile Search Results Dropdown */}
            {showSearchResults && displayedResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 mx-4 bg-white border-2 border-slate-200 rounded-lg shadow-xl max-h-[400px] overflow-y-auto z-[100] pointer-events-auto">
                <div className="p-2">
                  <p className="text-xs text-slate-500 px-3 py-2 font-medium">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {displayedResults.map((product) => (
                    <Link
                      key={product.id}
                      to={`/products/${product.id}`}
                      onClick={handleProductClick}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-slate-100 rounded flex-shrink-0 overflow-hidden">
                        {(product.mainImageUrl || product.image) ? (
                          <img 
                            src={product.mainImageUrl || product.image} 
                            alt={product.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.code && (
                            <span className="text-xs text-slate-500">Code: {product.code}</span>
                          )}
                          {product.brand && (
                            <>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-500">{product.brand}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Show "View details" instead of price since CDN may have stale prices */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-600 font-medium">
                          View details →
                        </p>
                      </div>
                    </Link>
                  ))}
                  {hasMoreResults && (
                    <button
                      onClick={handleViewAllResults}
                      className="w-full mt-2 p-3 text-sm font-medium text-[#E31837] hover:bg-[#E31837]/5 rounded-lg transition-colors border-t"
                    >
                      View All {searchResults.length} Results
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* No Results Message - Mobile */}
            {showSearchResults && searchQuery.trim().length >= 2 && displayedResults.length === 0 && (
              <div className="absolute left-0 right-0 mt-2 mx-4 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-50 p-6 text-center">
                <Search className="size-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-900 mb-1">No products found</p>
                <p className="text-xs text-slate-500">Try searching with different keywords</p>
              </div>
            )}
          </div>

          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
          )}
        </div>
      </div>

      {/* Navigation - Category Navigation - Desktop Only */}
      <div className="hidden lg:block">
        <CategoryNavigation />
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="relative lg:hidden bg-white border-t shadow-lg max-h-[60vh] overflow-y-auto z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <nav className="flex flex-col gap-2">
              {/* Categories Section */}
              <div className="border-b pb-3 mb-2">
                <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2 px-3">Categories</h3>
                {categoryTree.filter(cat => cat.enabled !== false).slice(0, 10).map((category) => {
                  const isExpanded = expandedCategory === category.fullPath;
                  const hasChildren = category.children && category.children.length > 0;
                  
                  return (
                    <div key={category.fullPath}>
                      <div className="flex items-center">
                        <Link 
                          to={`/products/c/${categoryToSlug(category.fullPath)}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex-1 flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <span className="font-medium text-sm">{category.name}</span>
                          {category.productCount > 0 && (
                            <span className="text-xs text-slate-500">({category.productCount})</span>
                          )}
                        </Link>
                        {hasChildren && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-2"
                            onClick={() => setExpandedCategory(isExpanded ? null : category.fullPath)}
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-[#E31837]" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Subcategories */}
                      {hasChildren && isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                          {category.children.filter(subCat => subCat.enabled !== false).slice(0, 8).map((subCat) => (
                            <Link
                              key={subCat.fullPath}
                              to={`/products/c/${categoryToSlug(subCat.fullPath)}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block p-2 hover:bg-slate-50 rounded text-sm text-slate-700 hover:text-[#E31837] transition-colors"
                            >
                              {subCat.name}
                              {subCat.productCount > 0 && (
                                <span className="text-xs text-slate-500 ml-1">({subCat.productCount})</span>
                              )}
                            </Link>
                          ))}
                          {category.children.filter(subCat => subCat.enabled !== false).length > 8 && (
                            <Link
                              to={`/products/c/${categoryToSlug(category.fullPath)}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block p-2 text-sm text-[#E31837] font-medium"
                            >
                              View All ({category.children.filter(subCat => subCat.enabled !== false).length})
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Main Navigation Links */}
              <div className="border-t pt-2 mt-2">
                <h3 className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2 px-3">Quick Links</h3>

                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Home className="size-5 text-[#E31837]" />
                  <span className="font-medium">Home</span>
                </Link>

                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <BookOpen className="size-5 text-[#E31837]" />
                  <span className="font-medium">
                    Costplus <span className="text-[#E31837] font-black">$100</span> Catalogue
                  </span>
                </Link>

                <Link
                  to="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Mail className="size-5 text-[#E31837]" />
                  <span className="font-medium">Contact Us</span>
                </Link>

                <button
                  onClick={() => { setIsMobileMenuOpen(false); setShowQuoteModal(true); }}
                  className="flex items-center gap-2 p-3 bg-[#E31837]/10 hover:bg-[#E31837]/20 rounded-lg transition-colors w-full text-left"
                >
                  <Phone className="size-5 text-[#E31837]" />
                  <span className="font-medium text-[#E31837]">Get Quote</span>
                </button>

                {menuSettings.showBrands && (
                  <Link
                    to="/brands"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Award className="size-5 text-[#E31837]" />
                    <span className="font-medium">Brands</span>
                  </Link>
                )}

                {menuSettings.showPromotions && (
                  <Link
                    to="/promotions"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Tag className="size-5 text-[#E31837]" />
                    <span className="font-medium">Promotions</span>
                  </Link>
                )}

                {/* Dynamic Menu Brands */}
                {menuBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    to={brand.path || `/brands/${brand.slug}?sort=priceHigh`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Grid3x3 className="size-5 text-[#E31837]" />
                    <span className="font-medium">{brand.name}</span>
                  </Link>
                ))}
              </div>

              {/* Customer Links in Mobile Menu */}
              {customer ? (
                <>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-xs uppercase tracking-wide font-semibold text-slate-500 mb-2 px-3">My Account</p>
                    <Link 
                      to="/customer/dashboard" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <User className="size-5 text-[#E31837]" />
                      <span className="font-medium">Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-3 hover:bg-red-50 rounded-lg transition-colors w-full text-left text-red-600"
                    >
                      <LogOut className="size-5" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <Link 
                  to="/customer/login" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors border-t pt-4 mt-2"
                >
                  <User className="size-5 text-[#E31837]" />
                  <span className="font-medium">Login / Register</span>
                </Link>
              )}
              
              <Link 
                to="/about" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 p-3 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <span className="font-medium">About Us</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
    <QuoteModal open={showQuoteModal} onClose={() => setShowQuoteModal(false)} />
    </>
  );
}