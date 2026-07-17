import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Filter, Clock, Mail, MessageSquare, CheckCircle } from 'lucide-react';
import ManualApprovalModal from './ManualApprovalModal';
import { customerEstimatesAPI, engineerEstimatesAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/apiErrors';

interface CustomerEstimate {
  id: number;
  estimate_number: string;
  job_id: number;
  job_number?: string;
  customer_name?: string;
  total_amount: number;
  status: string;
  approval_status?: string;
  created_at: string;
  sent_at?: string;
  approved_at?: string;
}

interface EngineerEstimate {
  id: number;
  estimate_number: string;
  job_id: number;
  job_number?: string;
  customer_name?: string;
  engineer_name?: string;
  created_at: string;
}

const EstimatesList: React.FC = () => {
  const { user } = useAuthStore();
  const [estimates, setEstimates] = useState<CustomerEstimate[]>([]);
  const [pendingEngineerEstimates, setPendingEngineerEstimates] = useState<EngineerEstimate[]>([]);
  const [activeTab, setActiveTab] = useState<'engineer_pending' | 'customer_estimates'>('engineer_pending');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sendingStatus, setSendingStatus] = useState<Record<string, boolean>>({});
  const [manualApproveId, setManualApproveId] = useState<number | null>(null);

  useEffect(() => {
    // Non-accountants default to customer estimates tab
    if (user && user.role !== 'accountant' && user.role !== 'admin') {
      setActiveTab('customer_estimates');
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const promises = [customerEstimatesAPI.getAll(0, 100)];
      
      // Only fetch pending engineer estimates for accountant and admin
      if (user && (user.role === 'accountant' || user.role === 'admin')) {
        promises.push(engineerEstimatesAPI.getPending());
      }

      const [customerResponse, engineerResponse] = await Promise.all(promises);

      const items = customerResponse?.items || (Array.isArray(customerResponse) ? customerResponse : []);
      setEstimates(items.map((estimate: any) => ({
        ...estimate,
        status: estimate.status ?? estimate.approval_status ?? 'pending',
      })));

      if (engineerResponse) {
        setPendingEngineerEstimates(engineerResponse || []);
      }
    } catch (error) {
      toast.error('Failed to fetch estimates data');
      console.error(error);
      setEstimates([]);
      setPendingEngineerEstimates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEstimate = async (estimateId: number, type: 'email' | 'whatsapp') => {
    const statusKey = `${estimateId}-${type}`;
    setSendingStatus(prev => ({ ...prev, [statusKey]: true }));
    try {
      const response = await customerEstimatesAPI.sendToCustomer(estimateId, { send_via: type });
      toast.success(response.message);
    } catch (error) {
      console.error(`Failed to send estimate via ${type}:`, error);
      toast.error(getErrorMessage(error, `Failed to send estimate via ${type}`));
    } finally {
      setSendingStatus(prev => ({ ...prev, [statusKey]: false }));
    }
  };

  const filteredEstimates = estimates.filter((estimate) => {
    const matchesSearch =
      searchQuery === '' ||
      (estimate.estimate_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (estimate.job_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (estimate.customer_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredEngineerEstimates = pendingEngineerEstimates.filter((est) => {
    return (
      searchQuery === '' ||
      (est.estimate_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (est.job_number ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (est.customer_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isAccountantOrAdmin = user && (user.role === 'accountant' || user.role === 'admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estimates</h1>
          <p className="mt-1 text-sm text-gray-600">View and manage repair estimates</p>
        </div>
      </div>

      {/* Tabs */}
      {isAccountantOrAdmin && (
        <div className="flex border-b border-gray-200 bg-white px-4 pt-2 rounded-t-lg shadow-sm">
          <button
            onClick={() => setActiveTab('engineer_pending')}
            className={`py-4 px-6 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'engineer_pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending Engineer Reviews ({filteredEngineerEstimates.length})
          </button>
          <button
            onClick={() => setActiveTab('customer_estimates')}
            className={`py-4 px-6 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'customer_estimates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Customer Estimates ({filteredEstimates.length})
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by estimate number, job, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
          {activeTab === 'customer_estimates' && (
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input pl-10 w-full"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Awaiting Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="partially_approved">Partially Approved</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Lists */}
      <div className="card">
        {activeTab === 'engineer_pending' ? (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Pending Engineer Estimates ({filteredEngineerEstimates.length})
            </h2>

            {filteredEngineerEstimates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No pending engineer estimates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estimate #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Engineer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEngineerEstimates.map((est) => (
                      <tr key={est.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {est.estimate_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-blue-600">
                          <Link to={`/jobs/${est.job_id}`} className="hover:underline">
                            {est.job_number || `Job #${est.job_id}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {est.customer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {est.engineer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(est.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/estimates/create/${est.job_id}`}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            Create Customer Estimate
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Customer Estimates ({filteredEstimates.length})
            </h2>

            {filteredEstimates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>No customer estimates found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Estimate #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Job
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEstimates.map((estimate) => (
                      <tr key={estimate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {estimate.estimate_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {estimate.job_number ? (
                            <Link
                              to={`/jobs/${estimate.job_id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {estimate.job_number}
                            </Link>
                          ) : (
                            `Job #${estimate.job_id}`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {estimate.customer_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          Rs. {estimate.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={estimate.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(estimate.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex items-center gap-3">
                          <Link
                            to={`/jobs/${estimate.job_id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Job
                          </Link>
                          {isAccountantOrAdmin && estimate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleSendEstimate(estimate.id, 'email')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                                disabled={sendingStatus[`${estimate.id}-email`]}
                                title="Send Estimate via Email"
                              >
                                {sendingStatus[`${estimate.id}-email`] ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <Mail className="h-3 w-3" />
                                )}
                                Email
                              </button>
                              <button
                                onClick={() => handleSendEstimate(estimate.id, 'whatsapp')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                                disabled={sendingStatus[`${estimate.id}-whatsapp`]}
                                title="Send Estimate via WhatsApp"
                              >
                                {sendingStatus[`${estimate.id}-whatsapp`] ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <MessageSquare className="h-3 w-3" />
                                )}
                                WhatsApp
                              </button>
                              <button
                                onClick={() => setManualApproveId(estimate.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-semibold shadow-sm transition-colors"
                                title="Manual Approval (Phone Call)"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Phone Approv.
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ManualApprovalModal
        isOpen={manualApproveId !== null}
        onClose={() => setManualApproveId(null)}
        estimateId={manualApproveId}
        onSuccess={() => {
          fetchData();
        }}
      />
    </div>
  );
};

export default EstimatesList;
