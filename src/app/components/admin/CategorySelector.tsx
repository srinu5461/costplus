import { useState, useEffect } from 'react';
import { CategoryNode } from '../../context/CMSContext';

interface CategorySelectorProps {
  categoryTree: CategoryNode[];
  value: {
    categoryLevel1?: string;
    categoryLevel2?: string;
    categoryLevel3?: string;
    categoryLevel4?: string;
    categoryLevel1Id?: string;
    categoryLevel2Id?: string;
    categoryLevel3Id?: string;
    categoryLevel4Id?: string;
    wholePath?: string;
    category?: string;
  };
  onChange: (categoryData: {
    categoryLevel1: string;
    categoryLevel2: string;
    categoryLevel3: string;
    categoryLevel4: string;
    categoryLevel1Id: string;
    categoryLevel2Id: string;
    categoryLevel3Id: string;
    categoryLevel4Id: string;
    wholePath: string;
    category: string;
    categoryId: string;
  }) => void;
}

export function CategorySelector({ categoryTree, value, onChange }: CategorySelectorProps) {
  const [selectedL1, setSelectedL1] = useState<CategoryNode | null>(null);
  const [selectedL2, setSelectedL2] = useState<CategoryNode | null>(null);
  const [selectedL3, setSelectedL3] = useState<CategoryNode | null>(null);
  const [selectedL4, setSelectedL4] = useState<CategoryNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Available options for each level
  const level1Options = categoryTree;
  const level2Options = selectedL1?.children || [];
  const level3Options = selectedL2?.children || [];
  const level4Options = selectedL3?.children || [];

  // Initialize from existing values when editing a product
  useEffect(() => {
    // Reset when switching to a new product or clearing (empty string or null)
    if (!value.categoryLevel1Id || value.categoryLevel1Id === '') {
      setSelectedL1(null);
      setSelectedL2(null);
      setSelectedL3(null);
      setSelectedL4(null);
      setIsInitialized(false);
      return;
    }

    // Only initialize once when we have category data
    if (value.categoryLevel1Id && categoryTree.length > 0 && !isInitialized) {
      // Find Level 1
      const l1 = categoryTree.find(cat => cat.code === value.categoryLevel1Id);
      if (l1) {
        setSelectedL1(l1);
        
        // Find Level 2 if exists
        if (value.categoryLevel2Id && l1.children && l1.children.length > 0) {
          const l2 = l1.children.find(cat => cat.code === value.categoryLevel2Id);
          if (l2) {
            setSelectedL2(l2);
            
            // Find Level 3 if exists
            if (value.categoryLevel3Id && l2.children && l2.children.length > 0) {
              const l3 = l2.children.find(cat => cat.code === value.categoryLevel3Id);
              if (l3) {
                setSelectedL3(l3);
                
                // Find Level 4 if exists
                if (value.categoryLevel4Id && l3.children && l3.children.length > 0) {
                  const l4 = l3.children.find(cat => cat.code === value.categoryLevel4Id);
                  if (l4) {
                    setSelectedL4(l4);
                  }
                }
              }
            }
          }
        }
        setIsInitialized(true);
      }
    }
  }, [value.categoryLevel1Id, categoryTree, isInitialized]);

  // Update parent component when selections change (but not during initialization)
  useEffect(() => {
    if (selectedL1 && isInitialized) {
      // Determine the deepest selected level
      const deepestNode = selectedL4 || selectedL3 || selectedL2 || selectedL1;
      
      // Build wholePath from fullPath
      const wholePath = deepestNode.fullPath || deepestNode.name;
      
      const categoryData = {
        categoryLevel1: selectedL1.name,
        categoryLevel2: selectedL2?.name || '',
        categoryLevel3: selectedL3?.name || '',
        categoryLevel4: selectedL4?.name || '',
        categoryLevel1Id: selectedL1.code,
        categoryLevel2Id: selectedL2?.code || '',
        categoryLevel3Id: selectedL3?.code || '',
        categoryLevel4Id: selectedL4?.code || '',
        wholePath: wholePath,
        category: selectedL1.name, // Main category is Level 1
        categoryId: deepestNode.code
      };

      onChange(categoryData);
    }
  }, [selectedL1, selectedL2, selectedL3, selectedL4, isInitialized]);

  const handleL1Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) {
      setSelectedL1(null);
      setSelectedL2(null);
      setSelectedL3(null);
      setSelectedL4(null);
      setIsInitialized(false);
      return;
    }
    
    const node = level1Options.find(cat => cat.code === code);
    setSelectedL1(node || null);
    // Clear child selections when parent changes
    setSelectedL2(null);
    setSelectedL3(null);
    setSelectedL4(null);
    setIsInitialized(true); // Mark as initialized when user makes a selection
  };

  const handleL2Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) {
      setSelectedL2(null);
      setSelectedL3(null);
      setSelectedL4(null);
      return;
    }
    
    const node = level2Options.find(cat => cat.code === code);
    setSelectedL2(node || null);
    // Clear child selections when parent changes
    setSelectedL3(null);
    setSelectedL4(null);
  };

  const handleL3Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) {
      setSelectedL3(null);
      setSelectedL4(null);
      return;
    }
    
    const node = level3Options.find(cat => cat.code === code);
    setSelectedL3(node || null);
    // Clear child selections when parent changes
    setSelectedL4(null);
  };

  const handleL4Change = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    if (!code) {
      setSelectedL4(null);
      return;
    }
    
    const node = level4Options.find(cat => cat.code === code);
    setSelectedL4(node || null);
  };

  return (
    <div className="space-y-3">
      <div className="border rounded-lg p-4 space-y-3 bg-white">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Category Selection</h3>
          {selectedL1 && (
            <span className="text-xs text-green-600 font-medium">
              ✓ {[selectedL1, selectedL2, selectedL3, selectedL4].filter(Boolean).length} level{[selectedL1, selectedL2, selectedL3, selectedL4].filter(Boolean).length > 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        
        {/* Level 1 - Always visible */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Level 1 - Main Category <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedL1?.code || ''}
            onChange={handleL1Change}
            className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            <option value="">-- Select Main Category --</option>
            {level1Options.map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.name} ({cat.children?.length || 0} subcategories)
              </option>
            ))}
          </select>
        </div>

        {/* Level 2 - Only show if L1 is selected AND has children */}
        {selectedL1 && level2Options.length > 0 && (
          <div className="pl-4 border-l-2 border-blue-200">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Level 2 - Subcategory under "{selectedL1.name}"
            </label>
            <select
              value={selectedL2?.code || ''}
              onChange={handleL2Change}
              className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Subcategory (Optional) --</option>
              {level2Options.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {selectedL1.name} → {cat.name} ({cat.children?.length || 0} subcategories)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Level 3 - Only show if L2 is selected AND has children */}
        {selectedL2 && level3Options.length > 0 && (
          <div className="pl-8 border-l-2 border-blue-300">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Level 3 - Subcategory under "{selectedL2.name}"
            </label>
            <select
              value={selectedL3?.code || ''}
              onChange={handleL3Change}
              className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Subcategory (Optional) --</option>
              {level3Options.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {selectedL1.name} → {selectedL2.name} → {cat.name} ({cat.children?.length || 0} subcategories)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Level 4 - Only show if L3 is selected AND has children */}
        {selectedL3 && level4Options.length > 0 && (
          <div className="pl-12 border-l-2 border-blue-400">
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Level 4 - Subcategory under "{selectedL3.name}"
            </label>
            <select
              value={selectedL4?.code || ''}
              onChange={handleL4Change}
              className="w-full p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">-- Select Subcategory (Optional) --</option>
              {level4Options.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {selectedL1.name} → {selectedL2.name} → {selectedL3.name} → {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Display the auto-generated path */}
        {selectedL1 && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-1">📍 Category Path:</p>
            <p className="text-sm font-mono text-blue-700">
              {[
                selectedL1?.name,
                selectedL2?.name,
                selectedL3?.name,
                selectedL4?.name
              ].filter(Boolean).join(' → ')}
            </p>
          </div>
        )}
      </div>

      {/* Show IDs for reference */}
      {selectedL1 && (
        <div className="border rounded-lg p-4 space-y-2 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">🔑 Auto-Assigned Category IDs</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {selectedL1 && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <span className="text-slate-500 font-medium">Level 1:</span>
                <code className="font-bold text-slate-900">{selectedL1.code}</code>
              </div>
            )}
            {selectedL2 && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <span className="text-slate-500 font-medium">Level 2:</span>
                <code className="font-bold text-slate-900">{selectedL2.code}</code>
              </div>
            )}
            {selectedL3 && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <span className="text-slate-500 font-medium">Level 3:</span>
                <code className="font-bold text-slate-900">{selectedL3.code}</code>
              </div>
            )}
            {selectedL4 && (
              <div className="flex items-center gap-2 bg-white p-2 rounded border">
                <span className="text-slate-500 font-medium">Level 4:</span>
                <code className="font-bold text-slate-900">{selectedL4.code}</code>
              </div>
            )}
          </div>
          <div className="pt-2 border-t mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Final Category ID:</span>
              <code className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">
                {(selectedL4 || selectedL3 || selectedL2 || selectedL1)?.code}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}