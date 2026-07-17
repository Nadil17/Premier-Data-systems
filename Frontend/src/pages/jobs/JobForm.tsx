import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft, Search, AlertCircle, Plus, Trash2, ChevronDown, ChevronUp,
  Clock, Wrench, Package, X, User, Tag, Cpu, FileText, Layers,
} from 'lucide-react';
import { jobsAPI, customersAPI, productsAPI } from '../../api/endpoints';
import type { JobCreate, Customer, JobItemCreate, JobHistory, LookupItem, Product } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import SearchableSelect from '../../components/common/SearchableSelect';
import { getErrorMessage } from '../../utils/apiErrors';
import toast from 'react-hot-toast';

interface JobFormData {
  customer_id: number;
  reported_by: string;
  additional_phone?: string;
  brand_id?: string;
  model_id?: string;
  machine_category_id?: string;
  machine_model: string;
  serial_number?: string;
  fault_description: string;
  job_type: 'in_house' | 'field';
  job_category: 'warranty' | 'chargeable' | 'agreement';
  remarks?: string;
}

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
  icon, title, subtitle,
}) => (
  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
    <span className="text-blue-500">{icon}</span>
    <div>
      <h3 className="text-sm font-semibold text-gray-800 leading-tight">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  </div>
);

const FieldLabel: React.FC<{ htmlFor?: string; required?: boolean; children: React.ReactNode }> = ({
  htmlFor, required, children,
}) => (
  <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const JobForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedCustomerId = searchParams.get('customer_id');

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previousJobs, setPreviousJobs] = useState<JobHistory[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [items, setItems] = useState<JobItemCreate[]>([]);
  const [productCatalog, setProductCatalog] = useState<Product[]>([]);
  const [isLoadingProductCatalog, setIsLoadingProductCatalog] = useState(false);
  const [showItemsPanel, setShowItemsPanel] = useState(false);

  // Lookup state for brand, model, category
  const [brands, setBrands] = useState<LookupItem[]>([]);
  const [models, setModels] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<JobFormData>({
    defaultValues: {
      job_type: 'in_house',
      job_category: 'chargeable',
    },
  });

  const serialNumber = watch('serial_number');
  const selectedBrandId = watch('brand_id');
  const selectedModelId = watch('model_id');
  const selectedCategoryId = watch('machine_category_id');
  const selectedMachineModel = watch('machine_model');

  useEffect(() => {
    if (preSelectedCustomerId) {
      loadCustomerById(Number(preSelectedCustomerId));
    }
    fetchLookups();
  }, [preSelectedCustomerId]);

  useEffect(() => {
    if (customerSearch.length > 0) {
      const query = customerSearch.toLowerCase();
      setFilteredCustomers(
        allCustomers.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            (c.customer_id || "").toLowerCase().includes(query) ||
            c.phone_1?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query) ||
            c.company_name?.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredCustomers(allCustomers);
    }
  }, [customerSearch, allCustomers]);

  useEffect(() => {
    if (serialNumber && serialNumber.length > 3) {
      checkPreviousJobs(serialNumber);
    } else {
      setPreviousJobs([]);
    }
  }, [serialNumber]);

  const loadCustomerById = async (id: number) => {
    try {
      const customer = await customersAPI.getById(id);
      setSelectedCustomer(customer);
      setValue('customer_id', customer.id);
      setValue('reported_by', customer.name);
    } catch {
      toast.error('Failed to load customer');
    }
  };

  const loadAllCustomers = async () => {
    if (customersLoaded) return;
    setIsLoadingCustomers(true);
    try {
      const results = await customersAPI.search("");
      setAllCustomers(results);
      setFilteredCustomers(results);
      setCustomersLoaded(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setValue('customer_id', customer.id);
    setValue('reported_by', customer.name);
    setCustomerSearch('');
    setShowCustomerDropdown(false);
  };

  const checkPreviousJobs = async (serial: string) => {
    setIsLoadingHistory(true);
    try {
      const history = await jobsAPI.getHistoryBySerial(serial);
      setPreviousJobs(history);
    } catch (error) {
      console.error('Failed to check previous jobs:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchLookups = async () => {
    setIsLoadingProductCatalog(true);
    try {
      const [brandsResult, modelsResult, categoriesResult, productsResult] = await Promise.allSettled([
        productsAPI.getBrands(),
        productsAPI.getModels(),
        productsAPI.getCategories(),
        productsAPI.getAll(0, 1000),
      ]);
      if (brandsResult.status === 'fulfilled') setBrands(brandsResult.value);
      if (modelsResult.status === 'fulfilled') setModels(modelsResult.value);
      if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
      if (productsResult.status === 'fulfilled') {
        setProductCatalog(Array.isArray(productsResult.value) ? productsResult.value : []);
      }
    } catch (error) {
      console.error('Failed to fetch lookups:', error);
    } finally {
      setIsLoadingProductCatalog(false);
    }
  };

  const handleLookupCreate = async (type: 'brand' | 'model' | 'category', name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    try {
      let created: LookupItem;
      if (type === 'brand') {
        created = await productsAPI.createBrand(trimmedName);
        setBrands((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('brand_id', String(created.id));
        setNewBrandName('');
        setShowNewBrand(false);
      } else if (type === 'model') {
        created = await productsAPI.createModel(trimmedName);
        setModels((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('model_id', String(created.id));
        setNewModelName('');
        setShowNewModel(false);
      } else {
        created = await productsAPI.createCategory(trimmedName);
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue('machine_category_id', String(created.id));
        setNewCategoryName('');
        setShowNewCategory(false);
      }
      toast.success(`${created.name} added`);
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to create ${type}`));
    }
  };

  const addItem = () => {
    setItems([...items, { item_name: '', quantity: 1, notes: '' }]);
    setShowItemsPanel(true);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof JobItemCreate, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const onSubmit = async (data: JobFormData) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    setIsSaving(true);
    try {
      const jobData: JobCreate = {
        customer_id: data.customer_id,
        reported_by: data.reported_by,
        additional_phone: data.additional_phone || undefined,
        brand_id: data.brand_id ? Number(data.brand_id) : undefined,
        model_id: data.model_id ? Number(data.model_id) : undefined,
        machine_category_id: data.machine_category_id ? Number(data.machine_category_id) : undefined,
        machine_model: data.machine_model,
        serial_number: data.serial_number || undefined,
        fault_description: data.fault_description,
        job_type: data.job_type,
        job_category: data.job_category,
        remarks: data.remarks || undefined,
        items: items.filter((item) => item.item_name.trim() !== ''),
      };

      const newJob = await jobsAPI.create(jobData);
      toast.success(`Job ${newJob.job_number} created successfully`);
      navigate(`/jobs/${newJob.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create job'));
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const machineModelOptions = Array.from(
    new Map(
      productCatalog
        .filter((product) => {
          if (!selectedBrandId && !selectedModelId && !selectedCategoryId) return true;
          if (selectedBrandId && product.brand_id !== Number(selectedBrandId)) return false;
          if (selectedModelId && product.model_id !== Number(selectedModelId)) return false;
          if (selectedCategoryId && product.category_id !== Number(selectedCategoryId)) return false;
          return true;
        })
        .map((product) => [product.name.trim().toLowerCase(), product])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (!selectedMachineModel) return;
    const isStillValid = machineModelOptions.some((product) => product.name === selectedMachineModel);
    if (!isStillValid) {
      setValue('machine_model', '');
    }
  }, [selectedBrandId, selectedModelId, selectedCategoryId, selectedMachineModel, machineModelOptions, setValue]);

  const LookupField = ({
    label,
    registerName,
    options,
    value,
    onChange,
    showNew,
    newValue,
    setNewValue,
    setShowNew,
    type,
    placeholder,
  }: {
    label: string;
    registerName: 'brand_id' | 'model_id' | 'machine_category_id';
    options: { id: number; name: string }[];
    value: string | undefined;
    onChange: (val: string | number | undefined) => void;
    showNew: boolean;
    newValue: string;
    setNewValue: (v: string) => void;
    setShowNew: (v: boolean) => void;
    type: 'brand' | 'model' | 'category';
    placeholder: string;
  }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input type="hidden" {...register(registerName)} />
      {showNew ? (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="input text-sm py-1.5 flex-1"
            placeholder={`New ${label.toLowerCase()}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLookupCreate(type, newValue);
              }
            }}
          />
          <button
            type="button"
            onClick={() => handleLookupCreate(type, newValue)}
            className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => { setShowNew(false); setNewValue(''); }}
            className="px-2 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <SearchableSelect
            options={options}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 border border-gray-200"
            title={`Add new ${label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* ── Sticky page header ── */}
      <div className="flex items-center justify-between px-1 pb-3 border-b border-gray-200 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/jobs')}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">New Job</h1>
            <p className="text-xs text-gray-500">Create a new repair job</p>
          </div>
        </div>

        {/* Action buttons in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="job-create-form"
            disabled={isSaving || !selectedCustomer}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                Creating...
              </>
            ) : (
              'Create Job'
            )}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <form id="job-create-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

        {/* ════ LEFT COLUMN ════ */}
        <div className="space-y-3">

          {/* Customer Selection */}
          <div className="card p-4">
            <SectionHeader icon={<User className="h-4 w-4" />} title="Customer" subtitle="Select who is bringing in the job" />

            {selectedCustomer ? (
              <div className="flex items-start justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedCustomer.customer_id}
                    {selectedCustomer.phone_1 && <span className="ml-2">· {selectedCustomer.phone_1}</span>}
                    {selectedCustomer.email && <span className="ml-2">· {selectedCustomer.email}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomer(null); setValue('customer_id', 0); }}
                  className="ml-3 text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => { loadAllCustomers(); setShowCustomerDropdown(true); }}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    className="input pl-8 text-sm py-2"
                    placeholder="Search by name, phone, or customer ID…"
                  />
                </div>
                {showCustomerDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {isLoadingCustomers ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" /> Loading customers…
                      </div>
                    ) : filteredCustomers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No customers found</div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => selectCustomer(customer)}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <p className="font-medium text-gray-900 text-sm">{customer.name}</p>
                          <p className="text-xs text-gray-500">
                            {(customer?.customer_id || "")} · {customer.phone_1}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <input type="hidden" {...register('customer_id', { required: true, min: 1 })} />

            {/* Reported By + Phone inline */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <FieldLabel htmlFor="reported_by" required>Reported By</FieldLabel>
                <input
                  type="text"
                  id="reported_by"
                  {...register('reported_by', { required: 'Reported by is required' })}
                  className="input text-sm py-2"
                  placeholder="Contact person name"
                />
                {errors.reported_by && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.reported_by.message}</p>
                )}
              </div>
              <div>
                <FieldLabel htmlFor="additional_phone">Alt. Phone</FieldLabel>
                <input
                  type="tel"
                  id="additional_phone"
                  {...register('additional_phone')}
                  className="input text-sm py-2"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Machine Details */}
          <div className="card p-4">
            <SectionHeader icon={<Cpu className="h-4 w-4" />} title="Machine Details" subtitle="Device identification" />

            <div className="grid grid-cols-2 gap-3">
              <LookupField
                label="Brand"
                registerName="brand_id"
                options={brands.map((b) => ({ id: b.id, name: b.name }))}
                value={selectedBrandId}
                onChange={(val) => setValue('brand_id', val ? String(val) : '')}
                showNew={showNewBrand}
                newValue={newBrandName}
                setNewValue={setNewBrandName}
                setShowNew={setShowNewBrand}
                type="brand"
                placeholder="Select Brand"
              />
              <LookupField
                label="Model Series"
                registerName="model_id"
                options={models.map((m) => ({ id: m.id, name: m.name }))}
                value={selectedModelId}
                onChange={(val) => setValue('model_id', val ? String(val) : '')}
                showNew={showNewModel}
                newValue={newModelName}
                setNewValue={setNewModelName}
                setShowNew={setShowNewModel}
                type="model"
                placeholder="Select Model"
              />
              <LookupField
                label="Category"
                registerName="machine_category_id"
                options={categories.map((c) => ({ id: c.id, name: c.name }))}
                value={selectedCategoryId}
                onChange={(val) => setValue('machine_category_id', val ? String(val) : '')}
                showNew={showNewCategory}
                newValue={newCategoryName}
                setNewValue={setNewCategoryName}
                setShowNew={setShowNewCategory}
                type="category"
                placeholder="Select Category"
              />
              <div>
                <FieldLabel htmlFor="serial_number">Serial Number</FieldLabel>
                <input
                  type="text"
                  id="serial_number"
                  {...register('serial_number')}
                  className="input text-sm py-2"
                  placeholder="e.g. SN123456"
                />
                {isLoadingHistory && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                    <LoadingSpinner size="sm" /> Checking history…
                  </div>
                )}
              </div>
            </div>

            {/* Machine Model (full width) */}
            <div className="mt-3">
              <FieldLabel required>Machine Model</FieldLabel>
              <input type="hidden" {...register('machine_model', { required: 'Machine model is required' })} />
              <SearchableSelect
                options={machineModelOptions.map((p) => ({ id: p.name, name: p.name }))}
                value={selectedMachineModel}
                onChange={(val) => setValue('machine_model', val ? String(val) : '')}
                placeholder={
                  isLoadingProductCatalog
                    ? 'Loading…'
                    : machineModelOptions.length === 0
                      ? 'No models found'
                      : 'Search / Select Machine Model'
                }
                disabled={isLoadingProductCatalog || machineModelOptions.length === 0}
                error={!!errors.machine_model}
              />
              {errors.machine_model && (
                <p className="mt-0.5 text-xs text-red-600">{errors.machine_model.message}</p>
              )}
              {(selectedBrandId || selectedModelId || selectedCategoryId) &&
                !isLoadingProductCatalog &&
                machineModelOptions.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No models match these filters. Adjust or add in Products.
                  </p>
                )}
            </div>

            {/* Previous Job History */}
            {previousJobs.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-amber-200">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-700">
                    {previousJobs.length} previous job{previousJobs.length !== 1 ? 's' : ''} for this serial
                  </p>
                </div>
                <div className="divide-y divide-amber-100 max-h-40 overflow-y-auto">
                  {previousJobs.map((job) => (
                    <div key={job.job_number}>
                      <button
                        type="button"
                        onClick={() => setExpandedJobId(expandedJobId === job.job_number ? null : job.job_number)}
                        className="w-full flex items-center justify-between px-3 py-2 hover:bg-amber-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span className="text-xs font-medium text-gray-800">{job.job_number}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={job.status} />
                          {expandedJobId === job.job_number ? (
                            <ChevronUp className="h-3 w-3 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </button>
                      {expandedJobId === job.job_number && (
                        <div className="px-3 pb-3 pt-1 bg-white border-t border-amber-100 space-y-2">
                          <div>
                            <p className="text-xs text-gray-400 uppercase font-medium">Fault</p>
                            <p className="text-xs text-gray-700 mt-0.5">{job.fault_description}</p>
                          </div>
                          {job.work_done && (
                            <div>
                              <div className="flex items-center gap-1 mb-0.5">
                                <Wrench className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-400 uppercase font-medium">Work Done</p>
                              </div>
                              <p className="text-xs text-gray-700">{job.work_done}</p>
                            </div>
                          )}
                          {(job.parts || []).length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Package className="h-3 w-3 text-gray-400" />
                                <p className="text-xs text-gray-400 uppercase font-medium">Parts Used</p>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="text-left py-1 px-2 text-gray-400 font-medium">Part</th>
                                      <th className="text-center py-1 px-2 text-gray-400 font-medium">Qty</th>
                                      <th className="text-left py-1 px-2 text-gray-400 font-medium">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(job.parts || []).map((part, idx) => (
                                      <tr key={idx} className="border-b last:border-0 border-gray-50">
                                        <td className="py-1 px-2 text-gray-700 whitespace-nowrap">{part.part_name}</td>
                                        <td className="py-1 px-2 text-center text-gray-600">{part.quantity_used}</td>
                                        <td className="py-1 px-2"><StatusBadge status={part.status} /></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT COLUMN ════ */}
        <div className="space-y-3">

          {/* Fault Description */}
          <div className="card p-4">
            <SectionHeader icon={<FileText className="h-4 w-4" />} title="Fault & Remarks" subtitle="Customer-reported issue" />

            <div>
              <FieldLabel htmlFor="fault_description" required>Fault Description</FieldLabel>
              <textarea
                id="fault_description"
                {...register('fault_description', { required: 'Fault description is required' })}
                rows={4}
                className="input text-sm"
                placeholder="Describe the issue reported by the customer…"
              />
              {errors.fault_description && (
                <p className="mt-0.5 text-xs text-red-600">{errors.fault_description.message}</p>
              )}
            </div>

            <div className="mt-3">
              <FieldLabel htmlFor="remarks">Remarks</FieldLabel>
              <textarea
                id="remarks"
                {...register('remarks')}
                rows={2}
                className="input text-sm"
                placeholder="Additional notes or special instructions…"
              />
            </div>
          </div>

          {/* Job Classification */}
          <div className="card p-4">
            <SectionHeader icon={<Tag className="h-4 w-4" />} title="Job Classification" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="job_type" required>Job Type</FieldLabel>
                <select
                  id="job_type"
                  {...register('job_type', { required: true })}
                  className="input text-sm py-2"
                >
                  <option value="in_house">In-house</option>
                  <option value="field">Field Service</option>
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="job_category" required>Job Category</FieldLabel>
                <select
                  id="job_category"
                  {...register('job_category', { required: true })}
                  className="input text-sm py-2"
                >
                  <option value="warranty">Warranty</option>
                  <option value="chargeable">Chargeable</option>
                  <option value="agreement">Agreement</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items Taken — Collapsible */}
          <div className="card p-4">
            <button
              type="button"
              onClick={() => setShowItemsPanel(!showItemsPanel)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-blue-500"><Layers className="h-4 w-4" /></span>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">
                    Items Taken
                    {items.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {items.length}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">Accessories received with the machine</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); addItem(); }}
                  className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
                {showItemsPanel ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </button>

            {showItemsPanel && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">
                    No items added yet. Click <strong>Add</strong> to record accessories.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-2 items-start p-2 bg-gray-50 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                              className="input text-xs py-1.5"
                              placeholder="Item name (e.g. Charger)"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="input text-xs py-1.5"
                              placeholder="Qty"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => updateItem(index, 'notes', e.target.value)}
                              className="input text-xs py-1.5"
                              placeholder="Notes (optional)"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg flex-shrink-0"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default JobForm;
