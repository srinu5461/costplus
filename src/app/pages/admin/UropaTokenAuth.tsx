import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Save,
  RefreshCw,
  Shield,
  Trash2,
  ArrowRight,
  TrendingUp,
  Database,
  Link as LinkIcon,
  Info
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Link } from 'react-router';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface UropaConfig {
  token: string;
  apiUrl: string;
  hasEnvToken: boolean;
  hasEnvApiUrl: boolean;
  lastVerified: string | null;
}

export default function UropaTokenAuth() {
  const [token, setToken] = useState('');
  const [apiUrl, setApiUrl] = useState('https://p1-api.nisbets.com.au/occ/v2/uropa-au');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState<UropaConfig | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/uropa/config`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
          setToken(data.config.token || '');
          setApiUrl(data.config.apiUrl || 'https://p1-api.nisbets.com.au/occ/v2/uropa-au');
          setSaved(true);
          
          // Auto-test the API connection if token exists
          if (data.config.token) {
            testCurrentToken(data.config.token, data.config.apiUrl);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  };

  const testCurrentToken = async (tokenToTest?: string, apiUrlToTest?: string) => {
    const testToken = tokenToTest || token;
    const testApiUrl = apiUrlToTest || apiUrl;
    
    if (!testToken) return;
    
    try {
      const response = await fetch(`${API_URL}/price-sync/test-api`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();
      console.log('API Test Result:', data);
      
      setTestResult(data);
    } catch (error) {
      console.error('Test error:', error);
      setTestResult({
        success: false,
        message: 'Failed to test API connection: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
    }
  };

  const verifyToken = async () => {
    if (!token || !apiUrl) {
      setMessage({ type: 'error', text: 'Please enter both API URL and Token' });
      return;
    }

    setVerifying(true);
    setMessage(null);
    setTestResult(null);

    try {
      const response = await fetch(`${API_URL}/uropa/verify-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, apiUrl })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Token verification failed');
      }

      const result = await response.json();
      
      if (result.valid) {
        setMessage({ 
          type: 'success', 
          text: `✅ Token verified successfully! Connected to Uropa API.` 
        });
        setTestResult({ 
          success: true, 
          message: 'Successfully connected to Uropa API. Your credentials are working correctly!' 
        });
      } else {
        setTestResult({ 
          success: false, 
          message: result.error || 'Failed to verify token' 
        });
        throw new Error(result.error || 'Invalid token');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to verify token' 
      });
    } finally {
      setVerifying(false);
    }
  };

  const saveConfig = async () => {
    if (!token || !apiUrl) {
      setMessage({ type: 'error', text: 'Please enter both API URL and Token' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/uropa/config`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token, apiUrl })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      const data = await response.json();
      setSaved(true);
      setConfig(data.config);
      setMessage({ 
        type: 'success', 
        text: `✅ Configuration saved successfully! You can now use the Price Sync feature.` 
      });
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Failed to save configuration' 
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async () => {
    if (!confirm('Are you sure you want to delete the Uropa API configuration?')) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/uropa/config`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      setToken('');
      setApiUrl('https://p1-api.nisbets.com.au/occ/v2/uropa-au');
      setConfig(null);
      setSaved(false);
      setTestResult(null);
      setMessage({ type: 'success', text: 'Configuration deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to delete configuration' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Debug token storage
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [debugging, setDebugging] = useState(false);

  const debugToken = async () => {
    setDebugging(true);
    try {
      const response = await fetch(`${API_URL}/uropa/debug-token`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      const data = await response.json();
      setDebugInfo(data.debug);
      
    } catch (error) {
      console.error('Debug error:', error);
      setMessage({ type: 'error', text: 'Failed to debug token storage' });
    } finally {
      setDebugging(false);
    }
  };

  if (loading && !config && !token) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="size-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2 flex items-center gap-3">
          <Key className="size-8" />
          Uropa API Configuration
        </h1>
        <p className="text-muted-foreground">
          Configure your Uropa API endpoint and authentication token for price synchronization
        </p>
      </div>

      {/* Status Message */}
      {message && (
        <Card className={message.type === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <CheckCircle className="size-5 text-green-600" />
              ) : (
                <AlertCircle className="size-5 text-red-600" />
              )}
              <p className={message.type === 'success' ? 'text-green-900' : 'text-red-900'}>
                {message.text}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environment Variables Info */}
      {(config?.hasEnvToken || config?.hasEnvApiUrl) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-900 font-medium">🔐 Environment Variables Detected</p>
                <p className="text-sm text-blue-700 mt-1">
                  {config.hasEnvToken && '✅ UROPA_API_TOKEN found in environment'}
                  {config.hasEnvToken && config.hasEnvApiUrl && ' • '}
                  {config.hasEnvApiUrl && '✅ UROPA_API_URL found in environment'}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Note: Manually configured values will override environment variables.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      {saved && (
        <Card className="border-slate-700 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-white">🚀 Uropa-Powered Tools</CardTitle>
            <CardDescription className="text-slate-200">
              Your API is configured! You can now use these tools:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Link to="/admin/uropa-price-sync">
                <Button 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  variant="outline"
                >
                  <div className="bg-blue-500 p-2 rounded-lg mr-3">
                    <TrendingUp className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Price Sync Manager</div>
                    <div className="text-xs text-slate-300">Compare & update prices</div>
                  </div>
                </Button>
              </Link>
              
              <Link to="/admin/products">
                <Button 
                  className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/20"
                  variant="outline"
                >
                  <div className="bg-green-500 p-2 rounded-lg mr-3">
                    <Database className="size-5" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Product Manager</div>
                    <div className="text-xs text-slate-300">Manage all products</div>
                  </div>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      {config && saved && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600" />
              <div className="flex-1">
                <p className="text-green-900 font-medium">✅ Uropa API Connected</p>
                <p className="text-sm text-green-700">
                  API URL: <code className="bg-green-100 px-2 py-0.5 rounded">{config.apiUrl}</code>
                </p>
                {config.hasEnvToken ? (
                  <p className="text-xs text-green-600 mt-1">
                    Token: 🔐 <strong>Using UROPA_API_TOKEN from environment</strong> | 
                    Last verified: {config.lastVerified ? new Date(config.lastVerified).toLocaleString() : 'Never'}
                  </p>
                ) : (
                  <p className="text-xs text-green-600 mt-1">
                    Token: <code className="bg-green-100 px-1 rounded">{token ? `${token.substring(0, 15)}...` : '(none)'}</code> | 
                    Last verified: {config.lastVerified ? new Date(config.lastVerified).toLocaleString() : 'Never'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Connection */}
      {saved && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="size-5 text-blue-600" />
              Test API Connection
            </CardTitle>
            <CardDescription>
              Test if your Uropa API credentials are working correctly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={verifyToken}
              disabled={verifying}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {verifying ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Shield className="size-4 mr-2" />
                  🔌 Test Connection
                </>
              )}
            </Button>

            {testResult && (
              <div className={`p-4 rounded-lg border-2 ${
                testResult.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  {testResult.success ? (
                    <CheckCircle className="size-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="size-5 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium whitespace-pre-line ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {testResult.message}
                    </p>
                    {testResult.success && (
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <p className="text-sm text-green-900 font-semibold mb-2">
                          ✅ Connection successful! Ready to use Price Sync
                        </p>
                        <Link to="/admin/uropa-price-sync">
                          <Button className="bg-green-600 hover:bg-green-700 mt-2">
                            <TrendingUp className="size-4 mr-2" />
                            Go to Price Sync Manager
                            <ArrowRight className="size-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Configure both the Uropa API endpoint URL and authentication token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API URL Field */}
          <div className="space-y-2">
            <Label htmlFor="apiUrl">Uropa API URL</Label>
            <div className="flex items-center gap-2">
              <LinkIcon className="size-4 text-muted-foreground flex-shrink-0" />
              <Input
                id="apiUrl"
                type="text"
                placeholder="https://api.uropa.com.au"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The base URL for the Uropa API endpoint (Default: https://p1-api.nisbets.com.au/occ/v2/uropa-au)
            </p>
          </div>

          {/* Token Field */}
          <div className="space-y-2">
            <Label htmlFor="token">API Token</Label>
            <div className="flex items-center gap-2">
              <Key className="size-4 text-muted-foreground flex-shrink-0" />
              <Input
                id="token"
                type="text"
                placeholder="Enter your Uropa API token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Your Uropa API authentication token (Bearer token)
            </p>
            {token && (
              <p className="text-xs text-blue-600 font-medium">
                Token length: {token.length} characters
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={verifyToken} 
              disabled={verifying || !token || !apiUrl}
              variant="outline"
            >
              {verifying ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Verify Credentials
                </>
              )}
            </Button>

            <Button 
              onClick={saveConfig} 
              disabled={loading || !token || !apiUrl}
              className="bg-[#E31837] hover:bg-[#E31837]/90"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  💾 {saved ? 'Update Configuration' : 'Save Configuration'}
                </>
              )}
            </Button>

            <Button 
              onClick={debugToken} 
              disabled={debugging}
              variant="secondary"
              size="sm"
            >
              {debugging ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  🔍 Debug Token Storage
                </>
              )}
            </Button>

            {config && (
              <Button 
                onClick={deleteConfig} 
                disabled={loading}
                variant="destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete
              </Button>
            )}
          </div>

          {/* Debug Info Display */}
          {debugInfo && (
            <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-300">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="size-4" />
                Debug Token Storage Info
              </h4>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-slate-700">📦 KV Storage (uropa_api_token):</p>
                  {debugInfo.kvToken?.exists ? (
                    <div className="ml-4 mt-1 bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-green-900">✅ EXISTS</p>
                      <p className="text-xs text-green-700 mt-1">Length: {debugInfo.kvToken.length} chars</p>
                      <p className="text-xs text-green-700 font-mono">{debugInfo.kvToken.preview}</p>
                    </div>
                  ) : (
                    <div className="ml-4 mt-1 bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-red-900">❌ NOT FOUND</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="font-medium text-slate-700">📦 KV Config (uropa_config_577b3f26):</p>
                  {debugInfo.kvConfig?.exists ? (
                    <div className="ml-4 mt-1 bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-green-900">✅ EXISTS</p>
                      <p className="text-xs text-green-700 mt-1">
                        Has Token: {debugInfo.kvConfig.hasToken ? '✅' : '❌'} | 
                        Has API URL: {debugInfo.kvConfig.hasApiUrl ? '✅' : '❌'}
                      </p>
                      {debugInfo.kvConfig.tokenPreview && (
                        <p className="text-xs text-green-700 font-mono mt-1">{debugInfo.kvConfig.tokenPreview}</p>
                      )}
                      {debugInfo.kvConfig.apiUrl && (
                        <p className="text-xs text-green-700 mt-1">API: {debugInfo.kvConfig.apiUrl}</p>
                      )}
                    </div>
                  ) : (
                    <div className="ml-4 mt-1 bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-red-900">❌ NOT FOUND</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <p className="font-medium text-slate-700">🌐 Environment Variable (UROPA_API_TOKEN):</p>
                  {debugInfo.envToken?.exists ? (
                    <div className="ml-4 mt-1 bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="text-blue-900">✅ EXISTS (Fallback)</p>
                      <p className="text-xs text-blue-700 mt-1">Length: {debugInfo.envToken.length} chars</p>
                      <p className="text-xs text-blue-700 font-mono">{debugInfo.envToken.preview}</p>
                    </div>
                  ) : (
                    <div className="ml-4 mt-1 bg-slate-50 p-2 rounded border border-slate-200">
                      <p className="text-slate-700">❌ NOT SET</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-300">
                  <p className="font-medium text-slate-700 mb-2">Priority Order (which token gets used):</p>
                  <ol className="ml-4 space-y-1 text-xs text-slate-600">
                    {debugInfo.priorityOrder?.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">📝 Configuration Help</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-amber-900">
          <div>
            <p className="font-semibold mb-1">🔗 API URL:</p>
            <p>The base endpoint for Uropa API. Default is usually <code className="bg-amber-100 px-2 py-0.5 rounded">https://api.uropa.com.au</code></p>
          </div>
          <div>
            <p className="font-semibold mb-1">🔑 API Token:</p>
            <p>Your authentication token provided by Uropa. This should be a short string (not the long Nisbets scraping token).</p>
          </div>
          <div className="pt-2 border-t border-amber-300">
            <p className="font-semibold mb-1">💡 Pro Tip:</p>
            <p>You can also set these as environment variables in Supabase:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><code className="bg-amber-100 px-2 py-0.5 rounded">UROPA_API_TOKEN</code> - Your API token</li>
              <li><code className="bg-amber-100 px-2 py-0.5 rounded">UROPA_API_URL</code> - Your API URL</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}