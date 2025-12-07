import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
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
  Legend,
} from 'recharts';

// Demo telemetry data
const generateTelemetryData = () => {
  const data = [];
  const now = new Date();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    data.push({
      time: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      engineTemp: 85 + Math.random() * 15,
      oilPressure: 38 + Math.random() * 8,
      batteryVoltage: 12 + Math.random() * 1,
      coolantLevel: 80 + Math.random() * 15,
      fuelLevel: 50 + Math.random() * 30,
      tirePressure: 32 + Math.random() * 4,
    });
  }
  return data;
};

const telemetryData = generateTelemetryData();

const vehicles = [
  { id: '1', name: 'Tesla Model S' },
  { id: '2', name: 'BMW X5' },
  { id: '3', name: 'Mercedes EQS' },
  { id: '4', name: 'Audi e-tron GT' },
];

export default function Telemetry() {
  const [selectedVehicle, setSelectedVehicle] = useState('1');
  const [timeRange, setTimeRange] = useState('24h');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['telemetry', selectedVehicle, timeRange],
    queryFn: async () => {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      return telemetryData;
    },
  });

  const currentReadings = data?.[data.length - 1] || {
    engineTemp: 92,
    oilPressure: 42,
    batteryVoltage: 12.5,
    coolantLevel: 88,
    fuelLevel: 65,
    tirePressure: 34,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Telemetry</h1>
          <p className="text-secondary-400">Real-time vehicle sensor data</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="input w-48"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="input w-32"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <button
            onClick={() => refetch()}
            className="btn-outline p-2"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Current Readings */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Engine Temp', value: `${currentReadings.engineTemp.toFixed(1)}°C`, color: 'text-danger-500', threshold: 95 },
          { label: 'Oil Pressure', value: `${currentReadings.oilPressure.toFixed(1)} psi`, color: 'text-warning-500', threshold: 35 },
          { label: 'Battery', value: `${currentReadings.batteryVoltage.toFixed(1)}V`, color: 'text-success-500', threshold: 12 },
          { label: 'Coolant', value: `${currentReadings.coolantLevel.toFixed(0)}%`, color: 'text-primary-400', threshold: 70 },
          { label: 'Fuel Level', value: `${currentReadings.fuelLevel.toFixed(0)}%`, color: 'text-warning-500', threshold: 20 },
          { label: 'Tire Pressure', value: `${currentReadings.tirePressure.toFixed(0)} psi`, color: 'text-success-500', threshold: 30 },
        ].map((reading, index) => (
          <motion.div
            key={reading.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card p-4"
          >
            <p className="text-xs text-secondary-400 mb-1">{reading.label}</p>
            <p className={`text-xl font-bold ${reading.color}`}>{reading.value}</p>
            <div className="mt-2 h-1 bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  reading.label === 'Engine Temp'
                    ? 'bg-danger-500'
                    : reading.label.includes('Pressure')
                    ? 'bg-warning-500'
                    : 'bg-success-500'
                }`}
                style={{
                  width: `${
                    reading.label === 'Engine Temp'
                      ? (currentReadings.engineTemp / 120) * 100
                      : reading.label === 'Oil Pressure'
                      ? (currentReadings.oilPressure / 50) * 100
                      : reading.label === 'Battery'
                      ? ((currentReadings.batteryVoltage - 10) / 5) * 100
                      : reading.label.includes('Level')
                      ? parseFloat(reading.value)
                      : (currentReadings.tirePressure / 40) * 100
                  }%`,
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ChartBarIcon className="w-6 h-6 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Engine & Oil Monitoring</h2>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis yAxisId="left" stroke="#ef4444" domain={[70, 110]} />
              <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" domain={[30, 50]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="engineTemp"
                stroke="#ef4444"
                strokeWidth={2}
                name="Engine Temp (°C)"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="oilPressure"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Oil Pressure (psi)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Battery & Electrical */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Battery & Electrical</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis domain={[11, 14]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="batteryVoltage"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#batteryGradient)"
                  name="Battery Voltage (V)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Fluid Levels */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Fluid Levels</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="coolantLevel"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Coolant (%)"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="fuelLevel"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Fuel (%)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Live indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card p-4 flex items-center justify-center gap-2"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
        </span>
        <span className="text-sm text-secondary-400">
          Live data streaming • Last updated: {new Date().toLocaleTimeString()}
        </span>
      </motion.div>
    </div>
  );
}
