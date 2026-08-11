import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  LayoutDashboard,
  type LucideIcon,
  Users,
  Wrench,
  Package,
  FileText,
  Settings,
  UserCog,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = true, onClose }) => {
  const location = useLocation();
  const { user } = useAuthStore();

  const getNavItems = () => {
    const commonItems: NavItem[] = [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    const roleSpecificItems: Record<string, NavItem[]> = {
      admin: [
        { to: '/users', icon: UserCog, label: 'Users' },
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/jobs', icon: Wrench, label: 'Jobs' },
        { to: '/products', icon: Box, label: 'Products' },
        { to: '/parts', icon: Package, label: 'Parts' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ],
      manager: [
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/jobs', icon: Wrench, label: 'Jobs' },
        { to: '/parts', icon: Package, label: 'Parts' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
      ],
      front_desk: [
        { to: '/users', icon: UserCog, label: 'Users' },
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/jobs', icon: Wrench, label: 'Jobs' },
        { to: '/products', icon: Box, label: 'Products' },
        { to: '/parts', icon: Package, label: 'Parts' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ],
      engineer: [
        { to: '/jobs', icon: Wrench, label: 'My Jobs' },
        { to: '/parts/requests', icon: Package, label: 'Parts Requests' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
      ],
      storekeeper: [
        { to: '/jobs', icon: Wrench, label: 'Jobs' },
        { to: '/parts', icon: Package, label: 'Parts Inventory' },
        { to: '/parts/requests', icon: FileText, label: 'Parts Requests' },
      ],
      accountant: [
        { to: '/users', icon: UserCog, label: 'Users' },
        { to: '/customers', icon: Users, label: 'Customers' },
        { to: '/jobs', icon: Wrench, label: 'Jobs' },
        { to: '/products', icon: Box, label: 'Products' },
        { to: '/parts', icon: Package, label: 'Parts' },
        { to: '/estimates', icon: FileText, label: 'Estimates' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ],
    };

    return [...commonItems, ...(roleSpecificItems[user?.role || ''] || [])];
  };

  const navItems = getNavItems();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-30 h-screen w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Repair Center</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);

                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onClose}
                      className={`
                        flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                        ${active
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {user?.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
