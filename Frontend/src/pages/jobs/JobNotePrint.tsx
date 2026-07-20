import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { jobsAPI } from '../../api/endpoints';
import type { Job } from '../../types';
import { formatDateTime } from '../../utils/formatters';

const JobNotePrint: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Automatically trigger print dialog when loaded, but wait a bit for rendering
    if (job) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [job]);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        if (id) {
          const data = await jobsAPI.getById(Number(id));
          setJob(data);
        }
      } catch (error) {
        console.error('Failed to fetch job details for printing:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [id]);

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!job) {
    return <div className="p-8">Job not found</div>;
  }

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
    <div className="bg-white text-black min-h-screen">
      <div className="max-w-[210mm] mx-auto p-8 pt-4 pb-4">
        
        {/* Top bar with date and title */}
        <div className="flex justify-between items-center text-xs text-gray-600 mb-4 font-sans">
          <span>{formattedDateTime}</span>
          <span>Smart Dashboard - ERP</span>
          <span className="w-[100px]"></span> {/* Spacer to center the title */}
        </div>

        {/* Header with Logo and Company Info */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-1/2">
            <img src="/logo.jpg" alt="Premier Data Systems Logo" className="h-16 object-contain" />
          </div>
          <div className="w-1/2 text-right text-sm leading-tight space-y-1">
            <p>No. 17A, Mudali Mawatha, Kohuwala, Sri Lanka</p>
            <p>Tel: +94 11 2815015</p>
            <p>Fax: 94 11 7396803</p>
            <p>Email: support@premier.lk</p>
            <p>Web:</p>
          </div>
        </div>

        <div className="border-t-2 border-black mb-6"></div>

        {/* Job Info Grid */}
        <div className="grid grid-cols-12 gap-y-4 text-sm font-sans mb-8">
          {/* Row 1 */}
          <div className="col-span-1 font-bold">Cust:</div>
          <div className="col-span-8 pr-4">
            {displayCustomerName}
            {displayCustomerAddress && ` (${displayCustomerAddress})`}
          </div>
          <div className="col-span-1 font-bold">Date:</div>
          <div className="col-span-2">
            {job.created_at ? new Date(job.created_at).toISOString().split('T')[0] : ''}
          </div>

          {/* Row 2 */}
          <div className="col-span-1 font-bold">Model:</div>
          <div className="col-span-4 pr-4">{job.machine_model || job.model_name || '-'}</div>
          <div className="col-span-1 font-bold">Serial No:</div>
          <div className="col-span-3">{job.serial_number || '-'}</div>
          <div className="col-span-1 font-bold whitespace-nowrap">Job No:</div>
          <div className="col-span-2">{job.job_number}</div>

          {/* Row 3 */}
          <div className="col-span-1 font-bold">Fault:</div>
          <div className="col-span-11 pr-4">{job.fault_description || '-'}</div>

          {/* Row 4 */}
          <div className="col-span-2 font-bold whitespace-nowrap">Item Taken:</div>
          <div className="col-span-10 pr-4">
            {job.items && job.items.length > 0
              ? job.items.map((i) => `${i.item_name} (${i.quantity.toString().padStart(2, '0')})`).join(', ')
              : '-'}
          </div>
        </div>

        <div className="border-t-2 border-black mb-8"></div>

        {/* Footer Area */}
        <div className="flex justify-between items-start text-sm">
          {/* Left Side - Terms */}
          <div className="w-7/12 pr-4 space-y-4">
            <div className="space-y-3">
              <p>* This receipt must produce for collection.</p>
              <p>* NO responsibility for equipment not collected within one month.</p>
              <p>* If the equipment is taken without repairs after estimation an inspection charge of Rs. 3000 will be charged.</p>
            </div>
            
            <div className="pt-8 space-y-2">
              <p>Osiru..........................................................</p>
              <p className="font-bold">Premier Data Systems Pvt Ltd</p>
            </div>
          </div>

          {/* Right Side - Signatures */}
          <div className="w-5/12 space-y-6 pt-12">
            <div>
              <p className="mb-2">Customer</p>
              <p>Signature......................................................................</p>
            </div>
            
            <div className="space-y-4 pt-4">
              <p className="font-bold">Handed Over To</p>
              <p>Mr/Ms/Mrs....................................................................................</p>
              
              <div className="flex justify-between items-end pt-4">
                <div className="w-1/2">
                  <p className="mb-2">Signature</p>
                  <p>..........................................</p>
                </div>
                <div className="w-1/2">
                  <p className="mb-2">Date</p>
                  <p>..........................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default JobNotePrint;
