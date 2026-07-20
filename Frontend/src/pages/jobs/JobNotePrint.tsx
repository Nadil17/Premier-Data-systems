import React from 'react';
import type { Job } from '../../types';

interface JobNotePrintProps {
  job: Job;
}

const JobNotePrint: React.FC<JobNotePrintProps> = ({ job }) => {
  const currentDate = new Date();
  const formattedDateTime = currentDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayCustomerName = job.customer_name?.trim() || job.customer?.name?.trim() || job.reported_by?.trim() || 'Unknown';
  const displayCustomerAddress = job.customer?.address?.trim() || '';

  return (
    <div className="hidden print:block w-[210mm] mx-auto bg-white text-black font-sans text-sm py-4 px-6">
      {/* Top bar */}
      <div className="flex justify-between items-center text-xs text-gray-700 mb-4">
        <span className="w-1/3">{formattedDateTime}</span>
        <span className="w-1/3 text-center">Smart Dashboard - ERP</span>
        <span className="w-1/3"></span>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-start mb-2">
        <div className="w-1/2">
          <img src="/logo.jpg" alt="Premier Data Systems Logo" className="h-16 object-contain" />
        </div>
        <div className="w-1/2 text-right text-[13px] leading-snug">
          <p>No. 17A, Mudali Mawatha, Kohuwala, Sri Lanka</p>
          <p>Tel: +94 11 2815015</p>
          <p>Fax: 94 11 7396803</p>
          <p>Email: support@premier.lk</p>
          <p>Web:</p>
        </div>
      </div>

      <div className="border-t-[2px] border-black my-4"></div>

      {/* Job Info */}
      <div className="flex flex-col gap-6 text-[13px]">
        {/* Row 1 */}
        <div className="flex justify-between">
          <div className="flex flex-1 pr-4">
            <span className="font-bold w-24 flex-shrink-0">Cust:</span>
            <span>
              {displayCustomerName}
              {displayCustomerAddress && ` (${displayCustomerAddress})`}
            </span>
          </div>
          <div className="flex justify-end w-48 flex-shrink-0">
            <span className="font-bold mr-6">Date:</span>
            <span className="whitespace-nowrap">
              {job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : ''}
            </span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex justify-between">
          <div className="flex flex-1 pr-4">
            <span className="font-bold w-24 flex-shrink-0">Model:</span>
            <span className="line-clamp-1">{job.machine_model || job.model_name || '-'}</span>
          </div>
          <div className="flex justify-start w-64 flex-shrink-0">
            <span className="font-bold mr-6">Serial No:</span>
            <span className="truncate">{job.serial_number || '-'}</span>
          </div>
          <div className="flex justify-end w-64 flex-shrink-0">
            <span className="font-bold mr-6">Job No:</span>
            <span className="whitespace-nowrap">{job.job_number}</span>
          </div>
        </div>

        {/* Row 3 */}
        <div className="flex">
          <span className="font-bold w-24 flex-shrink-0">Fault:</span>
          <span>{job.fault_description || '-'}</span>
        </div>

        {/* Row 4 */}
        <div className="flex">
          <span className="font-bold w-24 flex-shrink-0 whitespace-nowrap">Item Taken:</span>
          <span>
            {job.items && job.items.length > 0
              ? job.items.map((i) => `${i.item_name} (${i.quantity.toString().padStart(2, '0')})`).join(', ')
              : '-'}
          </span>
        </div>
      </div>

      <div className="border-t-[2px] border-black my-6"></div>

      {/* Footer Area */}
      <div className="flex justify-between items-start text-[13px]">
        {/* Left Side */}
        <div className="w-[55%] pr-8">
          <div className="space-y-3 mb-16">
            <p>* This receipt must produce for collection.</p>
            <p>* NO responsibility for equipment not collected within one month.</p>
            <p>* If the equipment is taken without repairs after estimation an inspection charge of Rs. 3000 will be charged.</p>
          </div>
          
          <div className="space-y-3 pt-6">
            <p>{job.assigned_to_name || '..........................................................'}</p>
            <p className="font-bold">Premier Data Systems Pvt Ltd</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="w-[45%]">
          <div className="mb-10">
            <p className="mb-2">Customer</p>
            <p>Signature................................................................</p>
          </div>
          
          <div>
            <p className="font-bold mb-3">Handed Over To</p>
            <p className="mb-8">Mr/Ms/Mrs....................................................................</p>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="mb-3">Signature</p>
                <p>.......................................</p>
              </div>
              <div className="text-right">
                <p className="mb-3 text-left">Date</p>
                <p>.......................................</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobNotePrint;
