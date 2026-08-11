import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, Edit2, X, AlertTriangle } from 'lucide-react';
import { partsAPI } from '../../api/endpoints';
import type { Part, PartCreate, PartUpdate, LookupItem } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ManageDataModal from '../../components/modals/ManageDataModal';
import BulkUploadModal from '../../components/modals/BulkUploadModal';
import { useAuthStore } from '../../store/authStore';
import { getErrorMessage } from '../../utils/apiErrors';
import toast from 'react-hot-toast';

const PartsList: React.FC = () => {
  const { user } = useAuthStore();
  const [parts, setParts] = useState<Part[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline creation state
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'storekeeper' || user?.role === 'front_desk' || user?.role === 'accountant';

  // Form state
  const [formData, setFormData] = useState({
    part_number: '',
    name: '',
    description: '',
    brand_id: '' as string | number,
    category_id: '' as string | number,
    quantity_in_stock: 0,
    minimum_stock_level: 0,
    unit_price: 0,
  });

  useEffect(() => {
    fetchParts();
    fetchLookups();
  }, []);

  const fetchParts = async () => {
    setIsLoading(true);
    try {
      const data = await partsAPI.getAll(0, 5000);
      setParts(data?.items || (Array.isArray(data) ? data : []));
    } catch (error) {
      toast.error('Failed to fetch parts');
      console.error(error);
      setParts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [brandsData, categoriesData] = await Promise.all([
        partsAPI.getBrands(),
        partsAPI.getCategories(),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to fetch lookups:', error);
    }
  };

  const handleAddBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const brand = await partsAPI.createBrand(newBrandName.trim());
      setBrands(prev => [...prev, brand]);
      setFormData(prev => ({ ...prev, brand_id: brand.id }));
      setNewBrandName('');
      setShowNewBrand(false);
      toast.success(`Brand "${brand.name}" created`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create brand'));
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const category = await partsAPI.createCategory(newCategoryName.trim());
      setCategories(prev => [...prev, category]);
      setFormData(prev => ({ ...prev, category_id: category.id }));
      setNewCategoryName('');
      setShowNewCategory(false);
      toast.success(`Category "${category.name}" created`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create category'));
    }
  };

  const handleBulkAdd = async (type: 'brand' | 'category', names: string[]) => {
    try {
      if (type === 'brand') {
        await partsAPI.bulkCreateBrand(names);
      } else {
        await partsAPI.bulkCreateCategory(names);
      }
      fetchLookups();
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to bulk add ${type}`));
      throw error;
    }
  };

  const handleDeleteLookup = async (type: 'brand' | 'category', id: number) => {
    try {
      if (type === 'brand') {
        await partsAPI.deleteBrand(id);
      } else {
        await partsAPI.deleteCategory(id);
      }
      fetchLookups();
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to delete ${type}`));
      throw error;
    }
  };

  const resetForm = () => {
    setFormData({
      part_number: '',
      name: '',
      description: '',
      brand_id: '',
      category_id: '',
      quantity_in_stock: 0,
      minimum_stock_level: 0,
      unit_price: 0,
    });
    setEditingPart(null);
    setShowForm(false);
    setShowNewBrand(false);
    setShowNewCategory(false);
    setNewBrandName('');
    setNewCategoryName('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (part: Part) => {
    setEditingPart(part);
    setFormData({
      part_number: part.part_number,
      name: part.name,
      description: part.description || '',
      brand_id: part.brand_id || '',
      category_id: part.category_id || '',
      quantity_in_stock: part.quantity_in_stock,
      minimum_stock_level: part.minimum_stock_level,
      unit_price: part.unit_price,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.part_number.trim() || !formData.name.trim()) {
      toast.error('Part number and name are required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPart) {
        const updateData: PartUpdate = {
          name: formData.name,
          description: formData.description || undefined,
          brand_id: formData.brand_id ? Number(formData.brand_id) : undefined,
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          quantity_in_stock: formData.quantity_in_stock,
          minimum_stock_level: formData.minimum_stock_level,
          unit_price: formData.unit_price,
        };
        await partsAPI.update(editingPart.id, updateData);
        toast.success('Part updated successfully');
      } else {
        const createData: PartCreate = {
          part_number: formData.part_number,
          name: formData.name,
          description: formData.description || undefined,
          brand_id: formData.brand_id ? Number(formData.brand_id) : undefined,
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          quantity_in_stock: formData.quantity_in_stock,
          minimum_stock_level: formData.minimum_stock_level,
          unit_price: formData.unit_price,
        };
        await partsAPI.create(createData);
        toast.success('Part created successfully');
      }
      resetForm();
      fetchParts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save part'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter parts
  const filteredParts = parts.filter(part => {
    const matchesSearch = !searchQuery ||
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.brand_name && part.brand_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || String(part.category_id) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            {parts.length} parts in inventory
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setIsBulkUploadOpen(true)} className="btn-secondary flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50">
              <Plus className="h-5 w-5" />
              Bulk Upload
            </button>
            <button onClick={() => setIsBulkAddOpen(true)} className="btn-secondary flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Manage Data
            </button>
            <button onClick={openCreateForm} className="btn-primary flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Part
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
            placeholder="Search by name, part number, brand, or category..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPart ? 'Edit Part' : 'Add New Part'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Part Number */}
                <div>
                  <label className="label">Part Number <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.part_number}
                    onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                    className="input w-full"
                    placeholder="e.g. HP-1020-FUSER"
                    disabled={!!editingPart}
                    required
                  />
                  {editingPart && (
                    <p className="text-xs text-gray-500 mt-1">Part number cannot be changed</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="label">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="e.g. Fuser Assembly"
                    required
                  />
                </div>

                {/* Brand - Dropdown with Add New */}
                <div>
                  <label className="label">Brand</label>
                  {showNewBrand ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBrandName}
                        onChange={(e) => setNewBrandName(e.target.value)}
                        className="input flex-1"
                        placeholder="New brand name"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBrand())}
                      />
                      <button type="button" onClick={handleAddBrand} className="btn-primary px-3 text-sm">Add</button>
                      <button type="button" onClick={() => { setShowNewBrand(false); setNewBrandName(''); }} className="btn-secondary px-3 text-sm">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={formData.brand_id}
                        onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                        className="input flex-1"
                      >
                        <option value="">— None —</option>
                        {brands.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                      {canManage && (
                        <button type="button" onClick={() => setShowNewBrand(true)} className="btn-secondary px-3 text-sm" title="Add new brand">
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Category - Dropdown with Add New */}
                <div>
                  <label className="label">Category</label>
                  {showNewCategory ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="input flex-1"
                        placeholder="New category name"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                      />
                      <button type="button" onClick={handleAddCategory} className="btn-primary px-3 text-sm">Add</button>
                      <button type="button" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }} className="btn-secondary px-3 text-sm">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select
                        value={formData.category_id}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className="input flex-1"
                      >
                        <option value="">— None —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {canManage && (
                        <button type="button" onClick={() => setShowNewCategory(true)} className="btn-secondary px-3 text-sm" title="Add new category">
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Unit Price */}
                <div>
                  <label className="label">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                    className="input w-full"
                  />
                </div>

                {/* Quantity in Stock */}
                <div>
                  <label className="label">Quantity in Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                  />
                </div>

                {/* Minimum Stock Level */}
                <div>
                  <label className="label">Minimum Stock Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimum_stock_level}
                    onChange={(e) => setFormData({ ...formData, minimum_stock_level: parseInt(e.target.value) || 0 })}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                  placeholder="Part description..."
                />
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
                <button type="button" onClick={resetForm} className="btn-secondary" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Saving...
                    </span>
                  ) : (
                    editingPart ? 'Update Part' : 'Create Part'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Parts Table */}
      {filteredParts.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Parts Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Get started by adding a new part'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  {canManage && (
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParts.map((part) => {
                  const isLowStock = part.quantity_in_stock <= part.minimum_stock_level && part.minimum_stock_level > 0;
                  return (
                    <tr key={part.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{part.part_number}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{part.name}</p>
                        {part.description && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">{part.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{part.brand_name || '—'}</td>
                      <td className="px-4 py-3">
                        {part.category_name ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {part.category_name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                          part.quantity_in_stock === 0 ? 'text-red-600' :
                          isLowStock ? 'text-amber-600' : 'text-green-600'
                        }`}>
                          {isLowStock && <AlertTriangle className="h-3.5 w-3.5" />}
                          {part.quantity_in_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {part.unit_price.toFixed(2)}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEditForm(part)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded"
                            title="Edit part"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ManageDataModal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        onSave={handleBulkAdd}
        onDelete={handleDeleteLookup}
        brands={brands}
        categories={categories}
        defaultType="brand"
      />
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onUpload={async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await partsAPI.bulkUpload(formData);
          toast.success(res.message || 'Parts uploaded successfully!');
          fetchParts();
          fetchLookups();
        }}
        title="Bulk Upload Parts"
        expectedColumns={['Part Number', 'Name', 'Description', 'Brand', 'Category', 'Unit Price', 'Stock', 'Min Stock']}
      />
    </div>
  );
};

export default PartsList;
