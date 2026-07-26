import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Building2, Globe, Edit, Wrench, FileText } from 'lucide-react';
import { customersAPI } from '../../api/endpoints';
import type { Customer, JobSummary } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const CustomerDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const data = await customersAPI.getById(Number(id));
      setCustomer(data);
      setJobs(data.jobs || []);
    } catch (error) {
      toast.error('Failed to fetch customer details');
      console.error(error);
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4">
          Back to Customers
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="mt-1 text-sm text-gray-600">
              Customer ID: {(customer?.customer_id || "")}
            </p>
          </div>
        </div>
        <Link
          to={`/customers/${customer.id}/edit`}
          className="btn-primary flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Customer
        </Link>
      </div>

      {/* Customer Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <div className="lg:col-span-2 card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Information</h2>
          
          <div className="space-y-6">
            {/* Category */}
            <div>
              <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${
                customer.category === 'company'
                  ? 'bg-purple-100 text-purple-800'
                  : customer.category === 'dealer'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}>
                {customer.category}
              </span>
            </div>

            {/* Company Name */}
            {customer.company_name && (
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Company Name</p>
                  <p className="text-base text-gray-900">{customer.company_name}</p>
                </div>
              </div>
            )}

            {/* Tax Number */}
            {(customer.tax_number || customer.vat_number) && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Tax Number</p>
                  <p className="text-base font-semibold text-gray-900">{customer.tax_number || customer.vat_number}</p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone Numbers</p>
                  <p className="text-base text-gray-900">{customer.phone_1}</p>
                  {customer.phone_2 && (
                    <p className="text-base text-gray-700">{customer.phone_2}</p>
                  )}
                  {customer.phone_3 && (
                    <p className="text-base text-gray-700">{customer.phone_3}</p>
                  )}
                </div>
              </div>

              {customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-base text-gray-900">{customer.email}</p>
                  </div>
                </div>
              )}

              {customer.website && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a
                      href={customer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base text-blue-600 hover:text-blue-700"
                    >
                      {customer.website}
                    </a>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-base text-gray-900 whitespace-pre-line">
                      {customer.address}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* VAT Number */}
            {customer.vat_number && (
              <div>
                <p className="text-sm text-gray-500">VAT Number</p>
                <p className="text-base text-gray-900">{customer.vat_number}</p>
              </div>
            )}

            {/* Remarks */}
            {customer.remarks && (
              <div>
                <p className="text-sm text-gray-500">Remarks</p>
                <p className="text-base text-gray-900 whitespace-pre-line">
                  {customer.remarks}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t text-sm text-gray-500">
              <p>Created: {formatDate((customer.created_at || ""))}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              to={`/jobs/new?customer_id=${customer.id}`}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Create New Job
            </Link>
            <a
              href={`tel:${customer.phone_1}`}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Phone className="h-4 w-4" />
              Call Customer
            </a>
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Job History */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Job History</h2>
          <span className="text-sm text-gray-500">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new job for this customer
            </p>
            <Link
              to={`/jobs/new?customer_id=${customer.id}`}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Wrench className="h-4 w-4" />
              Create Job
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {job.job_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(job?.machine_model || "")}
                      <br />
                      <span className="text-xs text-gray-500">
                        S/N: {job.serial_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={job.has_pending_handover ? 'need_to_handover' : job.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetail;
