import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date: string | Date): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'MMM dd, yyyy');
};

export const formatDateTime = (date: string | Date): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'MMM dd, yyyy HH:mm');
};

export const formatRelativeTime = (date: string | Date): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    // Job statuses
    unassigned: 'bg-gray-100 text-gray-800',
    assigned: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    diagnosed: 'bg-blue-100 text-blue-800',
    waiting_parts: 'bg-orange-100 text-orange-800',
    waiting_for_parts: 'bg-orange-100 text-orange-800',
    waiting_for_estimate_approval: 'bg-yellow-100 text-yellow-800',
    need_to_handover: 'bg-red-100 text-red-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    repair_in_progress: 'bg-indigo-100 text-indigo-800',
    repair_in_progress_handovered: 'bg-indigo-100 text-indigo-800',
    waiting_for_accountant_review: 'bg-purple-100 text-purple-800',
    ready_for_delivery: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-green-100 text-green-800',
    delivered: 'bg-gray-100 text-gray-800',
    // Other statuses
    approved: 'bg-green-100 text-green-800',
    partially_approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    issued: 'bg-purple-100 text-purple-800',
    sent: 'bg-blue-100 text-blue-800',
    used: 'bg-gray-100 text-gray-800',
    return_requested: 'bg-yellow-100 text-yellow-800',
    returned: 'bg-gray-100 text-gray-800',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getRoleName = (role: string): string => {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    manager: 'Manager',
    front_desk: 'Front Desk',
    engineer: 'Engineer',
    storekeeper: 'Store Keeper',
    accountant: 'Accountant',
  };
  return roleNames[role] || role;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};
