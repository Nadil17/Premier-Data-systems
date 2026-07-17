import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  Users,
  Package,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Truck,
} from 'lucide-react';
import { dashboardAPI, jobsAPI, partsRequestsAPI, customerEstimatesAPI } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import type { JobSummary, PartsRequest, CustomerEstimate } from '../../types';
import { getErrorMessage } from '../../utils/apiErrors';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface ManagerStats {
  total_jobs: number;
  unassigned_jobs: number;
  in_progress_jobs: number;
  completed_jobs: number;
  delivered_jobs: number;
  total_engineers: number;
  total_customers: number;
  jobs_by_status: Record<string, number>;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [pendingReturns, setPendingReturns] = useState<PartsRequest[]>([]);
  const [customerEstimates, setCustomerEstimates] = useState<CustomerEstimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let data;

      // Fetch role-specific dashboard
      switch (user.role) {
        case 'admin':
        case 'manager':
          data = await dashboardAPI.getManagerDashboard();
          setStats(data);
          break;
        case 'engineer':
          data = await dashboardAPI.getEngineerDashboard();
          setStats({
            total_jobs: data.total_assigned_jobs,
            unassigned_jobs: 0,
            in_progress_jobs: data.pending_jobs,
            completed_jobs: data.completed_jobs,
            delivered_jobs: 0,
            total_engineers: 0,
            total_customers: 0,
            jobs_by_status: {},
          });
          setJobs(data.jobs || []);
          break;
        case 'storekeeper':
          data = await dashboardAPI.getStorekeeperDashboard();
          setStats({
            total_jobs: data.pending_requests,
            unassigned_jobs: data.low_stock_items,
            in_progress_jobs: data.approved_requests_today,
            completed_jobs: 0,
            delivered_jobs: 0,
            total_engineers: 0,
            total_customers: data.out_of_stock_items,
            jobs_by_status: {},
          });

          // Fetch pending returns
          try {
            // We need to fetch all requests and filter for those with items pending return
            // This is not efficient but works for now until we have a dedicated endpoint
            const allRequests = await partsRequestsAPI.getAll(0, 100);

            const returnsPromises = allRequests.map(async (summary: any) => {
              try {
                const fullRequest = await partsRequestsAPI.getById(summary.id);
                const hasPendingReturns = fullRequest.items.some((item: any) => item.status === 'return_requested');
                return hasPendingReturns ? fullRequest : null;
              } catch {
                return null;
              }
            });

            const results = await Promise.all(returnsPromises);
            setPendingReturns(results.filter((request): request is PartsRequest => request !== null));
          } catch (err) {
            console.error("Failed to fetch pending returns", err);
          }
          break;
        case 'accountant':
          data = await dashboardAPI.getAccountantDashboard();
          setStats({
            total_jobs: data.pending_engineer_estimates,
            unassigned_jobs: data.pending_customer_approvals,
            in_progress_jobs: data.approved_estimates_today,
            completed_jobs: data.rejected_estimates_today,
            delivered_jobs: data.completed_jobs_pending_review,
            total_engineers: 0,
            total_customers: 0,
            jobs_by_status: {},
          });
          // Fetch completed jobs pending review
          try {
            const allJobs = await jobsAPI.getAll(0, 100);
            const pendingReviewJobs = allJobs.items.filter((j: any) => j.status === 'waiting_for_accountant_review');
            setJobs(pendingReviewJobs);
          } catch (err) {
            console.error("Failed to fetch pending review jobs", err);
          }
          // Fetch all accountant-generated customer estimates
          try {
            const estimates = await customerEstimatesAPI.getAll(0, 200);
            setCustomerEstimates(estimates);
          } catch (err) {
            console.error("Failed to fetch customer estimates", err);
          }
          break;
        case 'front_desk':
          data = await dashboardAPI.getFrontDeskDashboard();
          setStats({
            total_jobs: data.new_jobs_today,
            unassigned_jobs: 0,
            in_progress_jobs: data.jobs_ready_for_delivery,
            completed_jobs: data.delivered_today,
            delivered_jobs: data.delivered_today,
            total_engineers: 0,
            total_customers: data.new_customers_today,
            jobs_by_status: {},
          });
          break;
        default:
          // No dashboard available for this role
          console.warn(`No dashboard configured for role: ${user.role}`);
          setStats({
            total_jobs: 0,
            unassigned_jobs: 0,
            in_progress_jobs: 0,
            completed_jobs: 0,
            delivered_jobs: 0,
            total_engineers: 0,
            total_customers: 0,
            jobs_by_status: {},
          });
      }
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error(getErrorMessage(error, 'Failed to fetch dashboard data'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Role-specific stat cards
  const getStatCards = () => {
    if (!user) return [];

    switch (user.role) {
      case 'admin':
      case 'manager':
        return [
          { title: 'Total Jobs', value: stats?.total_jobs || 0, icon: Wrench, color: 'bg-blue-500', link: '/jobs' },
          { title: 'Unassigned Jobs', value: stats?.unassigned_jobs || 0, icon: AlertCircle, color: 'bg-yellow-500', link: '/jobs?status=unassigned' },
          { title: 'In Progress', value: stats?.in_progress_jobs || 0, icon: TrendingUp, color: 'bg-indigo-500', link: '/jobs?status=in_progress' },
          { title: 'Completed', value: stats?.completed_jobs || 0, icon: CheckCircle, color: 'bg-green-500', link: '/jobs?status=completed' },
          { title: 'Delivered', value: stats?.delivered_jobs || 0, icon: Truck, color: 'bg-emerald-500', link: '/jobs?status=delivered' },
          { title: 'Total Engineers', value: stats?.total_engineers || 0, icon: UserCheck, color: 'bg-purple-500', link: '/users' },
          { title: 'Total Customers', value: stats?.total_customers || 0, icon: Users, color: 'bg-pink-500', link: '/customers' },
        ];
      case 'engineer':
        return [
          { title: 'Assigned Jobs', value: stats?.total_jobs || 0, icon: Wrench, color: 'bg-blue-500', link: '/jobs' },
          { title: 'Pending Jobs', value: stats?.in_progress_jobs || 0, icon: Clock, color: 'bg-yellow-500', link: '/jobs' },
          { title: 'Completed Jobs', value: stats?.completed_jobs || 0, icon: CheckCircle, color: 'bg-green-500', link: '/jobs' },
        ];
      case 'storekeeper':
        return [
          { title: 'Pending Requests', value: stats?.total_jobs || 0, icon: Package, color: 'bg-blue-500', link: '/parts/requests' },
          { title: 'Low Stock Items', value: stats?.unassigned_jobs || 0, icon: AlertCircle, color: 'bg-yellow-500', link: '/parts?filter=low-stock' },
          { title: 'Approved Today', value: stats?.in_progress_jobs || 0, icon: CheckCircle, color: 'bg-green-500', link: '/parts/requests' },
          { title: 'Out of Stock', value: stats?.total_customers || 0, icon: AlertCircle, color: 'bg-red-500', link: '/parts?filter=out-of-stock' },
        ];
      case 'accountant':
        return [
          { title: 'Pending Estimates', value: stats?.total_jobs || 0, icon: FileText, color: 'bg-blue-500', link: '/estimates' },
          { title: 'Awaiting Approval', value: stats?.unassigned_jobs || 0, icon: Clock, color: 'bg-yellow-500', link: '/estimates' },
          { title: 'Approved Today', value: stats?.in_progress_jobs || 0, icon: CheckCircle, color: 'bg-green-500', link: '/estimates' },
          { title: 'Pending Review', value: stats?.delivered_jobs || 0, icon: FileText, color: 'bg-purple-500', link: '/jobs' },
        ];
      case 'front_desk':
        return [
          { title: 'New Jobs Today', value: stats?.total_jobs || 0, icon: Wrench, color: 'bg-blue-500', link: '/jobs' },
          { title: 'New Customers', value: stats?.total_customers || 0, icon: Users, color: 'bg-purple-500', link: '/customers' },
          { title: 'Ready for Delivery', value: stats?.in_progress_jobs || 0, icon: Truck, color: 'bg-green-500', link: '/jobs?status=ready' },
          { title: 'Delivered Today', value: stats?.delivered_jobs || 0, icon: CheckCircle, color: 'bg-emerald-500', link: '/jobs?status=delivered' },
        ];
      default:
        return [];
    }
  };

  const statCards = getStatCards();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {user?.full_name}! Here's your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Jobs - Only for Engineers */}
      {user?.role === 'engineer' && jobs.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Assigned Jobs</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                      {job.job_number}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {job.customer_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {(job?.machine_model || "")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={job.has_pending_handover ? 'need_to_handover' : job.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(job.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Completed Jobs Pending Review - Only for Accountants */}
      {(user?.role === 'accountant' || user?.role === 'admin') && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Completed Jobs Pending Review</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.length > 0 ? (
                  jobs.filter(j => j.status === 'waiting_for_accountant_review').map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                        <Link to={`/jobs/${job.id}`} className="hover:underline">
                          {job.job_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {job.customer_name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {(job?.machine_model || "")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(job.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/jobs/${job.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No completed jobs pending review
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Accountant-Generated Customer Estimates */}
      {(user?.role === 'accountant' || user?.role === 'admin') && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">My Customer Estimates</h2>
            <Link
              to="/estimates"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job #
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerEstimates.length > 0 ? (
                  customerEstimates.map((est) => (
                    <tr key={est.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {est.estimate_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                        <Link to={`/jobs/${est.job_id}`} className="hover:underline">
                          {est.job_number || `Job #${est.job_id}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        Rs. {est.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={est.approval_status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(est.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/jobs/${est.job_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Job
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No customer estimates created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Returns - Only for Storekeepers */}
      {(user?.role === 'storekeeper' || user?.role === 'admin') && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Pending Returns</h2>
            <Link
              to="/parts/requests"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All Requests
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engineer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items to Return
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingReturns.length > 0 ? (
                  pendingReturns.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {req.request_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">
                        <Link to={`/jobs/${req.job_id}`} className="hover:underline">
                          {req.job_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {req.engineer_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {(req.items || []).filter((item: any) => item.status === 'return_requested').length} items
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          to={`/jobs/${req.job_id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Job
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No pending returns found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
