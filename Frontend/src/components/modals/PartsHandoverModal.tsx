import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import type { Job, PartsHandoverResponse } from '../../types';
import { handoversAPI } from '../../api/endpoints';
import { X, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface PartsHandoverModalProps {
  job: Job;
  handovers: PartsHandoverResponse[];
  selectedHandover: PartsHandoverResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PartsHandoverModal: React.FC<PartsHandoverModalProps> = ({ 
  job, 
  handovers, 
  selectedHandover, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionItem, setActionItem] = useState<PartsHandoverResponse | null>(selectedHandover);

  const pendingHandovers = handovers.filter(h => h.status === 'pending' || h.status === 'transferred');

  const handleAction = async (actionType: 'transfer' | 'returnToStore' | 'confirmReceipt', handover: PartsHandoverResponse) => {
    try {
      setLoading(true);
      if (actionType === 'transfer') {
        await handoversAPI.transfer(handover.id, notes);
        toast.success('Part marked as transferred');
      } else if (actionType === 'returnToStore') {
        await handoversAPI.returnToStore(handover.id, notes);
        toast.success('Part returned to store');
      } else if (actionType === 'confirmReceipt') {
        await handoversAPI.confirmReceipt(handover.id, notes);
        toast.success('Part receipt confirmed');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || `Failed to ${actionType} part`);
    } finally {
      setLoading(false);
      setActionItem(null);
      setNotes('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl mx-auto my-6 z-50 p-4">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid border-gray-200 rounded-t">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">
                Parts Handover
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Job #{job.job_number} - {(job?.machine_model || "")}
              </p>
            </div>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-gray-400 hover:text-gray-900 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
              onClick={onClose}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="relative p-6 flex-auto max-h-[60vh] overflow-y-auto">
            {pendingHandovers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending handovers for this job.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingHandovers.map((handover) => {
                  const isPreviousEngineer = handover.previous_engineer_id === user?.id;
                  const isNewEngineer = handover.new_engineer_id === user?.id;
                  const canTransferOrReturn = isPreviousEngineer && (handover.status || "") === 'pending';
                  const canConfirm = isNewEngineer && (handover.status || "") === 'transferred';
                  
                  return (
                    <div key={handover.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {handover.part_name} <span className="text-gray-500 text-sm">({handover.part_number})</span>
                        </h4>
                        <div className="mt-1 text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-2">
                          <div><span className="font-medium">Quantity:</span> {handover.quantity}</div>
                          <div><span className="font-medium">From:</span> {handover.previous_engineer_name}</div>
                          <div><span className="font-medium">To:</span> {handover.new_engineer_name}</div>
                          <div>
                            <span className="font-medium">Status:</span>{' '}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                              (handover.status || "") === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              (handover.status || "") === 'transferred' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {(handover.status || "").replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {handover.notes && (
                          <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-2 rounded">
                            <span className="font-medium">Notes:</span> {handover.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        {actionItem?.id === handover.id ? (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Add Note (Optional)</label>
                            <input
                              type="text"
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm mb-2"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Any remarks..."
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                                onClick={() => {
                                  setActionItem(null);
                                  setNotes('');
                                }}
                              >
                                Cancel
                              </button>
                              {canTransferOrReturn && (
                                <>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                                    onClick={() => handleAction('transfer', handover)}
                                    disabled={loading}
                                  >
                                    Confirm Transfer
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2 py-1 text-xs font-medium text-white bg-orange-600 rounded hover:bg-orange-700 disabled:opacity-50"
                                    onClick={() => handleAction('returnToStore', handover)}
                                    disabled={loading}
                                  >
                                    Confirm Return
                                  </button>
                                </>
                              )}
                              {canConfirm && (
                                <button
                                  type="button"
                                  className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                                  onClick={() => handleAction('confirmReceipt', handover)}
                                  disabled={loading}
                                >
                                  Confirm Receipt
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {canTransferOrReturn && (
                              <button
                                type="button"
                                onClick={() => setActionItem(handover)}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                              >
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Transfer Parts
                              </button>
                            )}
                            {canConfirm && (
                              <button
                                type="button"
                                onClick={() => setActionItem(handover)}
                                className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4 mr-2" />
                                Confirm Receipt
                              </button>
                            )}
                          </>
                        )}
                        
                        {!canTransferOrReturn && !canConfirm && (
                           <div className="text-sm text-gray-500 text-center flex items-center justify-center bg-gray-50 py-2 rounded-md border border-gray-100">
                             {(handover.status || "") === 'pending' ? 'Waiting for previous engineer' : 'Waiting for new engineer'}
                           </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {pendingHandovers.length > 0 && (
               <div className="mt-6 flex items-start bg-blue-50 p-4 rounded-md">
                 <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
                 <p className="ml-3 text-sm text-blue-700">
                   <strong>Important:</strong> The new engineer cannot start repair work until all handed-over parts are either confirmed received or returned to the store.
                 </p>
               </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-solid border-gray-200 rounded-b">
            <button
              className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartsHandoverModal;
