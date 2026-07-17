import React, { useState } from 'react';
import { X, CheckCircle, Package, AlertCircle, Truck } from 'lucide-react';
import type { Job } from '../../types';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliver: (returnedItemIds: number[]) => void;
  job: Job;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  onDeliver,
  job,
}) => {
  const [returnedItems, setReturnedItems] = useState<Set<number>>(
    new Set((job.items || []).filter(item => item.returned).map(item => item.id))
  );
  const [isDelivering, setIsDelivering] = useState(false);

  if (!isOpen) return null;

  const handleToggleItem = (itemId: number) => {
    const newReturned = new Set(returnedItems);
    if (newReturned.has(itemId)) {
      newReturned.delete(itemId);
    } else {
      newReturned.add(itemId);
    }
    setReturnedItems(newReturned);
  };

  const handleDeliver = async () => {
    const allItemsReturned = (job.items || []).every(item => returnedItems.has(item.id));
    
    if (!allItemsReturned) {
      const confirmed = window.confirm(
        'Not all items have been marked as returned. Are you sure you want to proceed with delivery?'
      );
      if (!confirmed) return;
    }

    setIsDelivering(true);
    try {
      await onDeliver(Array.from(returnedItems));
    } finally {
      setIsDelivering(false);
    }
  };

  const allItemsReturned = (job.items || []).every(item => returnedItems.has(item.id));
  const returnedCount = returnedItems.size;
  const totalItems = (job.items || []).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-green-50">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Deliver Job to Customer</h2>
              <p className="text-sm text-gray-600 mt-1">Verify all items before delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Job Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-500">Job Number</p>
                <p className="text-base font-semibold text-gray-900">{job.job_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="text-base font-semibold text-gray-900">{job.customer_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Machine Model</p>
                <p className="text-base text-gray-900">{(job?.machine_model || "")}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Serial Number</p>
                <p className="text-base text-gray-900">{job.serial_number || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Return Status Summary */}
          <div className={`rounded-lg p-4 border-2 ${
            allItemsReturned 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {allItemsReturned ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-semibold text-green-900">All Items Verified</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-900">Items Pending Verification</p>
                </>
              )}
            </div>
            <p className="text-sm text-gray-700">
              {returnedCount} of {totalItems} items marked as returned
            </p>
          </div>

          {/* Items Checklist */}
          <div className="border border-gray-200 rounded-lg">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Items Taken vs Items Returned</h3>
              <p className="text-sm text-gray-600 mt-1">
                Check each item as it's returned by the customer
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {(job.items || []).length > 0 ? (
                (job.items || []).map((item) => {
                  const isReturned = returnedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        isReturned ? 'bg-green-50' : ''
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isReturned}
                          onChange={() => handleToggleItem(item.id)}
                          className="mt-1 h-5 w-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900">{item.item_name}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              isReturned
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isReturned ? '✓ Returned' : 'Not Returned'}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                            <span>Quantity: {item.quantity}</span>
                            {item.notes && (
                              <span className="text-gray-500">Note: {item.notes}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No items were taken for this job</p>
                </div>
              )}
            </div>
          </div>

          {/* Warning Message */}
          {!allItemsReturned && (job.items || []).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Warning: Not all items have been returned
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please verify that all items taken from the customer have been returned. 
                    If items are missing, document this before proceeding with delivery.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {allItemsReturned && (job.items || []).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    All items verified and ready for delivery
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Click "Complete Delivery" to mark this job as delivered and close it officially.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isDelivering}
          >
            Cancel
          </button>
          <button
            onClick={handleDeliver}
            disabled={isDelivering}
            className="btn-primary flex items-center gap-2"
          >
            <Truck className="h-5 w-5" />
            {isDelivering ? 'Processing...' : 'Complete Delivery'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;
