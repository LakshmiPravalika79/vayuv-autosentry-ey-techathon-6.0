"""
AutoSentry AI - Built-in Agent Framework Adapter
Lightweight custom orchestrator for agent management
"""

from typing import Dict, Any, List, Callable, Optional
import asyncio
import logging
import time
import uuid
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from .base_adapter import (
    BaseAgentAdapter, AgentType, AgentTask, AgentResult, ActionType
)

logger = logging.getLogger(__name__)


class BuiltinAgent:
    """Simple built-in agent implementation"""
    
    def __init__(
        self,
        agent_id: str,
        agent_type: AgentType,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.tools = tools or []
        self.config = config or {}
        self.state: Dict[str, Any] = {}
        self.history: List[Dict] = []
        
    def execute(self, task: AgentTask) -> AgentResult:
        """Execute a task"""
        start_time = time.time()
        
        try:
            # Log task start
            logger.info(f"Agent {self.agent_id} executing task: {task.task_type}")
            
            # Execute based on task type
            if task.task_type == "analyze":
                output = self._analyze(task.input_data)
            elif task.task_type == "diagnose":
                output = self._diagnose(task.input_data)
            elif task.task_type == "predict":
                output = self._predict(task.input_data)
            elif task.task_type == "schedule":
                output = self._schedule(task.input_data)
            elif task.task_type == "engage":
                output = self._engage(task.input_data)
            elif task.task_type == "feedback":
                output = self._feedback(task.input_data)
            elif task.task_type == "rca_capa":
                output = self._rca_capa(task.input_data)
            else:
                output = self._generic_task(task.input_data)
            
            execution_time = (time.time() - start_time) * 1000
            
            # Store in history
            self.history.append({
                "task_id": task.task_id,
                "task_type": task.task_type,
                "timestamp": datetime.now().isoformat(),
                "success": True
            })
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=self.agent_id,
                success=True,
                output=output,
                execution_time_ms=execution_time
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"Agent {self.agent_id} task failed: {e}")
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=self.agent_id,
                success=False,
                output={},
                error=str(e),
                execution_time_ms=execution_time
            )
    
    def _analyze(self, data: Dict) -> Dict:
        """Data analysis task"""
        telemetry = data.get("telemetry", {})
        
        # Simple analysis logic
        analysis = {
            "vehicle_id": telemetry.get("vehicle_id", "unknown"),
            "health_indicators": {
                "engine": "good" if telemetry.get("engine_temp", 90) < 100 else "warning",
                "oil": "good" if telemetry.get("oil_pressure", 40) > 30 else "warning",
                "battery": "good" if telemetry.get("battery_voltage", 12) > 11.5 else "warning",
                "brakes": "good" if telemetry.get("brake_pad_wear_avg", 0.5) > 0.2 else "warning"
            },
            "overall_status": "healthy",
            "recommendations": []
        }
        
        # Check for issues
        warnings = [k for k, v in analysis["health_indicators"].items() if v == "warning"]
        if warnings:
            analysis["overall_status"] = "needs_attention"
            analysis["recommendations"] = [f"Check {w} system" for w in warnings]
        
        return analysis
    
    def _diagnose(self, data: Dict) -> Dict:
        """Diagnosis task"""
        analysis = data.get("analysis", {})
        
        diagnosis = {
            "vehicle_id": analysis.get("vehicle_id", "unknown"),
            "diagnosis_code": f"DX-{uuid.uuid4().hex[:8].upper()}",
            "findings": [],
            "root_causes": [],
            "severity": "low",
            "recommended_actions": []
        }
        
        # Generate findings based on analysis
        health = analysis.get("health_indicators", {})
        
        if health.get("engine") == "warning":
            diagnosis["findings"].append("Engine temperature elevated")
            diagnosis["root_causes"].append("Possible cooling system issue")
            diagnosis["recommended_actions"].append("Inspect coolant levels and thermostat")
            diagnosis["severity"] = "high"
        
        if health.get("oil") == "warning":
            diagnosis["findings"].append("Oil pressure below threshold")
            diagnosis["root_causes"].append("Oil leak or pump degradation")
            diagnosis["recommended_actions"].append("Check oil level and inspect for leaks")
            diagnosis["severity"] = "high"
        
        if health.get("battery") == "warning":
            diagnosis["findings"].append("Battery voltage low")
            diagnosis["root_causes"].append("Battery aging or charging system issue")
            diagnosis["recommended_actions"].append("Test battery and alternator")
            diagnosis["severity"] = "medium"
        
        if health.get("brakes") == "warning":
            diagnosis["findings"].append("Brake pads worn")
            diagnosis["root_causes"].append("Normal wear")
            diagnosis["recommended_actions"].append("Replace brake pads")
            diagnosis["severity"] = "high"
        
        if not diagnosis["findings"]:
            diagnosis["findings"].append("No issues detected")
            diagnosis["severity"] = "low"
        
        return diagnosis
    
    def _predict(self, data: Dict) -> Dict:
        """Prediction task - would call ML service"""
        return {
            "prediction_id": f"PRED-{uuid.uuid4().hex[:8].upper()}",
            "status": "generated",
            "note": "Prediction would be fetched from ML service"
        }
    
    def _schedule(self, data: Dict) -> Dict:
        """Scheduling task"""
        diagnosis = data.get("diagnosis", {})
        customer = data.get("customer", {})
        
        appointment = {
            "appointment_id": f"APT-{uuid.uuid4().hex[:8].upper()}",
            "vehicle_id": diagnosis.get("vehicle_id", "unknown"),
            "customer_name": customer.get("name", "Unknown"),
            "service_type": "Diagnostic Service",
            "priority": diagnosis.get("severity", "low"),
            "status": "pending",
            "estimated_duration_hours": 2
        }
        
        # Set service type based on diagnosis
        if "brakes" in str(diagnosis.get("recommended_actions", [])).lower():
            appointment["service_type"] = "Brake Service"
        elif "engine" in str(diagnosis.get("findings", [])).lower():
            appointment["service_type"] = "Engine Diagnostics"
        elif "battery" in str(diagnosis.get("findings", [])).lower():
            appointment["service_type"] = "Electrical Service"
        
        return appointment
    
    def _engage(self, data: Dict) -> Dict:
        """Customer engagement task"""
        appointment = data.get("appointment", {})
        customer = data.get("customer", {})
        
        # Generate notification message
        service_type = appointment.get("service_type", "Service")
        priority = appointment.get("priority", "low")
        
        if priority == "high":
            urgency = "We recommend scheduling as soon as possible."
        else:
            urgency = "Please schedule at your earliest convenience."
        
        chat_message = f"""
Hello {customer.get('name', 'Valued Customer')},

Our predictive maintenance system has detected that your vehicle may need attention.

Service Recommended: {service_type}
Priority: {priority.title()}

{urgency}

Would you like to schedule a service appointment? 
Reply 'BOOK' to schedule or call us at 1-800-AUTOSENTRY.

Best regards,
AutoSentry AI Team
"""
        
        voice_script = f"""
Hello, this is AutoSentry AI calling about your vehicle.
Our system has detected that your vehicle may need {service_type.lower()}.
This is marked as {priority} priority.
{urgency}
To schedule an appointment, press 1.
To speak with a representative, press 2.
To hear this message again, press 3.
"""
        
        return {
            "engagement_id": f"ENG-{uuid.uuid4().hex[:8].upper()}",
            "customer_id": customer.get("id", "unknown"),
            "channel": "multi",
            "chat_message": chat_message.strip(),
            "voice_script": voice_script.strip(),
            "sms_message": f"AutoSentry Alert: Your vehicle needs {service_type}. Call 1-800-AUTOSENTRY to schedule.",
            "status": "prepared"
        }
    
    def _feedback(self, data: Dict) -> Dict:
        """Feedback collection task"""
        return {
            "feedback_id": f"FB-{uuid.uuid4().hex[:8].upper()}",
            "survey_link": f"https://autosentry.ai/feedback/{uuid.uuid4().hex[:8]}",
            "questions": [
                {"id": 1, "text": "How satisfied were you with the service?", "type": "rating"},
                {"id": 2, "text": "Was the issue resolved?", "type": "yes_no"},
                {"id": 3, "text": "How likely are you to recommend us?", "type": "nps"},
                {"id": 4, "text": "Any additional comments?", "type": "text"}
            ],
            "status": "sent"
        }
    
    def _rca_capa(self, data: Dict) -> Dict:
        """RCA/CAPA generation task"""
        diagnosis = data.get("diagnosis", {})
        vehicle_data = data.get("vehicle_data", {})
        
        return {
            "rca_id": f"RCA-{uuid.uuid4().hex[:8].upper()}",
            "capa_id": f"CAPA-{uuid.uuid4().hex[:8].upper()}",
            "component": diagnosis.get("findings", ["Unknown"])[0] if diagnosis.get("findings") else "Unknown",
            "root_cause": diagnosis.get("root_causes", ["Under investigation"])[0] if diagnosis.get("root_causes") else "Under investigation",
            "affected_vehicles": [vehicle_data.get("vehicle_id", "unknown")],
            "corrective_action": "Service and repair affected component",
            "preventive_action": "Implement predictive monitoring threshold",
            "status": "draft",
            "created_at": datetime.now().isoformat()
        }
    
    def _generic_task(self, data: Dict) -> Dict:
        """Generic task handler"""
        return {
            "task_executed": True,
            "input_received": list(data.keys()),
            "timestamp": datetime.now().isoformat()
        }


class BuiltinAdapter(BaseAgentAdapter):
    """Built-in lightweight agent framework adapter"""
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.executor = ThreadPoolExecutor(max_workers=10)
    
    def initialize(self) -> bool:
        """Initialize the built-in framework"""
        try:
            logger.info("Initializing built-in agent framework")
            self.is_initialized = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize: {e}")
            return False
    
    def create_agent(
        self,
        agent_type: AgentType,
        agent_id: str,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ) -> BuiltinAgent:
        """Create a built-in agent"""
        agent = BuiltinAgent(
            agent_id=agent_id,
            agent_type=agent_type,
            tools=tools,
            config=config
        )
        self.agents[agent_id] = agent
        logger.info(f"Created agent: {agent_id} ({agent_type.value})")
        return agent
    
    def execute_task(
        self,
        agent_id: str,
        task: AgentTask
    ) -> AgentResult:
        """Execute a task with the specified agent"""
        agent = self.agents.get(agent_id)
        
        if not agent:
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=False,
                output={},
                error=f"Agent {agent_id} not found"
            )
        
        return agent.execute(task)
    
    def orchestrate_workflow(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """Orchestrate a workflow of multiple tasks"""
        results = []
        workflow_config = workflow_config or {}
        
        # Sort tasks by priority
        sorted_tasks = sorted(tasks, key=lambda t: t.priority)
        
        # Execute tasks
        for task in sorted_tasks:
            # Find appropriate agent
            agent_id = workflow_config.get("agent_mapping", {}).get(task.task_type)
            
            if not agent_id:
                # Auto-select agent based on task type
                agent_id = self._select_agent_for_task(task)
            
            if agent_id:
                result = self.execute_task(agent_id, task)
                results.append(result)
                
                # Pass output to next task if chained
                if result.success and workflow_config.get("chain_outputs", True):
                    # Update subsequent task inputs with this result
                    for next_task in sorted_tasks:
                        if next_task.task_id != task.task_id:
                            next_task.input_data[f"{task.task_type}_result"] = result.output
            else:
                results.append(AgentResult(
                    task_id=task.task_id,
                    agent_id="none",
                    success=False,
                    output={},
                    error="No suitable agent found for task"
                ))
        
        return results
    
    def _select_agent_for_task(self, task: AgentTask) -> Optional[str]:
        """Auto-select appropriate agent for a task"""
        task_agent_mapping = {
            "analyze": AgentType.DATA_ANALYSIS,
            "diagnose": AgentType.DIAGNOSIS,
            "predict": AgentType.DATA_ANALYSIS,
            "schedule": AgentType.SCHEDULING,
            "engage": AgentType.CUSTOMER_ENGAGEMENT,
            "feedback": AgentType.FEEDBACK,
            "rca_capa": AgentType.RCA_CAPA
        }
        
        target_type = task_agent_mapping.get(task.task_type)
        
        if target_type:
            for agent_id, agent in self.agents.items():
                if agent.agent_type == target_type:
                    return agent_id
        
        # Fallback to master agent
        for agent_id, agent in self.agents.items():
            if agent.agent_type == AgentType.MASTER:
                return agent_id
        
        return None
    
    def shutdown(self):
        """Cleanup and shutdown"""
        super().shutdown()
        self.executor.shutdown(wait=True)
