import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, User, Wrench, Package, CheckCircle, XCircle, Clock,
  FileText, DollarSign, Box, Truck, Cpu, Tag, AlertCircle, ChevronRight, Printer, Receipt,
  Mail, MessageSquare
} from 'lucide-react';
import { jobsAPI, usersAPI, engineerEstimatesAPI, customerEstimatesAPI, partsRequestsAPI, handoversAPI } from '../../api/endpoints';
import type {
  Job,
  User as UserType,
  EngineerEstimate,
  CustomerEstimate,
  PartsRequest,
  PartsRequestItemResponse,
  PartsHandoverResponse,
} from '../../types';
import PartsHandoverSection from '../../components/jobs/PartsHandoverSection';
import PrintableJobDetail from '../../components/jobs/PrintableJobDetail';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PartsRequestModal from '../../components/modals/PartsRequestModal';
import EngineerEstimateModal from '../../components/modals/EngineerEstimateModal';
import JobCompletionModal from '../../components/modals/JobCompletionModal';
import PartsStatusModal from '../../components/modals/PartsStatusModal';
import AccountantReviewModal from '../../components/modals/AccountantReviewModal';
import DeliveryModal from '../../components/modals/DeliveryModal';
import { StartRepairModal } from '../../components/modals/StartRepairModal';
import ManualApprovalModal from '../estimates/ManualApprovalModal';
import { getErrorMessage } from '../../utils/apiErrors';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

type TabId = 'info' | 'estimates' | 'parts' | 'repair';

const JobDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();

  const [job, setJob] = useState<Job | null>(null);
  const [engineers, setEngineers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<number | null>(null);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [engineerEstimates, setEngineerEstimates] = useState<EngineerEstimate[]>([]);
  const [customerEstimates, setCustomerEstimates] = useState<CustomerEstimate[]>([]);
  const [partsRequests, setPartsRequests] = useState<PartsRequest[]>([]);
  const [processingPart, setProcessingPart] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPartItem, setSelectedPartItem] = useState<any | null>(null);
  const [showAccountantReviewModal, setShowAccountantReviewModal] = useState(false);
  const [showStartRepairModal, setShowStartRepairModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [, setIsDelivering] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [handovers, setHandovers] = useState<PartsHandoverResponse[]>([]);
  const [sendingStatus, setSendingStatus] = useState<Record<string, boolean>>({});
  const [manualApproveId, setManualApproveId] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchJob();
      fetchEngineerEstimates();
      fetchCustomerEstimates();
      fetchPartsRequests();
      fetchHandovers();
      if (user?.role === 'manager' || user?.role === 'admin') {
        fetchEngineers();
      }
    }
  }, [id]);

  const fetchHandovers = async () => {
    try {
      setHandovers(await handoversAPI.getJobHandovers(Number(id)));
    } catch (error) {
      console.error('Failed to fetch handovers:', error);
    }
  };

  const fetchJob = async () => {
    try {
      const data = await jobsAPI.getById(Number(id));
      setJob(data);
    } catch (error) {
      toast.error('Failed to fetch job details');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      const response = await usersAPI.getAll(0, 100);
      setEngineers(response.items.filter((u: any) => u.role === 'engineer'));
    } catch (error) {
      console.error('Failed to fetch engineers:', error);
    }
  };

  const fetchEngineerEstimates = async () => {
    try {
      setEngineerEstimates(await engineerEstimatesAPI.getByJob(Number(id)));
    } catch (error) {
      console.error('Failed to fetch engineer estimates:', error);
    }
  };

  const fetchCustomerEstimates = async () => {
    try {
      setCustomerEstimates(await customerEstimatesAPI.getByJob(Number(id)));
    } catch (error) {
      console.error('Failed to fetch customer estimates:', error);
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

  const fetchPartsRequests = async () => {
    try {
      const jobRequests = await jobsAPI.getJobPartsRequests(Number(id));
      setPartsRequests(jobRequests);
    } catch (error) {
      console.error('Failed to fetch parts requests:', error);
    }
  };

  const handleMarkPartsUsed = async (itemId: number, quantityUsed: number) => {
    setProcessingPart(itemId);
    try {
      await partsRequestsAPI.markItemUsed(itemId, quantityUsed);
      toast.success('Parts marked as used');
      fetchPartsRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to mark parts as used'));
    } finally {
      setProcessingPart(null);
    }
  };

  const handleReturnParts = async (itemId: number, quantityReturned: number) => {
    setProcessingPart(itemId);
    try {
      const result = await partsRequestsAPI.returnItem(itemId, quantityReturned);
      toast.success(result.message || 'Return request submitted');
      fetchPartsRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to return parts'));
    } finally {
      setProcessingPart(null);
    }
  };

  const handleAcceptReturn = async (itemId: number) => {
    setProcessingPart(itemId);
    try {
      const result = await partsRequestsAPI.acceptReturn(itemId);
      toast.success(result.message || 'Return accepted successfully');
      fetchPartsRequests();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to accept return'));
    } finally {
      setProcessingPart(null);
    }
  };

  const handleUpdateStatus = (item: PartsRequestItemResponse) => {
    setSelectedPartItem(item);
    setShowStatusModal(true);
  };

  const handleConfirmStatusUpdate = async (action: 'used' | 'returned', quantity: number) => {
    if (!selectedPartItem) return;
    if (action === 'used') await handleMarkPartsUsed(selectedPartItem.id, quantity);
    else await handleReturnParts(selectedPartItem.id, quantity);
  };

  const handleAssignJob = async () => {
    if (!selectedEngineer || !job) return;
    setIsAssigning(true);
    try {
      await jobsAPI.assignEngineer(job.id, selectedEngineer);
      toast.success('Job assigned successfully');
      fetchJob();
    } catch (error) {
      toast.error('Failed to assign job');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeliverJob = async (returnedIds: number[]) => {
    if (!job) return;
    setIsDelivering(true);
    try {
      await jobsAPI.deliverJob(job.id, returnedIds);
      toast.success('Job marked as delivered');
      fetchJob();
      setShowDeliveryModal(false);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to deliver job'));
    } finally {
      setIsDelivering(false);
    }
  };

  const handleAccountantReview = async (invoiceNumber: string) => {
    if (!job) return;
    try {
      await jobsAPI.accountantReview(job.id, invoiceNumber);
      toast.success(`Job approved with Invoice: ${invoiceNumber}`);
      fetchJob();
      setShowAccountantReviewModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || getErrorMessage(error, 'Failed to approve job'));
    }
  };

  const getUnrequestedApprovedParts = () => {
    const unrequested: { part_id: number; quantity: number }[] = [];
    customerEstimates
      .filter((e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved')
      .forEach((estimate) => {
        estimate.items
          .filter((item) => item.approval_status === 'approved' && item.item_type === 'part' && item.part_id)
          .forEach((item) => {
            const hasBeenRequested = partsRequests.some((req) =>
              (req.items || []).some(
                (ri) =>
                  ri.part_name?.toLowerCase().includes(item.description.toLowerCase()) ||
                  item.description.toLowerCase().includes(ri.part_name?.toLowerCase() || '')
              )
            );
            if (!hasBeenRequested && item.part_id) {
              unrequested.push({ part_id: item.part_id, quantity: item.quantity });
            }
          });
      });
    return unrequested;
  };

  const handleReturnJobItem = async (itemId: number) => {
    if (!job) return;
    try {
      await jobsAPI.returnItem(job.id, itemId);
      toast.success('Item marked as returned');
      fetchJob();
    } catch (error) {
      toast.error('Failed to return item');
    }
  };

  const hasUnreturnedRejectedParts = React.useMemo(() => {
    let unreturned = false;
    const rejectedParts = new Map<number, number>();

    customerEstimates.forEach((estimate) => {
      (estimate.items || []).forEach((item: any) => {
        if (item.approval_status === 'rejected' && item.item_type === 'part' && item.part_id) {
          rejectedParts.set(
            item.part_id,
            (rejectedParts.get(item.part_id) || 0) + (item.quantity || 1)
          );
        }
      });
    });

    if (rejectedParts.size === 0) return false;

    const returnedParts = new Map<number, number>();
    partsRequests.forEach((request) => {
      (request.items || []).forEach((item: any) => {
        if (item.part_id) {
          returnedParts.set(
            item.part_id,
            (returnedParts.get(item.part_id) || 0) + (item.quantity_returned || 0) + (item.quantity_pending_return || 0)
          );
        }
      });
    });

    for (const [partId, rejectedQty] of Array.from(rejectedParts.entries())) {
      const returnedQty = returnedParts.get(partId) || 0;
      if (returnedQty < rejectedQty) {
        unreturned = true;
        break;
      }
    }

    return unreturned;
  }, [customerEstimates, partsRequests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found</p>
        <button onClick={() => navigate('/jobs')} className="btn-primary mt-4">
          Back to Jobs
        </button>
      </div>
    );
  }

  const canAssign = (user?.role === 'manager' || user?.role === 'admin') &&
    !['completed', 'waiting_for_accountant_review', 'ready_for_delivery', 'delivered', 'cancelled'].includes(job.status);
  const isAssignedEngineer = user?.role === 'engineer' && job.assigned_to_id === user.id;
  const displayCustomerName =
    job.customer_name?.trim() || job.customer?.name?.trim() || job.reported_by?.trim() || 'Unknown';
  const displayCustomerPhone =
    job.customer_phone?.trim() || job.customer?.phone_1?.trim() || job.additional_phone?.trim() || '';

  const hasApprovedEstimate = customerEstimates.some(
    (e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved'
  );

  const hasUnhandledParts = partsRequests.some(request =>
    (request.items || []).some(item => {
      const pendingReturn = item.quantity_pending_return || 0;
      const available =
        (item.quantity_issued || 0) -
        (item.quantity_used || 0) -
        (item.quantity_returned || 0) -
        pendingReturn;
      return available > 0;
    })
  );


  const canSeeCustomerEstimate = user?.role !== 'engineer' || ['repair_in_progress', 'completed', 'waiting_for_accountant_review', 'ready_for_delivery', 'delivered'].includes(job.status);
  const showPrices = user?.role !== 'engineer';

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'info', label: 'Job Info', icon: <Cpu className="h-3.5 w-3.5" /> },
    {
      id: 'estimates',
      label: 'Estimates',
      icon: <DollarSign className="h-3.5 w-3.5" />,
      badge: engineerEstimates.length + customerEstimates.length || undefined,
    },
    {
      id: 'parts',
      label: 'Parts',
      icon: <Package className="h-3.5 w-3.5" />,
      badge: partsRequests.length || undefined,
    },
    {
      id: 'repair',
      label: 'Repair',
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
  ];

  // ── Small reusable UI helpers ──────────────────────────────────────────
  const InfoRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{children}</span>
    </div>
  );

  const SectionTitle = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-blue-500">{icon}</span>
      <h3 className="text-sm font-semibold text-gray-700">{children}</h3>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full print:hidden" style={{ minHeight: 0 }}>
        {/* ── Sticky header ── */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/jobs')}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                Job <span className="text-blue-600">{job.job_number}</span>
              </h1>
              <p className="text-xs text-gray-400">Created {formatDate(job.created_at)}</p>
            </div>
            <StatusBadge status={job.has_pending_handover ? 'need_to_handover' : job.status} className="ml-1 flex-shrink-0" />
            {hasApprovedEstimate && (
              <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="h-3 w-3" /> Estimate Approved
              </span>
            )}
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
            {isAssignedEngineer && (
              <>
                <button
                  onClick={() => setShowPartsModal(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"
                >
                  <Package className="h-3.5 w-3.5" /> Request Parts
                </button>
                {engineerEstimates.length === 0 && (
                  <button
                    onClick={() => setShowEstimateModal(true)}
                    disabled={hasUnhandledParts}
                    title={hasUnhandledParts ? "Please mark all issued parts as used or returned before creating an estimate" : ""}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${hasUnhandledParts
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Estimate
                  </button>
                )}
                {job.status === 'repair_in_progress' && (
                    <button
                      onClick={() => setShowCompletionModal(true)}
                      disabled={job.has_pending_handover || hasUnreturnedRejectedParts}
                      title={job.has_pending_handover ? "Cannot complete job with pending parts handover" : hasUnreturnedRejectedParts ? "Cannot complete job until all rejected parts are returned" : ""}
                      className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg flex items-center gap-1.5 ${job.has_pending_handover || hasUnreturnedRejectedParts ? 'bg-blue-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Complete
                    </button>
                  )}
              </>
            )}
            {(user?.role === 'accountant' || user?.role === 'admin') && (
              <>
                {job.status === 'waiting_for_accountant_review' && (
                  <button
                    onClick={() => setShowAccountantReviewModal(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" /> Review Job
                  </button>
                )}
                {job.status === 'estimate_approved' && (
                  <button
                    onClick={() => setShowStartRepairModal(true)}
                    disabled={job.has_pending_handover}
                    title={job.has_pending_handover ? "Cannot start repair with pending parts handover" : ""}
                    className={`px-3 py-1.5 text-xs font-medium text-white rounded-lg flex items-center gap-1.5 ${job.has_pending_handover ? 'bg-blue-400 cursor-not-allowed opacity-70' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    <Wrench className="h-3.5 w-3.5" /> Start Repairing
                  </button>
                )}
              </>
            )}
            {(user?.role === 'front_desk' || user?.role === 'admin' || user?.role === 'manager') &&
              job.status === 'ready_for_delivery' && (
                <button
                  onClick={() => setShowDeliveryModal(true)}
                  className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1.5"
                >
                  <Truck className="h-3.5 w-3.5" /> Deliver
                </button>
              )}
          </div>
        </div>
        <PartsHandoverSection
          job={job}
          handovers={handovers}
          onHandoversUpdated={() => {
            fetchJob();
            fetchHandovers();
          }}
        />

        {/* ── Main two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">

          {/* ════ LEFT: Tabbed main content ════ */}
          <div className="lg:col-span-2 flex flex-col min-h-0">
            {/* Tab bar */}
            <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl flex-shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge ? (
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable area */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">

              {/* ── INFO TAB ── */}
              {activeTab === 'info' && (
                <>
                  {/* Customer card */}
                  <div className="card p-4">
                    <SectionTitle icon={<User className="h-4 w-4" />}>Customer Information</SectionTitle>

                    {hasApprovedEstimate && canSeeCustomerEstimate && (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <p className="text-xs font-medium text-green-800">
                          {customerEstimates.find(
                            (e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved'
                          )?.approval_status === 'approved'
                            ? 'All items approved — proceed with repair.'
                            : 'Partial approval — check approved items in Estimates tab.'}
                        </p>
                      </div>
                    )}

                    <InfoRow label="Customer">
                      <Link to={`/customers/${job.customer_id}`} className="text-blue-600 hover:underline">
                        {displayCustomerName}
                      </Link>
                    </InfoRow>
                    {displayCustomerPhone && (
                      <InfoRow label="Phone">
                        <a href={`tel:${displayCustomerPhone}`} className="flex items-center gap-1 hover:text-blue-600">
                          <Phone className="h-3 w-3" /> {displayCustomerPhone}
                        </a>
                      </InfoRow>
                    )}
                    <InfoRow label="Reported By">{job.reported_by}</InfoRow>
                    {job.additional_phone && (
                      <InfoRow label="Alt. Phone">
                        <a href={`tel:${job.additional_phone}`} className="hover:text-blue-600">
                          {job.additional_phone}
                        </a>
                      </InfoRow>
                    )}
                  </div>

                  {/* Accountant Review / Invoice Info */}
                  {job.invoice_number && (
                    <div className="card p-4 bg-purple-50 border-purple-100">
                      <SectionTitle icon={<Receipt className="h-4 w-4 text-purple-600" />}>
                        <span className="text-purple-900">Accountant Review</span>
                      </SectionTitle>
                      <InfoRow label="Invoice Number">
                        <span className="font-bold text-purple-700">{job.invoice_number}</span>
                      </InfoRow>
                      {job.reviewed_by_name && (
                        <InfoRow label="Reviewed By">
                          {job.reviewed_by_name}
                        </InfoRow>
                      )}
                      {job.reviewed_at && (
                        <InfoRow label="Reviewed At">
                          {formatDateTime(job.reviewed_at)}
                        </InfoRow>
                      )}
                    </div>
                  )}

                  {/* Machine + Fault */}
                  <div className="card p-4">
                    <SectionTitle icon={<Cpu className="h-4 w-4" />}>Machine & Fault</SectionTitle>
                    <InfoRow label="Machine Model">
                      <span className="font-semibold">{(job?.machine_model || "")}</span>
                    </InfoRow>
                    {job.serial_number && <InfoRow label="Serial Number">{job.serial_number}</InfoRow>}
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-xs text-gray-400 mb-1">Fault Description</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                        {job.fault_description}
                      </p>
                    </div>
                    {job.remarks && (
                      <div className="mt-2 pt-2 border-t border-gray-50">
                        <p className="text-xs text-gray-400 mb-1">Remarks</p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">{job.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* Items taken */}
                  <div className="card p-4">
                    <SectionTitle icon={<Box className="h-4 w-4" />}>Items Taken from Customer</SectionTitle>
                    {job.items && (job.items || []).length > 0 ? (
                      <div className="space-y-1.5">
                        {(job.items || []).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {item.returned ? (
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <Box className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="text-sm font-medium text-gray-800 truncate">{item.item_name}</span>
                              <span className="text-xs text-gray-400">×{item.quantity}</span>
                              {item.returned && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">
                                  Returned
                                </span>
                              )}
                            </div>
                            {!item.returned && (
                              <button
                                onClick={() => handleReturnJobItem(item.id)}
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 flex-shrink-0 ml-2"
                              >
                                Mark Returned
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-3">No items recorded</p>
                    )}
                  </div>
                </>
              )}

              {/* ── ESTIMATES TAB ── */}
              {activeTab === 'estimates' && (
                <>
                  {/* Engineer Estimates */}
                  {engineerEstimates.length > 0 ? (
                    <div className="card p-4">
                      <SectionTitle icon={<FileText className="h-4 w-4" />}>Engineer Estimates</SectionTitle>
                      {engineerEstimates.map((estimate) => (
                        <div key={estimate.id} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{estimate.estimate_number}</p>
                              <p className="text-xs text-gray-400">
                                By {estimate.engineer_name} · {formatDateTime(estimate.created_at)}
                              </p>
                            </div>
                          </div>
                          {estimate.technical_notes && (
                            <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-medium text-blue-800">{estimate.technical_notes}</p>
                            </div>
                          )}
                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Description</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Qty</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(estimate.items || []).map((item, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="py-2 px-3">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.item_type === 'part'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-green-100 text-green-700'
                                          }`}
                                      >
                                        {item.item_type === 'part' ? 'Part' : 'Service'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <p className="font-medium text-gray-800">{item.description}</p>
                                      {item.technical_description && (
                                        <p className="text-xs text-gray-400 mt-0.5">{item.technical_description}</p>
                                      )}
                                    </td>
                                    <td className="py-2 px-3 text-center font-medium">{item.quantity}</td>
                                    <td className="py-2 px-3 text-gray-500">{item.notes || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {estimate.additional_notes && (
                            <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                              {estimate.additional_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="card p-4 text-center">
                      <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No engineer estimates yet</p>
                    </div>
                  )}

                  {/* Customer Estimates */}
                  {customerEstimates.length > 0 && canSeeCustomerEstimate && (
                    <div className="card p-4">
                      <SectionTitle icon={<DollarSign className="h-4 w-4" />}>Customer Estimate & Approval</SectionTitle>
                      {customerEstimates.map((estimate) => (
                        <div key={estimate.id} className="mb-4 last:mb-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{estimate.estimate_number}</p>
                              <p className="text-xs text-gray-400">
                                By {estimate.accountant_name} · {formatDateTime(estimate.created_at)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {(user?.role === 'accountant' || user?.role === 'admin') && estimate.approval_status === 'pending' && (
                                <div className="flex gap-2 mr-2">
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
                                </div>
                              )}
                              <StatusBadge status={estimate.approval_status} />
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Description</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Qty</th>
                                  {showPrices && <th className="text-right py-2 px-3 font-medium text-gray-500">Price</th>}
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(estimate.items || []).map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className={`${item.approval_status === 'approved'
                                      ? 'bg-green-50'
                                      : item.approval_status === 'rejected'
                                        ? 'bg-red-50'
                                        : 'hover:bg-gray-50'
                                      }`}
                                  >
                                    <td className="py-2 px-3">
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.item_type === 'part'
                                          ? 'bg-blue-100 text-blue-700'
                                          : 'bg-green-100 text-green-700'
                                          }`}
                                      >
                                        {item.item_type === 'part' ? 'Part' : 'Service'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 font-medium text-gray-800">{item.description}</td>
                                    <td className="py-2 px-3 text-center">{item.quantity}</td>
                                    {showPrices && (
                                      <td className="py-2 px-3 text-right font-medium">
                                        ${item.total_price.toFixed(2)}
                                      </td>
                                    )}
                                    <td className="py-2 px-3 text-center">
                                      {item.approval_status === 'approved' ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                                      ) : item.approval_status === 'rejected' ? (
                                        <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-yellow-500 mx-auto" />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                <tr>
                                  <td colSpan={3} className="py-2 px-3 text-right text-xs font-bold text-gray-700">
                                    Total:
                                  </td>
                                  {showPrices && (
                                    <td className="py-2 px-3 text-right text-xs font-bold text-gray-900">
                                      ${(estimate.items || []).reduce((s, i) => s + i.total_price, 0).toFixed(2)}
                                    </td>
                                  )}
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          {(estimate.approval_status === 'approved' ||
                            estimate.approval_status === 'partially_approved') && (
                              <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-xs font-semibold text-green-800 mb-1">✓ Approved Items</p>
                                {estimate.items
                                  .filter((i) => i.approval_status === 'approved')
                                  .map((i, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-green-700">
                                      <span>• {i.description} (×{i.quantity})</span>
                                      {showPrices && <span className="font-medium">${i.total_price.toFixed(2)}</span>}
                                    </div>
                                  ))}
                                {showPrices && (
                                  <div className="mt-1 pt-1 border-t border-green-200 flex justify-between text-xs font-semibold text-green-900">
                                    <span>Approved Total:</span>
                                    <span>
                                      $
                                      {estimate.items
                                        .filter((i) => i.approval_status === 'approved')
                                        .reduce((s, i) => s + i.total_price, 0)
                                        .toFixed(2)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          {estimate.customer_comments && (
                            <p className="mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
                              <span className="font-medium">Customer comment:</span> {estimate.customer_comments}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Approved parts reminder for engineer */}
                  {hasApprovedEstimate &&
                    isAssignedEngineer &&
                    customerEstimates
                      .filter((e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved')
                      .some((e) => e.items.some((i) => i.approval_status === 'approved' && i.item_type === 'part')) && (
                      <div className="card p-4">
                        <SectionTitle icon={<Package className="h-4 w-4" />}>
                          Customer Approved Parts — Action Required
                        </SectionTitle>
                        {(() => {
                          const availableRequests = partsRequests.flatMap(req =>
                            (req.items || []).map(ri => ({
                              name: ri.part_name?.toLowerCase() || '',
                              qty: ri.quantity_requested || 0,
                              isIssued: ['issued', 'used', 'return_requested', 'returned'].includes(ri.status)
                            }))
                          );

                          return customerEstimates
                            .filter((e) => e.approval_status === 'approved' || e.approval_status === 'partially_approved')
                            .map((estimate) => {
                              const approvedParts = (estimate.items || []).filter(
                                (i) => i.approval_status === 'approved' && i.item_type === 'part'
                              );
                              if (approvedParts.length === 0) return null;
                              return (
                                <div key={estimate.id} className="space-y-1.5 mt-2">
                                  {approvedParts.map((item, idx) => {
                                    let needed = item.quantity;
                                    let issuedCount = 0;
                                    let requestedCount = 0;

                                    for (const req of availableRequests) {
                                      if (req.qty > 0 && (req.name.includes(item.description.toLowerCase()) || item.description.toLowerCase().includes(req.name))) {
                                        const take = Math.min(needed, req.qty);
                                        req.qty -= take;
                                        needed -= take;

                                        if (req.isIssued) {
                                          issuedCount += take;
                                        } else {
                                          requestedCount += take;
                                        }

                                        if (needed === 0) break;
                                      }
                                    }

                                    let statusBadge;
                                    if (issuedCount === item.quantity) {
                                      statusBadge = (
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                          ✓ Issued
                                        </span>
                                      );
                                    } else if (issuedCount + requestedCount === item.quantity) {
                                      statusBadge = (
                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                          ✓ Requested
                                        </span>
                                      );
                                    } else if (issuedCount > 0) {
                                      statusBadge = (
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                          ⚠ Partially Issued
                                        </span>
                                      );
                                    } else if (requestedCount > 0) {
                                      statusBadge = (
                                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                          ⚠ Partially Requested ({requestedCount}/{item.quantity})
                                        </span>
                                      );
                                    } else {
                                      statusBadge = (
                                        <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                                          ⚠ Not Requested
                                        </span>
                                      );
                                    }

                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 bg-orange-50 border border-orange-100 rounded-lg"
                                      >
                                        <span className="text-sm text-gray-800">{item.description} ×{item.quantity}</span>
                                        {statusBadge}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            });
                        })()}
                        <p className="mt-4 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          Use <strong>Request Parts</strong> in the header to request these from the storekeeper.
                        </p>
                      </div>
                    )}
                </>
              )}

              {/* ── PARTS TAB ── */}
              {activeTab === 'parts' && (
                <>
                  {partsRequests.length === 0 ? (
                    <div className="card p-4 text-center">
                      <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No parts requested yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Engineer notice */}
                      {isAssignedEngineer &&
                        partsRequests.some(
                          (r) => r.status === 'approved' || r.status === 'partially_approved'
                        ) && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-800">
                              <strong>Before completing:</strong> Mark all issued parts as Used or request to return
                              them.
                            </p>
                          </div>
                        )}

                      {/* Storekeeper notice */}
                      {(user?.role === 'storekeeper' || user?.role === 'admin') &&
                        partsRequests.some((r) => r.items?.some((i) => i.status === 'return_requested')) && (
                          <div className="flex items-start gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-800">
                              <strong>Action Required:</strong> Parts pending return approval.
                            </p>
                          </div>
                        )}

                      {partsRequests.map((request) => (
                        <div key={request.id} className="card p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{request.request_number}</p>
                              <p className="text-xs text-gray-400">
                                By {request.engineer_name} · {formatDateTime(request.created_at)}
                              </p>
                            </div>
                            <StatusBadge status={request.status} />
                          </div>

                          {request.reason && (
                            <p className="mb-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                              {request.reason}
                            </p>
                          )}

                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium text-gray-500">Part</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Req</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Appr</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Issued</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Used</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Pending Ret</th>
                                  <th className="text-center py-2 px-3 font-medium text-gray-500">Status</th>
                                  {((isAssignedEngineer &&
                                    (request.status === 'approved' || request.status === 'partially_approved')) ||
                                    user?.role === 'storekeeper' ||
                                    user?.role === 'admin') && (
                                      <th className="text-center py-2 px-3 font-medium text-gray-500">Action</th>
                                    )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(request.items || []).map((item) => {
                                  const pendingReturn = item.quantity_pending_return || 0;
                                  const available =
                                    (item.quantity_issued || 0) -
                                    (item.quantity_used || 0) -
                                    (item.quantity_returned || 0) -
                                    pendingReturn;
                                  const canTakeAction =
                                    ['issued', 'approved', 'used', 'return_requested'].includes(item.status) && available > 0;
                                  const needsAction = canTakeAction || item.status === 'return_requested';
                                  const isStorekeeper =
                                    user?.role === 'storekeeper' || user?.role === 'admin';
                                  return (
                                    <tr
                                      key={item.id}
                                      className={`${needsAction ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                                    >
                                      <td className="py-2 px-3">
                                        <p className="font-medium text-gray-800">{item.part_name}</p>
                                        <p className="text-gray-400">{item.part_number}</p>
                                      </td>
                                      <td className="py-2 px-3 text-center">{item.quantity_requested}</td>
                                      <td className="py-2 px-3 text-center">{item.quantity_approved || '—'}</td>
                                      <td className="py-2 px-3 text-center font-medium">
                                        {item.quantity_issued || '—'}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span
                                          className={`font-semibold ${(item.quantity_used || 0) > 0 ? 'text-green-600' : 'text-gray-300'
                                            }`}
                                        >
                                          {item.quantity_used || 0}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span
                                          className={`font-semibold ${pendingReturn > 0 ? 'text-yellow-600' : 'text-gray-300'
                                            }`}
                                        >
                                          {pendingReturn}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${item.status === 'return_requested'
                                            ? 'bg-yellow-100 text-yellow-700'
                                            : item.status === 'returned'
                                              ? 'bg-blue-100 text-blue-700'
                                              : item.status === 'used'
                                                ? 'bg-green-100 text-green-700'
                                                : item.status === 'issued'
                                                  ? 'bg-purple-100 text-purple-700'
                                                  : item.status === 'approved'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                          {item.status.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                      {((isAssignedEngineer &&
                                        (request.status === 'approved' ||
                                          request.status === 'partially_approved')) ||
                                        isStorekeeper) && (
                                          <td className="py-2 px-3 text-center">
                                            <div className="flex gap-1 justify-center">
                                              {isAssignedEngineer && canTakeAction && (
                                                <button
                                                  onClick={() => handleUpdateStatus(item)}
                                                  disabled={processingPart === item.id}
                                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                                                >
                                                  Update
                                                </button>
                                              )}
                                              {isStorekeeper && item.status === 'return_requested' && (
                                                <button
                                                  onClick={() => {
                                                    if (
                                                      window.confirm(
                                                        `Accept return of ${pendingReturn}× ${item.part_name}?`
                                                      )
                                                    )
                                                      handleAcceptReturn(item.id);
                                                  }}
                                                  disabled={processingPart === item.id}
                                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                                                >
                                                  Accept Return
                                                </button>
                                              )}
                                              {!canTakeAction &&
                                                !isStorekeeper &&
                                                available === 0 &&
                                                (item.quantity_used || 0) > 0 && (
                                                  <span className="text-xs text-gray-400">All used</span>
                                                )}
                                              {item.status === 'return_requested' && !isStorekeeper && (
                                                <span className="text-xs text-yellow-600 font-medium">
                                                  Awaiting approval
                                                </span>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {request.storekeeper_notes && (
                            <p className="mt-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                              <strong>Storekeeper:</strong> {request.storekeeper_notes}
                            </p>
                          )}
                          {request.approved_by_name && (
                            <p className="mt-1 text-xs text-gray-400">
                              Approved by {request.approved_by_name} on{' '}
                              {formatDateTime(request.approved_at || '')}
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* ── REPAIR TAB ── */}
              {activeTab === 'repair' && (
                <>
                  {job.work_done || job.tests_performed || job.repair_notes || job.warranty_details ? (
                    <div className="card p-4 space-y-3">
                      <SectionTitle icon={<Wrench className="h-4 w-4" />}>Repair Details</SectionTitle>
                      {job.work_done && (
                        <div>
                          <p className="text-xs text-gray-400 font-medium mb-1">Work Done</p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">{job.work_done}</p>
                        </div>
                      )}
                      {job.tests_performed && (
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-xs text-gray-400 font-medium mb-1">Tests Performed</p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">{job.tests_performed}</p>
                        </div>
                      )}
                      {job.repair_notes && (
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-xs text-gray-400 font-medium mb-1">Repair Notes</p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">{job.repair_notes}</p>
                        </div>
                      )}
                      {job.warranty_details && (
                        <div className="pt-2 border-t border-gray-50">
                          <p className="text-xs text-gray-400 font-medium mb-1">Warranty Details</p>
                          <p className="text-sm text-gray-800 whitespace-pre-line">{job.warranty_details}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="card p-4 text-center">
                      <Wrench className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No repair details recorded yet</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ════ RIGHT SIDEBAR ════ */}
          <div className="space-y-3 overflow-y-auto">

            {/* Classification */}
            <div className="card p-4">
              <SectionTitle icon={<Tag className="h-4 w-4" />}>Classification</SectionTitle>
              <InfoRow label="Type">{job.job_type.replace('_', ' ')}</InfoRow>
              <InfoRow label="Category">{job.job_category}</InfoRow>
            </div>

            {/* Assignment */}
            <div className="card p-4">
              <SectionTitle icon={<Wrench className="h-4 w-4" />}>Assignment</SectionTitle>

              {job.assigned_to_id && (
                <div className="mb-4">
                  <InfoRow label="Engineer">{job.assigned_to_name || 'Unknown'}</InfoRow>
                  {job.assigned_at && <InfoRow label="Assigned At">{formatDateTime(job.assigned_at)}</InfoRow>}
                </div>
              )}

              {canAssign ? (
                <div className="space-y-2 border-t border-gray-100 pt-3 mt-1">
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    {job.assigned_to_id ? 'Reassign Job' : 'Assign Job'}
                  </p>
                  <select
                    value={selectedEngineer || ''}
                    onChange={(e) => setSelectedEngineer(Number(e.target.value))}
                    className="input text-sm py-2 w-full"
                  >
                    <option value="">Select Engineer</option>
                    {engineers.map((eng) => (
                      <option key={eng.id} value={eng.id}>
                        {eng.full_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignJob}
                    disabled={!selectedEngineer || isAssigning || selectedEngineer === job.assigned_to_id}
                    className="w-full py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {isAssigning ? 'Assigning…' : job.assigned_to_id ? 'Reassign' : 'Assign Job'}
                  </button>
                </div>
              ) : !job.assigned_to_id ? (
                <p className="text-xs text-gray-400">Not assigned yet</p>
              ) : null}
            </div>

            {/* Timeline */}
            <div className="card p-4">
              <SectionTitle icon={<Clock className="h-4 w-4" />}>Timeline</SectionTitle>
              <div className="space-y-2">
                {[
                  { label: 'Created', value: job.created_at },
                  { label: 'Assigned', value: job.assigned_at },
                  { label: 'Completed', value: job.completed_at },
                  { label: 'Delivered', value: job.delivered_at },
                ]
                  .filter((t) => t.value)
                  .map((t) => (
                    <div key={t.label} className="flex items-start gap-2">
                      <ChevronRight className="h-3 w-3 text-blue-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-400">{t.label}</p>
                        <p className="text-xs text-gray-700 font-medium">{formatDateTime(t.value!)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Parts warning for engineer */}
            {isAssignedEngineer &&
              partsRequests.some((req) =>
                (req.status === 'approved' || req.status === 'partially_approved') &&
                (req.items || []).some(
                  (item) =>
                    (item.quantity_issued || 0) >
                    (item.quantity_used || 0) + (item.quantity_returned || 0)
                )
              ) && (
                <div className="px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-800 mb-0.5">⚠ Parts Pending</p>
                  <p className="text-xs text-yellow-700">Complete all parts usage before marking complete.</p>
                </div>
              )}
          </div>
        </div>

        {/* Modals — unchanged */}
        <PartsRequestModal
          isOpen={showPartsModal}
          onClose={() => setShowPartsModal(false)}
          jobId={job.id}
          jobNumber={job.job_number}
          onSuccess={fetchPartsRequests}
          preselectedParts={getUnrequestedApprovedParts()}
        />
        <PartsStatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onConfirm={handleConfirmStatusUpdate}
          item={selectedPartItem}
          isAcceptedByCustomer={
            selectedPartItem
              ? customerEstimates.some((e) =>
                (e.approval_status === 'approved' || e.approval_status === 'partially_approved') &&
                e.items.some((i) =>
                  i.approval_status === 'approved' &&
                  i.item_type === 'part' &&
                  i.part_id === selectedPartItem.part_id
                )
              )
              : false
          }
        />
        <EngineerEstimateModal
          isOpen={showEstimateModal}
          onClose={() => setShowEstimateModal(false)}
          jobId={job.id}
          jobNumber={job.job_number}
          onSuccess={fetchEngineerEstimates}
        />
        <JobCompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          jobId={job.id}
          onSuccess={() => { fetchJob(); setShowCompletionModal(false); }}
          jobNumber={job.job_number}
        />
        <AccountantReviewModal
          isOpen={showAccountantReviewModal}
          onClose={() => setShowAccountantReviewModal(false)}
          onApprove={handleAccountantReview}
          job={job}
          partsRequests={partsRequests}
          customerEstimates={customerEstimates}
        />
        <StartRepairModal
          isOpen={showStartRepairModal}
          onClose={() => setShowStartRepairModal(false)}
          jobId={job.id}
          currentEngineerId={job.assigned_to_id || undefined}
          onSuccess={() => {
            setShowStartRepairModal(false);
            fetchJob();
          }}
        />
        <DeliveryModal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          onDeliver={handleDeliverJob}
          job={job}
        />
        <ManualApprovalModal
          isOpen={manualApproveId !== null}
          onClose={() => setManualApproveId(null)}
          estimateId={manualApproveId}
          onSuccess={() => {
            fetchJob();
            fetchCustomerEstimates();
          }}
        />
      </div>

      <PrintableJobDetail
        job={job}
        customerEstimates={customerEstimates}
        partsRequests={partsRequests}
        handovers={handovers}
      />
    </>
  );
};

export default JobDetail;
