import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface ImportResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

export default function ImportProducts() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [inspecting, setInspecting] = useState(false);

  const inspectDatabase = async () => {
    setInspecting(true);
    try {
      console.log('🔍 INSPECTING DATABASE...');
      console.log('API_URL:', API_URL);
      console.log('Full URL:', `${API_URL}/products`);
      
      // Fetch existing products from database
      const response = await fetch(`${API_URL}/products`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch products: ${response.status} - ${errorText}`);
      }
      
      const products = await response.json();
      console.log('📦 Total products in database:', products.length);
      
      if (products.length > 0) {
        const firstProduct = products[0];
        console.log('📊 FIRST PRODUCT STRUCTURE:');
        console.log('All fields:', Object.keys(firstProduct));
        console.log('Full first product:', firstProduct);
        
        // Check for category-related fields
        const categoryFields = Object.keys(firstProduct).filter(k => 
          k.toLowerCase().includes('categ')
        );
        console.log('📂 Category-related fields in database:', categoryFields);
        
        categoryFields.forEach(field => {
          console.log(`  - ${field}: "${firstProduct[field]}"`);
        });
        
        // Show a few more samples
        console.log('📊 Sample of 5 products category data:');
        products.slice(0, 5).forEach((p: any, i: number) => {
          console.log(`Product ${i + 1}:`, {
            name: p.name,
            category: p.category,
            ...Object.fromEntries(
              Object.entries(p).filter(([k]) => k.toLowerCase().includes('categ'))
            )
          });
        });
      } else {
        console.log('⚠️ No products found in database');
      }
      
      alert('Check console for database inspection results!');
    } catch (error) {
      console.error('Inspection error:', error);
      alert(`Failed to inspect database: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setInspecting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      previewFile(selectedFile);
    }
  };

  const previewFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    // 🔍 DEBUG: Show ALL column names
    console.log('📋 CSV COLUMNS FOUND:', headers);
    console.log('📋 Total columns:', headers.length);
    
    // Check for category-related columns
    const categoryColumns = headers.filter(h => h.toLowerCase().includes('categ'));
    console.log('📂 Category-related columns:', categoryColumns);
    
    // Preview first 5 rows
    const previewData = lines.slice(1, 6).map(line => {
      const values = parseCSVLine(line);
      const obj: any = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] || '';
      });
      return obj;
    });
    
    // Show category values from first row
    if (previewData.length > 0) {
      console.log('📊 First row category values:');
      categoryColumns.forEach(col => {
        console.log(`  - ${col}: "${previewData[0][col]}"`);
      });
    }
    
    setPreview(previewData);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file is empty or has no data rows');
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      console.log('CSV Headers:', headers);

      const products: any[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          const row: any = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });

          // Map CSV columns to product schema
          // Adjust these mappings based on your CSV structure
          
          // Build full category path from hierarchical columns OR use pre-existing full path
          let fullCategoryPath = '';
          
          // Check if there's already a full path column in the CSV (prioritize this!)
          if (row['Full Category Path'] || row.category_full_path || row.fullPath || row.full_path || row.categoryFullPath) {
            fullCategoryPath = row['Full Category Path'] || row.category_full_path || row.fullPath || row.full_path || row.categoryFullPath;
            if (i === 1) console.log(`✅ Using CSV column "Full Category Path": "${fullCategoryPath}"`);
          } else {
            // Otherwise, build from hierarchical columns
            const categoryParts: string[] = [];
            if (row['Category Level 1']) categoryParts.push(row['Category Level 1']);
            if (row['Category Level 2']) categoryParts.push(row['Category Level 2']);
            if (row['Category Level 3']) categoryParts.push(row['Category Level 3']);
            if (row['Category Level 4']) categoryParts.push(row['Category Level 4']);
            
            fullCategoryPath = categoryParts.length > 0 
              ? categoryParts.join(' > ') 
              : (row.category || row.Category || 'Uncategorized');
            
            if (i === 1) console.log(`⚠️ Built category from level parts: "${fullCategoryPath}"`);
          }

          const product = {
            id: row.id || row.ID || `product-${Date.now()}-${i}`,
            name: row.name || row.Name || row.title || row.Title || '',
            description: row.description || row.Description || row.desc || row['Full Description'] || row['Short Description'] || '',
            price: parseFloat(row.price || row.Price || row['Retail Price (ex GST)'] || '0'),
            image: row.image || row.Image || row.imageUrl || row.ImageURL || '',
            category: fullCategoryPath, // ✅ THIS is the key field for filtering
            sku: row.sku || row.SKU || row.id || row.code || row.Code || '',
            stock: parseInt(row.stock || row.Stock || row.quantity || '0'),
            featured: row.featured === 'true' || row.Featured === 'true' || false,
            
            // Keep all the extra category metadata for reference (optional)
            categoryId: row.categoryId || row.category_id || '',
            categoryName: row.categoryName || row.category_name || '',
            categoryLevel1Name: row.categoryLevel1Name || row.category_level1_name || '',
            categoryLevel2: row.categoryLevel2 || row.category_level2 || '',
            categoryLevel3: row.categoryLevel3 || row.category_level3 || '',
            categoryLevel4: row.categoryLevel4 || row.category_level4 || '',
          };

          if (!product.name) {
            errors.push(`Row ${i + 1}: Missing product name`);
            continue;
          }

          products.push(product);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      console.log(`Parsed ${products.length} products from CSV`);

      // Send to backend
      console.log('Sending product import request');
      
      // First, get existing products
      const existingResponse = await fetch(`${API_URL}/products`);
      
      if (!existingResponse.ok) {
        throw new Error('Failed to fetch existing products');
      }
      
      const existingProducts = await existingResponse.json();
      
      // Merge: existing products + new products (avoiding duplicates by SKU)
      const allProducts = [...existingProducts];
      products.forEach((newProduct: any) => {
        const existingIndex = allProducts.findIndex(
          (p: any) => p.sku === newProduct.sku
        );
        if (existingIndex >= 0) {
          allProducts[existingIndex] = newProduct; // Update existing
        } else {
          allProducts.push(newProduct); // Add new
        }
      });
      
      const response = await fetch(`${API_URL}/products/import-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicAnonKey,
        },
        body: JSON.stringify(allProducts),
      });

      if (!response.ok) {
        throw new Error('Failed to import products');
      }

      setResult({
        success: products.length,
        failed: errors.length,
        total: lines.length - 1,
        errors: errors.slice(0, 10), // Show first 10 errors
      });

    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'Failed to import CSV');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `id,name,description,price,category,image,sku,stock,featured
prod-1,Commercial Oven,Professional grade commercial oven,2999.99,Ovens,https://images.unsplash.com/photo-1574269909862-7e1d70bb8078,SKU-001,10,true
prod-2,Industrial Refrigerator,Large capacity refrigerator,3499.99,Refrigeration,https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5,SKU-002,5,false`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Products</h1>
          <p className="text-muted-foreground mt-2">Upload a CSV file to bulk import products</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/products')}>
          Back to Products
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV File Upload</CardTitle>
          <CardDescription>
            Upload a CSV file with your product data. Download the template to see the required format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="size-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" onClick={inspectDatabase} disabled={inspecting}>
              {inspecting ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Inspecting...
                </>
              ) : (
                <>
                  <AlertCircle className="size-4 mr-2" />
                  Inspect Database
                </>
              )}
            </Button>
          </div>

          <div className="border-2 border-dashed rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FileSpreadsheet className="size-16 text-muted-foreground" />
              
              <div className="text-center">
                <h3 className="font-semibold mb-2">Upload CSV File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  CSV files with columns: name, description, price, category, image, sku, stock
                </p>
              </div>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              
              <label htmlFor="csv-upload">
                <Button asChild>
                  <span>
                    <Upload className="size-4 mr-2" />
                    Choose CSV File
                  </span>
                </Button>
              </label>

              {file && (
                <div className="text-sm text-muted-foreground">
                  Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Preview (First 5 rows)</h3>
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {Object.keys(preview[0]).map(header => (
                        <th key={header} className="px-4 py-2 text-left font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row).map((value: any, j) => (
                          <td key={j} className="px-4 py-2">
                            {String(value).substring(0, 50)}
                            {String(value).length > 50 ? '...' : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {file && (
            <Button 
              onClick={handleImport} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  Importing Products...
                </>
              ) : (
                <>
                  <Upload className="size-5 mr-2" />
                  Import Products
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.failed === 0 ? (
                <>
                  <CheckCircle className="size-6 text-green-600" />
                  Import Successful
                </>
              ) : (
                <>
                  <AlertCircle className="size-6 text-yellow-600" />
                  Import Completed with Warnings
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded">
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-sm text-green-700">Successfully imported</div>
              </div>
              <div className="bg-red-50 p-4 rounded">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
              <div className="bg-blue-50 p-4 rounded">
                <div className="text-2xl font-bold text-blue-600">{result.total}</div>
                <div className="text-sm text-blue-700">Total rows</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Errors:</h4>
                <div className="bg-red-50 border border-red-200 rounded p-4 space-y-1">
                  {result.errors.map((error, i) => (
                    <div key={i} className="text-sm text-red-800">{error}</div>
                  ))}
                  {result.failed > 10 && (
                    <div className="text-sm text-red-600 italic">
                      ... and {result.failed - 10} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <Button onClick={() => navigate('/admin/products')} className="w-full">
              View All Products
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}