import { CategoryNode } from '../context/CMSContext';

// Build a hierarchical tree from a flat array of category nodes
export function buildCategoryTree(nodes: CategoryNode[]): CategoryNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  // Create maps for quick lookups - use PATH for parent-child relationships
  const nodeMapByPath = new Map<string, CategoryNode>();
  
  nodes.forEach(node => {
    // Skip nodes without a valid path
    if (!node.path || typeof node.path !== 'string') {
      return;
    }
    const newNode = { ...node, children: [] };
    nodeMapByPath.set(node.path, newNode);
  });

  // Build the tree using PATH hierarchy
  const tree: CategoryNode[] = [];
  
  nodes.forEach(node => {
    // Skip nodes without a valid path
    if (!node.path || typeof node.path !== 'string') {
      return;
    }
    
    const currentNode = nodeMapByPath.get(node.path);
    if (!currentNode) return;

    // Derive parent path from current path
    // e.g., "cleaning-and-hygiene/dishwasher-racks" -> parent is "cleaning-and-hygiene"
    const pathParts = node.path.split('/');
    
    if (pathParts.length === 1) {
      // Top level node (no slash in path)
      tree.push(currentNode);
    } else {
      // Has parent - derive parent path by removing last segment
      const parentPath = pathParts.slice(0, -1).join('/');
      const parentNode = nodeMapByPath.get(parentPath);
      
      if (parentNode) {
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(currentNode);
      }
    }
  });
  
  return tree;
}

// Get all level 1 (root) categories
export function getTopLevelCategories(nodes: CategoryNode[]): CategoryNode[] {
  if (!nodes || nodes.length === 0) return [];
  
  const tree = buildCategoryTree(nodes);
  return tree;
}

// Flatten a tree back to a list (with indentation for display)
export function flattenTree(nodes: CategoryNode[], level: number = 0): Array<CategoryNode & { indent: number }> {
  const result: Array<CategoryNode & { indent: number }> = [];
  
  nodes.forEach(node => {
    result.push({ ...node, indent: level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTree(node.children, level + 1));
    }
  });
  
  return result;
}

// Find a node by path
export function findNodeByPath(nodes: CategoryNode[], path: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

// Count products in a category and all its children
export function countProductsInCategory(node: CategoryNode, products: any[]): number {
  let count = products.filter(p => p.category === node.fullPath).length;
  
  if (node.children) {
    node.children.forEach(child => {
      count += countProductsInCategory(child, products);
    });
  }
  
  return count;
}