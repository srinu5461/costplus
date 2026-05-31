import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCMS, CategoryNode } from '../../context/CMSContext';
import { buildCategoryTree, flattenTree } from '../../utils/categoryTree';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit2,
  Save,
  X,
  Package,
  Upload,
  Hash,
  Check
} from 'lucide-react';

// Import Supabase config with absolute path
const projectId = 'bqtzxoteoucvioxqgfpc';
const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxdHp4b3Rlb3VjdmlveHFnZnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjYwMDIsImV4cCI6MjA4ODM0MjAwMn0.WtWmz2qJ2NNMx7LHnkrYnJqR9b8cC-IDTVyKaWs9Ta4';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049`;

interface EditingCategory {
  path: string;
  name: string;
  slug: string;
  code: string;
  imageUrl: string;
}

export function CategoriesManager() {
  const navigate = useNavigate();
  
  // ✅ Safe access to CMS context with fallback
  let data, updateCategories;
  try {
    const cms = useCMS();
    data = cms.data;
    updateCategories = cms.updateCategories;
  } catch (e) {
    console.error('CategoriesManager: CMSProvider not available, using empty data');
    data = {
      products: [],
      categories: [],
      categoryTree: [],
      header: { logo: '', phone: '', workingHours: '', navigation: [] },
      footer: { about: '', email: '', phone: '', address: '', socialMedia: {} },
      homepage: { hero: { title: '', subtitle: '', image: '' }, features: [] },
    };
    updateCategories = async () => {};
  }
  
  const [categories, setCategories] = useState(data.categories);
  const [categoryTreeData, setCategoryTreeData] = useState(data.categoryTree);
  const [saving, setSaving] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<EditingCategory | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCategoryLevel, setNewCategoryLevel] = useState(1);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState<string>('');
  const [disabledSubcategories, setDisabledSubcategories] = useState<Set<string>>(
    new Set(data.categoryTree?.filter((n: any) => n.status === 0 || n.disabled).map((n: any) => n.path) || [])
  );

  // Toggle subcategory visibility status
  const handleToggleSubcategoryStatus = (path: string) => {
    setDisabledSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(path)) { next.delete(path); } else { next.add(path); }
      return next;
    });

    setCategoryTreeData(prevTree => prevTree.map(node => {
      if (node.path === path) {
        const currentlyDisabled = disabledSubcategories.has(path);
        return { ...node, status: currentlyDisabled ? 1 : 0, disabled: !currentlyDisabled };
      }
      return node;
    }));
  };
  // Build tree from category tree data
  const categoryTree = buildCategoryTree(categoryTreeData);
  const hasTreeData = categoryTree.length > 0;

  // Get statistics
  const getTreeStats = () => {
    const levelCounts: Record<number, number> = {};
    categoryTreeData.forEach(node => {
      levelCounts[node.level] = (levelCounts[node.level] || 0) + 1;
    });
    return levelCounts;
  };

  const stats = hasTreeData ? getTreeStats() : {};
  const maxLevel = Math.max(...Object.keys(stats).map(Number), 0);

  // Handle updating a category
  const handleUpdateCategory = (path: string, updates: Partial<CategoryNode>) => {
    const updatedTree = categoryTreeData.map(node => 
      node.path === path ? { ...node, ...updates } : node
    );
    setCategoryTreeData(updatedTree);
  };

  // Handle deleting a category
  const handleDeleteCategory = (path: string) => {
    if (window.confirm('Are you sure you want to delete this category? This will also delete all its children.')) {
      // 1. Find the target node name to remove it from the legacy flat list too
      const targetNode = categoryTreeData.find(node => node.path === path);
      
      // 2. Filter out the node and its children from the tree data
      const updatedTree = categoryTreeData.filter(node => 
        node.path && node.path !== path && !node.path.startsWith(path + '/')
      );
      
      // 3. Keep the flat category array in sync
      if (targetNode) {
        setCategories(prev => prev.filter(cat => cat !== targetNode.name));
      }
      
      setCategoryTreeData(updatedTree);
    }
  };

  // Handle adding a child category
  const handleAddChild = (parentPath: string) => {
    const parent = categoryTreeData.find(n => n.path === parentPath);
    if (!parent) return;

    const newSlug = `new-category-${Date.now()}`;
    const newPath = `${parentPath}/${newSlug}`;
    
    const newCategory: CategoryNode = {
      name: 'New Category',
      slug: newSlug,
      code: newSlug,
      path: newPath,
      fullPath: `${parent.fullPath} > New Category`,
      level: parent.level + 1,
      parent: parent.name,
      imageUrl: '',
      productCount: 0,
      hasChildren: false,
      children: []
    };

    setCategoryTreeData([...categoryTreeData, newCategory]);
  };

  // Handle adding a new category at any level
  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) {
      alert('Please enter a category name');
      return;
    }

    const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let path = slug;
    let fullPath = newCategoryName;
    let parentName = '';

    // If level > 1 and parent is selected, build the path
    if (newCategoryLevel > 1 && newCategoryParent) {
      const parent = categoryTreeData.find(n => n.path === newCategoryParent);
      if (parent) {
        path = `${parent.path}/${slug}`;
        fullPath = `${parent.fullPath} > ${newCategoryName}`;
        parentName = parent.name;
      }
    }

    const newCategory: CategoryNode = {
      name: newCategoryName,
      slug,
      code: slug,
      path,
      fullPath,
      level: newCategoryLevel,
      parent: parentName,
      imageUrl: '',
      productCount: 0,
      hasChildren: false,
      children: []
    };

    setCategoryTreeData([...categoryTreeData, newCategory]);
    setShowAddDialog(false);
    setNewCategoryName('');
    setNewCategoryLevel(1);
    setNewCategoryParent('');
  };

  // Save all changes to the server
   const handleSaveChanges = async () => {
    setSaving(true);
    
    try {
      // Strip out the 'children' property before saving to reduce payload size
      const flattenedData = categoryTreeData.map(node => {
        const { children, ...nodeWithoutChildren } = node;
        const isNodeDisabled = disabledSubcategories.has(node.path);
        return {
          ...nodeWithoutChildren,
          status: isNodeDisabled ? 0 : 1,
          disabled: isNodeDisabled
        };
      });
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      };
      
      // Save to server via API endpoint for category tree
      const response = await fetch(`${API_URL}/categories/tree`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(flattenedData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save categories: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      // ✅ FIX: Instantly sync changes with the global CMS Context cache
      if (updateCategories) {
        await updateCategories(categories);
      }
      
      alert('Categories saved successfully!');
      // 🚀 REMOVED window.location.reload() to prevent logging out!
      
    } catch (error) {
      alert('Failed to save categories: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    updateCategories(categories).then(() => {
      alert('Categories saved successfully!');
    }).catch((error) => {
      alert('Failed to save categories: ' + error.message);
    });
  };

  const addCategory = () => {
    setCategories([...categories, 'New Category']);
  };

  const updateCategory = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index] = value;
    setCategories(newCategories);
  };

  const deleteCategory = (index: number) => {
    if (categories[index] === 'All Equipment') {
      alert('Cannot delete \"All Equipment\" category');
      return;
    }
    setCategories(categories.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl mb-2">Categories Manager v3.0 🔑</h1>
          <p className="text-muted-foreground">
            {hasTreeData 
              ? `Managing ${data.categoryTree.length} hierarchical categories across ${maxLevel} levels` 
              : `Managing ${categories.length} categories`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/import-categories')} variant="outline">
            <Upload className="size-5 mr-2" />
            Import CSV
          </Button>
          {hasTreeData && (
            <>
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="size-5 mr-2" />
                Add Category
              </Button>
              <Button onClick={handleSaveChanges} size="lg" disabled={saving}>
                <Save className="size-5 mr-2" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </>
          )}
          {!hasTreeData && (
            <>
              <Button onClick={addCategory} variant="outline">
                <Plus className="size-5 mr-2" />
                Add Category
              </Button>
              <Button onClick={handleSave} size="lg">
                <Save className="size-5 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Add Category Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>Create a new category at any level in the hierarchy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                  id="category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="category-level">Level</Label>
                <select
                  id="category-level"
                  value={newCategoryLevel}
                  onChange={(e) => {
                    setNewCategoryLevel(Number(e.target.value));
                    setNewCategoryParent('');
                  }}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value={1}>Level 1 (Top Level)</option>
                  <option value={2}>Level 2</option>
                  <option value={3}>Level 3</option>
                  <option value={4}>Level 4</option>
                </select>
              </div>
              {newCategoryLevel > 1 && (
                <div>
                  <Label htmlFor="category-parent">Parent Category</Label>
                  <select
                    id="category-parent"
                    value={newCategoryParent}
                    onChange={(e) => setNewCategoryParent(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Select a parent...</option>
                    {categoryTreeData
                      .filter(n => n.level === newCategoryLevel - 1)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(n => (
                        <option key={n.path} value={n.path}>{n.fullPath}</option>
                      ))}
                  </select>
                  {newCategoryLevel > 1 && !newCategoryParent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Select a Level {newCategoryLevel - 1} category as the parent
                    </p>
                  )}
                </div>
              )}
            </CardContent>
            <div className="flex gap-2 p-6 pt-0">
              <Button onClick={handleAddNewCategory} className="flex-1">
                <Plus className="size-4 mr-2" />
                Add Category
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowAddDialog(false);
                  setNewCategoryName('');
                  setNewCategoryLevel(1);
                  setNewCategoryParent('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {hasTreeData ? (
        /* Hierarchical Tree View */
        <div className="grid grid-cols-1 gap-6">
          {/* Statistics Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2">
            <CardContent className="pt-6">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Hash className="size-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-900">{data.categoryTree.length}</div>
                    <div className="text-xs text-blue-700">Total Categories</div>
                  </div>
                </div>
                {Object.entries(stats).sort(([a], [b]) => Number(a) - Number(b)).map(([level, count]) => (
                  <div key={level} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      Number(level) === 1 ? 'bg-blue-500' :
                      Number(level) === 2 ? 'bg-green-500' :
                      Number(level) === 3 ? 'bg-purple-500' :
                      Number(level) === 4 ? 'bg-orange-500' : 'bg-gray-500'
                    }`} />
                    <div>
                      <div className="text-xl font-bold text-slate-800">{count}</div>
                      <div className="text-xs text-slate-600">Level {level}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tree View Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="size-5 text-amber-600" />
                Category Hierarchy Tree
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-2 flex items-center gap-4">
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-100 text-blue-800 border-blue-300">L1</span>
                  = Level 1 (Top)
                </span>
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-green-100 text-green-800 border-green-300">L2</span>
                  = Level 2
                </span>
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-100 text-purple-800 border-purple-300">L3</span>
                  = Level 3
                </span>
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-orange-100 text-orange-800 border-orange-300">L4</span>
                  = Level 4
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5 max-h-[700px] overflow-y-auto border rounded-md p-4 bg-slate-50">
                {/* All Equipment */}
                <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold mb-3 shadow-md">
                  <Folder className="size-5" />
                  <span className="flex-1">All Equipment</span>
                  <span className="bg-white text-blue-700 px-3 py-1 rounded-md text-sm font-bold">
                    {data.products.length}
                  </span>
                </div>

                {/* Category Tree */}
                {categoryTree
                  .sort((a, b) => a.name.localeCompare(b.name)) // Sort root level alphabetically
                  .map((rootNode) => (
                  <CategoryTreeNode 
                    key={rootNode.path} 
                    node={rootNode} 
                    level={0}
                    displayLevel={rootNode.level} // Use actual level from database
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                    onAddChild={handleAddChild}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                    editingNode={editingNode}
                    setEditingNode={setEditingNode}
                    disabledSubcategories={disabledSubcategories} // Added line
                    onToggleStatus={handleToggleSubcategoryStatus} // Added line
                  />
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>📊 Hierarchy Info:</strong> Categories are organized by their database level (L1-L{maxLevel}). 
                  Each level is color-coded for easy identification. Click folders to expand/collapse children.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Flat List Editor (Legacy) */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
              {categories.map((category, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={category}
                    onChange={(e) => updateCategory(index, e.target.value)}
                    disabled={category === 'All Equipment'}
                    className={category === 'All Equipment' ? 'bg-slate-100' : ''}
                    placeholder="Use ' > ' for subcategories (e.g., Main > Sub)"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCategory(index)}
                    disabled={category === 'All Equipment'}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {categories.map((category, index) => {
                  const productCount = category === 'All Equipment'
                    ? data.products.length
                    : data.products.filter(p => p.category === category || p.category?.startsWith(category + ' > ')).length;
                  
                  return (
                    <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                      <span className={category === 'All Equipment' ? 'font-semibold' : ''}>
                        {category}
                      </span>
                      <span className="bg-slate-200 px-2 py-0.5 rounded text-xs">
                        {productCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Recursive tree component with enhanced level display and editing
function CategoryTreeNode({ 
  node, 
  level = 0, 
  displayLevel,
  onUpdate,
  onDelete,
  onAddChild,
  expandedNodes,
  setExpandedNodes,
  editingNode,
  setEditingNode
}: { 
  node: CategoryNode; 
  level?: number; 
  displayLevel: number;
  onUpdate: (path: string, updates: Partial<CategoryNode>) => void;
  onDelete: (path: string) => void;
  onAddChild: (parentPath: string) => void;
  expandedNodes: Set<string>;
  setExpandedNodes: (nodes: Set<string>) => void;
  editingNode: EditingCategory | null;
  setEditingNode: (node: EditingCategory | null) => void;
}) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name || '');
  const [editLevel, setEditLevel] = useState(displayLevel);
  const [editSlug, setEditSlug] = useState(node.slug || '');
  const [editCode, setEditCode] = useState(node.code || '');
  const [editImageUrl, setEditImageUrl] = useState(node.imageUrl || '');
  
  const hasChildren = node.children && node.children.length > 0;
  
  // Level color mapping
  const levelColors: Record<number, string> = {
    1: 'bg-blue-100 text-blue-800 border-blue-300',
    2: 'bg-green-100 text-green-800 border-green-300',
    3: 'bg-purple-100 text-purple-800 border-purple-300',
    4: 'bg-orange-100 text-orange-800 border-orange-300',
  };
  
  const levelColor = levelColors[displayLevel] || 'bg-gray-100 text-gray-800 border-gray-300';

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== node.name) {
      onUpdate(node.path, { name: editName.trim() });
    }
    if (editSlug && editSlug.trim() && editSlug !== node.slug) {
      onUpdate(node.path, { slug: editSlug.trim() });
    }
    if (editCode && editCode.trim() && editCode !== node.code) {
      onUpdate(node.path, { code: editCode.trim() });
    }
    if (editImageUrl && editImageUrl.trim() && editImageUrl !== node.imageUrl) {
      onUpdate(node.path, { imageUrl: editImageUrl.trim() });
    }
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(node.name);
    setEditSlug(node.slug || '');
    setEditCode(node.code || '');
    setEditImageUrl(node.imageUrl || '');
    setEditing(false);
  };

  return (
    <div className="border-l-2 border-gray-200 ml-2">
      <div 
        className={`flex items-center gap-2 p-2 hover:bg-gray-50 rounded group transition-colors`}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="size-5 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />
          ) : (
            <div className="size-4" />
          )}
        </button>

        {/* Folder Icon */}
        {hasChildren ? (
          expanded ? <FolderOpen className="size-5 text-blue-600" /> : <Folder className="size-5 text-blue-600" />
        ) : (
          <Hash className="size-4 text-gray-400" />
        )}

        {/* Level Badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${levelColor}`}>
          L{displayLevel}
        </span>

        {/* Category Name (Editable) */}
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-8 flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <Button size="sm" onClick={handleSaveEdit} className="h-8 px-2">
              <Check className="size-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 px-2">
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-medium flex-1">{node.name}</span>
            
            {/* Enabled/Disabled Badge (L1 only) */}
            {displayLevel === 1 && (
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                node.enabled !== false 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {node.enabled !== false ? '✓ Visible' : '✗ Hidden'}
              </span>
            )}
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              {/* Toggle Visibility (L1 only) */}
              {displayLevel === 1 && (
                <Button
                  size="sm"
                  variant={node.enabled !== false ? "default" : "outline"}
                  onClick={() => onUpdate(node.path, { enabled: node.enabled === false ? true : false })}
                  className="h-8 px-2"
                  title={node.enabled !== false ? "Hide from menu bar" : "Show in menu bar"}
                >
                  {node.enabled !== false ? '👁️' : '👁️‍🗨️'}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="h-8 px-2"
                title="Edit category"
              >
                <Edit2 className="size-4 text-blue-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAddChild(node.path)}
                className="h-8 px-2"
                title="Add child category"
              >
                <Plus className="size-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(node.path)}
                className="h-8 px-2"
                title="Delete category"
              >
                <Trash2 className="size-4 text-red-600" />
              </Button>
            </div>
          </>
        )}

        {/* Product Count */}
        {node.productCount > 0 && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {node.productCount} products
          </span>
        )}
        
        {/* Children Count */}
        {hasChildren && (
          <span className="text-xs text-gray-500">
            {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
          </span>
        )}
      </div>

      {/* Render Children */}
      {expanded && hasChildren && (
        <div className="ml-4">
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              displayLevel={child.level}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              expandedNodes={expandedNodes}
              setExpandedNodes={setExpandedNodes}
              editingNode={editingNode}
              setEditingNode={setEditingNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}