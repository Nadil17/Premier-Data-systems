import React, { useState, useEffect } from 'react';
import { X, Check, XCircle } from 'lucide-react';
import { customerEstimatesAPI } from '../../api/endpoints';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiErrors';

interface ManualApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimateId: number | null;
  onSuccess: () => void;
}

const ManualApprovalModal: React.FC<ManualApprovalModalProps> = ({
  isOpen,
  onClose,
  estimateId,
  onSuccess,
}) => {
  const [estimate, setEstimate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemStatuses, setItemStatuses] = useState<Record<number, string>>({});
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (isOpen && estimateId) {
      fetchEstimate();
    } else {
      setEstimate(null);
      setItemStatuses({});
      setComments('');
    }
  }, [isOpen, estimateId]);

  const fetchEstimate = async () => {
    setIsLoading(true);
    try {
      const data = await customerEstimatesAPI.getById(estimateId!);
      setEstimate(data);
      // Initialize statuses to what's already there or pending
      const initial: Record<number, string> = {};
      data.items?.forEach((item: any) => {
        initial[item.id] = item.approval_status || 'pending';
      });
      setItemStatuses(initial);
    } catch (error) {
      toast.error('Failed to load estimate details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = (itemId: number, status: string) => {
    setItemStatuses(prev => ({ ...prev, [itemId]: status }));
  };

  const handleSubmit = async () => {
    if (!estimateId) return;
    
    // Check if any items are pending
    const hasPending = Object.values(itemStatuses).some(s => s === 'pending');
    if (hasPending) {
      toast.error('Please accept or reject all items before submitting');
      return;
    }

    const hasApproved = Object.values(itemStatuses).some(s => s === 'approved');
    const hasRejected = Object.values(itemStatuses).some(s => s === 'rejected');
    
    let overall_status = 'approved';
    if (hasApproved && hasRejected) {
      overall_status = 'partially_approved';
    } else if (!hasApproved && hasRejected) {
      overall_status = 'rejected';
    }

    const payload = {
      overall_status,
      customer_comments: comments,
      items: Object.entries(itemStatuses).map(([id, status]) => ({
        item_id: parseInt(id),
        approval_status: status
      }))
    };

    setIsSubmitting(true);
    try {
      await customerEstimatesAPI.manualApprove(estimateId, payload);
      toast.success('Estimate manually approved/rejected successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update estimate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Manual Estimate Approval
            </h3>
            {estimate && (
              <p className="text-sm text-gray-500 mt-1">Estimate #{estimate.estimate_number}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : estimate ? (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Estimate Items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {estimate.items?.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                            Rs. {item.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 flex justify-center gap-2">
                            <button
                              onClick={() => handleStatusChange(item.id, 'approved')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors ${
                                itemStatuses[item.id] === 'approved' 
                                  ? 'bg-green-100 text-green-800 ring-1 ring-green-600' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <Check className="h-4 w-4" /> Accept
                            </button>
                            <button
                              onClick={() => handleStatusChange(item.id, 'rejected')}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1 transition-colors ${
                                itemStatuses[item.id] === 'rejected' 
                                  ? 'bg-red-100 text-red-800 ring-1 ring-red-600' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary */}
              {(() => {
                const hasTax = estimate.include_tax === true;
                const acceptedItems = estimate.items?.filter((item: any) => itemStatuses[item.id] === 'approved') || [];
                const itemsTotal = acceptedItems.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
                const subtotal = hasTax ? itemsTotal / 1.18 : itemsTotal;
                const taxAmount = hasTax ? itemsTotal - subtotal : 0;
                const totalAmount = itemsTotal;

                return (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    {hasTax && (
                      <>
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>Accepted Subtotal:</span>
                          <span className="font-semibold text-gray-900">Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-blue-700 font-medium">
                          <span>Accepted VAT (18%):</span>
                          <span>+Rs. {taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Approved Total:</span>
                      <span className="text-blue-600">Rs. {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Comments / Internal Notes
                </label>
                <textarea
                  className="input w-full"
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Notes about phone call approval..."
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Estimate not found</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !estimate || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              'Save Approvals'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualApprovalModal;
