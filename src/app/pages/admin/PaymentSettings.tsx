import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { 
  Building2, CreditCard, DollarSign, Save, Check, 
  AlertCircle, RefreshCw, Link as LinkIcon
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface BankDetails {
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
  reference: string;
}

interface CompanyInfo {
  companyName: string;
  tradingName: string;
  abn: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone: string;
  email: string;
  website: string;
}

interface PaymentSettings {
  enableEway: boolean;
  enablePaypal: boolean;
  enableSquare: boolean;
  enableBankTransfer: boolean;
  defaultPaymentMethod: string;
  ewaySandboxMode: boolean;
  paypalSandboxMode: boolean;
  squareSandboxMode: boolean;
}

export function PaymentSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    bankName: '',
    accountName: '',
    bsb: '',
    accountNumber: '',
    reference: 'Please use invoice number as reference',
  });
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '',
    tradingName: '',
    abn: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    phone: '',
    email: '',
    website: '',
  });
  
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    enableEway: true,
    enablePaypal: true,
    enableSquare: false,
    enableBankTransfer: true,
    defaultPaymentMethod: 'eway',
    ewaySandboxMode: true,
    paypalSandboxMode: true,
    squareSandboxMode: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Fetch bank details
      const bankResponse = await fetch(`${API_URL}/settings/bank-details`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (bankResponse.ok) {
        const data = await bankResponse.json();
        if (data.bankDetails) {
          setBankDetails(data.bankDetails);
        }
      }
      
      // Fetch company info
      const companyResponse = await fetch(`${API_URL}/settings/company-info`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (companyResponse.ok) {
        const data = await companyResponse.json();
        if (data.companyInfo) {
          setCompanyInfo(data.companyInfo);
        }
      }
      
      // Fetch payment settings
      const paymentResponse = await fetch(`${API_URL}/settings/payment-settings`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      if (paymentResponse.ok) {
        const data = await paymentResponse.json();
        if (data.paymentSettings) {
          setPaymentSettings(data.paymentSettings);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankDetails = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/settings/bank-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ bankDetails }),
      });

      if (response.ok) {
        setSuccessMessage('Bank details saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to save bank details');
      }
    } catch (error) {
      console.error('Error saving bank details:', error);
      alert('Failed to save bank details');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/settings/company-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ companyInfo }),
      });

      if (response.ok) {
        setSuccessMessage('Company information saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to save company information');
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      alert('Failed to save company information');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/settings/payment-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ paymentSettings }),
      });

      if (response.ok) {
        setSuccessMessage('Payment settings saved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('Failed to save payment settings');
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      alert('Failed to save payment settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-64 bg-slate-200 rounded"></div>
            <div className="h-96 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Payment & Banking Settings</h1>
          <p className="text-muted-foreground">
            Configure payment methods, bank details, and company information for invoices
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-800">
            <Check className="size-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Bank Transfer Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="size-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Bank Transfer Details</CardTitle>
                <CardDescription>
                  Bank account information shown in invoices for direct transfers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  placeholder="e.g., Commonwealth Bank"
                />
              </div>
              
              <div>
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  value={bankDetails.accountName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                  placeholder="e.g., COSTPLUS100 PTY LTD"
                />
              </div>
              
              <div>
                <Label htmlFor="bsb">BSB Number *</Label>
                <Input
                  id="bsb"
                  value={bankDetails.bsb}
                  onChange={(e) => setBankDetails({ ...bankDetails, bsb: e.target.value })}
                  placeholder="e.g., 063-000"
                />
              </div>
              
              <div>
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  placeholder="e.g., 1234 5678"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="reference">Payment Reference Instructions</Label>
              <Input
                id="reference"
                value={bankDetails.reference}
                onChange={(e) => setBankDetails({ ...bankDetails, reference: e.target.value })}
                placeholder="e.g., Please use invoice number as reference"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This message will appear below the bank details in invoices
              </p>
            </div>

            <div className="pt-4 flex items-center justify-between border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-4" />
                <span>This information appears in all invoice emails</span>
              </div>
              <Button onClick={handleSaveBankDetails} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Bank Details
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Building2 className="size-6 text-red-600" />
              </div>
              <div>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Business details shown in invoices and quotations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Legal Company Name *</Label>
                <Input
                  id="companyName"
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                  placeholder="e.g., COSTPLUS100 PTY LTD"
                />
              </div>
              
              <div>
                <Label htmlFor="tradingName">Trading Name *</Label>
                <Input
                  id="tradingName"
                  value={companyInfo.tradingName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, tradingName: e.target.value })}
                  placeholder="e.g., Costplus100"
                />
              </div>
              
              <div>
                <Label htmlFor="abn">ABN *</Label>
                <Input
                  id="abn"
                  value={companyInfo.abn}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, abn: e.target.value })}
                  placeholder="e.g., 12 345 678 901"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  placeholder="e.g., 1300 COSTPLUS"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  placeholder="e.g., info@costplus100.com.au"
                />
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={companyInfo.website}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                  placeholder="e.g., www.costplus100.com.au"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  placeholder="e.g., 123 Industrial Drive"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={companyInfo.city}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                    placeholder="e.g., Sydney"
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State *</Label>
                  <select
                    id="state"
                    value={companyInfo.state}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Select...</option>
                    <option value="NSW">NSW</option>
                    <option value="VIC">VIC</option>
                    <option value="QLD">QLD</option>
                    <option value="SA">SA</option>
                    <option value="WA">WA</option>
                    <option value="TAS">TAS</option>
                    <option value="NT">NT</option>
                    <option value="ACT">ACT</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="postcode">Postcode *</Label>
                  <Input
                    id="postcode"
                    value={companyInfo.postcode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, postcode: e.target.value })}
                    placeholder="e.g., 2000"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="size-4" />
                <span>Appears in all invoices, quotations, and emails</span>
              </div>
              <Button onClick={handleSaveCompanyInfo} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Company Info
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CreditCard className="size-6 text-green-600" />
              </div>
              <div>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Enable or disable payment options for customers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-5 text-blue-600" />
                    <div>
                      <p className="font-medium">eWay Payment Gateway</p>
                      <p className="text-sm text-muted-foreground">Credit & debit card payments</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.enableEway}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, enableEway: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {paymentSettings.enableEway && (
                  <div className="pl-8 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sandbox Mode</p>
                        <p className="text-xs text-muted-foreground">Use test credentials (for development only)</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentSettings.ewaySandboxMode}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, ewaySandboxMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                    {paymentSettings.ewaySandboxMode && (
                      <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2">
                        <p className="text-xs text-amber-800">
                          <strong>⚠️ Sandbox Mode Active:</strong> Using test eWay environment. Switch to Production mode before going live.
                        </p>
                      </div>
                    )}
                    {!paymentSettings.ewaySandboxMode && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-800">
                          <strong>✓ Production Mode Active:</strong> Using live eWay environment with production credentials.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="size-5 text-blue-600" />
                    <div>
                      <p className="font-medium">PayPal</p>
                      <p className="text-sm text-muted-foreground">PayPal account payments</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.enablePaypal}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, enablePaypal: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                {paymentSettings.enablePaypal && (
                  <div className="pl-8 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sandbox Mode</p>
                        <p className="text-xs text-muted-foreground">Use test credentials (for development only)</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentSettings.paypalSandboxMode}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, paypalSandboxMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    {paymentSettings.paypalSandboxMode && (
                      <div className="mt-2 bg-blue-50 border border-blue-200 rounded p-2">
                        <p className="text-xs text-blue-800">
                          <strong>⚠️ Sandbox Mode Active:</strong> Using test PayPal environment. Switch to Production mode before going live.
                        </p>
                      </div>
                    )}
                    {!paymentSettings.paypalSandboxMode && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-800">
                          <strong>✓ Production Mode Active:</strong> Using live PayPal environment with production credentials.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="size-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Square Payment Gateway</p>
                      <p className="text-sm text-muted-foreground">Card payments + Google Pay (Australia)</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paymentSettings.enableSquare}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, enableSquare: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                {paymentSettings.enableSquare && (
                  <div className="pl-8 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sandbox Mode</p>
                        <p className="text-xs text-muted-foreground">Use test credentials (for development only)</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentSettings.squareSandboxMode}
                          onChange={(e) => setPaymentSettings({ ...paymentSettings, squareSandboxMode: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                      </label>
                    </div>
                    {paymentSettings.squareSandboxMode && (
                      <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-2">
                        <p className="text-xs text-purple-800">
                          <strong>⚠️ Sandbox Mode Active:</strong> Using test Square environment. Switch to Production mode before going live.
                        </p>
                      </div>
                    )}
                    {!paymentSettings.squareSandboxMode && (
                      <div className="mt-2 bg-green-50 border border-green-200 rounded p-2">
                        <p className="text-xs text-green-800">
                          <strong>✓ Production Mode Active:</strong> Using live Square environment with production credentials.
                        </p>
                      </div>
                    )}
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="text-xs font-semibold text-blue-900 mb-2">📋 Required Environment Variables:</p>
                      <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
                        <li><code className="bg-blue-100 px-1 rounded">SQUARE_APPLICATION_ID</code> - Your Square Application ID</li>
                        <li><code className="bg-blue-100 px-1 rounded">SQUARE_LOCATION_ID</code> - Your Australian location ID</li>
                        <li><code className="bg-blue-100 px-1 rounded">SQUARE_ACCESS_TOKEN</code> - Your Square access token (secret)</li>
                        <li><code className="bg-blue-100 px-1 rounded">SQUARE_REDIRECT_URL</code> - Production redirect URL (e.g., https://costplus100.com.au)</li>
                        <li><code className="bg-blue-100 px-1 rounded">SQUARE_SANDBOX</code> - Set to "true" for sandbox mode (optional)</li>
                      </ul>
                      <p className="text-xs text-blue-700 mt-2">
                        💡 Set these in your Supabase project's Edge Functions environment variables.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="size-5 text-green-600" />
                  <div>
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-sm text-muted-foreground">Direct bank deposit (1-3 business days)</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentSettings.enableBankTransfer}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, enableBankTransfer: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LinkIcon className="size-4" />
                <span>Configure payment gateway API keys in environment settings</span>
              </div>
              <Button onClick={handleSavePaymentSettings} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4 mr-2" />
                    Save Payment Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <AlertCircle className="size-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">How Payment Links Work</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>1. Invoice Emails:</strong> When you send an invoice, customers receive an email with a "PAY NOW" button
                    and bank transfer details.
                  </p>
                  <p>
                    <strong>2. Online Payment:</strong> The button links to your checkout page where customers can pay via
                    eWay (credit card), PayPal, or Square (card + Google Pay) instantly.
                  </p>
                  <p>
                    <strong>3. Bank Transfer:</strong> Customers can also pay via direct bank deposit using the details shown below the 
                    payment button. They must include the invoice number as reference.
                  </p>
                  <p className="pt-2 border-t border-blue-200">
                    <strong>💡 Tip:</strong> Make sure your bank details are correct before sending invoices to customers. 
                    The invoice number is automatically added as the payment reference.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
