import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dashboardAPI } from '../services/api';

// Demo admin stats
const demoAdminStats = {
  totalUsers: 1250,
  totalVehicles: 3420,
  activeAlerts: 45,
  appointmentsToday: 28,
  revenueThisMonth: 125000,
  avgResolutionTime: 2.4,
  customerSatisfaction: 4.6,
  predictionAccuracy: 94.2,
};

// Demo data for charts
const userGrowthData = [
  { month: 'Jul', users: 850, vehicles: 2100 },
  { month: 'Aug', users: 920, vehicles: 2350 },
  { month: 'Sep', users: 1000, vehicles: 2600 },
  { month: 'Oct', users: 1080, vehicles: 2900 },
  { month: 'Nov', users: 1180, vehicles: 3200 },
  { month: 'Dec', users: 1250, vehicles: 3420 },
];

const alertsByCategory = [
  { name: 'Battery', value: 35, color: '#f59e0b' },
  { name: 'Brakes', value: 25, color: '#ef4444' },
  { name: 'Engine', value: 20, color: '#8b5cf6' },
  { name: 'Tires', value: 15, color: '#3b82f6' },
  { name: 'Other', value: 5, color: '#6b7280' },
];

const serviceMetrics = [
  { name: 'Mon', completed: 45, scheduled: 52 },
  { name: 'Tue', completed: 38, scheduled: 42 },
  { name: 'Wed', completed: 51, scheduled: 55 },
  { name: 'Thu', completed: 42, scheduled: 48 },
  { name: 'Fri', completed: 55, scheduled: 60 },
  { name: 'Sat', completed: 28, scheduled: 30 },
  { name: 'Sun', completed: 12, scheduled: 15 },
];

const recentAlerts = [
  { id: 1, vehicle: 'BMW X5 (MH-01-AB-1234)', issue: 'Battery voltage low', severity: 'HIGH', time: '5 min ago' },
  { id: 2, vehicle: 'Tesla Model S (DL-02-CD-5678)', issue: 'Brake pad wear 85%', severity: 'MEDIUM', time: '12 min ago' },
  { id: 3, vehicle: 'Honda City (KA-03-EF-9012)', issue: 'Oil change due', severity: 'LOW', time: '25 min ago' },
  { id: 4, vehicle: 'Toyota Camry (TN-04-GH-3456)', issue: 'Tire pressure low', severity: 'MEDIUM', time: '1 hour ago' },
];

const topServiceCenters = [
  { name: 'AutoCare Delhi', appointments: 156, rating: 4.8, revenue: 45000 },
  { name: 'SpeedFix Mumbai', appointments: 142, rating: 4.7, revenue: 42000 },
  { name: 'CarDoctor Bangalore', appointments: 128, rating: 4.9, revenue: 38000 },
  { name: 'WheelWorks Chennai', appointments: 115, rating: 4.6, revenue: 35000 },
];

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend.positive ? 'text-success-500' : 'text-danger-500'}`}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        <p className="text-sm text-secondary-400">{title}</p>
        <p className="text-xs text-secondary-500 mt-1">{subtitle}</p>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { data: stats = demoAdminStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        const response = await dashboardAPI.getOverview();
        return response.data;
      } catch {
        return demoAdminStats;
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-secondary-400">Platform overview and fleet management</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <span className="text-sm text-secondary-400">Last updated:</span>
          <span className="text-sm text-white">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers?.toLocaleString() || '1,250'}
          subtitle="Registered vehicle owners"
          icon={UsersIcon}
          color="bg-primary-600"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Total Vehicles"
          value={stats.totalVehicles?.toLocaleString() || '3,420'}
          subtitle="Registered across platform"
          icon={TruckIcon}
          color="bg-success-600"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Active Alerts"
          value={stats.activeAlerts || 45}
          subtitle="Requiring attention"
          icon={ExclamationTriangleIcon}
          color="bg-warning-600"
          trend={{ value: 5, positive: false }}
        />
        <StatCard
          title="Today's Appointments"
          value={stats.appointmentsToday || 28}
          subtitle="Scheduled services"
          icon={WrenchScrewdriverIcon}
          color="bg-info-600"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Revenue"
          value={`₹${((stats.revenueThisMonth || 125000) / 1000).toFixed(0)}K`}
          subtitle="From service bookings"
          icon={CurrencyDollarIcon}
          color="bg-emerald-600"
          trend={{ value: 15, positive: true }}
        />
        <StatCard
          title="Avg Resolution Time"
          value={`${stats.avgResolutionTime || 2.4} hrs`}
          subtitle="Issue to fix average"
          icon={ClockIcon}
          color="bg-violet-600"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Customer Satisfaction"
          value={`${stats.customerSatisfaction || 4.6}/5`}
          subtitle="Average rating"
          icon={CheckCircleIcon}
          color="bg-pink-600"
        />
        <StatCard
          title="Prediction Accuracy"
          value={`${stats.predictionAccuracy || 94.2}%`}
          subtitle="ML model performance"
          icon={ChartBarIcon}
          color="bg-cyan-600"
          trend={{ value: 2, positive: true }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User & Vehicle Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">User & Vehicle Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vehicles"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  name="Vehicles"
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stackId="2"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  name="Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Alerts by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Alerts by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {alertsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Service Metrics Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Weekly Service Metrics</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serviceMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="scheduled" fill="#6366f1" name="Scheduled" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#10b981" name="Completed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Critical Alerts</h3>
            <button className="text-sm text-primary-400 hover:text-primary-300">View All</button>
          </div>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-secondary-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      alert.severity === 'HIGH'
                        ? 'bg-danger-500'
                        : alert.severity === 'MEDIUM'
                        ? 'bg-warning-500'
                        : 'bg-success-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-white">{alert.vehicle}</p>
                    <p className="text-xs text-secondary-400">{alert.issue}</p>
                  </div>
                </div>
                <span className="text-xs text-secondary-500">{alert.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Service Centers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Service Centers</h3>
            <button className="text-sm text-primary-400 hover:text-primary-300">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-secondary-400 uppercase">
                  <th className="pb-3">Center</th>
                  <th className="pb-3">Appointments</th>
                  <th className="pb-3">Rating</th>
                  <th className="pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-700">
                {topServiceCenters.map((center, index) => (
                  <tr key={index}>
                    <td className="py-3 text-sm text-white">{center.name}</td>
                    <td className="py-3 text-sm text-secondary-300">{center.appointments}</td>
                    <td className="py-3">
                      <span className="flex items-center gap-1 text-sm text-warning-400">
                        ⭐ {center.rating}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-success-400">₹{center.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-secondary-800 rounded-lg">
            <div className="w-3 h-3 bg-success-500 rounded-full mx-auto mb-2" />
            <p className="text-sm font-medium text-white">API Server</p>
            <p className="text-xs text-success-400">Healthy</p>
          </div>
          <div className="text-center p-4 bg-secondary-800 rounded-lg">
            <div className="w-3 h-3 bg-success-500 rounded-full mx-auto mb-2" />
            <p className="text-sm font-medium text-white">ML Service</p>
            <p className="text-xs text-success-400">Healthy</p>
          </div>
          <div className="text-center p-4 bg-secondary-800 rounded-lg">
            <div className="w-3 h-3 bg-success-500 rounded-full mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Agent System</p>
            <p className="text-xs text-success-400">Healthy</p>
          </div>
          <div className="text-center p-4 bg-secondary-800 rounded-lg">
            <div className="w-3 h-3 bg-success-500 rounded-full mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Database</p>
            <p className="text-xs text-success-400">Healthy</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
