import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types';
import toast from 'react-hot-toast';
import {
  HomeIcon,
  TruckIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  CubeTransparentIcon,
  MagnifyingGlassCircleIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[]; // If undefined, visible to all
}

// Navigation items with role-based visibility
const navigationItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'My Vehicles', href: '/vehicles', icon: TruckIcon },
  { name: 'Live Telemetry', href: '/telemetry', icon: ChartBarIcon },
  { name: 'AI Predictions', href: '/predictions', icon: ExclamationTriangleIcon },
  { name: 'Digital Twin', href: '/digital-twin', icon: CubeTransparentIcon },
  { name: 'Service Appointments', href: '/appointments', icon: CalendarIcon },
  { name: 'My Feedback', href: '/feedback', icon: ChatBubbleLeftRightIcon },
  { name: 'RCA Insights', href: '/rca-insights', icon: MagnifyingGlassCircleIcon },
  { name: 'Security Alerts', href: '/ueba-alerts', icon: ShieldCheckIcon },
  // Admin-only items
  { name: 'User Management', href: '/admin/users', icon: UsersIcon, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Service Centers', href: '/admin/centers', icon: BuildingOfficeIcon, roles: ['ADMIN', 'MANAGER'] },
  // Common
  { name: 'Settings', href: '/settings', icon: CogIcon },
];

// Role display labels
const roleLabels: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Fleet Manager',
  SERVICE_ADVISOR: 'Service Advisor',
  TECHNICIAN: 'Technician',
  CUSTOMER: 'Vehicle Owner',
};

// Demo notifications
const demoNotifications = [
  { id: '1', title: 'Battery Alert', message: 'BMW 328i battery voltage is low (11.8V)', type: 'warning', time: '5 min ago', read: false },
  { id: '2', title: 'Service Reminder', message: 'Tesla Model 3 oil change due in 500 miles', type: 'info', time: '1 hour ago', read: false },
  { id: '3', title: 'Prediction Alert', message: 'Brake pads predicted to need replacement in 30 days', type: 'danger', time: '2 hours ago', read: false },
  { id: '4', title: 'Appointment Confirmed', message: 'Service appointment confirmed for Dec 15', type: 'success', time: '1 day ago', read: true },
];

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(demoNotifications);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    toast.success('Notification marked as read');
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const clearNotification = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success('Notification dismissed');
  };

  // Filter navigation based on user role
  const navigation = navigationItems.filter(item => {
    if (!item.roles) return true; // Visible to all
    return item.roles.includes(user?.role as UserRole);
  });

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-secondary-900">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-secondary-700">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">AutoSentry</span>
            <button
              className="ml-auto lg:hidden text-gray-500 dark:text-secondary-400 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Role Badge */}
          {isAdmin && (
            <div className="px-4 py-2 bg-primary-100 dark:bg-primary-900/30 border-b border-gray-200 dark:border-secondary-700">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                {roleLabels[user?.role || 'CUSTOMER']} Mode
              </span>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200 dark:border-secondary-700">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-secondary-400 truncate">
                  {roleLabels[user?.role || 'CUSTOMER']}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-secondary-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-secondary-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-secondary-700">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              className="lg:hidden text-gray-500 dark:text-secondary-400 hover:text-gray-900 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setNotificationOpen(!notificationOpen)}
                  className="relative text-gray-500 dark:text-secondary-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <BellIcon className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 rounded-full text-xs text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                <AnimatePresence>
                  {notificationOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-700 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-secondary-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Notification List */}
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 dark:text-secondary-400">
                            No notifications
                          </div>
                        ) : (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-gray-100 dark:border-secondary-700/50 hover:bg-gray-50 dark:hover:bg-secondary-700/30 transition-colors ${
                                !notification.read ? 'bg-primary-50 dark:bg-secondary-700/20' : ''
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${
                                  notification.type === 'danger' ? 'bg-danger-500' :
                                  notification.type === 'warning' ? 'bg-warning-500' :
                                  notification.type === 'success' ? 'bg-success-500' :
                                  'bg-primary-500'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-secondary-400 mt-0.5 line-clamp-2">{notification.message}</p>
                                  <p className="text-xs text-gray-400 dark:text-secondary-500 mt-1">{notification.time}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!notification.read && (
                                    <button 
                                      onClick={() => markAsRead(notification.id)}
                                      className="p-1 text-gray-400 dark:text-secondary-400 hover:text-success-500 dark:hover:text-success-400"
                                      title="Mark as read"
                                    >
                                      <CheckIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => clearNotification(notification.id)}
                                    className="p-1 text-gray-400 dark:text-secondary-400 hover:text-danger-500 dark:hover:text-danger-400"
                                    title="Dismiss"
                                  >
                                    <XMarkIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2 border-t border-secondary-700 bg-secondary-800/50">
                        <button 
                          onClick={() => {
                            setNotificationOpen(false);
                            navigate('/settings');
                          }}
                          className="text-xs text-primary-400 hover:text-primary-300 w-full text-center"
                        >
                          Notification Settings
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* User menu (mobile) */}
              <div className="lg:hidden">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
