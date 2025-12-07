"""
AutoSentry AI - Diagnosis Agent
Performs AI-powered diagnosis based on telemetry analysis
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import httpx

# Import shared types
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adapters import AgentType, ActionType, AgentTask, AgentResult


@dataclass
class DiagnosticResult:
    """Result of diagnostic analysis"""
    vehicle_id: str
    diagnosis_id: str
    timestamp: str
    primary_issue: str
    confidence: float
    affected_components: List[str]
    root_causes: List[Dict[str, Any]]
    severity: str  # minor, moderate, major, critical
    estimated_repair_time: str
    estimated_cost_range: Dict[str, float]
    dtc_codes: List[str]  # Diagnostic Trouble Codes
    recommended_actions: List[Dict[str, Any]]


@dataclass 
class ComponentDiagnosis:
    """Individual component diagnosis"""
    component: str
    status: str  # healthy, degraded, failing, failed
    wear_percentage: float
    remaining_life_km: Optional[int]
    issues: List[str]
    repair_urgency: str  # routine, soon, urgent, immediate


class DiagnosisAgent:
    """
    Diagnosis Agent - Worker Agent #2
    
    Responsibilities:
    - Perform AI-powered diagnosis based on telemetry analysis
    - Identify root causes of detected anomalies
    - Generate diagnostic trouble codes (DTCs)
    - Estimate repair costs and timeframes
    - Prioritize repairs based on safety and urgency
    - Provide repair recommendations
    """
    
    def __init__(self):
        self.agent_type = AgentType.DIAGNOSIS
        self.ml_service_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
        
        # Diagnostic knowledge base
        self.diagnostic_rules = self._load_diagnostic_rules()
        self.dtc_database = self._load_dtc_database()
        self.repair_estimates = self._load_repair_estimates()
        
    def _load_diagnostic_rules(self) -> Dict:
        """Load diagnostic rules for pattern matching"""
        return {
            "engine_overheating": {
                "symptoms": ["engine_temp_high", "coolant_low", "fan_malfunction"],
                "possible_causes": [
                    {"cause": "Coolant leak", "probability": 0.35},
                    {"cause": "Thermostat failure", "probability": 0.25},
                    {"cause": "Water pump failure", "probability": 0.20},
                    {"cause": "Radiator blockage", "probability": 0.15},
                    {"cause": "Head gasket failure", "probability": 0.05}
                ],
                "severity": "critical",
                "dtc_prefix": "P0"
            },
            "battery_issues": {
                "symptoms": ["battery_voltage_low", "slow_crank", "electrical_issues"],
                "possible_causes": [
                    {"cause": "Battery degradation", "probability": 0.40},
                    {"cause": "Alternator failure", "probability": 0.30},
                    {"cause": "Parasitic drain", "probability": 0.20},
                    {"cause": "Corroded terminals", "probability": 0.10}
                ],
                "severity": "major",
                "dtc_prefix": "P0"
            },
            "brake_system": {
                "symptoms": ["brake_pad_low", "brake_noise", "brake_vibration"],
                "possible_causes": [
                    {"cause": "Worn brake pads", "probability": 0.50},
                    {"cause": "Warped rotors", "probability": 0.25},
                    {"cause": "Caliper sticking", "probability": 0.15},
                    {"cause": "Brake fluid contamination", "probability": 0.10}
                ],
                "severity": "critical",
                "dtc_prefix": "C0"
            },
            "oil_system": {
                "symptoms": ["oil_pressure_low", "oil_level_low", "oil_quality_poor"],
                "possible_causes": [
                    {"cause": "Oil leak", "probability": 0.35},
                    {"cause": "Oil pump wear", "probability": 0.25},
                    {"cause": "Excessive consumption", "probability": 0.20},
                    {"cause": "Clogged oil filter", "probability": 0.15},
                    {"cause": "Engine wear", "probability": 0.05}
                ],
                "severity": "major",
                "dtc_prefix": "P0"
            },
            "transmission": {
                "symptoms": ["rough_shifting", "slipping", "delayed_engagement"],
                "possible_causes": [
                    {"cause": "Low transmission fluid", "probability": 0.30},
                    {"cause": "Worn clutch/bands", "probability": 0.25},
                    {"cause": "Solenoid failure", "probability": 0.20},
                    {"cause": "Torque converter issues", "probability": 0.15},
                    {"cause": "TCM malfunction", "probability": 0.10}
                ],
                "severity": "major",
                "dtc_prefix": "P07"
            },
            "suspension": {
                "symptoms": ["uneven_tire_wear", "pulling", "bouncing"],
                "possible_causes": [
                    {"cause": "Worn shocks/struts", "probability": 0.35},
                    {"cause": "Misalignment", "probability": 0.30},
                    {"cause": "Worn ball joints", "probability": 0.20},
                    {"cause": "Worn bushings", "probability": 0.15}
                ],
                "severity": "moderate",
                "dtc_prefix": "C0"
            },
            "fuel_system": {
                "symptoms": ["poor_fuel_economy", "rough_idle", "hard_start"],
                "possible_causes": [
                    {"cause": "Clogged fuel filter", "probability": 0.30},
                    {"cause": "Failing fuel pump", "probability": 0.25},
                    {"cause": "Dirty injectors", "probability": 0.25},
                    {"cause": "Fuel pressure regulator", "probability": 0.20}
                ],
                "severity": "moderate",
                "dtc_prefix": "P0"
            }
        }
    
    def _load_dtc_database(self) -> Dict:
        """Load DTC code database"""
        return {
            "P0115": {"description": "Engine Coolant Temperature Circuit Malfunction", "system": "cooling"},
            "P0116": {"description": "Engine Coolant Temperature Range/Performance", "system": "cooling"},
            "P0117": {"description": "Engine Coolant Temperature Low", "system": "cooling"},
            "P0118": {"description": "Engine Coolant Temperature High", "system": "cooling"},
            "P0217": {"description": "Engine Overheating Condition", "system": "cooling"},
            "P0562": {"description": "System Voltage Low", "system": "electrical"},
            "P0563": {"description": "System Voltage High", "system": "electrical"},
            "P0520": {"description": "Engine Oil Pressure Sensor Circuit", "system": "oil"},
            "P0521": {"description": "Engine Oil Pressure Range/Performance", "system": "oil"},
            "P0522": {"description": "Engine Oil Pressure Low", "system": "oil"},
            "P0171": {"description": "System Too Lean (Bank 1)", "system": "fuel"},
            "P0172": {"description": "System Too Rich (Bank 1)", "system": "fuel"},
            "P0300": {"description": "Random/Multiple Cylinder Misfire", "system": "ignition"},
            "P0700": {"description": "Transmission Control System Malfunction", "system": "transmission"},
            "P0715": {"description": "Input/Turbine Speed Sensor Circuit", "system": "transmission"},
            "C0035": {"description": "Left Front Wheel Speed Sensor Circuit", "system": "abs"},
            "C0040": {"description": "Right Front Wheel Speed Sensor Circuit", "system": "abs"},
            "C0265": {"description": "ABS/TCS Pump Motor Circuit", "system": "abs"},
        }
    
    def _load_repair_estimates(self) -> Dict:
        """Load repair cost and time estimates"""
        return {
            "Coolant leak": {"cost_min": 150, "cost_max": 500, "time": "1-3 hours"},
            "Thermostat failure": {"cost_min": 200, "cost_max": 400, "time": "1-2 hours"},
            "Water pump failure": {"cost_min": 400, "cost_max": 800, "time": "2-4 hours"},
            "Radiator blockage": {"cost_min": 300, "cost_max": 900, "time": "2-3 hours"},
            "Head gasket failure": {"cost_min": 1500, "cost_max": 3000, "time": "8-12 hours"},
            "Battery degradation": {"cost_min": 150, "cost_max": 350, "time": "30 mins"},
            "Alternator failure": {"cost_min": 400, "cost_max": 800, "time": "1-2 hours"},
            "Parasitic drain": {"cost_min": 100, "cost_max": 300, "time": "1-3 hours"},
            "Worn brake pads": {"cost_min": 150, "cost_max": 400, "time": "1-2 hours"},
            "Warped rotors": {"cost_min": 300, "cost_max": 700, "time": "2-3 hours"},
            "Caliper sticking": {"cost_min": 200, "cost_max": 500, "time": "1-2 hours"},
            "Oil leak": {"cost_min": 200, "cost_max": 1000, "time": "2-4 hours"},
            "Oil pump wear": {"cost_min": 500, "cost_max": 1500, "time": "4-6 hours"},
            "Low transmission fluid": {"cost_min": 100, "cost_max": 200, "time": "30 mins"},
            "Worn clutch/bands": {"cost_min": 1500, "cost_max": 3500, "time": "8-12 hours"},
            "Worn shocks/struts": {"cost_min": 400, "cost_max": 1000, "time": "2-4 hours"},
            "Misalignment": {"cost_min": 80, "cost_max": 200, "time": "1 hour"},
            "Clogged fuel filter": {"cost_min": 100, "cost_max": 250, "time": "30-60 mins"},
            "Failing fuel pump": {"cost_min": 500, "cost_max": 1200, "time": "2-4 hours"},
            "Dirty injectors": {"cost_min": 50, "cost_max": 150, "time": "30 mins"},
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute diagnosis task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.DIAGNOSE:
                result = await self._perform_diagnosis(payload)
            elif action == ActionType.ANALYZE:
                result = await self._analyze_component(payload)
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
    
    async def _perform_diagnosis(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Perform comprehensive vehicle diagnosis"""
        vehicle_id = payload.get("vehicle_id")
        analysis_data = payload.get("analysis_data", {})
        anomalies = analysis_data.get("anomalies", [])
        patterns = analysis_data.get("patterns_detected", [])
        health_score = analysis_data.get("health_score", 100)
        
        if not vehicle_id:
            return {"error": "Missing vehicle_id"}
        
        # Generate diagnosis ID
        diagnosis_id = f"DIAG-{vehicle_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        
        # Identify primary issue from anomalies
        primary_issue, severity = self._identify_primary_issue(anomalies, patterns)
        
        # Get ML prediction for additional context
        ml_prediction = await self._get_ml_prediction(vehicle_id, analysis_data.get("telemetry", {}))
        
        # Determine root causes
        root_causes = self._determine_root_causes(primary_issue, anomalies, patterns)
        
        # Generate DTCs
        dtc_codes = self._generate_dtc_codes(primary_issue, anomalies)
        
        # Identify affected components
        affected_components = self._identify_affected_components(anomalies, patterns)
        
        # Calculate repair estimates
        repair_estimates = self._calculate_repair_estimates(root_causes)
        
        # Generate recommended actions
        recommended_actions = self._generate_recommended_actions(
            primary_issue, root_causes, severity, affected_components
        )
        
        # Perform component-level diagnosis
        component_diagnoses = await self._diagnose_components(
            vehicle_id, analysis_data.get("telemetry", {})
        )
        
        result = DiagnosticResult(
            vehicle_id=vehicle_id,
            diagnosis_id=diagnosis_id,
            timestamp=datetime.utcnow().isoformat(),
            primary_issue=primary_issue,
            confidence=self._calculate_confidence(anomalies, ml_prediction),
            affected_components=affected_components,
            root_causes=root_causes,
            severity=severity,
            estimated_repair_time=repair_estimates.get("time", "To be determined"),
            estimated_cost_range=repair_estimates.get("cost", {"min": 0, "max": 0}),
            dtc_codes=dtc_codes,
            recommended_actions=recommended_actions
        )
        
        return {
            "diagnosis_id": result.diagnosis_id,
            "vehicle_id": result.vehicle_id,
            "timestamp": result.timestamp,
            "primary_issue": result.primary_issue,
            "confidence": result.confidence,
            "severity": result.severity,
            "affected_components": result.affected_components,
            "root_causes": result.root_causes,
            "dtc_codes": result.dtc_codes,
            "estimated_repair_time": result.estimated_repair_time,
            "estimated_cost_range": result.estimated_cost_range,
            "recommended_actions": result.recommended_actions,
            "component_diagnoses": component_diagnoses,
            "ml_prediction": ml_prediction,
            "requires_customer_notification": severity in ["major", "critical"],
            "requires_scheduling": len(recommended_actions) > 0,
            "scheduling_urgency": self._determine_scheduling_urgency(severity, primary_issue)
        }
    
    def _identify_primary_issue(self, anomalies: List[Dict], patterns: List[Dict]) -> tuple:
        """Identify the primary issue from anomalies and patterns"""
        if not anomalies and not patterns:
            return "No significant issues detected", "minor"
        
        # Prioritize by severity
        severity_order = {"critical": 4, "high": 3, "warning": 2, "medium": 2, "info": 1, "low": 1}
        
        all_issues = []
        for anomaly in anomalies:
            all_issues.append({
                "description": anomaly.get("message", anomaly.get("type", "Unknown")),
                "severity": anomaly.get("severity", "info"),
                "type": anomaly.get("type", "unknown")
            })
        
        for pattern in patterns:
            all_issues.append({
                "description": pattern.get("description", pattern.get("type", "Unknown pattern")),
                "severity": pattern.get("severity", "medium"),
                "type": pattern.get("type", "unknown")
            })
        
        if not all_issues:
            return "No significant issues detected", "minor"
        
        # Sort by severity
        all_issues.sort(key=lambda x: severity_order.get(x["severity"], 0), reverse=True)
        
        primary = all_issues[0]
        severity_map = {"critical": "critical", "high": "major", "warning": "moderate", "medium": "moderate", "info": "minor", "low": "minor"}
        
        return primary["description"], severity_map.get(primary["severity"], "minor")
    
    async def _get_ml_prediction(self, vehicle_id: str, telemetry: Dict) -> Optional[Dict]:
        """Get ML prediction from ML service"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.ml_service_url}/predict",
                    json={"vehicle_id": vehicle_id, **telemetry},
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None
    
    def _determine_root_causes(self, primary_issue: str, anomalies: List[Dict], patterns: List[Dict]) -> List[Dict]:
        """Determine potential root causes"""
        root_causes = []
        
        # Match against diagnostic rules
        issue_keywords = primary_issue.lower()
        
        for rule_name, rule_data in self.diagnostic_rules.items():
            if any(keyword in issue_keywords for keyword in rule_name.replace("_", " ").split()):
                for cause in rule_data["possible_causes"]:
                    root_causes.append({
                        "cause": cause["cause"],
                        "probability": cause["probability"],
                        "category": rule_name,
                        "investigation_steps": self._get_investigation_steps(cause["cause"])
                    })
        
        # Add causes from pattern analysis
        for pattern in patterns:
            pattern_type = pattern.get("type", "")
            if "correlation" in pattern_type:
                root_causes.append({
                    "cause": "Sensor correlation issue",
                    "probability": 0.15,
                    "category": "sensor_data",
                    "investigation_steps": ["Verify sensor calibration", "Check wiring connections"]
                })
        
        # Sort by probability
        root_causes.sort(key=lambda x: x["probability"], reverse=True)
        
        return root_causes[:5]  # Return top 5 causes
    
    def _get_investigation_steps(self, cause: str) -> List[str]:
        """Get investigation steps for a cause"""
        steps_map = {
            "Coolant leak": [
                "Perform pressure test on cooling system",
                "Inspect hoses, clamps, and connections",
                "Check radiator for visible damage",
                "Inspect water pump weep hole"
            ],
            "Battery degradation": [
                "Perform battery load test",
                "Check battery age and condition",
                "Test cold cranking amps",
                "Inspect for physical damage"
            ],
            "Worn brake pads": [
                "Visual inspection of brake pads",
                "Measure pad thickness",
                "Check for uneven wear",
                "Inspect rotors for damage"
            ],
            "Oil leak": [
                "Inspect valve cover gasket",
                "Check oil pan gasket",
                "Inspect front and rear seals",
                "Use UV dye if leak location unclear"
            ]
        }
        return steps_map.get(cause, ["Perform visual inspection", "Run diagnostic scan", "Test component"])
    
    def _generate_dtc_codes(self, primary_issue: str, anomalies: List[Dict]) -> List[str]:
        """Generate relevant DTC codes"""
        dtc_codes = []
        
        issue_lower = primary_issue.lower()
        
        if "engine" in issue_lower and ("temp" in issue_lower or "heat" in issue_lower or "cool" in issue_lower):
            dtc_codes.extend(["P0217", "P0115", "P0118"])
        
        if "battery" in issue_lower or "voltage" in issue_lower:
            dtc_codes.extend(["P0562", "P0563"])
        
        if "oil" in issue_lower and "pressure" in issue_lower:
            dtc_codes.extend(["P0520", "P0521", "P0522"])
        
        if "brake" in issue_lower:
            dtc_codes.extend(["C0035", "C0040"])
        
        if "transmission" in issue_lower:
            dtc_codes.extend(["P0700", "P0715"])
        
        # Add codes from anomaly types
        for anomaly in anomalies:
            anomaly_type = anomaly.get("type", "").lower()
            if "fuel" in anomaly_type:
                dtc_codes.extend(["P0171", "P0172"])
            if "misfire" in anomaly_type:
                dtc_codes.append("P0300")
        
        return list(set(dtc_codes))[:6]  # Return unique codes, max 6
    
    def _identify_affected_components(self, anomalies: List[Dict], patterns: List[Dict]) -> List[str]:
        """Identify affected vehicle components"""
        components = set()
        
        component_keywords = {
            "engine": ["engine", "motor", "cylinder", "piston"],
            "cooling_system": ["coolant", "radiator", "thermostat", "water_pump", "temp"],
            "electrical_system": ["battery", "alternator", "voltage", "electrical"],
            "brake_system": ["brake", "rotor", "caliper", "pad"],
            "oil_system": ["oil", "lubrication"],
            "transmission": ["transmission", "gearbox", "clutch"],
            "fuel_system": ["fuel", "injector", "pump"],
            "suspension": ["suspension", "shock", "strut", "alignment"],
            "tires": ["tire", "pressure", "wheel"]
        }
        
        all_text = " ".join([
            str(a.get("type", "")) + str(a.get("message", "")) for a in anomalies
        ] + [
            str(p.get("type", "")) + str(p.get("description", "")) for p in patterns
        ]).lower()
        
        for component, keywords in component_keywords.items():
            if any(kw in all_text for kw in keywords):
                components.add(component)
        
        return list(components) if components else ["general_maintenance"]
    
    def _calculate_repair_estimates(self, root_causes: List[Dict]) -> Dict:
        """Calculate repair cost and time estimates"""
        if not root_causes:
            return {"cost": {"min": 100, "max": 300}, "time": "1-2 hours"}
        
        total_cost_min = 0
        total_cost_max = 0
        max_time_hours = 0
        
        for cause in root_causes[:3]:  # Consider top 3 causes
            cause_name = cause.get("cause", "")
            estimates = self.repair_estimates.get(cause_name, {"cost_min": 100, "cost_max": 300, "time": "1-2 hours"})
            
            total_cost_min += estimates["cost_min"]
            total_cost_max += estimates["cost_max"]
            
            # Parse time estimate
            time_str = estimates["time"]
            if "-" in time_str:
                parts = time_str.replace(" hours", "").replace(" hour", "").replace(" mins", "").split("-")
                try:
                    max_time_hours = max(max_time_hours, float(parts[1]))
                except:
                    max_time_hours = max(max_time_hours, 2)
        
        return {
            "cost": {"min": total_cost_min, "max": total_cost_max, "currency": "USD"},
            "time": f"{max(1, int(max_time_hours))}-{int(max_time_hours * 1.5)} hours"
        }
    
    def _generate_recommended_actions(
        self, primary_issue: str, root_causes: List[Dict], 
        severity: str, affected_components: List[str]
    ) -> List[Dict]:
        """Generate recommended repair/maintenance actions"""
        actions = []
        
        # Priority based on severity
        priority_map = {"critical": 1, "major": 2, "moderate": 3, "minor": 4}
        base_priority = priority_map.get(severity, 3)
        
        # Add actions for root causes
        for idx, cause in enumerate(root_causes[:3]):
            cause_name = cause.get("cause", "")
            estimates = self.repair_estimates.get(cause_name, {})
            
            actions.append({
                "action": f"Address: {cause_name}",
                "priority": min(base_priority + idx, 5),
                "type": "repair",
                "estimated_cost": estimates.get("cost_max", 200),
                "estimated_time": estimates.get("time", "TBD"),
                "requires_parts": self._check_parts_required(cause_name),
                "can_diy": self._check_diy_possible(cause_name),
                "investigation_steps": cause.get("investigation_steps", [])
            })
        
        # Add preventive maintenance if severity is not critical
        if severity in ["minor", "moderate"]:
            actions.append({
                "action": "Schedule comprehensive inspection",
                "priority": 4,
                "type": "inspection",
                "estimated_cost": 100,
                "estimated_time": "1-2 hours",
                "requires_parts": False,
                "can_diy": False
            })
        
        # Add immediate actions for critical issues
        if severity == "critical":
            actions.insert(0, {
                "action": "STOP DRIVING - Schedule immediate service",
                "priority": 1,
                "type": "urgent",
                "estimated_cost": 0,
                "estimated_time": "ASAP",
                "requires_parts": False,
                "can_diy": False,
                "safety_critical": True
            })
        
        return actions
    
    def _check_parts_required(self, cause: str) -> bool:
        """Check if parts are likely required for repair"""
        parts_required = [
            "failure", "worn", "degradation", "damage", "leak",
            "pump", "gasket", "pad", "filter", "belt"
        ]
        return any(part in cause.lower() for part in parts_required)
    
    def _check_diy_possible(self, cause: str) -> bool:
        """Check if repair can potentially be DIY"""
        diy_possible = ["filter", "fluid", "terminal", "top up", "injector cleaning"]
        return any(diy in cause.lower() for diy in diy_possible)
    
    def _calculate_confidence(self, anomalies: List[Dict], ml_prediction: Optional[Dict]) -> float:
        """Calculate confidence score for diagnosis"""
        base_confidence = 0.7
        
        # More anomalies = more data = higher confidence
        anomaly_boost = min(len(anomalies) * 0.05, 0.15)
        
        # ML prediction agreement boosts confidence
        ml_boost = 0
        if ml_prediction and ml_prediction.get("confidence"):
            ml_boost = ml_prediction["confidence"] * 0.1
        
        return min(base_confidence + anomaly_boost + ml_boost, 0.95)
    
    def _determine_scheduling_urgency(self, severity: str, primary_issue: str) -> str:
        """Determine scheduling urgency"""
        if severity == "critical" or "stop driving" in primary_issue.lower():
            return "immediate"
        elif severity == "major":
            return "within_24_hours"
        elif severity == "moderate":
            return "within_week"
        else:
            return "next_available"
    
    async def _diagnose_components(self, vehicle_id: str, telemetry: Dict) -> List[Dict]:
        """Perform component-level diagnosis"""
        components = []
        
        # Engine diagnosis
        engine_temp = telemetry.get("engine_temp", 90)
        engine_health = telemetry.get("engine_health", 100)
        components.append({
            "component": "Engine",
            "status": self._get_component_status(engine_health),
            "health_percentage": engine_health,
            "issues": self._get_engine_issues(engine_temp, engine_health)
        })
        
        # Battery diagnosis  
        battery_voltage = telemetry.get("battery_voltage", 12.6)
        battery_health = telemetry.get("battery_health", 100)
        components.append({
            "component": "Battery",
            "status": self._get_component_status(battery_health),
            "health_percentage": battery_health,
            "voltage": battery_voltage,
            "issues": self._get_battery_issues(battery_voltage, battery_health)
        })
        
        # Brake diagnosis
        brake_pad = telemetry.get("brake_pad_thickness", 10)
        brake_health = telemetry.get("brake_health", 100)
        remaining_km = int((brake_pad / 10) * 50000) if brake_pad > 0 else 0
        components.append({
            "component": "Brakes",
            "status": self._get_component_status(brake_health),
            "health_percentage": brake_health,
            "pad_thickness_mm": brake_pad,
            "estimated_remaining_km": remaining_km,
            "issues": self._get_brake_issues(brake_pad, brake_health)
        })
        
        # Transmission diagnosis
        trans_health = telemetry.get("transmission_health", 100)
        components.append({
            "component": "Transmission",
            "status": self._get_component_status(trans_health),
            "health_percentage": trans_health,
            "issues": []
        })
        
        return components
    
    def _get_component_status(self, health: float) -> str:
        """Get component status from health percentage"""
        if health >= 80:
            return "healthy"
        elif health >= 60:
            return "degraded"
        elif health >= 30:
            return "failing"
        else:
            return "failed"
    
    def _get_engine_issues(self, temp: float, health: float) -> List[str]:
        """Get engine-specific issues"""
        issues = []
        if temp > 100:
            issues.append("Elevated operating temperature")
        if health < 70:
            issues.append("Engine wear detected")
        return issues
    
    def _get_battery_issues(self, voltage: float, health: float) -> List[str]:
        """Get battery-specific issues"""
        issues = []
        if voltage < 12.0:
            issues.append("Low voltage - battery may need replacement")
        if health < 70:
            issues.append("Battery degradation detected")
        return issues
    
    def _get_brake_issues(self, pad_thickness: float, health: float) -> List[str]:
        """Get brake-specific issues"""
        issues = []
        if pad_thickness < 3:
            issues.append("Brake pads critically worn")
        elif pad_thickness < 5:
            issues.append("Brake pads wearing - replacement recommended")
        if health < 60:
            issues.append("Brake system degradation")
        return issues
    
    async def _analyze_component(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a specific component"""
        vehicle_id = payload.get("vehicle_id")
        component = payload.get("component")
        telemetry = payload.get("telemetry", {})
        
        component_diagnoses = await self._diagnose_components(vehicle_id, telemetry)
        
        for diag in component_diagnoses:
            if diag["component"].lower() == component.lower():
                return diag
        
        return {"error": f"Component {component} not found"}


# Standalone execution for testing
if __name__ == "__main__":
    async def test():
        agent = DiagnosisAgent()
        
        analysis_data = {
            "anomalies": [
                {"type": "engine_temp_warning", "severity": "warning", "message": "Engine temperature elevated at 105°C"},
                {"type": "brake_warning", "severity": "warning", "message": "Brake pads at 3.5mm"}
            ],
            "patterns_detected": [
                {"type": "temperature_correlation", "severity": "medium", "description": "Engine and coolant temp divergence"}
            ],
            "health_score": 65,
            "telemetry": {
                "engine_temp": 105,
                "battery_voltage": 12.2,
                "brake_pad_thickness": 3.5,
                "engine_health": 75,
                "battery_health": 80,
                "brake_health": 60,
                "transmission_health": 90
            }
        }
        
        task = AgentTask(
            task_id="test-diag-001",
            agent_type=AgentType.DIAGNOSIS,
            action=ActionType.DIAGNOSE,
            payload={
                "vehicle_id": "VH001",
                "analysis_data": analysis_data
            }
        )
        
        result = await agent.execute(task)
        print(json.dumps(result.result, indent=2))
    
    asyncio.run(test())
