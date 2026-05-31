import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function DebugProduct() {
  const [productCode, setProductCode] = useState('');
  const [dbData, setDbData] = useState<any>(null);
  const [uropaData, setUropaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!productCode) return;
    
    setLoading(true);
    setDbData(null);
    setUropaData(null);
    
    try {
      // Fetch compare data (includes both DB and Uropa)
      const response = await fetch(`${API_URL}/description-sync/compare/${productCode}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUropaData(data.uropa);
        
        // Also try to fetch from the products endpoint
        const productsResponse = await fetch(`${API_URL}/products/${productCode}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        });
        
        if (productsResponse.ok) {
          const productData = await productsResponse.json();
          setDbData(productData);
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Product Data</h1>
      
      <Card className="p-4 mb-6">
        <div className="flex gap-3">
          <Input
            placeholder="Enter product code (e.g., 92704)"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
          />
          <Button onClick={handleCheck} disabled={loading || !productCode}>
            {loading ? 'Checking...' : 'Check Product'}
          </Button>
        </div>
      </Card>

      {dbData && (
        <Card className="p-4 mb-4">
          <h2 className="text-xl font-bold mb-3">📦 Database Data</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {dbData.name}</div>
            <div><strong>Code:</strong> {dbData.code}</div>
            <div><strong>Description Length:</strong> {dbData.description?.length || 0} chars</div>
            <div><strong>Specifications Count:</strong> {Array.isArray(dbData.specifications) ? dbData.specifications.length : typeof dbData.specifications}</div>
            <div><strong>Last Sync:</strong> {dbData.lastDescriptionSync || 'Never'}</div>
            
            {dbData.specifications && Array.isArray(dbData.specifications) && (
              <div className="mt-4">
                <strong>Specifications Preview (first 5):</strong>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(dbData.specifications.slice(0, 5), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}

      {uropaData && (
        <Card className="p-4">
          <h2 className="text-xl font-bold mb-3">🌐 Uropa API Data</h2>
          <div className="space-y-2 text-sm">
            <div><strong>Description Length:</strong> {uropaData.descriptionLength} chars</div>
            <div><strong>Specifications Count:</strong> {uropaData.specificationsCount}</div>
            <div><strong>Attributes Count:</strong> {uropaData.attributesCount}</div>
            
            {uropaData.specifications && uropaData.specifications.length > 0 && (
              <div className="mt-4">
                <strong>Specifications Preview (first 5):</strong>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(uropaData.specifications.slice(0, 5), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
