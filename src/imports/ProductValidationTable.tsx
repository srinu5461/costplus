/**
 * Product Validation Table
 * Shows products with category validation status
 */

import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, RefreshCw, Package } from 'lucide-react';

interface ProductValidationTableProps {
  apiUrl: string;
  authToken: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  categoryId?: string;
  category_id?: string;
  image?: string;
  price?: number;
}

interface Category {
  id: string;
  name: string;
  level?: number;
}

interface ValidationStats {
  totalProducts: number;
  linkedProducts: number;
  orphanedProducts: number;
  missingCategoryReferences: number;
}

export function ProductValidationTable({ apiUrl, authToken }: ProductValidationTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [validationStats, setValidationStats] = useState<ValidationStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load products (first 100)
      const productsRes = await fetch(`${apiUrl}/products?limit=100`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
      
      // Load categories
      const categoriesRes = await fetch(`${apiUrl}/categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const categoriesData = await categoriesRes.json();
      setCategories(categoriesData.categories || []);
      
      // Load validation stats
      const validationRes = await fetch(`${apiUrl}/products/validate-categories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const validationData = await validationRes.json();
      setValidationStats(validationData.stats);
      
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getValidationStatus = (product: Product) => {
    const categoryId = product.categoryId || product.category_id;
    
    if (!categoryId) {
      return { status: 'no-category', message: 'No category assigned', color: 'destructive' };
    }
    
    const categoryExists = categories.find(c => String(c.id) === String(categoryId));
    
    if (!categoryExists) {
      return { 
        status: 'invalid', 
        message: `Invalid category ID: ${categoryId}`, 
        color: 'destructive',
        pulse: true 
      };
    }
    
    return { 
      status: 'valid', 
      message: categoryExists.name, 
      color: 'success',
      category: categoryExists
    };
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Package className="w-5 h-5" />
              Product-Category Validation Preview
            </CardTitle>
            <CardDescription>
              Preview your products and their category assignments (showing first 100)
            </CardDescription>
          </div>
          <Button onClick={loadData} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Validation Stats Summary */}
        {validationStats && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-900">{validationStats.totalProducts}</div>
              <div className="text-xs text-gray-600">Total Products</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-900">{validationStats.linkedProducts}</div>
              <div className="text-xs text-gray-600">Linked Products</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="text-2xl font-bold text-orange-900">{validationStats.orphanedProducts}</div>
              <div className="text-xs text-gray-600">Orphaned Products</div>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm border-l-4 border-red-500">
              <div className="text-2xl font-bold text-red-900">{validationStats.missingCategoryReferences}</div>
              <div className="text-xs text-gray-600">Missing Categories</div>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="font-semibold">No products in database</p>
              <p className="text-sm mt-1">Import products to see validation results</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Product Code</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Category Validation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const validation = getValidationStatus(product);
                    return (
                      <TableRow key={product.id || product.code}>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          {validation.status === 'valid' && validation.category ? (
                            <Badge variant="outline" className="bg-green-50 border-green-300 text-green-800">
                              ✓ {validation.category.name}
                            </Badge>
                          ) : (
                            <Badge 
                              variant="destructive" 
                              className={validation.pulse ? 'animate-pulse' : ''}
                            >
                              {validation.message}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {validation.status === 'valid' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
          <h4 className="font-semibold text-sm text-purple-900 mb-2">🎨 Status Legend</h4>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-gray-700">Valid category link</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-gray-700">Invalid or missing category</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
