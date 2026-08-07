import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Home, X, ChevronRight } from 'lucide-react';
import { useCMS, CategoryNode } from '../context/CMSContext';
import { categoryToSlug } from '../utils/slugify';
import { buildCategoryTree } from '../utils/categoryTree';
import { staticCategories } from '../../config/categories';

export function CategoryNavigation() {
  let data, loading;
  try {
    const cms = useCMS();
    data = cms.data;
    loading = cms.loading;
  } catch (e) {
    data = { categoryTree: [] };
    loading = false;
    return null;
  }

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHovered, setDrawerHovered] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fullCategoryTree = useMemo(() => buildCategoryTree(data.categoryTree), [data.categoryTree]);

  const staticCategoryNodes = useMemo(() => staticCategories.map(cat => ({
    name: cat.name, slug: cat.slug, code: cat.slug, path: cat.path,
    fullPath: cat.path, level: 1, parent: '', imageUrl: '',
    productCount: 0, hasChildren: false, children: [], enabled: cat.enabled
  })), []);

  const categoryTree = fullCategoryTree.length > 0 ? fullCategoryTree : staticCategoryNodes;
  const topLevelCategories = categoryTree.filter(cat => cat.enabled !== false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openDropdown = (fullPath: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredNav(fullPath);
  };

  const closeDropdown = () => {
    hoverTimeoutRef.current = setTimeout(() => setHoveredNav(null), 120);
  };

  const keepDropdown = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  return (
    <>
      {/* Slide-out drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
      )}

      {/* Slide-out drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 left-0 h-full w-[340px] bg-white z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 bg-[#2D3748] text-white shrink-0">
          <span className="font-bold text-base tracking-wide">All Categories</span>
          <button onClick={() => setDrawerOpen(false)}>
            <X className="size-5" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-[155px] border-r border-slate-200 overflow-y-auto bg-slate-50 shrink-0">
            {topLevelCategories.map((l1) => {
              const isActive = drawerHovered === l1.fullPath;
              return (
                <button
                  key={l1.fullPath}
                  className={`w-full text-left px-3 py-3 border-b border-slate-200 text-sm transition-colors ${
                    isActive ? 'bg-white border-l-4 border-l-[#E31837] text-[#E31837] font-semibold' : 'text-slate-800 hover:bg-white'
                  }`}
                  onClick={() => setDrawerHovered(isActive ? null : l1.fullPath)}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="leading-snug">{l1.name}</span>
                    {l1.children && l1.children.length > 0 && (
                      <ChevronRight className="size-3 shrink-0 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {drawerHovered ? (() => {
              const sel = topLevelCategories.find(c => c.fullPath === drawerHovered);
              if (!sel) return null;
              return (
                <div>
                  <Link
                    to={`/products/c/${categoryToSlug(sel.fullPath)}`}
                    className="block text-sm font-bold text-[#2D3748] mb-3 hover:text-[#E31837]"
                    onClick={() => setDrawerOpen(false)}
                  >
                    View all {sel.name} →
                  </Link>
                  {sel.children && sel.children.length > 0 ? (
                    <div className="space-y-1">
                      {sel.children.map((l2: CategoryNode) => (
                        <Link
                          key={l2.path}
                          to={`/products/c/${categoryToSlug(l2.fullPath)}`}
                          className="block px-2 py-2 text-sm text-slate-700 hover:text-[#E31837] hover:bg-slate-50 rounded transition-colors"
                          onClick={() => setDrawerOpen(false)}
                        >
                          {l2.name}
                          {l2.productCount > 0 && (
                            <span className="text-xs text-slate-400 ml-1">({l2.productCount})</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No subcategories</p>
                  )}
                </div>
              );
            })() : (
              <p className="text-xs text-slate-400 mt-6 text-center">Tap a category to see subcategories</p>
            )}
          </div>
        </div>
      </div>

      {/*
        Page-body overlay — rendered via portal directly on document.body
        so it sits OUTSIDE the header's stacking context (z-50).
        z-index 40 = above page content, below sticky header.
      */}
      {hoveredNav && createPortal(
        <div
          className="fixed inset-0 bg-black/50 pointer-events-none transition-opacity duration-200"
          style={{ zIndex: 40 }}
        />,
        document.body
      )}

      {/* Nav bar — same max-w as header */}
      <nav
        ref={navRef}
        className="bg-[#2D3748] text-white shadow-md border-b-2 border-slate-700"
        style={{ position: 'relative', zIndex: 49 }}
      >
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-stretch w-full">

            {/* Home */}
            <Link
              to="/"
              className="flex flex-col items-center justify-center px-5 py-2 bg-[#E31837] hover:bg-[#C41230] transition-colors border-r border-red-800 shrink-0"
              style={{ minWidth: 64, minHeight: 52 }}
            >
              <Home className="size-4 mb-0.5" />
              <span className="text-xs font-bold leading-tight">Home</span>
            </Link>

            {/* Categories — equal share, text wraps, larger font */}
            {topLevelCategories.map((cat) => {
              const hasChildren = cat.children && cat.children.length > 0;
              const isOpen = hoveredNav === cat.fullPath;

              return (
                <div
                  key={cat.fullPath}
                  className="relative flex-1"
                  onMouseEnter={() => openDropdown(cat.fullPath)}
                  onMouseLeave={closeDropdown}
                >
                  <Link
                    to={`/products/c/${categoryToSlug(cat.fullPath)}`}
                    className={`flex items-center justify-center text-center px-2 w-full h-full text-xs font-medium border-r border-slate-600 transition-colors leading-snug ${
                      isOpen ? 'bg-[#1a202c]' : 'hover:bg-[#1a202c]'
                    }`}
                    style={{ minHeight: 52, paddingTop: 8, paddingBottom: 8 }}
                  >
                    {cat.name}
                  </Link>

                  {/* Dropdown */}
                  {isOpen && hasChildren && (
                    <div
                      className="absolute top-full left-0 bg-white text-slate-800 shadow-2xl border border-slate-200 min-w-[230px] max-w-[300px] py-1"
                      style={{ zIndex: 9999 }}
                      onMouseEnter={keepDropdown}
                      onMouseLeave={closeDropdown}
                    >
                      <Link
                        to={`/products/c/${categoryToSlug(cat.fullPath)}`}
                        className="flex items-center px-4 py-2.5 text-sm font-bold text-[#E31837] hover:bg-red-50 border-b border-slate-100"
                      >
                        View all {cat.name}
                        <ChevronRight className="size-3.5 ml-auto shrink-0" />
                      </Link>
                      {cat.children.map((sub: CategoryNode) => (
                        <Link
                          key={sub.path}
                          to={`/products/c/${categoryToSlug(sub.fullPath)}`}
                          className="flex items-center justify-between px-4 py-2 text-sm text-slate-700 hover:text-[#E31837] hover:bg-slate-50 transition-colors"
                        >
                          <span>{sub.name}</span>
                          {sub.productCount > 0 && (
                            <span className="text-xs text-slate-400 ml-3 shrink-0">{sub.productCount}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>
      </nav>
    </>
  );
}
