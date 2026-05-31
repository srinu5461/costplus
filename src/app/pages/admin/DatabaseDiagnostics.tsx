import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { RefreshCw } from 'lucide-react';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

export function DatabaseDiagnostics() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkDatabaseKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/db/keys`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        error: error instanceof Error ? error.message : String(error) 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Database Diagnostics</h1>

      <Card>
        <CardHeader>
          <CardTitle>Check Database Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={checkDatabaseKeys} 
            disabled={loading}
            className="mb-4"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Database Keys'
            )}
          </Button>

          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>

              {result.status === 'ok' && (
                <div className="mt-4 space-y-2">
                  <p className="font-semibold">Summary:</p>
                  <p>Total Keys: {result.totalKeys}</p>
                  <p>Has Products: {result.hasProducts ? '✅ YES' : '❌ NO'}</p>
                  <p>Has Categories: {result.hasCategories ? '✅ YES' : '❌ NO'}</p>
                  
                  {!result.hasProducts && (
                    <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                        ⚠️ No products found in database!
                      </p>
                      <p className="mt-2">
                        You need to import products. Go to Admin → Import Products.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
