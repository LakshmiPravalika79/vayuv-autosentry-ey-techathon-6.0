"""
AutoSentry AI - Data Analysis Agent
Analyzes vehicle telemetry data and identifies patterns
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import httpx

# Import shared types
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adapters import AgentType, ActionType, AgentTask, AgentResult


@dataclass
class TelemetryAnalysis:
    """Result of telemetry data analysis"""
    vehicle_id: str
    timestamp: str
    patterns_detected: List[Dict[str, Any]] = field(default_factory=list)
    anomalies: List[Dict[str, Any]] = field(default_factory=list)
    trends: Dict[str, Any] = field(default_factory=dict)
    health_score: float = 100.0
    risk_level: str = "low"  # low, medium, high, critical
    recommendations: List[str] = field(default_factory=list)


@dataclass
class HistoricalComparison:
    """Comparison with historical data"""
    metric: str
    current_value: float
    historical_avg: float
    deviation_percent: float
    trend: str  # increasing, decreasing, stable
    is_anomaly: bool


class DataAnalysisAgent:
    """
    Data Analysis Agent - Worker Agent #1
    
    Responsibilities:
    - Analyze real-time vehicle telemetry data
    - Identify patterns and anomalies in sensor readings
    - Calculate vehicle health scores
    - Detect trends over time
    - Trigger alerts for concerning patterns
    """
    
    def __init__(self):
        self.agent_type = AgentType.DATA_ANALYSIS
        self.ml_service_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
        self.ueba_service_url = os.getenv("UEBA_SERVICE_URL", "http://localhost:8002")
        
        # Analysis thresholds
        self.thresholds = {
            "engine_temp": {"warning": 100, "critical": 110},
            "battery_voltage": {"warning_low": 11.5, "warning_high": 14.5, "critical_low": 11.0, "critical_high": 15.0},
            "tire_pressure": {"warning_low": 28, "warning_high": 38, "critical_low": 25, "critical_high": 42},
            "oil_pressure": {"warning_low": 25, "critical_low": 20},
            "brake_pad_thickness": {"warning": 4, "critical": 2},
            "coolant_level": {"warning": 40, "critical": 30},
            "fuel_efficiency_drop": {"warning": 15, "critical": 25},  # percentage
        }
        
        # Historical data cache
        self._historical_cache: Dict[str, List[Dict]] = {}
        
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute data analysis task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.ANALYZE:
                result = await self._analyze_telemetry(payload)
            elif action == ActionType.MONITOR:
                result = await self._continuous_monitoring(payload)
            else:
                result = {"error": f"Unsupported action: {action}"}
                
            return AgentResult(
                task_id=task.task_id,
                agent_type=self.agent_type,
                success=True,
                result=result,
                execution_time=(datetime.utcnow() - start_time).total_seconds()
            )
            
        except Exception as e:
            return AgentResult(
                task_id=task.task_id,
                agent_type=self.agent_type,
                success=False,
                result={"error": str(e)},
                error=str(e),
                execution_time=(datetime.utcnow() - start_time).total_seconds()
            )
    
    async def _analyze_telemetry(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze vehicle telemetry data"""
        vehicle_id = payload.get("vehicle_id")
        telemetry = payload.get("telemetry", {})
        
        if not vehicle_id or not telemetry:
            return {"error": "Missing vehicle_id or telemetry data"}
        
        # Perform multi-dimensional analysis
        patterns = await self._detect_patterns(vehicle_id, telemetry)
        anomalies = await self._detect_anomalies(telemetry)
        trends = await self._analyze_trends(vehicle_id, telemetry)
        health_score = self._calculate_health_score(telemetry, anomalies)
        risk_level = self._determine_risk_level(health_score, anomalies)
        recommendations = self._generate_recommendations(anomalies, trends, health_score)
        
        # Store in historical cache for trend analysis
        self._update_historical_cache(vehicle_id, telemetry)
        
        analysis = TelemetryAnalysis(
            vehicle_id=vehicle_id,
            timestamp=datetime.utcnow().isoformat(),
            patterns_detected=patterns,
            anomalies=anomalies,
            trends=trends,
            health_score=health_score,
            risk_level=risk_level,
            recommendations=recommendations
        )
        
        return {
            "vehicle_id": analysis.vehicle_id,
            "timestamp": analysis.timestamp,
            "health_score": analysis.health_score,
            "risk_level": analysis.risk_level,
            "patterns_detected": analysis.patterns_detected,
            "anomalies": analysis.anomalies,
            "trends": analysis.trends,
            "recommendations": analysis.recommendations,
            "requires_diagnosis": len(anomalies) > 0 or risk_level in ["high", "critical"],
            "diagnosis_priority": self._calculate_diagnosis_priority(risk_level, anomalies)
        }
    
    async def _detect_patterns(self, vehicle_id: str, telemetry: Dict) -> List[Dict]:
        """Detect patterns in telemetry data"""
        patterns = []
        
        # Pattern 1: Correlated sensor readings
        engine_temp = telemetry.get("engine_temp", 0)
        coolant_temp = telemetry.get("coolant_temp", engine_temp)
        
        if abs(engine_temp - coolant_temp) > 15:
            patterns.append({
                "type": "temperature_correlation",
                "description": "Engine and coolant temperature divergence detected",
                "severity": "medium",
                "metrics": {"engine_temp": engine_temp, "coolant_temp": coolant_temp}
            })
        
        # Pattern 2: Battery drain pattern
        battery_voltage = telemetry.get("battery_voltage", 12.6)
        if battery_voltage < 12.0 and telemetry.get("engine_running", False):
            patterns.append({
                "type": "battery_drain",
                "description": "Battery not charging properly while engine running",
                "severity": "high",
                "metrics": {"battery_voltage": battery_voltage}
            })
        
        # Pattern 3: Tire pressure imbalance
        tire_pressures = [
            telemetry.get("tire_pressure_fl", 32),
            telemetry.get("tire_pressure_fr", 32),
            telemetry.get("tire_pressure_rl", 32),
            telemetry.get("tire_pressure_rr", 32)
        ]
        pressure_variance = max(tire_pressures) - min(tire_pressures)
        if pressure_variance > 5:
            patterns.append({
                "type": "tire_imbalance",
                "description": f"Tire pressure variance of {pressure_variance:.1f} PSI detected",
                "severity": "medium",
                "metrics": {
                    "fl": tire_pressures[0],
                    "fr": tire_pressures[1],
                    "rl": tire_pressures[2],
                    "rr": tire_pressures[3],
                    "variance": pressure_variance
                }
            })
        
        # Pattern 4: Fuel efficiency degradation
        current_mpg = telemetry.get("fuel_efficiency", 0)
        baseline_mpg = telemetry.get("baseline_mpg", current_mpg)
        if baseline_mpg > 0:
            efficiency_drop = ((baseline_mpg - current_mpg) / baseline_mpg) * 100
            if efficiency_drop > self.thresholds["fuel_efficiency_drop"]["warning"]:
                patterns.append({
                    "type": "efficiency_degradation",
                    "description": f"Fuel efficiency dropped by {efficiency_drop:.1f}%",
                    "severity": "high" if efficiency_drop > self.thresholds["fuel_efficiency_drop"]["critical"] else "medium",
                    "metrics": {"current_mpg": current_mpg, "baseline_mpg": baseline_mpg, "drop_percent": efficiency_drop}
                })
        
        # Pattern 5: Brake wear correlation
        brake_pad = telemetry.get("brake_pad_thickness", 10)
        brake_temp = telemetry.get("brake_temp", 100)
        if brake_pad < 5 and brake_temp > 250:
            patterns.append({
                "type": "brake_stress",
                "description": "Worn brake pads with elevated temperature",
                "severity": "critical",
                "metrics": {"brake_pad_thickness": brake_pad, "brake_temp": brake_temp}
            })
        
        return patterns
    
    async def _detect_anomalies(self, telemetry: Dict) -> List[Dict]:
        """Detect anomalies based on threshold violations"""
        anomalies = []
        
        # Engine temperature check
        engine_temp = telemetry.get("engine_temp", 90)
        if engine_temp >= self.thresholds["engine_temp"]["critical"]:
            anomalies.append({
                "type": "engine_overheating",
                "severity": "critical",
                "value": engine_temp,
                "threshold": self.thresholds["engine_temp"]["critical"],
                "message": f"Critical: Engine temperature at {engine_temp}°C"
            })
        elif engine_temp >= self.thresholds["engine_temp"]["warning"]:
            anomalies.append({
                "type": "engine_temp_warning",
                "severity": "warning",
                "value": engine_temp,
                "threshold": self.thresholds["engine_temp"]["warning"],
                "message": f"Warning: Engine temperature elevated at {engine_temp}°C"
            })
        
        # Battery voltage check
        battery = telemetry.get("battery_voltage", 12.6)
        if battery <= self.thresholds["battery_voltage"]["critical_low"]:
            anomalies.append({
                "type": "battery_critical_low",
                "severity": "critical",
                "value": battery,
                "threshold": self.thresholds["battery_voltage"]["critical_low"],
                "message": f"Critical: Battery voltage at {battery}V"
            })
        elif battery <= self.thresholds["battery_voltage"]["warning_low"]:
            anomalies.append({
                "type": "battery_low",
                "severity": "warning",
                "value": battery,
                "threshold": self.thresholds["battery_voltage"]["warning_low"],
                "message": f"Warning: Low battery voltage at {battery}V"
            })
        
        # Oil pressure check
        oil_pressure = telemetry.get("oil_pressure", 40)
        if oil_pressure <= self.thresholds["oil_pressure"]["critical_low"]:
            anomalies.append({
                "type": "oil_pressure_critical",
                "severity": "critical",
                "value": oil_pressure,
                "threshold": self.thresholds["oil_pressure"]["critical_low"],
                "message": f"Critical: Oil pressure at {oil_pressure} PSI"
            })
        elif oil_pressure <= self.thresholds["oil_pressure"]["warning_low"]:
            anomalies.append({
                "type": "oil_pressure_low",
                "severity": "warning",
                "value": oil_pressure,
                "threshold": self.thresholds["oil_pressure"]["warning_low"],
                "message": f"Warning: Oil pressure low at {oil_pressure} PSI"
            })
        
        # Brake pad thickness check
        brake_pad = telemetry.get("brake_pad_thickness", 10)
        if brake_pad <= self.thresholds["brake_pad_thickness"]["critical"]:
            anomalies.append({
                "type": "brake_critical",
                "severity": "critical",
                "value": brake_pad,
                "threshold": self.thresholds["brake_pad_thickness"]["critical"],
                "message": f"Critical: Brake pads at {brake_pad}mm - immediate replacement required"
            })
        elif brake_pad <= self.thresholds["brake_pad_thickness"]["warning"]:
            anomalies.append({
                "type": "brake_warning",
                "severity": "warning",
                "value": brake_pad,
                "threshold": self.thresholds["brake_pad_thickness"]["warning"],
                "message": f"Warning: Brake pads at {brake_pad}mm - schedule replacement"
            })
        
        # Coolant level check
        coolant = telemetry.get("coolant_level", 80)
        if coolant <= self.thresholds["coolant_level"]["critical"]:
            anomalies.append({
                "type": "coolant_critical",
                "severity": "critical",
                "value": coolant,
                "threshold": self.thresholds["coolant_level"]["critical"],
                "message": f"Critical: Coolant level at {coolant}%"
            })
        elif coolant <= self.thresholds["coolant_level"]["warning"]:
            anomalies.append({
                "type": "coolant_low",
                "severity": "warning",
                "value": coolant,
                "threshold": self.thresholds["coolant_level"]["warning"],
                "message": f"Warning: Coolant level low at {coolant}%"
            })
        
        return anomalies
    
    async def _analyze_trends(self, vehicle_id: str, telemetry: Dict) -> Dict[str, Any]:
        """Analyze trends based on historical data"""
        trends = {}
        
        historical = self._historical_cache.get(vehicle_id, [])
        if len(historical) < 2:
            return {"message": "Insufficient historical data for trend analysis"}
        
        # Calculate trends for key metrics
        metrics = ["engine_temp", "battery_voltage", "oil_pressure", "fuel_efficiency"]
        
        for metric in metrics:
            if metric in telemetry:
                current = telemetry[metric]
                historical_values = [h.get(metric, current) for h in historical[-10:]]
                
                if historical_values:
                    avg = sum(historical_values) / len(historical_values)
                    deviation = ((current - avg) / avg) * 100 if avg != 0 else 0
                    
                    # Determine trend direction
                    if len(historical_values) >= 3:
                        recent = historical_values[-3:]
                        if all(recent[i] < recent[i+1] for i in range(len(recent)-1)):
                            trend = "increasing"
                        elif all(recent[i] > recent[i+1] for i in range(len(recent)-1)):
                            trend = "decreasing"
                        else:
                            trend = "stable"
                    else:
                        trend = "insufficient_data"
                    
                    trends[metric] = {
                        "current": current,
                        "historical_avg": round(avg, 2),
                        "deviation_percent": round(deviation, 2),
                        "trend": trend,
                        "is_concerning": abs(deviation) > 20
                    }
        
        return trends
    
    def _calculate_health_score(self, telemetry: Dict, anomalies: List[Dict]) -> float:
        """Calculate overall vehicle health score (0-100)"""
        score = 100.0
        
        # Deduct for anomalies
        for anomaly in anomalies:
            if anomaly["severity"] == "critical":
                score -= 25
            elif anomaly["severity"] == "warning":
                score -= 10
            elif anomaly["severity"] == "info":
                score -= 3
        
        # Factor in component health percentages
        component_health = [
            telemetry.get("engine_health", 100),
            telemetry.get("transmission_health", 100),
            telemetry.get("battery_health", 100),
            telemetry.get("brake_health", 100),
            telemetry.get("suspension_health", 100)
        ]
        
        avg_component_health = sum(component_health) / len(component_health)
        score = (score * 0.6) + (avg_component_health * 0.4)
        
        return max(0, min(100, round(score, 1)))
    
    def _determine_risk_level(self, health_score: float, anomalies: List[Dict]) -> str:
        """Determine overall risk level"""
        critical_count = sum(1 for a in anomalies if a["severity"] == "critical")
        warning_count = sum(1 for a in anomalies if a["severity"] == "warning")
        
        if critical_count >= 2 or health_score < 30:
            return "critical"
        elif critical_count == 1 or health_score < 50:
            return "high"
        elif warning_count >= 3 or health_score < 70:
            return "medium"
        else:
            return "low"
    
    def _generate_recommendations(self, anomalies: List[Dict], trends: Dict, health_score: float) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Based on anomalies
        anomaly_types = [a["type"] for a in anomalies]
        
        if any("engine" in t for t in anomaly_types):
            recommendations.append("Schedule engine diagnostic check immediately")
        
        if any("battery" in t for t in anomaly_types):
            recommendations.append("Have battery and charging system tested")
        
        if any("brake" in t for t in anomaly_types):
            recommendations.append("Brake system inspection required - safety critical")
        
        if any("oil" in t for t in anomaly_types):
            recommendations.append("Check oil level and schedule oil change if needed")
        
        if any("coolant" in t for t in anomaly_types):
            recommendations.append("Top up coolant and check for leaks")
        
        # Based on trends
        for metric, trend_data in trends.items():
            if isinstance(trend_data, dict) and trend_data.get("is_concerning"):
                if trend_data.get("trend") == "decreasing" and metric in ["battery_voltage", "oil_pressure"]:
                    recommendations.append(f"Monitor {metric.replace('_', ' ')} - showing concerning decline")
                elif trend_data.get("trend") == "increasing" and metric in ["engine_temp"]:
                    recommendations.append(f"Monitor {metric.replace('_', ' ')} - showing upward trend")
        
        # Based on overall health
        if health_score < 50:
            recommendations.append("Consider comprehensive vehicle inspection due to low health score")
        elif health_score < 70:
            recommendations.append("Schedule routine maintenance to prevent further degradation")
        
        return recommendations
    
    def _calculate_diagnosis_priority(self, risk_level: str, anomalies: List[Dict]) -> int:
        """Calculate priority for diagnosis agent (1-10, 10 highest)"""
        base_priority = {
            "critical": 10,
            "high": 7,
            "medium": 4,
            "low": 1
        }.get(risk_level, 1)
        
        # Boost for multiple anomalies
        critical_boost = sum(2 for a in anomalies if a["severity"] == "critical")
        warning_boost = sum(1 for a in anomalies if a["severity"] == "warning")
        
        return min(10, base_priority + critical_boost + (warning_boost // 2))
    
    def _update_historical_cache(self, vehicle_id: str, telemetry: Dict) -> None:
        """Update historical cache for trend analysis"""
        if vehicle_id not in self._historical_cache:
            self._historical_cache[vehicle_id] = []
        
        self._historical_cache[vehicle_id].append({
            **telemetry,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Keep last 100 readings
        if len(self._historical_cache[vehicle_id]) > 100:
            self._historical_cache[vehicle_id] = self._historical_cache[vehicle_id][-100:]
    
    async def _continuous_monitoring(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Continuous monitoring mode for real-time analysis"""
        vehicle_id = payload.get("vehicle_id")
        duration_seconds = payload.get("duration", 60)
        interval_seconds = payload.get("interval", 5)
        
        alerts_generated = []
        readings_analyzed = 0
        
        # In production, this would be a continuous loop
        # For demo, we simulate a few iterations
        iterations = min(duration_seconds // interval_seconds, 10)
        
        for _ in range(iterations):
            # Fetch latest telemetry (simulated)
            telemetry = await self._fetch_latest_telemetry(vehicle_id)
            
            if telemetry:
                analysis = await self._analyze_telemetry({
                    "vehicle_id": vehicle_id,
                    "telemetry": telemetry
                })
                readings_analyzed += 1
                
                if analysis.get("anomalies"):
                    alerts_generated.extend(analysis["anomalies"])
            
            await asyncio.sleep(interval_seconds)
        
        return {
            "vehicle_id": vehicle_id,
            "monitoring_duration": duration_seconds,
            "readings_analyzed": readings_analyzed,
            "alerts_generated": alerts_generated,
            "total_alerts": len(alerts_generated)
        }
    
    async def _fetch_latest_telemetry(self, vehicle_id: str) -> Optional[Dict]:
        """Fetch latest telemetry from backend"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.ml_service_url}/telemetry/{vehicle_id}/latest",
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None
    
    async def get_vehicle_summary(self, vehicle_id: str) -> Dict[str, Any]:
        """Get comprehensive summary for a vehicle"""
        historical = self._historical_cache.get(vehicle_id, [])
        
        if not historical:
            return {"error": "No data available for vehicle", "vehicle_id": vehicle_id}
        
        latest = historical[-1]
        analysis = await self._analyze_telemetry({
            "vehicle_id": vehicle_id,
            "telemetry": latest
        })
        
        return {
            "vehicle_id": vehicle_id,
            "total_readings": len(historical),
            "latest_analysis": analysis,
            "data_range": {
                "start": historical[0].get("timestamp"),
                "end": historical[-1].get("timestamp")
            }
        }


# Standalone execution for testing
if __name__ == "__main__":
    async def test():
        agent = DataAnalysisAgent()
        
        # Sample telemetry data
        sample_telemetry = {
            "engine_temp": 105,
            "battery_voltage": 11.8,
            "oil_pressure": 28,
            "tire_pressure_fl": 32,
            "tire_pressure_fr": 35,
            "tire_pressure_rl": 30,
            "tire_pressure_rr": 33,
            "brake_pad_thickness": 3.5,
            "coolant_level": 45,
            "fuel_efficiency": 25,
            "baseline_mpg": 30,
            "engine_health": 85,
            "transmission_health": 90,
            "battery_health": 70,
            "brake_health": 65,
            "suspension_health": 88
        }
        
        task = AgentTask(
            task_id="test-001",
            agent_type=AgentType.DATA_ANALYSIS,
            action=ActionType.ANALYZE,
            payload={
                "vehicle_id": "VH001",
                "telemetry": sample_telemetry
            }
        )
        
        result = await agent.execute(task)
        print(json.dumps(result.result, indent=2))
    
    asyncio.run(test())
