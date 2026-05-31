import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface CategoryNode {
  name: string;
  slug: string;
  code: string;
  path: string;
  fullPath: string;
  level: number;
  parent: string;
  imageUrl: string;
  productCount: number;
  hasChildren: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  total: number;
  errors: string[];
}

export default function ImportCategories() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<CategoryNode[]>([]);

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
    const headers = parseCSVLine(lines[0]);
    
    // Preview first 10 categories
    const previewData = lines.slice(1, 11).map(line => {
      const values = parseCSVLine(line);
      return {
        name: values[0] || '',
        slug: values[1] || '',
        code: values[2] || '',
        path: values[3] || '',
        fullPath: values[4] || '',
        level: parseInt(values[5]) || 1,
        parent: values[6] || '',
        imageUrl: values[7] || '',
        productCount: parseInt(values[8]) || 0,
        hasChildren: values[9] === 'Yes',
      };
    });
    
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

      const categories: CategoryNode[] = [];
      const errors: string[] = [];

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          
          const category: CategoryNode = {
            name: values[0] || '',
            slug: values[1] || '',
            code: values[2] || '',
            path: values[3] || '',
            fullPath: values[4] || '',
            level: parseInt(values[5]) || 1,
            parent: values[6] || '',
            imageUrl: values[7] || '',
            productCount: parseInt(values[8]) || 0,
            hasChildren: values[9] === 'Yes',
          };

          if (!category.name) {
            errors.push(`Row ${i + 1}: Missing category name`);
            continue;
          }

          categories.push(category);
        } catch (error) {
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Parse error'}`);
        }
      }

      console.log(`Parsed ${categories.length} categories from CSV`);

      // Send to backend using the bulk import endpoint with API key
      console.log('Sending category import request with API key');
      
      const response = await fetch(`${API_URL}/categories/import-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicAnonKey, // Using public key for now as workaround
        },
        body: JSON.stringify(categories),
      });

      console.log('Category import response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Category import failed:', errorData);
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log('Category import successful:', result);

      setResult({
        success: categories.length,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Import Categories</h1>
          <p className="text-muted-foreground mt-2">Upload the category CSV file to import hierarchical categories</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/admin/categories')}>
          Back to Categories
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV File Upload</CardTitle>
          <CardDescription>
            Upload your category-data.csv file with hierarchical category structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <FileSpreadsheet className="size-16 text-muted-foreground" />
              
              <div className="text-center">
                <h3 className="font-semibold mb-2">Upload Category CSV</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Expected columns: Name, Slug, Code, Path, Full Path, Level, Parent, Image URL, Product Count, Has Children
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
              <h3 className="font-semibold mb-3">Preview (First 10 categories)</h3>
              <div className="border rounded overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Level</th>
                      <th className="px-4 py-2 text-left font-medium">Name</th>
                      <th className="px-4 py-2 text-left font-medium">Parent</th>
                      <th className="px-4 py-2 text-left font-medium">Slug</th>
                      <th className="px-4 py-2 text-left font-medium">Children</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((cat, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            L{cat.level}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span style={{ paddingLeft: `${(cat.level - 1) * 16}px` }}>
                            {cat.name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{cat.parent || '-'}</td>
                        <td className="px-4 py-2 font-mono text-xs">{cat.slug}</td>
                        <td className="px-4 py-2">
                          {cat.hasChildren ? '✓' : ''}
                        </td>
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
                  Importing Categories...
                </>
              ) : (
                <>
                  <Upload className="size-5 mr-2" />
                  Import Categories
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

            <Button onClick={() => navigate('/admin/categories')} className="w-full">
              View All Categories
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}