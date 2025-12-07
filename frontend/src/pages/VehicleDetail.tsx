import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { vehiclesAPI, dashboardAPI } from '../services/api';
import type { Vehicle } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Demo telemetry data
const demoTelemetryHistory = [
  { time: '00:00', engineTemp: 85, oilPressure: 42, batteryVoltage: 12.6 },
  { time: '04:00', engineTemp: 87, oilPressure: 41, batteryVoltage: 12.5 },
  { time: '08:00', engineTemp: 92, oilPressure: 40, batteryVoltage: 12.4 },
  { time: '12:00', engineTemp: 95, oilPressure: 39, batteryVoltage: 12.3 },
  { time: '16:00', engineTemp: 93, oilPressure: 40, batteryVoltage: 12.5 },
  { time: '20:00', engineTemp: 88, oilPressure: 42, batteryVoltage: 12.6 },
];

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: vehicleData, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      try {
        const [vehicleRes, dashboardRes] = await Promise.all([
          vehiclesAPI.getById(id!),
          dashboardAPI.getVehicleDashboard(id!),
        ]);
        return {
          vehicle: vehicleRes.data.data as Vehicle,
          dashboard: dashboardRes.data.data,
        };
      } catch {
        // Demo data
        return {
          vehicle: {
            id: '1',
            vin: 'VH001DEMO2024001',
            make: 'Tesla',
            model: 'Model S',
            year: 2024,
            mileage: 15234,
            status: 'ACTIVE',
            userId: '1',
            createdAt: '2024-01-15',
            updatedAt: '2024-01-15',
          } as Vehicle,
          dashboard: {
            digitalTwin: {
              healthScore: 92,
              componentStatus: {
                engine: 'GOOD',
                transmission: 'GOOD',
                brakes: 'WARNING',
                battery: 'GOOD',
                tires: 'GOOD',
              },
              latestTelemetry: {
                data: {
                  engine_temperature: 92,
                  oil_pressure: 40,
                  battery_voltage: 12.4,
                  coolant_level: 85,
                  fuel_level: 72,
                },
              },
            },
          },
        };
      }
    },
    enabled: !!id,
  });

  if (isLoading || !vehicleData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner" />
      </div>
    );
  }

  const { vehicle, dashboard } = vehicleData;
  const digitalTwin = dashboard?.digitalTwin;

  const statusColors: Record<string, string> = {
    GOOD: 'text-success-500 bg-success-500/20',
    WARNING: 'text-warning-500 bg-warning-500/20',
    CRITICAL: 'text-danger-500 bg-danger-500/20',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/vehicles"
          className="p-2 rounded-lg bg-secondary-800 hover:bg-secondary-700 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5 text-secondary-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">
            {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-secondary-400">VIN: {vehicle.vin}</p>
        </div>
        <span
          className={`badge ${
            vehicle.status === 'ACTIVE'
              ? 'badge-success'
              : vehicle.status === 'MAINTENANCE'
              ? 'badge-warning'
              : 'badge-danger'
          }`}
        >
          {vehicle.status}
        </span>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <TruckIcon className="w-5 h-5 text-primary-400" />
            <span className="text-secondary-400">Year</span>
          </div>
          <p className="text-2xl font-bold text-white">{vehicle.year}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="w-5 h-5 text-success-500" />
            <span className="text-secondary-400">Mileage</span>
          </div>
          <p className="text-2xl font-bold text-white">{vehicle.mileage.toLocaleString()} mi</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <WrenchScrewdriverIcon className="w-5 h-5 text-warning-500" />
            <span className="text-secondary-400">Health Score</span>
          </div>
          <p className="text-2xl font-bold text-white">{digitalTwin?.healthScore || 92}%</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-danger-500" />
            <span className="text-secondary-400">Active Alerts</span>
          </div>
          <p className="text-2xl font-bold text-white">2</p>
        </motion.div>
      </div>

      {/* Component Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Component Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(digitalTwin?.componentStatus || {}).map(([component, status]) => (
            <div key={component} className="text-center">
              <div
                className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                  statusColors[status as string]
                }`}
              >
                <WrenchScrewdriverIcon className="w-8 h-8" />
              </div>
              <p className="mt-2 text-sm font-medium text-white capitalize">{component}</p>
              <p className={`text-xs ${statusColors[status as string].split(' ')[0]}`}>
                {status as string}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Telemetry Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Telemetry History (24h)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demoTelemetryHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
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
                dataKey="engineTemp"
                stroke="#ef4444"
                strokeWidth={2}
                name="Engine Temp (°C)"
              />
              <Line
                type="monotone"
                dataKey="oilPressure"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Oil Pressure (psi)"
              />
              <Line
                type="monotone"
                dataKey="batteryVoltage"
                stroke="#22c55e"
                strokeWidth={2}
                name="Battery (V)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/digital-twin?vehicle=${id}`}
          className="card card-hover p-6 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-primary-600/20">
            <TruckIcon className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">View Digital Twin</h3>
            <p className="text-sm text-secondary-400">3D visualization</p>
          </div>
        </Link>

        <Link
          to={`/appointments?vehicle=${id}`}
          className="card card-hover p-6 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-success-500/20">
            <CalendarIcon className="w-6 h-6 text-success-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Book Service</h3>
            <p className="text-sm text-secondary-400">Schedule appointment</p>
          </div>
        </Link>

        <Link
          to={`/predictions?vehicle=${id}`}
          className="card card-hover p-6 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-warning-500/20">
            <ExclamationTriangleIcon className="w-6 h-6 text-warning-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">View Predictions</h3>
            <p className="text-sm text-secondary-400">AI-powered insights</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
