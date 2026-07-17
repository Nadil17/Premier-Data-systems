import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle, AlertCircle, User, Wrench } from 'lucide-react';
import { partsRequestsAPI } from '../../api/endpoints';
import type { PartsRequest } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../utils/apiErrors';
import { formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type ItemDecision = 'approve' | 'reject';

interface ItemApproval {
  item_id: number;
  decision: ItemDecision;
  quantity_approved: number;
  notes: string;
  rejection_reason: string;
}

interface ItemApprovalError {
  decision?: string;
  quantity_approved?: string;
  rejection_reason?: string;
}

const PartsRequestDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<PartsRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [itemApprovals, setItemApprovals] = useState<Record<number, ItemApproval>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, ItemApprovalError>>({});
  const [storekeeperNotes, setStorekeeperNotes] = useState('');

  const isStorekeeper = user?.role === 'storekeeper' || user?.role === 'admin';
  const canApprove = isStorekeeper && request?.status === 'pending';

  useEffect(() => {
    if (id) {
      fetchRequest();
    }
  }, [id]);

  const fetchRequest = async () => {
    setIsLoading(true);
    try {
      const data = await partsRequestsAPI.getById(Number(id));
      setRequest(data);

      // Initialize approval states
      const approvals: Record<number, ItemApproval> = {};
      data.items.forEach((item: any) => {
        approvals[item.id] = {
          item_id: item.id,
          decision: 'approve',
          quantity_approved: item.quantity_requested,
          notes: '',
          rejection_reason: '',
        };
      });
      setItemApprovals(approvals);
      setItemErrors({});
    } catch (error) {
      toast.error('Failed to fetch request details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearItemError = (itemId: number, field: keyof ItemApprovalError) => {
    setItemErrors((prev) => {
      if (!prev[itemId] || !prev[itemId][field]) return prev;

      return {
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: undefined,
        },
      };
    });
  };

  const handleDecisionChange = (itemId: number, decision: ItemDecision) => {
    setItemApprovals((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        decision,
        quantity_approved: decision === 'approve' ? Math.max(prev[itemId]?.quantity_approved || 0, 1) : 0,
      },
    }));

    clearItemError(itemId, 'decision');
    if (decision === 'approve') {
      clearItemError(itemId, 'quantity_approved');
    }
    if (decision === 'reject') {
      clearItemError(itemId, 'rejection_reason');
    }
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    const item = request?.items.find((i) => i.id === itemId);
    if (!item) return;

    setItemApprovals((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity_approved: Math.max(0, Math.min(quantity, item.quantity_requested)),
      },
    }));

    clearItemError(itemId, 'quantity_approved');
  };

  const handleNotesChange = (itemId: number, notes: string) => {
    setItemApprovals((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        notes,
      },
    }));
  };

  const handleRejectionReasonChange = (itemId: number, rejectionReason: string) => {
    setItemApprovals((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        rejection_reason: rejectionReason,
      },
    }));

    clearItemError(itemId, 'rejection_reason');
  };

  const validateApprovals = () => {
    if (!request) return false;

    const nextErrors: Record<number, ItemApprovalError> = {};

    (request.items || []).forEach((item: any) => {
      const approval = itemApprovals[item.id];
      const itemError: ItemApprovalError = {};

      if (!approval?.decision) {
        itemError.decision = 'Select approve or reject';
      }

      if (approval?.decision === 'approve') {
        if (!Number.isInteger(approval.quantity_approved) || approval.quantity_approved < 1) {
          itemError.quantity_approved = 'Approved quantity must be at least 1';
        } else if (approval.quantity_approved > item.quantity_requested) {
          itemError.quantity_approved = 'Approved quantity cannot exceed requested quantity';
        }
      }

      if (approval?.decision === 'reject') {
        if (!approval.rejection_reason || approval.rejection_reason.trim().length < 10) {
          itemError.rejection_reason = 'Rejection reason must be at least 10 characters';
        }
      }

      if (Object.keys(itemError).length > 0) {
        nextErrors[item.id] = itemError;
      }
    });

    setItemErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmitApproval = async () => {
    if (!request) return;

    if (!validateApprovals()) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    const items = Object.values(itemApprovals);
    const approvedItems = items.filter((item: any) => item.decision === 'approve');
    const rejectedItems = items.filter((item: any) => item.decision === 'reject');

    const confirmMessage = [
      'Confirm request decision:',
      `Approved items: ${approvedItems.length}`,
      `Rejected items: ${rejectedItems.length}`,
      rejectedItems.length > 0 ? 'Rejected items include mandatory reasons.' : '',
      '',
      'Proceed with submission?'
    ].filter(Boolean).join('\n');

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsApproving(true);
    try {
      // Calculate overall request status
      const approvedCount = items.filter(i => i.decision === 'approve').length;
      const rejectedCount = items.filter(i => i.decision === 'reject').length;

      let overallStatus: 'pending' | 'approved' | 'rejected' | 'partially_approved' | 'issued';
      if (approvedCount === items.length) {
        overallStatus = 'approved';
      } else if (rejectedCount === items.length) {
        overallStatus = 'rejected';
      } else {
        overallStatus = 'partially_approved';
      }

      const approval = {
        status: overallStatus,
        items: Object.values(itemApprovals).map((item: any) => ({
          item_id: item.item_id,
          quantity_approved: item.decision === 'approve' ? item.quantity_approved : 0,
          status: item.decision === 'approve' ? ('approved' as const) : ('rejected' as const),
          alternative_notes: item.decision === 'reject'
            ? item.rejection_reason
            : (item.notes || undefined),
        })),
        storekeeper_notes: storekeeperNotes || undefined,
      };

      await partsRequestsAPI.approve(request.id, approval);
      toast.success('Parts request processed successfully');
      fetchRequest();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to process request'));
      console.error(error);
    } finally {
      setIsApproving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partially_approved':
        return 'bg-blue-100 text-blue-800';
      case 'issued':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'issued':
        return 'text-purple-600';
      case 'used':
        return 'text-blue-600';
      case 'returned':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const decisionSummary = canApprove && request
    ? {
      approved: Object.values(itemApprovals).filter((item: any) => item.decision === 'approve').length,
      rejected: Object.values(itemApprovals).filter((item: any) => item.decision === 'reject').length,
      pending: (request.items || []).length - Object.keys(itemApprovals).length,
    }
    : {
      approved: request?.items.filter((i) => i.status === 'approved' || i.status === 'issued' || i.status === 'used').length || 0,
      rejected: request?.items.filter((i) => i.status === 'rejected').length || 0,
      pending: request?.items.filter((i) => i.status === 'pending').length || 0,
    };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Parts request not found</p>
        <button onClick={() => navigate('/parts/requests')} className="btn-primary mt-4">
          Back to Requests
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
            onClick={() => navigate('/parts/requests')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Request #{request.request_number}
            </h1>
            <p className="text-gray-600 mt-1">Parts Request Details</p>
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
          {request.status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Request Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Job Number</p>
                <p className="text-lg font-semibold text-gray-900">{request.job_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Engineer</p>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <p className="text-lg font-semibold text-gray-900">{request.engineer_name}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Requested On</p>
                <p className="text-gray-900">{formatDateTime(request.created_at)}</p>
              </div>
              {request.approved_at && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Processed On</p>
                  <p className="text-gray-900">{formatDateTime(request.approved_at)}</p>
                  {request.approved_by_name && (
                    <p className="text-sm text-gray-600">by {request.approved_by_name}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <p className="text-sm text-gray-500 mb-2">Reason for Request</p>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900">{request.reason}</p>
              </div>
            </div>

            {request.storekeeper_notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">Storekeeper Notes</p>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-900">{request.storekeeper_notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Parts List */}
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Requested Parts</h2>
            <div className="space-y-4">
              {(request.items || []).map((item: any) => {
                const approval = itemApprovals[item.id];
                const isApproved = canApprove
                  ? approval?.decision === 'approve'
                  : item.status === 'approved' || item.status === 'issued' || item.status === 'used';
                const itemError = itemErrors[item.id];

                return (
                  <div
                    key={item.id}
                    className={`border-2 rounded-lg p-4 ${canApprove
                        ? isApproved
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                        : 'border-gray-200'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-5 w-5 text-gray-400" />
                          <h3 className="font-bold text-gray-900">{item.part_name}</h3>
                          <span className={`text-xs font-medium ${getItemStatusColor(item.status)}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">Part #: {item.part_number}</p>
                      </div>

                      {canApprove && (
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-green-700">
                            <input
                              type="radio"
                              name={`decision-${item.id}`}
                              checked={approval?.decision === 'approve'}
                              onChange={() => handleDecisionChange(item.id, 'approve')}
                              className="h-4 w-4"
                            />
                            Approve
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-red-700">
                            <input
                              type="radio"
                              name={`decision-${item.id}`}
                              checked={approval?.decision === 'reject'}
                              onChange={() => handleDecisionChange(item.id, 'reject')}
                              className="h-4 w-4"
                            />
                            Reject
                          </label>
                        </div>
                      )}
                    </div>

                    {canApprove && itemError?.decision && (
                      <p className="text-sm text-red-600 mb-3">{itemError.decision}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Requested Quantity</p>
                        <p className="font-semibold text-gray-900">{item.quantity_requested}</p>
                      </div>

                      {canApprove && approval?.decision === 'approve' ? (
                        <div>
                          <label className="text-gray-500 block mb-1">Approve Quantity</label>
                          <input
                            type="number"
                            min="1"
                            max={item.quantity_requested}
                            value={approval?.quantity_approved || 0}
                            onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                            className="input w-24"
                          />
                          {itemError?.quantity_approved && (
                            <p className="text-sm text-red-600 mt-1">{itemError.quantity_approved}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          {item.quantity_approved !== undefined && item.quantity_approved > 0 && (
                            <div>
                              <p className="text-gray-500">Approved Quantity</p>
                              <p className="font-semibold text-green-600">{item.quantity_approved}</p>
                            </div>
                          )}
                          {item.quantity_issued !== undefined && item.quantity_issued > 0 && (
                            <div>
                              <p className="text-gray-500">Issued Quantity</p>
                              <p className="font-semibold text-purple-600">{item.quantity_issued}</p>
                            </div>
                          )}
                          {item.quantity_used !== undefined && item.quantity_used > 0 && (
                            <div>
                              <p className="text-gray-500">Used Quantity</p>
                              <p className="font-semibold text-blue-600">{item.quantity_used}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {canApprove && approval?.decision === 'reject' && (
                      <div className="mt-3">
                        <label className="text-sm text-gray-500 block mb-1">
                          Rejection Reason <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          value={approval?.rejection_reason || ''}
                          onChange={(e) => handleRejectionReasonChange(item.id, e.target.value)}
                          rows={3}
                          className="input"
                          placeholder="Explain why this item is rejected (minimum 10 characters)..."
                        />
                        {itemError?.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">{itemError.rejection_reason}</p>
                        )}
                      </div>
                    )}

                    {!canApprove && item.status === 'rejected' && item.alternative_notes && (
                      <div className="mt-3 rounded-lg bg-red-50 p-3">
                        <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                        <p className="mt-1 text-sm text-red-700">{item.alternative_notes}</p>
                      </div>
                    )}

                    {item.notes && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-sm">
                        <p className="text-yellow-900">
                          <strong>Notes:</strong> {item.notes}
                        </p>
                      </div>
                    )}

                    {canApprove && (
                      <div className="mt-3">
                        <label className="text-sm text-gray-500 block mb-1">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={approval?.notes || ''}
                          onChange={(e) => handleNotesChange(item.id, e.target.value)}
                          className="input"
                          placeholder="Add notes for this item..."
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storekeeper Notes Section */}
          {canApprove && (
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Notes</h2>
              <textarea
                value={storekeeperNotes}
                onChange={(e) => setStorekeeperNotes(e.target.value)}
                rows={4}
                className="input"
                placeholder="Add overall notes about this request, alternatives suggested, or any special instructions..."
              />
            </div>
          )}
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Items</span>
                <span className="font-semibold text-gray-900">{(request.items || []).length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Approved</span>
                <span className="font-semibold text-green-600">
                  {decisionSummary.approved}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rejected</span>
                <span className="font-semibold text-red-600">
                  {decisionSummary.rejected}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <span className="font-semibold text-yellow-600">
                  {decisionSummary.pending}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Card */}
          {canApprove && (
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleSubmitApproval}
                  disabled={isApproving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Submit Decision
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-500 bg-gray-50 rounded p-3">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Select approve or reject for each item. Rejection reason is required for rejected items.
                </div>
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Wrench className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">For Job: {request.job_number}</p>
                <p className="text-sm text-blue-800">
                  Engineer {request.engineer_name} needs these parts to complete the repair.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartsRequestDetail;
