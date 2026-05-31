import { useCMS } from '../../context/CMSContext';
import { useAdmin } from '../../context/AdminContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { AlertTriangle, Database, User, Mail, Power, PowerOff, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function Settings() {
  // ✅ Safe access to CMS context with fallback
  let data, initializeData;
  try {
    const cms = useCMS();
    data = cms.data;
    initializeData = cms.initializeData;
  } catch (e) {
    console.error('Settings: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    initializeData = async () => {};
  }
  
  const { logout, user } = useAdmin();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('We are currently performing scheduled maintenance. Please check back soon!');
  const [loading, setLoading] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(true);

  // Cost+$100 Universal Pricing toggle
  const [costPlusUniversalEnabled, setCostPlusUniversalEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('costplus100_universal_pricing_enabled');
    if (saved === 'false') {
      setCostPlusUniversalEnabled(false);
    }
  }, []);

  const toggleCostPlusUniversal = () => {
    const newValue = !costPlusUniversalEnabled;
    localStorage.setItem('costplus100_universal_pricing_enabled', newValue ? 'true' : 'false');
    setCostPlusUniversalEnabled(newValue);
  };

  // Fetch current maintenance mode status
  useEffect(() => {
    fetchMaintenanceMode();
  }, []);

  const fetchMaintenanceMode = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/maintenance`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.enabled || false);
        setMaintenanceMessage(data.message || 'We are currently performing scheduled maintenance. Please check back soon!');
      }
    } catch (error) {
      console.error('Failed to fetch maintenance mode:', error);
    } finally {
      setLoadingFetch(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!confirm(`Are you sure you want to ${maintenanceMode ? 'disable' : 'enable'} maintenance mode?`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('Sending maintenance mode update request...');
      console.log('URL:', `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/maintenance`);
      console.log('Payload:', { enabled: !maintenanceMode, message: maintenanceMessage });
      console.log('API Key:', publicAnonKey.substring(0, 20) + '...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/maintenance`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-API-Key': publicAnonKey,
          },
          body: JSON.stringify({
            enabled: !maintenanceMode,
            message: maintenanceMessage,
          }),
        }
      );

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || `Server returned ${response.status}`);
      }

      setMaintenanceMode(!maintenanceMode);
      alert(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('Failed to update maintenance mode:', error);
      alert(`Failed to update maintenance mode. Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReinitialize = async () => {
    if (confirm('Are you sure you want to reinitialize the database with default data? This will overwrite existing content.')) {
      try {
        await initializeData();
        alert('Database reinitialized successfully!');
        window.location.reload();
      } catch (error) {
        alert('Failed to reinitialize database. Check console for errors.');
        console.error(error);
      }
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your CMS configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Mode - FEATURED */}
        <Card className={maintenanceMode ? 'border-amber-500 border-2' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {maintenanceMode ? <PowerOff className="size-5 text-amber-600" /> : <Power className="size-5" />}
              Maintenance Mode
            </CardTitle>
            <CardDescription>Temporarily disable the site for regular users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingFetch ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            ) : (
              <>
                <div className={`p-4 rounded border ${maintenanceMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium mb-1">Status</p>
                      <p className={`text-sm ${maintenanceMode ? 'text-amber-700' : 'text-green-700'}`}>
                        {maintenanceMode ? '🔧 Maintenance Active' : '✅ Site Online'}
                      </p>
                    </div>
                    <Button
                      onClick={toggleMaintenanceMode}
                      disabled={loading}
                      variant={maintenanceMode ? 'default' : 'outline'}
                      className={maintenanceMode ? 'bg-green-600 hover:bg-green-700' : 'border-amber-500 text-amber-700 hover:bg-amber-50'}
                    >
                      {loading ? 'Updating...' : maintenanceMode ? 'Enable Site' : 'Enable Maintenance'}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Maintenance Message</label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="w-full p-3 border rounded min-h-[100px] text-sm"
                    placeholder="Enter the message to display to users during maintenance..."
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    This message will be shown to users when maintenance mode is enabled.
                  </p>
                </div>

                {maintenanceMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                    <strong>ℹ️ Admin Access:</strong> You can still access the admin panel while maintenance mode is active.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Cost+$100 Universal Pricing Toggle */}
        <Card className={costPlusUniversalEnabled ? 'border-purple-500 border-2' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className={`size-5 ${costPlusUniversalEnabled ? 'text-purple-600' : 'text-slate-400'}`} />
              Cost+$100 Universal Pricing
            </CardTitle>
            <CardDescription>Show Cost+$100 price to all customers for items $500–$10,000</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 rounded border ${costPlusUniversalEnabled ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium mb-1">Status</p>
                  <p className={`text-sm ${costPlusUniversalEnabled ? 'text-purple-700' : 'text-slate-500'}`}>
                    {costPlusUniversalEnabled ? '✅ Showing to all customers' : '⏸ Only VIP customers'}
                  </p>
                </div>
                <Button
                  onClick={toggleCostPlusUniversal}
                  variant={costPlusUniversalEnabled ? 'default' : 'outline'}
                  className={costPlusUniversalEnabled ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-400 text-purple-700 hover:bg-purple-50'}
                >
                  {costPlusUniversalEnabled ? 'Turn Off' : 'Turn On'}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• <strong>$500 – $10,000:</strong> Shows Cost+$100 price to every visitor</p>
              <p>• <strong>Above $10,000:</strong> Shows "Call for Quote" instead of price</p>
              <p>• <strong>Below $500:</strong> Shows regular price as usual</p>
            </div>
            {!costPlusUniversalEnabled && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
                <strong>⚠️ Off:</strong> Only customers with explicit Cost+$100 permission will see the special price.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your admin account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
              <User className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p>{user?.user_metadata?.name || 'Admin User'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded">
              <Mail className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p>{user?.email || 'N/A'}</p>
              </div>
            </div>
            <div className="pt-3 border-t">
              <Button onClick={logout} variant="outline" className="w-full">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Products</span>
              <span>{data.products.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categories</span>
              <span>{data.categories.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Navigation Items</span>
              <span>{data.header.navigation.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Storage Type</span>
              <span className="flex items-center gap-2">
                <Database className="size-4" />
                Supabase Database
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Database Management */}
        <Card>
          <CardHeader>
            <CardTitle>Database Management</CardTitle>
            <CardDescription>Manage your database content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded p-4">
              <div className="flex gap-2">
                <AlertTriangle className="size-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-900">
                  <p className="mb-2"><strong>Reinitialize Database</strong></p>
                  <p className="text-xs mb-3">This will restore default products, categories, and settings. Your current data will be overwritten.</p>
                  <Button 
                    onClick={handleReinitialize} 
                    variant="outline"
                    size="sm"
                    className="border-amber-300 hover:bg-amber-100"
                  >
                    Reinitialize with Defaults
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About CMS</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>CaterPro Content Management System</p>
            <p>Version: 2.0.0 (Database Edition)</p>
            <p>Backend: Supabase + Edge Functions</p>
            <p>Authentication: Supabase Auth</p>
            <div className="pt-4 border-t">
              <p className="text-xs">
                <strong>Note:</strong> All data is stored securely in your Supabase database. 
                Changes are automatically synced and accessible from any device.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}