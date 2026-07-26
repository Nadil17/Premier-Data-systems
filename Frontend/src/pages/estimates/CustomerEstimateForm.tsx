import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Package, Wrench, Save, ArrowLeft, CheckCircle, Mail, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { engineerEstimatesAPI, customerEstimatesAPI, jobsAPI, partsAPI } from '../../api/endpoints';
import type { CustomerEstimateItemForm, Job, EngineerEstimate, EstimateItemType, Part } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchableSelect from '../../components/common/SearchableSelect';
import { getErrorMessage } from '../../utils/apiErrors';

const CustomerEstimateForm: React.FC = () => {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [engineerEstimate, setEngineerEstimate] = useState<EngineerEstimate | null>(null);
  const [items, setItems] = useState<CustomerEstimateItemForm[]>([]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [includeTax, setIncludeTax] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentTypes, setSentTypes] = useState<{ email: boolean; whatsapp: boolean }>({ email: false, whatsapp: false });
  const [activeSendType, setActiveSendType] = useState<'email' | 'whatsapp' | null>(null);
  const [createdEstimateId, setCreatedEstimateId] = useState<number | null>(null);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadJobAndEstimate();
      loadAllParts();
    }
  }, [jobId]);

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
      // Load job details
      const jobData = await jobsAPI.getById(parseInt(jobId!));
      setJob(jobData);

      // Auto-detect if customer has a Tax Number
      const customerTaxNum = jobData.customer?.tax_number?.trim() || jobData.customer?.vat_number?.trim();
      const hasTaxNum = !!customerTaxNum;
      setIncludeTax(hasTaxNum);

      // Load engineer estimate
      const estimates = await engineerEstimatesAPI.getByJob(parseInt(jobId!));
      if (estimates && estimates.length > 0) {
        const engEstimate = estimates[0];
        setEngineerEstimate(engEstimate);

        // Pre-populate items from engineer estimate
        const estimateItems: CustomerEstimateItemForm[] = engEstimate.items.map((item: any) => ({
          item_type: item.item_type,
          part_id: item.part_id,
          part_name: item.part_id ? `Part ${item.part_id}` : undefined,
          description: item.description,
          quantity: item.quantity,
          unit_price: 0, // Accountant needs to add price
          item_comments: item.notes || '',
          fromEngineerEstimate: true,
        }));
        setItems(estimateItems);

        // Set technical notes as special notes
        if (engEstimate.technical_notes) {
          setSpecialNotes(engEstimate.technical_notes);
        }
      } else {
        toast.error('No engineer estimate found for this job');
      }
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
    return includeTax ? item.unit_price : Number((item.unit_price * 1.18).toFixed(2));
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
        job_id: parseInt(jobId!),
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

      const response = await customerEstimatesAPI.create(estimateData);
      setCreatedEstimateId(response.id);
      toast.success(`Customer estimate ${response.estimate_number} created successfully!`);
    } catch (error) {
      console.error('Failed to create estimate:', error);
      toast.error(getErrorMessage(error, 'Failed to create customer estimate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendToCustomer = async (type: 'email' | 'whatsapp') => {
    if (!createdEstimateId) return;

    setIsSending(true);
    setActiveSendType(type);
    try {
      const response = await customerEstimatesAPI.sendToCustomer(createdEstimateId, { send_via: type });
      toast.success(response.message);
      setSentTypes(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error(`Failed to send estimate via ${type}:`, error);
      toast.error(getErrorMessage(error, `Failed to send estimate via ${type}`));
    } finally {
      setIsSending(false);
      setActiveSendType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job || !engineerEstimate) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job or engineer estimate not found</p>
        <button onClick={() => navigate('/estimates')} className="btn-secondary mt-4">
          Back to Estimates
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
            onClick={() => navigate('/estimates')}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Customer Estimate</h1>
            <p className="text-gray-600">Job: {job.job_number} - {job.customer_name}</p>
          </div>
        </div>
      </div>

      {/* Job and Engineer Estimate Info */}
      <div className="card p-6 bg-blue-50 border-l-4 border-l-blue-600">
        <h3 className="font-semibold text-blue-900 mb-3">Engineer Estimate Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Estimate Number:</span>
            <span className="ml-2 font-medium">{engineerEstimate.estimate_number}</span>
          </div>
          <div>
            <span className="text-blue-700">Engineer:</span>
            <span className="ml-2 font-medium">{engineerEstimate.engineer_name}</span>
          </div>
          <div className="col-span-2">
            <span className="text-blue-700">Machine:</span>
            <span className="ml-2 font-medium">{(job?.machine_model || "")}</span>
          </div>
          {engineerEstimate.technical_notes && (
            <div className="col-span-2">
              <span className="text-blue-700">Technical Notes:</span>
              <p className="mt-1 text-gray-700">{engineerEstimate.technical_notes}</p>
            </div>
          )}
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
              <div className="flex justify-between items-center text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-medium text-gray-900">Rs. {calculateSubtotal().toFixed(2)}</span>
              </div>
              {includeTax && (
                <div className="flex justify-between items-center text-sm text-blue-700 font-medium">
                  <span>Tax Value (18%):</span>
                  <span>+Rs. {calculateTaxAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold pt-2 border-t border-gray-200">
                <span>Total Amount:</span>
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
        {!createdEstimateId ? (
          <>
            <button
              onClick={() => navigate('/estimates')}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Create Estimate
                </>
              )}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSendToCustomer('email')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sentTypes.email
                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }`}
              disabled={isSending || sentTypes.email}
            >
              {isSending && activeSendType === 'email' ? (
                <><LoadingSpinner size="sm" /> Sending...</>
              ) : sentTypes.email ? (
                <><CheckCircle className="h-5 w-5" /> Email Sent</>
              ) : (
                <><Mail className="h-5 w-5" /> Send via Email</>
              )}
            </button>
            <button
              onClick={() => handleSendToCustomer('whatsapp')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                sentTypes.whatsapp
                  ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
              }`}
              disabled={isSending || sentTypes.whatsapp}
            >
              {isSending && activeSendType === 'whatsapp' ? (
                <><LoadingSpinner size="sm" /> Sending...</>
              ) : sentTypes.whatsapp ? (
                <><CheckCircle className="h-5 w-5" /> WhatsApp Sent</>
              ) : (
                <><MessageSquare className="h-5 w-5" /> Send via WhatsApp</>
              )}
            </button>
            <button
              onClick={() => navigate('/estimates')}
              className="btn-secondary"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerEstimateForm;
