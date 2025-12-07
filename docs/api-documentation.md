# AutoSentry AI - API Documentation

## Base URL
```
Development: http://localhost:3000/api/v1
Production: https://api.autosentry.ai/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "FLEET_MANAGER"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "FLEET_MANAGER"
    },
    "token": "jwt_token_here"
  }
}
```

### POST /auth/login
Authenticate and receive access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "FLEET_MANAGER"
    },
    "token": "jwt_token_here"
  }
}
```

### GET /auth/me
Get current user profile. **Requires Authentication**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "FLEET_MANAGER",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

## Vehicle Endpoints

### GET /vehicles
List all vehicles for the authenticated user. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 10) |
| status | string | Filter by status (ACTIVE, INACTIVE, MAINTENANCE) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "uuid",
        "vin": "WBA3A5C55CF256789",
        "make": "BMW",
        "model": "3 Series",
        "year": 2023,
        "mileage": 15000,
        "status": "ACTIVE",
        "healthScore": 92,
        "lastServiceDate": "2024-01-10T00:00:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

### GET /vehicles/:id
Get vehicle details by ID. **Requires Authentication**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vin": "WBA3A5C55CF256789",
    "make": "BMW",
    "model": "3 Series",
    "year": 2023,
    "mileage": 15000,
    "status": "ACTIVE",
    "healthScore": 92,
    "owner": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe"
    },
    "predictions": [...],
    "appointments": [...]
  }
}
```

### POST /vehicles
Create a new vehicle. **Requires Authentication**

**Request Body:**
```json
{
  "vin": "WBA3A5C55CF256789",
  "make": "BMW",
  "model": "3 Series",
  "year": 2023,
  "mileage": 15000,
  "licensePlate": "ABC-1234"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vin": "WBA3A5C55CF256789",
    "make": "BMW",
    "model": "3 Series",
    "year": 2023,
    "status": "ACTIVE",
    "healthScore": 100
  }
}
```

### PUT /vehicles/:id
Update vehicle information. **Requires Authentication**

**Request Body:**
```json
{
  "mileage": 16500,
  "status": "MAINTENANCE"
}
```

### DELETE /vehicles/:id
Delete a vehicle. **Requires Authentication (Admin only)**

---

## Telemetry Endpoints

### GET /telemetry/:vehicleId
Get telemetry data for a vehicle. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| startDate | string | ISO date string |
| endDate | string | ISO date string |
| limit | number | Max records (default: 100) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vehicleId": "uuid",
      "timestamp": "2024-01-15T10:30:00Z",
      "engineTemp": 195.5,
      "rpm": 2500,
      "fuelLevel": 75.2,
      "batteryVoltage": 14.2,
      "oilPressure": 45.0,
      "coolantTemp": 190.0,
      "tirePressure": {
        "frontLeft": 35,
        "frontRight": 34,
        "rearLeft": 35,
        "rearRight": 35
      },
      "speed": 65,
      "location": {
        "lat": 40.7128,
        "lng": -74.0060
      }
    }
  ]
}
```

### POST /telemetry
Submit telemetry data. **Requires Authentication**

**Request Body:**
```json
{
  "vehicleId": "uuid",
  "engineTemp": 195.5,
  "rpm": 2500,
  "fuelLevel": 75.2,
  "batteryVoltage": 14.2,
  "oilPressure": 45.0,
  "coolantTemp": 190.0,
  "tirePressure": {
    "frontLeft": 35,
    "frontRight": 34,
    "rearLeft": 35,
    "rearRight": 35
  },
  "speed": 65,
  "location": {
    "lat": 40.7128,
    "lng": -74.0060
  }
}
```

### POST /telemetry/batch
Submit batch telemetry data. **Requires Authentication**

**Request Body:**
```json
{
  "vehicleId": "uuid",
  "records": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "engineTemp": 195.5,
      "rpm": 2500,
      ...
    }
  ]
}
```

---

## Prediction Endpoints

### GET /predictions
Get all predictions. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | string | Filter by vehicle |
| severity | string | CRITICAL, HIGH, MEDIUM, LOW |
| status | string | PENDING, ACKNOWLEDGED, RESOLVED |
| page | number | Page number |
| limit | number | Items per page |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "id": "uuid",
        "vehicleId": "uuid",
        "vehicleVin": "WBA3A5C55CF256789",
        "component": "Engine Cooling System",
        "issue": "Thermostat failure predicted",
        "confidence": 0.87,
        "severity": "HIGH",
        "estimatedTimeToFailure": "14 days",
        "recommendedAction": "Replace thermostat",
        "estimatedCost": 350.00,
        "status": "PENDING",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 15,
    "page": 1
  }
}
```

### GET /predictions/:id
Get prediction details. **Requires Authentication**

### POST /predictions/:id/acknowledge
Acknowledge a prediction. **Requires Authentication**

**Request Body:**
```json
{
  "notes": "Scheduled for next maintenance"
}
```

### POST /predictions/generate
Trigger prediction generation for a vehicle. **Requires Authentication**

**Request Body:**
```json
{
  "vehicleId": "uuid"
}
```

---

## Appointment Endpoints

### GET /appointments
Get all appointments. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| vehicleId | string | Filter by vehicle |
| status | string | SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED |
| startDate | string | Filter from date |
| endDate | string | Filter to date |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "vehicleId": "uuid",
        "vehicleVin": "WBA3A5C55CF256789",
        "serviceType": "Brake System Inspection",
        "description": "Inspect brake pads and rotors",
        "scheduledAt": "2024-01-20T09:00:00Z",
        "estimatedDuration": 120,
        "status": "SCHEDULED",
        "serviceCenter": {
          "name": "Downtown Auto Care",
          "address": "123 Main St"
        }
      }
    ],
    "total": 5
  }
}
```

### POST /appointments
Book a new appointment. **Requires Authentication**

**Request Body:**
```json
{
  "vehicleId": "uuid",
  "serviceType": "Brake System Inspection",
  "description": "Inspect brake pads and rotors",
  "scheduledAt": "2024-01-20T09:00:00Z",
  "serviceCenterId": "uuid"
}
```

### PUT /appointments/:id
Update appointment. **Requires Authentication**

### PUT /appointments/:id/status
Update appointment status. **Requires Authentication**

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

### DELETE /appointments/:id
Cancel appointment. **Requires Authentication**

### GET /appointments/availability
Get available time slots. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| serviceCenterId | string | Service center ID |
| date | string | Date to check (YYYY-MM-DD) |
| serviceType | string | Type of service |

---

## Feedback Endpoints

### GET /feedback
Get all feedback. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| appointmentId | string | Filter by appointment |
| sentiment | string | POSITIVE, NEUTRAL, NEGATIVE |
| minRating | number | Minimum rating (1-5) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": "uuid",
        "appointmentId": "uuid",
        "rating": 5,
        "comment": "Excellent service!",
        "sentiment": "POSITIVE",
        "wouldRecommend": true,
        "createdAt": "2024-01-15T15:00:00Z"
      }
    ]
  }
}
```

### POST /feedback
Submit feedback. **Requires Authentication**

**Request Body:**
```json
{
  "appointmentId": "uuid",
  "rating": 5,
  "comment": "Excellent service!",
  "wouldRecommend": true,
  "categories": {
    "serviceQuality": 5,
    "timeliness": 4,
    "communication": 5
  }
}
```

### GET /feedback/stats
Get feedback statistics. **Requires Authentication**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalFeedback": 150,
    "averageRating": 4.6,
    "sentimentCounts": {
      "POSITIVE": 120,
      "NEUTRAL": 20,
      "NEGATIVE": 10
    },
    "ratingDistribution": [
      {"rating": 5, "count": 80},
      {"rating": 4, "count": 40},
      {"rating": 3, "count": 20},
      {"rating": 2, "count": 7},
      {"rating": 1, "count": 3}
    ],
    "npsScore": 75
  }
}
```

---

## Agent Endpoints

### POST /agents/trigger
Trigger agent workflow. **Requires Authentication (Admin)**

**Request Body:**
```json
{
  "taskType": "FULL_ANALYSIS",
  "vehicleId": "uuid",
  "priority": "HIGH"
}
```

**Task Types:**
- `FULL_ANALYSIS` - Complete vehicle analysis
- `DIAGNOSIS` - Run diagnosis only
- `SCHEDULE_MAINTENANCE` - Auto-schedule maintenance
- `GENERATE_RCA` - Root cause analysis
- `CUSTOMER_OUTREACH` - Customer engagement

**Response (202):**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "QUEUED",
    "estimatedCompletion": "2024-01-15T10:05:00Z"
  }
}
```

### GET /agents/status/:taskId
Get agent task status. **Requires Authentication**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "taskId": "uuid",
    "status": "COMPLETED",
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:03:00Z",
    "result": {
      "diagnosis": {...},
      "recommendations": [...],
      "actionsCreated": [...]
    }
  }
}
```

### GET /agents/workers
Get worker agent status. **Requires Authentication (Admin)**

---

## Alert Endpoints

### GET /alerts
Get all alerts. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | PREDICTION, UEBA, SYSTEM |
| severity | string | CRITICAL, HIGH, MEDIUM, LOW |
| status | string | OPEN, ACKNOWLEDGED, RESOLVED |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "type": "PREDICTION",
        "severity": "HIGH",
        "title": "Engine Temperature Warning",
        "message": "Vehicle V001 engine temperature trending high",
        "vehicleId": "uuid",
        "status": "OPEN",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "total": 25
  }
}
```

### PUT /alerts/:id/acknowledge
Acknowledge an alert. **Requires Authentication**

### PUT /alerts/:id/resolve
Resolve an alert. **Requires Authentication**

### POST /alerts/bulk-acknowledge
Bulk acknowledge alerts. **Requires Authentication**

**Request Body:**
```json
{
  "alertIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## Dashboard Endpoints

### GET /dashboard/overview
Get dashboard overview. **Requires Authentication**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalVehicles": 50,
    "activeAlerts": 8,
    "upcomingAppointments": 12,
    "avgHealthScore": 87,
    "criticalPredictions": 3,
    "resolvedThisMonth": 45
  }
}
```

### GET /dashboard/trends
Get trend data. **Requires Authentication**

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | 7d, 30d, 90d |
| metric | string | predictions, appointments, health |

---

## Error Responses

All endpoints may return the following error formats:

**400 Bad Request:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {"field": "email", "message": "Invalid email format"}
    ]
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Rate Limits

| Endpoint Category | Rate Limit |
|------------------|------------|
| Auth endpoints | 10 req/min |
| Read endpoints | 100 req/min |
| Write endpoints | 30 req/min |
| Agent triggers | 5 req/min |
| Telemetry batch | 60 req/min |

---

## Webhooks (Coming Soon)

Configure webhooks to receive real-time notifications:

```json
{
  "url": "https://your-server.com/webhook",
  "events": [
    "prediction.created",
    "alert.critical",
    "appointment.reminder"
  ],
  "secret": "webhook_secret_for_verification"
}
```
