# Parts Return Workflow with Storekeeper Approval

## Overview
This document describes the enhanced parts return workflow that requires storekeeper approval before parts are added back to inventory. This prevents unauthorized inventory manipulation and ensures proper tracking.

## Workflow Status Flow

### Complete Parts Lifecycle
```
PENDING → APPROVED → ISSUED → USED/RETURN_REQUESTED → RETURNED
```

### Key Statuses
- **PENDING**: Initial request waiting for storekeeper review
- **APPROVED**: Storekeeper approved the request
- **ISSUED**: Parts physically given to engineer
- **USED**: Engineer used the parts in repair
- **RETURN_REQUESTED**: Engineer requested to return unused parts (NEW)
- **RETURNED**: Storekeeper accepted return and added back to inventory

## Previous Issue
Previously, when an engineer clicked "Return", the parts were immediately:
1. Marked as RETURNED
2. Added back to inventory (quantity_in_stock increased)

This allowed returns without oversight, potentially enabling inventory manipulation.

## New Workflow

### 1. Engineer Requests Return
**Endpoint**: `POST /parts/requests/items/{item_id}/return`

**Frontend Action**:
- Engineer clicks "Return" button on issued parts
- Enters quantity to return (max: available quantity)

**Backend Processing**:
```python
# Sets pending return quantity
item.quantity_pending_return = quantity
# Sets status to request approval
item.status = PartsRequestItemStatus.RETURN_REQUESTED
# Does NOT add to inventory yet
# Sends notification to storekeeper
```

**Response**: "Return request submitted, waiting for storekeeper approval"

### 2. Storekeeper Reviews and Accepts
**Endpoint**: `POST /parts/requests/items/{item_id}/accept-return`

**Authorization**: Only STOREKEEPER or ADMIN roles

**Frontend Display**:
- Storekeepers see items with status RETURN_REQUESTED
- Orange warning banner alerts storekeeper to pending returns
- "Accept Return" button visible in Actions column

**Backend Processing**:
```python
# Validate return request exists
if item.status != PartsRequestItemStatus.RETURN_REQUESTED:
    raise HTTPException(400, "No return request pending")

# Add returned quantity to total
item.quantity_returned += item.quantity_pending_return
returned_qty = item.quantity_pending_return
item.quantity_pending_return = 0
item.status = PartsRequestItemStatus.RETURNED

# NOW add back to inventory
part.quantity_in_stock += returned_qty

# Notify engineer of acceptance
```

## Database Changes

### New Enum Value
Added `RETURN_REQUESTED` to `parts_request_items.status` enum:
```sql
ALTER TABLE parts_request_items 
MODIFY COLUMN status ENUM(
    'PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 
    'USED', 'RETURN_REQUESTED', 'RETURNED', 'ALTERNATIVE_PROVIDED'
)
```

### Quantity Tracking Fields
- `quantity_issued`: Total issued to engineer
- `quantity_used`: Marked as used in repair
- `quantity_pending_return`: Waiting for storekeeper acceptance
- `quantity_returned`: Accepted and added back to inventory

**Available Formula**:
```
available = issued - used - returned - pending_return
```

## API Endpoints

### Return Parts (Engineer)
```
POST /parts/requests/items/{item_id}/return
Authorization: Bearer token (ENGINEER or ADMIN)
Body: {
  "item_id": 123,
  "quantity_returned": 2
}
Response: {
  "message": "Return request submitted, waiting for storekeeper approval",
  "quantity_pending_return": 2
}
```

### Accept Return (Storekeeper)
```
POST /parts/requests/items/{item_id}/accept-return
Authorization: Bearer token (STOREKEEPER or ADMIN)
Response: {
  "message": "Parts return accepted and added back to inventory",
  "quantity_returned": 2
}
```

## Frontend Changes

### JobDetail.tsx

#### New Handler
```typescript
const handleAcceptReturn = async (itemId: number) => {
  setProcessingPart(itemId);
  try {
    const result = await partsRequestsAPI.acceptReturn(itemId);
    toast.success(result.message);
    fetchPartsRequests();
  } catch (error) {
    toast.error('Failed to accept return');
  } finally {
    setProcessingPart(null);
  }
};
```

#### Updated Parts Table
- Added "Pending Return" column showing `quantity_pending_return`
- Status badge shows `RETURN_REQUESTED` in yellow
- Available calculation includes pending returns
- Storekeeper sees "Accept Return" button for return_requested items
- Engineer sees "Awaiting approval" message for their return requests

#### Warning Banners
**For Engineers**:
```
Important: Complete Parts Usage
Before completing this job, you must mark all issued parts as "Used" 
or request to return them. When you request to return parts, the 
storekeeper must approve the return before they're added back to 
inventory.
```

**For Storekeepers** (when returns pending):
```
Action Required: Review Return Requests
There are parts pending return approval. Please review and accept 
them to add back to inventory.
```

## Notifications

### notify_parts_return_requested
Sent to storekeeper when engineer requests return:
- Type: PARTS_REQUEST_SUBMITTED
- Title: "Parts Return Request"
- Message: "{engineer} requested to return {qty}x {part}"

### notify_parts_return_accepted
Sent to engineer when storekeeper accepts:
- Type: PARTS_REQUEST_APPROVED
- Title: "Parts Return Accepted"
- Message: "{storekeeper} accepted return of {qty}x {part}"

## Security Benefits

1. **Audit Trail**: All return requests logged with timestamps
2. **Two-Person Control**: Engineer requests, storekeeper approves
3. **Inventory Protection**: No direct inventory manipulation by engineers
4. **Notification Chain**: Both parties notified of actions
5. **Role Enforcement**: API endpoints check roles before allowing actions

## Job Completion Rules

Engineers can complete a job when:
- All issued parts are marked as USED, OR
- Return requests are submitted and ACCEPTED by storekeeper

Engineers CANNOT complete a job with:
- Parts still in ISSUED or APPROVED status
- Pending returns (status = RETURN_REQUESTED)

The backend `/jobs/{job_id}/completion-check` endpoint validates this.

## Files Modified

### Backend
- `backend/app/models/parts.py` - Added RETURN_REQUESTED enum value
- `backend/app/api/v1/parts.py` - Modified return endpoint, added accept endpoint
- `backend/app/schemas/parts.py` - Added quantity_pending_return field
- `backend/app/services/notification.py` - Added return notifications
- `backend/add_return_requested_status.py` - Database migration script

### Frontend
- `frontend/src/api/endpoints.ts` - Added acceptReturn method
- `frontend/src/pages/jobs/JobDetail.tsx` - Updated UI and handlers
- `frontend/src/types/index.ts` - Added quantity_pending_return field
- `frontend/src/utils/formatters.ts` - Added return_requested status color

## Testing Checklist

- [ ] Engineer can request return of issued parts
- [ ] Return request shows in pending state
- [ ] Storekeeper sees return request notification
- [ ] Storekeeper can accept return
- [ ] Inventory increases after acceptance
- [ ] Engineer receives acceptance notification
- [ ] Job completion blocked with pending returns
- [ ] Job completion allowed after returns accepted
- [ ] Available quantity calculation correct
- [ ] Status badges display correctly

## Migration Steps

1. Run database migration: `python add_return_requested_status.py`
2. Restart backend server
3. Frontend automatically picks up changes
4. Test workflow end-to-end

## Rollback Plan

If issues occur:
1. Stop backend server
2. Revert database enum (remove RETURN_REQUESTED)
3. Restore previous code versions
4. Restart server

## Future Enhancements

Potential improvements:
- Add rejection reason for returns
- Allow partial return acceptance
- Add return photos/notes
- Generate return receipts
- Track return processing time metrics
- Add storekeeper performance reports
