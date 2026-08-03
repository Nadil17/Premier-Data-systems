import React, { useState, useEffect } from 'react';
import { jobsAPI } from '../../api/endpoints';
import { formatDateTime } from '../../utils/dateFormatter';
import { CheckCircle, Clock, Wrench, AlertCircle, FileText, ChevronRight } from 'lucide-react';

interface JobHistoryPart {
  part_name: string;
  part_number: string;
  quantity_requested: number;
  quantity_approved: number;
  quantity_issued: number;
  quantity_used: number;
  quantity_returned: number;
  status: string;
}

interface JobHistoryItem {
  id: number;
  job_number: string;
  fault_description: string;
  work_done?: string;
  tests_performed?: string;
  repair_notes?: string;
  remarks?: string;
  status: string;
  job_category: string;
  completed_at?: string;
  created_at: string;
  parts: JobHistoryPart[];
}

interface JobHistoryViewProps {
  serialNumber: string;
  currentJobId: number;
}

export default function JobHistoryView({ serialNumber, currentJobId }: JobHistoryViewProps) {
  const [history, setHistory] = useState<JobHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await jobsAPI.getHistoryBySerial(serialNumber);
        const pastJobs = res.filter((j: any) => j.id !== currentJobId);
        setHistory(pastJobs);
      } catch (err) {
        console.error('Failed to fetch job history:', err);
        setError('Could not load job history.');
      } finally {
        setLoading(false);
      }
    };
    if (serialNumber) fetchHistory();
  }, [serialNumber, currentJobId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading history...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  if (history.length === 0) {
    return (
      <div className="card p-8 text-center bg-gray-50 border border-gray-200">
        <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <h3 className="text-sm font-medium text-gray-900">No Previous Jobs</h3>
        <p className="text-xs text-gray-500 mt-1">
          There are no other recorded jobs for this serial number.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((job) => (
        <div key={job.id} className="card overflow-hidden border border-gray-200 shadow-sm">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="font-medium text-blue-700">{job.job_number}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700 uppercase">
                {job.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatDateTime(job.created_at)}
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Fault Description</p>
              <p className="text-sm text-gray-900">{job.fault_description || 'N/A'}</p>
            </div>
            
            {job.status === 'completed' || job.status === 'delivered' ? (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" /> Work Done
                </p>
                <p className="text-sm text-gray-800">{job.work_done || 'N/A'}</p>
              </div>
            ) : null}

            {job.parts && job.parts.filter(p => p.quantity_used > 0).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Parts Replaced</p>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Name</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {job.parts.filter(p => p.quantity_used > 0).map((part, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 font-medium">{part.part_name}</td>
                          <td className="px-3 py-2 text-xs text-gray-600 text-center">{part.quantity_used}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
