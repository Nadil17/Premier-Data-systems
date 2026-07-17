import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Plus, Trash2, Search, ChevronDown, Filter } from 'lucide-react';
import { partsAPI, partsRequestsAPI } from '../../api/endpoints';
import type { Part, LookupItem } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import { getErrorMessage } from '../../utils/apiErrors';
import toast from 'react-hot-toast';

interface PartsRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobNumber: string;
  onSuccess: () => void;
  preselectedParts?: { part_id: number; quantity: number }[];
}

interface RequestItem {
  part_id: number;
  part_name: string;
  part_number: string;
  quantity_requested: number;
}

const PartsRequestModal: React.FC<PartsRequestModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  onSuccess,
  preselectedParts,
}) => {
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [models, setModels] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [modelFilter, setModelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [showDropdown, setShowDropdown] = useState(false);
  const [requestItems, setRequestItems] = useState<RequestItem[]>([]);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load all parts and lookup data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setRequestItems([]);
      setReason('');
      setSearchQuery('');
      setBrandFilter('all');
      setModelFilter('all');
      setCategoryFilter('all');
    }
  }, [isOpen, preselectedParts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setIsLoadingParts(true);
    try {
      const [partsData, brandsData, modelsData, categoriesData] = await Promise.all([
        partsAPI.getAll(0, 1000),
        partsAPI.getBrands(),
        partsAPI.getModels(),
        partsAPI.getCategories(),
      ]);
      const loadedParts = Array.isArray(partsData) ? partsData : [];
      setAllParts(loadedParts);
      setBrands(brandsData);
      setModels(modelsData);
      setCategories(categoriesData);

      if (preselectedParts && preselectedParts.length > 0) {
        const initialItems: RequestItem[] = [];
        preselectedParts.forEach((p) => {
          const part = loadedParts.find((lp) => lp.id === p.part_id);
          if (part && !initialItems.some(i => i.part_id === part.id)) {
            initialItems.push({
              part_id: part.id,
              part_name: part.name,
              part_number: part.part_number,
              quantity_requested: p.quantity,
            });
          }
        });
        setRequestItems(initialItems);
        if (initialItems.length > 0) {
          setReason('Requesting customer-approved parts for the repair.');
        }
      }
    } catch (error) {
      console.error('Failed to load parts data:', error);
      toast.error('Failed to load parts');
    } finally {
      setIsLoadingParts(false);
    }
  };

  // Filter parts based on search query and dropdown filters
  const filteredParts = useMemo(() => {
    return allParts.filter((part) => {
      // Exclude out-of-stock parts
      if (part.quantity_in_stock <= 0) return false;

      // Exclude already-selected parts
      if (requestItems.some((item) => item.part_id === part.id)) return false;

      // Text search across multiple fields
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          part.name.toLowerCase().includes(q) ||
          part.part_number.toLowerCase().includes(q) ||
          (part.brand_name && part.brand_name.toLowerCase().includes(q)) ||
          (part.model_name && part.model_name.toLowerCase().includes(q)) ||
          (part.category_name && part.category_name.toLowerCase().includes(q)) ||
          (part.description && part.description.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      // Brand filter
      if (brandFilter !== 'all' && String(part.brand_id) !== brandFilter) return false;

      // Model filter
      if (modelFilter !== 'all' && String(part.model_id) !== modelFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && String(part.category_id) !== categoryFilter) return false;

      return true;
    });
  }, [allParts, searchQuery, brandFilter, modelFilter, categoryFilter, requestItems]);

  const activeFilterCount = [brandFilter, modelFilter, categoryFilter].filter(f => f !== 'all').length;

  const addPart = (part: Part) => {
    setRequestItems((prev) => [
      ...prev,
      {
        part_id: part.id,
        part_name: part.name,
        part_number: part.part_number,
        quantity_requested: 1,
      },
    ]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removePart = (partId: number) => {
    setRequestItems(requestItems.filter((item) => item.part_id !== partId));
  };

  const updateQuantity = (partId: number, quantity: number) => {
    if (quantity < 1) return;
    setRequestItems(
      requestItems.map((item) =>
        item.part_id === partId ? { ...item, quantity_requested: quantity } : item
      )
    );
  };

  const clearFilters = () => {
    setBrandFilter('all');
    setModelFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const handleSubmit = async () => {
    if (requestItems.length === 0) {
      toast.error('Please add at least one part');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a reason for this request');
      return;
    }

    setIsSubmitting(true);
    try {
      await partsRequestsAPI.create({
        job_id: jobId,
        items: requestItems.map((item) => ({
          part_id: item.part_id,
          quantity_requested: item.quantity_requested,
        })),
        reason: reason,
      });

      toast.success('Parts request submitted successfully');
      onSuccess();
      onClose();
      // Reset form
      setRequestItems([]);
      setReason('');
      setSearchQuery('');
      setBrandFilter('all');
      setModelFilter('all');
      setCategoryFilter('all');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit parts request'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Request Parts</h2>
            <p className="text-sm text-gray-600 mt-1">Job: {jobNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Part Selector */}
          <div className="mb-6">
            <label className="label">Find & Add Parts</label>

            <div ref={dropdownRef} className="relative">
              {/* Search Input */}
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="input pl-10 pr-10 w-full"
                    placeholder="Search by name, part number, brand, model, category..."
                  />
                  {isLoadingParts && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  {!isLoadingParts && (
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Filter Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    showFilters || activeFilterCount > 0
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Filter Dropdowns */}
              {showFilters && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Brand</label>
                      <select
                        value={brandFilter}
                        onChange={(e) => { setBrandFilter(e.target.value); setShowDropdown(true); }}
                        className="input w-full text-sm"
                      >
                        <option value="all">All Brands</option>
                        {brands.map((b) => (
                          <option key={b.id} value={String(b.id)}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Model</label>
                      <select
                        value={modelFilter}
                        onChange={(e) => { setModelFilter(e.target.value); setShowDropdown(true); }}
                        className="input w-full text-sm"
                      >
                        <option value="all">All Models</option>
                        {models.map((m) => (
                          <option key={m.id} value={String(m.id)}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => { setCategoryFilter(e.target.value); setShowDropdown(true); }}
                        className="input w-full text-sm"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              )}

              {/* Parts Dropdown Results */}
              {showDropdown && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {isLoadingParts ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-sm text-gray-500">Loading parts...</span>
                    </div>
                  ) : filteredParts.length === 0 ? (
                    <div className="text-center py-6 px-4">
                      <p className="text-sm text-gray-500">
                        {allParts.length === 0
                          ? 'No parts available in inventory'
                          : 'No parts match your search or filters'}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b text-xs text-gray-500 font-medium">
                        {filteredParts.length} part{filteredParts.length !== 1 ? 's' : ''} found
                      </div>
                      {filteredParts.map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => addPart(part)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{part.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">Part #: {part.part_number}</p>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {part.brand_name && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
                                    {part.brand_name}
                                  </span>
                                )}
                                {part.model_name && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                    {part.model_name}
                                  </span>
                                )}
                                {part.category_name && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                    {part.category_name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`text-sm font-semibold ${
                                part.quantity_in_stock === 0 ? 'text-red-600' :
                                part.quantity_in_stock <= part.minimum_stock_level ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {part.quantity_in_stock} in stock
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Parts */}
          <div className="mb-6">
            <label className="label">Selected Parts ({requestItems.length})</label>
            {requestItems.length === 0 ? (
               <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Search and add parts to request</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requestItems.map((item) => (
                  <div
                    key={item.part_id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.part_name}</p>
                      <span className="text-xs text-gray-500 whitespace-nowrap">({item.part_number})</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <label className="text-sm text-gray-600">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity_requested}
                        onChange={(e) =>
                          updateQuantity(item.part_id, parseInt(e.target.value) || 1)
                        }
                        className="input w-20 text-center py-1"
                      />
                    </div>
                    <button
                      onClick={() => removePart(item.part_id)}
                      className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="label">
              Reason for Request <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="input"
              placeholder="Explain why these parts are needed for this repair..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
          <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSubmitting || requestItems.length === 0}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartsRequestModal;
