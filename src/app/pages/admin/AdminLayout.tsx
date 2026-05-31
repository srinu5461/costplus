import { Outlet, Link, useNavigate, useLocation } from 'react-router';
import { Suspense, startTransition } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Button } from '../../components/ui/button';
import { LoadingScreen } from '../../components/LoadingScreen';
import { 
  LayoutDashboard, 
  Package, 
  LayoutGrid, 
  Layout, 
  FileText, 
  Home,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  Mail,
  Upload,
  ShoppingCart,
  Users,
  Star,
  Receipt,
  BarChart3,
  TrendingUp,
  DollarSign,
  Tag,
  MessageSquare,
  Scale,
  Bot,
  FileCheck,
  RotateCcw,
  Image,
  Building2,
  Percent,
  Key,
  RefreshCw,
  Bug,
  Search,
  CreditCard,
  Layers,
  BadgePercent,
  MapPin,
  ChevronDown,
  ChevronRight,
  Award,
  Download,
  Ticket
} from 'lucide-react';
import { useState, useEffect } from 'react';

export function AdminLayout() {
  const { isAuthenticated, logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['sales', 'catalog', 'content', 'config', 'tools']);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const menuSections = [
    {
      id: 'main',
      label: 'Main',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
      ]
    },
    {
      id: 'sales',
      label: 'Sales & Orders',
      items: [
        { icon: ShoppingCart, label: 'Orders', path: '/admin/orders' },
        { icon: FileText, label: 'Quotations', path: '/admin/quotations' },
        { icon: Receipt, label: 'Invoices', path: '/admin/invoices' },
        { icon: RotateCcw, label: 'Returns', path: '/admin/returns-management' },
        { icon: Users, label: 'Customers', path: '/admin/customers' },
        { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
      ]
    },
    {
      id: 'catalog',
      label: 'Catalog',
      items: [
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: Package, label: 'Products (Virtualized)', path: '/admin/products-virtualized' },
        { icon: LayoutGrid, label: 'Categories', path: '/admin/categories' },
        { icon: Star, label: 'Featured Products', path: '/admin/featured-products' },
        { icon: BadgePercent, label: 'Promotional Pricing', path: '/admin/promotional-pricing' },
        { icon: Layers, label: 'Sections Manager', path: '/admin/sections-manager' },
      ]
    },
    {
      id: 'content',
      label: 'Content & Design',
      items: [
        { icon: Home, label: 'Homepage', path: '/admin/homepage' },
        { icon: Image, label: 'Banners', path: '/admin/banners' },
        { icon: Layout, label: 'Header', path: '/admin/header' },
        { icon: FileText, label: 'Footer', path: '/admin/footer' },
        { icon: FileText, label: 'About Us', path: '/admin/about' },
        { icon: Award, label: 'Menu Brands', path: '/admin/menu-brands' },
        { icon: FileText, label: 'Legal Pages', path: '/admin/legal-pages' },
        { icon: Search, label: 'SEO Manager', path: '/admin/seo-manager' },
      ]
    },
    {
      id: 'config',
      label: 'Configuration',
      items: [
        { icon: Building2, label: 'Company Info', path: '/admin/company-settings' },
        { icon: CreditCard, label: 'Payment Settings', path: '/admin/payment-settings' },
        { icon: Ticket, label: 'Vouchers', path: '/admin/vouchers' },
        { icon: Mail, label: 'Email Settings', path: '/admin/email-settings' },
        { icon: MapPin, label: 'Pickup Locations', path: '/admin/pickup-locations' },
        { icon: Bot, label: 'AI Chatbot', path: '/admin/ai-chatbot' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
      ]
    },
    {
      id: 'pricing',
      label: 'Pricing & Integration',
      items: [
        { icon: DollarSign, label: 'Pricing Tiers', path: '/admin/pricing-tiers' },
        { icon: Percent, label: 'Profit Margins', path: '/admin/profit-margin-settings' },
        { icon: Key, label: 'Uropa API Token', path: '/admin/uropa-token-auth' },
        { icon: RefreshCw, label: 'Uropa Price Sync', path: '/admin/uropa-price-sync' },
        { icon: FileText, label: 'Description Sync', path: '/admin/description-sync' },
        { icon: Download, label: 'Image Scraper', path: '/admin/image-scraper' },
        { icon: Tag, label: 'Specials', path: '/admin/specials' },
        { icon: Bug, label: 'Price Debug', path: '/admin/price-debug' },
        { icon: Activity, label: 'Diagnostics', path: '/admin/diagnostics' },
      ]
    },
  ];

  const renderMenuSection = (section: typeof menuSections[0], isMobile = false) => {
    const isExpanded = expandedSections.includes(section.id);
    const hasActiveItem = section.items.some(item => location.pathname === item.path);

    return (
      <div key={section.id} className="mb-1">
        {section.id === 'main' ? (
          // Main section items render directly without dropdown
          section.items.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              onClick={(e) => {
                if (isMobile) setMobileMenuOpen(false);
                // Wrap navigation in startTransition to prevent Suspense errors
                startTransition(() => {
                  // Navigation handled by React Router
                });
              }}
            >
              <Button
                variant={location.pathname === item.path ? 'default' : 'ghost'}
                className="w-full justify-start"
                size="sm"
              >
                <item.icon className="size-4 mr-3" />
                {item.label}
              </Button>
            </Link>
          ))
        ) : (
          <>
            {/* Section Header */}
            <Button
              variant="ghost"
              className={`w-full justify-between ${hasActiveItem ? 'bg-slate-100' : ''}`}
              size="sm"
              onClick={() => toggleSection(section.id)}
            >
              <span className="font-semibold text-slate-700">{section.label}</span>
              {isExpanded ? (
                <ChevronDown className="size-4 text-slate-500" />
              ) : (
                <ChevronRight className="size-4 text-slate-500" />
              )}
            </Button>
            
            {/* Section Items */}
            {isExpanded && (
              <div className="ml-2 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
                {section.items.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={(e) => {
                      if (isMobile) setMobileMenuOpen(false);
                      // Wrap navigation in startTransition to prevent Suspense errors
                      startTransition(() => {
                        // Navigation handled by React Router
                      });
                    }}
                  >
                    <Button
                      variant={location.pathname === item.path ? 'default' : 'ghost'}
                      className="w-full justify-start text-sm"
                      size="sm"
                    >
                      <item.icon className="size-3.5 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-[100vw] overflow-x-hidden">
      {/* Top Bar */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 w-full">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:text-white hover:bg-slate-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
            <Link to="/admin" className="text-xl font-bold">
              Costplus100 <span className="text-slate-400 font-normal">Admin</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white hover:text-white hover:bg-slate-800">
                View Site
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white hover:text-white hover:bg-slate-800"
            >
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 bg-white border-r min-h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto">
          <nav className="p-4 space-y-1">
            {menuSections.map((section) => renderMenuSection(section))}
          </nav>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <aside className="w-64 bg-white h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <nav className="p-4 space-y-1">
                {menuSections.map((section) => renderMenuSection(section, true))}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Suspense fallback={<LoadingScreen />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}