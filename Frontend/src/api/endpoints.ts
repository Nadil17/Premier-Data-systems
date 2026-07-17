import apiClient from './axios';

// Pages consume response bodies directly. The shared client handles the base
// URL, auth header, response unwrapping, and expired-session cleanup.
const api: any = apiClient;

// ─────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────
export const authAPI = {
  login: ({ username, password }: { username: string; password: string }) =>
    api.post('/auth/login', new URLSearchParams({ username, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  getMe: () => api.get('/auth/me'),
};

// ─────────────────────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────────────────────
export const jobsAPI = {
  getAll: (skip = 0, limit = 100, params?: any) =>
    api.get('/jobs', { params: { skip, limit, ...params } }),
  getById: (id: number) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: number, data: any) => api.put(`/jobs/${id}`, data),

  // Assign / start repair
  assign: (id: number, data: any) => api.post(`/jobs/${id}/assign`, data),
  assignEngineer: (id: number, engineerId: number) =>
    api.post(`/jobs/${id}/assign`, { engineer_id: engineerId }),
  startRepair: (id: number, engineerId: number) =>
    api.post(`/jobs/${id}/start-repair`, { engineer_id: engineerId }),

  // Completion flow
  checkCompletion: (id: number) => api.get(`/jobs/${id}/completion-check`),
  complete: (id: number, data: any) => api.post(`/jobs/${id}/complete`, data),
  completeJob: (id: number, data: any) => api.post(`/jobs/${id}/complete`, data),

  // Accountant review with invoice
  accountantReview: (id: number, invoiceNumber: string) =>
    api.post(`/jobs/${id}/accountant-review`, { invoice_number: invoiceNumber }),

  // Delivery
  deliver: (id: number, data: any) => api.post(`/jobs/${id}/deliver`, data),
  deliverJob: (id: number, returnedIds: number[]) =>
    api.post(`/jobs/${id}/deliver`, { returned_item_ids: returnedIds }),

  // Items
  returnItem: (id: number, itemId: number) =>
    api.put(`/jobs/${id}/items/${itemId}/return`),

  // Parts requests for a job
  getJobPartsRequests: (id: number) => api.get(`/jobs/${id}/parts-requests`),

  // History
  getHistory: (id: number) => api.get(`/jobs/${id}/history`),
  getHistoryBySerial: (serial: string) => api.get(`/jobs/history/${serial}`),
};

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────
export const customersAPI = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: number, data: any) => api.put(`/customers/${id}`, data),
  search: (params?: any) => api.get('/customers/search', { params }),
  delete: (id: number) => api.delete(`/customers/${id}`),
};

// ─────────────────────────────────────────────────────────────
// PARTS (inventory)
// ─────────────────────────────────────────────────────────────
export const partsAPI = {
  getAll: (skip = 0, limit = 200, params?: any) =>
    // The backend validates inventory limits to a maximum of 1000.
    api.get('/parts/inventory', { params: { skip, limit: Math.min(limit, 1000), ...params } }),
  getById: (id: number) => api.get(`/parts/inventory/${id}`),
  create: (data: any) => api.post('/parts/inventory', data),
  update: (id: number, data: any) => api.put(`/parts/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/parts/inventory/${id}`),

  // Lookup lists
  getBrands: () => api.get('/parts/brands'),
  getModels: () => api.get('/parts/models'),
  getCategories: () => api.get('/parts/categories'),
  createBrand: (name: string) => api.post('/parts/brands', { name }),
  createModel: (name: string) => api.post('/parts/models', { name }),
  createCategory: (name: string) => api.post('/parts/categories', { name }),
};

// ─────────────────────────────────────────────────────────────
// PARTS REQUESTS
// ─────────────────────────────────────────────────────────────
export const partsRequestsAPI = {
  getAll: (skip = 0, limit = 100) =>
    api.get('/parts/requests', { params: { skip, limit } }),
  getById: (id: number) => api.get(`/parts/requests/${id}`),
  getByJob: (jobId: number) => api.get(`/jobs/${jobId}/parts-requests`),
  create: (data: any) => api.post('/parts/requests', data),
  approve: (id: number, data: any) =>
    api.post(`/parts/requests/${id}/approve`, data),
  updateStatus: (id: number, data: any) =>
    api.put(`/parts/requests/${id}`, data),

  // Item-level actions
  markItemUsed: (itemId: number, quantityUsed: number) =>
    api.post(`/parts/requests/items/${itemId}/mark-used`, {
      item_id: itemId,
      quantity_used: quantityUsed,
    }),
  returnItem: (itemId: number, quantityReturned: number) =>
    api.post(`/parts/requests/items/${itemId}/return`, {
      item_id: itemId,
      quantity_returned: quantityReturned,
    }),
  acceptReturn: (itemId: number) =>
    api.post(`/parts/requests/items/${itemId}/accept-return`),
};

// ─────────────────────────────────────────────────────────────
// HANDOVERS
// ─────────────────────────────────────────────────────────────
export const handoversAPI = {
  getByJob: (jobId: number) => api.get(`/jobs/${jobId}/handovers`),
  getJobHandovers: (jobId: number) => api.get(`/jobs/${jobId}/handovers`),
  create: (_jobId: number, data: any) => api.post('/handovers', data),
  transfer: (id: number, notes?: string) => api.post(`/handovers/${id}/transfer`, { notes }),
  returnToStore: (id: number, notes?: string) => api.post(`/handovers/${id}/return`, { notes }),
  confirmReceipt: (id: number, notes?: string) => api.post(`/handovers/${id}/confirm`, { notes }),
};

// ─────────────────────────────────────────────────────────────
// ENGINEER ESTIMATES
// ─────────────────────────────────────────────────────────────
export const engineerEstimatesAPI = {
  getByJob: (jobId: number) => api.get(`/estimates/job/${jobId}/engineer`),
  getPending: () => api.get('/estimates/engineer/pending'),
  create: (data: any) => api.post('/estimates/engineer', data),
  update: (id: number, data: any) => api.put(`/estimates/engineer/${id}`, data),
  delete: (id: number) => api.delete(`/estimates/engineer/${id}`),
};

// ─────────────────────────────────────────────────────────────
// CUSTOMER ESTIMATES
// ─────────────────────────────────────────────────────────────
export const customerEstimatesAPI = {
  getAll: (skip = 0, limit = 50) =>
    api.get('/estimates/customer', { params: { skip, limit } }),
  getByJob: (jobId: number) => api.get(`/estimates/job/${jobId}/customer`),
  getById: (id: number) => api.get(`/estimates/customer/${id}`),
  create: (data: any) => api.post('/estimates/customer', data),
  update: (id: number, data: any) => api.put(`/estimates/customer/${id}`, data),
  sendEmail: (id: number, data: any) =>
    api.post(`/estimates/customer/${id}/send-email`, data),
  manualApprove: (id: number, data: any) =>
    api.post(`/estimates/customer/${id}/manual-approve`, data),

  // OTP-based customer verification (public)
  getPublic: (token: string) =>
    api.get(`/estimates/customer/verify/${token}`),
  verifyOtp: (token: string, data: any) =>
    api.post(`/estimates/customer/verify/${token}/otp`, data),
  sendToCustomer: (id: number, data: any = {}) =>
    api.post(`/estimates/customer/${id}/send-email`, data),
  verifyOTP: (data: any) => api.post('/estimates/customer/verify', data),
  approve: (estimateNumber: string, data: any) =>
    api.post(`/estimates/customer/verify/${estimateNumber}/approve`, data),
};

// ─────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (skipOrParams?: number | any, limit = 100, role?: string) =>
    api.get('/auth/users', { params: typeof skipOrParams === 'object' ? skipOrParams : { skip: skipOrParams ?? 0, limit, role } }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  changePassword: (id: number, data: any) =>
    api.put(`/users/${id}/change-password`, data),
};

// ─────────────────────────────────────────────────────────────
// PRODUCTS (lookup tables: brands, models, categories)
// ─────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (skipOrParams?: number | any, limit = 100) =>
    api.get('/products', { params: typeof skipOrParams === 'object' ? skipOrParams : { skip: skipOrParams ?? 0, limit } }),
  getBrands: () => api.get('/products/brands'),
  getModels: (brandId?: number) =>
    api.get('/products/models', { params: brandId ? { brand_id: brandId } : undefined }),
  getCategories: () => api.get('/products/categories'),
  create: (data: any) => api.post('/products', data),
  update: (id: number, data: any) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  createBrand: (name: string) => api.post('/products/brands', { name }),
  createModel: (name: string) => api.post('/products/models', { name }),
  createCategory: (name: string) => api.post('/products/categories', { name }),
};

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (skip = 0, limit = 50) =>
    api.get('/notifications', { params: { skip, limit } }),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// ─────────────────────────────────────────────────────────────
// WHATSAPP
// ─────────────────────────────────────────────────────────────
export const whatsappAPI = {
  getStatus: () => api.get('/whatsapp/status'),
  getQrImage: () => api.get('/whatsapp/qr'),
  restart: () => api.post('/whatsapp/restart'),
  logout: () => api.post('/whatsapp/logout'),
  testMessage: (phone: string) => api.post('/whatsapp/test', { phone }),
};

// ─────────────────────────────────────────────────────────────
// DASHBOARDS
// ─────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getManagerDashboard: () => api.get('/dashboards/manager'),
  getEngineerDashboard: () => api.get('/dashboards/engineer'),
  getStorekeeperDashboard: () => api.get('/dashboards/storekeeper'),
  getAccountantDashboard: () => api.get('/dashboards/accountant'),
  getFrontDeskDashboard: () => api.get('/dashboards/front-desk'),
};
