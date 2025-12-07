"""
AutoSentry AI - Master Agent
Main orchestrator for coordinating all worker agents
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid
import httpx

from adapters import (
    BaseAgentAdapter,
    AgentType,
    AgentTask,
    AgentResult,
    BuiltinAdapter,
    LangGraphAdapter,
    CrewAIAdapter,
    AutoGenAdapter
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MasterAgent:
    """
    Master Agent - Main orchestrator for AutoSentry AI
    
    Responsibilities:
    - Monitor vehicle health data streams in real time
    - Coordinate all Worker Agents
    - Route all actions through UEBA for anomaly detection
    - Initiate and end customer interaction workflows
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.agent_id = "master-001"
        self.adapter: BaseAgentAdapter = None
        self.worker_agents: Dict[str, str] = {}  # agent_type -> agent_id mapping
        
        # Service URLs
        self.ml_service_url = os.getenv("ML_SERVICE_URL", "http://localhost:5000")
        self.ueba_service_url = os.getenv("UEBA_SERVICE_URL", "http://localhost:5001")
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:4000")
        
        # HTTP client
        self.http_client = httpx.AsyncClient(timeout=30.0)
        
        logger.info(f"Master Agent initialized: {self.agent_id}")
    
    def initialize(self) -> bool:
        """Initialize the agent framework based on configuration"""
        framework = os.getenv("AGENT_FRAMEWORK", "builtin").lower()
        
        logger.info(f"Initializing agent framework: {framework}")
        
        # Select adapter based on framework
        if framework == "langgraph":
            self.adapter = LangGraphAdapter(self.config)
        elif framework == "crewai":
            self.adapter = CrewAIAdapter(self.config)
        elif framework == "autogen":
            self.adapter = AutoGenAdapter(self.config)
        else:
            self.adapter = BuiltinAdapter(self.config)
        
        # Initialize adapter
        if not self.adapter.initialize():
            logger.error("Failed to initialize agent framework")
            return False
        
        # Create worker agents
        self._create_worker_agents()
        
        logger.info(f"Master Agent ready with {len(self.worker_agents)} workers")
        return True
    
    def _create_worker_agents(self):
        """Create all worker agents"""
        worker_configs = [
            (AgentType.DATA_ANALYSIS, "data-analysis-001"),
            (AgentType.DIAGNOSIS, "diagnosis-001"),
            (AgentType.CUSTOMER_ENGAGEMENT, "customer-engagement-001"),
            (AgentType.SCHEDULING, "scheduling-001"),
            (AgentType.FEEDBACK, "feedback-001"),
            (AgentType.RCA_CAPA, "rca-capa-001")
        ]
        
        for agent_type, agent_id in worker_configs:
            self.adapter.create_agent(agent_type, agent_id)
            self.worker_agents[agent_type.value] = agent_id
            logger.info(f"Created worker agent: {agent_id}")
    
    async def _report_to_ueba(self, action_data: Dict[str, Any]) -> Dict[str, Any]:
        """Report agent action to UEBA for anomaly detection"""
        try:
            response = await self.http_client.post(
                f"{self.ueba_service_url}/score",
                json={"agent_action": action_data}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"UEBA response: {response.status_code}")
                return {"alert": False, "score": 0}
                
        except Exception as e:
            logger.error(f"Failed to report to UEBA: {e}")
            return {"alert": False, "score": 0, "error": str(e)}
    
    async def _get_ml_prediction(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """Get prediction from ML service"""
        try:
            response = await self.http_client.post(
                f"{self.ml_service_url}/predict",
                json=telemetry
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"ML service response: {response.status_code}")
                return {}
                
        except Exception as e:
            logger.error(f"Failed to get ML prediction: {e}")
            return {"error": str(e)}
    
    async def process_telemetry(self, telemetry: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process incoming vehicle telemetry data
        
        This is the main entry point for real-time vehicle monitoring.
        """
        vehicle_id = telemetry.get("vehicle_id", "unknown")
        workflow_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
        
        logger.info(f"Processing telemetry for vehicle {vehicle_id} - Workflow: {workflow_id}")
        
        results = {
            "workflow_id": workflow_id,
            "vehicle_id": vehicle_id,
            "timestamp": datetime.now().isoformat(),
            "stages": {}
        }
        
        try:
            # Stage 1: Report to UEBA
            ueba_result = await self._report_to_ueba({
                "agent_id": self.agent_id,
                "agent_type": "master",
                "action_type": "query",
                "target_entity": "telemetry",
                "vehicle_id": vehicle_id,
                "payload_size": len(json.dumps(telemetry)),
                "response_time_ms": 0,
                "success": True
            })
            results["stages"]["ueba_check"] = ueba_result
            
            if ueba_result.get("alert"):
                logger.warning(f"UEBA alert triggered for workflow {workflow_id}")
            
            # Stage 2: Data Analysis
            analysis_task = AgentTask(
                task_id=f"{workflow_id}-analysis",
                task_type="analyze",
                description=f"Analyze telemetry data for vehicle {vehicle_id}",
                input_data={"telemetry": telemetry},
                priority=1
            )
            
            analysis_result = self.adapter.execute_task(
                self.worker_agents["data_analysis"],
                analysis_task
            )
            results["stages"]["analysis"] = {
                "success": analysis_result.success,
                "output": analysis_result.output
            }
            
            # Stage 3: ML Prediction
            prediction = await self._get_ml_prediction(telemetry)
            results["stages"]["prediction"] = prediction
            
            # Stage 4: Diagnosis (if issues detected)
            needs_diagnosis = (
                prediction.get("failure_probability", 0) > 0.3 or
                analysis_result.output.get("overall_status") == "needs_attention"
            )
            
            if needs_diagnosis:
                diagnosis_task = AgentTask(
                    task_id=f"{workflow_id}-diagnosis",
                    task_type="diagnose",
                    description=f"Diagnose issues for vehicle {vehicle_id}",
                    input_data={
                        "analysis": analysis_result.output,
                        "prediction": prediction
                    },
                    priority=1
                )
                
                diagnosis_result = self.adapter.execute_task(
                    self.worker_agents["diagnosis"],
                    diagnosis_task
                )
                results["stages"]["diagnosis"] = {
                    "success": diagnosis_result.success,
                    "output": diagnosis_result.output
                }
                
                # Stage 5: Schedule service if needed
                severity = diagnosis_result.output.get("severity", "low")
                if severity in ["high", "critical", "medium"]:
                    await self._initiate_service_workflow(
                        workflow_id, vehicle_id, telemetry, 
                        diagnosis_result.output, results
                    )
            
            results["status"] = "completed"
            results["requires_action"] = needs_diagnosis
            
        except Exception as e:
            logger.error(f"Workflow {workflow_id} failed: {e}")
            results["status"] = "failed"
            results["error"] = str(e)
        
        return results
    
    async def _initiate_service_workflow(
        self,
        workflow_id: str,
        vehicle_id: str,
        telemetry: Dict[str, Any],
        diagnosis: Dict[str, Any],
        results: Dict[str, Any]
    ):
        """Initiate customer engagement and scheduling workflow"""
        
        # Get customer info (mock)
        customer = {
            "id": f"CUST-{vehicle_id}",
            "name": "Valued Customer",
            "email": "customer@example.com",
            "phone": "+1-555-0100"
        }
        
        # Stage: Customer Engagement
        engage_task = AgentTask(
            task_id=f"{workflow_id}-engage",
            task_type="engage",
            description=f"Engage customer about vehicle {vehicle_id} maintenance",
            input_data={
                "appointment": {"service_type": diagnosis.get("findings", ["Service"])[0]},
                "customer": customer,
                "diagnosis": diagnosis
            },
            priority=2
        )
        
        engage_result = self.adapter.execute_task(
            self.worker_agents["customer_engagement"],
            engage_task
        )
        results["stages"]["engagement"] = {
            "success": engage_result.success,
            "output": engage_result.output
        }
        
        # Stage: Scheduling
        schedule_task = AgentTask(
            task_id=f"{workflow_id}-schedule",
            task_type="schedule",
            description=f"Schedule service appointment for vehicle {vehicle_id}",
            input_data={
                "diagnosis": diagnosis,
                "customer": customer,
                "vehicle_id": vehicle_id
            },
            priority=2
        )
        
        schedule_result = self.adapter.execute_task(
            self.worker_agents["scheduling"],
            schedule_task
        )
        results["stages"]["scheduling"] = {
            "success": schedule_result.success,
            "output": schedule_result.output
        }
        
        # Report scheduling action to UEBA
        await self._report_to_ueba({
            "agent_id": self.worker_agents["scheduling"],
            "agent_type": "scheduling",
            "action_type": "schedule",
            "target_entity": "appointment",
            "vehicle_id": vehicle_id,
            "payload_size": len(json.dumps(schedule_result.output)),
            "response_time_ms": schedule_result.execution_time_ms,
            "success": schedule_result.success
        })
    
    async def generate_rca_capa(
        self,
        vehicle_id: str,
        diagnosis: Dict[str, Any],
        feedback: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate RCA/CAPA report for manufacturing insights"""
        
        task = AgentTask(
            task_id=f"RCA-{uuid.uuid4().hex[:8].upper()}",
            task_type="rca_capa",
            description=f"Generate RCA/CAPA for vehicle {vehicle_id}",
            input_data={
                "diagnosis": diagnosis,
                "vehicle_data": {"vehicle_id": vehicle_id},
                "feedback": feedback or {}
            },
            priority=3
        )
        
        result = self.adapter.execute_task(
            self.worker_agents["rca_capa"],
            task
        )
        
        # Report to UEBA
        await self._report_to_ueba({
            "agent_id": self.worker_agents["rca_capa"],
            "agent_type": "rca_capa",
            "action_type": "generate",
            "target_entity": "capa_report",
            "vehicle_id": vehicle_id,
            "payload_size": len(json.dumps(result.output)),
            "response_time_ms": result.execution_time_ms,
            "success": result.success
        })
        
        return {
            "success": result.success,
            "rca_capa": result.output
        }
    
    async def collect_feedback(
        self,
        appointment_id: str,
        customer_id: str
    ) -> Dict[str, Any]:
        """Initiate feedback collection workflow"""
        
        task = AgentTask(
            task_id=f"FB-{uuid.uuid4().hex[:8].upper()}",
            task_type="feedback",
            description=f"Collect feedback for appointment {appointment_id}",
            input_data={
                "appointment_id": appointment_id,
                "customer_id": customer_id
            },
            priority=4
        )
        
        result = self.adapter.execute_task(
            self.worker_agents["feedback"],
            task
        )
        
        return {
            "success": result.success,
            "feedback": result.output
        }
    
    async def shutdown(self):
        """Cleanup and shutdown"""
        logger.info("Shutting down Master Agent")
        
        if self.adapter:
            self.adapter.shutdown()
        
        await self.http_client.aclose()


# Main entry point for testing
async def main():
    """Main function for testing the master agent"""
    
    # Sample telemetry data
    sample_telemetry = {
        "vehicle_id": "VH007",
        "engine_temp": 118.5,
        "oil_pressure": 26.2,
        "battery_voltage": 10.5,
        "fuel_level": 12.8,
        "tire_pressure_fl": 25.5,
        "tire_pressure_fr": 25.5,
        "tire_pressure_rl": 25.5,
        "tire_pressure_rr": 25.5,
        "brake_pad_wear_fl": 0.08,
        "brake_pad_wear_fr": 0.10,
        "brake_pad_wear_rl": 0.15,
        "brake_pad_wear_rr": 0.12,
        "odometer": 155500,
        "speed": 32,
        "rpm": 1750,
        "coolant_level": 0.40,
        "transmission_temp": 128.5,
        "check_engine_light": True
    }
    
    # Initialize master agent
    master = MasterAgent()
    
    if not master.initialize():
        logger.error("Failed to initialize Master Agent")
        return
    
    # Process telemetry
    result = await master.process_telemetry(sample_telemetry)
    
    print("\n" + "=" * 60)
    print("WORKFLOW RESULT")
    print("=" * 60)
    print(json.dumps(result, indent=2))
    
    # Cleanup
    await master.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
