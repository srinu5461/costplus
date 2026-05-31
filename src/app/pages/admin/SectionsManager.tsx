import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, Tag, Palette, Type } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';

interface SectionConfig {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  badgeIcon: string;
  enabled: boolean;
  order: number;
}

const defaultSections: SectionConfig[] = [
  {
    id: 'featured',
    name: 'Featured Equipment',
    badge: '⭐ Featured',
    badgeColor: 'bg-blue-600',
    badgeIcon: '⭐',
    enabled: true,
    order: 1,
  },
  {
    id: 'popular',
    name: 'Popular Products',
    badge: '🔥 Popular',
    badgeColor: 'bg-purple-600',
    badgeIcon: '🔥',
    enabled: true,
    order: 2,
  },
  {
    id: 'promotion',
    name: 'Special Offers',
    badge: '🎉 Promo',
    badgeColor: 'bg-red-600',
    badgeIcon: '🎉',
    enabled: true,
    order: 3,
  },
];

const badgeColorOptions = [
  { value: 'bg-blue-600', label: 'Blue', preview: 'bg-blue-600' },
  { value: 'bg-purple-600', label: 'Purple', preview: 'bg-purple-600' },
  { value: 'bg-red-600', label: 'Red', preview: 'bg-red-600' },
  { value: 'bg-green-600', label: 'Green', preview: 'bg-green-600' },
  { value: 'bg-orange-600', label: 'Orange', preview: 'bg-orange-600' },
  { value: 'bg-pink-600', label: 'Pink', preview: 'bg-pink-600' },
  { value: 'bg-indigo-600', label: 'Indigo', preview: 'bg-indigo-600' },
  { value: 'bg-teal-600', label: 'Teal', preview: 'bg-teal-600' },
  { value: 'bg-[#E31837]', label: 'Brand Red', preview: 'bg-[#E31837]' },
  { value: 'bg-[#2D3748]', label: 'Brand Navy', preview: 'bg-[#2D3748]' },
];

const iconOptions = ['⭐', '🔥', '🎉', '💎', '✨', '🏆', '🎯', '💰', '🌟', '🎁', '⚡', '🔖'];

export function SectionsManager() {
  const [sections, setSections] = useState<SectionConfig[]>(defaultSections);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sections-config`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setSections(data);
        }
      }
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSections = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d1fbc049/sections-config`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(sections),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      alert('✅ Sections configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save sections:', error);
      alert('❌ Failed to save sections configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (id: string, updates: Partial<SectionConfig>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const toggleEnabled = (id: string) => {
    updateSection(id, { enabled: !sections.find(s => s.id === id)?.enabled });
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    
    // Update order numbers
    newSections.forEach((s, i) => {
      s.order = i + 1;
    });

    setSections(newSections);
  };

  const deleteSection = (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    setSections(sections.filter(s => s.id !== id));
  };

  const addNewSection = () => {
    const newSection: SectionConfig = {
      id: `custom-${Date.now()}`,
      name: 'New Section',
      badge: '✨ New',
      badgeColor: 'bg-blue-600',
      badgeIcon: '✨',
      enabled: true,
      order: sections.length + 1,
    };
    setSections([...sections, newSection]);
    setEditingId(newSection.id);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E31837]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2D3748] mb-2">Homepage Sections Configuration</h1>
        <p className="text-slate-600">
          Configure section names, badges, colors, and display order for your homepage
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Tag className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">Section Configuration</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Section Name:</strong> Displayed as the heading on the homepage</li>
              <li>• <strong>Badge:</strong> Shown on product cards in this section</li>
              <li>• <strong>Order:</strong> Drag sections to reorder their display on the homepage</li>
              <li>• <strong>Visibility:</strong> Toggle to show/hide sections from the homepage</li>
              <li>• To assign products to sections, go to <strong>Homepage Sections</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-4 mb-6">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={`bg-white border-2 rounded-lg p-5 transition-all ${
              section.enabled ? 'border-slate-200' : 'border-slate-300 opacity-60'
            }`}
          >
            <div className="flex items-start gap-4">
              {/* Drag Handle */}
              <div className="flex flex-col gap-1 pt-2">
                <button
                  onClick={() => moveSection(section.id, 'up')}
                  disabled={index === 0}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp className="size-4 text-slate-600" />
                </button>
                <GripVertical className="size-5 text-slate-400" />
                <button
                  onClick={() => moveSection(section.id, 'down')}
                  disabled={index === sections.length - 1}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown className="size-4 text-slate-600" />
                </button>
              </div>

              {/* Section Details */}
              <div className="flex-1 space-y-4">
                {/* Order Badge */}
                <div className="flex items-center gap-3">
                  <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                    Order: {section.order}
                  </Badge>
                  {!section.enabled && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Hidden
                    </Badge>
                  )}
                </div>

                {/* Section Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    <Type className="size-4 inline mr-1" />
                    Section Name (Heading)
                  </label>
                  <Input
                    value={section.name}
                    onChange={(e) => updateSection(section.id, { name: e.target.value })}
                    placeholder="e.g., Featured Equipment"
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This will be displayed as the section heading on the homepage
                  </p>
                </div>

                {/* Badge Configuration */}
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Badge Text */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Badge Text
                    </label>
                    <Input
                      value={section.badge}
                      onChange={(e) => updateSection(section.id, { badge: e.target.value })}
                      placeholder="e.g., ⭐ Featured"
                    />
                  </div>

                  {/* Badge Icon */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Badge Icon
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {iconOptions.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => updateSection(section.id, { 
                            badgeIcon: icon,
                            badge: `${icon} ${section.badge.split(' ').slice(1).join(' ')}`
                          })}
                          className={`px-2 py-1 rounded border-2 text-lg hover:border-[#E31837] transition-colors ${
                            section.badgeIcon === icon ? 'border-[#E31837] bg-red-50' : 'border-slate-200'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Badge Color */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Palette className="size-4 inline mr-1" />
                      Badge Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {badgeColorOptions.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => updateSection(section.id, { badgeColor: color.value })}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${color.preview} ${
                            section.badgeColor === color.value
                              ? 'border-[#2D3748] ring-2 ring-[#2D3748] ring-offset-2'
                              : 'border-slate-300 hover:border-[#2D3748]'
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Badge Preview */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Badge Preview
                  </label>
                  <Badge className={`${section.badgeColor} hover:${section.badgeColor} text-white font-bold shadow-lg`}>
                    {section.badge}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleEnabled(section.id)}
                  className="gap-2"
                >
                  {section.enabled ? (
                    <>
                      <Eye className="size-4" />
                      Visible
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-4" />
                      Hidden
                    </>
                  )}
                </Button>
                
                {!['featured', 'popular', 'promotion'].includes(section.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSection(section.id)}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Section Button */}
      <Button
        onClick={addNewSection}
        variant="outline"
        className="w-full mb-6 gap-2 border-2 border-dashed border-slate-300 hover:border-[#E31837] hover:bg-red-50 hover:text-[#E31837]"
      >
        <Plus className="size-4" />
        Add New Section
      </Button>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        <Button
          onClick={saveSections}
          disabled={saving}
          className="bg-[#2D3748] hover:bg-[#2D3748]/90 text-white px-8 py-6 text-lg font-semibold"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Saving...
            </>
          ) : (
            <>
              <Save className="size-5 mr-2" />
              Save Sections Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
