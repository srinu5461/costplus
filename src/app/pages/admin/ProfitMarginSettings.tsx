import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Save, RefreshCw, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface ProfitMargins {
  under50: number;      // Default 50%
  '50to100': number;    // Default 40%
  '100to500': number;   // Default 30%
  '500to1000': number;  // Default 20%
  '1000to5000': number; // Default 15%
  over5000: number;     // Default 12%
}

const DEFAULT_MARGINS: ProfitMargins = {
  under50: 50,
  '50to100': 40,
  '100to500': 30,
  '500to1000': 20,
  '1000to5000': 15,
  over5000: 12
};

export default function ProfitMarginSettings() {
  const [margins, setMargins] = useState<ProfitMargins>(DEFAULT_MARGINS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadMargins();
  }, []);

  const loadMargins = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/settings/profit-margins`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.margins) {
          setMargins(data.margins);
        }
      }
    } catch (error) {
      console.error('Failed to load profit margins:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/settings/profit-margins`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ margins })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profit margins saved successfully!' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Failed to save profit margins:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMargins(DEFAULT_MARGINS);
    setMessage({ type: 'success', text: 'Reset to default values' });
  };

  const updateMargin = (key: keyof ProfitMargins, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
      setMargins(prev => ({ ...prev, [key]: numValue }));
      setMessage(null);
    }
  };

  const calculateRetailPrice = (costPrice: number, marginPercent: number) => {
    return (costPrice * (1 + marginPercent / 100)).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="size-8 animate-spin text-[#E31837]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Profit Margin Settings</h1>
        <p className="text-muted-foreground">
          Configure tiered profit margins for automatic pricing calculations
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

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <DollarSign className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">How Tiered Pricing Works</p>
              <p className="text-sm text-blue-800">
                When importing products, the system automatically calculates retail prices by applying the appropriate 
                profit margin based on the cost price tier. For example, a $75 item uses the "50-100" tier margin.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Price Tier Margins</CardTitle>
          <CardDescription>
            Set the profit margin percentage for each price range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Under $50 */}
          <div className="space-y-2">
            <Label htmlFor="under50">Under $50</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="under50"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins.under50}
                  onChange={(e) => updateMargin('under50', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $30 cost → ${calculateRetailPrice(30, margins.under50)} retail
              </div>
            </div>
          </div>

          {/* $50 - $100 */}
          <div className="space-y-2">
            <Label htmlFor="50to100">$50 - $100</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="50to100"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins['50to100']}
                  onChange={(e) => updateMargin('50to100', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $75 cost → ${calculateRetailPrice(75, margins['50to100'])} retail
              </div>
            </div>
          </div>

          {/* $100 - $500 */}
          <div className="space-y-2">
            <Label htmlFor="100to500">$100 - $500</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="100to500"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins['100to500']}
                  onChange={(e) => updateMargin('100to500', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $250 cost → ${calculateRetailPrice(250, margins['100to500'])} retail
              </div>
            </div>
          </div>

          {/* $500 - $1000 */}
          <div className="space-y-2">
            <Label htmlFor="500to1000">$500 - $1,000</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="500to1000"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins['500to1000']}
                  onChange={(e) => updateMargin('500to1000', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $750 cost → ${calculateRetailPrice(750, margins['500to1000'])} retail
              </div>
            </div>
          </div>

          {/* $1000 - $5000 */}
          <div className="space-y-2">
            <Label htmlFor="1000to5000">$1,000 - $5,000</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="1000to5000"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins['1000to5000']}
                  onChange={(e) => updateMargin('1000to5000', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $2000 cost → ${calculateRetailPrice(2000, margins['1000to5000'])} retail
              </div>
            </div>
          </div>

          {/* Over $5000 */}
          <div className="space-y-2">
            <Label htmlFor="over5000">Over $5,000</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  id="over5000"
                  type="number"
                  min="0"
                  max="1000"
                  step="0.1"
                  value={margins.over5000}
                  onChange={(e) => updateMargin('over5000', e.target.value)}
                  className="max-w-[120px]"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Example: $7500 cost → ${calculateRetailPrice(7500, margins.over5000)} retail
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#E31837] hover:bg-[#E31837]/90"
            >
              {saving ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={saving}
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Margins Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Margin Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Under $50</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins.under50}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">$50-$100</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins['50to100']}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">$100-$500</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins['100to500']}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">$500-$1K</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins['500to1000']}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">$1K-$5K</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins['1000to5000']}%</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Over $5K</p>
              <p className="text-2xl font-bold text-[#2D3748]">{margins.over5000}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
