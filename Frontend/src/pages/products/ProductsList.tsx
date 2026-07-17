import { useEffect, useState } from 'react';
import { Box, Edit2, Plus, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { productsAPI } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { LookupItem, Product, ProductCreate, ProductUpdate } from '../../types';
import { getErrorMessage } from '../../utils/apiErrors';

const ProductsList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [models, setModels] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand_id: '' as string | number,
    model_id: '' as string | number,
    category_id: '' as string | number,
    unit_price: 0,
    quantity_in_stock: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchLookups();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const data = await productsAPI.getAll(0, 200);
      setProducts(data?.items || (Array.isArray(data) ? data : []));
    } catch (error) {
      toast.error('Failed to fetch products');
      console.error(error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [brandsResult, modelsResult, categoriesResult] = await Promise.allSettled([
        productsAPI.getBrands(),
        productsAPI.getModels(),
        productsAPI.getCategories(),
      ]);

      if (brandsResult.status === 'fulfilled') {
        setBrands(brandsResult.value);
      } else {
        console.error('Failed to fetch product brands:', brandsResult.reason);
      }

      if (modelsResult.status === 'fulfilled') {
        setModels(modelsResult.value);
      } else {
        console.error('Failed to fetch product models:', modelsResult.reason);
      }

      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value);
      } else {
        console.error('Failed to fetch product categories:', categoriesResult.reason);
      }

      if (
        brandsResult.status === 'rejected' ||
        modelsResult.status === 'rejected' ||
        categoriesResult.status === 'rejected'
      ) {
        toast.error('Some product lookups could not be loaded');
      }
    } catch (error) {
      console.error('Failed to fetch product lookups:', error);
      toast.error('Failed to fetch product lookups');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      brand_id: '',
      model_id: '',
      category_id: '',
      unit_price: 0,
      quantity_in_stock: 0,
    });
    setEditingProduct(null);
    setShowForm(false);
    setShowNewBrand(false);
    setShowNewModel(false);
    setShowNewCategory(false);
    setNewBrandName('');
    setNewModelName('');
    setNewCategoryName('');
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      brand_id: product.brand_id || '',
      model_id: product.model_id || '',
      category_id: product.category_id || '',
      unit_price: (product.unit_price || 0),
      quantity_in_stock: (product.quantity_in_stock || 0),
    });
    setShowForm(true);
  };

  const handleLookupCreate = async (
    type: 'brand' | 'model' | 'category',
    name: string,
  ) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      let created: LookupItem;
      if (type === 'brand') {
        created = await productsAPI.createBrand(trimmedName);
        setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData((prev) => ({ ...prev, brand_id: created.id }));
        setNewBrandName('');
        setShowNewBrand(false);
      } else if (type === 'model') {
        created = await productsAPI.createModel(trimmedName);
        setModels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData((prev) => ({ ...prev, model_id: created.id }));
        setNewModelName('');
        setShowNewModel(false);
      } else {
        created = await productsAPI.createCategory(trimmedName);
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setFormData((prev) => ({ ...prev, category_id: created.id }));
        setNewCategoryName('');
        setShowNewCategory(false);
      }

      toast.success(`${created.name} created`);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to create ${type}`));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingProduct) {
        const updateData: ProductUpdate = {
          name: formData.name,
          description: formData.description || undefined,
          brand_id: formData.brand_id ? Number(formData.brand_id) : undefined,
          model_id: formData.model_id ? Number(formData.model_id) : undefined,
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          unit_price: formData.unit_price,
          quantity_in_stock: formData.quantity_in_stock,
        };
        await productsAPI.update(editingProduct.id, updateData);
        toast.success('Product updated successfully');
      } else {
        const createData: ProductCreate = {
          name: formData.name,
          description: formData.description || undefined,
          brand_id: formData.brand_id ? Number(formData.brand_id) : undefined,
          model_id: formData.model_id ? Number(formData.model_id) : undefined,
          category_id: formData.category_id ? Number(formData.category_id) : undefined,
          unit_price: formData.unit_price,
          quantity_in_stock: formData.quantity_in_stock,
        };
        await productsAPI.create(createData);
        toast.success('Product created successfully');
      }

      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save product'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) {
      return;
    }

    try {
      await productsAPI.delete(product.id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete product'));
      console.error(error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand_name && product.brand_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.model_name && product.model_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.category_name && product.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      categoryFilter === 'all' || String(product.category_id) === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const renderLookupField = (
    label: string,
    value: string | number,
    options: LookupItem[],
    showInlineForm: boolean,
    newValue: string,
    setValue: (value: string | number) => void,
    setNewValue: (value: string) => void,
    setInlineVisible: (value: boolean) => void,
    createType: 'brand' | 'model' | 'category',
  ) => (
    <div>
      <label className="label">{label}</label>
      {showInlineForm ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="input flex-1"
            placeholder={`New ${label.toLowerCase()} name`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLookupCreate(createType, newValue);
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleLookupCreate(createType, newValue)}
            className="btn-primary px-3 text-sm"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setInlineVisible(false);
              setNewValue('');
            }}
            className="btn-secondary px-3 text-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input flex-1"
          >
            <option value="">-- None --</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setInlineVisible(true)}
            className="btn-secondary px-3 text-sm"
            title={`Add new ${label.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products Inventory</h1>
          <p className="mt-1 text-sm text-gray-600">
            {products.length} finished goods available for sales inventory
          </p>
        </div>
        <button onClick={openCreateForm} className="btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
            placeholder="Search by name, brand, model, or category..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input w-full sm:w-48"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(90vh-180px)] overflow-y-auto p-6"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="label">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. HP LaserJet Pro"
                    required
                  />
                </div>

                <div>
                  <label className="label">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        unit_price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="input w-full"
                  />
                </div>

                {renderLookupField(
                  'Brand',
                  formData.brand_id,
                  brands,
                  showNewBrand,
                  newBrandName,
                  (value) => setFormData((prev) => ({ ...prev, brand_id: value })),
                  setNewBrandName,
                  setShowNewBrand,
                  'brand',
                )}

                {renderLookupField(
                  'Model',
                  formData.model_id,
                  models,
                  showNewModel,
                  newModelName,
                  (value) => setFormData((prev) => ({ ...prev, model_id: value })),
                  setNewModelName,
                  setShowNewModel,
                  'model',
                )}

                {renderLookupField(
                  'Category',
                  formData.category_id,
                  categories,
                  showNewCategory,
                  newCategoryName,
                  (value) => setFormData((prev) => ({ ...prev, category_id: value })),
                  setNewCategoryName,
                  setShowNewCategory,
                  'category',
                )}

                <div>
                  <label className="label">Quantity in Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity_in_stock}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity_in_stock: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="input w-full"
                  rows={3}
                  placeholder="Optional product description..."
                />
              </div>

              <div className="mt-6 flex justify-end gap-4 border-t pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Saving...
                    </span>
                  ) : editingProduct ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <div className="card py-12 text-center">
          <Box className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Products Found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filter'
              : 'Get started by adding a new product'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Brand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Model</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="max-w-xs truncate text-xs text-gray-500">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{product.brand_name || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{product.model_name || '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{product.category_name || '--'}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {(product.quantity_in_stock || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900">
                      {(product.unit_price || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(product)}
                          className="rounded p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                          title="Edit product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                          title="Delete product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsList;
