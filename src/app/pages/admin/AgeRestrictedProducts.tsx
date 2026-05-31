import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { AlertCircle, Search, CheckCircle2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function AgeRestrictedProducts() {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    ageRestricted: 0,
    notRestricted: 0,
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch all products from CMS
      const response = await fetch(`${API_URL}/cms`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      const allProducts = data.products || [];

      // Calculate stats
      const ageRestrictedProducts = allProducts.filter((p: any) => p.ageRestricted === true);
      
      setProducts(allProducts);
      setStats({
        total: allProducts.length,
        ageRestricted: ageRestrictedProducts.length,
        notRestricted: allProducts.length - ageRestrictedProducts.length,
      });

    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to fetch products: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products based on search
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return p.ageRestricted === true; // Default: show only age restricted
    
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && p.ageRestricted === true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">Age Restricted Products</h1>
        <p className="text-slate-600">
          Products marked as age restricted (18+) in the database. These will trigger age verification modal when added to cart.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Products</p>
                <p className="text-3xl font-bold text-[#2D3748]">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Age Restricted</p>
                <p className="text-3xl font-bold text-[#E31837]">{stats.ageRestricted}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="size-6 text-[#E31837]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Not Restricted</p>
                <p className="text-3xl font-bold text-green-600">{stats.notRestricted}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search age restricted products by name, code, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-[#E31837]"
              />
            </div>
            <Button onClick={fetchProducts} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Age Restricted Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-600">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-600">
              {searchTerm ? 'No matching products found' : 'No age restricted products found in database'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-2 font-semibold">Product Code</th>
                    <th className="text-left py-3 px-2 font-semibold">Name</th>
                    <th className="text-left py-3 px-2 font-semibold">Brand</th>
                    <th className="text-left py-3 px-2 font-semibold">Category</th>
                    <th className="text-center py-3 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="py-3 px-2 font-mono text-xs">{product.code || product.sku}</td>
                      <td className="py-3 px-2">{product.name}</td>
                      <td className="py-3 px-2">{product.brand || '-'}</td>
                      <td className="py-3 px-2 text-xs text-slate-600">{product.category}</td>
                      <td className="py-3 px-2 text-center">
                        <Badge className="bg-[#E31837] hover:bg-[#E31837]">
                          18+ RESTRICTED
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">How Age Restriction Works</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Age restriction data is synced from Uropa API during description sync</li>
                <li>• When customers add age-restricted products to cart, they must confirm they are 18+</li>
                <li>• The age verification modal appears before the item is added to cart</li>
                <li>• To sync age restrictions: Go to Description Sync in Admin Panel</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}