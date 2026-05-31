// SEO Manager - Admin panel for managing SEO settings
import { useState, useEffect, startTransition } from 'react';
import { Save, FileText, Search, Link, Image, Code, AlertCircle, CheckCircle, ExternalLink, Download } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';
import { toast } from 'sonner';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function SEOManager() {
  const [activeTab, setActiveTab] = useState('global');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Global SEO settings
  const [globalSEO, setGlobalSEO] = useState({
    siteName: 'Costplus100',
    siteDescription: 'Shop professional catering equipment with competitive pricing. Australia\'s trusted supplier for commercial kitchen equipment.',
    defaultKeywords: 'catering equipment, commercial kitchen, food service, hospitality supplies',
    ogImage: 'https://costplus100.com.au/og-image.jpg',
    twitterHandle: '@costplus100',
    googleSiteVerification: '',
    googleAnalyticsId: '',
    facebookPixelId: '',
  });

  // Robots.txt content
  const [robotsTxt, setRobotsTxt] = useState(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /checkout
Disallow: /cart

Sitemap: https://costplus100.com.au/sitemap.xml`
  );

  // Sitemap settings
  const [sitemapGenerated] = useState(true);

  useEffect(() => {
    loadSEOSettings();
  }, []);

  const loadSEOSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/seo/settings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setGlobalSEO(data.settings.global || globalSEO);
          setRobotsTxt(data.settings.robotsTxt || robotsTxt);
        }
      }
    } catch (error) {
      console.error('Failed to load SEO settings:', error);
    }
  };

  const saveGlobalSettings = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_URL}/seo/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ global: globalSEO, robotsTxt }),
      });

      if (response.ok) {
        setMessage('SEO settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const generateSitemap = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/seo/generate-sitemap`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Sitemap generated! ${data.count} URLs included.`);
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Sitemap generation error:', error);
      setMessage('Failed to generate sitemap');
    } finally {
      setSaving(false);
    }
  };

  const downloadSitemap = () => {
    window.open('https://costplus100.com.au/sitemap.xml', '_blank');
    toast.success('Sitemap opened — use your browser to save it.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">SEO Manager</h1>
        <p className="text-gray-600">Optimize your site for search engines and improve Google rankings</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.includes('success') || message.includes('generated') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.includes('success') || message.includes('generated') ? (
            <CheckCircle className="size-5" />
          ) : (
            <AlertCircle className="size-5" />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('global')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'global'
              ? 'text-[#E31837] border-b-2 border-[#E31837]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="size-4" />
            Global SEO
          </div>
        </button>
        <button
          onClick={() => setActiveTab('sitemap')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'sitemap'
              ? 'text-[#E31837] border-b-2 border-[#E31837]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="size-4" />
            Sitemap
          </div>
        </button>
        <button
          onClick={() => setActiveTab('robots')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'robots'
              ? 'text-[#E31837] border-b-2 border-[#E31837]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Code className="size-4" />
            Robots.txt
          </div>
        </button>
        <button
          onClick={() => setActiveTab('tips')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tips'
              ? 'text-[#E31837] border-b-2 border-[#E31837]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            SEO Tips
          </div>
        </button>
      </div>

      {/* Global SEO Settings */}
      {activeTab === 'global' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-[#2D3748] mb-6 flex items-center gap-2">
            <Search className="size-5" />
            Global SEO Settings
          </h2>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Site Name</Label>
                <Input
                  value={globalSEO.siteName}
                  onChange={(e) => setGlobalSEO({ ...globalSEO, siteName: e.target.value })}
                  placeholder="Costplus100"
                />
                <p className="text-xs text-gray-500 mt-1">Your business name</p>
              </div>

              <div>
                <Label>Twitter Handle</Label>
                <Input
                  value={globalSEO.twitterHandle}
                  onChange={(e) => setGlobalSEO({ ...globalSEO, twitterHandle: e.target.value })}
                  placeholder="@costplus100"
                />
                <p className="text-xs text-gray-500 mt-1">For Twitter card metadata</p>
              </div>
            </div>

            <div>
              <Label>Default Site Description</Label>
              <Textarea
                value={globalSEO.siteDescription}
                onChange={(e) => setGlobalSEO({ ...globalSEO, siteDescription: e.target.value })}
                rows={3}
                placeholder="Describe your business for search engines..."
              />
              <p className="text-xs text-gray-500 mt-1">Used when specific page description is not set (150-160 characters ideal)</p>
            </div>

            <div>
              <Label>Default Keywords</Label>
              <Input
                value={globalSEO.defaultKeywords}
                onChange={(e) => setGlobalSEO({ ...globalSEO, defaultKeywords: e.target.value })}
                placeholder="keyword1, keyword2, keyword3"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated keywords for your business</p>
            </div>

            <div>
              <Label>Open Graph Image URL</Label>
              <Input
                value={globalSEO.ogImage}
                onChange={(e) => setGlobalSEO({ ...globalSEO, ogImage: e.target.value })}
                placeholder="https://costplus100.com.au/og-image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">Default image for social media sharing (1200x630px recommended)</p>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-semibold text-[#2D3748] mb-4">Analytics & Tracking</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Google Site Verification</Label>
                  <Input
                    value={globalSEO.googleSiteVerification}
                    onChange={(e) => setGlobalSEO({ ...globalSEO, googleSiteVerification: e.target.value })}
                    placeholder="google1234567890"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Google Search Console</p>
                </div>

                <div>
                  <Label>Google Analytics ID</Label>
                  <Input
                    value={globalSEO.googleAnalyticsId}
                    onChange={(e) => setGlobalSEO({ ...globalSEO, googleAnalyticsId: e.target.value })}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-xs text-gray-500 mt-1">GA4 Measurement ID</p>
                </div>

                <div>
                  <Label>Facebook Pixel ID</Label>
                  <Input
                    value={globalSEO.facebookPixelId}
                    onChange={(e) => setGlobalSEO({ ...globalSEO, facebookPixelId: e.target.value })}
                    placeholder="123456789012345"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Facebook Ads tracking</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveGlobalSettings}
                disabled={saving}
                className="bg-[#E31837] hover:bg-[#E31837]/90"
              >
                <Save className="size-4 mr-2" />
                {saving ? 'Saving...' : 'Save Global Settings'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sitemap Generator */}
      {activeTab === 'sitemap' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-[#2D3748] mb-6 flex items-center gap-2">
            <FileText className="size-5" />
            Sitemap Generator
          </h2>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What is a Sitemap?</h3>
              <p className="text-sm text-blue-800">
                A sitemap is an XML file that lists all important pages on your website. It helps Google and other search engines 
                discover and index your content faster, improving your search visibility.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-[#2D3748] mb-4">Sitemap Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Sitemap URL:</span>
                  <a
                    href="https://costplus100.com.au/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E31837] hover:underline flex items-center gap-1"
                  >
                    costplus100.com.au/sitemap.xml
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Includes:</span>
                  <span className="font-medium">13,779+ Products, Brands, Categories, Static Pages</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Status:</span>
                  <span className={sitemapGenerated ? 'text-green-600 font-medium' : 'text-gray-500'}>
                    {sitemapGenerated ? '✓ Generated' : 'Not Generated Yet'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={generateSitemap}
                disabled={saving}
                className="bg-[#E31837] hover:bg-[#E31837]/90 flex-1"
              >
                <Download className="size-4 mr-2" />
                {saving ? 'Generating...' : 'Generate Sitemap'}
              </Button>
              <Button
                onClick={downloadSitemap}
                disabled={!sitemapGenerated}
                variant="outline"
                className="flex-1"
              >
                <ExternalLink className="size-4 mr-2" />
                Download
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-900 mb-2">📌 Next Steps After Generation</h3>
              <ol className="text-sm text-amber-800 space-y-1 list-decimal list-inside">
                <li>Submit your sitemap to Google Search Console</li>
                <li>Submit to Bing Webmaster Tools</li>
                <li>Regenerate sitemap whenever you add new products or pages</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Robots.txt Editor */}
      {activeTab === 'robots' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-[#2D3748] mb-6 flex items-center gap-2">
            <Code className="size-5" />
            Robots.txt Configuration
          </h2>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">What is Robots.txt?</h3>
              <p className="text-sm text-blue-800">
                The robots.txt file tells search engines which pages they can and cannot crawl. 
                This prevents admin pages and checkout flows from appearing in search results.
              </p>
            </div>

            <div>
              <Label>Robots.txt Content</Label>
              <Textarea
                value={robotsTxt}
                onChange={(e) => setRobotsTxt(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available at: https://costplus100.com.au/robots.txt
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveGlobalSettings}
                disabled={saving}
                className="bg-[#E31837] hover:bg-[#E31837]/90"
              >
                <Save className="size-4 mr-2" />
                {saving ? 'Saving...' : 'Save Robots.txt'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Tips */}
      {activeTab === 'tips' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-[#2D3748] mb-6 flex items-center gap-2">
            <AlertCircle className="size-5" />
            SEO Best Practices & Tips
          </h2>

          <div className="space-y-6">
            <div className="border-l-4 border-green-500 bg-green-50 p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ What Google Loves</h3>
              <ul className="text-sm text-green-800 space-y-2 list-disc list-inside">
                <li><strong>Fast Loading Pages:</strong> Optimize images, minimize JavaScript</li>
                <li><strong>Mobile-Friendly Design:</strong> Responsive layout that works on all devices</li>
                <li><strong>Quality Content:</strong> Detailed product descriptions with relevant keywords</li>
                <li><strong>Fresh Content:</strong> Regular updates, new products, blog posts</li>
                <li><strong>Secure HTTPS:</strong> SSL certificate for secure connections</li>
                <li><strong>Clean URLs:</strong> Use descriptive, keyword-rich URLs</li>
                <li><strong>Internal Linking:</strong> Link related products and categories</li>
                <li><strong>Alt Tags on Images:</strong> Describe images for accessibility and SEO</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">🎯 Product Page Optimization</h3>
              <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                <li>Use descriptive, keyword-rich product titles</li>
                <li>Write unique descriptions for each product (min 300 words)</li>
                <li>Include specifications, features, and benefits</li>
                <li>Add customer reviews and ratings</li>
                <li>Use high-quality product images with alt text</li>
                <li>Include schema markup for products (price, availability, reviews)</li>
              </ul>
            </div>

            <div className="border-l-4 border-purple-500 bg-purple-50 p-4">
              <h3 className="font-semibold text-purple-900 mb-2">📊 Essential Tools</h3>
              <div className="text-sm text-purple-800 space-y-3">
                <div>
                  <strong>Google Search Console:</strong>
                  <p>Monitor search performance, submit sitemaps, fix indexing issues</p>
                  <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[#E31837] hover:underline">
                    → Visit Google Search Console
                  </a>
                </div>
                <div>
                  <strong>Google Analytics:</strong>
                  <p>Track website traffic, user behavior, conversions</p>
                  <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-[#E31837] hover:underline">
                    → Visit Google Analytics
                  </a>
                </div>
                <div>
                  <strong>Google PageSpeed Insights:</strong>
                  <p>Test page loading speed and get optimization suggestions</p>
                  <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className="text-[#E31837] hover:underline">
                    → Test Your Site Speed
                  </a>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-amber-500 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900 mb-2">⚡ Quick Wins</h3>
              <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                <li>Add "Buy [Product Name] Online Australia" to product titles</li>
                <li>Include location keywords: "Sydney", "Melbourne", "Australia-wide"</li>
                <li>Create blog content about catering equipment tips</li>
                <li>Get backlinks from industry directories and suppliers</li>
                <li>Encourage customer reviews (great for SEO!)</li>
                <li>Share products on social media for social signals</li>
              </ul>
            </div>

            <div className="border-l-4 border-red-500 bg-red-50 p-4">
              <h3 className="font-semibold text-red-900 mb-2">❌ Avoid These Mistakes</h3>
              <ul className="text-sm text-red-800 space-y-2 list-disc list-inside">
                <li>Duplicate content across multiple pages</li>
                <li>Keyword stuffing (overusing keywords unnaturally)</li>
                <li>Thin content (pages with very little text)</li>
                <li>Broken links and 404 errors</li>
                <li>Slow loading times (over 3 seconds)</li>
                <li>Missing meta descriptions</li>
                <li>Not optimizing for mobile devices</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}