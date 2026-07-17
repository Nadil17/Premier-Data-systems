import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';

interface PartsStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (action: 'used' | 'returned', quantity: number) => Promise<void>;
    item: {
        id: number;
        part_name: string;
        part_number: string;
        quantity_issued?: number;
        quantity_used?: number;
        quantity_returned?: number;
        quantity_pending_return?: number;
    } | null;
    approvalState?: 'approved' | 'not_approved' | 'no_estimate';
}

const PartsStatusModal: React.FC<PartsStatusModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    item,
    approvalState = 'no_estimate',
}) => {
    const [action, setAction] = useState<'used' | 'returned'>('used');
    const [quantity, setQuantity] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            if (approvalState === 'approved') {
                setAction('used');
            } else if (approvalState === 'not_approved') {
                setAction('returned');
            } else {
                setAction('used');
            }
        }
    }, [isOpen, approvalState]);

    if (!isOpen || !item) return null;

    // Calculate available quantity
    // Note: The item object passed here might have different field names depending on where it comes from,
    // but based on JobDetail.tsx usage, it matches the API response structure.
    // We need to be careful with null/undefined values.
    const pendingReturn = item.quantity_pending_return || 0;
    const availableForUse = (item.quantity_issued || 0) - (item.quantity_used || 0) - (item.quantity_returned || 0) - pendingReturn;
    const availableForReturn = (item.quantity_issued || 0) - (item.quantity_returned || 0) - pendingReturn;
    const available = action === 'used' ? availableForUse : availableForReturn;

    const handleSubmit = async () => {
        if (quantity <= 0 || quantity > available) return;

        setIsSubmitting(true);
        try {
            await onConfirm(action, quantity);
            onClose();
        } catch (error) {
            console.error(error);
            // Error handling is done in the parent component
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Update Part Status</h2>
                        <p className="text-sm text-gray-600 mt-1">{item.part_name} ({item.part_number})</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Action Selection */}
                    <div>
                        <label className="label mb-3">Select Action</label>
                        <div className={`grid gap-4 ${approvalState === 'no_estimate' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {(approvalState === 'approved' || approvalState === 'no_estimate') && (
                                <button
                                    type="button"
                                    onClick={() => setAction('used')}
                                    className={`p-4 rounded-lg border-2 text-center transition-colors ${action === 'used'
                                        ? 'border-green-600 bg-green-50 text-green-800'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold">Mark as Used</div>
                                    <div className="text-xs mt-1 opacity-75">Consumed in repair</div>
                                </button>
                            )}
                            {(approvalState === 'not_approved' || approvalState === 'no_estimate') && (
                                <button
                                    type="button"
                                    onClick={() => setAction('returned')}
                                    className={`p-4 rounded-lg border-2 text-center transition-colors ${action === 'returned'
                                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="font-semibold">Return to Store</div>
                                    <div className="text-xs mt-1 opacity-75">Unused / Defective</div>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quantity Input */}
                    <div>
                        <label className="label">
                            Quantity to {action === 'used' ? 'Use' : 'Return'}
                            <div className="text-xs text-gray-500 font-normal mt-1">
                                Available: {available} (Issued: {item.quantity_issued}, Used: {item.quantity_used}, Returned: {item.quantity_returned}, Pending: {pendingReturn})
                            </div>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={available}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 0, available))}
                            className="input text-lg font-medium"
                        />
                    </div>

                    {/* Warning Message for Returns */}
                    {action === 'returned' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <p className="font-semibold">Storekeeper Approval Required</p>
                                <p className="mt-1">
                                    The storekeeper must accept the returned item before the process is completed.
                                    The status will be marked as "Return Requested" until approved.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                    <button onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`btn-primary ${action === 'returned' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                            }`}
                        disabled={isSubmitting || quantity <= 0 || quantity > available}
                    >
                        {isSubmitting ? (
                            <>
                                <LoadingSpinner size="sm" />
                                Processing...
                            </>
                        ) : (
                            action === 'returned' ? 'Request Return' : 'Confirm Usage'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PartsStatusModal;
