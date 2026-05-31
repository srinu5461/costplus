/**
 * PRODUCT-CATEGORY ASSIGNMENT VERIFICATION
 * Verifies and fixes product-category relationships after CSV import
 * Ensures products have correct categoryId references
 */

import { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Package, FolderTree, Loader } from 'lucide-react';
import { API_URL } from '../../lib/supabase';
import { publicAnonKey } from '@/utils/supabase/info';

interface AssignmentStats {
  totalProducts: number;
  productsWithCategoryId: number;
  productsWithCategoryName: number;
  productsWithoutCategories: number;
  uniqueCategories: string[];
  categoryMatches: Record<string, number>;
  unmatchedCategories: string[];
}

export default function ProductCategoryAssignment() {
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Don't load on mount - only load when analyzing
  const loadCategories = async () => {
    try {
      console.log('📂 Loading categories...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
      const response = await fetch(`${API_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.categories?.length || 0} categories`);
      setCategories(data.categories || []);
      return data.categories || [];
    } catch (err: any) {
      console.error('❌ Failed to load categories:', err);
      throw err;
    }
  };

  const analyzeAssignments = async () => {
    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('🔍 Analyzing product-category assignments...');

      // Load categories first if not already loaded
      let currentCategories = categories;
      if (categories.length === 0) {
        try {
          currentCategories = await loadCategories();
        } catch (err: any) {
          setError('Failed to load categories. Please try again.');
          setAnalyzing(false);
          return;
        }
      }

      // Load all products with timeout (use high limit to get all products)
      console.log('📦 Loading products...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout
      
      const productsResponse = await fetch(`${API_URL}/products?limit=50000`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!productsResponse.ok) {
        throw new Error(`Failed to load products: ${productsResponse.status}`);
      }
      
      const productsData = await productsResponse.json();
      const products = productsData.products || [];

      console.log(`📦 Analyzing ${products.length} products...`);

      // Analyze assignments
      const analysis: AssignmentStats = {
        totalProducts: products.length,
        productsWithCategoryId: 0,
        productsWithCategoryName: 0,
        productsWithoutCategories: 0,
        uniqueCategories: [],
        categoryMatches: {},
        unmatchedCategories: []
      };

      const categoryNames = new Set<string>();
      const categoryMatchCounts: Record<string, number> = {};

      products.forEach((product: any) => {
        // Check for categoryId or category_id
        const hasCategoryId = product.categoryId || product.category_id;
        if (hasCategoryId) {
          analysis.productsWithCategoryId++;
        }

        // Check for category name
        const categoryName = product.category;
        if (categoryName && categoryName !== 'Uncategorized') {
          analysis.productsWithCategoryName++;
          categoryNames.add(categoryName);

          // Try to match with existing categories
          const matchedCategory = currentCategories.find(c => 
            c.name?.toLowerCase().trim() === categoryName.toLowerCase().trim()
          );

          if (matchedCategory) {
            categoryMatchCounts[categoryName] = (categoryMatchCounts[categoryName] || 0) + 1;
          } else {
            if (!analysis.unmatchedCategories.includes(categoryName)) {
              analysis.unmatchedCategories.push(categoryName);
            }
          }
        }

        // Check if product has no category info
        if (!hasCategoryId && (!categoryName || categoryName === 'Uncategorized')) {
          analysis.productsWithoutCategories++;
        }
      });

      analysis.uniqueCategories = Array.from(categoryNames).sort();
      analysis.categoryMatches = categoryMatchCounts;

      console.log('✅ Analysis complete:', analysis);
      setStats(analysis);

    } catch (err: any) {
      console.error('❌ Analysis error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. The server is processing a large dataset. Please wait a moment and try again.');
      } else {
        setError('Failed to analyze assignments: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const fixAssignments = async () => {
    if (!confirm('This will update all products with matching category IDs. Continue?')) {
      return;
    }

    setFixing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log('🔧 Starting assignment fix...');

      // Load categories first if not already loaded
      let currentCategories = categories;
      if (categories.length === 0) {
        try {
          currentCategories = await loadCategories();
        } catch (err: any) {
          setError('Failed to load categories. Please try again.');
          setFixing(false);
          return;
        }
      }

      // Create category lookup map (lowercase name -> id) to send to backend
      const categoryLookup: Record<string, string> = {};
      currentCategories.forEach(cat => {
        if (cat.name) {
          categoryLookup[cat.name.toLowerCase().trim()] = cat.id;
        }
      });

      console.log(`📋 Category lookup map created with ${Object.keys(categoryLookup).length} entries`);

      // Use bulk assignment endpoint with pagination
      const BATCH_SIZE = 500; // Process 500 products per batch
      let offset = 0;
      let hasMore = true;
      let totalUpdated = 0;
      let totalSkipped = 0;

      while (hasMore) {
        console.log(`📤 Processing batch: offset=${offset}...`);

        const response = await fetch(`${API_URL}/bulk-operations/assign-categories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            categoryLookup,
            offset,
            limit: BATCH_SIZE
          })
        });

        if (!response.ok) {
          throw new Error(`Bulk assignment failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }

        totalUpdated += result.updated;
        totalSkipped += result.skipped;
        hasMore = result.hasMore;
        offset = result.nextOffset;

        console.log(`✅ Batch complete: ${result.updated} updated, ${result.skipped} skipped (${result.progress})`);
        
        // Update progress message for user feedback
        setSuccessMessage(`Processing... ${result.progress} (${result.percentComplete}% complete)`);
      }

      console.log(`✅ Assignment fix complete: ${totalUpdated} updated, ${totalSkipped} skipped`);
      setSuccessMessage(`Successfully updated ${totalUpdated} products with category IDs. ${totalSkipped} products skipped.`);

      // Re-analyze to show new stats
      await analyzeAssignments();

    } catch (err: any) {
      console.error('❌ Fix error:', err);
      setError('Failed to fix assignments: ' + (err.message || 'Unknown error'));
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FolderTree className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-800">Product-Category Assignment</h1>
          </div>
          <p className="text-slate-600">
            Verify and fix product-category relationships after CSV import. This tool ensures all products 
            have the correct categoryId references for proper filtering and navigation.
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <div className="flex gap-4">
            <button
              onClick={analyzeAssignments}
              disabled={analyzing}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {analyzing ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Analyze Assignments
                </>
              )}
            </button>

            {stats && stats.productsWithCategoryName > 0 && (
              <button
                onClick={fixAssignments}
                disabled={fixing}
                className="flex-1 bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {fixing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Fix Assignments
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-800">Success</h3>
                <p className="text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-800 mb-4">Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-slate-800">{stats.totalProducts}</div>
                  <div className="text-sm text-slate-600 mt-1">Total Products</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">{stats.productsWithCategoryId}</div>
                  <div className="text-sm text-slate-600 mt-1">With Category ID</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{stats.productsWithCategoryName}</div>
                  <div className="text-sm text-slate-600 mt-1">With Category Name</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">{stats.productsWithoutCategories}</div>
                  <div className="text-sm text-slate-600 mt-1">Uncategorized</div>
                </div>
              </div>
            </div>

            {/* Category Matches */}
            {stats.uniqueCategories.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-semibold text-slate-800 mb-4">
                  Category Distribution ({stats.uniqueCategories.length} unique)
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stats.uniqueCategories.map((catName, idx) => {
                    const count = stats.categoryMatches[catName] || 0;
                    const isMatched = count > 0;
                    const matchedCategory = categories.find(c => 
                      c.name?.toLowerCase().trim() === catName.toLowerCase().trim()
                    );

                    return (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded border ${
                          isMatched 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isMatched ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                          )}
                          <span className="font-medium text-slate-800">{catName}</span>
                          {matchedCategory && (
                            <span className="text-xs text-slate-500">
                              (ID: {matchedCategory.id})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-slate-600">
                          {count > 0 ? `${count} products` : 'No match found'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unmatched Categories Warning */}
            {stats.unmatchedCategories.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                      Unmatched Categories ({stats.unmatchedCategories.length})
                    </h3>
                    <p className="text-yellow-700 mb-3">
                      These category names in your CSV don't match any existing categories in the system. 
                      Products with these categories won't appear in category pages until you either:
                    </p>
                    <ul className="list-disc list-inside text-yellow-700 mb-3 space-y-1">
                      <li>Create matching categories in the Category Management section</li>
                      <li>Update the product CSV to use existing category names</li>
                    </ul>
                    <div className="bg-white rounded p-3 space-y-1">
                      {stats.unmatchedCategories.map((cat, idx) => (
                        <div key={idx} className="text-sm text-slate-700">• {cat}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Good! */}
            {stats.unmatchedCategories.length === 0 && stats.productsWithCategoryId > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-800">All Products Properly Assigned!</h3>
                    <p className="text-green-700">
                      All products with category names have been matched to existing categories and assigned proper category IDs.
                      Your products will display correctly on category pages.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        {!stats && (
          <div className="bg-slate-100 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-3">How It Works</h3>
            <ol className="list-decimal list-inside text-slate-700 space-y-2">
              <li>Click "Analyze Assignments" to check how products are assigned to categories</li>
              <li>The tool will show which products have category IDs and which only have category names</li>
              <li>If products have category names but no IDs, the tool will attempt to match them to existing categories</li>
              <li>Click "Fix Assignments" to automatically assign category IDs based on category name matches</li>
              <li>Any unmatched categories will be highlighted - you'll need to create these categories first</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}