import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Package } from 'lucide-react';
import LoadingSpinner from '../common/LoadingSpinner';
import toast from 'react-hot-toast';
import { jobsAPI } from '../../api/endpoints';
import { getErrorMessage } from '../../utils/apiErrors';

interface JobCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: number;
  jobNumber: string;
  onSuccess: () => void;
}

interface CompletionCheck {
  can_complete: boolean;
  blocking_issues: Array<{
    type: string;
    message: string;
    part_name?: string;
    quantity_pending?: number;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    part_name?: string;
  }>;
  parts_summary: {
    total_issued: number;
    total_used: number;
    total_returned: number;
    pending_return: number;
  };
}

export default function JobCompletionModal({
  isOpen,
  onClose,
  jobId,
  jobNumber,
  onSuccess
}: JobCompletionModalProps) {
  const [step, setStep] = useState<'check' | 'form'>('check');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completionCheck, setCompletionCheck] = useState<CompletionCheck | null>(null);
  
  // Form data
  const [workDone, setWorkDone] = useState('');
  const [testsPerformed, setTestsPerformed] = useState('');
  const [repairNotes, setRepairNotes] = useState('');
  const [warrantyDetails, setWarrantyDetails] = useState('');

  useEffect(() => {
    if (isOpen) {
      checkCompletionStatus();
      // Reset form
      setWorkDone('');
      setTestsPerformed('');
      setRepairNotes('');
      setWarrantyDetails('');
      setStep('check');
    }
  }, [isOpen, jobId]);

  const checkCompletionStatus = async () => {
    setLoading(true);
    try {
      const data = await jobsAPI.checkCompletion(jobId);
      setCompletionCheck(data);
      
      if (data.can_complete) {
        setStep('form');
      }
    } catch (error) {
      toast.error('Failed to check job status');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workDone.trim() || !testsPerformed.trim() || !repairNotes.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await jobsAPI.completeJob(jobId, {
        work_done: workDone,
        tests_performed: testsPerformed,
        repair_notes: repairNotes,
        warranty_details: warrantyDetails || undefined
      });
      
      toast.success('Job marked as completed!');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to complete job'));
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Complete Job {jobNumber}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : step === 'check' && completionCheck && !completionCheck.can_complete ? (
              /* Validation Check Results */
              <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-900 mb-2">
                        Cannot Complete Job
                      </h3>
                      <p className="text-sm text-red-800">
                        Please resolve the following issues before completing this job:
                      </p>
                    </div>
                  </div>
                </div>

                {/* Blocking Issues */}
                {completionCheck.blocking_issues.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Required Actions:</h4>
                    {completionCheck.blocking_issues.map((issue, index) => (
                      <div
                        key={index}
                        className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                      >
                        <div className="flex gap-3">
                          <Package className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-900">
                              {issue.message}
                            </p>
                            {issue.type === 'parts_not_returned' && (
                              <p className="text-xs text-yellow-800 mt-1">
                                Please return {issue.quantity_pending} unused part(s) to the storekeeper.
                              </p>
                            )}
                            {issue.type === 'return_not_approved' && (
                              <p className="text-xs text-yellow-800 mt-1">
                                Waiting for storekeeper approval of returned parts.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Parts Summary */}
                {completionCheck.parts_summary.total_issued > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Parts Summary</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-blue-700">Total Issued:</span>
                        <span className="font-semibold text-blue-900 ml-2">
                          {completionCheck.parts_summary.total_issued}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-700">Used:</span>
                        <span className="font-semibold text-blue-900 ml-2">
                          {completionCheck.parts_summary.total_used}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-700">Returned:</span>
                        <span className="font-semibold text-blue-900 ml-2">
                          {completionCheck.parts_summary.total_returned}
                        </span>
                      </div>
                      <div>
                        <span className="text-red-700">Pending Return:</span>
                        <span className="font-semibold text-red-900 ml-2">
                          {completionCheck.parts_summary.pending_return}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={checkCompletionStatus}
                    className="btn-secondary flex-1"
                  >
                    Recheck Status
                  </button>
                  <button
                    onClick={onClose}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Completion Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Success indicator if check passed */}
                {completionCheck?.can_complete && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-green-900">
                          All Requirements Met
                        </h3>
                        <p className="text-sm text-green-800 mt-1">
                          You can now complete this job. Please fill in the required information below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Done */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Done <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={workDone}
                    onChange={(e) => setWorkDone(e.target.value)}
                    rows={4}
                    className="input w-full"
                    placeholder="Describe all work performed on this job..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Detail all repairs, replacements, and modifications made
                  </p>
                </div>

                {/* Tests Performed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tests Performed <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={testsPerformed}
                    onChange={(e) => setTestsPerformed(e.target.value)}
                    rows={3}
                    className="input w-full"
                    placeholder="Describe tests conducted to verify the repair..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    List all tests and their results
                  </p>
                </div>

                {/* Repair Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repair Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    rows={3}
                    className="input w-full"
                    placeholder="Additional notes about the repair process..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include any important observations or recommendations
                  </p>
                </div>

                {/* Warranty Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Warranty Details (Optional)
                  </label>
                  <textarea
                    value={warrantyDetails}
                    onChange={(e) => setWarrantyDetails(e.target.value)}
                    rows={2}
                    className="input w-full"
                    placeholder="Warranty information, coverage period, terms..."
                  />
                </div>

                {/* Parts Summary if available */}
                {completionCheck && completionCheck.parts_summary.total_used > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Parts Used Confirmation</h4>
                    <p className="text-sm text-gray-600">
                      Total parts used: <span className="font-semibold">{completionCheck.parts_summary.total_used}</span>
                    </p>
                    {completionCheck.parts_summary.total_returned > 0 && (
                      <p className="text-sm text-gray-600">
                        Parts returned: <span className="font-semibold">{completionCheck.parts_summary.total_returned}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {completionCheck && completionCheck.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-yellow-900 mb-2">Warnings:</p>
                    {completionCheck.warnings.map((warning, index) => (
                      <p key={index} className="text-xs text-yellow-800">
                        • {warning.message}
                      </p>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={submitting || !workDone.trim() || !testsPerformed.trim() || !repairNotes.trim()}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Completing...
                      </span>
                    ) : (
                      'Complete Job'
                    )}
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Job status will be updated to "Waiting for Accountant Review"
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
