# AutoSentry AI - System Architecture

## Overview

AutoSentry AI is a comprehensive predictive vehicle maintenance platform that leverages artificial intelligence, machine learning, and multi-agent systems to proactively identify potential vehicle issues before they become costly problems.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AUTOSENTRY AI                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PRESENTATION LAYER                          │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              React + TypeScript + TailwindCSS               │   │   │
│  │  │  • Dashboard  • Digital Twin  • Predictions  • Telemetry    │   │   │
│  │  │  • Vehicles   • Appointments  • Feedback     • Settings     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          API GATEWAY                                │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │          Node.js + Express + TypeScript + Prisma            │   │   │
│  │  │  • Authentication  • Rate Limiting  • Request Validation    │   │   │
│  │  │  • API Routes      • Redis Pub/Sub  • Error Handling        │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│            ┌───────────────────────┼───────────────────────┐               │
│            ▼                       ▼                       ▼               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │   ML SERVICE     │  │   UEBA SERVICE   │  │  AGENT SERVICE   │         │
│  │   (FastAPI)      │  │   (FastAPI)      │  │   (Python)       │         │
│  │                  │  │                  │  │                  │         │
│  │ • RandomForest   │  │ • IsolationForest│  │ • Master Agent   │         │
│  │ • XGBoost        │  │ • Anomaly Score  │  │ • 6 Worker Agents│         │
│  │ • Predictions    │  │ • Risk Analysis  │  │ • LangGraph/Crew │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│            │                       │                       │               │
│            └───────────────────────┼───────────────────────┘               │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         DATA LAYER                                  │   │
│  │  ┌────────────────────┐    ┌────────────────────┐                  │   │
│  │  │     PostgreSQL     │    │       Redis        │                  │   │
│  │  │   (Primary DB)     │    │  (Cache & Queue)   │                  │   │
│  │  └────────────────────┘    └────────────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend (React + TypeScript)

**Technology Stack:**
- React 18.2 with TypeScript
- Vite 5.1 for build tooling
- TailwindCSS 3.4 for styling
- Zustand for state management
- React Query for server state
- Framer Motion for animations
- Recharts for data visualization

**Key Features:**
- Real-time dashboard with vehicle health metrics
- Digital twin visualization
- Predictive maintenance alerts
- Appointment scheduling interface
- Customer feedback system
- UEBA security alerts

### 2. Backend API (Node.js + Express)

**Technology Stack:**
- Node.js 20 LTS
- Express.js 4.x
- TypeScript 5.x
- Prisma ORM
- JWT Authentication
- Redis for caching & pub/sub

**API Endpoints:**
- `/api/v1/auth` - Authentication
- `/api/v1/vehicles` - Vehicle management
- `/api/v1/telemetry` - Telemetry data
- `/api/v1/predictions` - ML predictions
- `/api/v1/appointments` - Scheduling
- `/api/v1/feedback` - Customer feedback
- `/api/v1/agents` - Agent orchestration
- `/api/v1/alerts` - Alert management
- `/api/v1/dashboard` - Aggregated stats

### 3. ML Service (Python + FastAPI)

**Machine Learning Pipeline:**
```
Raw Telemetry → Feature Engineering → Model Prediction → Risk Score → Alert
```

**Models:**
- **RandomForest Classifier**: Primary prediction model
- **XGBoost**: Ensemble for improved accuracy
- **Component-specific models**: Engine, brake, battery, transmission

**Features Used:**
- Engine temperature, RPM, oil pressure
- Fuel level, battery voltage, coolant temp
- Tire pressure, brake pad wear
- Historical maintenance patterns

### 4. UEBA Service (Python + FastAPI)

**Security Analysis Pipeline:**
```
User Action → Feature Extraction → Anomaly Detection → Risk Score → Alert
```

**Detection Capabilities:**
- Unusual login locations
- Impossible travel detection
- Abnormal access patterns
- Data exfiltration attempts
- Privilege escalation
- Brute force attempts

### 5. AI Agent System

**Agent Architecture:**
```
┌─────────────────────────────────────────────────────────────────┐
│                       MASTER AGENT                              │
│  • Task Orchestration    • Priority Management                  │
│  • Workflow Coordination • State Management                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    │                     │                     │
    ▼                     ▼                     ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│ Diagnosis  │    │ Scheduling │    │   Data     │
│   Agent    │    │   Agent    │    │  Analysis  │
│            │    │            │    │   Agent    │
└────────────┘    └────────────┘    └────────────┘
    │                     │                     │
    ▼                     ▼                     ▼
┌────────────┐    ┌────────────┐    ┌────────────┐
│ RCA/CAPA   │    │ Customer   │    │  Feedback  │
│   Agent    │    │ Engagement │    │   Agent    │
│            │    │   Agent    │    │            │
└────────────┘    └────────────┘    └────────────┘
```

**Worker Agents:**

1. **Diagnosis Agent**: Analyzes telemetry data to identify potential issues
2. **Scheduling Agent**: Optimizes maintenance appointments
3. **Data Analysis Agent**: Processes historical data for insights
4. **RCA/CAPA Agent**: Root cause analysis and corrective actions
5. **Customer Engagement Agent**: Handles communications
6. **Feedback Agent**: Processes and analyzes customer feedback

**Framework Support:**
- Built-in (default)
- LangGraph
- CrewAI
- AutoGen

## Data Flow

### Prediction Flow
```
Vehicle Telemetry → Backend API → ML Service → Prediction
                                      ↓
                              Master Agent
                                      ↓
                         Diagnosis Agent Analysis
                                      ↓
                    RCA/CAPA → Scheduling → Customer Engagement
                                      ↓
                           Dashboard Update
```

### UEBA Flow
```
User Action → API Logger → UEBA Service → Risk Score
                                 ↓
                          If High Risk
                                 ↓
                          Alert Generation → Admin Dashboard
                                 ↓
                          Optional: Block Action
```

## Database Schema

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │     │   Vehicle   │     │  Telemetry  │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ id          │◄────│ ownerId     │◄────│ vehicleId   │
│ email       │     │ vin         │     │ timestamp   │
│ password    │     │ make        │     │ engineTemp  │
│ firstName   │     │ model       │     │ rpm         │
│ lastName    │     │ year        │     │ fuelLevel   │
│ role        │     │ mileage     │     │ batteryV    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Prediction  │     │ Appointment │     │  RCACapa    │
├─────────────┤     ├─────────────┤     ├─────────────┤
│ vehicleId   │     │ vehicleId   │     │ vehicleId   │
│ component   │     │ serviceType │     │ rootCause   │
│ confidence  │     │ scheduledAt │     │ corrective  │
│ severity    │     │ status      │     │ effectiveness│
└─────────────┘     └─────────────┘     └─────────────┘
```

## Security Architecture

### Authentication
- JWT-based authentication
- Bcrypt password hashing
- Token refresh mechanism
- Role-based access control (RBAC)

### API Security
- Rate limiting per endpoint
- Input validation
- CORS configuration
- Helmet security headers

### UEBA Integration
- Real-time behavior monitoring
- Anomaly detection
- Risk-based alerting
- Automatic threat response

## Deployment Architecture

### Docker Compose (Development)
```
┌─────────────────────────────────────────┐
│            Docker Network               │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │Front │  │Back  │  │ ML   │         │
│  │ end  │  │ end  │  │Serv  │         │
│  │ :80  │  │:3000 │  │:8000 │         │
│  └──────┘  └──────┘  └──────┘         │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │UEBA  │  │Agents│  │Redis │         │
│  │:8001 │  │:8080 │  │:6379 │         │
│  └──────┘  └──────┘  └──────┘         │
│            ┌──────┐                    │
│            │Postgr│                    │
│            │:5432 │                    │
│            └──────┘                    │
└─────────────────────────────────────────┘
```

### Production (Kubernetes)
```
┌─────────────────────────────────────────┐
│           Kubernetes Cluster            │
│  ┌──────────────────────────────────┐  │
│  │    Ingress Controller (NGINX)    │  │
│  └──────────────────────────────────┘  │
│       │              │                  │
│       ▼              ▼                  │
│  ┌─────────┐    ┌─────────┐           │
│  │Frontend │    │Backend  │           │
│  │Deployment│   │Deployment│          │
│  │(3 pods) │    │(3 pods) │           │
│  └─────────┘    └─────────┘           │
│       │              │                  │
│       └──────┬───────┘                  │
│              ▼                          │
│  ┌─────────────────────────────────┐   │
│  │      Services (ClusterIP)        │   │
│  └─────────────────────────────────┘   │
│              │                          │
│              ▼                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │ ML   │ │UEBA  │ │Agents│ │Redis │  │
│  │Deploy│ │Deploy│ │Deploy│ │HA    │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│              │                          │
│              ▼                          │
│  ┌─────────────────────────────────┐   │
│  │    PostgreSQL (StatefulSet)     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Monitoring & Observability

### Metrics (Prometheus)
- Request latency
- Error rates
- Model prediction accuracy
- Agent task completion
- Resource utilization

### Logging (Structured)
- Request/response logging
- Error tracking
- Audit logs
- Agent decision logs

### Alerting (Grafana)
- Service health alerts
- Performance degradation
- Security incidents
- Business metric alerts

## Scalability Considerations

1. **Horizontal Scaling**: All services are stateless and can scale horizontally
2. **Database**: Read replicas for query-heavy operations
3. **Caching**: Redis for session and prediction caching
4. **Queue**: Redis pub/sub for async agent communication
5. **Load Balancing**: Round-robin with health checks

## Future Enhancements

1. **Edge Computing**: Deploy ML models to vehicles for real-time prediction
2. **Advanced ML**: LSTM/Transformer models for time-series prediction
3. **Federated Learning**: Privacy-preserving model training
4. **GraphQL API**: Alternative to REST for flexible querying
5. **Real-time Streaming**: Kafka for high-volume telemetry
