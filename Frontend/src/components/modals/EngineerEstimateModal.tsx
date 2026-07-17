import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, Wrench, CheckCircle } from 'lucide-react';
import { engineerEstimatesAPI, partsAPI, partsRequestsAPI } from '../../api/endpoints';
import type { Part, EstimateItemType } from '../../types';
import LoadingSpinner from '../common/LoadingSpinner';
import SearchableSelect from '../common/SearchableSelect';
import { getErrorMessage } from '../../utils/apiErrors';
import toast from 'react-hot-toast';

interface EngineerEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobNumber: string;
  onSuccess: () => void;
}

interface EstimateItemForm {
  item_type: EstimateItemType;
  part_id?: number;
  part_name?: string;
  part_number?: string;
  description: string;
  technical_description: string;
  quantity: number;
  notes: string;
  fromPartsRequest?: boolean;
}

const EngineerEstimateModal: React.FC<EngineerEstimateModalProps> = ({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  onSuccess,
}) => {
  const [items, setItems] = useState<EstimateItemForm[]>([]);
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [isLoadingAllParts, setIsLoadingAllParts] = useState(false);

  // Load approved parts when modal opens
  useEffect(() => {
    if (isOpen) {
      loadApprovedParts();
      loadAllParts();
    }
  }, [isOpen, jobId]);

  const loadAllParts = async () => {
    setIsLoadingAllParts(true);
    try {
      const parts = await partsAPI.getAll(0, 1000);
      setAllParts(parts);
    } catch (error) {
      console.error('Failed to load all parts:', error);
    } finally {
      setIsLoadingAllParts(false);
    }
  };

  const loadApprovedParts = async () => {
    setIsLoadingParts(true);
    try {
      // Get all parts requests for this job
      const allRequests = await partsRequestsAPI.getAll(0, 100);

      // Filter requests for this job that are approved or partially approved
      const jobRequests = allRequests.filter(
        (req: any) => req.job_number === jobNumber &&
          (req.status === 'approved' || req.status === 'partially_approved')
      );

      if (jobRequests.length === 0) {
        return;
      }

      // Fetch full details for each request to get items
      const approvedItems: EstimateItemForm[] = [];

      for (const request of jobRequests) {
        const fullRequest = await partsRequestsAPI.getById(request.id);

        // Add approved items
        fullRequest.items.forEach((item: any) => {
          if (item.status === 'approved' || item.status === 'issued' || item.status === 'used') {
            const quantity = item.quantity_approved || item.quantity_issued || item.quantity_requested;
            approvedItems.push({
              item_type: 'part',
              part_id: item.part_id,
              part_name: item.part_name,
              part_number: item.part_number,
              description: item.part_name,
              technical_description: '',
              quantity: quantity,
              notes: item.notes || '',
              fromPartsRequest: true,
            });
          }
        });
      }

      if (approvedItems.length > 0) {
        setItems(approvedItems);
        toast.success(`${approvedItems.length} approved parts loaded from requests`);
      }
    } catch (error) {
      console.error('Failed to load approved parts:', error);
      // Don't show error to user, just continue with empty list
    } finally {
      setIsLoadingParts(false);
    }
  };

  const addItem = (type: EstimateItemType) => {
    const newItem: EstimateItemForm = {
      item_type: type,
      description: '',
      technical_description: '',
      quantity: 1,
      notes: '',
    };
    setItems([newItem, ...items]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof EstimateItemForm,
    value: EstimateItemForm[keyof EstimateItemForm]
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one item to the estimate');
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.description.trim()) {
        toast.error('All items must have a description');
        return;
      }
      if (item.quantity < 1) {
        toast.error('Quantity must be at least 1');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await engineerEstimatesAPI.create({
        job_id: jobId,
        technical_notes: technicalNotes || undefined,
        additional_notes: additionalNotes || undefined,
        items: items.map((item: any) => ({
          item_type: item.item_type,
          part_id: item.part_id,
          description: item.description,
          technical_description: item.technical_description || undefined,
          quantity: item.quantity,
          notes: item.notes || undefined,
        })),
      });

      toast.success('Engineer estimate created successfully');
      onSuccess();
      onClose();
      // Reset form
      setItems([]);
      setTechnicalNotes('');
      setAdditionalNotes('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create estimate'));
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const importedItemCount = items.filter((item: any) => item.fromPartsRequest).length;
  const partCount = items.filter((item: any) => item.item_type === 'part').length;
  const serviceCount = items.filter((item: any) => item.item_type === 'service').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 border-b bg-gray-50 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Create Engineer Estimate</h2>
            <p className="mt-1 text-sm text-gray-600">
              Job: {jobNumber} · Internal estimate for accountant review
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white px-3 py-1 font-medium text-gray-700 border border-gray-200">
                {items.length} total items
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 border border-blue-200">
                {partCount} parts
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 border border-emerald-200">
                {serviceCount} services
              </span>
              {importedItemCount > 0 && (
                <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700 border border-green-200">
                  {importedItemCount} loaded from parts requests
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Loading approved parts */}
          {isLoadingParts && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <LoadingSpinner size="sm" />
              <p className="text-sm font-medium text-blue-900">Loading approved parts from requests...</p>
            </div>
          )}

          {/* Items List */}
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="label mb-0">Estimate Items</label>
                <p className="mt-1 text-xs text-gray-500">
                  Keep descriptions concise and use technical details only where needed.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => addItem('part')}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Package className="h-4 w-4" />
                  Add Part
                </button>
                <button
                  type="button"
                  onClick={() => addItem('service')}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Wrench className="h-4 w-4" />
                  Add Service
                </button>
              </div>
            </div>

            {items.length === 0 && !isLoadingParts ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center">
                <Plus className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">
                  No items added yet. Add parts or services needed for this repair.
                </p>
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <div className="col-span-3">Part Lookup</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-3">Technical Details</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-2">Notes</div>
                </div>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border px-3 py-2 shadow-sm ${item.fromPartsRequest
                      ? 'border-green-200 bg-green-50/70'
                      : 'border-gray-200 bg-white'
                      }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 border-b border-gray-200 pb-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.item_type === 'part'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                          }`}>
                          {item.item_type === 'part' ? (
                            <Package className="h-3 w-3" />
                          ) : (
                            <Wrench className="h-3 w-3" />
                          )}
                          {item.item_type === 'part' ? `Part ${index + 1}` : `Service ${index + 1}`}
                        </span>
                        {item.fromPartsRequest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-medium text-white">
                            <CheckCircle className="h-3 w-3" />
                            From Parts Request
                          </span>
                        )}
                        {item.part_number && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600">
                            {item.part_number}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-800"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-start">
                      {/* Part Selection for part type */}
                      {item.item_type === 'part' && (
                        <div className="col-span-3 relative">
                          <SearchableSelect
                            options={allParts.filter(p => p.quantity_in_stock > 0).map(p => ({
                              id: p.id,
                              name: `${p.name} ${p.part_number ? `(${p.part_number})` : ''}`
                            }))}
                            value={item.part_id || ''}
                            onChange={(val) => {
                              if (val) {
                                const selectedPart = allParts.find(p => p.id === val);
                                if (selectedPart) {
                                  const updatedItems = [...items];
                                  updatedItems[index] = {
                                    ...updatedItems[index],
                                    part_id: selectedPart.id,
                                    part_name: selectedPart.name,
                                    part_number: selectedPart.part_number,
                                    description: selectedPart.name, // Auto-fill description
                                  };
                                  setItems(updatedItems);
                                }
                              } else {
                                const updatedItems = [...items];
                                updatedItems[index] = {
                                  ...updatedItems[index],
                                  part_id: undefined,
                                  part_name: undefined,
                                  part_number: undefined,
                                };
                                setItems(updatedItems);
                              }
                            }}
                            placeholder={isLoadingAllParts ? "Loading parts..." : "Select a part..."}
                            disabled={isLoadingAllParts}
                          />
                        </div>
                      )}

                      <div className={item.item_type === 'part' ? 'col-span-3' : 'col-span-6'}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="input text-xs py-1"
                          placeholder="What is needed"
                        />
                      </div>

                      <div className={item.item_type === 'part' ? 'col-span-3' : 'col-span-3'}>
                        <textarea
                          value={item.technical_description}
                          onChange={(e) => updateItem(index, 'technical_description', e.target.value)}
                          rows={1}
                          className="input min-h-[30px] text-xs py-1"
                          placeholder="Technical details"
                        />
                      </div>

                      <div className="col-span-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="input text-xs py-1 px-1"
                        />
                      </div>

                      <div className="col-span-2">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          className="input text-xs py-1"
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <label htmlFor="technical_notes" className="label">
                Technical Notes
              </label>
              <textarea
                id="technical_notes"
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                rows={4}
                className="input min-h-[120px] text-sm"
                placeholder="Technical analysis, diagnostic findings, root cause..."
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <label htmlFor="additional_notes" className="label">
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={4}
                className="input min-h-[120px] text-sm"
                placeholder="Any other information for the accountant..."
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This estimate is internal and will be sent to the accountant.
              The accountant will use this to create the customer estimate with pricing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 border-t bg-gray-50 px-5 py-4">
          <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            disabled={isSubmitting || items.length === 0}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                Creating...
              </>
            ) : (
              'Create Estimate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EngineerEstimateModal;
