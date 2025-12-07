# AutoSentry AI - Demo Script

## Demo Overview

This document provides a step-by-step walkthrough of the AutoSentry AI platform, showcasing all major features and capabilities.

---

## 1. System Startup

### Start All Services
```bash
# Navigate to project directory
cd autosentry-ai

# Start with Docker Compose
docker-compose up -d

# Verify all services are running
docker-compose ps
```

### Expected Output
```
NAME                    STATUS          PORTS
autosentry-backend      Up (healthy)    0.0.0.0:3000->3000/tcp
autosentry-frontend     Up              0.0.0.0:80->80/tcp
autosentry-ml           Up (healthy)    0.0.0.0:8000->8000/tcp
autosentry-ueba         Up (healthy)    0.0.0.0:8001->8001/tcp
autosentry-agents       Up              
autosentry-postgres     Up (healthy)    0.0.0.0:5432->5432/tcp
autosentry-redis        Up (healthy)    0.0.0.0:6379->6379/tcp
```

---

## 2. User Authentication

### Demo Login
1. Open browser to `http://localhost`
2. Click "Login"
3. Enter credentials:
   - Email: `demo@autosentry.ai`
   - Password: `demo123`
4. Click "Sign In"

### Expected: 
- Redirect to Dashboard
- User name displayed in header
- All navigation items visible

---

## 3. Dashboard Overview

### Key Metrics Display
Navigate to Dashboard and observe:

| Metric | Demo Value | Description |
|--------|------------|-------------|
| Total Vehicles | 50 | Active fleet size |
| Active Alerts | 8 | Unresolved alerts |
| Upcoming Appointments | 12 | Scheduled services |
| Average Health Score | 87% | Fleet-wide health |

### Prediction Trend Chart
- Shows 6-month prediction history
- Demonstrates seasonal patterns
- Highlights critical vs non-critical predictions

### Recent Alerts Panel
- Real-time alert feed
- Color-coded by severity
- Quick navigation to details

---

## 4. Vehicle Management

### View Vehicle List
1. Click "Vehicles" in sidebar
2. Observe list with:
   - VIN numbers
   - Make/Model
   - Health scores (visual bars)
   - Status indicators

### Add New Vehicle
1. Click "+ Add Vehicle"
2. Fill in demo data:
   ```
   VIN: 5YJSA1E26MF123456
   Make: Tesla
   Model: Model S
   Year: 2023
   Mileage: 12000
   ```
3. Click "Create"

### View Vehicle Detail
1. Click on any vehicle row
2. Observe:
   - Vehicle information
   - Digital twin visualization
   - Component health breakdown
   - Active predictions

---

## 5. Telemetry Analysis

### View Real-time Data
1. Click "Telemetry" in sidebar
2. Select vehicle from dropdown
3. Choose date range: "Last 7 Days"

### Telemetry Charts
Observe real-time charts for:
- **Engine Temperature**: Watch for spikes above 220°F
- **RPM**: Normal range 1000-4000
- **Fuel Level**: Consumption patterns
- **Battery Voltage**: Should stay 12-14.5V
- **Oil Pressure**: Normal 25-65 PSI
- **Tire Pressure**: Each wheel (32-36 PSI)

### Demo Alert Scenario
1. Notice BMW 3 Series engine temp trending high
2. System has detected pattern over 7 days
3. ML model generated prediction

---

## 6. Predictive Maintenance

### View Predictions
1. Click "Predictions" in sidebar
2. Filter by severity: "Critical"

### Demo Prediction - Engine Cooling
```
Component: Engine Cooling System
Severity: CRITICAL
Confidence: 87%
Time to Failure: 14 days
Estimated Cost: $350

Contributing Factors:
- Engine temp trending 8% above baseline
- Coolant level dropped 5% in 30 days
- Thermostat response time increased

Recommended Action:
Replace thermostat and flush cooling system
```

### Acknowledge Prediction
1. Click "Acknowledge"
2. Add note: "Scheduled for Jan 21"
3. Status changes to "Acknowledged"

### Schedule Service
1. Click "Schedule Service"
2. System auto-fills appointment details
3. Select service center
4. Confirm booking

---

## 7. Digital Twin Visualization

### Access Digital Twin
1. Click "Digital Twin" in sidebar
2. Select vehicle: BMW 3 Series

### Component Health Display
Visual indicators for each component:
- 🟢 Green (90-100%): Excellent
- 🟡 Yellow (70-89%): Good
- 🟠 Orange (50-69%): Warning
- 🔴 Red (<50%): Critical

### Interactive Features
1. Hover over engine component
2. See detailed metrics popup
3. Click for full component history
4. Note red highlight on Engine (alert active)

---

## 8. Appointment Management

### View Calendar
1. Click "Appointments" in sidebar
2. View monthly calendar
3. Blue dots indicate scheduled appointments

### Book New Appointment
1. Click "+ Book Appointment"
2. Select vehicle
3. Service type: "Engine Cooling System Repair"
4. Choose date/time from available slots
5. Select service center
6. Confirm booking

### Expected Result:
- Appointment created with status "Scheduled"
- Customer notification sent (demo mode)
- Calendar updated

---

## 9. Customer Feedback

### View Feedback Dashboard
1. Click "Feedback" in sidebar
2. Observe metrics:
   - Average Rating: 4.6/5
   - Total Reviews: 89
   - Positive Sentiment: 81%
   - NPS Score: 75

### Rating Distribution
Visual bar chart showing:
- 5 stars: 51%
- 4 stars: 30%
- 3 stars: 13%
- 2 stars: 3%
- 1 star: 2%

### Submit Demo Feedback
1. Click "Submit Feedback"
2. Select appointment
3. Rate 5 stars
4. Comment: "Excellent predictive service! Issue was caught early."
5. Check "Would recommend"
6. Submit

### Observe Sentiment Analysis
- Feedback appears in list
- Sentiment: POSITIVE (auto-detected)
- Stats update in real-time

---

## 10. RCA/CAPA Insights

### View RCA Dashboard
1. Click "RCA Insights" in sidebar
2. Observe stats:
   - Total RCA Cases: 45
   - Open Cases: 8
   - Avg Resolution: 5.2 days
   - Effectiveness: 89%

### Top Root Causes
Visual chart showing common causes:
1. Wear and degradation (18)
2. Fluid contamination (12)
3. Electrical issues (8)
4. Environmental factors (7)

### View RCA Detail
1. Click on "Engine Cooling System" case
2. Observe:
   - Root Cause: Thermostat valve degradation
   - Contributing Factors listed
   - Corrective Actions (with status)
   - Preventive Actions planned
   - Effectiveness: 95%

---

## 11. UEBA Security Alerts

### View Security Dashboard
1. Click "UEBA Alerts" in sidebar
2. Observe severity breakdown:
   - Critical: 12
   - High: 34
   - Medium: 58
   - Low: 52

### Risk Score Gauge
- Average Risk: 67
- Visual gauge (0-100)
- Color-coded by risk level

### Demo Alerts

#### Impossible Travel (Critical)
```
User: Sarah Johnson
Risk Score: 92

Description:
Login from London 30 minutes after login from Tokyo

Details:
- Previous Location: Tokyo, Japan
- Current Location: London, UK
- Time Difference: 30 minutes
- Required Travel Time: 12+ hours

Status: Investigating
```

#### Data Exfiltration (Critical)
```
User: Emily Davis
Risk Score: 95

Description:
Large data export: 2.5GB in 5 minutes

Details:
- Data Size: 2.5 GB
- Records Accessed: 45,000
- Normal Export: < 100 MB per session

Status: Blocked (automatic)
```

### Acknowledge Alert
1. Click on "Impossible Travel" alert
2. View full details
3. Click "Acknowledge"
4. Status updates to "Investigating"

---

## 12. Agent System Demo

### Trigger Manual Agent Workflow
Using API (or admin interface):

```bash
# Trigger full vehicle analysis
curl -X POST http://localhost:3000/api/v1/agents/trigger \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "FULL_ANALYSIS",
    "vehicleId": "vehicle-001",
    "priority": "HIGH"
  }'
```

### Expected Agent Workflow
1. **Master Agent** receives task
2. **Diagnosis Agent** analyzes telemetry
3. **Data Analysis Agent** checks historical patterns
4. **RCA/CAPA Agent** generates root cause if issue found
5. **Scheduling Agent** proposes optimal appointment
6. **Customer Engagement Agent** prepares notification
7. **Master Agent** aggregates and returns result

### Check Agent Status
```bash
curl http://localhost:3000/api/v1/agents/status/<task-id>
```

---

## 13. Settings Configuration

### Profile Settings
1. Click "Settings" in sidebar
2. Update profile:
   - Name, email, phone
   - Timezone preference
   - Photo upload

### Notification Preferences
- Enable/disable email alerts
- Enable/disable push notifications
- Configure alert thresholds
- Weekly report subscription

### Security Settings
- Change password
- Enable 2FA
- View active sessions
- Login history

### Integrations
- Slack (connected)
- Microsoft Teams
- Jira (connected)
- ServiceNow
- PagerDuty

---

## 14. Mobile Responsiveness

### Test on Mobile
1. Open browser DevTools
2. Toggle device toolbar
3. Select iPhone 14 Pro

### Mobile Features
- Hamburger menu navigation
- Touch-friendly buttons
- Swipe gestures
- Optimized charts
- Full functionality maintained

---

## 15. System Shutdown

### Graceful Shutdown
```bash
# Stop all services
docker-compose down

# Stop with data cleanup (caution!)
docker-compose down -v
```

---

## Demo Talking Points

### Innovation Highlights
1. **Proactive vs Reactive**: Predict failures before they happen
2. **AI-Powered**: Multiple ML models with ensemble voting
3. **Agent Orchestration**: Autonomous workflow execution
4. **Security-First**: UEBA protects sensitive data
5. **User-Centric**: Beautiful, intuitive interface

### Business Value
- **Cost Reduction**: Prevent expensive emergency repairs
- **Uptime Increase**: Minimize vehicle downtime
- **Customer Satisfaction**: Proactive communication
- **Safety**: Catch critical issues early
- **Data Insights**: Continuous improvement loop

### Technical Excellence
- Modern tech stack
- Microservices architecture
- Scalable design
- Production-ready security
- Comprehensive documentation

---

## Q&A Preparation

### Common Questions

**Q: How accurate are the predictions?**
A: Our ensemble model achieves 85%+ accuracy on test data, with confidence scores provided for each prediction.

**Q: What happens if the AI makes a wrong prediction?**
A: The feedback loop allows technicians to report outcomes, which improves the model over time. False positives are less costly than missed failures.

**Q: How does the UEBA system work?**
A: It builds a baseline of normal user behavior and uses Isolation Forest to detect anomalies in real-time.

**Q: Can you switch between different agent frameworks?**
A: Yes, the adapter pattern allows switching between builtin, LangGraph, CrewAI, and AutoGen via configuration.

**Q: How does the system scale?**
A: All services are stateless and containerized. Horizontal scaling is supported via Kubernetes or Docker Swarm.

---

## End of Demo

Thank you for watching the AutoSentry AI demonstration!

For questions or feedback, contact the team.
