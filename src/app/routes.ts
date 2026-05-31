import { createBrowserRouter } from 'react-router';
import { lazy } from 'react';

console.log('📍 routes.ts: FILE IS BEING EXECUTED');

// Layouts - Keep these eager loaded as they're used immediately
import { RootLayout } from './layout/RootLayout';
import { AdminLayout } from './pages/admin/AdminLayout';

// Components - Keep these eager loaded
import { ProviderWrapper } from './components/ProviderWrapper';
import { CMSLoadingWrapper } from './components/CMSLoadingWrapper';

// Critical Pages - Load immediately (NO lazy loading)
// AdminLogin is eager-loaded to avoid cache/dynamic import issues
import { Home } from './pages/Home';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Promotions } from './pages/Promotions'; // Eager load to avoid Suspense issues
import { AdminLogin } from './pages/admin/AdminLogin'; // v2.0 - Fixed AuthContext issue
import { AdminDashboard } from './pages/admin/AdminDashboard'; // v2.1 - Fixed Suspense issue with CMS context
import { About } from './pages/About'; // Eager load to fix Figma Make dynamic import issues

// Public Pages - Lazy load for code splitting with error handling
const Brands = lazy(() => import('./pages/Brands').then(m => ({ default: m.Brands })).catch(err => {
  console.error('Failed to load Brands:', err);
  return { default: () => null };
}));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })).catch(err => {
  console.error('Failed to load Cart:', err);
  return { default: () => null };
}));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })).catch(err => {
  console.error('Failed to load Contact:', err);
  return { default: () => null };
}));
const DeliveryInformation = lazy(() => import('./pages/DeliveryInformation').then(m => ({ default: m.DeliveryInformation })).catch(err => {
  console.error('Failed to load DeliveryInformation:', err);
  return { default: () => null };
}));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })).catch(err => {
  console.error('Failed to load NotFound:', err);
  return { default: () => null };
}));
const DbDiagnostic = lazy(() => import('./pages/DbDiagnostic').then(m => ({ default: m.DbDiagnostic })).catch(err => {
  console.error('Failed to load DbDiagnostic:', err);
  return { default: () => null };
}));

// Customer Pages - Lazy load
const CustomerLogin = lazy(() => import('./pages/customer/CustomerLogin').then(m => ({ default: m.CustomerLogin })).catch(err => {
  console.error('Failed to load CustomerLogin:', err);
  return { default: () => null };
}));
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })).catch(err => {
  console.error('Failed to load CustomerDashboard:', err);
  return { default: () => null };
}));
const ForgotPassword = lazy(() => import('./pages/customer/ForgotPassword').then(m => ({ default: m.ForgotPassword })).catch(err => {
  console.error('Failed to load ForgotPassword:', err);
  return { default: () => null };
}));
const ResetPassword = lazy(() => import('./pages/customer/ResetPassword').then(m => ({ default: m.ResetPassword })).catch(err => {
  console.error('Failed to load ResetPassword:', err);
  return { default: () => null };
}));
const ChangePassword = lazy(() => import('./pages/customer/ChangePassword').then(m => ({ default: m.ChangePassword })).catch(err => {
  console.error('Failed to load ChangePassword:', err);
  return { default: () => null };
}));

// Legal Pages - Lazy load
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions').catch(err => {
  console.error('Failed to load TermsAndConditions:', err);
  return { default: () => null };
}));
const ReturnRefundPolicy = lazy(() => import('./pages/ReturnRefundPolicy').catch(err => {
  console.error('Failed to load ReturnRefundPolicy:', err);
  return { default: () => null };
}));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').catch(err => {
  console.error('Failed to load PrivacyPolicy:', err);
  return { default: () => null };
}));

// Test/Debug Pages - Lazy load
const ProviderTest = lazy(() => import('./pages/ProviderTest').then(m => ({ default: m.ProviderTest })));
const EmailTest = lazy(() => import('./pages/EmailTest').then(m => ({ default: m.EmailTest })));
const ProductQuery = lazy(() => import('./components/ProductQuery').then(m => ({ default: m.ProductQuery })));

// Admin Pages - Lazy load (these are the biggest chunks!) v3.0
const ProductsManager = lazy(() => import('./pages/admin/ProductsManager').then(m => ({ default: m.ProductsManager })));
const ProductsVirtualized = lazy(() => import('./pages/admin/ProductsVirtualized').then(m => ({ default: m.ProductsVirtualized })));
const CategoriesManager = lazy(() => import('./pages/admin/CategoriesManager').then(m => ({ default: m.CategoriesManager })));
const OrdersManager = lazy(() => import('./pages/admin/OrdersManager').then(m => ({ default: m.OrdersManager })));
const CustomersManager = lazy(() => import('./pages/admin/CustomersManager').then(m => ({ default: m.CustomersManager })));
const FeaturedProducts = lazy(() => import('./pages/admin/FeaturedProducts').then(m => ({ default: m.FeaturedProducts })));
const SectionsManager = lazy(() => import('./pages/admin/SectionsManager').then(m => ({ default: m.SectionsManager })));
const PromotionalPricing = lazy(() => import('./pages/admin/PromotionalPricing').then(m => ({ default: m.PromotionalPricing })));
const HeaderEditor = lazy(() => import('./pages/admin/HeaderEditor').then(m => ({ default: m.HeaderEditor })));
const FooterEditor = lazy(() => import('./pages/admin/FooterEditor').then(m => ({ default: m.FooterEditor })));
const HomepageEditor = lazy(() => import('./pages/admin/HomepageEditor').then(m => ({ default: m.HomepageEditor })));
const BannersManager = lazy(() => import('./pages/admin/BannersManager').then(m => ({ default: m.BannersManager })));
const MenuBrandsManager = lazy(() => import('./pages/admin/MenuBrandsManager').then(m => ({ default: m.MenuBrandsManager })));
const AIChatbotSettings = lazy(() => import('./pages/admin/AIChatbotSettings').then(m => ({ default: m.AIChatbotSettings })));
const Settings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.Settings })));
const CompanySettings = lazy(() => import('./pages/admin/CompanySettings').then(m => ({ default: m.CompanySettings })));
const EmailSettings = lazy(() => import('./pages/admin/EmailSettings').then(m => ({ default: m.EmailSettings })));
const PricingTiers = lazy(() => import('./pages/admin/PricingTiers').catch(err => {
  console.error('Failed to load PricingTiers:', err);
  return { default: () => null };
}));
const ProfitMarginSettings = lazy(() => import('./pages/admin/ProfitMarginSettings').catch(err => {
  console.error('Failed to load ProfitMarginSettings:', err);
  return { default: () => null };
}));
const UropaTokenAuth = lazy(() => import('./pages/admin/UropaTokenAuth').catch(err => {
  console.error('Failed to load UropaTokenAuth:', err);
  return { default: () => null };
}));
const UropaPriceSync = lazy(() => import('./pages/admin/UropaPriceSync').catch(err => {
  console.error('Failed to load UropaPriceSync:', err);
  return { default: () => null };
}));
const DescriptionSync = lazy(() => import('./pages/admin/DescriptionSync').then(m => ({ default: m.default })));
// Eager load ImageScraper to avoid Suspense errors
import ImageScraper from './pages/admin/ImageScraper';
const SpecialsManager = lazy(() => import('./pages/admin/SpecialsManager').then(m => ({ default: m.SpecialsManager })));
const DebugProduct = lazy(() => import('./pages/admin/DebugProduct').then(m => ({ default: m.DebugProduct })));
const PriceDebug = lazy(() => import('./pages/admin/PriceDebug').catch(err => {
  console.error('Failed to load PriceDebug:', err);
  return { default: () => null };
}));
const Diagnostics = lazy(() => import('./pages/admin/Diagnostics').catch(err => {
  console.error('Failed to load Diagnostics:', err);
  return { default: () => null };
}));
const EmailDiagnostics = lazy(() => import('./pages/admin/EmailDiagnostics').then(m => ({ default: m.EmailDiagnostics })).catch(err => {
  console.error('Failed to load EmailDiagnostics:', err);
  return { default: () => null };
}));
const DebugCategories = lazy(() => import('./pages/admin/DebugCategories').then(m => ({ default: m.DebugCategories })).catch(err => {
  console.error('Failed to load DebugCategories:', err);
  return { default: () => null };
}));
const DebugProducts = lazy(() => import('./pages/admin/DebugProducts').then(m => ({ default: m.DebugProducts })).catch(err => {
  console.error('Failed to load DebugProducts:', err);
  return { default: () => null };
}));
const AgeRestrictedProducts = lazy(() => import('./pages/admin/AgeRestrictedProducts').then(m => ({ default: m.AgeRestrictedProducts })).catch(err => {
  console.error('Failed to load AgeRestrictedProducts:', err);
  return { default: () => null };
}));
const ImportProducts = lazy(() => import('./pages/admin/ImportProducts').catch(err => {
  console.error('Failed to load ImportProducts:', err);
  return { default: () => null };
}));
const ImportCategories = lazy(() => import('./pages/admin/ImportCategories').catch(err => {
  console.error('Failed to load ImportCategories:', err);
  return { default: () => null };
}));
const SEOManager = lazy(() => import('./pages/admin/SEOManager').catch(err => {
  console.error('Failed to load SEOManager:', err);
  return { default: () => null };
}));
const LegalPagesManager = lazy(() => import('./pages/admin/LegalPagesManager').catch(err => {
  console.error('Failed to load LegalPagesManager:', err);
  return { default: () => null };
}));
const AboutEditor = lazy(() => import('./pages/admin/AboutEditor').then(m => ({ default: m.AboutEditor })));

// Business Management Pages - Lazy load
const Quotations = lazy(() => import('./pages/Quotations').then(m => ({ default: m.Quotations })));
const CreateQuotation = lazy(() => import('./pages/admin/CreateQuotation').then(m => ({ default: m.CreateQuotation })));
const QuotationDetail = lazy(() => import('./pages/admin/QuotationDetail').then(m => ({ default: m.QuotationDetail })));
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const CreateInvoice = lazy(() => import('./pages/admin/CreateInvoice').then(m => ({ default: m.CreateInvoice })));
const InvoiceDetail = lazy(() => import('./pages/admin/InvoiceDetail').then(m => ({ default: m.InvoiceDetail })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const ReportsAdvanced = lazy(() => import('./pages/admin/ReportsAdvanced').then(m => ({ default: m.ReportsAdvanced })));
const ReturnsManagement = lazy(() => import('./pages/admin/ReturnsManagement').then(m => ({ default: m.ReturnsManagement })));
const ReturnDetail = lazy(() => import('./pages/admin/ReturnDetail').then(m => ({ default: m.ReturnDetail })));
const PaymentSettings = lazy(() => import('./pages/admin/PaymentSettings').then(m => ({ default: m.PaymentSettings })));
const AdminPickupLocations = lazy(() => import('./pages/AdminPickupLocations').catch(err => {
  console.error('Failed to load AdminPickupLocations:', err);
  return { default: () => null };
}));
const VoucherManagement = lazy(() => import('./pages/admin/VoucherManagement').then(m => ({ default: m.VoucherManagement })).catch(err => {
  console.error('Failed to load VoucherManagement:', err);
  return { default: () => null };
}));

// System Health Check - Lazy load
const SystemHealthCheck = lazy(() => import('./pages/admin/SystemHealthCheck').then(m => ({ default: m.SystemHealthCheck })).catch(err => {
  console.error('Failed to load SystemHealthCheck:', err);
  return { default: () => null };
}));
const DatabaseDiagnostics = lazy(() => import('./pages/admin/DatabaseDiagnostics').then(m => ({ default: m.DatabaseDiagnostics })).catch(err => {
  console.error('Failed to load DatabaseDiagnostics:', err);
  return { default: () => null };
}));
const FaviconSitemapTest = lazy(() => import('./pages/admin/FaviconSitemapTest').catch(err => {
  console.error('Failed to load FaviconSitemapTest:', err);
  return { default: () => null };
}));

console.log('📍 routes.ts: Creating router...');

export const router = createBrowserRouter(
  [
  {
    path: '/',
    Component: ProviderWrapper,
    children: [
      {
        path: '/',
        Component: RootLayout,
        children: [
          { index: true, Component: Home },
          { path: 'products', Component: Products },
          { path: 'products/c/:categorySlug', Component: Products },
          { path: 'products/:id', Component: ProductDetail },
          { path: 'brands', Component: Brands },
          { path: 'brands/:brandName', Component: Brands },
          { path: 'promotions', Component: Promotions },
          { path: 'cart', Component: Cart },
          { path: 'checkout', Component: Checkout },
          { path: 'order/:orderId', Component: OrderConfirmation },
          { path: 'order-confirmation', Component: OrderConfirmation },
          { path: 'about', Component: About },
          { path: 'contact', Component: Contact },
          { path: 'delivery-information', Component: DeliveryInformation },
          { path: 'terms-and-conditions', Component: TermsAndConditions },
          { path: 'return-refund-policy', Component: ReturnRefundPolicy },
          { path: 'privacy-policy', Component: PrivacyPolicy },
          { path: 'provider-test', Component: ProviderTest },
          { path: 'email-test', Component: EmailTest },
          { path: 'product-query', Component: ProductQuery },
          { path: 'db-diagnostic', Component: DbDiagnostic },
          { path: '*', Component: NotFound },
        ],
      },
      {
        path: 'admin/login',
        Component: AdminLogin,
      },
      {
        path: 'admin',
        Component: CMSLoadingWrapper,
        children: [
          {
            path: '',
            Component: AdminLayout,
            children: [
              { index: true, Component: AdminDashboard },
              { path: 'products', Component: ProductsManager },
              { path: 'products-virtualized', Component: ProductsVirtualized },
              { path: 'featured-products', Component: FeaturedProducts },
              { path: 'sections-manager', Component: SectionsManager },
              { path: 'promotional-pricing', Component: PromotionalPricing },
              { path: 'categories', Component: CategoriesManager },
              { path: 'debug-categories', Component: DebugCategories },
              { path: 'debug-products', Component: DebugProducts },
              { path: 'age-restricted-products', Component: AgeRestrictedProducts },
              { path: 'orders', Component: OrdersManager },
              { path: 'customers', Component: CustomersManager },
              { path: 'quotations', Component: Quotations },
              { path: 'quotations/create', Component: CreateQuotation },
              { path: 'quotations/:id', Component: QuotationDetail },
              { path: 'invoices', Component: Invoices },
              { path: 'invoices/create', Component: CreateInvoice },
              { path: 'invoices/:id', Component: InvoiceDetail },
              { path: 'analytics', Component: Reports },
              { path: 'advanced-reports', Component: ReportsAdvanced },
              { path: 'returns-management', Component: ReturnsManagement },
              { path: 'returns/:id', Component: ReturnDetail },
              { path: 'payment-settings', Component: PaymentSettings },
              { path: 'pickup-locations', Component: AdminPickupLocations },
              { path: 'vouchers', Component: VoucherManagement },
              { path: 'header', Component: HeaderEditor },
              { path: 'footer', Component: FooterEditor },
              { path: 'about', Component: AboutEditor },
              { path: 'homepage', Component: HomepageEditor },
              { path: 'banners', Component: BannersManager },
              { path: 'menu-brands', Component: MenuBrandsManager },
              { path: 'company-settings', Component: CompanySettings },
              { path: 'email-settings', Component: EmailSettings },
              { path: 'pricing-tiers', Component: PricingTiers },
              { path: 'profit-margin-settings', Component: ProfitMarginSettings },
              { path: 'uropa-token-auth', Component: UropaTokenAuth },
              { path: 'uropa-price-sync', Component: UropaPriceSync },
              { path: 'description-sync', Component: DescriptionSync },
              { path: 'image-scraper', Component: ImageScraper },
              { path: 'specials', Component: SpecialsManager },
              { path: 'debug-product', Component: DebugProduct },
              { path: 'price-debug', Component: PriceDebug },
              { path: 'seo-manager', Component: SEOManager },
              { path: 'ai-chatbot', Component: AIChatbotSettings },
              { path: 'legal-pages', Component: LegalPagesManager },
              { path: 'settings', Component: Settings },
              { path: 'diagnostics', Component: Diagnostics },
              { path: 'email-diagnostics', Component: EmailDiagnostics },
              { path: 'import-products', Component: ImportProducts },
              { path: 'import-categories', Component: ImportCategories },
              { path: 'system-health-check', Component: SystemHealthCheck },
              { path: 'database-diagnostics', Component: DatabaseDiagnostics },
              { path: 'favicon-sitemap-test', Component: FaviconSitemapTest },
            ],
          },
        ],
      },
      {
        path: 'customer/login',
        Component: CustomerLogin,
      },
      {
        path: 'customer/dashboard',
        Component: CustomerDashboard,
      },
      {
        path: 'customer/forgot-password',
        Component: ForgotPassword,
      },
      {
        path: 'customer/reset-password',
        Component: ResetPassword,
      },
      {
        path: 'customer/change-password',
        Component: ChangePassword,
      },
    ],
  },
],
{
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
});

console.log('📍 routes.ts: Router created successfully');