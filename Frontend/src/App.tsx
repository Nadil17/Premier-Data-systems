import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import Dashboard from './pages/dashboards/Dashboard';

// Customer pages
import CustomerList from './pages/customers/CustomerList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerDetail from './pages/customers/CustomerDetail';

// Job pages
import JobList from './pages/jobs/JobList';
import JobForm from './pages/jobs/JobForm';
import JobDetail from './pages/jobs/JobDetail';

// Parts pages
import PartsList from './pages/parts/PartsList';
import PartsRequestsList from './pages/parts/PartsRequestsList';
import PartsRequestDetail from './pages/parts/PartsRequestDetail';
import ProductsList from './pages/products/ProductsList';

// Estimates pages
import EstimatesList from './pages/estimates/EstimatesList';
import CustomerEstimateForm from './pages/estimates/CustomerEstimateForm';
import EditCustomerEstimateForm from './pages/estimates/EditCustomerEstimateForm';
import CustomerEstimateVerify from './pages/estimates/CustomerEstimateVerify';

// Notifications
import NotificationsPage from './pages/notifications/NotificationsPage';

// Admin
import UsersList from './pages/admin/UsersList';

// Settings
import Settings from './pages/settings/Settings';

function App() {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Customer Estimate Verification (Public - No Auth Required) */}
        <Route path="/estimate/verify/:estimateNumber" element={<CustomerEstimateVerify />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout>
                <UsersList />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Customer Routes */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'front_desk']}>
              <MainLayout>
                <CustomerList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'front_desk']}>
              <MainLayout>
                <CustomerForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'front_desk', 'engineer']}>
              <MainLayout>
                <CustomerDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'front_desk']}>
              <MainLayout>
                <CustomerForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Job Routes */}
        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <MainLayout>
                <JobList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'front_desk']}>
              <MainLayout>
                <JobForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <MainLayout>
                <JobDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Parts Routes */}
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout>
                <ProductsList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parts"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper', 'engineer']}>
              <MainLayout>
                <PartsList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parts/requests"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper', 'engineer']}>
              <MainLayout>
                <PartsRequestsList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/parts/requests/:id"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper', 'engineer']}>
              <MainLayout>
                <PartsRequestDetail />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Estimates Routes */}
        <Route
          path="/estimates"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'accountant', 'engineer']}>
              <MainLayout>
                <EstimatesList />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimates/create/:jobId"
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <MainLayout>
                <CustomerEstimateForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/estimates/customer/:estimateId/edit"
          element={
            <ProtectedRoute allowedRoles={['admin', 'accountant']}>
              <MainLayout>
                <EditCustomerEstimateForm />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Notifications Routes */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <MainLayout>
                <NotificationsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MainLayout>
                <div className="p-6">
                  <h1 className="text-2xl font-bold">Users - Coming Soon</h1>
                </div>
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">403</h1>
                <p className="text-gray-600">You don't have permission to access this page</p>
              </div>
            </div>
          }
        />

        <Route
          path="*"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
                <p className="text-gray-600">Page not found</p>
              </div>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
