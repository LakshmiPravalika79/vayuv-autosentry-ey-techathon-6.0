"""
AutoSentry AI - ML Service
FastAPI-based machine learning service for predictive vehicle maintenance
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
import logging
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AutoSentry AI - ML Service",
    description="Machine Learning service for predictive vehicle maintenance",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)
# Get origins from environment variable or default to localhost
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = allowed_origins_env.split(",")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model and scaler
model = None
scaler = None
MODEL_PATH = "models/failure_predictor.joblib"
SCALER_PATH = "models/scaler.joblib"

# Pydantic models
class TelemetryInput(BaseModel):
    vehicle_id: str
    engine_temp: float
    oil_pressure: float
    battery_voltage: float
    fuel_level: float
    tire_pressure_fl: float
    tire_pressure_fr: float
    tire_pressure_rl: float
    tire_pressure_rr: float
    brake_pad_wear_fl: float
    brake_pad_wear_fr: float
    brake_pad_wear_rl: float
    brake_pad_wear_rr: float
    odometer: int
    speed: float
    rpm: float
    coolant_level: float
    transmission_temp: float
    check_engine_light: bool = False

class PredictionResponse(BaseModel):
    vehicle_id: str
    failure_probability: float
    failure_window_days: int
    severity: str
    predicted_failure_types: List[str]
    explanation: str
    recommendations: List[str]
    confidence: float
    timestamp: str

class TrainingResponse(BaseModel):
    status: str
    accuracy: float
    message: str
    timestamp: str

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str

class BatchPredictionInput(BaseModel):
    vehicles: List[TelemetryInput]


def load_model():
    """Load the trained model and scaler"""
    global model, scaler
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            model = joblib.load(MODEL_PATH)
            scaler = joblib.load(SCALER_PATH)
            logger.info("Model and scaler loaded successfully")
            return True
        else:
            logger.warning("Model files not found, will need to train first")
            return False
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False


def prepare_features(telemetry: TelemetryInput) -> np.ndarray:
    """Prepare features for prediction"""
    # Calculate derived features
    tire_pressure_avg = (telemetry.tire_pressure_fl + telemetry.tire_pressure_fr + 
                         telemetry.tire_pressure_rl + telemetry.tire_pressure_rr) / 4
    tire_pressure_variance = np.var([telemetry.tire_pressure_fl, telemetry.tire_pressure_fr,
                                     telemetry.tire_pressure_rl, telemetry.tire_pressure_rr])
    brake_pad_wear_avg = (telemetry.brake_pad_wear_fl + telemetry.brake_pad_wear_fr +
                          telemetry.brake_pad_wear_rl + telemetry.brake_pad_wear_rr) / 4
    brake_pad_wear_min = min(telemetry.brake_pad_wear_fl, telemetry.brake_pad_wear_fr,
                             telemetry.brake_pad_wear_rl, telemetry.brake_pad_wear_rr)
    
    # Engine health score (normalized)
    engine_health = 1.0 - min(1.0, max(0, (telemetry.engine_temp - 90) / 40))
    
    # Oil health score
    oil_health = min(1.0, telemetry.oil_pressure / 45)
    
    # Battery health score
    battery_health = min(1.0, max(0, (telemetry.battery_voltage - 10) / 3))
    
    # Cooling system health
    cooling_health = min(1.0, telemetry.coolant_level)
    
    # Transmission health
    trans_health = 1.0 - min(1.0, max(0, (telemetry.transmission_temp - 80) / 50))
    
    features = np.array([
        telemetry.engine_temp,
        telemetry.oil_pressure,
        telemetry.battery_voltage,
        telemetry.fuel_level,
        tire_pressure_avg,
        tire_pressure_variance,
        brake_pad_wear_avg,
        brake_pad_wear_min,
        telemetry.odometer / 10000,  # Normalize odometer
        telemetry.speed,
        telemetry.rpm / 1000,  # Normalize RPM
        telemetry.coolant_level,
        telemetry.transmission_temp,
        1 if telemetry.check_engine_light else 0,
        engine_health,
        oil_health,
        battery_health,
        cooling_health,
        trans_health
    ]).reshape(1, -1)
    
    return features


def determine_severity(probability: float, features: dict) -> str:
    """Determine severity level based on probability and features"""
    if probability > 0.8:
        return "Critical"
    elif probability > 0.6:
        return "High"
    elif probability > 0.4:
        return "Medium"
    elif probability > 0.2:
        return "Low"
    return "Normal"


def identify_failure_types(telemetry: TelemetryInput) -> List[str]:
    """Identify potential failure types based on telemetry"""
    failures = []
    
    # Engine overheating
    if telemetry.engine_temp > 105:
        failures.append("Engine Overheating")
    
    # Oil pressure issues
    if telemetry.oil_pressure < 30:
        failures.append("Low Oil Pressure")
    
    # Battery degradation
    if telemetry.battery_voltage < 11.5:
        failures.append("Battery Failure")
    
    # Brake wear
    brake_min = min(telemetry.brake_pad_wear_fl, telemetry.brake_pad_wear_fr,
                    telemetry.brake_pad_wear_rl, telemetry.brake_pad_wear_rr)
    if brake_min < 0.2:
        failures.append("Brake Pad Replacement Needed")
    
    # Tire pressure
    tire_pressures = [telemetry.tire_pressure_fl, telemetry.tire_pressure_fr,
                      telemetry.tire_pressure_rl, telemetry.tire_pressure_rr]
    if any(p < 28 for p in tire_pressures):
        failures.append("Low Tire Pressure")
    
    # Coolant level
    if telemetry.coolant_level < 0.6:
        failures.append("Coolant System Issue")
    
    # Transmission overheating
    if telemetry.transmission_temp > 110:
        failures.append("Transmission Overheating")
    
    # Check engine light
    if telemetry.check_engine_light:
        failures.append("Check Engine Light Active")
    
    return failures if failures else ["No Immediate Concerns"]


def generate_explanation(telemetry: TelemetryInput, probability: float, failures: List[str]) -> str:
    """Generate human-readable explanation"""
    explanations = []
    
    if probability > 0.6:
        explanations.append(f"High risk of failure detected (confidence: {probability:.1%}).")
    
    if telemetry.engine_temp > 100:
        explanations.append(f"Engine temperature ({telemetry.engine_temp}°C) is above optimal range.")
    
    if telemetry.oil_pressure < 35:
        explanations.append(f"Oil pressure ({telemetry.oil_pressure} PSI) is below recommended levels.")
    
    if telemetry.battery_voltage < 12:
        explanations.append(f"Battery voltage ({telemetry.battery_voltage}V) indicates potential battery issues.")
    
    brake_min = min(telemetry.brake_pad_wear_fl, telemetry.brake_pad_wear_fr,
                    telemetry.brake_pad_wear_rl, telemetry.brake_pad_wear_rr)
    if brake_min < 0.3:
        explanations.append(f"Brake pad wear ({brake_min:.0%} remaining) requires attention.")
    
    if telemetry.coolant_level < 0.7:
        explanations.append(f"Coolant level ({telemetry.coolant_level:.0%}) is low.")
    
    if not explanations:
        explanations.append("Vehicle systems are operating within normal parameters.")
    
    return " ".join(explanations)


def generate_recommendations(telemetry: TelemetryInput, failures: List[str], severity: str) -> List[str]:
    """Generate maintenance recommendations"""
    recommendations = []
    
    if "Engine Overheating" in failures:
        recommendations.append("Schedule immediate cooling system inspection")
        recommendations.append("Check coolant levels and thermostat function")
    
    if "Low Oil Pressure" in failures:
        recommendations.append("Check oil level and quality")
        recommendations.append("Inspect for oil leaks")
    
    if "Battery Failure" in failures:
        recommendations.append("Test battery and charging system")
        recommendations.append("Consider battery replacement if more than 3 years old")
    
    if "Brake Pad Replacement Needed" in failures:
        recommendations.append("Schedule brake pad replacement within 2 weeks")
        recommendations.append("Avoid heavy braking until service")
    
    if "Low Tire Pressure" in failures:
        recommendations.append("Inflate tires to recommended pressure")
        recommendations.append("Inspect for punctures or slow leaks")
    
    if "Coolant System Issue" in failures:
        recommendations.append("Check for coolant leaks")
        recommendations.append("Top up coolant reservoir")
    
    if "Transmission Overheating" in failures:
        recommendations.append("Check transmission fluid level and condition")
        recommendations.append("Avoid heavy towing until inspection")
    
    if severity == "Critical":
        recommendations.insert(0, "⚠️ URGENT: Schedule service immediately")
    elif severity == "High":
        recommendations.insert(0, "Schedule service within 48 hours")
    elif severity == "Medium":
        recommendations.insert(0, "Schedule service within 1 week")
    
    if not recommendations:
        recommendations.append("Continue regular maintenance schedule")
        recommendations.append("Next service recommended at scheduled interval")
    
    return recommendations


def estimate_failure_window(probability: float, severity: str) -> int:
    """Estimate days until potential failure"""
    if severity == "Critical":
        return max(1, int(7 * (1 - probability)))
    elif severity == "High":
        return max(7, int(14 * (1 - probability)))
    elif severity == "Medium":
        return max(14, int(30 * (1 - probability)))
    elif severity == "Low":
        return max(30, int(60 * (1 - probability)))
    return 90


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    os.makedirs("models", exist_ok=True)
    load_model()


@app.get("/", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None,
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model is not None,
        version="1.0.0"
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict(telemetry: TelemetryInput):
    """
    Predict vehicle failure probability
    
    Returns probability of failure within 30 days, severity level,
    potential failure types, and recommendations.
    """
    try:
        # Prepare features
        features = prepare_features(telemetry)
        
        # Calculate probability
        if model is not None and scaler is not None:
            # Use trained model
            scaled_features = scaler.transform(features)
            proba = model.predict_proba(scaled_features)[0]
            failure_probability = float(proba[1]) if len(proba) > 1 else float(proba[0])
        else:
            # Fallback: rule-based probability calculation
            failure_probability = calculate_rule_based_probability(telemetry)
        
        # Identify failure types
        failure_types = identify_failure_types(telemetry)
        
        # Determine severity
        severity = determine_severity(failure_probability, telemetry.dict())
        
        # Generate explanation
        explanation = generate_explanation(telemetry, failure_probability, failure_types)
        
        # Generate recommendations
        recommendations = generate_recommendations(telemetry, failure_types, severity)
        
        # Estimate failure window
        failure_window = estimate_failure_window(failure_probability, severity)
        
        # Calculate confidence
        confidence = 0.85 if model is not None else 0.70
        
        return PredictionResponse(
            vehicle_id=telemetry.vehicle_id,
            failure_probability=round(failure_probability, 4),
            failure_window_days=failure_window,
            severity=severity,
            predicted_failure_types=failure_types,
            explanation=explanation,
            recommendations=recommendations,
            confidence=confidence,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def calculate_rule_based_probability(telemetry: TelemetryInput) -> float:
    """Calculate failure probability using rule-based approach"""
    risk_score = 0.0
    
    # Engine temperature risk
    if telemetry.engine_temp > 115:
        risk_score += 0.3
    elif telemetry.engine_temp > 105:
        risk_score += 0.2
    elif telemetry.engine_temp > 95:
        risk_score += 0.05
    
    # Oil pressure risk
    if telemetry.oil_pressure < 25:
        risk_score += 0.3
    elif telemetry.oil_pressure < 32:
        risk_score += 0.15
    elif telemetry.oil_pressure < 38:
        risk_score += 0.05
    
    # Battery risk
    if telemetry.battery_voltage < 10.5:
        risk_score += 0.25
    elif telemetry.battery_voltage < 11.5:
        risk_score += 0.15
    elif telemetry.battery_voltage < 12:
        risk_score += 0.05
    
    # Brake wear risk
    brake_min = min(telemetry.brake_pad_wear_fl, telemetry.brake_pad_wear_fr,
                    telemetry.brake_pad_wear_rl, telemetry.brake_pad_wear_rr)
    if brake_min < 0.1:
        risk_score += 0.25
    elif brake_min < 0.2:
        risk_score += 0.15
    elif brake_min < 0.3:
        risk_score += 0.05
    
    # Coolant level risk
    if telemetry.coolant_level < 0.5:
        risk_score += 0.2
    elif telemetry.coolant_level < 0.7:
        risk_score += 0.1
    
    # Transmission temperature risk
    if telemetry.transmission_temp > 120:
        risk_score += 0.25
    elif telemetry.transmission_temp > 105:
        risk_score += 0.1
    
    # Check engine light
    if telemetry.check_engine_light:
        risk_score += 0.15
    
    # Odometer risk (high mileage)
    if telemetry.odometer > 150000:
        risk_score += 0.1
    elif telemetry.odometer > 100000:
        risk_score += 0.05
    
    return min(1.0, risk_score)


@app.post("/predict/batch", response_model=List[PredictionResponse])
async def predict_batch(batch: BatchPredictionInput):
    """Batch prediction for multiple vehicles"""
    predictions = []
    for vehicle in batch.vehicles:
        prediction = await predict(vehicle)
        predictions.append(prediction)
    return predictions


@app.post("/train", response_model=TrainingResponse)
async def train_model(background_tasks: BackgroundTasks):
    """
    Train the predictive model
    
    Trains using synthetic training data and saves the model.
    """
    try:
        global model, scaler
        
        # Load training data
        data_path = "../data/training_data.csv"
        if not os.path.exists(data_path):
            data_path = "data/training_data.csv"
        if not os.path.exists(data_path):
            data_path = "/app/data/training_data.csv"
        
        if not os.path.exists(data_path):
            # Generate synthetic training data
            df = generate_synthetic_training_data()
        else:
            df = pd.read_csv(data_path)
        
        logger.info(f"Training with {len(df)} samples")
        
        # Prepare features
        feature_columns = [
            'engine_temp', 'oil_pressure', 'battery_voltage', 'fuel_level',
            'tire_pressure_avg', 'brake_pad_wear_avg', 'odometer', 'speed',
            'rpm', 'coolant_level', 'transmission_temp', 'check_engine_light'
        ]
        
        # Create derived features if not present
        if 'tire_pressure_avg' not in df.columns:
            df['tire_pressure_avg'] = 30.0  # Default value
        if 'brake_pad_wear_avg' not in df.columns:
            df['brake_pad_wear_avg'] = 0.5  # Default value
        
        # Handle missing columns
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0
        
        X = df[feature_columns].values
        y = df['failure_within_30_days'].values
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model and scaler
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        
        logger.info(f"Model trained with accuracy: {accuracy:.4f}")
        
        return TrainingResponse(
            status="success",
            accuracy=round(accuracy, 4),
            message=f"Model trained successfully with {len(df)} samples",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Training error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def generate_synthetic_training_data() -> pd.DataFrame:
    """Generate synthetic training data for the model"""
    np.random.seed(42)
    n_samples = 1000
    
    data = {
        'vehicle_id': [f'VH{i:03d}' for i in range(n_samples)],
        'engine_temp': np.random.normal(95, 15, n_samples),
        'oil_pressure': np.random.normal(40, 8, n_samples),
        'battery_voltage': np.random.normal(12.3, 0.8, n_samples),
        'fuel_level': np.random.uniform(10, 100, n_samples),
        'tire_pressure_avg': np.random.normal(31, 2, n_samples),
        'brake_pad_wear_avg': np.random.uniform(0.1, 0.9, n_samples),
        'odometer': np.random.uniform(10000, 180000, n_samples),
        'speed': np.random.uniform(0, 80, n_samples),
        'rpm': np.random.normal(2500, 500, n_samples),
        'coolant_level': np.random.uniform(0.4, 1.0, n_samples),
        'transmission_temp': np.random.normal(90, 20, n_samples),
        'check_engine_light': np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
    }
    
    df = pd.DataFrame(data)
    
    # Create target variable based on conditions
    df['failure_within_30_days'] = 0
    
    # High risk conditions
    df.loc[df['engine_temp'] > 110, 'failure_within_30_days'] = 1
    df.loc[df['oil_pressure'] < 28, 'failure_within_30_days'] = 1
    df.loc[df['battery_voltage'] < 11, 'failure_within_30_days'] = 1
    df.loc[df['brake_pad_wear_avg'] < 0.15, 'failure_within_30_days'] = 1
    df.loc[df['coolant_level'] < 0.5, 'failure_within_30_days'] = 1
    df.loc[df['transmission_temp'] > 120, 'failure_within_30_days'] = 1
    
    # Add some noise
    noise_mask = np.random.random(n_samples) < 0.05
    df.loc[noise_mask, 'failure_within_30_days'] = 1 - df.loc[noise_mask, 'failure_within_30_days']
    
    return df


@app.get("/model/info")
async def model_info():
    """Get information about the current model"""
    if model is None:
        return {
            "model_loaded": False,
            "message": "No model loaded. Please train the model first."
        }
    
    return {
        "model_loaded": True,
        "model_type": type(model).__name__,
        "n_features": model.n_features_in_ if hasattr(model, 'n_features_in_') else "unknown",
        "n_estimators": model.n_estimators if hasattr(model, 'n_estimators') else "unknown",
        "feature_importances": dict(zip(
            ['engine_temp', 'oil_pressure', 'battery_voltage', 'fuel_level',
             'tire_pressure_avg', 'tire_pressure_variance', 'brake_pad_wear_avg',
             'brake_pad_wear_min', 'odometer_normalized', 'speed', 'rpm_normalized',
             'coolant_level', 'transmission_temp', 'check_engine_light',
             'engine_health', 'oil_health', 'battery_health', 'cooling_health', 'trans_health'],
            model.feature_importances_.tolist()
        )) if hasattr(model, 'feature_importances_') else {}
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
