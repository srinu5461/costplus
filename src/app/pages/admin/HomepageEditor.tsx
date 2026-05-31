import { useState } from 'react';
import { useCMS } from '../../context/CMSContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Save } from 'lucide-react';

export function HomepageEditor() {
  // ✅ Safe access to CMS context with fallback
  let data, updateHomePage;
  try {
    const cms = useCMS();
    data = cms.data;
    updateHomePage = cms.updateHomePage;
  } catch (e) {
    console.error('HomepageEditor: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    updateHomePage = async () => {};
  }
  
  const [homepage, setHomepage] = useState(data.homepage);

  const handleSave = () => {
    updateHomePage(homepage).then(() => {
      alert('Homepage settings saved successfully!');
    }).catch((error) => {
      alert('Failed to save homepage: ' + error.message);
    });
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl mb-2">Homepage Editor</h1>
          <p className="text-muted-foreground">Customize your homepage sections</p>
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
              <CardTitle>Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm mb-2 block">Hero Title</label>
                <Input
                  value={homepage.hero.title}
                  onChange={(e) => setHomepage({
                    ...homepage,
                    hero: { ...homepage.hero, title: e.target.value }
                  })}
                  placeholder="Equip Your Kitchen for Success"
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Hero Subtitle</label>
                <textarea
                  value={homepage.hero.subtitle}
                  onChange={(e) => setHomepage({
                    ...homepage,
                    hero: { ...homepage.hero, subtitle: e.target.value }
                  })}
                  className="w-full min-h-[80px] p-2 border rounded-md"
                  placeholder="Commercial-grade catering equipment..."
                />
              </div>

              <div>
                <label className="text-sm mb-2 block">Background Image URL</label>
                <Input
                  value={homepage.hero.image}
                  onChange={(e) => setHomepage({
                    ...homepage,
                    hero: { ...homepage.hero, image: e.target.value }
                  })}
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {homepage.features.map((feature, index) => (
                <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="text-sm mb-3">Feature {index + 1}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs mb-1 block text-muted-foreground">Icon</label>
                      <Input
                        value={feature.icon}
                        onChange={(e) => {
                          const newFeatures = [...homepage.features];
                          newFeatures[index] = { ...newFeatures[index], icon: e.target.value };
                          setHomepage({ ...homepage, features: newFeatures });
                        }}
                        placeholder="shield"
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block text-muted-foreground">Title</label>
                      <Input
                        value={feature.title}
                        onChange={(e) => {
                          const newFeatures = [...homepage.features];
                          newFeatures[index] = { ...newFeatures[index], title: e.target.value };
                          setHomepage({ ...homepage, features: newFeatures });
                        }}
                        placeholder="Commercial Grade"
                      />
                    </div>
                    <div>
                      <label className="text-xs mb-1 block text-muted-foreground">Description</label>
                      <textarea
                        value={feature.description}
                        onChange={(e) => {
                          const newFeatures = [...homepage.features];
                          newFeatures[index] = { ...newFeatures[index], description: e.target.value };
                          setHomepage({ ...homepage, features: newFeatures });
                        }}
                        className="w-full min-h-[60px] p-2 border rounded-md text-sm"
                        placeholder="Description..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hero Preview */}
              <div className="border rounded-lg overflow-hidden">
                <div className="relative bg-slate-900 text-white p-8">
                  <div className="absolute inset-0 opacity-20">
                    <img 
                      src={homepage.hero.image} 
                      alt="Hero"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl mb-2">{homepage.hero.title}</h2>
                    <p className="text-sm text-slate-300">{homepage.hero.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Features Preview */}
              <div className="border rounded-lg p-4">
                <p className="text-sm mb-3">Features Section</p>
                <div className="space-y-3">
                  {homepage.features.map((feature, index) => (
                    <div key={index} className="bg-slate-50 p-3 rounded text-xs">
                      <p className="mb-1">
                        <span className="bg-slate-200 px-2 py-1 rounded text-xs">
                          {feature.icon}
                        </span>
                      </p>
                      <p className="mb-1">{feature.title}</p>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}