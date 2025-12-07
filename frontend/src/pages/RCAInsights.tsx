import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassCircleIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

// Demo RCA/CAPA data
const demoRCARecords = [
  {
    id: '1',
    vehicleId: 'v001',
    vehicleVin: 'WBA3A5C55CF256789',
    predictionId: 'p001',
    component: 'Engine Cooling System',
    rootCause: 'Thermostat valve degradation due to mineral deposits from coolant',
    contributingFactors: [
      'Infrequent coolant changes',
      'Hard water used in coolant mix',
      'High ambient temperatures',
    ],
    correctiveActions: [
      {
        action: 'Replace thermostat assembly',
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        action: 'Flush cooling system',
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        action: 'Install coolant filter',
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ],
    preventiveActions: [
      {
        action: 'Schedule bi-annual coolant flush',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 86400000 * 180).toISOString(),
      },
      {
        action: 'Use distilled water for coolant mix',
        status: 'RECOMMENDED',
      },
    ],
    effectiveness: 95,
    status: 'CLOSED',
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: '2',
    vehicleId: 'v002',
    vehicleVin: 'WDDGF8AB1CA123456',
    predictionId: 'p002',
    component: 'Brake System',
    rootCause: 'Brake fluid contamination causing ABS valve sticking',
    contributingFactors: [
      'Moisture ingress through worn seals',
      'Extended brake fluid service interval',
    ],
    correctiveActions: [
      {
        action: 'Replace brake fluid reservoir cap',
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        action: 'Complete brake system flush',
        status: 'IN_PROGRESS',
      },
    ],
    preventiveActions: [
      {
        action: 'Annual brake fluid testing',
        status: 'RECOMMENDED',
      },
    ],
    effectiveness: null,
    status: 'IN_PROGRESS',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '3',
    vehicleId: 'v003',
    vehicleVin: 'JTDKN3DU5A0123456',
    predictionId: 'p003',
    component: 'Battery System',
    rootCause: 'Premature battery degradation from parasitic drain',
    contributingFactors: [
      'Aftermarket alarm system with high standby current',
      'Short trip driving patterns',
      'Extreme temperature exposure',
    ],
    correctiveActions: [
      {
        action: 'Identify and fix parasitic drain source',
        status: 'PENDING',
      },
      {
        action: 'Replace battery',
        status: 'PENDING',
      },
    ],
    preventiveActions: [
      {
        action: 'Install battery maintainer for extended parking',
        status: 'RECOMMENDED',
      },
    ],
    effectiveness: null,
    status: 'OPEN',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const demoStats = {
  totalRCA: 45,
  openCases: 8,
  avgResolutionTime: 5.2,
  avgEffectiveness: 89,
  topRootCauses: [
    { cause: 'Wear and degradation', count: 18 },
    { cause: 'Fluid contamination', count: 12 },
    { cause: 'Electrical issues', count: 8 },
    { cause: 'Environmental factors', count: 7 },
  ],
  trendData: [
    { month: 'Jan', cases: 5, resolved: 4 },
    { month: 'Feb', cases: 7, resolved: 6 },
    { month: 'Mar', cases: 4, resolved: 5 },
    { month: 'Apr', cases: 6, resolved: 6 },
    { month: 'May', cases: 8, resolved: 7 },
    { month: 'Jun', cases: 5, resolved: 5 },
  ],
};

export default function RCAInsights() {
  const [selectedRCA, setSelectedRCA] = useState<typeof demoRCARecords[0] | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const { data: rcaRecords = demoRCARecords } = useQuery({
    queryKey: ['rca'],
    queryFn: async () => {
      // In production, this would fetch from API
      return demoRCARecords;
    },
  });

  const { data: stats = demoStats } = useQuery({
    queryKey: ['rcaStats'],
    queryFn: async () => {
      return demoStats;
    },
  });

  const filteredRecords = rcaRecords.filter(
    (rca) => filterStatus === 'ALL' || rca.status === filterStatus
  );

  const statusColors: Record<string, string> = {
    OPEN: 'bg-danger-500/10 text-danger-400 border-danger-500/30',
    IN_PROGRESS: 'bg-warning-500/10 text-warning-400 border-warning-500/30',
    CLOSED: 'bg-success-500/10 text-success-400 border-success-500/30',
  };

  const actionStatusColors: Record<string, string> = {
    PENDING: 'text-secondary-400',
    IN_PROGRESS: 'text-warning-400',
    COMPLETED: 'text-success-400',
    RECOMMENDED: 'text-primary-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">RCA & CAPA Insights</h1>
          <p className="text-secondary-400">Root Cause Analysis and Corrective Action Planning</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input w-48"
        >
          <option value="ALL">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <MagnifyingGlassCircleIcon className="w-6 h-6 text-primary-400" />
            <span className="text-secondary-400">Total RCA Cases</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalRCA}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <ClockIcon className="w-6 h-6 text-warning-400" />
            <span className="text-secondary-400">Open Cases</span>
          </div>
          <p className="text-3xl font-bold text-warning-400">{stats.openCases}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingDownIcon className="w-6 h-6 text-success-400" />
            <span className="text-secondary-400">Avg Resolution Time</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.avgResolutionTime}</p>
          <p className="text-sm text-secondary-500">days</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-2">
            <ArrowTrendingUpIcon className="w-6 h-6 text-success-400" />
            <span className="text-secondary-400">Avg Effectiveness</span>
          </div>
          <p className="text-3xl font-bold text-success-400">{stats.avgEffectiveness}%</p>
        </motion.div>
      </div>

      {/* Top Root Causes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-primary-400" />
          Top Root Causes
        </h2>
        <div className="space-y-3">
          {stats.topRootCauses.map((item, index) => (
            <div key={item.cause} className="flex items-center gap-4">
              <span className="text-secondary-400 w-6">{index + 1}.</span>
              <span className="text-white flex-1">{item.cause}</span>
              <div className="flex-1 h-2 bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full"
                  style={{
                    width: `${(item.count / stats.topRootCauses[0].count) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-secondary-400 w-12 text-right">{item.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* RCA Records List */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">RCA Cases</h2>
        <div className="space-y-4">
          {filteredRecords.map((rca, index) => (
            <motion.div
              key={rca.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card p-6 cursor-pointer hover:border-primary-500/50 transition-colors"
              onClick={() => setSelectedRCA(rca)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{rca.component}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs border ${statusColors[rca.status]}`}>
                      {rca.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-400">VIN: {rca.vehicleVin}</p>
                </div>
                {rca.effectiveness !== null && (
                  <div className="text-right">
                    <p className="text-sm text-secondary-400">Effectiveness</p>
                    <p className="text-xl font-bold text-success-400">{rca.effectiveness}%</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-secondary-800/50 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MagnifyingGlassCircleIcon className="w-5 h-5 text-primary-400" />
                  <span className="text-sm font-medium text-white">Root Cause</span>
                </div>
                <p className="text-secondary-300">{rca.rootCause}</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-500">
                  Created: {new Date(rca.createdAt).toLocaleDateString()}
                </span>
                <span className="text-primary-400 hover:underline">View Details →</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RCA Detail Modal */}
      {selectedRCA && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card w-full max-w-3xl p-6 my-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-2">{selectedRCA.component}</h2>
                <p className="text-secondary-400">VIN: {selectedRCA.vehicleVin}</p>
              </div>
              <button onClick={() => setSelectedRCA(null)} className="text-secondary-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Root Cause */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MagnifyingGlassCircleIcon className="w-5 h-5 text-primary-400" />
                <h3 className="font-semibold text-white">Root Cause</h3>
              </div>
              <p className="text-secondary-300 p-4 bg-secondary-800/50 rounded-lg">
                {selectedRCA.rootCause}
              </p>
            </div>

            {/* Contributing Factors */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="w-5 h-5 text-warning-400" />
                <h3 className="font-semibold text-white">Contributing Factors</h3>
              </div>
              <ul className="space-y-2">
                {selectedRCA.contributingFactors.map((factor, i) => (
                  <li key={i} className="flex items-center gap-2 text-secondary-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning-400" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Corrective Actions */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <WrenchScrewdriverIcon className="w-5 h-5 text-danger-400" />
                <h3 className="font-semibold text-white">Corrective Actions</h3>
              </div>
              <div className="space-y-2">
                {selectedRCA.correctiveActions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-secondary-800/50 rounded-lg">
                    <span className="text-secondary-300">{action.action}</span>
                    <span className={`text-sm ${actionStatusColors[action.status]}`}>
                      {action.status === 'COMPLETED' && <CheckCircleIcon className="w-5 h-5 inline mr-1" />}
                      {action.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Preventive Actions */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="w-5 h-5 text-success-400" />
                <h3 className="font-semibold text-white">Preventive Actions</h3>
              </div>
              <div className="space-y-2">
                {selectedRCA.preventiveActions.map((action, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-secondary-800/50 rounded-lg">
                    <span className="text-secondary-300">{action.action}</span>
                    <span className={`text-sm ${actionStatusColors[action.status]}`}>
                      {action.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setSelectedRCA(null)} className="btn-primary">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
