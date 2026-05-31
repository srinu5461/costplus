import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Plus, Trash2, Save, MoveUp, MoveDown, Upload, Eye, EyeOff } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface BannerSlide {
  id: string;
  image: string;
  badge: string;
  title: string;
  description: string;
  order: number;
  active?: boolean; // Add active field to control visibility
  link?: string; // ✅ NEW: Link to navigate to (brand page, category, etc)
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function BannersManager() {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Load banners on component mount
  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const url = `${API_URL}/banners`;
      console.log('=== LOADING BANNERS ===');
      console.log('URL:', url);
      console.log('Full API_URL:', API_URL);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded banners:', data);
        setBanners(data || []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch banners:', response.status);
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load banners (exception):', error);
    }
  };

  const saveBanners = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('=== SAVING BANNERS ===');
      console.log('Number of banners:', banners.length);
      
      const response = await fetch(`${API_URL}/banners`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(banners),
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        localStorage.removeItem('costplus100_homepage_data');
        localStorage.removeItem('costplus100_homepage_timestamp');
        localStorage.removeItem('costplus100_homepage_cache_version');
        setMessage('Banners saved! Homepage cache cleared — changes will appear immediately.');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorText = await response.text();
        console.error('Failed to save banners:', errorText);
        throw new Error('Failed to save');
      }
    } catch (error) {
      setMessage('Failed to save banners');
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBanner = () => {
    const newBanner: BannerSlide = {
      id: Date.now().toString(),
      image: '',
      badge: '',
      title: '',
      description: '',
      order: 0,
      active: true,
    };
    const reordered = [newBanner, ...banners].map((b, i) => ({ ...b, order: i }));
    setBanners(reordered);
  };

  const updateBanner = (id: string, field: keyof BannerSlide, value: string | boolean) => {
    setBanners(banners.map(banner => 
      banner.id === id ? { ...banner, [field]: value } : banner
    ));
  };

  const toggleBannerActive = (id: string) => {
    setBanners(banners.map(banner => 
      banner.id === id ? { ...banner, active: !banner.active } : banner
    ));
  };

  const deleteBanner = (id: string) => {
    setBanners(banners.filter(b => b.id !== id));
  };

  const cleanupInvalidBanners = () => {
    const validBanners = banners.filter(b => 
      b.image && 
      b.image.trim() !== '' && 
      !b.image.includes('placeholder') &&
      (b.image.startsWith('http') || b.image.startsWith('data:'))
    );
    
    setBanners(validBanners);
    setMessage(`Removed ${banners.length - validBanners.length} invalid banner(s). Click "Save All" to apply changes.`);
    setTimeout(() => setMessage(''), 5000);
  };

  const moveBanner = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newBanners = [...banners];
      [newBanners[index], newBanners[index - 1]] = [newBanners[index - 1], newBanners[index]];
      setBanners(newBanners.map((b, i) => ({ ...b, order: i })));
    } else if (direction === 'down' && index < banners.length - 1) {
      const newBanners = [...banners];
      [newBanners[index], newBanners[index + 1]] = [newBanners[index + 1], newBanners[index]];
      setBanners(newBanners.map((b, i) => ({ ...b, order: i })));
    }
  };

  const handleImageUpload = async (bannerId: string, file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Image size must be less than 5MB');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setUploadingImage(bannerId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/banners/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }

      const { url } = await response.json();
      updateBanner(bannerId, 'image', url);
      setMessage('Image uploaded! Click "Save All" when ready.');
      setTimeout(() => setMessage(''), 3000);
      setUploadingImage(null);

    } catch (error) {
      console.error('Image upload error:', error);
      setMessage('Failed to process image');
      setTimeout(() => setMessage(''), 5000);
      setUploadingImage(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl mb-2 font-bold">Banners Manager</h1>
          <p className="text-muted-foreground">Manage homepage banner carousel slides</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={cleanupInvalidBanners} variant="outline" className="text-orange-600 hover:text-orange-700">
            <Trash2 className="size-4 mr-2" />
            Remove Invalid
          </Button>
          <Button onClick={addBanner} variant="outline">
            <Plus className="size-4 mr-2" />
            Add Banner
          </Button>
          <Button onClick={saveBanners} disabled={loading}>
            <Save className="size-4 mr-2" />
            {loading ? 'Saving...' : 'Save All'}
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-lg ${message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {banners.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No banners yet. Add your first banner to get started.</p>
              <Button onClick={addBanner}>
                <Plus className="size-4 mr-2" />
                Add First Banner
              </Button>
            </CardContent>
          </Card>
        ) : (
          banners.map((banner, index) => (
            <Card key={banner.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">Banner {index + 1}</CardTitle>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${banner.active !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {banner.active !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleBannerActive(banner.id)}
                    className={banner.active !== false ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}
                    title={banner.active !== false ? 'Click to hide banner' : 'Click to show banner'}
                  >
                    {banner.active !== false ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveBanner(index, 'up')}
                    disabled={index === 0}
                  >
                    <MoveUp className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveBanner(index, 'down')}
                    disabled={index === banners.length - 1}
                  >
                    <MoveDown className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBanner(banner.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Image URL</label>
                    <Input
                      value={banner.image}
                      onChange={(e) => updateBanner(banner.id, 'image', e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(`file-${banner.id}`)?.click()}
                        disabled={uploadingImage === banner.id}
                      >
                        <Upload className="size-4 mr-2" />
                        {uploadingImage === banner.id ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      <input
                        type="file"
                        id={`file-${banner.id}`}
                        className="hidden"
                        onChange={(e) => handleImageUpload(banner.id, e.target.files?.[0] as File)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Badge Text</label>
                    <Input
                      value={banner.badge}
                      onChange={(e) => updateBanner(banner.id, 'badge', e.target.value)}
                      placeholder="Professional Equipment"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={banner.title}
                    onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                    placeholder="Equip Your Kitchen for Success"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    value={banner.description}
                    onChange={(e) => updateBanner(banner.id, 'description', e.target.value)}
                    placeholder="Commercial-grade catering equipment from leading brands..."
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Link URL (Shop Now Button)</label>
                  <Input
                    value={banner.link || ''}
                    onChange={(e) => updateBanner(banner.id, 'link', e.target.value)}
                    placeholder="/brands/Polar or /categories/Refrigeration"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Examples: /brands/Polar, /categories/Ovens, /products/123
                  </p>
                </div>
                {banner.image && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Preview</label>
                    <div className="relative bg-slate-100 rounded-lg overflow-hidden h-48">
                      <img 
                        src={banner.image}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#2D3748]/80 to-transparent flex items-center p-6">
                        <div>
                          {banner.badge && (
                            <span className="inline-block px-3 py-1 bg-[#E31837] text-white text-xs rounded mb-2">
                              {banner.badge}
                            </span>
                          )}
                          <h3 className="text-white text-xl font-bold mb-1">{banner.title || 'Banner Title'}</h3>
                          <p className="text-white/80 text-sm">{banner.description || 'Banner description'}</p>
                        </div>
                      </div>
                      {/* Shop Now Button Preview */}
                      {banner.link && (
                        <div className="absolute bottom-4 left-4 bg-[#E31837] text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1">
                          Shop Now
                          <span>→</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}