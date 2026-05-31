import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Loader2, Plus, Trash2, Ticket, Calendar, Users, DollarSign, Check, X } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface Voucher {
  id: string;
  code: string;
  type: 'fixed' | 'percentage';
  value: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  customer_specific: string | null;
  created_at: string;
}

export function VoucherManagement() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    type: 'fixed' as 'fixed' | 'percentage',
    value: '',
    minPurchase: '',
    maxUses: '',
    expiresAt: '',
    customerSpecific: '',
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      const response = await fetch(`${API_URL}/vouchers/list`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setVouchers(data.vouchers);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/vouchers/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          code: formData.code.toUpperCase(),
          type: formData.type,
          value: parseFloat(formData.value),
          minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : 0,
          maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
          expiresAt: formData.expiresAt || null,
          customerSpecific: formData.customerSpecific || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setVouchers([data.voucher, ...vouchers]);
        setDialogOpen(false);
        setFormData({
          code: '',
          type: 'fixed',
          value: '',
          minPurchase: '',
          maxUses: '',
          expiresAt: '',
          customerSpecific: '',
        });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      alert('Failed to create voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const response = await fetch(`${API_URL}/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ active: !voucher.active }),
      });

      const data = await response.json();
      if (data.success) {
        setVouchers(vouchers.map(v =>
          v.id === voucher.id ? { ...v, active: !v.active } : v
        ));
      }
    } catch (error) {
      console.error('Error updating voucher:', error);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm('Are you sure you want to delete this voucher?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setVouchers(vouchers.filter(v => v.id !== voucherId));
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-[#E31837]" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Voucher Management</h1>
          <p className="text-muted-foreground">Create and manage discount vouchers and gift cards</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#E31837] hover:bg-[#E31837]/90">
              <Plus className="size-4 mr-2" />
              Create Voucher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Voucher</DialogTitle>
              <DialogDescription>
                Create a discount voucher or gift card for your customers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateVoucher} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Voucher Code *</Label>
                  <Input
                    id="code"
                    placeholder="COSTPLUS100"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique code customers will enter at checkout
                  </p>
                </div>

                <div>
                  <Label htmlFor="type">Discount Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'fixed' | 'percentage') => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value">
                    {formData.type === 'fixed' ? 'Discount Amount ($) *' : 'Discount Percentage (%) *'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    placeholder={formData.type === 'fixed' ? '100.00' : '20'}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
                  <Input
                    id="minPurchase"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.minPurchase}
                    onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional - leave blank for no minimum
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxUses">Maximum Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank for unlimited uses
                  </p>
                </div>

                <div>
                  <Label htmlFor="expiresAt">Expiry Date</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank for no expiry
                  </p>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="customerSpecific">Customer Email (Optional)</Label>
                  <Input
                    id="customerSpecific"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.customerSpecific}
                    onChange={(e) => setFormData({ ...formData, customerSpecific: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Restrict this voucher to a specific customer email
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-[#E31837] hover:bg-[#E31837]/90">
                  {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Create Voucher
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Vouchers List */}
      <div className="grid gap-4">
        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="size-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No vouchers yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first voucher to start offering discounts to customers
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-[#E31837] hover:bg-[#E31837]/90"
              >
                <Plus className="size-4 mr-2" />
                Create Voucher
              </Button>
            </CardContent>
          </Card>
        ) : (
          vouchers.map((voucher) => (
            <Card key={voucher.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl font-mono mb-2">{voucher.code}</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={voucher.active ? 'default' : 'secondary'}>
                        {voucher.active ? (
                          <>
                            <Check className="size-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="size-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                      {voucher.type === 'fixed' && (
                        <Badge variant="outline">
                          <DollarSign className="size-3 mr-1" />
                          ${voucher.value.toFixed(2)} Off
                        </Badge>
                      )}
                      {voucher.type === 'percentage' && (
                        <Badge variant="outline">
                          {voucher.value}% Off
                        </Badge>
                      )}
                      {voucher.customer_specific && (
                        <Badge variant="outline">
                          <Users className="size-3 mr-1" />
                          Customer Specific
                        </Badge>
                      )}
                      {voucher.expires_at && (
                        <Badge variant="outline">
                          <Calendar className="size-3 mr-1" />
                          Expires {new Date(voucher.expires_at).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(voucher)}
                    >
                      {voucher.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVoucher(voucher.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Usage</p>
                    <p className="font-semibold">
                      {voucher.used_count} / {voucher.max_uses || '∞'}
                    </p>
                  </div>
                  {voucher.min_purchase > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-1">Min Purchase</p>
                      <p className="font-semibold">${voucher.min_purchase.toFixed(2)}</p>
                    </div>
                  )}
                  {voucher.customer_specific && (
                    <div>
                      <p className="text-muted-foreground mb-1">Customer</p>
                      <p className="font-semibold text-xs break-all">{voucher.customer_specific}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground mb-1">Created</p>
                    <p className="font-semibold">
                      {new Date(voucher.created_at).toLocaleDateString()}
                    </p>
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
