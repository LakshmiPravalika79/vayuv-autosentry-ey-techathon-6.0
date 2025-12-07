# AutoSentry AI - System Flowcharts

## 1. User Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        USER AUTHENTICATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌─────────┐
     │  User   │
     └────┬────┘
          │
          ▼
    ┌───────────┐         ┌─────────────┐
    │  Login    │─────────│  Frontend   │
    │  Form     │         │  (React)    │
    └───────────┘         └──────┬──────┘
                                 │
                                 ▼ POST /api/v1/auth/login
                          ┌──────────────┐
                          │   Backend    │
                          │   (Express)  │
                          └──────┬───────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
               ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │ Validate │      │  Hash    │      │  UEBA    │
        │  Input   │      │ Password │      │  Log     │
        └──────────┘      └──────────┘      └──────────┘
               │                 │                 │
               └────────┬────────┘                 │
                        │                          │
                        ▼                          ▼
                 ┌──────────────┐          ┌──────────────┐
                 │   Compare    │          │  Behavior    │
                 │   Password   │          │  Analysis    │
                 └──────┬───────┘          └──────────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Invalid  │  │  Valid   │  │  Risk    │
    │  Error   │  │ Generate │  │ Check    │
    │          │  │   JWT    │  │          │
    └──────────┘  └────┬─────┘  └────┬─────┘
                       │             │
                       └──────┬──────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Return     │
                       │  JWT Token   │
                       └──────┬───────┘
                              │
                              ▼
                       ┌──────────────┐
                       │   Store in   │
                       │   Zustand    │
                       └──────────────┘
```

## 2. Telemetry Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TELEMETRY PROCESSING FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌───────────────┐
  │   Vehicle     │
  │   OBD-II      │
  │   Sensors     │
  └───────┬───────┘
          │
          ▼ Raw Telemetry Data
  ┌───────────────┐
  │   Data        │
  │   Collector   │
  │   (IoT)       │
  └───────┬───────┘
          │
          ▼ POST /api/v1/telemetry/batch
  ┌───────────────┐
  │   Backend     │
  │   API         │
  └───────┬───────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│Validate│  │ Store  │
│ Data   │  │Postgres│
└───┬────┘  └────────┘
    │
    ▼ Redis Pub/Sub
┌───────────────────────────────────────────────────────────────┐
│                      MESSAGE QUEUE                             │
│  Channel: telemetry:new                                        │
└───────────────────────────────────┬───────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
  │  ML Service   │        │ UEBA Service  │        │ Master Agent  │
  │               │        │               │        │               │
  │ • Feature     │        │ • Behavior    │        │ • Orchestrate │
  │   Extraction  │        │   Baseline    │        │   Workers     │
  │ • Prediction  │        │ • Anomaly     │        │               │
  │   Model       │        │   Detection   │        │               │
  └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
          │                        │                        │
          ▼                        ▼                        │
  ┌───────────────┐        ┌───────────────┐               │
  │  Prediction   │        │  Risk Score   │               │
  │  • Component  │        │  • Anomaly    │               │
  │  • Confidence │        │    Score      │               │
  │  • Severity   │        │  • Alert if   │               │
  │  • TTF        │        │    > threshold│               │
  └───────┬───────┘        └───────┬───────┘               │
          │                        │                        │
          └────────────────────────┴────────────────────────┘
                                   │
                                   ▼
                          ┌───────────────┐
                          │  Store Alert  │
                          │  or Prediction│
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │  WebSocket    │
                          │  Notification │
                          └───────┬───────┘
                                  │
                                  ▼
                          ┌───────────────┐
                          │   Dashboard   │
                          │    Update     │
                          └───────────────┘
```

## 3. ML Prediction Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ML PREDICTION PIPELINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │ Raw Telemetry   │
  │ Data Input      │
  └────────┬────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                    FEATURE ENGINEERING                              │
  │                                                                     │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
  │  │   Rolling    │  │    Lag      │  │   Domain    │              │
  │  │   Averages   │  │   Features  │  │  Features   │              │
  │  │   (1h, 24h)  │  │   (t-1..t-5)│  │  (ratios)   │              │
  │  └──────────────┘  └──────────────┘  └──────────────┘             │
  │                                                                     │
  │  Features: engine_temp_avg, rpm_std, fuel_rate, oil_health_ratio   │
  └────────────────────────────────────┬───────────────────────────────┘
                                       │
                                       ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                     MODEL ENSEMBLE                                  │
  │                                                                     │
  │  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐     │
  │  │ RandomForest │      │   XGBoost    │      │   Neural     │     │
  │  │  Classifier  │      │  Classifier  │      │   Network    │     │
  │  │              │      │              │      │  (optional)  │     │
  │  │ Weight: 0.4  │      │ Weight: 0.4  │      │ Weight: 0.2  │     │
  │  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘     │
  │         │                     │                     │              │
  │         └─────────────────────┴─────────────────────┘              │
  │                               │                                     │
  │                               ▼                                     │
  │                    ┌──────────────────┐                            │
  │                    │ Ensemble Voting  │                            │
  │                    │ (Weighted Avg)   │                            │
  │                    └──────────────────┘                            │
  └────────────────────────────────────────┬───────────────────────────┘
                                           │
                                           ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                    PREDICTION OUTPUT                                │
  │                                                                     │
  │  {                                                                  │
  │    "component": "Engine Cooling System",                           │
  │    "failure_probability": 0.87,                                    │
  │    "severity": "HIGH",                                             │
  │    "estimated_time_to_failure": "14 days",                         │
  │    "confidence_interval": [0.82, 0.92],                            │
  │    "contributing_factors": [                                        │
  │      "engine_temp_trending_high",                                  │
  │      "coolant_level_low",                                          │
  │      "mileage_since_service_high"                                  │
  │    ]                                                                │
  │  }                                                                  │
  └────────────────────────────────────────────────────────────────────┘
```

## 4. Agent Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      AGENT ORCHESTRATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │    Trigger      │
                          │ (API/Schedule/  │
                          │    Event)       │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  MASTER AGENT   │
                          │                 │
                          │ • Parse Task    │
                          │ • Plan Workflow │
                          │ • Assign Workers│
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │   DIAGNOSIS   │       │     DATA      │       │  SCHEDULING   │
  │    AGENT      │       │   ANALYSIS    │       │    AGENT      │
  │               │       │    AGENT      │       │               │
  │ Analyze       │       │ Historical    │       │ Check         │
  │ symptoms      │       │ patterns      │       │ availability  │
  └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
          │                       │                       │
          ▼                       ▼                       ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │ Diagnosis     │       │ Insights      │       │ Optimal       │
  │ Report        │       │ Report        │       │ Schedule      │
  └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
          │                       │                       │
          └───────────────────────┴───────────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │  MASTER AGENT   │
                          │   Aggregate     │
                          │   Results       │
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │   RCA/CAPA    │       │   CUSTOMER    │       │   FEEDBACK    │
  │    AGENT      │       │  ENGAGEMENT   │       │    AGENT      │
  │               │       │    AGENT      │       │               │
  │ Root cause    │       │ Compose       │       │ Prepare       │
  │ analysis      │       │ notification  │       │ survey        │
  └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
          │                       │                       │
          ▼                       ▼                       ▼
  ┌───────────────┐       ┌───────────────┐       ┌───────────────┐
  │ RCA Report    │       │ Email/SMS     │       │ Feedback      │
  │ CAPA Plan     │       │ Notification  │       │ Request       │
  └───────────────┘       └───────────────┘       └───────────────┘
```

## 5. UEBA Anomaly Detection Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      UEBA ANOMALY DETECTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │   User Action   │
  │ (Login/Access/  │
  │   Data Export)  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Feature        │
  │  Extraction     │
  │                 │
  │ • IP Address    │
  │ • Geolocation   │
  │ • Time of Day   │
  │ • Device Info   │
  │ • Action Type   │
  │ • Data Volume   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                    BEHAVIOR ANALYSIS                                 │
  │                                                                      │
  │  ┌──────────────────┐    ┌──────────────────┐                       │
  │  │  User Baseline   │    │  Current Action  │                       │
  │  │                  │    │                  │                       │
  │  │ • Usual IPs      │    │ • This IP        │                       │
  │  │ • Usual Hours    │    │ • This Time      │                       │
  │  │ • Usual Actions  │    │ • This Action    │                       │
  │  │ • Avg Data Vol   │    │ • This Volume    │                       │
  │  └────────┬─────────┘    └────────┬─────────┘                       │
  │           │                       │                                  │
  │           └───────────┬───────────┘                                  │
  │                       ▼                                              │
  │            ┌──────────────────┐                                      │
  │            │ Isolation Forest │                                      │
  │            │   Model          │                                      │
  │            │                  │                                      │
  │            │ Compare to       │                                      │
  │            │ baseline         │                                      │
  │            └────────┬─────────┘                                      │
  │                     │                                                │
  └─────────────────────┼────────────────────────────────────────────────┘
                        │
                        ▼
            ┌─────────────────────┐
            │   Anomaly Score     │
            │   (0.0 - 1.0)       │
            └─────────┬───────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │ Score    │  │ Score    │  │ Score    │
  │ < 0.5    │  │ 0.5-0.8  │  │ > 0.8    │
  │          │  │          │  │          │
  │ NORMAL   │  │ WARNING  │  │ CRITICAL │
  │ Log only │  │ Alert    │  │ Alert +  │
  │          │  │          │  │ Block?   │
  └──────────┘  └────┬─────┘  └────┬─────┘
                     │             │
                     └──────┬──────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Generate Alert │
                   │                │
                   │ • Type         │
                   │ • Severity     │
                   │ • User Info    │
                   │ • Action Info  │
                   │ • Risk Score   │
                   └────────┬───────┘
                            │
                            ▼
                   ┌────────────────┐
                   │ Admin          │
                   │ Dashboard      │
                   └────────────────┘
```

## 6. Appointment Scheduling Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    APPOINTMENT SCHEDULING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐       ┌─────────────────┐
  │  ML Prediction  │       │   User Manual   │
  │  (Automated)    │       │   Booking       │
  └────────┬────────┘       └────────┬────────┘
           │                         │
           └───────────┬─────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Scheduling     │
              │ Agent          │
              └────────┬───────┘
                       │
                       ▼
    ┌──────────────────────────────────────────────┐
    │            AVAILABILITY CHECK                 │
    │                                               │
    │  ┌────────────┐  ┌────────────┐             │
    │  │ Service    │  │  Vehicle   │             │
    │  │ Centers    │  │  Location  │             │
    │  │ Calendar   │  │            │             │
    │  └─────┬──────┘  └──────┬─────┘             │
    │        │                │                    │
    │        └───────┬────────┘                    │
    │                ▼                             │
    │     ┌──────────────────┐                    │
    │     │  Find Optimal    │                    │
    │     │  Time Slot       │                    │
    │     │                  │                    │
    │     │ Factors:         │                    │
    │     │ • Distance       │                    │
    │     │ • Wait time      │                    │
    │     │ • Urgency        │                    │
    │     │ • User pref      │                    │
    │     └──────────────────┘                    │
    └──────────────────────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  Create        │
              │  Appointment   │
              │  Record        │
              └────────┬───────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Store in │ │ Customer │ │ Service  │
   │ Database │ │  Email   │ │ Center   │
   │          │ │          │ │ Notify   │
   └──────────┘ └──────────┘ └──────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Calendar       │
              │ Reminders      │
              │ (24h, 2h)      │
              └────────────────┘
```

## 7. Feedback & Sentiment Analysis Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  FEEDBACK & SENTIMENT ANALYSIS FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │  Service        │
  │  Completed      │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Feedback       │
  │  Agent          │
  │                 │
  │ Trigger survey  │
  │ after service   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │  Customer       │
  │  Survey         │
  │                 │
  │ • Rating (1-5)  │
  │ • Comment       │
  │ • Recommend?    │
  │ • Categories    │
  └────────┬────────┘
           │
           ▼
  ┌────────────────────────────────────────────────────────────────────┐
  │                  SENTIMENT ANALYSIS                                 │
  │                                                                     │
  │  ┌──────────────────────────────────────────────────────────┐     │
  │  │  NLP Pipeline                                            │     │
  │  │                                                          │     │
  │  │  Input: "Excellent service! Very professional team."     │     │
  │  │                                                          │     │
  │  │  1. Tokenization → ["Excellent", "service", ...]        │     │
  │  │  2. Sentiment Model → POSITIVE (0.95)                   │     │
  │  │  3. Entity Extraction → [service, team]                 │     │
  │  │  4. Aspect Analysis → {service_quality: positive}       │     │
  │  │                                                          │     │
  │  │  Output: POSITIVE sentiment, 0.95 confidence            │     │
  │  └──────────────────────────────────────────────────────────┘     │
  └────────────────────────────────────┬───────────────────────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │  Store         │
                              │  Feedback      │
                              │  + Sentiment   │
                              └────────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
           ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
           │  Aggregate   │   │  Alert on    │   │  Improve     │
           │  Statistics  │   │  Negative    │   │  ML Model    │
           │  (NPS, Avg)  │   │  Feedback    │   │  (feedback   │
           │              │   │              │   │   loop)      │
           └──────────────┘   └──────────────┘   └──────────────┘
```

## 8. RCA/CAPA Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RCA/CAPA WORKFLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │  Issue/Failure  │
  │  Detected       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                      ROOT CAUSE ANALYSIS                            │
  │                                                                     │
  │  ┌────────────────────────────────────────────────────────────┐   │
  │  │                    5 WHYS Analysis                         │   │
  │  │                                                            │   │
  │  │  Problem: Engine overheating                               │   │
  │  │                                                            │   │
  │  │  Why 1? Thermostat failed                                  │   │
  │  │  Why 2? Mineral deposits blocked valve                     │   │
  │  │  Why 3? Coolant not changed regularly                      │   │
  │  │  Why 4? Service interval too long                          │   │
  │  │  Why 5? Manufacturer recommendation not followed           │   │
  │  │                                                            │   │
  │  │  ROOT CAUSE: Inadequate coolant maintenance schedule       │   │
  │  └────────────────────────────────────────────────────────────┘   │
  │                                                                     │
  │  Contributing Factors:                                              │
  │  • Hard water in coolant mix                                       │
  │  • High ambient temperatures                                       │
  │  • Infrequent vehicle inspections                                  │
  └────────────────────────────────────┬────────────────────────────────┘
                                       │
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                  CORRECTIVE ACTION PLAN                             │
  │                                                                     │
  │  Immediate Actions:                                                 │
  │  ┌──────────────────────────────────────────────────────────┐     │
  │  │ 1. Replace thermostat assembly         [ASSIGNED: Tech]  │     │
  │  │ 2. Flush cooling system                [ASSIGNED: Tech]  │     │
  │  │ 3. Refill with proper coolant mix      [ASSIGNED: Tech]  │     │
  │  └──────────────────────────────────────────────────────────┘     │
  │                                                                     │
  │  Preventive Actions:                                                │
  │  ┌──────────────────────────────────────────────────────────┐     │
  │  │ 1. Update service schedule (bi-annual flush)             │     │
  │  │ 2. Use distilled water for coolant mix                   │     │
  │  │ 3. Install coolant filtration system                     │     │
  │  │ 4. Add coolant condition monitoring to telemetry         │     │
  │  └──────────────────────────────────────────────────────────┘     │
  └────────────────────────────────────┬────────────────────────────────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │  Track         │
                              │  Implementation│
                              │  Progress      │
                              └────────┬───────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │  Measure       │
                              │  Effectiveness │
                              │  (90 days)     │
                              └────────┬───────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │  Close or      │
                              │  Iterate       │
                              └────────────────┘
```

## 9. Complete Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE REQUEST LIFECYCLE                              │
└─────────────────────────────────────────────────────────────────────────────┘

    Browser                Frontend              Backend               Services
       │                      │                    │                       │
       │  User Action         │                    │                       │
       │─────────────────────>│                    │                       │
       │                      │                    │                       │
       │                      │  API Request       │                       │
       │                      │  (with JWT)        │                       │
       │                      │───────────────────>│                       │
       │                      │                    │                       │
       │                      │                    │  Validate JWT         │
       │                      │                    │──────────────────────>│
       │                      │                    │<─────────────────────│
       │                      │                    │                       │
       │                      │                    │  UEBA Check           │
       │                      │                    │──────────────────────>│
       │                      │                    │<─────────────────────│
       │                      │                    │                       │
       │                      │                    │  Rate Limit Check     │
       │                      │                    │──────────────────────>│
       │                      │                    │<─────────────────────│
       │                      │                    │                       │
       │                      │                    │  Process Request      │
       │                      │                    │  (DB/Cache)           │
       │                      │                    │──────────────────────>│
       │                      │                    │<─────────────────────│
       │                      │                    │                       │
       │                      │                    │  Publish Event        │
       │                      │                    │  (Redis)              │
       │                      │                    │──────────────────────>│
       │                      │                    │                       │
       │                      │  JSON Response     │                       │
       │                      │<───────────────────│                       │
       │                      │                    │                       │
       │  UI Update           │                    │                       │
       │<─────────────────────│                    │                       │
       │                      │                    │                       │
       │                      │                    │  Async Processing     │
       │                      │                    │  (ML/Agents)          │
       │                      │                    │──────────────────────>│
       │                      │                    │                       │
       │                      │  WebSocket         │                       │
       │                      │  (Real-time)       │                       │
       │                      │<──────────────────────────────────────────│
       │  Notification        │                    │                       │
       │<─────────────────────│                    │                       │
       │                      │                    │                       │
```
