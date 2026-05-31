import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  Clock,
  MapPinned,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales (NSW)' },
  { value: 'VIC', label: 'Victoria (VIC)' },
  { value: 'QLD', label: 'Queensland (QLD)' },
  { value: 'SA', label: 'South Australia (SA)' },
  { value: 'WA', label: 'Western Australia (WA)' },
  { value: 'TAS', label: 'Tasmania (TAS)' },
  { value: 'NT', label: 'Northern Territory (NT)' },
  { value: 'ACT', label: 'Australian Capital Territory (ACT)' },
];

interface PickupLocation {
  id: string;
  name: string;
  address: string;
  state: string;
  hours: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function AdminPickupLocations() {
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    state: '',
    hours: '',
    active: true
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/pickup-locations`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLocations(data.locations);
      }
    } catch (error) {
      console.error('Error fetching pickup locations:', error);
      alert('Failed to load pickup locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId 
        ? `${API_URL}/pickup-locations/${editingId}`
        : `${API_URL}/pickup-locations`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchLocations();
        resetForm();
        alert(editingId ? 'Location updated successfully!' : 'Location added successfully!');
      } else {
        alert(data.error || 'Failed to save location');
      }
    } catch (error) {
      console.error('Error saving pickup location:', error);
      alert('Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (location: PickupLocation) => {
    setFormData({
      name: location.name,
      address: location.address,
      state: location.state,
      hours: location.hours,
      active: location.active
    });
    setEditingId(location.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pickup location?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/pickup-locations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        await fetchLocations();
        alert('Location deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting pickup location:', error);
      alert('Failed to delete location');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      state: '',
      hours: '',
      active: true
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#2D3748]">Pickup Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage pickup locations for customer orders
          </p>
        </div>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#E31837] hover:bg-[#E31837]/90"
        >
          <Plus className="size-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="border-[#E31837]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5" />
              {editingId ? 'Edit Location' : 'Add New Location'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Location Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Sydney Warehouse"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 123 Industrial Ave, Sydney NSW 2000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-[#E31837]"
                    required
                  >
                    <option value="">Select a state</option>
                    {AUSTRALIAN_STATES.map((state) => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="hours">Operating Hours *</Label>
                  <Input
                    id="hours"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    placeholder="e.g., Mon-Fri: 8AM-5PM"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="size-4 rounded"
                  />
                  <Label htmlFor="active" className="cursor-pointer">
                    Active (visible to customers)
                  </Label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[#E31837] hover:bg-[#E31837]/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingId ? 'Update Location' : 'Add Location'}
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Locations List */}
      <div className="grid grid-cols-1 gap-4">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="size-12 mx-auto mb-4 opacity-20" />
              <p>No pickup locations yet. Add your first location above.</p>
            </CardContent>
          </Card>
        ) : (
          locations.map((location) => (
            <Card key={location.id} className={!location.active ? 'opacity-60' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="size-5 text-[#E31837]" />
                      <h3 className="text-lg font-semibold">{location.name}</h3>
                      {location.active ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="size-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="size-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground ml-8">
                      <p className="flex items-center gap-2">
                        <MapPinned className="size-4" />
                        {location.address}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="size-4" />
                        {location.hours}
                      </p>
                      {location.state && (
                        <Badge variant="outline" className="mt-1">
                          {location.state}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(location)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(location.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminPickupLocations;