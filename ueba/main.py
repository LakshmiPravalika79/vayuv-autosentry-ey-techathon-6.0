"""
AutoSentry AI - UEBA (User and Entity Behavior Analytics) Service
FastAPI-based anomaly detection service for monitoring agent behaviors
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
from datetime import datetime, timedelta
from collections import deque
import logging
from sklearn.ensemble import IsolationForest
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AutoSentry AI - UEBA Service",
    description="User and Entity Behavior Analytics for agent monitoring and anomaly detection",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for agent actions and alerts
agent_actions_history = deque(maxlen=10000)
alerts_history = deque(maxlen=1000)
anomaly_model = None

# Pydantic models
class AgentAction(BaseModel):
    agent_id: str
    agent_type: str  # master, data_analysis, diagnosis, customer_engagement, scheduling, feedback, rca_capa
    action_type: str  # query, predict, schedule, notify, generate, update
    target_entity: Optional[str] = None
    vehicle_id: Optional[str] = None
    payload_size: int = 0
    response_time_ms: float = 0
    success: bool = True
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class ScoreRequest(BaseModel):
    agent_action: AgentAction

class ScoreResponse(BaseModel):
    action_id: str
    score: float
    is_anomaly: bool
    alert: bool
    reason: str
    risk_level: str
    timestamp: str

class Alert(BaseModel):
    alert_id: str
    agent_id: str
    agent_type: str
    action_type: str
    anomaly_score: float
    risk_level: str
    reason: str
    details: Dict[str, Any]
    timestamp: str
    resolved: bool = False

class AlertsResponse(BaseModel):
    alerts: List[Alert]
    total_count: int
    unresolved_count: int

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    actions_monitored: int
    alerts_generated: int


# Feature extraction for anomaly detection
def extract_features(action: AgentAction) -> np.ndarray:
    """Extract numerical features from agent action for anomaly detection"""
    
    # Agent type encoding
    agent_type_map = {
        'master': 0, 'data_analysis': 1, 'diagnosis': 2,
        'customer_engagement': 3, 'scheduling': 4, 'feedback': 5, 'rca_capa': 6
    }
    
    # Action type encoding
    action_type_map = {
        'query': 0, 'predict': 1, 'schedule': 2,
        'notify': 3, 'generate': 4, 'update': 5,
        'analyze': 6, 'diagnose': 7, 'engage': 8
    }
    
    # Time-based features
    hour = datetime.now().hour
    is_business_hours = 1 if 8 <= hour <= 18 else 0
    
    features = [
        agent_type_map.get(action.agent_type, 7),  # Unknown agent type
        action_type_map.get(action.action_type, 9),  # Unknown action type
        action.payload_size / 1000,  # Normalize payload size (KB)
        action.response_time_ms / 1000,  # Normalize response time (seconds)
        1 if action.success else 0,
        hour / 24,  # Normalized hour
        is_business_hours
    ]
    
    return np.array(features).reshape(1, -1)


def calculate_anomaly_score(action: AgentAction) -> tuple:
    """Calculate anomaly score using IsolationForest and rule-based checks"""
    global anomaly_model
    
    # Extract features
    features = extract_features(action)
    
    # Model-based score (if model is trained)
    if anomaly_model is not None:
        model_score = -anomaly_model.score_samples(features)[0]
        # Normalize to 0-1 range (IsolationForest scores are typically in [-0.5, 0.5])
        model_score = min(1.0, max(0.0, (model_score + 0.5)))
    else:
        model_score = 0.5  # Default to medium risk if no model
    
    # Rule-based checks
    rule_score = 0.0
    reasons = []
    
    # Check for unusual response times
    if action.response_time_ms > 10000:  # > 10 seconds
        rule_score += 0.3
        reasons.append(f"Unusually high response time: {action.response_time_ms}ms")
    
    # Check for large payload sizes
    if action.payload_size > 1000000:  # > 1MB
        rule_score += 0.2
        reasons.append(f"Large payload size: {action.payload_size} bytes")
    
    # Check for failed actions
    if not action.success:
        rule_score += 0.15
        reasons.append("Action failed")
    
    # Check for actions outside business hours (suspicious for automated systems)
    hour = datetime.now().hour
    if hour < 6 or hour > 22:
        rule_score += 0.1
        reasons.append(f"Action at unusual hour: {hour}:00")
    
    # Check for high-frequency actions from same agent (basic rate limiting)
    recent_actions = [a for a in list(agent_actions_history)[-100:] 
                      if a.get('agent_id') == action.agent_id]
    if len(recent_actions) > 50:
        rule_score += 0.25
        reasons.append(f"High action frequency: {len(recent_actions)} in recent window")
    
    # Check for master agent spawning too many workers
    if action.agent_type == 'master' and action.action_type == 'spawn':
        rule_score += 0.1
        reasons.append("Master agent spawning workers")
    
    # Combine scores
    final_score = (model_score * 0.4) + (rule_score * 0.6)
    final_score = min(1.0, final_score)
    
    # Determine if anomaly and risk level
    is_anomaly = final_score > 0.5
    
    if final_score > 0.8:
        risk_level = "Critical"
    elif final_score > 0.6:
        risk_level = "High"
    elif final_score > 0.4:
        risk_level = "Medium"
    elif final_score > 0.2:
        risk_level = "Low"
    else:
        risk_level = "Normal"
    
    if not reasons:
        reasons.append("Normal behavior pattern")
    
    return final_score, is_anomaly, risk_level, "; ".join(reasons)


def train_isolation_forest():
    """Train IsolationForest model on historical actions"""
    global anomaly_model
    
    if len(agent_actions_history) < 50:
        logger.warning("Not enough data to train anomaly model")
        return False
    
    # Extract features from historical actions
    X = []
    for action_dict in agent_actions_history:
        action = AgentAction(**action_dict)
        features = extract_features(action)
        X.append(features.flatten())
    
    X = np.array(X)
    
    # Train model
    anomaly_model = IsolationForest(
        n_estimators=100,
        contamination=0.1,
        random_state=42
    )
    anomaly_model.fit(X)
    
    logger.info(f"Trained IsolationForest on {len(X)} samples")
    return True


# Initialize with some baseline data
def initialize_baseline():
    """Initialize with baseline normal behavior patterns"""
    baseline_actions = [
        {"agent_id": "master-001", "agent_type": "master", "action_type": "query", 
         "payload_size": 1024, "response_time_ms": 150, "success": True},
        {"agent_id": "data-001", "agent_type": "data_analysis", "action_type": "analyze",
         "payload_size": 5120, "response_time_ms": 500, "success": True},
        {"agent_id": "diag-001", "agent_type": "diagnosis", "action_type": "diagnose",
         "payload_size": 2048, "response_time_ms": 350, "success": True},
        {"agent_id": "cust-001", "agent_type": "customer_engagement", "action_type": "engage",
         "payload_size": 512, "response_time_ms": 200, "success": True},
        {"agent_id": "sched-001", "agent_type": "scheduling", "action_type": "schedule",
         "payload_size": 256, "response_time_ms": 100, "success": True},
    ]
    
    # Add multiple copies with slight variations to build baseline
    for _ in range(20):
        for base_action in baseline_actions:
            action = base_action.copy()
            action['payload_size'] = int(action['payload_size'] * np.random.uniform(0.8, 1.2))
            action['response_time_ms'] = action['response_time_ms'] * np.random.uniform(0.8, 1.2)
            action['timestamp'] = datetime.now().isoformat()
            agent_actions_history.append(action)
    
    # Train initial model
    train_isolation_forest()


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    initialize_baseline()
    logger.info("UEBA Service initialized with baseline data")


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=anomaly_model is not None,
        actions_monitored=len(agent_actions_history),
        alerts_generated=len(alerts_history)
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=anomaly_model is not None,
        actions_monitored=len(agent_actions_history),
        alerts_generated=len(alerts_history)
    )


@app.post("/score", response_model=ScoreResponse)
async def score_action(request: ScoreRequest):
    """
    Score an agent action for anomalies
    
    Returns anomaly score, alert status, and risk level.
    """
    try:
        action = request.agent_action
        
        # Set timestamp if not provided
        if not action.timestamp:
            action.timestamp = datetime.now().isoformat()
        
        # Calculate anomaly score
        score, is_anomaly, risk_level, reason = calculate_anomaly_score(action)
        
        # Store action in history
        action_dict = action.dict()
        agent_actions_history.append(action_dict)
        
        # Generate alert if anomaly detected
        if is_anomaly:
            alert_id = f"ALT-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(alerts_history)}"
            alert = Alert(
                alert_id=alert_id,
                agent_id=action.agent_id,
                agent_type=action.agent_type,
                action_type=action.action_type,
                anomaly_score=score,
                risk_level=risk_level,
                reason=reason,
                details={
                    "payload_size": action.payload_size,
                    "response_time_ms": action.response_time_ms,
                    "success": action.success,
                    "vehicle_id": action.vehicle_id,
                    "target_entity": action.target_entity
                },
                timestamp=datetime.now().isoformat(),
                resolved=False
            )
            alerts_history.append(alert.dict())
            logger.warning(f"Anomaly detected: {alert_id} - {reason}")
        
        # Periodically retrain model
        if len(agent_actions_history) % 100 == 0:
            train_isolation_forest()
        
        action_id = f"ACT-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return ScoreResponse(
            action_id=action_id,
            score=round(score, 4),
            is_anomaly=is_anomaly,
            alert=is_anomaly and risk_level in ["High", "Critical"],
            reason=reason,
            risk_level=risk_level,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error scoring action: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts", response_model=AlertsResponse)
async def get_alerts(
    limit: int = 50,
    risk_level: Optional[str] = None,
    unresolved_only: bool = False
):
    """
    Get list of anomaly alerts
    
    Optionally filter by risk level or resolution status.
    """
    alerts = list(alerts_history)
    
    # Filter by risk level
    if risk_level:
        alerts = [a for a in alerts if a.get('risk_level') == risk_level]
    
    # Filter by resolution status
    if unresolved_only:
        alerts = [a for a in alerts if not a.get('resolved', False)]
    
    # Sort by timestamp (newest first)
    alerts = sorted(alerts, key=lambda x: x.get('timestamp', ''), reverse=True)
    
    # Apply limit
    alerts = alerts[:limit]
    
    # Count unresolved
    unresolved_count = sum(1 for a in alerts_history if not a.get('resolved', False))
    
    return AlertsResponse(
        alerts=[Alert(**a) for a in alerts],
        total_count=len(alerts_history),
        unresolved_count=unresolved_count
    )


@app.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    """Mark an alert as resolved"""
    for alert in alerts_history:
        if alert.get('alert_id') == alert_id:
            alert['resolved'] = True
            alert['resolved_at'] = datetime.now().isoformat()
            return {"status": "resolved", "alert_id": alert_id}
    
    raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")


@app.get("/stats")
async def get_stats():
    """Get UEBA statistics"""
    
    # Calculate statistics
    total_actions = len(agent_actions_history)
    total_alerts = len(alerts_history)
    
    # Risk level distribution
    risk_distribution = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0, "Normal": 0}
    for alert in alerts_history:
        level = alert.get('risk_level', 'Normal')
        if level in risk_distribution:
            risk_distribution[level] += 1
    
    # Agent type distribution
    agent_distribution = {}
    for action in agent_actions_history:
        agent_type = action.get('agent_type', 'unknown')
        agent_distribution[agent_type] = agent_distribution.get(agent_type, 0) + 1
    
    # Recent anomaly rate
    recent_actions = list(agent_actions_history)[-100:]
    recent_anomalies = sum(1 for a in recent_actions 
                          if any(al.get('agent_id') == a.get('agent_id') 
                                 for al in list(alerts_history)[-50:]))
    anomaly_rate = recent_anomalies / len(recent_actions) if recent_actions else 0
    
    return {
        "total_actions_monitored": total_actions,
        "total_alerts_generated": total_alerts,
        "unresolved_alerts": sum(1 for a in alerts_history if not a.get('resolved', False)),
        "risk_distribution": risk_distribution,
        "agent_type_distribution": agent_distribution,
        "recent_anomaly_rate": round(anomaly_rate, 4),
        "model_status": "trained" if anomaly_model is not None else "untrained"
    }


@app.post("/train")
async def trigger_training():
    """Manually trigger model retraining"""
    success = train_isolation_forest()
    
    if success:
        return {
            "status": "success",
            "message": f"Model trained on {len(agent_actions_history)} samples",
            "timestamp": datetime.now().isoformat()
        }
    else:
        return {
            "status": "failed",
            "message": "Not enough data to train model (need at least 50 samples)",
            "current_samples": len(agent_actions_history)
        }


@app.post("/simulate-anomaly")
async def simulate_anomaly():
    """Simulate an anomalous action for testing"""
    
    # Create suspicious action
    suspicious_action = AgentAction(
        agent_id="suspicious-agent",
        agent_type="master",
        action_type="query",
        target_entity="all_vehicles",
        vehicle_id=None,
        payload_size=5000000,  # Unusually large
        response_time_ms=15000,  # Unusually slow
        success=False,
        metadata={"source": "simulation"},
        timestamp=datetime.now().isoformat()
    )
    
    # Score the action
    request = ScoreRequest(agent_action=suspicious_action)
    result = await score_action(request)
    
    return {
        "simulation": "complete",
        "action": suspicious_action.dict(),
        "result": result
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5001)
