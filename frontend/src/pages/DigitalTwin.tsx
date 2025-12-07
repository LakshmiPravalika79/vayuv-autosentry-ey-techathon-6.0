import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CubeTransparentIcon,
  WrenchScrewdriverIcon,
  BoltIcon,
  CogIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const vehicles = [
  { id: '1', name: 'Tesla Model S', make: 'Tesla', model: 'Model S', year: 2023 },
  { id: '2', name: 'BMW X5', make: 'BMW', model: 'X5', year: 2024 },
  { id: '3', name: 'Mercedes EQS', make: 'Mercedes', model: 'EQS', year: 2024 },
];

interface ComponentDataItem {
  name: string;
  icon: React.ElementType;
  status: string;
  healthScore: number;
  temperature?: number;
  rpm?: number;
  oilPressure?: number;
  lastService: string;
  nextService: string;
  details: string;
  position: { x: number; y: number };
  fluidLevel?: number;
  gear?: string;
  voltage?: number;
  charge?: number;
  padWearFront?: number;
  padWearRear?: number;
  pressureFL?: number;
  pressureFR?: number;
  pressureRL?: number;
  pressureRR?: number;
  treadDepth?: number;
  coolantLevel?: number;
  coolantTemp?: number;
  fanStatus?: string;
}

type ComponentDataType = Record<string, ComponentDataItem>;

// Initial component data
const getInitialComponentData = (): ComponentDataType => ({
  engine: {
    name: 'Engine',
    icon: CogIcon,
    status: 'GOOD',
    healthScore: 94,
    temperature: 92,
    rpm: 0,
    oilPressure: 42,
    lastService: '2024-01-15',
    nextService: '2024-07-15',
    details: 'All parameters within normal range',
    position: { x: 130, y: 95 },
  },
  transmission: {
    name: 'Transmission',
    icon: CogIcon,
    status: 'GOOD',
    healthScore: 97,
    fluidLevel: 98,
    gear: 'P',
    temperature: 75,
    lastService: '2024-01-15',
    nextService: '2024-07-15',
    details: 'Smooth operation, no issues detected',
    position: { x: 200, y: 115 },
  },
  brakes: {
    name: 'Brakes',
    icon: WrenchScrewdriverIcon,
    status: 'WARNING',
    healthScore: 72,
    padWearFront: 35,
    padWearRear: 42,
    fluidLevel: 85,
    lastService: '2023-10-20',
    nextService: '2024-02-20',
    details: 'Front brake pads showing wear, service recommended in 30 days',
    position: { x: 100, y: 145 },
  },
  battery: {
    name: 'Battery',
    icon: BoltIcon,
    status: 'GOOD',
    healthScore: 88,
    voltage: 12.6,
    charge: 95,
    temperature: 28,
    lastService: '2024-02-01',
    nextService: '2025-02-01',
    details: 'Battery capacity at 88%, normal for age',
    position: { x: 270, y: 95 },
  },
  tires: {
    name: 'Tires',
    icon: CubeTransparentIcon,
    status: 'GOOD',
    healthScore: 91,
    pressureFL: 34,
    pressureFR: 33,
    pressureRL: 32,
    pressureRR: 33,
    treadDepth: 6.2,
    lastService: '2024-01-30',
    nextService: '2024-06-30',
    details: 'All tires properly inflated, tread depth acceptable',
    position: { x: 300, y: 145 },
  },
  cooling: {
    name: 'Cooling System',
    icon: CogIcon,
    status: 'GOOD',
    healthScore: 95,
    coolantLevel: 92,
    coolantTemp: 88,
    fanStatus: 'Auto',
    lastService: '2024-01-15',
    nextService: '2024-07-15',
    details: 'Cooling system operating efficiently',
    position: { x: 165, y: 80 },
  },
});

const statusColors: Record<string, { bg: string; text: string; glow: string }> = {
  GOOD: { bg: 'bg-success-500', text: 'text-success-500', glow: '#22c55e' },
  WARNING: { bg: 'bg-warning-500', text: 'text-warning-500', glow: '#f59e0b' },
  CRITICAL: { bg: 'bg-danger-500', text: 'text-danger-500', glow: '#ef4444' },
};

export default function DigitalTwin() {
  const [selectedVehicle, setSelectedVehicle] = useState('1');
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [componentData, setComponentData] = useState<ComponentDataType>(getInitialComponentData());
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time simulation
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setComponentData(prev => {
        const newData = { ...prev };
        
        // Simulate engine changes
        newData.engine = {
          ...newData.engine,
          temperature: 85 + Math.random() * 15,
          rpm: Math.floor(800 + Math.random() * 2000),
          oilPressure: 38 + Math.random() * 8,
        };

        // Simulate transmission
        const gears = ['P', 'R', 'N', 'D', '1', '2', '3'];
        newData.transmission = {
          ...newData.transmission,
          temperature: 70 + Math.random() * 15,
          gear: isSimulating ? gears[Math.floor(Math.random() * gears.length)] : 'P',
        };

        // Simulate battery
        newData.battery = {
          ...newData.battery,
          voltage: 12.2 + Math.random() * 0.8,
          charge: Math.max(0, Math.min(100, (newData.battery.charge ?? 95) - Math.random() * 0.1)),
          temperature: 25 + Math.random() * 10,
        };

        // Simulate cooling
        newData.cooling = {
          ...newData.cooling,
          coolantTemp: 82 + Math.random() * 12,
        };

        // Simulate tire pressure variations
        newData.tires = {
          ...newData.tires,
          pressureFL: 32 + Math.random() * 3,
          pressureFR: 32 + Math.random() * 3,
          pressureRL: 31 + Math.random() * 3,
          pressureRR: 31 + Math.random() * 3,
        };

        return newData;
      });
      setLastUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const overallHealth = Math.round(
    Object.values(componentData).reduce((acc, c) => acc + c.healthScore, 0) /
      Object.keys(componentData).length
  );

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
    toast.success(isSimulating ? 'Simulation paused' : 'Real-time simulation started');
  };

  const runDiagnostic = () => {
    toast.loading('Running full diagnostic...', { duration: 2000 });
    setTimeout(() => {
      toast.success('Diagnostic complete! All systems checked.');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Digital Twin</h1>
          <p className="text-secondary-400">Real-time vehicle visualization and diagnostics</p>
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
          <button
            onClick={toggleSimulation}
            className={`btn ${isSimulating ? 'bg-danger-500 hover:bg-danger-600' : 'btn-primary'} flex items-center gap-2`}
          >
            {isSimulating ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
            {isSimulating ? 'Pause' : 'Simulate'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isSimulating ? 'bg-success-500 animate-pulse' : 'bg-secondary-500'}`} />
              <span className="text-sm text-white">{isSimulating ? 'Live Data' : 'Static View'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-secondary-400" />
              <span className="text-sm text-secondary-400">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-secondary-400">Overall Health:</span>
              <span className={`text-lg font-bold ${overallHealth > 80 ? 'text-success-500' : overallHealth > 60 ? 'text-warning-500' : 'text-danger-500'}`}>
                {overallHealth}%
              </span>
            </div>
            <button onClick={runDiagnostic} className="btn-outline text-sm flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4" />
              Run Diagnostic
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2 card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Vehicle Model - {vehicles.find(v => v.id === selectedVehicle)?.name}</h2>

          {/* Interactive Vehicle View */}
          <div className="relative aspect-video bg-gradient-to-br from-secondary-800 to-secondary-900 rounded-lg overflow-hidden">
            <svg
              viewBox="0 0 400 200"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Animated grid background */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="400" height="200" fill="url(#grid)" />

              {/* Car body - more detailed */}
              <path
                d="M50 120 L80 85 L100 75 L150 70 L250 70 L300 75 L320 85 L350 120 L350 145 L50 145 Z"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="#1e293b"
                className="drop-shadow-lg"
              />
              {/* Roof */}
              <path
                d="M110 75 L130 48 L270 48 L290 75"
                stroke="#3b82f6"
                strokeWidth="2"
                fill="none"
              />
              {/* Windows */}
              <path
                d="M115 73 L132 52 L195 52 L195 73 Z"
                fill="#334155"
                stroke="#60a5fa"
                strokeWidth="1"
              />
              <path
                d="M200 52 L200 73 L285 73 L268 52 Z"
                fill="#334155"
                stroke="#60a5fa"
                strokeWidth="1"
              />
              {/* Wheels */}
              <g className={isSimulating ? 'animate-spin' : ''} style={{ transformOrigin: '100px 145px', animationDuration: '1s' }}>
                <circle cx="100" cy="145" r="25" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
                <circle cx="100" cy="145" r="18" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
                <circle cx="100" cy="145" r="5" fill="#3b82f6" />
              </g>
              <g className={isSimulating ? 'animate-spin' : ''} style={{ transformOrigin: '300px 145px', animationDuration: '1s' }}>
                <circle cx="300" cy="145" r="25" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
                <circle cx="300" cy="145" r="18" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
                <circle cx="300" cy="145" r="5" fill="#3b82f6" />
              </g>
              {/* Headlights */}
              <ellipse cx="55" cy="120" rx="8" ry="5" fill={isSimulating ? '#fbbf24' : '#78716c'} className={isSimulating ? 'animate-pulse' : ''} />
              <ellipse cx="345" cy="120" rx="8" ry="5" fill="#ef4444" />

              {/* Component hotspots */}
              {Object.entries(componentData).map(([key, comp]) => (
                <g 
                  key={key} 
                  className="cursor-pointer" 
                  onClick={() => setSelectedComponent(key)}
                >
                  <circle 
                    cx={comp.position.x} 
                    cy={comp.position.y} 
                    r="14" 
                    fill={statusColors[comp.status].glow} 
                    fillOpacity="0.3"
                    className={selectedComponent === key ? 'animate-ping' : ''}
                  />
                  <circle 
                    cx={comp.position.x} 
                    cy={comp.position.y} 
                    r="10" 
                    fill={statusColors[comp.status].glow} 
                    fillOpacity="0.6"
                  />
                  <circle 
                    cx={comp.position.x} 
                    cy={comp.position.y} 
                    r="6" 
                    fill={statusColors[comp.status].glow}
                  />
                </g>
              ))}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 flex gap-4 bg-secondary-900/80 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-success-500" />
                <span className="text-xs text-secondary-400">Good</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-warning-500" />
                <span className="text-xs text-secondary-400">Warning</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-danger-500" />
                <span className="text-xs text-secondary-400">Critical</span>
              </div>
            </div>

            {/* Speed indicator (when simulating) */}
            {isSimulating && (
              <div className="absolute top-4 right-4 bg-secondary-900/80 px-4 py-2 rounded-lg">
                <div className="text-2xl font-bold text-white">
                  {Math.floor((componentData.engine.rpm ?? 0) / 30)} <span className="text-sm text-secondary-400">km/h</span>
                </div>
                <div className="text-xs text-secondary-400">
                  {componentData.engine.rpm} RPM | Gear: {componentData.transmission.gear}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Component Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            {selectedComponent
              ? componentData[selectedComponent].name
              : 'Select Component'}
          </h2>

          <AnimatePresence mode="wait">
            {selectedComponent ? (
              <motion.div
                key={selectedComponent}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {(() => {
                  const comp = componentData[selectedComponent];
                  const colors = statusColors[comp.status];
                  const Icon = comp.icon;
                  return (
                    <>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-lg ${colors.bg}/20 flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${colors.text}`} />
                        </div>
                        <div>
                          <span className={`badge ${colors.bg}/20 ${colors.text}`}>
                            {comp.status === 'GOOD' && <CheckCircleIcon className="w-4 h-4 inline mr-1" />}
                            {comp.status === 'WARNING' && <ExclamationTriangleIcon className="w-4 h-4 inline mr-1" />}
                            {comp.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-secondary-400">Health Score</span>
                          <span className="text-white font-bold">{comp.healthScore}%</span>
                        </div>
                        <div className="h-2 bg-secondary-700 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${colors.bg}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${comp.healthScore}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        {/* Dynamic metrics based on component */}
                        {selectedComponent === 'engine' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Temperature</span>
                              <span className="text-white">{(comp.temperature ?? 0).toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">RPM</span>
                              <span className="text-white">{comp.rpm}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Oil Pressure</span>
                              <span className="text-white">{(comp.oilPressure ?? 0).toFixed(1)} PSI</span>
                            </div>
                          </>
                        )}

                        {selectedComponent === 'battery' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Voltage</span>
                              <span className="text-white">{(comp.voltage ?? 0).toFixed(2)}V</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Charge</span>
                              <span className="text-white">{(comp.charge ?? 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Temperature</span>
                              <span className="text-white">{(comp.temperature ?? 0).toFixed(1)}°C</span>
                            </div>
                          </>
                        )}

                        {selectedComponent === 'brakes' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Front Pad Wear</span>
                              <span className="text-warning-400">{comp.padWearFront}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Rear Pad Wear</span>
                              <span className="text-white">{comp.padWearRear}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Fluid Level</span>
                              <span className="text-white">{comp.fluidLevel}%</span>
                            </div>
                          </>
                        )}

                        {selectedComponent === 'tires' && (
                          <>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-secondary-800 p-2 rounded">
                                <span className="text-secondary-400 text-xs">FL</span>
                                <p className="text-white">{(comp.pressureFL ?? 0).toFixed(1)} PSI</p>
                              </div>
                              <div className="bg-secondary-800 p-2 rounded">
                                <span className="text-secondary-400 text-xs">FR</span>
                                <p className="text-white">{(comp.pressureFR ?? 0).toFixed(1)} PSI</p>
                              </div>
                              <div className="bg-secondary-800 p-2 rounded">
                                <span className="text-secondary-400 text-xs">RL</span>
                                <p className="text-white">{(comp.pressureRL ?? 0).toFixed(1)} PSI</p>
                              </div>
                              <div className="bg-secondary-800 p-2 rounded">
                                <span className="text-secondary-400 text-xs">RR</span>
                                <p className="text-white">{(comp.pressureRR ?? 0).toFixed(1)} PSI</p>
                              </div>
                            </div>
                          </>
                        )}

                        {selectedComponent === 'transmission' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Current Gear</span>
                              <span className="text-white font-bold text-lg">{comp.gear}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Temperature</span>
                              <span className="text-white">{(comp.temperature ?? 0).toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Fluid Level</span>
                              <span className="text-white">{comp.fluidLevel}%</span>
                            </div>
                          </>
                        )}

                        {selectedComponent === 'cooling' && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Coolant Temp</span>
                              <span className="text-white">{(comp.coolantTemp ?? 0).toFixed(1)}°C</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Coolant Level</span>
                              <span className="text-white">{comp.coolantLevel}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-secondary-400">Fan Status</span>
                              <span className="text-white">{comp.fanStatus}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="pt-4 border-t border-secondary-700">
                        <p className="text-sm text-secondary-400 mb-2">Status</p>
                        <p className="text-white text-sm">{comp.details}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                        <div>
                          <span className="text-secondary-500">Last Service</span>
                          <p className="text-white">{comp.lastService}</p>
                        </div>
                        <div>
                          <span className="text-secondary-500">Next Service</span>
                          <p className="text-white">{comp.nextService}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          toast.success(`Service scheduled for ${comp.name}`);
                        }}
                        className="w-full btn-primary mt-4"
                      >
                        Schedule Service
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <div className="text-center py-8">
                <CubeTransparentIcon className="w-12 h-12 text-secondary-600 mx-auto mb-4" />
                <p className="text-secondary-400">
                  Click on a component in the vehicle view to see real-time details
                </p>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(componentData).map(([key, comp], index) => {
          const colors = statusColors[comp.status];
          const Icon = comp.icon;

          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setSelectedComponent(key)}
              className={`card card-hover p-4 text-left transition-all ${
                selectedComponent === key ? 'ring-2 ring-primary-500' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-lg ${colors.bg}/20 flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <h3 className="font-medium text-white text-sm">{comp.name}</h3>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs font-medium ${colors.text}`}>{comp.healthScore}%</span>
                {comp.status === 'WARNING' && (
                  <ExclamationTriangleIcon className="w-4 h-4 text-warning-500" />
                )}
              </div>
              <div className="mt-2 h-1.5 bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bg}`}
                  style={{ width: `${comp.healthScore}%` }}
                />
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
