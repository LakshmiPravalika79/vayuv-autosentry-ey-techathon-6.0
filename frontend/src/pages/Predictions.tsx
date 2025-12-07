import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { predictionsAPI } from '../services/api';
import type { Prediction } from '../types';

// Demo predictions
const demoPredictions: Prediction[] = [
  {
    id: '1',
    vehicleId: '1',
    component: 'BRAKES',
    prediction: 'Brake pad wear detected - replacement recommended within 2000 miles',
    probability: 0.87,
    severity: 'HIGH',
    estimatedTimeToFailure: 14,
    recommendedAction: 'Schedule brake pad replacement within 2 weeks',
    isAcknowledged: false,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    vehicleId: '2',
    component: 'ENGINE',
    prediction: 'Engine temperature trending above normal - cooling system check advised',
    probability: 0.72,
    severity: 'MEDIUM',
    estimatedTimeToFailure: 30,
    recommendedAction: 'Inspect coolant levels and thermostat',
    isAcknowledged: false,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    vehicleId: '1',
    component: 'BATTERY',
    prediction: 'Battery degradation detected - performance may decrease in cold weather',
    probability: 0.65,
    severity: 'LOW',
    estimatedTimeToFailure: 60,
    recommendedAction: 'Consider battery replacement before winter',
    isAcknowledged: true,
    acknowledgedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    vehicleId: '3',
    component: 'TRANSMISSION',
    prediction: 'Unusual transmission behavior detected - immediate inspection required',
    probability: 0.92,
    severity: 'CRITICAL',
    estimatedTimeToFailure: 3,
    recommendedAction: 'Do not drive. Schedule immediate service appointment.',
    isAcknowledged: false,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    vehicleId: '2',
    component: 'OIL',
    prediction: 'Oil change due based on mileage and usage patterns',
    probability: 0.95,
    severity: 'MEDIUM',
    estimatedTimeToFailure: 7,
    recommendedAction: 'Schedule routine oil change within 1 week',
    isAcknowledged: false,
    acknowledgedAt: null,
    createdAt: new Date().toISOString(),
  },
];

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-success-500/10', text: 'text-success-500', border: 'border-success-500/30' },
  MEDIUM: { bg: 'bg-warning-500/10', text: 'text-warning-500', border: 'border-warning-500/30' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' },
  CRITICAL: { bg: 'bg-danger-500/10', text: 'text-danger-500', border: 'border-danger-500/30' },
};

const componentIcons: Record<string, React.ElementType> = {
  BRAKES: BoltIcon,
  ENGINE: BoltIcon,
  BATTERY: BoltIcon,
  TRANSMISSION: BoltIcon,
  OIL: BoltIcon,
};

export default function Predictions() {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  const queryClient = useQueryClient();

  const { data: predictions = demoPredictions, isLoading } = useQuery({
    queryKey: ['predictions', severityFilter, showAcknowledged],
    queryFn: async () => {
      try {
        const response = await predictionsAPI.getByVehicle('all', { acknowledged: showAcknowledged });
        return response.data.data as Prediction[];
      } catch {
        return demoPredictions;
      }
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => predictionsAPI.acknowledge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      toast.success('Prediction acknowledged');
    },
    onError: () => {
      toast.error('Failed to acknowledge prediction');
    },
  });

  const filteredPredictions = predictions.filter((p) => {
    if (severityFilter && p.severity !== severityFilter) return false;
    if (!showAcknowledged && p.isAcknowledged) return false;
    return true;
  });

  const stats = {
    total: predictions.length,
    critical: predictions.filter((p) => p.severity === 'CRITICAL' && !p.isAcknowledged).length,
    high: predictions.filter((p) => p.severity === 'HIGH' && !p.isAcknowledged).length,
    unacknowledged: predictions.filter((p) => !p.isAcknowledged).length,
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
      <div>
        <h1 className="text-2xl font-bold text-white">Predictive Alerts</h1>
        <p className="text-secondary-400">AI-powered maintenance predictions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4"
        >
          <p className="text-sm text-secondary-400">Total Predictions</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-4"
        >
          <p className="text-sm text-secondary-400">Critical</p>
          <p className="text-2xl font-bold text-danger-500">{stats.critical}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <p className="text-sm text-secondary-400">High Priority</p>
          <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <p className="text-sm text-secondary-400">Pending Action</p>
          <p className="text-2xl font-bold text-warning-500">{stats.unacknowledged}</p>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-secondary-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showAcknowledged}
            onChange={(e) => setShowAcknowledged(e.target.checked)}
            className="w-4 h-4 rounded border-secondary-600 bg-secondary-700 text-primary-600"
          />
          <span className="text-sm text-secondary-400">Show acknowledged</span>
        </label>
      </div>

      {/* Predictions List */}
      <div className="space-y-4">
        {filteredPredictions.map((prediction, index) => {
          const colors = severityColors[prediction.severity];
          const Icon = componentIcons[prediction.component] || ExclamationTriangleIcon;

          return (
            <motion.div
              key={prediction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card p-6 border ${colors.border} ${prediction.isAcknowledged ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${colors.bg} ${colors.text}`}>
                          {prediction.severity}
                        </span>
                        <span className="text-sm text-secondary-400">
                          {prediction.component}
                        </span>
                        {prediction.isAcknowledged && (
                          <span className="badge badge-success flex items-center gap-1">
                            <CheckCircleIcon className="w-3 h-3" />
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-medium text-white">
                        {prediction.prediction}
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {Math.round(prediction.probability * 100)}%
                      </p>
                      <p className="text-xs text-secondary-400">confidence</p>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-lg bg-secondary-800/50">
                    <p className="text-sm text-secondary-300">
                      <strong className="text-white">Recommended Action:</strong>{' '}
                      {prediction.recommendedAction}
                    </p>
                    {prediction.estimatedTimeToFailure && (
                      <p className="text-sm text-secondary-400 mt-2 flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        Estimated time to failure: {prediction.estimatedTimeToFailure} days
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-secondary-500">
                      Created: {new Date(prediction.createdAt).toLocaleString()}
                    </p>
                    {!prediction.isAcknowledged && (
                      <div className="flex gap-2">
                        <button className="btn-outline text-sm py-1 px-3">
                          Schedule Service
                        </button>
                        <button
                          onClick={() => acknowledgeMutation.mutate(prediction.id)}
                          className="btn-primary text-sm py-1 px-3"
                        >
                          Acknowledge
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredPredictions.length === 0 && (
        <div className="card p-12 text-center">
          <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">All caught up!</h3>
          <p className="text-secondary-400">
            {showAcknowledged
              ? 'No predictions match your filters'
              : 'All predictions have been acknowledged'}
          </p>
        </div>
      )}
    </div>
  );
}
