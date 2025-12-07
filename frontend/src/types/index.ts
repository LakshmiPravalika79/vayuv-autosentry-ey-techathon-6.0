// User types
export type UserRole = 'ADMIN' | 'MANAGER' | 'SERVICE_ADVISOR' | 'TECHNICIAN' | 'CUSTOMER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
}

// Vehicle types
export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  userId: string;
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

// Telemetry types
export interface TelemetryData {
  engine_temperature: number;
  oil_pressure: number;
  battery_voltage: number;
  coolant_level: number;
  tire_pressure_fl: number;
  tire_pressure_fr: number;
  tire_pressure_rl: number;
  tire_pressure_rr: number;
  fuel_level: number;
  speed: number;
  rpm: number;
  brake_wear_front: number;
  brake_wear_rear: number;
  [key: string]: number;
}

export interface Telemetry {
  id: string;
  vehicleId: string;
  timestamp: string;
  data: TelemetryData;
  source: string;
}

// Prediction types
export interface Prediction {
  id: string;
  vehicleId: string;
  component: string;
  prediction: string;
  probability: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTimeToFailure: number | null;
  recommendedAction: string;
  isAcknowledged: boolean;
  acknowledgedAt: string | null;
  createdAt: string;
}

// Appointment types
export interface Appointment {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  serviceType: 'ROUTINE_MAINTENANCE' | 'DIAGNOSTIC' | 'REPAIR' | 'RECALL' | 'INSPECTION';
  scheduledDate: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  technicianNotes: string | null;
  feedback?: Feedback;
  createdAt: string;
}

// Feedback types
export interface Feedback {
  id: string;
  appointmentId: string;
  appointment?: Appointment;
  rating: number;
  comment: string | null;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  categories: string | null;
  wouldRecommend: boolean | null;
  createdAt: string;
}

// RCA/CAPA types
export interface RCACapa {
  id: string;
  vehicleId: string;
  vehicle?: Vehicle;
  issue: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: 'ENGINE' | 'TRANSMISSION' | 'BRAKES' | 'ELECTRICAL' | 'SUSPENSION' | 'OTHER';
  createdAt: string;
  updatedAt: string;
}

// Alert types
export interface Alert {
  id: string;
  userId: string;
  vehicleId: string | null;
  vehicle?: Vehicle;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  isRead: boolean;
  createdAt: string;
}

// UEBA types
export interface UEBAAnomaly {
  user_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_details?: {
    reason: string;
    contributing_factors: string[];
  };
  timestamp: string;
}

// Dashboard types
export interface DashboardStats {
  vehicles: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
  };
  alerts: {
    total: number;
    unread: number;
    critical: number;
    warning: number;
    recent: Alert[];
  };
  appointments: {
    upcoming: Appointment[];
    total: number;
    scheduled: number;
    completed: number;
  };
  predictions: {
    total: number;
    unacknowledged: number;
    critical: number;
    high: number;
    recent: Prediction[];
  };
  feedback: {
    total: number;
    averageRating: number;
  };
}

// Digital Twin types
export interface DigitalTwinData {
  vehicleInfo: {
    id: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    status: string;
  };
  healthScore: number;
  latestTelemetry: Telemetry | null;
  componentStatus: {
    engine: 'GOOD' | 'WARNING' | 'CRITICAL';
    transmission: 'GOOD' | 'WARNING' | 'CRITICAL';
    brakes: 'GOOD' | 'WARNING' | 'CRITICAL';
    battery: 'GOOD' | 'WARNING' | 'CRITICAL';
    tires: 'GOOD' | 'WARNING' | 'CRITICAL';
  };
  maintenanceHistory: Appointment[];
  activePredictions: Prediction[];
  rcaHistory: RCACapa[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    refreshToken: string;
  };
}
