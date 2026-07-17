import React, { useState } from 'react';
import { X, CheckCircle, FileText, Package, Wrench, DollarSign, Receipt, AlertCircle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Job, PartsRequest, CustomerEstimate } from '../../types';

interface AccountantReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (invoiceNumber: string) => Promise<void>;
  job: Job;
  partsRequests: PartsRequest[];
  customerEstimates: CustomerEstimate[];
}

const AccountantReviewModal: React.FC<AccountantReviewModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  job,
  partsRequests,
  customerEstimates,
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceError, setInvoiceError] = useState('');

  if (!isOpen) return null;

  // Calculate total parts cost
  const calculatePartsCost = () => {
    let total = 0;
    partsRequests.forEach(request => {
      request.items
        .filter(item => item.status === 'used')
        .forEach(item => {
          const estimate = customerEstimates.find(e =>
            e.items.some(ei =>
              ei.item_type === 'part' &&
              ei.description.toLowerCase().includes(item.part_name?.toLowerCase() || '')
            )
          );
          if (estimate) {
            const estimateItem = (estimate.items || []).find(ei =>
              ei.item_type === 'part' &&
              ei.description.toLowerCase().includes(item.part_name?.toLowerCase() || '')
            );
            if (estimateItem) total += estimateItem.total_price;
          }
        });
    });
    return total;
  };

  const calculateServicesCost = () => {
    let total = 0;
    customerEstimates.forEach(estimate => {
      estimate.items
        .filter(item => item.item_type === 'service' && item.approval_status === 'approved')
        .forEach(item => { total += item.total_price; });
    });
    return total;
  };

  const partsCost = calculatePartsCost();
  const servicesCost = calculateServicesCost();
  const totalCost = partsCost + servicesCost;

  const usedParts = partsRequests.flatMap(request =>
    request.items
      .filter(item => item.status === 'used')
      .map(item => ({
        name: item.part_name || 'Unknown Part',
        quantity: item.quantity_used || 0,
        requestNumber: request.request_number,
      }))
  );

  const approvedServices = customerEstimates.flatMap(estimate =>
    estimate.items
      .filter(item => item.item_type === 'service' && item.approval_status === 'approved')
      .map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
      }))
  );

  const handleApprove = async () => {
    // Validate invoice number
    if (!invoiceNumber.trim()) {
      setInvoiceError('Invoice number is required before approving');
      return;
    }
    setInvoiceError('');
    setIsApproving(true);
    try {
      await onApprove(invoiceNumber.trim());
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-700 to-purple-900">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Accountant Review</h2>
              <p className="text-purple-200 text-sm mt-0.5">
                Job {job.job_number} · Review before marking Ready for Delivery
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[calc(100vh-18rem)] overflow-y-auto">

          {/* ── Invoice Number (prominent, top) ──────────────────────────── */}
          <div className={`rounded-xl border-2 p-5 ${invoiceError ? 'border-red-400 bg-red-50' : 'border-purple-300 bg-purple-50'}`}>
            <div className="flex items-start gap-3">
              <Receipt className={`h-6 w-6 mt-0.5 shrink-0 ${invoiceError ? 'text-red-600' : 'text-purple-600'}`} />
              <div className="flex-1">
                <label className="block text-sm font-bold text-gray-800 mb-1">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-3">
                  Assign an invoice number before approving. This will be saved with the job and cannot be changed afterward.
                </p>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => { setInvoiceNumber(e.target.value); setInvoiceError(''); }}
                  placeholder="e.g. INV-2024-0001"
                  className={`w-full border-2 rounded-xl px-4 py-3 text-base font-semibold tracking-wide focus:outline-none transition-colors ${invoiceError
                      ? 'border-red-400 focus:border-red-500 bg-white'
                      : 'border-purple-300 focus:border-purple-600 bg-white'
                    }`}
                  onKeyDown={e => e.key === 'Enter' && handleApprove()}
                />
                {invoiceError && (
                  <div className="flex items-center gap-2 mt-2 text-red-600 text-sm font-medium">
                    <AlertCircle className="h-4 w-4" />
                    {invoiceError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Job Overview ─────────────────────────────────────────────── */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 mb-3">Job Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Job Number', value: job.job_number },
                { label: 'Customer', value: job.customer_name || 'N/A' },
                { label: 'Machine', value: (job?.machine_model || "") },
                { label: 'Serial No.', value: job.serial_number || 'N/A' },
                { label: 'Completed', value: job.completed_at ? formatDate(job.completed_at) : 'N/A' },
                { label: 'Engineer', value: job.assigned_to_name || 'N/A' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Parts Used ───────────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-gray-200">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="font-bold text-gray-900">Parts Used</h3>
              <span className="ml-auto text-sm font-semibold text-blue-700">${partsCost.toFixed(2)}</span>
            </div>
            {usedParts.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-4 font-medium text-gray-700">Part Name</th>
                    <th className="text-center py-2 px-4 font-medium text-gray-700">Qty Used</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-700">Request #</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usedParts.map((part, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-900">{part.name}</td>
                      <td className="py-2 px-4 text-center text-gray-900">{part.quantity}</td>
                      <td className="py-2 px-4 text-gray-500 text-xs">{part.requestNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 px-4 py-3">No parts were used for this job.</p>
            )}
          </div>

          {/* ── Services ─────────────────────────────────────────────────── */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-gray-200">
              <Wrench className="h-5 w-5 text-green-600" />
              <h3 className="font-bold text-gray-900">Services Performed</h3>
              <span className="ml-auto text-sm font-semibold text-green-700">${servicesCost.toFixed(2)}</span>
            </div>
            {approvedServices.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 px-4 font-medium text-gray-700">Description</th>
                    <th className="text-center py-2 px-4 font-medium text-gray-700">Qty</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-700">Unit Price</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {approvedServices.map((svc, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-900">{svc.description}</td>
                      <td className="py-2 px-4 text-center text-gray-900">{svc.quantity}</td>
                      <td className="py-2 px-4 text-right text-gray-900">${(svc.unitPrice || 0).toFixed(2)}</td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">${svc.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-500 px-4 py-3">No approved services found.</p>
            )}
          </div>

          {/* ── Work Details ─────────────────────────────────────────────── */}
          {(job.work_done || job.tests_performed || job.repair_notes || job.warranty_details) && (
            <div className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-bold text-gray-900 mb-3">Work Details</h3>
              <div className="space-y-3">
                {job.work_done && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Work Done</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{job.work_done}</p>
                  </div>
                )}
                {job.tests_performed && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tests Performed</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{job.tests_performed}</p>
                  </div>
                )}
                {job.repair_notes && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Repair Notes</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{job.repair_notes}</p>
                  </div>
                )}
                {job.warranty_details && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Warranty Details</p>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{job.warranty_details}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Total Cost Summary ───────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-5 border-2 border-purple-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <h3 className="font-bold text-gray-900">Total Repair Cost</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Parts Cost:</span>
                <span className="font-medium text-gray-900">${partsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Services Cost:</span>
                <span className="font-medium text-gray-900">${servicesCost.toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-purple-200 pt-3 mt-2 flex justify-between">
                <span className="text-base font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-purple-700">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {invoiceNumber.trim() ? (
              <span className="flex items-center gap-2 text-purple-700 font-medium">
                <Receipt className="h-4 w-4" />
                Invoice: <strong>{invoiceNumber.trim()}</strong>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                Enter an invoice number to proceed
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={isApproving}>
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={isApproving || !invoiceNumber.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="h-5 w-5" />
              {isApproving ? 'Approving...' : 'Approve & Mark Ready for Delivery'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AccountantReviewModal;
