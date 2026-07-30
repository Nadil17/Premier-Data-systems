import React from 'react';
import type { CustomerEstimate } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CustomerEstimatePrintProps {
  estimate: CustomerEstimate;
}

const CustomerEstimatePrint: React.FC<CustomerEstimatePrintProps> = ({ estimate }) => {
  const currentDate = new Date();
  const formattedDateTime = currentDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayCustomerName = estimate.customer_name?.trim() || estimate.job?.customer?.name?.trim() || 'Unknown';
  const displayCustomerAddress = estimate.job?.customer?.address?.trim() || '';

  const subtotal = estimate.subtotal ?? estimate.total_amount;
  const taxAmount = estimate.tax_amount ?? 0;
  const hasTax = estimate.include_tax || taxAmount > 0;

  const accountantName = estimate.accountant_name || estimate.accountant?.full_name || 'Lahiru .';

  return (
    <div className="hidden print:block w-[210mm] mx-auto bg-white text-black font-sans text-xs py-4 px-6 leading-tight">
      {/* Top bar */}
      <div className="flex justify-between items-center text-[10px] text-gray-600 mb-3">
        <span className="w-1/3">{formattedDateTime}</span>
        <span className="w-1/3 text-center font-medium">Smart Dashboard - ERP</span>
        <span className="w-1/3"></span>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-start mb-2">
        <div className="w-1/2">
          <img src="/logo.jpg" alt="Premier Data Systems Logo" className="h-14 object-contain" />
        </div>
        <div className="w-1/2 text-right text-[11px] leading-snug">
          <h1 className="text-xl font-bold text-[#25285c] mb-1">Estimate</h1>
          <p>No. 17A, Mudali Mawatha, Kohuwala, Sri Lanka</p>
          <p>Tel: +94 11 2815015</p>
          <p>Fax: 94 11 7396803</p>
          <p>Email: support@premier.lk</p>
          <p>Web:</p>
        </div>
      </div>

      <div className="border-t-[1.5px] border-black my-3"></div>

      {/* Metadata Info */}
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] mb-4">
        <div>
          <span className="font-bold">Cust: </span>
          <span>{displayCustomerName}{displayCustomerAddress && ` (${displayCustomerAddress})`}</span>
        </div>
        <div>
          <span className="font-bold">Date: </span>
          <span>{estimate.created_at ? new Date(estimate.created_at).toISOString().split('T')[0] : ''}</span>
        </div>
        <div>
          <span className="font-bold">Model: </span>
          <span>{estimate.job?.machine_model || '-'}</span>
        </div>
        <div>
          <span className="font-bold">Serial No: </span>
          <span>{estimate.job?.serial_number || '-'}</span>
        </div>
        <div>
          <span className="font-bold">Estimate No: </span>
          <span className="font-semibold">{estimate.estimate_number}</span>
        </div>
        <div>
          <span className="font-bold">Job No: </span>
          <span>{estimate.job_number || estimate.job?.job_number || '-'}</span>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4">
        <table className="w-full border-collapse border border-gray-300 text-[11px]">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-2 py-1.5 text-left font-bold">Type</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left font-bold">Description</th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-bold w-12">Qty</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right font-bold w-24">Unit Price (LKR)</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right font-bold w-24">Total (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {(estimate.items || []).map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="border border-gray-300 px-2 py-1.5 capitalize">{item.item_type || 'Other'}</td>
                <td className="border border-gray-300 px-2 py-1.5">{item.description}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCurrency(item.unit_price || 0)}</td>
                <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCurrency(item.total_price || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {hasTax && taxAmount > 0 && (
              <>
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">Subtotal:</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(subtotal)}</td>
                </tr>
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={4} className="border border-gray-300 px-2 py-1 text-right">VAT (18%):</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(taxAmount)}</td>
                </tr>
              </>
            )}
            <tr className="bg-gray-100 font-bold">
              <td colSpan={4} className="border border-gray-300 px-2 py-1.5 text-right">Total Amount:</td>
              <td className="border border-gray-300 px-2 py-1.5 text-right">{formatCurrency(estimate.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Special Notes */}
      {estimate.special_notes && (
        <div className="mb-4 text-[11px]">
          <span className="font-bold">Special Notes: </span>
          <span>{estimate.special_notes}</span>
        </div>
      )}

      {/* Footer Notes (Terms & Conditions) */}
      <div className="space-y-1 text-[10.5px] text-gray-900 mb-6 border-t border-gray-200 pt-3">
        <p>* This estimate is valid only for a period of 14 Days.</p>
        <p>* Payment should be made on completion of job.</p>
        <p>* Spare parts marked with * mark are not available and need 2-3 weeks after confirmation.</p>
        <p>* We shall be pleased to receive your confirmation in writing in order to commence with the work.</p>
        <p>* We shall not be responsible for any item not collected by you after repair for any loss or damage after a period of 01 month,after which will be dispose off the whatever manner we deem suitable and practical.</p>
        <p>* If the equipment is taken without repairs after estimation an inspection charge of Rs. 3000 will be charged.</p>
      </div>

      {/* Signature section */}
      <div className="mb-6 text-[11px]">
        <p>{accountantName}</p>
        <p className="font-bold">Premier Data Systems Pvt Ltd</p>
      </div>

      {/* Red Warning */}
      <div className="text-center font-bold text-red-600 text-[11px] uppercase tracking-wider">
        THIS COMPUTER GENERATE EMAIL DOES NOT CARRY A SIGNATURE.
      </div>
    </div>
  );
};

export default CustomerEstimatePrint;
