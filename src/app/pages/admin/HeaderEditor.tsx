import { useState } from 'react';
import { useCMS } from '../../context/CMSContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Save, Plus, Trash2, Upload, Eye, EyeOff, ChevronUp, ChevronDown, Image } from 'lucide-react';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notifications';

// Default Costplus100 logo as inline SVG data URL
const defaultLogoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHJ4PSI4IiBmaWxsPSIjRTMxODM3Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1NCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IndoaXRlIj5DKzEwMDwvdGV4dD4KPC9zdmc+';

export function HeaderEditor() {
  let data, updateHeader;
  try {
    const cms = useCMS();
    data = cms.data;
    updateHeader = cms.updateHeader;
  } catch (e) {
    logger.error('HeaderEditor: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    updateHeader = async () => {};
  }

  // Normalize navigation to ensure it's an array
  const normalizeNavigation = (nav: any[]) => {
    logger.debug('Normalizing navigation data', { count: nav?.length });
    
    if (!nav || !Array.isArray(nav)) {
      logger.warn('Navigation is not an array, returning empty array');
      return [];
    }

    const normalized = nav.map(item => ({
      label: item.label || item.name || '',
      href: item.href || item.url || item.link || '/',
    }));
    
    logger.debug('Normalized navigation', { count: normalized.length });
    return normalized;
  };

  // Initialize state with normalized data
  const [header, setHeader] = useState(() => {
    logger.debug('Initializing header state', data.header);
    const normalized = {
      logo: data.header?.logo || '',
      phone: data.header?.phone || '',
      workingHours: data.header?.workingHours || '',
      navigation: normalizeNavigation(data.header?.navigation || []),
    };
    logger.debug('Normalized header', normalized);
    return normalized;
  });

  const [uploading, setUploading] = useState(false);

  const handleSave = () => {
    logger.debug('Saving header', header);
    updateHeader(header).then(() => {
      notify.success('Header settings saved successfully!');
    }).catch((error) => {
      logger.error('Failed to save header', error);
      notify.error('Failed to save header', error.message);
    });
  };

  const addNavItem = () => {
    const maxOrder = Math.max(0, ...header.navigation.map(item => item.order || 0));
    setHeader({
      ...header,
      navigation: [...header.navigation, { 
        label: 'New Link', 
        href: '/new', 
        enabled: true,
        order: maxOrder + 1
      }]
    });
  };

  const updateNavItem = (index: number, field: 'label' | 'href', value: string) => {
    const newNav = [...header.navigation];
    newNav[index] = { ...newNav[index], [field]: value };
    setHeader({ ...header, navigation: newNav });
  };

  const toggleNavItemEnabled = (index: number) => {
    const newNav = [...header.navigation];
    newNav[index] = { 
      ...newNav[index], 
      enabled: newNav[index].enabled === false ? true : false 
    };
    setHeader({ ...header, navigation: newNav });
  };

  const moveNavItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === header.navigation.length - 1)
    ) {
      return;
    }

    const newNav = [...header.navigation];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [newNav[index], newNav[targetIndex]] = [newNav[targetIndex], newNav[index]];
    
    // Update order values
    newNav.forEach((item, i) => {
      item.order = i;
    });
    
    setHeader({ ...header, navigation: newNav });
  };

  const deleteNavItem = (index: number) => {
    setHeader({
      ...header,
      navigation: header.navigation.filter((_, i) => i !== index)
    });
  };

  const handleLogoUrlChange = (url: string) => {
    setHeader({ ...header, logoUrl: url });
  };

  const resetToDefaultLogo = () => {
    setHeader({ ...header, logoUrl: defaultLogoUrl });
  };

  const logoUrl = header.logoUrl || defaultLogoUrl;

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    // Validate file size (max 2MB for logo)
    if (file.size > 2 * 1024 * 1024) {
      notify.warning('File Too Large', 'Logo file size must be less than 2MB');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      notify.warning('Invalid File Type', 'Please select an image file');
      return;
    }
    
    setUploading(true);
    try {
      logger.debug('Converting image to base64');
      
      // Convert file to base64 directly (no server upload needed!)
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        logger.debug('Image converted to base64', { length: dataUrl.length });
        
        // Set the logo URL to the base64 data URL
        handleLogoUrlChange(dataUrl);
        setUploading(false);
        notify.success('Logo loaded successfully!', 'Click "Save Changes" to save.');
      };
      
      reader.onerror = () => {
        logger.error('Failed to read file');
        notify.error('Failed to read image file');
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      logger.error('Logo upload error', error);
      notify.error('Failed to load logo', error instanceof Error ? error.message : 'Unknown error');
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl mb-2">Header Editor</h1>
          <p className="text-muted-foreground">Customize your site header and navigation</p>
        </div>
        <Button onClick={handleSave} size="lg">
          <Save className="size-5 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block font-medium">Current Logo</label>
                <div className="border rounded-lg p-4 bg-white flex items-center justify-center mb-3">
                  <img 
                    src={logoUrl} 
                    alt="Logo preview" 
                    className="h-16 w-auto object-contain"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm mb-2 block font-medium">Logo URL</label>
                <div className="flex gap-2">
                  <Input
                    value={header.logoUrl || ''}
                    onChange={(e) => handleLogoUrlChange(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={resetToDefaultLogo}
                    title="Reset to default logo"
                  >
                    <Image className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a URL to your logo image or leave empty to use the default
                </p>
              </div>

              <div>
                <label className="text-sm mb-2 block font-medium">Logo Alt Text</label>
                <Input
                  value={header.logo}
                  onChange={(e) => setHeader({ ...header, logo: e.target.value })}
                  placeholder="CostPlus100"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alternative text for accessibility
                </p>
              </div>

              <div>
                <label className="text-sm mb-2 block font-medium">Upload Logo</label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="flex-1"
                  />
                  {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block">Phone Number</label>
                <Input
                  value={header.phone}
                  onChange={(e) => setHeader({ ...header, phone: e.target.value })}
                  placeholder="1-800-CATER-PRO"
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Working Hours</label>
                <Input
                  value={header.workingHours}
                  onChange={(e) => setHeader({ ...header, workingHours: e.target.value })}
                  placeholder="Mon-Fri: 8:00 AM - 6:00 PM EST"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Navigation Menu</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Drag to reorder, toggle visibility, or remove items
                  </p>
                </div>
                <Button onClick={addNavItem} size="sm">
                  <Plus className="size-4 mr-2" />
                  Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {header.navigation.map((item, index) => {
                const isEnabled = item.enabled !== false; // Default to true if not set
                return (
                  <div 
                    key={index} 
                    className={`flex gap-2 p-3 rounded-lg border-2 transition-colors ${
                      isEnabled 
                        ? 'bg-white border-slate-200' 
                        : 'bg-slate-50 border-slate-300 opacity-60'
                    }`}
                  >
                    {/* Sort Controls */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveNavItem(index, 'up')}
                        disabled={index === 0}
                        className="h-5 w-8 p-0"
                        title="Move up"
                      >
                        <ChevronUp className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveNavItem(index, 'down')}
                        disabled={index === header.navigation.length - 1}
                        className="h-5 w-8 p-0"
                        title="Move down"
                      >
                        <ChevronDown className="size-3" />
                      </Button>
                    </div>

                    {/* Inputs */}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={item.label}
                        onChange={(e) => updateNavItem(index, 'label', e.target.value)}
                        placeholder="Menu Label"
                        className="text-sm"
                      />
                      <Input
                        value={item.href}
                        onChange={(e) => updateNavItem(index, 'href', e.target.value)}
                        placeholder="/path"
                        className="text-sm"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant={isEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleNavItemEnabled(index)}
                        className="px-2"
                        title={isEnabled ? "Hide from menu" : "Show in menu"}
                      >
                        {isEnabled ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNavItem(index)}
                        className="px-2"
                        title="Delete"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {header.navigation.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No navigation items. Click "Add Link" to create one.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {/* Top Bar */}
                <div className="bg-slate-900 text-white text-sm p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="text-xs">{header.phone}</span>
                      <span className="text-xs hidden sm:inline">{header.workingHours}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span>About</span>
                      <span>Contact</span>
                    </div>
                  </div>
                </div>

                {/* Main Header */}
                <div className="bg-white p-4 border-b">
                  <div className="flex items-center gap-4">
                    <div className="border rounded p-2 bg-white">
                      <img 
                        src={logoUrl} 
                        alt={header.logo} 
                        className="h-8 w-auto object-contain"
                      />
                    </div>
                    <div className="flex-1 text-xs text-muted-foreground border rounded px-3 py-1.5">
                      🔍 Search bar...
                    </div>
                    <div className="text-xs bg-slate-100 px-3 py-1.5 rounded">
                      🛒 Cart
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="bg-slate-50 p-2 border-b">
                  <div className="flex flex-wrap gap-1">
                    {header.navigation
                      .filter(item => item.enabled !== false)
                      .slice(0, 5)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="px-2 py-1 text-xs bg-white rounded border"
                        >
                          {item.label}
                        </div>
                      ))}
                    {header.navigation.filter(item => item.enabled !== false).length > 5 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        +{header.navigation.filter(item => item.enabled !== false).length - 5} more
                      </div>
                    )}
                    {header.navigation.filter(item => item.enabled !== false).length === 0 && (
                      <div className="px-2 py-1 text-xs text-muted-foreground">
                        No enabled menu items
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}