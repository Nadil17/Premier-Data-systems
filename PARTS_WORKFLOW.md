# Parts Management Workflow

## Overview
This document describes the complete workflow for managing parts in the repair process, from customer approval through job completion.

## Workflow Steps

### 1. Customer Approves Estimate
- **Who**: Customer
- **What**: Customer receives estimate via WhatsApp with OTP
- **Result**: 
  - Estimate status changes to `approved` or `partially_approved`
  - Job status changes to `ESTIMATE_APPROVED`
  - Individual items marked as `approved` or `rejected`

### 2. Engineer Views Approved Parts
- **Who**: Engineer (assigned to job)
- **What**: Engineer sees "Customer Approved Parts" section on Job Detail page
- **Display**: 
  - Shows all parts with `approval_status = 'approved'` and `item_type = 'part'`
  - Highlights parts that haven't been requested yet
  - Shows quantity, unit price, and total for each part

### 3. Engineer Requests Parts from Storekeeper
- **Who**: Engineer
- **What**: Engineer clicks "Request Parts" button
- **Action**:
  - Opens Parts Request Modal
  - Engineer adds the approved parts (and any additional parts needed)
  - Submits parts request
- **Result**:
  - New `PartsRequest` created with status `PENDING`
  - Storekeeper receives notification

### 4. Storekeeper Approves Parts Request
- **Who**: Storekeeper
- **What**: Storekeeper reviews and approves parts request
- **Action**:
  - Updates each item with `quantity_approved` and `quantity_issued`
  - Changes request status to `APPROVED` or `ISSUED`
- **Result**:
  - Parts are marked as issued to engineer
  - Engineer can now see issued parts in Job Detail

### 5. Engineer Uses Parts During Repair
- **Who**: Engineer (assigned to job)
- **What**: As repair progresses, engineer marks parts as used
- **Action**:
  - In "Parts Requests & Usage" section
  - Click "Use" button on each part item
  - Enter quantity used (up to quantity issued)
- **Result**:
  - Item status changes to `USED`
  - `quantity_used` is recorded
  - Part inventory is automatically deducted

### 6. Engineer Returns Unused Parts
- **Who**: Engineer (assigned to job)
- **What**: For any parts not fully used, engineer returns them
- **Action**:
  - Click "Return" button on part item
  - Enter quantity to return and reason
- **Result**:
  - Item status changes to `RETURNED`
  - `quantity_returned` is recorded
  - Parts are added back to inventory
  - Storekeeper can see returned parts

### 7. Job Completion Validation
- **Who**: Engineer
- **What**: Before completing job, system validates:
  - All issued parts are either `USED` or `RETURNED`
  - No parts have status `ISSUED` with unaccounted quantity
- **Formula**: `quantity_issued = quantity_used + quantity_returned`
- **Result**: 
  - If valid: Job can be marked complete
  - If invalid: Warning shown, cannot complete job

### 8. Job Completion
- **Who**: Engineer
- **What**: After all parts are accounted for, engineer completes job
- **Action**:
  - Click "Mark Complete" button
  - Fill in work done, tests performed, repair notes
  - Submit completion
- **Result**:
  - Job status changes to `WAITING_FOR_ACCOUNTANT_REVIEW`
  - Accountant receives notification

## Visual Indicators on Job Detail Page

### Customer Approved Parts Section
- **Orange background**: Highlights approved parts needing action
- **✓ Requested**: Green badge for parts already requested
- **⚠ Not Requested**: Yellow badge for parts not yet requested
- **Blue info box**: Reminds engineer to use "Request Parts" button

### Parts Requests & Usage Section
- **Yellow warning box**: Shows when parts need to be used/returned
- **Yellow highlight**: Rows with parts needing action (quantity_issued > quantity_used + quantity_returned)
- **Status badges**: Color-coded status for each part item
- **Action buttons**: "Use" and "Return" buttons for issued parts

### Quick Actions Section
- **Parts Pending warning**: Yellow alert if any parts not fully accounted for
- **Mark Complete button**: Disabled/warned if parts pending

## Database Fields

### PartsRequestItem
- `quantity_requested`: How many engineer needs
- `quantity_approved`: How many storekeeper approved
- `quantity_issued`: How many actually given to engineer
- `quantity_used`: How many engineer used in repair
- `quantity_returned`: How many engineer returned unused
- `status`: Current state of this item

### Status Flow
```
PENDING → APPROVED → ISSUED → USED
                        ↓
                     RETURNED
```

## API Endpoints

### Engineer Actions
- `POST /api/v1/parts/requests` - Create parts request
- `POST /api/v1/parts/requests/items/{item_id}/mark-used` - Mark parts as used
- `POST /api/v1/parts/requests/items/{item_id}/return` - Return unused parts
- `POST /api/v1/jobs/{job_id}/complete` - Complete job (validates parts)

### Viewing Data
- `GET /api/v1/estimates/customer/job/{job_id}` - Get customer estimate with approved items
- `GET /api/v1/parts/requests` - Get all parts requests
- `GET /api/v1/parts/requests/{request_id}` - Get parts request details

## Business Rules

1. **Request All Approved Parts**: Engineer should request all customer-approved parts before starting repair
2. **Additional Parts Allowed**: Engineer can request additional parts not in customer estimate
3. **Must Account for All Parts**: Every issued part must be marked as used OR returned
4. **Cannot Complete Without Parts Accounting**: Job completion blocked if any parts unaccounted
5. **Inventory Auto-Updated**: Part inventory automatically adjusted when parts used/returned

## Example Scenario

1. Customer approves estimate with 2 parts: "LCD Screen" (qty: 1) and "Battery" (qty: 1)
2. Engineer sees these in "Customer Approved Parts" section
3. Engineer clicks "Request Parts", adds both parts plus "Charging Cable" (additional part)
4. Storekeeper approves all 3 parts and issues them
5. During repair:
   - Engineer uses 1 LCD Screen → marks it as used
   - Engineer uses 1 Battery → marks it as used
   - Charging Cable wasn't needed → returns it to storekeeper
6. All parts accounted for (2 used, 1 returned = 3 total issued)
7. Engineer can now complete the job

## Notes

- The workflow ensures complete tracking of all parts
- Prevents job completion with missing parts accountability
- Customer approval drives the parts request process
- Storekeeper maintains control over inventory
- Engineer responsible for proper parts usage documentation
