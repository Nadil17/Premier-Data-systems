import React from 'react';
import type { Job, CustomerEstimate, PartsRequest, PartsHandoverResponse } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { Cpu, User, Package, Wrench, Box, Truck, FileText, DollarSign, Tag, Calendar } from 'lucide-react';

interface PrintableJobDetailProps {
  job: Job;
  customerEstimates: CustomerEstimate[];
  partsRequests: PartsRequest[];
  handovers: PartsHandoverResponse[];
}

const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <tr>
      <td className="py-1 font-semibold text-gray-600 w-36 align-top">{label}:</td>
      <td className="py-1 align-top">{value}</td>
    </tr>
  ) : null;

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <h3 className="text-base font-bold border-b-2 border-gray-800 pb-2 mb-3 flex items-center gap-2 uppercase tracking-wide">
    {icon} {title}
  </h3>
);

const PrintableJobDetail: React.FC<PrintableJobDetailProps> = ({
  job,
  customerEstimates,
  partsRequests,
  handovers,
}) => {
  const displayCustomerName = job.customer_name?.trim() || job.customer?.name?.trim() || job.reported_by?.trim() || 'Unknown';
  const displayCustomerPhone = job.customer_phone?.trim() || job.customer?.phone_1?.trim() || job.additional_phone?.trim() || '';

  const approvedEstimates = customerEstimates.filter(
    e => e.approval_status === 'approved' || e.approval_status === 'partially_approved'
  );

  const allPartsIssued = partsRequests.flatMap(pr =>
    (pr.items || []).filter(i => i.status === 'issued' || i.status === 'used')
  );

  return (
    <div className="hidden print:block w-full max-w-[210mm] mx-auto bg-white text-black text-sm p-4 sm:p-0">

      {/* ── Header ── */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Premier Data Systems</h1>
          <h2 className="text-xl font-semibold text-gray-700">Job Detail Report</h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">Job #{job.job_number}</p>
          <p className="text-gray-600 mt-1">Date: {formatDate(job.created_at)}</p>
          <p className="text-gray-600">
            Status: <span className="font-semibold uppercase">{job.status.replace(/_/g, ' ')}</span>
          </p>
        </div>
      </div>

      {/* ── Row 1: Customer + Machine ── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Customer */}
        <div className="break-inside-avoid border border-gray-300 rounded-lg p-4">
          <h3 className="text-base font-bold border-b border-gray-200 pb-2 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <User className="w-4 h-4" /> Customer Information
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Name" value={displayCustomerName} />
              <Row label="Phone" value={displayCustomerPhone} />
              <Row label="Reported By" value={job.reported_by} />
              <Row label="Alt. Phone" value={job.additional_phone} />
            </tbody>
          </table>
        </div>

        {/* Machine */}
        <div className="break-inside-avoid border border-gray-300 rounded-lg p-4">
          <h3 className="text-base font-bold border-b border-gray-200 pb-2 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Cpu className="w-4 h-4" /> Machine Details
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Brand" value={job.brand_name} />
              <Row label="Model" value={job?.machine_model || ""} />
              <Row label="Category" value={job.machine_category_name} />
              <Row label="Serial No." value={job.serial_number || 'N/A'} />
              <Row label="Job Type" value={job.job_type.replace(/_/g, ' ')} />
              <Row label="Job Category" value={job.job_category} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 2: Assignment + Timeline ── */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Assignment */}
        <div className="break-inside-avoid border border-gray-300 rounded-lg p-4">
          <h3 className="text-base font-bold border-b border-gray-200 pb-2 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Tag className="w-4 h-4" /> Assignment
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Assigned To" value={job.assigned_to_name} />
              <Row label="Assigned At" value={job.assigned_at ? formatDateTime(job.assigned_at) : undefined} />
            </tbody>
          </table>
          {!job.assigned_to_name && (
            <p className="text-gray-500 italic text-sm">Not yet assigned</p>
          )}
        </div>

        {/* Timeline */}
        <div className="break-inside-avoid border border-gray-300 rounded-lg p-4">
          <h3 className="text-base font-bold border-b border-gray-200 pb-2 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <Calendar className="w-4 h-4" /> Timeline
          </h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Created" value={formatDateTime(job.created_at)} />
              <Row label="Completed" value={job.completed_at ? formatDateTime(job.completed_at) : undefined} />
              <Row label="Delivered" value={job.delivered_at ? formatDateTime(job.delivered_at) : undefined} />
              <Row label="Last Updated" value={job.updated_at ? formatDateTime(job.updated_at) : undefined} />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Fault Description ── */}
      <div className="break-inside-avoid border border-gray-300 rounded-lg p-4 mb-6">
        <SectionHeader icon={<FileText className="w-4 h-4" />} title="Fault Description" />
        <p className="text-gray-800 whitespace-pre-line">{job.fault_description}</p>
        {job.remarks && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <h4 className="font-semibold text-gray-600 mb-1">Remarks:</h4>
            <p className="text-gray-800 whitespace-pre-line">{job.remarks}</p>
          </div>
        )}
      </div>

      {/* ── Items Taken From Customer ── */}
      {job.items && (job.items || []).length > 0 && (
        <div className="break-inside-avoid mb-6">
          <SectionHeader icon={<Box className="w-4 h-4" />} title="Items Taken From Customer" />
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Item</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-16">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-28">Status</th>
              </tr>
            </thead>
            <tbody>
              {(job.items || []).map(item => (
                <tr key={item.id} className="border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-2">{item.item_name}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                    {item.returned
                      ? <span className="text-green-700">Returned</span>
                      : <span className="text-orange-600">Held</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Parts Used / Issued ── */}
      {allPartsIssued.length > 0 && (
        <div className="break-inside-avoid mb-6">
          <SectionHeader icon={<Package className="w-4 h-4" />} title="Parts Used" />
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Part Name</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-16">Qty</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {allPartsIssued.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-2">{item.part_name || item.part_number || `Item #${item.id}`}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity_requested}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center capitalize">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Parts Handovers ── */}
      {handovers && handovers.length > 0 && (
        <div className="break-inside-avoid mb-6">
          <SectionHeader icon={<Truck className="w-4 h-4" />} title="Parts Handovers" />
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Handover #</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">From</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">To</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-24">Status</th>
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {handovers.map(h => (
                <tr key={h.id} className="border-b border-gray-200">
                  <td className="border border-gray-300 px-3 py-2">#{h.id}</td>
                  <td className="border border-gray-300 px-3 py-2">{h.from_user_name || '—'}</td>
                  <td className="border border-gray-300 px-3 py-2">{h.to_user_name || '—'}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center capitalize">{h.status?.replace(/_/g, ' ')}</td>
                  <td className="border border-gray-300 px-3 py-2">{formatDate(h.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Repair Details ── */}
      {(job.work_done || job.tests_performed || job.repair_notes || job.warranty_details) && (
        <div className="break-inside-avoid mb-6">
          <SectionHeader icon={<Wrench className="w-4 h-4" />} title="Repair Details" />
          <div className="space-y-3 border border-gray-300 rounded-lg p-4">
            {job.work_done && (
              <div>
                <span className="font-semibold block text-gray-700">Work Done:</span>
                <p className="whitespace-pre-line">{job.work_done}</p>
              </div>
            )}
            {job.tests_performed && (
              <div>
                <span className="font-semibold block text-gray-700">Tests Performed:</span>
                <p className="whitespace-pre-line">{job.tests_performed}</p>
              </div>
            )}
            {job.repair_notes && (
              <div>
                <span className="font-semibold block text-gray-700">Repair Notes:</span>
                <p className="whitespace-pre-line">{job.repair_notes}</p>
              </div>
            )}
            {job.warranty_details && (
              <div>
                <span className="font-semibold block text-gray-700">Warranty Details:</span>
                <p className="whitespace-pre-line">{job.warranty_details}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Approved Customer Estimates ── */}
      {approvedEstimates.length > 0 && (
        <div className="break-inside-avoid mb-6">
          <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Approved Customer Estimate" />
          {approvedEstimates.map(estimate => {
            const approvedItems = (estimate.items || []).filter(i => i.approval_status === 'approved');
            if (approvedItems.length === 0) return null;
            const total = approvedItems.reduce((sum, item) => sum + item.total_price, 0);

            return (
              <div key={estimate.id} className="mb-4">
                <p className="font-semibold text-gray-700 mb-2">
                  Estimate #{estimate.estimate_number}
                  <span className="ml-3 text-xs font-normal text-gray-500 uppercase">{estimate.approval_status}</span>
                </p>
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Description</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold w-16">Qty</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-28">Unit Price</th>
                      <th className="border border-gray-300 px-3 py-2 text-right font-semibold w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="border border-gray-300 px-3 py-2">{item.description}</td>
                        <td className="border border-gray-300 px-3 py-2 text-center">{item.quantity}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">${(item.unit_price ?? item.total_price / item.quantity).toFixed(2)}</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">${item.total_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td colSpan={3} className="border border-gray-300 px-3 py-2 text-right">Total:</td>
                      <td className="border border-gray-300 px-3 py-2 text-right">${total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Signatures ── */}
      <div className="mt-10 grid grid-cols-2 gap-12 break-inside-avoid">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-10">
            <p className="font-semibold text-gray-700">Customer Signature</p>
            <p className="text-xs text-gray-500 mt-1">{displayCustomerName}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-10">
            <p className="font-semibold text-gray-700">Authorized Signature</p>
            <p className="text-xs text-gray-500 mt-1">Premier Data Systems</p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-8 pt-4 border-t-2 border-gray-800 text-center text-xs text-gray-500 break-inside-avoid">
        <p>This is a computer-generated document.</p>
        <p>Printed on: {formatDateTime(new Date().toISOString())}</p>
      </div>

    </div>
  );
};

export default PrintableJobDetail;
