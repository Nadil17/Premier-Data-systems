# 🔌 API Examples - Request & Response Samples

Complete examples with actual request bodies for all major endpoints.

**Base URL**: `http://localhost:8000`

---

## 🔐 Authentication

### 1. Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2. Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@repaircenter.com",
  "full_name": "System Administrator",
  "phone": "+1234567890",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2024-01-01T10:00:00"
}
```

---

## 👥 Customer Management

### 3. Create Customer (Individual)
```http
POST /api/v1/customers
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "John Doe",
  "phone_1": "+1234567890",
  "phone_2": "+0987654321",
  "email": "john.doe@example.com",
  "address": "123 Main Street, City, State 12345",
  "category": "INDIVIDUAL",
  "remarks": "Regular customer, prefers email updates"
}
```

**Response:**
```json
{
  "id": 1,
  "customer_id": "CUS-20241201-0001",
  "name": "John Doe",
  "phone_1": "+1234567890",
  "phone_2": "+0987654321",
  "email": "john.doe@example.com",
  "address": "123 Main Street, City, State 12345",
  "category": "INDIVIDUAL",
  "created_at": "2024-12-01T10:30:00"
}
```

### 4. Create Customer (Corporate)
```http
POST /api/v1/customers
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "name": "Jane Smith",
  "company_name": "Tech Solutions Inc.",
  "phone_1": "+1555123456",
  "phone_2": "+1555123457",
  "phone_3": "+1555123458",
  "email": "jane@techsolutions.com",
  "address": "456 Business Park, Tech City, TC 67890",
  "category": "CORPORATE",
  "vat_number": "VAT123456789",
  "website": "https://techsolutions.com",
  "remarks": "Corporate account with service contract"
}
```

### 5. Search Customers
```http
GET /api/v1/customers/search?query=john&category=INDIVIDUAL
Authorization: Bearer YOUR_TOKEN_HERE
```

### 6. Get Customer with Job History
```http
GET /api/v1/customers/1/jobs
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔧 Job Management

### 7. Create Repair Job (Laptop)
```http
POST /api/v1/jobs
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "customer_id": 1,
  "reported_by": "John Doe",
  "additional_phone": "+1234567891",
  "machine_model": "Dell Latitude 5420",
  "serial_number": "SN123456789",
  "fault_description": "Laptop not booting, making beeping sounds. Screen remains black after power button pressed.",
  "items_charger": true,
  "items_usb_cable": false,
  "items_printer_cable": false,
  "items_toner": false,
  "items_other": "Original carrying case",
  "job_type": "REPAIR",
  "job_category": "HARDWARE"
}
```

**Response:**
```json
{
  "id": 1,
  "job_number": "JOB-20241201-0001",
  "customer_id": 1,
  "customer_name": "John Doe",
  "machine_model": "Dell Latitude 5420",
  "serial_number": "SN123456789",
  "fault_description": "Laptop not booting, making beeping sounds...",
  "status": "PENDING",
  "created_at": "2024-12-01T11:00:00"
}
```

### 8. Create Service Job (Printer)
```http
POST /api/v1/jobs
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "customer_id": 1,
  "reported_by": "Office Manager",
  "machine_model": "HP LaserJet Pro M402n",
  "serial_number": "CN12345678",
  "fault_description": "Regular maintenance service - toner replacement and drum cleaning required",
  "items_charger": false,
  "items_printer_cable": true,
  "items_toner": true,
  "job_type": "SERVICE",
  "job_category": "CONSUMABLE"
}
```

### 9. Assign Job to Engineer
```http
POST /api/v1/jobs/1/assign
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "engineer_id": 4
}
```

**Response:**
```json
{
  "id": 1,
  "job_number": "JOB-20241201-0001",
  "status": "ASSIGNED",
  "assigned_to_id": 4,
  "assigned_to_name": "John Engineer",
  "assigned_at": "2024-12-01T11:15:00"
}
```

### 10. Update Job Status to In Progress
```http
PUT /api/v1/jobs/1/status
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "status": "IN_PROGRESS"
}
```

### 11. Complete Job
```http
POST /api/v1/jobs/1/complete
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "work_done": "Replaced faulty RAM module, cleaned dust from fan and heat sink, reinstalled operating system, updated all drivers",
  "tests_performed": "Memory test passed, stress test completed, all hardware diagnostics successful",
  "repair_notes": "Customer RAM was faulty. Replaced with 8GB DDR4 module from inventory.",
  "items_returned_charger": true,
  "items_returned_usb_cable": false,
  "items_returned_printer_cable": false,
  "items_returned_toner": false,
  "items_returned_other": true
}
```

### 12. Deliver Job to Customer
```http
POST /api/v1/jobs/1/deliver
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "remarks": "Customer satisfied with repair. Provided 3-month warranty on replaced parts."
}
```

### 13. Get Job History
```http
GET /api/v1/jobs/1/history
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔩 Parts Management

### 14. Add New Part to Inventory
```http
POST /api/v1/parts
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "part_number": "RAM-DDR4-16GB",
  "name": "16GB DDR4 RAM",
  "description": "DDR4 3200MHz 16GB Memory Module - Compatible with most laptops",
  "category": "HARDWARE",
  "quantity_in_stock": 10,
  "minimum_stock_level": 5,
  "unit_price": 55.00
}
```

### 15. Update Part Stock
```http
PUT /api/v1/parts/1
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "quantity_in_stock": 15,
  "unit_price": 48.00
}
```

### 16. Get Low Stock Parts
```http
GET /api/v1/parts/low-stock
Authorization: Bearer YOUR_TOKEN_HERE
```

### 17. Create Parts Request
```http
POST /api/v1/parts/requests
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "job_id": 1,
  "reason": "Need parts to complete repair job - customer approved estimate",
  "items": [
    {
      "part_id": 2,
      "quantity_requested": 1
    },
    {
      "part_id": 5,
      "quantity_requested": 1
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "request_number": "PR-20241201-0001",
  "job_id": 1,
  "job_number": "JOB-20241201-0001",
  "engineer_id": 4,
  "engineer_name": "John Engineer",
  "status": "PENDING",
  "reason": "Need parts to complete repair job...",
  "items": [
    {
      "id": 1,
      "part_id": 2,
      "part_name": "8GB DDR4 RAM",
      "quantity_requested": 1,
      "status": "PENDING"
    }
  ],
  "created_at": "2024-12-01T12:00:00"
}
```

### 18. Approve Parts Request
```http
POST /api/v1/parts/requests/1/approve
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "items": [
    {
      "item_id": 1,
      "quantity_approved": 1
    },
    {
      "item_id": 2,
      "quantity_approved": 1
    }
  ],
  "storekeeper_notes": "All parts available and ready for pickup"
}
```

### 19. Issue Parts to Engineer
```http
POST /api/v1/parts/requests/1/issue
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "items": [
    {
      "item_id": 1,
      "quantity_issued": 1
    }
  ]
}
```

---

## 📊 Estimates

### 20. Create Engineer Estimate
```http
POST /api/v1/estimates/engineer
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "job_id": 1,
  "technical_notes": "RAM module failure detected. Heat sink requires cleaning. Operating system needs reinstallation.",
  "additional_notes": "Recommend backup of all customer data before proceeding with OS reinstall.",
  "items": [
    {
      "item_type": "PART",
      "part_id": 2,
      "description": "8GB DDR4 RAM Module Replacement",
      "technical_description": "Original RAM module failed memory test. Replacement required.",
      "quantity": 1,
      "notes": "Part available in stock"
    },
    {
      "item_type": "SERVICE",
      "description": "Operating System Reinstallation and Driver Update",
      "technical_description": "Clean install of Windows 11 Pro, all drivers, and system updates",
      "quantity": 1,
      "notes": "Approximately 2 hours of work"
    },
    {
      "item_type": "SERVICE",
      "description": "Hardware Cleaning and Thermal Paste Application",
      "technical_description": "Clean dust from cooling system, replace thermal paste",
      "quantity": 1
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "estimate_number": "EST-ENG-20241201-0001",
  "job_id": 1,
  "job_number": "JOB-20241201-0001",
  "engineer_name": "John Engineer",
  "technical_notes": "RAM module failure detected...",
  "items": [
    {
      "id": 1,
      "item_type": "PART",
      "description": "8GB DDR4 RAM Module Replacement",
      "quantity": 1
    }
  ],
  "created_at": "2024-12-01T13:00:00"
}
```

### 21. Create Customer Estimate (with pricing)
```http
POST /api/v1/estimates/customer
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "job_id": 1,
  "special_notes": "3-month warranty on parts. 1-month warranty on labor.",
  "items": [
    {
      "item_type": "PART",
      "part_id": 2,
      "description": "8GB DDR4 RAM Module",
      "quantity": 1,
      "unit_price": 35.00,
      "total_price": 35.00
    },
    {
      "item_type": "SERVICE",
      "description": "Operating System Reinstallation",
      "quantity": 1,
      "unit_price": 50.00,
      "total_price": 50.00
    },
    {
      "item_type": "SERVICE",
      "description": "Hardware Cleaning Service",
      "quantity": 1,
      "unit_price": 25.00,
      "total_price": 25.00
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "estimate_number": "EST-CUST-20241201-0001",
  "job_id": 1,
  "job_number": "JOB-20241201-0001",
  "approval_status": "PENDING",
  "total_amount": 110.00,
  "items": [
    {
      "id": 1,
      "description": "8GB DDR4 RAM Module",
      "quantity": 1,
      "unit_price": 35.00,
      "total_price": 35.00
    }
  ],
  "created_at": "2024-12-01T13:30:00"
}
```

### 22. Generate OTP for Customer Approval
```http
POST /api/v1/estimates/customer/1/generate-otp
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "otp_code": "123456",
  "message": "OTP sent to customer via WhatsApp",
  "expires_in_minutes": 10
}
```

### 23. Verify OTP and Approve Estimate
```http
POST /api/v1/estimates/customer/1/verify-otp
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "otp_code": "123456",
  "customer_comments": "Approved. Please proceed with the repair."
}
```

---

## 📱 Notifications

### 24. Get User Notifications
```http
GET /api/v1/notifications?is_read=false&limit=10
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "notification_type": "JOB_ASSIGNED",
      "title": "New Job Assigned",
      "message": "Job JOB-20241201-0001 has been assigned to you",
      "is_read": false,
      "related_job_id": 1,
      "created_at": "2024-12-01T11:15:00"
    }
  ],
  "total": 1,
  "unread_count": 1
}
```

### 25. Mark Notification as Read
```http
PUT /api/v1/notifications/1/read
Authorization: Bearer YOUR_TOKEN_HERE
```

### 26. Mark All Notifications as Read
```http
POST /api/v1/notifications/mark-all-read
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 📈 Dashboards (Role-Specific)

### 27. Admin Dashboard
```http
GET /api/v1/dashboards/admin
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "total_jobs": 150,
  "jobs_by_status": {
    "PENDING": 5,
    "ASSIGNED": 8,
    "IN_PROGRESS": 12,
    "COMPLETED": 125
  },
  "total_customers": 75,
  "customers_by_category": {
    "INDIVIDUAL": 50,
    "CORPORATE": 25
  },
  "total_users": 15,
  "users_by_role": {
    "ENGINEER": 5,
    "FRONT_DESK": 3,
    "MANAGER": 2
  },
  "total_parts": 45,
  "low_stock_parts": 3,
  "recent_jobs": [...]
}
```

### 28. Engineer Dashboard
```http
GET /api/v1/dashboards/engineer
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
```json
{
  "assigned_jobs": 5,
  "in_progress_jobs": 3,
  "completed_jobs": 45,
  "pending_estimates": 2,
  "pending_parts_requests": 1,
  "recent_jobs": [...],
  "pending_estimates_list": [...],
  "pending_parts_requests_list": [...]
}
```

### 29. Manager Dashboard
```http
GET /api/v1/dashboards/manager
Authorization: Bearer YOUR_TOKEN_HERE
```

### 30. Storekeeper Dashboard
```http
GET /api/v1/dashboards/storekeeper
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🔍 Advanced Queries

### 31. Get Jobs by Status
```http
GET /api/v1/jobs?status=IN_PROGRESS&limit=20&offset=0
Authorization: Bearer YOUR_TOKEN_HERE
```

### 32. Get Unassigned Jobs
```http
GET /api/v1/jobs/unassigned
Authorization: Bearer YOUR_TOKEN_HERE
```

### 33. Search Jobs by Customer
```http
GET /api/v1/jobs?customer_id=1
Authorization: Bearer YOUR_TOKEN_HERE
```

### 34. Search Jobs by Serial Number
```http
GET /api/v1/jobs?serial_number=SN123456789
Authorization: Bearer YOUR_TOKEN_HERE
```

### 35. Get Parts by Category
```http
GET /api/v1/parts?category=HARDWARE
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## 🧪 Testing with cURL

### Example: Login with cURL
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Example: Create Customer with cURL
```bash
curl -X POST http://localhost:8000/api/v1/customers \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone_1": "+1234567890",
    "email": "john@example.com",
    "category": "INDIVIDUAL"
  }'
```

---

## 🧪 Testing with Python

### Example: Complete Workflow
```python
import requests

BASE_URL = "http://localhost:8000"

# 1. Login
response = requests.post(f"{BASE_URL}/api/v1/auth/login", json={
    "username": "admin",
    "password": "admin123"
})
token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# 2. Create Customer
customer = requests.post(f"{BASE_URL}/api/v1/customers", headers=headers, json={
    "name": "Test Customer",
    "phone_1": "+1234567890",
    "category": "INDIVIDUAL"
}).json()
print(f"Customer created: {customer['customer_id']}")

# 3. Create Job
job = requests.post(f"{BASE_URL}/api/v1/jobs", headers=headers, json={
    "customer_id": customer["id"],
    "reported_by": "Test Customer",
    "machine_model": "Dell Latitude",
    "fault_description": "Screen not working",
    "job_type": "REPAIR",
    "job_category": "HARDWARE"
}).json()
print(f"Job created: {job['job_number']}")

# 4. Get Dashboard
dashboard = requests.get(f"{BASE_URL}/api/v1/dashboards/admin", headers=headers).json()
print(f"Total jobs: {dashboard['total_jobs']}")
```

---

## 📝 Notes

- Replace `YOUR_TOKEN_HERE` with the actual JWT token from login
- All authenticated endpoints require the `Authorization: Bearer TOKEN` header
- Dates are in ISO 8601 format: `YYYY-MM-DDTHH:MM:SS`
- All prices are in float format (e.g., 35.00)
- Boolean fields: `true` or `false` (lowercase)

---

## 🎯 Common Status Values

### Job Status
- `PENDING` - New job, not assigned
- `ASSIGNED` - Assigned to engineer
- `IN_PROGRESS` - Engineer working on it
- `AWAITING_PARTS` - Waiting for parts
- `PARTS_ORDERED` - Parts ordered
- `AWAITING_ESTIMATE_APPROVAL` - Customer estimate sent
- `ESTIMATE_APPROVED` - Customer approved
- `COMPLETED` - Work finished
- `READY_FOR_PICKUP` - Ready for customer
- `DELIVERED` - Delivered to customer
- `ON_HOLD` - Temporarily paused
- `CANCELLED` - Job cancelled

### Parts Request Status
- `PENDING` - Awaiting approval
- `APPROVED` - Approved by storekeeper
- `REJECTED` - Rejected
- `ISSUED` - Parts given to engineer
- `RETURNED` - Parts returned

### Estimate Approval Status
- `PENDING` - Awaiting customer approval
- `APPROVED` - Customer approved
- `REJECTED` - Customer rejected
- `EXPIRED` - OTP expired

---

**🚀 Ready to test! Use these examples in Swagger UI, Postman, or cURL.**
