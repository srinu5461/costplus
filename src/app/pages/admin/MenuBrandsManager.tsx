import { useState, useEffect, startTransition } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { 
  Award, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  GripVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface MenuBrand {
  id: string;
  name: string;
  slug: string;
  path?: string; // Custom path (optional, defaults to /brands/{slug})
  sortOrder: number;
  enabled: boolean;
}

export function MenuBrandsManager() {
  const { isAuthenticated } = useAdmin();
  const [brands, setBrands] = useState<MenuBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [menuSettings, setMenuSettings] = useState({ showPromotions: true, showBrands: true });
  const [savingMenuSettings, setSavingMenuSettings] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    path: '',
    enabled: true,
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadBrands();
      loadMenuSettings();
    }
  }, [isAuthenticated]);

  const loadMenuSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/menu`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

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

  const saveMenuSettings = async () => {
    setSavingMenuSettings(true);
    try {
      const response = await fetch(`${API_URL}/settings/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ menuSettings })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Menu visibility settings saved! Refresh the site to see changes.');
      } else {
        toast.error('Failed to save menu settings: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving menu settings:', error);
      toast.error('Failed to save menu settings');
    } finally {
      setSavingMenuSettings(false);
    }
  };

  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/menu-brands`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load menu brands');
      }

      const data = await response.json();
      setBrands(data.brands || []);
    } catch (error) {
      console.error('Error loading menu brands:', error);
      toast.error('Failed to load menu brands');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        // Update existing brand
        const response = await fetch(`${API_URL}/menu-brands/${editingId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to update brand');
        }

        toast.success('Brand updated successfully');
      } else {
        // Create new brand
        const response = await fetch(`${API_URL}/menu-brands`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to create brand');
        }

        toast.success('Brand added successfully');
      }

      // Reset form and reload - wrap in startTransition
      setFormData({ name: '', slug: '', path: '', enabled: true });
      setEditingId(null);
      setIsAddingNew(false);
      startTransition(() => {
        loadBrands();
      });
    } catch (error) {
      console.error('Error saving brand:', error);
      toast.error('Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand: MenuBrand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      path: brand.path || '',
      enabled: brand.enabled,
    });
    setIsAddingNew(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this brand?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/menu-brands/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete brand');
      }

      toast.success('Brand deleted successfully');
      startTransition(() => {
        loadBrands();
      });
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error('Failed to delete brand');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`${API_URL}/menu-brands/${id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle brand');
      }

      toast.success(enabled ? 'Brand enabled' : 'Brand disabled');
      startTransition(() => {
        loadBrands();
      });
    } catch (error) {
      console.error('Error toggling brand:', error);
      toast.error('Failed to toggle brand');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = brands.findIndex(b => b.id === id);
    if (currentIndex === -1) return;

    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === brands.length - 1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newBrands = [...brands];
    const [movedBrand] = newBrands.splice(currentIndex, 1);
    newBrands.splice(newIndex, 0, movedBrand);

    // Update sortOrder for all brands
    const updatedBrands = newBrands.map((brand, index) => ({
      ...brand,
      sortOrder: index,
    }));

    // Update UI optimistically
    startTransition(() => {
      setBrands(updatedBrands);
    });

    // Save new order to database
    try {
      const response = await fetch(`${API_URL}/menu-brands/reorder`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          brands: updatedBrands.map(b => ({ id: b.id, sortOrder: b.sortOrder })) 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder brands');
      }

      toast.success('Order updated');
    } catch (error) {
      console.error('Error reordering brands:', error);
      toast.error('Failed to update order');
      // Reload to get correct order
      startTransition(() => {
        loadBrands();
      });
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', slug: '', path: '', enabled: true });
    setEditingId(null);
    setIsAddingNew(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Menu Brands Manager</h1>
        <p className="text-slate-600 mt-1">
          Manage brands displayed in the mega menu navigation
        </p>
      </div>

      {/* Menu Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Visibility Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Promotions Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Promotions Menu</h3>
              <p className="text-sm text-slate-600">Show "Promotions" link in the main navigation</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={menuSettings.showPromotions}
                onCheckedChange={(checked) => setMenuSettings({ ...menuSettings, showPromotions: checked })}
              />
              <span className="text-sm font-medium w-20">
                {menuSettings.showPromotions ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>

          {/* Brands Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Brands Menu</h3>
              <p className="text-sm text-slate-600">Show "Brands" link in the main navigation</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={menuSettings.showBrands}
                onCheckedChange={(checked) => setMenuSettings({ ...menuSettings, showBrands: checked })}
              />
              <span className="text-sm font-medium w-20">
                {menuSettings.showBrands ? 'Visible' : 'Hidden'}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={saveMenuSettings} disabled={savingMenuSettings}>
              <Save className="size-4 mr-2" />
              {savingMenuSettings ? 'Saving...' : 'Save Menu Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add New Brand Form */}
      {(isAddingNew || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-5" />
              {editingId ? 'Edit Brand' : 'Add New Brand'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Brand Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Polar Refrigeration"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Display name shown in the menu
                </p>
              </div>

              <div>
                <Label htmlFor="slug">Brand Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  placeholder="e.g. polar"
                />
                <p className="text-sm text-slate-500 mt-1">
                  URL slug (lowercase, no spaces) - used as fallback if no custom path
                </p>
              </div>

              <div>
                <Label htmlFor="path">Custom Path (Optional)</Label>
                <Input
                  id="path"
                  value={formData.path}
                  onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                  placeholder="e.g. /brands/polar or /categories/refrigeration"
                />
                <p className="text-sm text-slate-500 mt-1">
                  {formData.path
                    ? `Links to: ${formData.path}`
                    : `If empty, defaults to: /brands/${formData.slug || 'slug'}`}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
                <Label htmlFor="enabled">Enabled</Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="size-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="size-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Button */}
      {!isAddingNew && !editingId && (
        <Button onClick={() => setIsAddingNew(true)}>
          <Plus className="size-4 mr-2" />
          Add New Brand
        </Button>
      )}

      {/* Brands List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Menu Brands ({brands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading brands...</div>
          ) : brands.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No brands yet. Add your first brand above.
            </div>
          ) : (
            <div className="space-y-2">
              {brands.map((brand, index) => (
                <div
                  key={brand.id}
                  className={`flex items-center gap-3 p-3 border rounded-lg ${
                    !brand.enabled ? 'bg-slate-50 opacity-60' : 'bg-white'
                  }`}
                >
                  {/* Reorder Controls */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(brand.id, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReorder(brand.id, 'down')}
                      disabled={index === brands.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </div>

                  <GripVertical className="size-5 text-slate-400" />

                  {/* Brand Info */}
                  <div className="flex-1">
                    <div className="font-semibold">{brand.name}</div>
                    <div className="text-sm text-slate-500">
                      {brand.path || `/brands/${brand.slug}`}
                    </div>
                  </div>

                  {/* Enabled Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={brand.enabled}
                      onCheckedChange={(checked) => handleToggleEnabled(brand.id, checked)}
                    />
                    <span className="text-sm text-slate-500 w-16">
                      {brand.enabled ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(brand)}
                      disabled={editingId === brand.id}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(brand.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">How it works:</h3>
          <ul className="space-y-1 text-sm text-slate-700">
            <li>• Menu items appear in the mega menu under the "Brands" section</li>
            <li>• You can add custom paths to link to any page (e.g., /products, /categories/refrigeration, /custom-page)</li>
            <li>• If no custom path is set, it defaults to /brands/[slug]</li>
            <li>• Use the up/down arrows to reorder items</li>
            <li>• Toggle the switch to show/hide items without deleting them</li>
            <li>• This gives you full flexibility to add any menu items with custom links</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}