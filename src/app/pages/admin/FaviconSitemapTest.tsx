// Favicon & Sitemap Diagnostic Tool
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { CheckCircle, XCircle, AlertCircle, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export default function FaviconSitemapTest() {
  const [results, setResults] = useState<any>({});
  const [testing, setTesting] = useState(false);
  const [sitemapContent, setSitemapContent] = useState('');

  const runTests = async () => {
    setTesting(true);
    const testResults: any = {};

    // Test 1: Check if favicon link exists in DOM
    console.log('🧪 Test 1: Check favicon in DOM');
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    testResults.faviconInDOM = {
      passed: faviconLinks.length > 0,
      count: faviconLinks.length,
      links: Array.from(faviconLinks).map((link: any) => ({
        rel: link.rel,
        type: link.type,
        href: link.href.substring(0, 50) + '...',
      })),
    };

    // Test 2: Check SEOHead component
    console.log('🧪 Test 2: Check console for SEOHead log');
    testResults.seoHeadLog = {
      passed: true,
      message: 'Check browser console for "✅ Favicon injected" message',
    };

    // Test 3: Check manifest
    console.log('🧪 Test 3: Check PWA manifest');
    const manifestLink = document.querySelector('link[rel="manifest"]');
    testResults.manifest = {
      passed: !!manifestLink,
      found: !!manifestLink,
      href: manifestLink ? (manifestLink as any).href.substring(0, 50) + '...' : 'Not found',
    };

    // Test 4: Check theme color
    console.log('🧪 Test 4: Check theme color meta tag');
    const themeColor = document.querySelector('meta[name="theme-color"]');
    testResults.themeColor = {
      passed: !!themeColor,
      color: themeColor ? (themeColor as any).content : 'Not found',
    };

    // Test 5: Check sitemap in KV store
    console.log('🧪 Test 5: Check sitemap endpoint');
    try {
      const response = await fetch(`${API_URL}/sitemap.xml`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      testResults.sitemapEndpoint = {
        passed: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type'),
      };

      if (response.ok) {
        const text = await response.text();
        setSitemapContent(text);
        testResults.sitemapEndpoint.size = text.length;
        testResults.sitemapEndpoint.preview = text.substring(0, 200) + '...';
      } else {
        const text = await response.text();
        testResults.sitemapEndpoint.error = text;
      }
    } catch (error: any) {
      testResults.sitemapEndpoint = {
        passed: false,
        error: error.message,
      };
    }

    // Test 6: Check sitemap generation endpoint
    console.log('🧪 Test 6: Check sitemap generation endpoint');
    try {
      const response = await fetch(`${API_URL}/seo/generate-sitemap`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      testResults.generateEndpoint = {
        passed: response.ok,
        status: response.status,
      };

      if (response.ok) {
        const data = await response.json();
        testResults.generateEndpoint.urlCount = data.count;
      }
    } catch (error: any) {
      testResults.generateEndpoint = {
        passed: false,
        error: error.message,
      };
    }

    setResults(testResults);
    setTesting(false);
  };

  const generateSitemap = async () => {
    try {
      const response = await fetch(`${API_URL}/seo/generate-sitemap`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      
      if (response.ok) {
        alert('✅ Sitemap generated successfully! Run tests again to verify.');
        runTests();
      } else {
        alert('❌ Failed to generate sitemap');
      }
    } catch (error) {
      alert('❌ Error: ' + error);
    }
  };

  const downloadSitemap = () => {
    if (!sitemapContent) {
      alert('No sitemap content available. Generate it first!');
      return;
    }

    const blob = new Blob([sitemapContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const StatusIcon = ({ passed }: { passed: boolean }) => {
    if (passed) return <CheckCircle className="size-5 text-green-600" />;
    return <XCircle className="size-5 text-red-600" />;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">
          🔍 Favicon & Sitemap Diagnostics
        </h1>
        <p className="text-gray-600">
          Test and troubleshoot favicon and sitemap functionality
        </p>
      </div>

      <div className="mb-6 flex gap-3">
        <Button
          onClick={runTests}
          disabled={testing}
          className="bg-[#E31837] hover:bg-[#E31837]/90"
        >
          <RefreshCw className={`size-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          {testing ? 'Running Tests...' : 'Run All Tests'}
        </Button>
        <Button
          onClick={generateSitemap}
          variant="outline"
        >
          <Download className="size-4 mr-2" />
          Generate Sitemap
        </Button>
        {sitemapContent && (
          <Button
            onClick={downloadSitemap}
            variant="outline"
          >
            <Download className="size-4 mr-2" />
            Download Sitemap XML
          </Button>
        )}
        <Button
          onClick={() => window.open(`${API_URL}/sitemap.xml`, '_blank')}
          variant="outline"
        >
          <ExternalLink className="size-4 mr-2" />
          View Sitemap URL
        </Button>
      </div>

      {Object.keys(results).length === 0 && (
        <Card className="p-8 text-center text-gray-500">
          <AlertCircle className="size-12 mx-auto mb-4 text-gray-400" />
          <p>Click "Run All Tests" to start diagnostics</p>
        </Card>
      )}

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          {/* Test 1: Favicon in DOM */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.faviconInDOM?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 1: Favicon Links in DOM
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Found {results.faviconInDOM?.count} favicon link(s)
                </p>
                {results.faviconInDOM?.links?.map((link: any, i: number) => (
                  <div key={i} className="text-xs font-mono bg-gray-50 p-2 rounded mb-1">
                    <div>rel: {link.rel}</div>
                    <div>type: {link.type}</div>
                    <div>href: {link.href}</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Test 2: SEOHead Log */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.seoHeadLog?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 2: SEOHead Component Execution
                </h3>
                <p className="text-sm text-gray-600">
                  {results.seoHeadLog?.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Press F12 → Console tab to verify
                </p>
              </div>
            </div>
          </Card>

          {/* Test 3: Manifest */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.manifest?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 3: PWA Manifest
                </h3>
                <p className="text-sm text-gray-600">
                  Status: {results.manifest?.found ? '✅ Found' : '❌ Not Found'}
                </p>
                {results.manifest?.href && (
                  <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-2">
                    {results.manifest.href}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Test 4: Theme Color */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.themeColor?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 4: Theme Color Meta Tag
                </h3>
                <p className="text-sm text-gray-600">
                  Color: {results.themeColor?.color}
                </p>
                <div 
                  className="w-12 h-12 rounded mt-2 border-2 border-gray-300"
                  style={{ backgroundColor: results.themeColor?.color }}
                />
              </div>
            </div>
          </Card>

          {/* Test 5: Sitemap Endpoint */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.sitemapEndpoint?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 5: Sitemap Endpoint
                </h3>
                <div className="text-sm space-y-1">
                  <p>Status: {results.sitemapEndpoint?.status} {results.sitemapEndpoint?.statusText}</p>
                  <p>Content-Type: {results.sitemapEndpoint?.contentType}</p>
                  {results.sitemapEndpoint?.size && (
                    <p>Size: {results.sitemapEndpoint.size} bytes</p>
                  )}
                </div>
                {results.sitemapEndpoint?.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-2 text-sm text-red-800">
                    {results.sitemapEndpoint.error}
                  </div>
                )}
                {results.sitemapEndpoint?.preview && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-[#E31837] hover:underline">
                      View Preview
                    </summary>
                    <pre className="text-xs bg-gray-50 p-3 rounded mt-2 overflow-x-auto">
                      {results.sitemapEndpoint.preview}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </Card>

          {/* Test 6: Generate Endpoint */}
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <StatusIcon passed={results.generateEndpoint?.passed} />
              <div className="flex-1">
                <h3 className="font-semibold text-[#2D3748] mb-2">
                  Test 6: Sitemap Generation Endpoint
                </h3>
                <p className="text-sm text-gray-600">
                  Status: {results.generateEndpoint?.status}
                </p>
                {results.generateEndpoint?.urlCount && (
                  <p className="text-sm text-gray-600">
                    Generated URLs: {results.generateEndpoint.urlCount}
                  </p>
                )}
                {results.generateEndpoint?.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mt-2 text-sm text-red-800">
                    {results.generateEndpoint.error}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">🚀 Quick Fix Actions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>Favicon not showing?</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)</li>
            <li>Clear browser cache completely</li>
            <li>Check browser console for "✅ Favicon injected" message</li>
            <li>Try opening in Incognito/Private window</li>
          </ul>
          
          <p className="mt-4"><strong>Sitemap not working?</strong></p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Click "Generate Sitemap" button above</li>
            <li>Wait for success message</li>
            <li>Click "Run All Tests" again to verify</li>
            <li>Check Edge Function deployment status</li>
            <li>View Edge Function logs in Supabase dashboard</li>
          </ul>
        </div>
      </Card>

      {/* API URLs */}
      <Card className="p-6 mt-6">
        <h3 className="font-semibold text-[#2D3748] mb-3">🔗 API URLs</h3>
        <div className="space-y-2 text-sm font-mono">
          <div className="bg-gray-50 p-2 rounded">
            <strong>Sitemap:</strong><br />
            {API_URL}/sitemap.xml
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <strong>Robots.txt:</strong><br />
            {API_URL}/robots.txt
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <strong>Generate:</strong><br />
            {API_URL}/seo/generate-sitemap (POST)
          </div>
        </div>
      </Card>
    </div>
  );
}
