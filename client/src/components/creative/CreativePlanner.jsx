import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardBody, CardHeader, Button, Input, Textarea, Badge, Spinner } from '@/components/ui';
import {
  Image, Video, Layout, User, Quote, Play, Tag,
  Plus, Trash2, GripVertical, ChevronDown, CheckCircle,
  FileImage, Film, Layers, MessageCircle, Users, TrendingUp
} from 'lucide-react';
import {
  CREATIVE_CATEGORIES,
  CREATIVE_TYPES,
  CREATIVE_ROLES,
  PLATFORMS,
  getCategoryLabel,
  getCategoryIcon,
  getTypesForCategory,
  getRoleLabel,
  getDefaultRoleForCategory
} from '@/constants/creativeTypes';

// Icon mapping for categories
const CATEGORY_ICONS = {
  IMAGE: Image,
  VIDEO: Video,
  CAROUSEL: Layout,
  UGC: User,
  TESTIMONIAL: Quote,
  DEMO_EXPLAINER: Play,
  OFFER_SALES: Tag
};

// Get default role for a category
const getDefaultRole = (categoryKey) => {
  const imageCategories = ['IMAGE', 'CAROUSEL'];
  return imageCategories.includes(categoryKey) ? 'graphic_designer' : 'video_editor';
};

// Generate unique ID for creative rows
const generateId = () => `creative_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export default function CreativePlanner({
  projectId,
  initialData,
  onSave,
  isCompleted,
  project
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selected categories with quantities
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Creative plan rows
  const [creativePlan, setCreativePlan] = useState([]);

  // Additional notes
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Load initial data
  useEffect(() => {
    if (initialData) {
      // Load creative plan
      if (initialData.creativePlan && initialData.creativePlan.length > 0) {
        setCreativePlan(initialData.creativePlan);

        // Derive selected categories from creative plan
        const categoryMap = {};
        initialData.creativePlan.forEach(item => {
          if (!categoryMap[item.category]) {
            categoryMap[item.category] = 0;
          }
          categoryMap[item.category]++;
        });

        setSelectedCategories(
          Object.entries(categoryMap).map(([category, quantity]) => ({
            category,
            quantity
          }))
        );
      }

      // Load creative categories (legacy)
      if (initialData.creativeCategories && initialData.creativeCategories.length > 0) {
        setSelectedCategories(initialData.creativeCategories);
      }

      // Load additional notes
      if (initialData.additionalNotes) {
        setAdditionalNotes(initialData.additionalNotes);
      }
    }
  }, [initialData]);

  // Toggle category selection
  const toggleCategory = (categoryKey) => {
    setSelectedCategories(prev => {
      const exists = prev.find(c => c.category === categoryKey);
      if (exists) {
        // Remove category and its creative rows
        setCreativePlan(plan => plan.filter(item => item.category !== categoryKey));
        return prev.filter(c => c.category !== categoryKey);
      } else {
        // Add category with quantity 0
        return [...prev, { category: categoryKey, quantity: 0 }];
      }
    });
  };

  // Update category quantity
  const updateCategoryQuantity = (categoryKey, quantity) => {
    const numQuantity = parseInt(quantity) || 0;

    setSelectedCategories(prev =>
      prev.map(c => c.category === categoryKey ? { ...c, quantity: numQuantity } : c)
    );

    // Auto-generate/update creative rows
    setCreativePlan(prev => {
      const existingForCategory = prev.filter(item => item.category === categoryKey);
      const otherCategories = prev.filter(item => item.category !== categoryKey);

      if (numQuantity > existingForCategory.length) {
        // Add new rows
        const newRows = [];
        const types = getTypesForCategory(categoryKey);
        const defaultType = types[0] || '';
        const defaultRole = getDefaultRole(categoryKey);

        for (let i = existingForCategory.length; i < numQuantity; i++) {
          newRows.push({
            _id: generateId(),
            category: categoryKey,
            creativeType: defaultType,
            assignedRole: defaultRole,
            notes: '',
            platforms: [],
            order: i
          });
        }
        return [...prev, ...newRows];
      } else if (numQuantity < existingForCategory.length) {
        // Remove excess rows
        const keptRows = existingForCategory.slice(0, numQuantity);
        return [...otherCategories, ...keptRows];
      }

      return prev;
    });
  };

  // Update creative row
  const updateCreativeRow = (rowId, field, value) => {
    setCreativePlan(prev =>
      prev.map(row => row._id === rowId ? { ...row, [field]: value } : row)
    );
  };

  // Add single creative row
  const addCreativeRow = (categoryKey) => {
    const types = getTypesForCategory(categoryKey);
    const defaultType = types[0] || '';
    const defaultRole = getDefaultRole(categoryKey);

    const newRow = {
      _id: generateId(),
      category: categoryKey,
      creativeType: defaultType,
      assignedRole: defaultRole,
      notes: '',
      platforms: [],
      order: creativePlan.filter(item => item.category === categoryKey).length
    };

    setCreativePlan(prev => [...prev, newRow]);

    // Update category quantity
    setSelectedCategories(prev =>
      prev.map(c => c.category === categoryKey ? { ...c, quantity: c.quantity + 1 } : c)
    );
  };

  // Remove creative row
  const removeCreativeRow = (rowId) => {
    const row = creativePlan.find(r => r._id === rowId);
    if (!row) return;

    setCreativePlan(prev => prev.filter(r => r._id !== rowId));

    // Update category quantity
    setSelectedCategories(prev =>
      prev.map(c => c.category === row.category ? { ...c, quantity: Math.max(0, c.quantity - 1) } : c)
    );
  };

  // Calculate totals
  const totalCreatives = creativePlan.length;
  const imageCount = creativePlan.filter(c => ['IMAGE', 'CAROUSEL'].includes(c.category)).length;
  const videoCount = creativePlan.filter(c => ['VIDEO', 'UGC', 'TESTIMONIAL', 'DEMO_EXPLAINER'].includes(c.category)).length;

  // Handle save
  const handleSave = async (markComplete = false) => {
    try {
      setSaving(true);

      const data = {
        creativePlan: creativePlan.map((row, index) => {
          // Create a clean copy of the row
          const cleanRow = {
            category: row.category,
            creativeType: row.creativeType,
            assignedRole: row.assignedRole,
            notes: row.notes || '',
            platforms: row.platforms || [],
            order: index
          };

          // Only include _id if it's a valid MongoDB ObjectId (not a temporary string ID)
          // Temporary IDs start with 'creative_' - these should be removed so Mongoose creates new ObjectIds
          if (row._id && !row._id.toString().startsWith('creative_')) {
            cleanRow._id = row._id;
          }

          return cleanRow;
        }),
        creativeCategories: selectedCategories,
        additionalNotes,
        isCompleted: markComplete
      };

      await onSave(data, markComplete);

      toast.success(markComplete ? 'Creative strategy completed!' : 'Progress saved!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Completion Banner */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800">Creative Strategy Completed!</h3>
            <p className="text-sm text-green-600">All creative plan details have been saved.</p>
          </div>
        </div>
      )}

      {/* Step 1: Select Creative Categories */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Step 1: Select Creative Categories
          </h2>
          <p className="text-sm text-gray-500">
            Choose the types of creatives you need for this campaign
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {CREATIVE_CATEGORIES.map(category => {
              const isSelected = selectedCategories.find(c => c.category === category.key);
              const IconComponent = CATEGORY_ICONS[category.key] || FileImage;

              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => toggleCategory(category.key)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <IconComponent className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />
                  <div className="text-sm font-medium">{category.label}</div>
                  {isSelected && (
                    <Badge variant="success" className="mt-2 text-xs">
                      {isSelected.quantity || 0}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Step 2: Quantity per Category */}
      {selectedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              Step 2: Set Quantities
            </h2>
            <p className="text-sm text-gray-500">
              Define how many creatives you need per category
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {selectedCategories.map(selected => {
                const category = CREATIVE_CATEGORIES.find(c => c.key === selected.category);
                const IconComponent = CATEGORY_ICONS[selected.category] || FileImage;

                return (
                  <div key={selected.category} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <IconComponent className="w-5 h-5 text-primary-600" />
                      <span className="font-medium text-gray-900">{category?.label}</span>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={selected.quantity}
                      onChange={(e) => updateCategoryQuantity(selected.category, e.target.value)}
                      placeholder="Quantity"
                      className="text-center"
                    />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 3: Creative Plan Table */}
      {creativePlan.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Step 3: Creative Plan Details
                </h2>
                <p className="text-sm text-gray-500">
                  Specify the creative type and assign team members for production
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">
                  Total: <span className="font-bold text-primary-600">{totalCreatives}</span> creatives
                </span>
              </div>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creative Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Platforms
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {creativePlan.map((row, index) => {
                    const category = CREATIVE_CATEGORIES.find(c => c.key === row.category);
                    const IconComponent = CATEGORY_ICONS[row.category] || FileImage;
                    const types = getTypesForCategory(row.category);

                    return (
                      <tr key={row._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {category?.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.creativeType}
                            onChange={(e) => updateCreativeRow(row._id, 'creativeType', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="">Select type...</option>
                            {types.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={row.assignedRole}
                            onChange={(e) => updateCreativeRow(row._id, 'assignedRole', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {CREATIVE_ROLES.map(role => (
                              <option key={role.key} value={role.key}>{role.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <select
                              multiple
                              value={row.platforms || []}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                updateCreativeRow(row._id, 'platforms', selected);
                              }}
                              className="px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-primary-500"
                            >
                              {PLATFORMS.map(platform => (
                                <option key={platform.key} value={platform.key}>{platform.label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => updateCreativeRow(row._id, 'notes', e.target.value)}
                            placeholder="Optional notes..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeCreativeRow(row._id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Row Buttons */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {selectedCategories.map(selected => {
                  const category = CREATIVE_CATEGORIES.find(c => c.key === selected.category);
                  return (
                    <Button
                      key={selected.category}
                      variant="outline"
                      size="sm"
                      onClick={() => addCreativeRow(selected.category)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add {category?.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Additional Instructions</h2>
          <p className="text-sm text-gray-500">Creative direction, brand guidelines, special requirements</p>
        </CardHeader>
        <CardBody>
          <Textarea
            placeholder="Describe overall creative direction, brand voice, color preferences, or any special instructions for the creative team..."
            rows={4}
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </CardBody>
      </Card>

      {/* Summary */}
      {creativePlan.length > 0 && (
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-3xl font-bold text-primary-600">{totalCreatives}</div>
                <div className="text-sm text-gray-600">Total Creatives</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{imageCount}</div>
                <div className="text-sm text-gray-600">Image/Static</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{videoCount}</div>
                <div className="text-sm text-gray-600">Video</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{selectedCategories.length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {!isCompleted ? (
          <>
            <Button variant="secondary" onClick={() => handleSave(false)} loading={saving}>
              Save Progress
            </Button>
            <Button onClick={() => handleSave(true)} loading={saving} disabled={creativePlan.length === 0}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete & Generate Tasks
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => handleSave(false)}>
            Update Creative Plan
          </Button>
        )}
      </div>
    </div>
  );
}