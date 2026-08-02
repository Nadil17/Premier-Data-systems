// -----------------------------------------------------------------------------
// Shared domain types for Premier Data Systems
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Auth / User
// -----------------------------------------------------------------------------

export interface User {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active?: boolean;
}

export type UserRole = 'admin' | 'manager' | 'front_desk' | 'engineer' | 'storekeeper' | 'accountant';

export interface Customer {
  id: number;
  name: string;
  customer_id: string;
  company_name?: string;
  phone_1?: string;
  phone_2?: string;
  phone_3?: string;
  email?: string;
  address?: string;
  category?: string;
  tax_number?: string;
  vat_number?: string;
  website?: string;
  remarks?: string;
  created_at?: string;
  jobs?: JobSummary[];
}

export type CustomerCreate = Omit<Customer, 'id' | 'customer_id' | 'created_at' | 'jobs'>;

export interface JobItem {
  id: number;
  item_name: string;
  quantity: number;
  returned: boolean;
  notes?: string;
}

export interface Job {
  [key: string]: any;
  id: number;
  job_number: string;
  status: string;
  job_type: string;
  job_category?: string;
  customer_id?: number;

  // Customer info (flat fields)
  customer_name?: string;
  customer_phone?: string;
  reported_by?: string;
  additional_phone?: string;

  // Nested customer object (alternative representation)
  customer?: Customer;

  // Machine details
  brand_name?: string;
  model_name?: string;
  machine_model?: string;
  machine_category_name?: string;
  serial_number?: string;

  // Assignment
  assigned_to_name?: string;
  assigned_to_id?: number;
  has_pending_handover?: boolean;
  assigned_at?: string;

  // Timestamps
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  delivered_at?: string;
  invoice_number?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;

  // Descriptions
  fault_description?: string;
  remarks?: string;
  work_done?: string;
  tests_performed?: string;
  repair_notes?: string;
  warranty_details?: string;

  // Items taken from customer
  items?: JobItem[];
  used_parts?: Array<{
    id: number;
    part_id: number;
    part_name?: string;
    serial_number: string;
    warranty_period: string;
  }>;
}

export type JobSummary = Job;
export interface JobItemCreate { item_name: string; quantity: number; notes?: string; }
export type JobCreate = Omit<Job, 'id' | 'job_number' | 'status' | 'created_at' | 'updated_at' | 'items'> & { items?: JobItemCreate[] };
export interface JobHistory { id: number; job_number: string; fault_description: string; parts?: PartsRequestItem[]; [key: string]: any; }

// -----------------------------------------------------------------------------
// Customer Estimates
// -----------------------------------------------------------------------------

export interface CustomerEstimateItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  item_type: EstimateItemType;
  part_id?: number;
  item_comments?: string;
  technical_description?: string;
  notes?: string;
}

export interface CustomerEstimate {
  id: number;
  estimate_number: string;
  approval_status: 'pending' | 'approved' | 'partially_approved' | 'rejected';
  items: CustomerEstimateItem[];
  created_at: string;
  updated_at?: string;
  job_id?: number;
  job_number?: string;
  customer_name?: string;
  notes?: string;
  special_notes?: string;
  accountant_name?: string;
  accountant?: any;
  job?: Job;
  customer_comments?: string;
  subtotal?: number;
  include_tax?: boolean;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
}

export type EstimateItemType = 'part' | 'labor' | 'service' | 'other';
export type CustomerEstimateItemForm = Omit<CustomerEstimateItem, 'id' | 'estimate_id' | 'total_price' | 'approval_status'> & {
  part_name?: string;
  fromEngineerEstimate?: boolean;
};
export interface EngineerEstimate { id: number; job_id: number; items: CustomerEstimateItem[]; [key: string]: any; }

// -----------------------------------------------------------------------------
// Parts Requests
// -----------------------------------------------------------------------------

export interface PartsRequestItem {
  id: number;
  part_id?: number;
  part_name?: string;
  part_number?: string;
  quantity_requested: number;
  quantity_issued?: number;
  quantity_approved?: number;
  quantity_used?: number;
  quantity_returned?: number;
  quantity_pending_return?: number;
  status: 'pending' | 'approved' | 'issued' | 'used' | 'rejected' | 'return_requested' | 'returned';
}

export interface PartsRequest {
  id: number;
  job_id?: number;
  requested_by_name?: string;
  status: string;
  request_number?: string;
  job_number?: string;
  engineer_name?: string;
  reason?: string;
  storekeeper_notes?: string;
  approved_by_name?: string;
  approved_at?: string;
  total_items?: number;
  items: PartsRequestItem[];
  created_at: string;
  updated_at?: string;
  notes?: string;
}

// -----------------------------------------------------------------------------
// Parts Handovers
// -----------------------------------------------------------------------------

export interface PartsHandoverResponse {
  id: number;
  job_id?: number;
  from_user_name?: string;
  to_user_name?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  previous_engineer_id: number;
  new_engineer_id: number;
  part_id?: number;
  request_item_id?: number;
  quantity: number;
  part_name?: string;
  part_number?: string;
  previous_engineer_name?: string;
  new_engineer_name?: string;
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

export interface Notification {
  id: number;
  message: string;
  notification_type?: string;
  is_read: boolean;
  created_at: string;
  job_id?: number;
  recipient_id?: number;
  title?: string;
}

export interface LookupItem { id: number; name: string; created_at?: string; }
export interface Part { id: number; part_number: string; name: string; quantity_in_stock: number; minimum_stock_level: number; unit_price: number; [key: string]: any; }
export type PartCreate = Omit<Part, 'id' | 'created_at' | 'updated_at'>;
export type PartUpdate = Partial<PartCreate>;
export interface Product { id: number; name: string; unit_price: number; quantity_in_stock: number; [key: string]: any; }
export type ProductCreate = Omit<Product, 'id' | 'created_at'>;
export type ProductUpdate = Partial<ProductCreate>;
export type PartsRequestItemResponse = PartsRequestItem;
export type PartsRequestSummary = PartsRequest;
