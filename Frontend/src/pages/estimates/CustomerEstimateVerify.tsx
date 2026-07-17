import { useState, useEffect } from 'react';
import { Package, Wrench, CheckCircle, AlertCircle } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { customerEstimatesAPI } from '../../api/endpoints';
import type { CustomerEstimate } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getErrorMessage } from '../../utils/apiErrors';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

type ItemApprovalStatus = 'approved' | 'rejected';
type OverallApprovalStatus = 'approved' | 'rejected' | 'partially_approved';

export default function CustomerEstimateVerify() {
  const { estimateNumber } = useParams<{ estimateNumber: string }>();

  const [step, setStep] = useState<'otp' | 'estimate' | 'submitted'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [estimate, setEstimate] = useState<CustomerEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [approvalStatus, setApprovalStatus] = useState<OverallApprovalStatus>('approved');
  const [customerComments, setCustomerComments] = useState('');
  const [itemApprovals, setItemApprovals] = useState<{ item_id: number; approval_status: ItemApprovalStatus; approved_quantity?: number }[]>([]);

  useEffect(() => {
    if (estimate?.items) {
      setItemApprovals(
        estimate.items
          .filter(item => item.id !== undefined)
          .map(item => ({
            item_id: item.id!,
            approval_status: 'approved' as ItemApprovalStatus,
            approved_quantity: item.quantity
          }))
      );
    }
  }, [estimate]);

  useEffect(() => {
    if (itemApprovals.length > 0) {
      const hasApproved = itemApprovals.some(i => i.approval_status === 'approved');
      const hasRejected = itemApprovals.some(i => i.approval_status === 'rejected');
      const hasPartialQuantity = estimate?.items?.some(item => {
        const approval = itemApprovals.find(ia => ia.item_id === item.id);
        return approval?.approval_status === 'approved' && approval.approved_quantity !== undefined && approval.approved_quantity < item.quantity;
      });

      if ((hasApproved && hasRejected) || hasPartialQuantity) {
        setApprovalStatus('partially_approved');
      } else if (hasRejected && !hasApproved) {
        setApprovalStatus('rejected');
      } else {
        setApprovalStatus('approved');
      }
    }
  }, [itemApprovals, estimate]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateNumber || !otpCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await customerEstimatesAPI.verifyOTP({
        estimate_number: estimateNumber,
        otp_code: otpCode.trim()
      });

      if (response.success && response.estimate) {
        setEstimate(response.estimate);
        setStep('estimate');
      } else {
        setError(response.message || 'OTP verification failed');
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to verify OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleItemApprovalChange = (itemId: number, status: ItemApprovalStatus) => {
    setItemApprovals(prev =>
      prev.map(item =>
        item.item_id === itemId ? { ...item, approval_status: status } : item
      )
    );
  };

  const handleItemQuantityChange = (itemId: number, qty: number) => {
    setItemApprovals(prev =>
      prev.map(item =>
        item.item_id === itemId ? { ...item, approved_quantity: qty } : item
      )
    );
  };

  const handleApproveAll = () => {
    setItemApprovals(prev => prev.map(item => {
      const originalItem = estimate?.items?.find(i => i.id === item.item_id);
      return { ...item, approval_status: 'approved', approved_quantity: originalItem?.quantity };
    }));
  };

  const handleRejectAll = () => {
    setItemApprovals(prev => prev.map(item => ({ ...item, approval_status: 'rejected', approved_quantity: 0 })));
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!estimateNumber || !estimate) return;

    setSubmitting(true);
    setError('');

    try {
      await customerEstimatesAPI.approve(estimateNumber, {
        overall_status: approvalStatus,
        customer_comments: customerComments,
        items: itemApprovals
      });

      setStep('submitted');
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to submit response'));
    } finally {
      setSubmitting(false);
    }
  };

  const approvedAmount = estimate?.items
    .filter(item => itemApprovals.find(ia => ia.item_id === item.id)?.approval_status === 'approved')
    .reduce((sum, item) => {
      const approvedQty = itemApprovals.find(ia => ia.item_id === item.id)?.approved_quantity ?? item.quantity;
      return sum + (item.unit_price * approvedQty);
    }, 0) ?? 0;

  const rejectedAmount = (estimate?.total_amount || 0) - approvedAmount;

  // ─── OTP Step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Verify Your Identity</h1>
            <p className="text-gray-500 mt-1 text-sm">Enter the OTP sent to your WhatsApp</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimate Number</label>
              <input
                type="text"
                value={estimateNumber || ''}
                disabled
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP Code</label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                maxLength={6}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-3xl tracking-[0.5em] font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Verifying...</span>
                </>
              ) : (
                'View My Estimate'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Submitted Step ──────────────────────────────────────────────────────────
  if (step === 'submitted') {
    const isApproved = approvalStatus === 'approved';
    const isRejected = approvalStatus === 'rejected';
    const isPartial = approvalStatus === 'partially_approved';

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${isApproved ? 'bg-green-100' : isRejected ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isApproved && (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isRejected && (
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {isPartial && (
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">Response Submitted!</h1>

          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {isApproved && 'Thank you for approving the estimate. Our team will begin working on your repair shortly.'}
            {isRejected && 'We have received your response. Our team will contact you to discuss alternatives.'}
            {isPartial && 'Thank you for your response. Our team will proceed with the approved items and contact you about the rest.'}
          </p>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${isApproved ? 'bg-green-100 text-green-800' : isRejected ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
            {isApproved && '✓ Fully Approved'}
            {isRejected && '✗ Rejected'}
            {isPartial && '⚠ Partially Approved'}
          </div>

          <p className="text-xs text-gray-400 mt-8">You may close this page now.</p>
        </div>
      </div>
    );
  }

  // ─── Estimate View & Approval Step ──────────────────────────────────────────
  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Repair Estimate #{estimate.estimate_number}
            </h1>
            <p className="text-gray-600 mt-1">Job #{estimate.job_number} • {formatDateTime(estimate.created_at)}</p>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            AWAITING RESPONSE
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Details & Items */}
          <div className="lg:col-span-2 space-y-6">

            {/* Estimate Info Card */}
            {estimate.special_notes && (
              <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Note from our team</h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-900">{estimate.special_notes}</p>
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Estimate Items</h2>
                <div className="flex gap-4">
                  <button onClick={handleApproveAll} className="text-sm text-green-700 font-bold hover:underline">Approve All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={handleRejectAll} className="text-sm text-red-700 font-bold hover:underline">Reject All</button>
                </div>
              </div>

              <div className="space-y-4">
                {(estimate.items || []).filter(item => item.id !== undefined).map((item) => {
                  const itemId = item.id!;
                  const itemApproval = itemApprovals.find(ia => ia.item_id === itemId);
                  const isApproved = itemApproval?.approval_status === 'approved';
                  const isRejected = itemApproval?.approval_status === 'rejected';

                  return (
                    <div
                      key={itemId}
                      className={`border-2 rounded-lg p-4 transition-all duration-200 ${isApproved
                        ? 'border-green-200 bg-green-50'
                        : isRejected
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.item_type === 'part' ? (
                              <Package className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Wrench className="h-5 w-5 text-gray-400" />
                            )}
                            <h3 className={`font-bold text-lg ${isRejected ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {item.description}
                            </h3>
                          </div>
                          {item.item_comments && (
                            <p className="text-sm text-gray-600 mb-2">{item.item_comments}</p>
                          )}
                          <p className={`text-lg font-bold ${isApproved ? 'text-green-700' : isRejected ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatCurrency(item.unit_price * (isApproved ? (itemApproval?.approved_quantity ?? item.quantity) : isRejected ? 0 : item.quantity))}
                            <span className="text-xs font-normal text-gray-500 ml-2">
                              (Qty {isApproved ? (itemApproval?.approved_quantity ?? item.quantity) : isRejected ? 0 : item.quantity} × {formatCurrency((item.unit_price || 0))})
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-col sm:items-end gap-3">
                          <div className="flex items-center gap-4 sm:shrink-0 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-medium text-green-700 cursor-pointer">
                              <input
                                type="radio"
                                name={`decision-${itemId}`}
                                checked={isApproved}
                                onChange={() => handleItemApprovalChange(itemId, 'approved')}
                                className="h-4 w-4 text-green-600 focus:ring-green-500"
                              />
                              Approve
                            </label>
                            <label className="flex items-center gap-2 text-sm font-medium text-red-700 cursor-pointer">
                              <input
                                type="radio"
                                name={`decision-${itemId}`}
                                checked={isRejected}
                                onChange={() => handleItemApprovalChange(itemId, 'rejected')}
                                className="h-4 w-4 text-red-600 focus:ring-red-500"
                              />
                              Reject
                            </label>
                          </div>
                          
                          {isApproved && item.quantity > 1 && (
                            <div className="flex items-center gap-2 bg-green-50 p-2 rounded border border-green-200">
                              <label className="text-xs font-medium text-green-800">Approved Qty:</label>
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={itemApproval?.approved_quantity ?? item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val >= 1 && val <= item.quantity) {
                                    handleItemQuantityChange(itemId, val);
                                  }
                                }}
                                className="w-16 px-2 py-1 text-sm border border-green-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                              />
                              <span className="text-xs text-green-700">of {item.quantity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments Card */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Comments</h2>
              <textarea
                value={customerComments}
                onChange={(e) => setCustomerComments(e.target.value)}
                placeholder="Any questions or notes for our team..."
                rows={4}
                className="input"
              />
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Response Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Items</span>
                  <span className="font-semibold text-gray-900">{(estimate.items || []).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-semibold text-green-600">
                    {itemApprovals.filter(i => i.approval_status === 'approved').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rejected</span>
                  <span className="font-semibold text-red-600">
                    {itemApprovals.filter(i => i.approval_status === 'rejected').length}
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Original Total</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(estimate.total_amount)}</span>
                  </div>
                  {rejectedAmount > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-600 text-sm">Rejected Amount</span>
                      <span className="font-semibold text-red-600 text-sm">-{formatCurrency(rejectedAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className="text-gray-900 font-bold">New Total</span>
                    <span className="font-bold text-2xl text-green-700">{formatCurrency(approvedAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 mb-6 border border-gray-200">
                <span className="text-sm font-semibold text-gray-700">Status</span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                  approvalStatus === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                  {approvalStatus === 'approved' && '✓ All Approved'}
                  {approvalStatus === 'rejected' && '✗ All Rejected'}
                  {approvalStatus === 'partially_approved' && '⚠ Partial'}
                </span>
              </div>

              <button
                onClick={handleSubmitResponse}
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Submit Response
                  </>
                )}
              </button>
            </div>

            <div className="card bg-amber-50 border-amber-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Select approve or reject for each item. Once submitted, our team will proceed with the approved items.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}