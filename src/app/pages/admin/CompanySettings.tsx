import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Building2, Save, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function CompanySettings() {
  const [loading, setLoading] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [companyInfo, setCompanyInfo] = useState({
    companyName: 'COSTPLUS100 PTY LTD',
    tradingName: 'Costplus100',
    abn: '12 345 678 901',
    address: '123 Industrial Drive',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    phone: '1300 COSTPLUS',
    email: 'info@costplus100.com.au',
    supportEmail: 'support@costplus100.com.au',
    website: 'www.costplus100.com.au',
    tagline: 'CATERING EQUIPMENT SOLUTIONS',
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/email/company-info`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.companyInfo) {
          setCompanyInfo(data.companyInfo);
        }
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    } finally {
      setLoadingFetch(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`${API_URL}/email/company-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify(companyInfo),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save company information');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving company info:', error);
      alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loadingFetch) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Company Information</h1>
        <p className="text-muted-foreground">
          Configure your company details for invoices, emails, and communications
        </p>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">✓ Company information saved successfully!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-5" />
              Company Details
            </CardTitle>
            <CardDescription>Legal and trading information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Legal Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="COSTPLUS100 PTY LTD"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Trading Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.tradingName}
                onChange={(e) => handleChange('tradingName', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="Costplus100"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                ABN (Australian Business Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.abn}
                onChange={(e) => handleChange('abn', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="12 345 678 901"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Required for GST tax invoices
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Tagline/Slogan
              </label>
              <input
                type="text"
                value={companyInfo.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="CATERING EQUIPMENT SOLUTIONS"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>How customers can reach you</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={companyInfo.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="1300 COSTPLUS"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={companyInfo.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="info@costplus100.com.au"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Support Email
              </label>
              <input
                type="email"
                value={companyInfo.supportEmail}
                onChange={(e) => handleChange('supportEmail', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="support@costplus100.com.au"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contact form emails will be sent to this address
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Website
              </label>
              <input
                type="text"
                value={companyInfo.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                placeholder="www.costplus100.com.au"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Address */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Business Address</CardTitle>
            <CardDescription>Physical location shown on invoices and tax documents</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyInfo.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                  placeholder="123 Industrial Drive"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyInfo.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                  placeholder="Sydney"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyInfo.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                  placeholder="NSW"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Postcode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyInfo.postcode}
                  onChange={(e) => handleChange('postcode', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                  placeholder="2000"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyInfo.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#E31837] focus:border-transparent"
                  placeholder="Australia"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
            <CardDescription>How this information appears on tax invoices and emails</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-white p-6 rounded-lg">
              <div className="border-b border-gray-700 pb-4 mb-4">
                <h2 className="text-2xl font-bold mb-1">{companyInfo.tradingName.toUpperCase()}</h2>
                {companyInfo.tagline && (
                  <p className="text-[#E31837] text-sm font-semibold">{companyInfo.tagline}</p>
                )}
              </div>
              <div className="text-sm space-y-1">
                <p className="font-semibold">{companyInfo.companyName}</p>
                <p>{companyInfo.address}</p>
                <p>{companyInfo.city}, {companyInfo.state} {companyInfo.postcode}</p>
                <p>{companyInfo.country}</p>
                <p className="pt-2">ABN: {companyInfo.abn}</p>
                <p className="pt-2">Phone: {companyInfo.phone}</p>
                <p>Email: {companyInfo.email}</p>
                <p>Web: {companyInfo.website}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-[#E31837] hover:bg-[#c91530] text-white px-8"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 size-4" />
              Save Company Information
            </>
          )}
        </Button>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>ℹ️ Note:</strong> These details will be used in all tax invoices, order confirmation emails, 
          and other customer communications. Make sure all information is accurate and up-to-date.
        </p>
      </div>
    </div>
  );
}