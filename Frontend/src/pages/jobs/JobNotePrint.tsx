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
    <>
      <style>{`
        @media print {
          @page { 
            size: A5 portrait; 
            margin: 10mm; 
          }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
      `}</style>
      <div className="hidden print:block w-[128mm] mx-auto bg-white text-black font-sans text-xs py-2 px-2">
        {/* Top bar */}
        <div className="flex justify-between items-center text-[10px] text-gray-700 mb-2">
          <span className="w-1/2">{formattedDateTime}</span>
          <span className="w-1/2 text-right"></span>
        </div>

        {/* Header Info */}
        <div className="flex justify-between items-start mb-2">
          <div className="w-1/2">
            <img src="/logo.jpg" alt="Premier Data Systems Logo" className="h-10 object-contain" />
          </div>
          <div className="w-1/2 text-right text-[10px] leading-snug">
            <p>No. 17A, Mudali Mawatha, Kohuwala, Sri Lanka</p>
            <p>Tel: +94 11 2815015</p>
            <p>Fax: 94 11 7396803</p>
            <p>Email: support@premier.lk</p>
          </div>
        </div>

        <div className="border-t border-black my-2"></div>

        {/* Job Info */}
        <div className="flex flex-col gap-3 text-[11px]">
          {/* Row 1 */}
          <div className="flex justify-between gap-2">
            <div className="flex flex-1">
              <span className="font-bold w-12 flex-shrink-0">Cust:</span>
              <span className="line-clamp-2">
                {displayCustomerName}
                {(job.customer?.category === 'company' || job.customer?.category === 'dealer') && job.customer?.company_name && ` - ${job.customer.company_name}`}
                {displayCustomerAddress && ` (${displayCustomerAddress})`}
              </span>
            </div>
            <div className="flex justify-end w-28 flex-shrink-0">
              <span className="font-bold mr-2">Date:</span>
              <span className="whitespace-nowrap">
                {job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : ''}
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
            <div className="flex flex-1">
              <span className="font-bold w-12 flex-shrink-0">Model:</span>
              <span className="line-clamp-1">{job.machine_model || '-'}</span>
            </div>
            <div className="flex flex-1">
              <span className="font-bold w-16 flex-shrink-0">Serial No:</span>
              <span className="truncate">{job.serial_number || '-'}</span>
            </div>
            <div className="flex justify-end w-28 flex-shrink-0">
              <span className="font-bold mr-2">Job No:</span>
              <span className="whitespace-nowrap">{job.job_number}</span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex">
            <span className="font-bold w-12 flex-shrink-0">Fault:</span>
            <span>{job.fault_description || '-'}</span>
          </div>

          {/* Row 4 */}
          <div className="flex">
            <span className="font-bold w-16 flex-shrink-0 whitespace-nowrap">Taken:</span>
            <span className="line-clamp-2">
              {job.items && job.items.length > 0
                ? job.items.map((i) => `${i.item_name} (${i.quantity.toString().padStart(2, '0')})`).join(', ')
                : '-'}
            </span>
          </div>
        </div>

        <div className="border-t border-black my-4"></div>

        {/* Footer Area */}
        <div className="flex justify-between items-start text-[9px] leading-tight">
          {/* Left Side (Conditions) */}
          <div className="w-[55%] pr-2">
            <div className="space-y-1 mb-8">
              <p>* This receipt must produce for collection.</p>
              <p>* NO responsibility for equipment not collected within one month.</p>
              <p>* If the equipment is taken without repairs after estimation an inspection charge of Rs. 3000 will be charged.</p>
            </div>
            
            <div className="space-y-2 pt-2">
              <p>{job.assigned_to_name || '...........................................'}</p>
              <p className="font-bold">Premier Data Systems Pvt Ltd</p>
            </div>
          </div>

          {/* Right Side (Signatures) */}
          <div className="w-[45%]">
            <div className="mb-6">
              <p className="mb-1">Customer</p>
              <p>Signature ........................................</p>
            </div>
            
            <div>
              <p className="font-bold mb-2">Handed Over To</p>
              <p className="mb-4">Mr/Ms/Mrs ........................................</p>
              
              <div className="flex justify-between items-end">
                <div>
                  <p className="mb-1">Signature</p>
                  <p>......................</p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-left">Date</p>
                  <p>......................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default JobNotePrint;
