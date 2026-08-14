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

  const pollSyncStatus = async () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sync-products/status`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        const data = await res.json();
        const status = data?.status?.status;

        if (status === 'completed') {
          clearInterval(interval);
          setSyncing(false);
          toast.success(
            `Sync complete! ${data.status.totalCount?.toLocaleString()} products in ${data.status.chunks} chunks.`,
            { id: 'sync', duration: 5000 }
          );
          await queryClient.invalidateQueries({ queryKey: ['products-json'] });
          setRefreshKey(prev => prev + 1);
        } else if (status === 'failed') {
          clearInterval(interval);
          setSyncing(false);
          toast.error(`Sync failed: ${data.status.error}`, { id: 'sync' });
        } else if (status === 'running') {
          const count = data.status.totalCount || 0;
          const chunks = data.status.chunksUploaded || 0;
          toast.loading(`Syncing... ${count.toLocaleString()} products, ${chunks} chunks uploaded`, { id: 'sync' });
        }
      } catch (e) {
        // ignore poll errors
      }
    }, 5000);
  };

  const handleSync = async () => {
    setSyncing(true);
    toast.loading('Starting CDN sync in background...', { id: 'sync' });

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

      toast.loading('Sync running in background — checking progress...', { id: 'sync' });
      pollSyncStatus();

    } catch (error) {
      console.error('Sync error:', error);
      setSyncing(false);
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
