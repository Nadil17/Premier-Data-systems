import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { partsRequestsAPI } from '../../api/endpoints';
import type { PartsRequestSummary } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const PartsRequestsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<PartsRequestSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await partsRequestsAPI.getAll(0, 100);
      // Defensive: ensure response is an array
      const requestsArray = Array.isArray(response) ? response : [];
      let filtered = requestsArray;

      if (filter !== 'all') {
        filtered = filtered.filter(r => r.status === filter);
      }

      setRequests(filtered);
    } catch (error) {
      toast.error('Failed to fetch parts requests');
      console.error(error);
      // Defensive: set to empty array on error
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'partially_approved':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'partially_approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parts Requests</h1>
          <p className="text-gray-600 mt-1">
            {['storekeeper', 'admin', 'accountant', 'front_desk'].includes(user?.role || '')
              ? 'Review and approve parts requests from engineers'
              : 'View your parts requests'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          All ({requests.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium ${filter === 'pending'
              ? 'bg-yellow-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          Pending ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg font-medium ${filter === 'approved'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          Approved ({requests.filter(r => r.status === 'approved').length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg font-medium ${filter === 'rejected'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
        >
          Rejected ({requests.filter(r => r.status === 'rejected').length})
        </button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No parts requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/parts/requests/${request.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(request.status)}
                    <h3 className="text-lg font-bold text-gray-900">
                      Request #{request.request_number}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Job Number</p>
                      <p className="font-medium text-gray-900">{request.job_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Requested By</p>
                      <p className="font-medium text-gray-900">{request.engineer_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Parts</p>
                      <p className="font-medium text-gray-900">{request.total_items} item(s)</p>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Requested on {formatDateTime(request.created_at)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartsRequestsList;
