import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Package, Wrench, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerEstimatesAPI, jobsAPI, partsAPI } from '../../api/endpoints';
import type { CustomerEstimateItemForm, Job, EstimateItemType, Part } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchableSelect from '../../components/common/SearchableSelect';
import { getErrorMessage } from '../../utils/apiErrors';

const EditCustomerEstimateForm: React.FC = () => {
  const navigate = useNavigate();
  const { estimateId } = useParams<{ estimateId: string }>();
  const [estimate, setEstimate] = useState<any>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [items, setItems] = useState<CustomerEstimateItemForm[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  useEffect(() => {
    if (estimateId) {
      loadJobAndEstimate();
      loadAllParts();
    }
  }, [estimateId]);

  const loadAllParts = async () => {
    setIsLoadingParts(true);
    try {
      const parts = await partsAPI.getAll(0, 1000);
      setAllParts(parts);
    } catch (error) {
      console.error('Failed to load parts:', error);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const loadJobAndEstimate = async () => {
    setIsLoading(true);
    try {
      // Load customer estimate
      const estData = await customerEstimatesAPI.getById(parseInt(estimateId!));
      setEstimate(estData);

      // Load job details
      const jobData = await jobsAPI.getById(estData.job_id);
      setJob(jobData);

      setIncludeTax(estData.include_tax);
      setSpecialNotes(estData.special_notes || '');

      // Pre-populate items from existing estimate
      const estimateItems: CustomerEstimateItemForm[] = estData.items.map((item: any) => ({
        item_type: item.item_type,
        part_id: item.part_id,
        part_name: item.part_id ? `Part ${item.part_id}` : undefined,
        description: item.description,
        quantity: item.quantity,
        unit_price: estData.include_tax ? item.unit_price : parseFloat((item.unit_price / 1.18).toFixed(2)),
        item_comments: item.item_comments || '',
      }));
      setItems(estimateItems);
    } catch (error) {
      console.error('Failed to load job and estimate:', error);
      toast.error('Failed to load estimate details');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = (type: EstimateItemType) => {
    const newItem: CustomerEstimateItemForm = {
      item_type: type,
      description: '',
      quantity: 1,
      unit_price: 0,
      item_comments: '',
      fromEngineerEstimate: false,
    };
    setItems([newItem, ...items]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof CustomerEstimateItemForm,
    value: CustomerEstimateItemForm[keyof CustomerEstimateItemForm]
  ) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const getItemEffectiveUnitPrice = (item: CustomerEstimateItemForm) => {
    return !includeTax ? item.unit_price * 1.18 : item.unit_price;
  };

  const getItemTotalPrice = (item: CustomerEstimateItemForm) => {
    return item.quantity * getItemEffectiveUnitPrice(item);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + getItemTotalPrice(item), 0);
  };

  const calculateTaxAmount = () => {
    return includeTax ? calculateSubtotal() * 0.18 : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const handleSubmit = async () => {
    // Validation
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const invalidItems = items.filter(item =>
      !item.description.trim() || item.quantity <= 0 || item.unit_price < 0
    );
    if (invalidItems.length > 0) {
      toast.error('Please fill in all item details with valid values');
      return;
    }

    setIsSubmitting(true);
    try {
      const estimateData = {
        special_notes: specialNotes.trim() || undefined,
        include_tax: includeTax,
        items: items.map(item => ({
          item_type: item.item_type,
          part_id: item.part_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: getItemEffectiveUnitPrice(item),
          item_comments: item.item_comments || undefined,
        })),
      };

      const response = await customerEstimatesAPI.update(parseInt(estimateId!), estimateData);
      toast.success(`Customer estimate ${response.estimate_number} updated successfully!`);
      // Navigate back to job detail page
      navigate(`/jobs/${job?.id}`);
    } catch (error) {
      console.error('Failed to update estimate:', error);
      toast.error(getErrorMessage(error, 'Failed to update customer estimate'));
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job || !estimate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job or customer estimate not found</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/jobs/${job.id}`)}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Customer Estimate</h1>
            <p className="text-gray-600">Job: {job.job_number} - {job.customer_name}</p>
          </div>
        </div>
      </div>

      {/* Job Info */}
      <div className="card p-6 bg-blue-50 border-l-4 border-l-blue-600">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Estimate Number:</span>
            <span className="ml-2 font-medium">{estimate.estimate_number}</span>
          </div>
          <div>
            <span className="text-blue-700">Machine:</span>
            <span className="ml-2 font-medium">{(job?.machine_model || "")}</span>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Estimate Items ({items.length})</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addItem('part')}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Add Part
            </button>
            <button
              type="button"
              onClick={() => addItem('service')}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Add Service
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            No items added yet. Pre-populate from engineer estimate or add parts/services.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 font-semibold text-gray-700 text-xs px-3">
              <div className="col-span-3">Search Part</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-1">Price</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-3">Comments</div>
            </div>
            {items.map((item, index) => (
              <div
                key={index}
                className={`border rounded-lg px-3 py-2 ${item.fromEngineerEstimate
                  ? 'border-blue-500 border-l-4 bg-blue-50'
                  : 'border-gray-300 bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between mb-2 border-b border-gray-200 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 font-semibold text-gray-900 text-xs capitalize">
                      {item.item_type === 'part' ? (
                        <Package className="h-3 w-3 text-blue-600" />
                      ) : (
                        <Wrench className="h-3 w-3 text-green-600" />
                      )}
                      {item.item_type}
                    </span>
                    {item.fromEngineerEstimate && (
                      <span className="flex items-center gap-1 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full ml-2">
                        <CheckCircle className="h-3 w-3" />
                        From Engineer
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2 items-start">
                  {/* Part Selection (if type is part) */}
                  {item.item_type === 'part' ? (
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
                                description: item.description || selectedPart.name,
                              };
                              setItems(updatedItems);
                            }
                          } else {
                            const updatedItems = [...items];
                            updatedItems[index] = {
                              ...updatedItems[index],
                              part_id: undefined,
                              part_name: undefined,
                            };
                            setItems(updatedItems);
                          }
                        }}
                        placeholder={isLoadingParts ? "Loading parts..." : "Select a part..."}
                        disabled={isLoadingParts || item.fromEngineerEstimate}
                      />
                    </div>
                  ) : (
                    <div className="col-span-3"></div>
                  )}

                  {/* Description */}
                  <div className={item.item_type === 'part' ? 'col-span-3' : 'col-span-6'}>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="input text-xs py-1"
                      placeholder="Item description"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="input text-xs py-1 px-1"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="input text-xs py-1 px-1"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Total Price (calculated) */}
                  <div className="col-span-1">
                    <div className="input bg-gray-100 font-semibold text-xs py-1 px-1 overflow-hidden text-ellipsis whitespace-nowrap">
                      Rs. {getItemTotalPrice(item).toFixed(2)}
                    </div>
                  </div>

                  {/* Item Comments */}
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={item.item_comments}
                      onChange={(e) => updateItem(index, 'item_comments', e.target.value)}
                      className="input text-xs py-1"
                      placeholder="Optional comments"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Total & Tax Summary */}
        {items.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            {/* Customer Tax Number Info Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              includeTax
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}>
              <div>
                <span className="font-semibold text-sm">
                  {includeTax
                    ? `Tax Applied (Customer Tax No: ${job?.customer?.tax_number || job?.customer?.vat_number || 'Present'})`
                    : 'Tax Included in Item Prices (Customer Has No Tax Number)'}
                </span>
                <p className="text-xs mt-0.5 opacity-80">
                  {includeTax
                    ? 'Customer has a Tax Number. 18% Tax Value is displayed as a separate line item.'
                    : 'Customer does not have a Tax Number. Prices are inclusive of tax (no separate Tax Value displayed).'}
                </p>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                includeTax ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {includeTax ? '18% Tax Separate' : 'Tax Included'}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200">
              {includeTax && (
                <>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-medium text-gray-900">Rs. {calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-blue-700 font-medium">
                    <span>Tax Value (18%):</span>
                    <span>+Rs. {calculateTaxAmount().toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-xl font-bold pt-2 border-t border-gray-200">
                <span>Total Amount{includeTax ? '' : ' (Tax Included)'}:</span>
                <span className="text-blue-600">Rs. {calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Special Notes */}
      <div className="card p-6">
        <label className="label">Special Notes for Customer</label>
        <textarea
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          className="input min-h-[100px]"
          placeholder="Any special instructions, warranty information, or important notes for the customer..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => navigate(`/jobs/${job.id}`)}
          className="btn-secondary"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary flex items-center gap-2"
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <><LoadingSpinner size="sm" /> Updating...</>
          ) : (
            <><Save className="h-5 w-5" /> Update Estimate</>
          )}
        </button>
      </div>
    </div>
  );
};

export default EditCustomerEstimateForm;
