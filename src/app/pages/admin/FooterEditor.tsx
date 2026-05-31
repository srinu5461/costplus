import { useState, useEffect } from 'react';
import { useCMS } from '../../context/CMSContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Save, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function FooterEditor() {
  // ✅ Safe access to CMS context with fallback
  let data, updateFooter;
  try {
    const cms = useCMS();
    data = cms.data;
    updateFooter = cms.updateFooter;
  } catch (e) {
    console.error('FooterEditor: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    updateFooter = async () => {};
  }
  
  const [footer, setFooter] = useState(data.footer || {
    about: '',
    email: '',
    phone: '',
    address: '',
    socialMedia: {
      facebook: '',
      twitter: '',
      instagram: '',
      linkedin: ''
    }
  });
  const [isInitializing, setIsInitializing] = useState(false);

  // Sync with CMS data when it changes
  useEffect(() => {
    if (data.footer) {
      setFooter(data.footer);
    }
  }, [data.footer]);

  const handleInitialize = async () => {
    if (!confirm('This will set the footer to Costplus100 default values. Continue?')) {
      return;
    }

    setIsInitializing(true);
    try {
      console.log('Calling footer initialization endpoint...');
      const response = await fetch(`${API_URL}/footer/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const result = await response.json();
      console.log('Footer initialization response:', result);
      
      if (result.success && result.footer) {
        // Update local state with the new footer data
        setFooter(result.footer);
        alert('Footer initialized with Costplus100 defaults! Click Save to confirm.');
      } else {
        throw new Error(result.message || 'Failed to initialize footer');
      }
    } catch (error) {
      console.error('Error initializing footer:', error);
      
      // If initialization fails, set the defaults manually in the UI
      const manualDefaults = {
        about: "Costplus100 is your trusted partner for professional catering equipment. We provide commercial-grade products from leading brands.",
        email: "info@costplus100.com.au",
        phone: "",
        address: "6/4 Loftus Street Bowral NSW 2576",
        socialMedia: {
          facebook: "",
          twitter: "",
          instagram: "",
          linkedin: ""
        }
      };
      
      setFooter(manualDefaults);
      alert('Loaded Costplus100 defaults locally. Click Save to store them in the database.');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSave = async () => {
    console.log('Saving footer:', footer);
    
    try {
      await updateFooter(footer);
      alert('Footer settings saved successfully!');
    } catch (error) {
      console.error('Failed to save footer:', error);
      // Even if server save failed, the UI state is updated
      alert('Footer updated in UI! (Note: Server save may have failed, but your changes are visible)');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl mb-2">Footer Editor</h1>
          <p className="text-muted-foreground">Customize your site footer content</p>
        </div>
        <div className="space-x-2">
          <Button onClick={handleInitialize} size="lg" disabled={isInitializing}>
            <RefreshCw className="size-5 mr-2" />
            Initialize
          </Button>
          <Button onClick={handleSave} size="lg">
            <Save className="size-5 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block">About Text</label>
                <textarea
                  value={footer.about}
                  onChange={(e) => setFooter({ ...footer, about: e.target.value })}
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Company description..."
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Email Address</label>
                <Input
                  type="email"
                  value={footer.email}
                  onChange={(e) => setFooter({ ...footer, email: e.target.value })}
                  placeholder="info@caterpro.com"
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Phone Number</label>
                <Input
                  value={footer.phone}
                  onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
                  placeholder="1-800-CATER-PRO"
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Physical Address</label>
                <Input
                  value={footer.address}
                  onChange={(e) => setFooter({ ...footer, address: e.target.value })}
                  placeholder="123 Commercial Street..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block">Facebook</label>
                <Input
                  value={footer.socialMedia.facebook || ''}
                  onChange={(e) => setFooter({
                    ...footer,
                    socialMedia: { ...footer.socialMedia, facebook: e.target.value }
                  })}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Twitter</label>
                <Input
                  value={footer.socialMedia.twitter || ''}
                  onChange={(e) => setFooter({
                    ...footer,
                    socialMedia: { ...footer.socialMedia, twitter: e.target.value }
                  })}
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Instagram</label>
                <Input
                  value={footer.socialMedia.instagram || ''}
                  onChange={(e) => setFooter({
                    ...footer,
                    socialMedia: { ...footer.socialMedia, instagram: e.target.value }
                  })}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">LinkedIn</label>
                <Input
                  value={footer.socialMedia.linkedin || ''}
                  onChange={(e) => setFooter({
                    ...footer,
                    socialMedia: { ...footer.socialMedia, linkedin: e.target.value }
                  })}
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-slate-900 text-white p-6 text-sm">
                <div className="mb-4">
                  <h3 className="text-lg mb-2">CaterPro</h3>
                  <p className="text-slate-300 text-xs leading-relaxed">{footer.about}</p>
                </div>

                <div className="space-y-2 mb-4 text-xs">
                  <p className="text-slate-300">📧 {footer.email}</p>
                  <p className="text-slate-300">📞 {footer.phone}</p>
                  <p className="text-slate-300">📍 {footer.address}</p>
                </div>

                <div className="flex gap-2 pt-4 border-t border-slate-700">
                  {footer.socialMedia.facebook && (
                    <div className="size-8 bg-slate-800 rounded flex items-center justify-center text-xs">
                      F
                    </div>
                  )}
                  {footer.socialMedia.twitter && (
                    <div className="size-8 bg-slate-800 rounded flex items-center justify-center text-xs">
                      T
                    </div>
                  )}
                  {footer.socialMedia.instagram && (
                    <div className="size-8 bg-slate-800 rounded flex items-center justify-center text-xs">
                      I
                    </div>
                  )}
                  {footer.socialMedia.linkedin && (
                    <div className="size-8 bg-slate-800 rounded flex items-center justify-center text-xs">
                      L
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}