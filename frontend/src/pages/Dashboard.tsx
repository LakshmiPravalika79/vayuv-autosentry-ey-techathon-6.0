import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TruckIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon,
  BellAlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { dashboardAPI } from '../services/api';
import type { DashboardStats } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

// Demo data for charts
const healthTrendData = [
  { day: 'Mon', score: 92 },
  { day: 'Tue', score: 88 },
  { day: 'Wed', score: 85 },
  { day: 'Thu', score: 89 },
  { day: 'Fri', score: 91 },
  { day: 'Sat', score: 87 },
  { day: 'Sun', score: 90 },
];

const predictionData = [
  { month: 'Jan', predictions: 12 },
  { month: 'Feb', predictions: 19 },
  { month: 'Mar', predictions: 15 },
  { month: 'Apr', predictions: 23 },
  { month: 'May', predictions: 18 },
  { month: 'Jun', predictions: 25 },
];

// Demo dashboard stats
const demoStats: DashboardStats = {
  vehicles: { total: 10, active: 8, maintenance: 1, inactive: 1 },
  alerts: {
    total: 15,
    unread: 3,
    critical: 1,
    warning: 4,
    recent: [
      { id: '1', userId: '1', vehicleId: '1', type: 'WARNING', message: 'Engine temperature elevated on VH-001', isRead: false, createdAt: new Date().toISOString() },
      { id: '2', userId: '1', vehicleId: '2', type: 'INFO', message: 'Scheduled maintenance due for VH-002', isRead: false, createdAt: new Date().toISOString() },
      { id: '3', userId: '1', vehicleId: '3', type: 'CRITICAL', message: 'Brake wear critical on VH-003', isRead: false, createdAt: new Date().toISOString() },
    ],
  },
  appointments: {
    upcoming: [],
    total: 45,
    scheduled: 5,
    completed: 38,
  },
  predictions: {
    total: 127,
    unacknowledged: 8,
    critical: 2,
    high: 5,
    recent: [],
  },
  feedback: {
    total: 89,
    averageRating: 4.6,
  },
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="card card-hover p-6"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-secondary-400">{title}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        {subtitle && (
          <p className="mt-1 text-sm text-secondary-500">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend.positive ? 'text-success-500' : 'text-danger-500'}`}>
            <ArrowTrendingUpIcon className={`w-4 h-4 ${!trend.positive && 'rotate-180'}`} />
            <span>{trend.value}% from last week</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </motion.div>
);

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getOverview();
        return response.data.data as DashboardStats;
      } catch {
        // Return demo data if API fails
        return demoStats;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const stats = data || demoStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Dashboard</h1>
        <p className="text-secondary-400">Welcome back! Here's your vehicle health overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Vehicles"
          value={stats.vehicles.total}
          subtitle={`${stats.vehicles.active} in good condition`}
          icon={TruckIcon}
          color="bg-primary-600"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Active Predictions"
          value={stats.predictions.unacknowledged}
          subtitle={`${stats.predictions.critical} critical`}
          icon={ExclamationTriangleIcon}
          color="bg-warning-500"
        />
        <StatCard
          title="Scheduled Appointments"
          value={stats.appointments.scheduled}
          subtitle={`${stats.appointments.completed} completed`}
          icon={CalendarIcon}
          color="bg-success-500"
        />
        <StatCard
          title="Unread Alerts"
          value={stats.alerts.unread}
          subtitle={`${stats.alerts.critical} critical`}
          icon={BellAlertIcon}
          color="bg-danger-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Health Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Vehicle Health Score</h3>
              <p className="text-sm text-secondary-400">Overall health of your vehicles</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-success-500">89%</span>
              <CheckCircleIcon className="w-6 h-6 text-success-500" />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={healthTrendData}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis domain={[70, 100]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#healthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Predictions Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Predictions Generated</h3>
              <p className="text-sm text-secondary-400">Monthly prediction count</p>
            </div>
            <ChartBarIcon className="w-6 h-6 text-primary-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="predictions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent activity row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
            <Link to="/ueba-alerts" className="text-sm text-primary-400 hover:text-primary-300">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats.alerts.recent.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary-800/50"
              >
                <div
                  className={`p-1.5 rounded-full ${
                    alert.type === 'CRITICAL'
                      ? 'bg-danger-500/20 text-danger-500'
                      : alert.type === 'WARNING'
                      ? 'bg-warning-500/20 text-warning-500'
                      : 'bg-primary-500/20 text-primary-400'
                  }`}
                >
                  <BellAlertIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{alert.message}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    <ClockIcon className="w-3 h-3 inline mr-1" />
                    Just now
                  </p>
                </div>
                <span
                  className={`badge ${
                    alert.type === 'CRITICAL'
                      ? 'badge-danger'
                      : alert.type === 'WARNING'
                      ? 'badge-warning'
                      : 'badge-info'
                  }`}
                >
                  {alert.type}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Customer Satisfaction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Customer Satisfaction</h3>
            <Link to="/feedback" className="text-sm text-primary-400 hover:text-primary-300">
              View feedback
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#334155"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#22c55e"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(stats.feedback.averageRating / 5) * 352} 352`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-2xl font-bold text-white">{stats.feedback.averageRating}</span>
                  <span className="text-secondary-400">/5</span>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm text-secondary-400 w-4">{rating}</span>
                    <div className="flex-1 h-2 bg-secondary-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning-500 rounded-full"
                        style={{ width: `${rating === 5 ? 60 : rating === 4 ? 25 : rating === 3 ? 10 : 5}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-secondary-400 mt-3">
                Based on {stats.feedback.total} reviews
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/vehicles"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary-800/50 hover:bg-secondary-700/50 transition-colors"
          >
            <TruckIcon className="w-8 h-8 text-primary-400" />
            <span className="text-sm text-white">Add Vehicle</span>
          </Link>
          <Link
            to="/appointments"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary-800/50 hover:bg-secondary-700/50 transition-colors"
          >
            <CalendarIcon className="w-8 h-8 text-success-500" />
            <span className="text-sm text-white">Book Service</span>
          </Link>
          <Link
            to="/telemetry"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary-800/50 hover:bg-secondary-700/50 transition-colors"
          >
            <ChartBarIcon className="w-8 h-8 text-warning-500" />
            <span className="text-sm text-white">View Telemetry</span>
          </Link>
          <Link
            to="/predictions"
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary-800/50 hover:bg-secondary-700/50 transition-colors"
          >
            <ExclamationTriangleIcon className="w-8 h-8 text-danger-500" />
            <span className="text-sm text-white">Check Predictions</span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
