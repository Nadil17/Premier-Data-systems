# Quick Start Guide - Frontend Development

## Current Status

✅ **Phase 1 Complete**: Foundation, auth, dashboard, layout
🔲 **Phase 2**: CRUD pages for Customers, Jobs, Parts, Estimates

## Running the Application

### Start Backend (Terminal 1)
```powershell
cd 'c:\Users\user\Desktop\Premier Data Systems\backend'
# Activate virtual environment (if not already activated)
venv\Scripts\activate
# Start server
uvicorn main:app --reload
```
**Backend URL**: http://localhost:8000

### Start Frontend (Terminal 2)
```powershell
cd 'c:\Users\user\Desktop\Premier Data Systems\Frontend'
npm run dev
```
**Frontend URL**: http://localhost:5174

## Test Credentials

- **Admin**: `admin` / `admin123` - Full system access
- **Manager**: `manager` / `manager123` - Jobs, customers, parts, estimates
- **Front Desk**: `frontdesk` / `frontdesk123` - Customer and job management
- **Engineer**: `engineer1` / `engineer123` - Assigned jobs and estimates
- **Storekeeper**: `storekeeper` / `store123` - Parts inventory
- **Accountant**: `accountant` / `account123` - Estimates and revenue

## Project Structure

```
Frontend/src/
├── api/              # API client & endpoints (✅ Complete - all 50+ endpoints)
├── components/       # React components
│   ├── common/       # Reusable components (✅ 3 done)
│   └── layout/       # Layout components (✅ 3 done)
├── pages/            # Page components
│   ├── auth/         # ✅ Login page
│   ├── dashboards/   # ✅ Main dashboard
│   ├── customers/    # 🔲 To implement
│   ├── jobs/         # 🔲 To implement
│   ├── parts/        # 🔲 To implement
│   └── estimates/    # 🔲 To implement
├── store/            # State management (✅ Auth + Notifications)
├── types/            # TypeScript types (✅ All types defined)
└── utils/            # Helpers (✅ Formatters complete)
```

## Key Files

### API Integration
- **src/api/endpoints.ts**: All API calls are defined here
- **Example usage**:
```typescript
import { customersAPI, jobsAPI } from '../api/endpoints';

// Fetch customers
const customers = await customersAPI.getAll(0, 100);

// Create job
const newJob = await jobsAPI.create(jobData);
```

### State Management
- **src/store/authStore.ts**: `const { user, logout } = useAuthStore();`
- **src/store/notificationStore.ts**: `const { notifications, unreadCount } = useNotificationStore();`

### Components
- **ProtectedRoute**: Wrap routes that need authentication
- **LoadingSpinner**: Show loading states
- **StatusBadge**: Display job/request status

### Utilities
- **formatDate()**: Format dates nicely
- **formatCurrency()**: Format money
- **getStatusColor()**: Get Tailwind color classes for status
- **getRoleName()**: Convert role to display name

## Development Workflow

### Creating a New Page

1. **Create component file**:
```tsx
// src/pages/customers/CustomerList.tsx
import React from 'react';

const CustomerList: React.FC = () => {
  return <div>Customer List</div>;
};

export default CustomerList;
```

2. **Add route in App.tsx**:
```tsx
<Route
  path="/customers"
  element={
    <ProtectedRoute allowedRoles={['admin', 'manager', 'frontdesk']}>
      <MainLayout>
        <CustomerList />
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

3. **Update Sidebar** (if needed):
Sidebar already has role-based navigation - just implement the pages!

### Making API Calls

```typescript
// Fetch data
const [customers, setCustomers] = useState<Customer[]>([]);
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await customersAPI.getAll();
      setCustomers(response.items);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };
  fetchData();
}, []);
```

### Form Handling with React Hook Form

```typescript
import { useForm } from 'react-hook-form';

const { register, handleSubmit, formState: { errors } } = useForm<CustomerCreate>();

const onSubmit = async (data: CustomerCreate) => {
  try {
    await customersAPI.create(data);
    toast.success('Customer created!');
  } catch (error) {
    toast.error('Failed to create customer');
  }
};
```

### Using Toast Notifications

```typescript
import toast from 'react-hot-toast';

toast.success('Action completed!');
toast.error('Something went wrong');
toast.loading('Processing...');
```

## Tailwind CSS Classes

### Buttons
```html
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="btn btn-danger">Danger</button>
```

### Inputs
```html
<input className="input" placeholder="Enter value" />
```

### Cards
```html
<div className="card">
  <h2>Card Title</h2>
  <p>Card content</p>
</div>
```

### Badges
```html
<StatusBadge status={job.status} />
```

## Common Patterns

### List Page Pattern
```tsx
const [items, setItems] = useState<Type[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [searchQuery, setSearchQuery] = useState('');

// Fetch data
// Display table with items
// Add search/filter functionality
// Add "Create New" button
```

### Form Page Pattern
```tsx
const { register, handleSubmit, formState: { errors } } = useForm();
const navigate = useNavigate();

// Handle form submission
// Show validation errors
// Navigate back on success
```

### Detail Page Pattern
```tsx
const { id } = useParams();
const [item, setItem] = useState<Type | null>(null);

// Fetch item by ID
// Display item details
// Add edit/delete buttons
// Show related data (jobs for customer, etc.)
```

## Available API Endpoints

All endpoints are in `src/api/endpoints.ts`:

- **authAPI**: login, getCurrentUser, register
- **usersAPI**: getAll, getById, update, delete
- **customersAPI**: getAll, search, getById, create, update, delete
- **jobsAPI**: getAll, getByStatus, getMyJobs, getById, create, update, assignEngineer, updateStatus, delete
- **partsAPI**: getAll, getLowStock, search, getById, create, update, updateStock, delete
- **partsRequestsAPI**: getAll, getByStatus, getById, create, approve, reject, issue
- **engineerEstimatesAPI**: getAll, getByJob, getById, create, update
- **customerEstimatesAPI**: getAll, getByJob, getById, create, update, send, approve, reject
- **notificationsAPI**: getAll, getUnread, markAsRead, markAllAsRead
- **dashboardAPI**: getStats, getRecentJobs

## Tips

1. **Use existing components**: LoadingSpinner, StatusBadge, ProtectedRoute
2. **Follow the patterns**: Look at Dashboard.tsx and LoginPage.tsx as examples
3. **Type everything**: Use the types from `src/types/index.ts`
4. **Handle errors**: Always wrap API calls in try-catch with toast notifications
5. **Show loading states**: Use LoadingSpinner while fetching data
6. **Validate forms**: Use React Hook Form validation
7. **Mobile-first**: Tailwind's responsive classes (sm:, md:, lg:)

## Next Steps

Start with the most important pages:

1. **Customers** (CustomerList + CustomerForm) - Front desk needs this
2. **Jobs** (JobList + JobForm + JobDetail) - Core functionality
3. **Parts** (PartsList + LowStockAlert) - Storekeeper needs this
4. **Estimates** (EngineerEstimateForm + CustomerEstimateForm) - Revenue tracking

Each module should have:
- List view (table with search/filter)
- Create/Edit form
- Detail view (if needed)

## Resources

- **Tailwind Docs**: https://tailwindcss.com/docs
- **React Hook Form**: https://react-hook-form.com/
- **Lucide Icons**: https://lucide.dev/icons/
- **date-fns**: https://date-fns.org/
- **Zustand**: https://github.com/pmndrs/zustand

Happy coding! 🚀
