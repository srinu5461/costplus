// v3.0 - Removed react-window, using custom virtual scroll
import { useState, useEffect } from 'react';
import { VirtualizedProductList } from '../../components/VirtualizedProductList';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { RefreshCw, Database, Info } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function ProductsVirtualized() {
  const [syncing, setSyncing] = useState(false);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Load database diagnostic info
    fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products-count`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => setDbInfo(data))
      .catch((err) => console.error('Failed to load DB info:', err));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    toast.loading('Syncing products to CDN...', { id: 'sync' });

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sync-products`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();

      toast.success(
        `Successfully synced ${result.count.toLocaleString()} products to CDN! The list will refresh automatically.`,
        { id: 'sync', duration: 5000 }
      );

      // ✅ FORCE FRESH DATA: Invalidate React Query cache to fetch fresh products from CDN
      await queryClient.invalidateQueries({ queryKey: ['products-json'] });

      // Trigger a component refresh without full page reload
      setRefreshKey(prev => prev + 1);

      // Reload DB info
      fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/products-count`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      )
        .then((res) => res.json())
        .then((data) => setDbInfo(data))
        .catch((err) => console.error('Failed to reload DB info:', err));
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync products',
        { id: 'sync' }
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Sync Banner */}
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-blue-600" />
              <div>
                <h2 className="font-semibold text-blue-900">
                  Virtualized Product List
                </h2>
                <p className="text-sm text-blue-700">
                  Database → JSON (CDN) → React Virtual List
                </p>
              </div>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync to CDN'}
            </button>
          </div>
          {dbInfo && (
            <div className="flex items-center gap-2 text-sm text-blue-800 bg-blue-100 px-3 py-2 rounded">
              <Info className="w-4 h-4" />
              <span>
                Database: {dbInfo.table} | Products: {dbInfo.totalCount?.toLocaleString() || 0}
                {dbInfo.sampleKeys && dbInfo.sampleKeys.length > 0 && (
                  <span className="ml-2 text-blue-600">
                    (Sample: {dbInfo.sampleKeys.slice(0, 2).join(', ')})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 overflow-hidden">
        <VirtualizedProductList key={refreshKey} refreshTrigger={refreshKey} />
      </div>
    </div>
  );
}
