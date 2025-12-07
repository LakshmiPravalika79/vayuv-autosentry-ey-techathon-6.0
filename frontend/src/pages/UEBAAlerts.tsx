import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  FingerPrintIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Demo UEBA alerts
const demoAlerts = [
  {
    id: '1',
    userId: 'user123',
    userName: 'John Smith',
    eventType: 'UNUSUAL_LOGIN_LOCATION',
    riskScore: 85,
    severity: 'HIGH',
    description: 'Login attempt from new geographic location (Paris, France) - 5,400 km from usual location',
    details: {
      location: 'Paris, France',
      ip: '185.234.xxx.xxx',
      device: 'Unknown Chrome/Windows',
      usualLocation: 'New York, USA',
      distance: '5,400 km',
    },
    status: 'OPEN',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    userId: 'user456',
    userName: 'Sarah Johnson',
    eventType: 'IMPOSSIBLE_TRAVEL',
    riskScore: 92,
    severity: 'CRITICAL',
    description: 'Impossible travel detected - Login from London 30 minutes after login from Tokyo',
    details: {
      previousLocation: 'Tokyo, Japan',
      currentLocation: 'London, UK',
      timeDifference: '30 minutes',
      requiredTravelTime: '12+ hours',
    },
    status: 'INVESTIGATING',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    userId: 'user789',
    userName: 'Mike Brown',
    eventType: 'UNUSUAL_TIME_ACCESS',
    riskScore: 65,
    severity: 'MEDIUM',
    description: 'Access at unusual time - 3:47 AM local time (normal hours: 8 AM - 6 PM)',
    details: {
      accessTime: '3:47 AM EST',
      normalRange: '8:00 AM - 6:00 PM EST',
      actionsPerformed: 'Viewed 15 vehicle records, exported data',
    },
    status: 'OPEN',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    userId: 'user101',
    userName: 'Emily Davis',
    eventType: 'DATA_EXFILTRATION_ATTEMPT',
    riskScore: 95,
    severity: 'CRITICAL',
    description: 'Large data export detected - 2.5GB of customer data downloaded in 5 minutes',
    details: {
      dataSize: '2.5 GB',
      exportTime: '5 minutes',
      recordsAccessed: '45,000 customer records',
      normalExport: '< 100 MB per session',
    },
    status: 'BLOCKED',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: '5',
    userId: 'user202',
    userName: 'David Wilson',
    eventType: 'FAILED_LOGIN_SPIKE',
    riskScore: 72,
    severity: 'HIGH',
    description: 'Multiple failed login attempts - 23 failed attempts in 10 minutes',
    details: {
      failedAttempts: 23,
      timeWindow: '10 minutes',
      sourceIPs: '3 different IPs',
      accountLocked: true,
    },
    status: 'RESOLVED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '6',
    userId: 'user303',
    userName: 'Lisa Anderson',
    eventType: 'PRIVILEGE_ESCALATION',
    riskScore: 88,
    severity: 'HIGH',
    description: 'Attempted privilege escalation - User tried to access admin endpoints without authorization',
    details: {
      attemptedResources: '/api/admin/users, /api/admin/settings',
      currentRole: 'TECHNICIAN',
      requiredRole: 'ADMIN',
      blocked: true,
    },
    status: 'OPEN',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

const demoStats = {
  totalAlerts: 156,
  criticalAlerts: 12,
  highAlerts: 34,
  mediumAlerts: 58,
  lowAlerts: 52,
  resolvedToday: 8,
  avgRiskScore: 67,
  blockedThreats: 23,
};

export default function UEBAAlerts() {
  const [selectedAlert, setSelectedAlert] = useState<typeof demoAlerts[0] | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const queryClient = useQueryClient();

  const { data: alerts = demoAlerts, isLoading } = useQuery({
    queryKey: ['uebaAlerts'],
    queryFn: async () => {
      // In production, fetch from UEBA service
      return demoAlerts;
    },
  });

  const { data: stats = demoStats } = useQuery({
    queryKey: ['uebaStats'],
    queryFn: async () => {
      return demoStats;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      // In production, call API
      return { alertId, status: 'INVESTIGATING' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uebaAlerts'] });
      toast.success('Alert acknowledged');
    },
  });

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && alert.status !== filterStatus) return false;
    return true;
  });

  const severityColors: Record<string, string> = {
    CRITICAL: 'bg-danger-500/10 text-danger-400 border-danger-500/30',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    MEDIUM: 'bg-warning-500/10 text-warning-400 border-warning-500/30',
    LOW: 'bg-success-500/10 text-success-400 border-success-500/30',
  };

  const statusColors: Record<string, string> = {
    OPEN: 'bg-danger-500/10 text-danger-400',
    INVESTIGATING: 'bg-warning-500/10 text-warning-400',
    RESOLVED: 'bg-success-500/10 text-success-400',
    BLOCKED: 'bg-primary-500/10 text-primary-400',
  };

  const eventIcons: Record<string, React.ElementType> = {
    UNUSUAL_LOGIN_LOCATION: MapPinIcon,
    IMPOSSIBLE_TRAVEL: GlobeAltIcon,
    UNUSUAL_TIME_ACCESS: ClockIcon,
    DATA_EXFILTRATION_ATTEMPT: ShieldExclamationIcon,
    FAILED_LOGIN_SPIKE: FingerPrintIcon,
    PRIVILEGE_ESCALATION: UserIcon,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">UEBA Security Alerts</h1>
          <p className="text-secondary-400">User & Entity Behavior Analytics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="input w-36"
          >
            <option value="ALL">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-36"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="RESOLVED">Resolved</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-danger-500 animate-pulse" />
            <span className="text-secondary-400 text-sm">Critical</span>
          </div>
          <p className="text-2xl font-bold text-danger-400">{stats.criticalAlerts}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-secondary-400 text-sm">High</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">{stats.highAlerts}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-warning-500" />
            <span className="text-secondary-400 text-sm">Medium</span>
          </div>
          <p className="text-2xl font-bold text-warning-400">{stats.mediumAlerts}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldExclamationIcon className="w-5 h-5 text-primary-400" />
            <span className="text-secondary-400 text-sm">Blocked</span>
          </div>
          <p className="text-2xl font-bold text-primary-400">{stats.blockedThreats}</p>
        </motion.div>
      </div>

      {/* Risk Score Gauge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Average Risk Score</h2>
        <div className="flex items-center gap-8">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-secondary-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(stats.avgRiskScore / 100) * 352} 352`}
                className={
                  stats.avgRiskScore >= 80
                    ? 'text-danger-500'
                    : stats.avgRiskScore >= 60
                    ? 'text-warning-500'
                    : 'text-success-500'
                }
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{stats.avgRiskScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-secondary-400">Low Risk (0-40)</span>
                <span className="text-success-400">{stats.lowAlerts} alerts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-400">Medium Risk (41-70)</span>
                <span className="text-warning-400">{stats.mediumAlerts} alerts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-400">High Risk (71-90)</span>
                <span className="text-orange-400">{stats.highAlerts} alerts</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-400">Critical Risk (91-100)</span>
                <span className="text-danger-400">{stats.criticalAlerts} alerts</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Alerts</h2>
        <div className="space-y-4">
          {filteredAlerts.map((alert, index) => {
            const EventIcon = eventIcons[alert.eventType] || ExclamationTriangleIcon;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-6"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${severityColors[alert.severity]}`}>
                    <EventIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {alert.eventType.replace(/_/g, ' ')}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${severityColors[alert.severity]}`}>
                            {alert.severity}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[alert.status]}`}>
                            {alert.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-secondary-400">
                          <UserIcon className="w-4 h-4" />
                          <span>{alert.userName}</span>
                          <span>•</span>
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-secondary-400">Risk Score</p>
                        <p className={`text-xl font-bold ${
                          alert.riskScore >= 80 ? 'text-danger-400' :
                          alert.riskScore >= 60 ? 'text-warning-400' : 'text-success-400'
                        }`}>
                          {alert.riskScore}
                        </p>
                      </div>
                    </div>
                    <p className="text-secondary-300 mb-4">{alert.description}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300"
                      >
                        <EyeIcon className="w-4 h-4" />
                        View Details
                      </button>
                      {alert.status === 'OPEN' && (
                        <button
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          className="flex items-center gap-1 text-sm text-warning-400 hover:text-warning-300"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-2xl p-6"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedAlert.eventType.replace(/_/g, ' ')}
                </h2>
                <p className="text-secondary-400">Alert ID: {selectedAlert.id}</p>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-secondary-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-secondary-800/50 rounded-lg">
                <p className="text-sm text-secondary-400 mb-1">User</p>
                <p className="text-white font-medium">{selectedAlert.userName}</p>
                <p className="text-sm text-secondary-500">{selectedAlert.userId}</p>
              </div>
              <div className="p-4 bg-secondary-800/50 rounded-lg">
                <p className="text-sm text-secondary-400 mb-1">Risk Score</p>
                <p className={`text-2xl font-bold ${
                  selectedAlert.riskScore >= 80 ? 'text-danger-400' :
                  selectedAlert.riskScore >= 60 ? 'text-warning-400' : 'text-success-400'
                }`}>
                  {selectedAlert.riskScore}/100
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-white mb-3">Description</h3>
              <p className="text-secondary-300 p-4 bg-secondary-800/50 rounded-lg">
                {selectedAlert.description}
              </p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-white mb-3">Details</h3>
              <div className="space-y-2">
                {Object.entries(selectedAlert.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-3 bg-secondary-800/50 rounded-lg">
                    <span className="text-secondary-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedAlert(null)} className="flex-1 btn-outline">
                Close
              </button>
              {selectedAlert.status === 'OPEN' && (
                <button
                  onClick={() => {
                    acknowledgeMutation.mutate(selectedAlert.id);
                    setSelectedAlert(null);
                  }}
                  className="flex-1 btn-primary"
                >
                  Acknowledge Alert
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
