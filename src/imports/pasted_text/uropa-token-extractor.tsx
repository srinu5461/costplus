/**
 * UROPA API TOKEN EXTRACTOR
 * Helps extract and save Uropa API authentication credentials
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Key, Shield, CheckCircle2, AlertCircle, Rocket, Database, Tag, Settings, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '@/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-577b3f26`;

export default function UropaTokenExtractor() {
  const navigate = useNavigate();
  const [manualToken, setManualToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [currentTokenInfo, setCurrentTokenInfo] = useState<string | null>(null);

  // Save token
  const handleSaveToken = async () => {
    if (!manualToken.trim()) {
      toast.error('Please enter a token');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/uropa-api/save-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: manualToken.trim() })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`✅ Token saved! (${data.length} characters)`);
        setTestResult({ success: true, message: `Token saved to database (${data.length} characters). Preview: ${data.preview}` });
        setCurrentTokenInfo(manualToken.trim());
      } else {
        toast.error(`Failed to save: ${data.error}`);
        setTestResult({ success: false, message: data.error });
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Error: ${error.message}`);
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Test current credentials
  const handleTestCredentials = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const response = await fetch(`${API_URL}/uropa-api/test-credentials`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Credentials are working!');
        setTestResult({ success: true, message: `Successfully fetched product: ${data.testProduct?.code || 'test product'}` });
      } else {
        // Check for specific error types
        const errorMsg = data.error || 'Unknown error';
        const isTokenError = errorMsg.includes('InvalidToken') || 
                           errorMsg.includes('Invalid access token') ||
                           errorMsg.includes('token') ||
                           data.status === 401;
        
        if (isTokenError) {
          toast.error('🔴 Token expired or invalid!');
          setTestResult({ 
            success: false, 
            message: '❌ TOKEN EXPIRED OR INVALID\n\n' +
                    '🔄 Your Uropa token has expired (tokens expire after ~30 minutes).\n\n' +
                    '📝 To fix:\n' +
                    '1. Go to https://www.nisbets.com.au\n' +
                    '2. Browse any product category\n' +
                    '3. Open DevTools (F12) → Network tab\n' +
                    '4. Find "search?query=:relevance" request\n' +
                    '5. Copy the COMPLETE "authorization" header value\n' +
                    '6. Paste it below and click "Save Token"\n\n' +
                    `Error details: ${errorMsg}`
          });
        } else {
          toast.error('❌ Credentials failed');
          setTestResult({ success: false, message: errorMsg });
        }
      }
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(`Error: ${error.message}`);
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-slate-800 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                <Key className="w-7 h-7" />
                Uropa API Token Manager
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Save and test authentication credentials for Uropa API
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Quick Links to Uropa Tools */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Rocket className="w-6 h-6" />
            Uropa-Powered Tools
          </h2>
          <p className="text-slate-200 text-sm mb-4">
            Once your token is saved and working, you can use these tools:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/admin/price-sync')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-blue-500 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Price Sync Manager</div>
                <div className="text-xs text-slate-300">Automated price updates</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/scraper')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-green-500 p-2 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Product Scraper CSV</div>
                <div className="text-xs text-slate-300">Bulk import products</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/category-scraper')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-purple-500 p-2 rounded-lg">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Category Scraper CSV</div>
                <div className="text-xs text-slate-300">Import entire categories</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/uropa-scraper')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-orange-500 p-2 rounded-lg">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Uropa Scraper Tool</div>
                <div className="text-xs text-slate-300">Advanced scraping</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/uropa-scraper-simple')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-cyan-500 p-2 rounded-lg">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Uropa Scraper Simple</div>
                <div className="text-xs text-slate-300">Quick product import</div>
              </div>
            </button>
            
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-3 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-left border border-white/20"
            >
              <div className="bg-red-500 p-2 rounded-lg">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Admin Dashboard</div>
                <div className="text-xs text-slate-300">Back to admin panel</div>
              </div>
            </button>
          </div>
        </div>

        {/* Test Current Credentials */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Test Current Token
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Test if your currently saved token is working with the Uropa API.
          </p>
          <button
            onClick={handleTestCredentials}
            disabled={isSaving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {isSaving ? 'Testing...' : '🔌 Test API'}
          </button>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border-2 ${
              testResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </p>
                  {testResult.success && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="text-sm text-green-900 font-semibold mb-2">✅ Token is working! You can now use:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => navigate('/admin/price-sync')}
                          className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Price Sync Manager
                        </button>
                        <button
                          onClick={() => navigate('/scraper')}
                          className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                        >
                          <Database className="w-4 h-4" />
                          Product Scraper
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 How to Get Fresh Token
          </h2>
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 mb-4">
            <p className="text-yellow-900 font-bold text-sm">
              ⚠️ IMPORTANT: The token should be LONG (100+ characters). If it's short like "Bearer NuZAU7toMXeWcTy5PO4F6HFRx7E", it's incomplete or invalid!
            </p>
            <p className="text-yellow-900 text-sm mt-2">
              A valid token looks like: <code className="bg-white px-1 rounded text-xs">Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ...</code> (very long!)
            </p>
          </div>
          <ol className="space-y-3 text-sm text-blue-900">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <div>
                <strong>Open Nisbets website:</strong> Go to{' '}
                <a 
                  href="https://www.nisbets.com.au" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-mono"
                >
                  https://www.nisbets.com.au
                </a>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <div>
                <strong>Open DevTools:</strong> Press <kbd className="px-2 py-1 bg-white rounded border border-blue-300 font-mono">F12</kbd> or right-click → Inspect
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <div>
                <strong>Go to Network tab:</strong> Click "Network" in DevTools
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">4.</span>
              <div>
                <strong>Clear network log:</strong> Click the 🚫 (clear) button in Network tab
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">5.</span>
              <div>
                <strong>Browse a category:</strong> On the Nisbets website, click ANY product category (e.g., "Cookware")
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">6.</span>
              <div>
                <strong>Find API request:</strong> In Network tab, look for a request starting with:
                <code className="block mt-1 p-2 bg-white rounded border border-blue-300 font-mono text-xs">
                  search?query=:relevance
                </code>
                <p className="mt-1 text-xs text-blue-700">
                  💡 TIP: Use the filter box and type "search" to find it faster
                </p>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">7.</span>
              <div>
                <strong>Copy the FULL token:</strong>
                <ul className="mt-1 space-y-1 ml-4">
                  <li>• Click on the "search?query=:relevance" request</li>
                  <li>• Click "Headers" tab on the right</li>
                  <li>• Scroll down to "Request Headers"</li>
                  <li>• Find <code className="bg-white px-1 rounded">authorization:</code></li>
                  <li>• <strong className="text-red-600">SELECT AND COPY THE ENTIRE VALUE</strong> (should be very long!)</li>
                  <li>• It should start with <code className="bg-white px-1 rounded">Bearer eyJ...</code></li>
                </ul>
              </div>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">8.</span>
              <div>
                <strong>Paste below:</strong> Paste the COMPLETE token in the field below and click "Save Token"
              </div>
            </li>
          </ol>
        </div>

        {/* Save Token */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            🔑 Save Bearer Token
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Paste the <code className="bg-gray-100 px-2 py-0.5 rounded">Authorization</code> header value:
          </p>
          
          <textarea
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            rows={4}
          />

          <button
            onClick={handleSaveToken}
            disabled={isSaving || !manualToken.trim()}
            className="mt-4 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
          >
            {isSaving ? 'Saving...' : '💾 Save Token'}
          </button>
        </div>
      </div>
    </div>
  );
}