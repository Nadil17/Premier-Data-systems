import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Lock, User, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

interface LoginForm {
  username: string;
  password: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError, _hasHydrated } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  // Redirect if already authenticated (only after hydration)
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [_hasHydrated, isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.username, data.password);
      toast.success('Login successful!');
      // Navigation handled by useEffect watching isAuthenticated
    } catch {
      // Error is handled by the store and displayed via toast
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-3xl">R</span>
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Repair Center</h2>
          <p className="mt-2 text-sm text-gray-600">Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Sign In</h3>
            <p className="mt-1 text-sm text-gray-600">Enter your credentials to access your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  {...register('username', { required: 'Username is required' })}
                  className={`input pl-10 ${errors.username ? 'border-red-500' : ''}`}
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password', { required: 'Password is required' })}
                  className={`input pl-10 ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-2">Demo Credentials:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Admin: <code className="bg-white px-1 rounded">admin</code> / <code className="bg-white px-1 rounded">admin123</code></li>
              <li>• Manager: <code className="bg-white px-1 rounded">manager</code> / <code className="bg-white px-1 rounded">manager123</code></li>
              <li>• Engineer: <code className="bg-white px-1 rounded">engineer1</code> / <code className="bg-white px-1 rounded">engineer123</code></li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>&copy; 2024 Repair Center Management System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
