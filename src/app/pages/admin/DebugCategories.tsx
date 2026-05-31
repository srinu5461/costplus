import { useCMS } from '../../context/CMSContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { buildCategoryTree } from '../../utils/categoryTree';
import { Upload, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';

export function DebugCategories() {
  // ✅ Safe access to CMS context with fallback
  let data;
  try {
    const cms = useCMS();
    data = cms.data;
  } catch (e) {
    console.error('DebugCategories: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
  }
  
  const navigate = useNavigate();
  const tree = buildCategoryTree(data.categoryTree);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Category Debug Information</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/import-categories')} variant="default">
            <Upload className="size-4 mr-2" />
            Import Categories CSV
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {data.categoryTree.length === 0 && (
        <Card className="border-orange-500 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div>
                <h3 className="font-bold text-lg mb-2">No Categories Found!</h3>
                <p className="text-sm mb-4">
                  Your category tree is empty. You need to import the category CSV file to see the hierarchical tree structure.
                </p>
                <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
                  <li>Click the <strong>"Import Categories CSV"</strong> button above</li>
                  <li>Choose the file: <code className="bg-white px-2 py-0.5 rounded">/src/imports/pasted_text/category-data.csv</code></li>
                  <li>Click "Import Categories"</li>
                  <li>Wait for success message</li>
                  <li>Return here and click "Refresh"</li>
                </ol>
                <Button onClick={() => navigate('/admin/import-categories')} size="lg" className="mt-2">
                  <Upload className="size-5 mr-2" />
                  Go to Import Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Raw Category Tree Data (First 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(data.categoryTree.slice(0, 10), null, 2)}
          </pre>
          <p className="mt-2 text-sm">
            Total nodes in categoryTree: <strong>{data.categoryTree.length}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Built Tree Structure (First 3 roots)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-slate-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(tree.slice(0, 3), null, 2)}
          </pre>
          <p className="mt-2 text-sm">
            Total root nodes: <strong>{tree.length}</strong>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.categoryTree.length > 0 ? (
              <>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(level => {
                  const count = data.categoryTree.filter(n => n.level === level).length;
                  if (count === 0) return null;
                  return (
                    <div key={level} className="flex items-center gap-4">
                      <span className="font-bold w-20">Level {level}:</span>
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-sm text-muted-foreground">categories</span>
                    </div>
                  );
                })}
                <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold mb-2">Debug: Level field types</p>
                  <div className="text-xs space-y-1">
                    {data.categoryTree.slice(0, 5).map((node: any, idx: number) => (
                      <div key={idx}>
                        {node.name}: level = {node.level} (type: {typeof node.level})
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground italic">No level data available - import categories first</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample Parent-Child Relationships</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.categoryTree.length > 0 ? (
              data.categoryTree.slice(0, 20).map((node, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="font-bold">{node.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Level: {node.level} | Path: {node.path} | Parent: {node.parent || 'none'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground italic">No category data available - import categories first</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}