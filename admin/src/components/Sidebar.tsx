// admin/src/components/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  FileText,
  File,
  Image,
  FolderTree,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Layout,
  Search,
  BarChart3,
  Tag,
  BookOpen,
  Globe,
  Shield
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Navigation items with role-based access
  const navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />
    },
    {
      path: '/posts',
      label: 'Posts',
      icon: <FileText className="w-5 h-5" />,
      roles: ['admin', 'editor', 'author']
    },
    {
      path: '/pages',
      label: 'Pages',
      icon: <File className="w-5 h-5" />,
      roles: ['admin', 'editor']
    },
    {
      path: '/media',
      label: 'Media',
      icon: <Image className="w-5 h-5" />,
      roles: ['admin', 'editor', 'author']
    },
    {
      path: '/categories',
      label: 'Categories',
      icon: <FolderTree className="w-5 h-5" />,
      roles: ['admin', 'editor']
    },
    {
      path: '/tags',
      label: 'Tags',
      icon: <Tag className="w-5 h-5" />,
      roles: ['admin', 'editor']
    },
    {
      path: '/users',
      label: 'Users',
      icon: <Users className="w-5 h-5" />,
      roles: ['admin', 'super_admin']
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      roles: ['admin', 'super_admin']
    },
    {
      path: '/seo',
      label: 'SEO',
      icon: <Globe className="w-5 h-5" />,
      roles: ['admin', 'editor']
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['admin', 'super_admin']
    }
  ];

  // Filter items based on user role
  const filteredItems = navItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  // Check if path is active
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Toggle expanded item
  const toggleExpand = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Render navigation items
  const renderNavItems = (items: NavItem[]) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.includes(item.label);
      const active = isActive(item.path);

      if (hasChildren) {
        return (
          <div key={item.path}>
            <button
              onClick={() => toggleExpand(item.label)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </div>
              <svg
                className={`w-4 h-4 transition-transform ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {renderNavItems(item.children!)}
              </div>
            )}
          </div>
        );
      }

      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            active
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {item.icon}
          <span className="font-medium">{item.label}</span>
        </Link>
      );
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Layout className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              CorePress
            </span>
          </Link>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg lg:hidden hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                {user.role}
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {renderNavItems(filteredItems)}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;