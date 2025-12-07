"""
AutoSentry AI - CrewAI Agent Framework Adapter
Adapter for CrewAI multi-agent collaboration framework
"""

from typing import Dict, Any, List, Callable, Optional
import logging
import time
import uuid
from datetime import datetime

from .base_adapter import (
    BaseAgentAdapter, AgentType, AgentTask, AgentResult
)

logger = logging.getLogger(__name__)

# Optional CrewAI imports
CREWAI_AVAILABLE = False
try:
    from crewai import Agent, Task, Crew, Process
    CREWAI_AVAILABLE = True
except ImportError:
    logger.warning("CrewAI not installed. Install with: pip install crewai")


class CrewAIAdapter(BaseAgentAdapter):
    """
    CrewAI agent framework adapter.
    
    Uses CrewAI for multi-agent collaboration and task delegation.
    Enable by setting AGENT_FRAMEWORK=crewai in environment.
    
    Requirements:
        pip install crewai crewai-tools
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.crews: Dict[str, Any] = {}
        self.crewai_agents: Dict[str, Any] = {}
    
    def initialize(self) -> bool:
        """Initialize CrewAI framework"""
        if not CREWAI_AVAILABLE:
            logger.error("CrewAI is not installed")
            return False
        
        try:
            logger.info("CrewAI framework initialized")
            self.is_initialized = True
            return True
        except Exception as e:
            logger.error(f"Failed to initialize CrewAI: {e}")
            return False
    
    def create_agent(
        self,
        agent_type: AgentType,
        agent_id: str,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ) -> Any:
        """Create a CrewAI agent"""
        if not CREWAI_AVAILABLE:
            logger.error("CrewAI not available")
            return None
        
        config = config or {}
        
        # Define agent based on type
        agent_configs = {
            AgentType.MASTER: {
                "role": "Master Orchestrator",
                "goal": "Coordinate all vehicle maintenance activities and ensure optimal system operation",
                "backstory": "Expert AI orchestrator with deep knowledge of automotive systems and predictive maintenance"
            },
            AgentType.DATA_ANALYSIS: {
                "role": "Data Analysis Specialist",
                "goal": "Analyze vehicle telemetry data to identify patterns and anomalies",
                "backstory": "Expert data scientist specialized in automotive sensor data analysis"
            },
            AgentType.DIAGNOSIS: {
                "role": "Vehicle Diagnostics Expert",
                "goal": "Diagnose vehicle issues and determine root causes",
                "backstory": "Master automotive technician with decades of experience in vehicle diagnostics"
            },
            AgentType.CUSTOMER_ENGAGEMENT: {
                "role": "Customer Success Manager",
                "goal": "Engage with customers and ensure excellent service experience",
                "backstory": "Expert in customer communication with deep empathy and automotive knowledge"
            },
            AgentType.SCHEDULING: {
                "role": "Service Scheduling Coordinator",
                "goal": "Optimize service appointment scheduling for customer convenience",
                "backstory": "Operations expert skilled in resource allocation and scheduling optimization"
            },
            AgentType.FEEDBACK: {
                "role": "Customer Feedback Analyst",
                "goal": "Collect and analyze customer feedback to improve service quality",
                "backstory": "Customer experience specialist focused on continuous improvement"
            },
            AgentType.RCA_CAPA: {
                "role": "Quality Engineer",
                "goal": "Perform root cause analysis and implement corrective actions",
                "backstory": "Six Sigma certified quality engineer with automotive manufacturing expertise"
            }
        }
        
        agent_config = agent_configs.get(agent_type, {
            "role": "General Agent",
            "goal": "Assist with vehicle maintenance tasks",
            "backstory": "Versatile AI assistant"
        })
        
        try:
            crewai_agent = Agent(
                role=agent_config["role"],
                goal=agent_config["goal"],
                backstory=agent_config["backstory"],
                verbose=config.get("verbose", True),
                allow_delegation=config.get("allow_delegation", agent_type == AgentType.MASTER)
            )
            
            self.crewai_agents[agent_id] = crewai_agent
            self.agents[agent_id] = {
                "crewai_agent": crewai_agent,
                "type": agent_type,
                "config": config
            }
            
            logger.info(f"Created CrewAI agent: {agent_id} ({agent_type.value})")
            return crewai_agent
            
        except Exception as e:
            logger.error(f"Failed to create CrewAI agent: {e}")
            return None
    
    def execute_task(
        self,
        agent_id: str,
        task: AgentTask
    ) -> AgentResult:
        """Execute a task using CrewAI"""
        start_time = time.time()
        
        agent_data = self.agents.get(agent_id)
        if not agent_data:
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=False,
                output={},
                error=f"Agent {agent_id} not found"
            )
        
        if not CREWAI_AVAILABLE:
            # Fallback to simple execution
            return self._fallback_execute(agent_id, task, start_time)
        
        try:
            crewai_agent = agent_data["crewai_agent"]
            
            # Create CrewAI task
            crewai_task = Task(
                description=task.description,
                expected_output="Structured JSON output with analysis results",
                agent=crewai_agent
            )
            
            # Create single-agent crew
            crew = Crew(
                agents=[crewai_agent],
                tasks=[crewai_task],
                process=Process.sequential,
                verbose=True
            )
            
            # Execute
            result = crew.kickoff()
            
            execution_time = (time.time() - start_time) * 1000
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=True,
                output={"result": str(result), "raw": result},
                execution_time_ms=execution_time,
                metadata={"framework": "crewai"}
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"CrewAI execution error: {e}")
            
            # Fallback to simple execution
            return self._fallback_execute(agent_id, task, start_time)
    
    def _fallback_execute(
        self,
        agent_id: str,
        task: AgentTask,
        start_time: float
    ) -> AgentResult:
        """Fallback execution without CrewAI"""
        agent_data = self.agents.get(agent_id, {})
        agent_type = agent_data.get("type", AgentType.MASTER)
        
        # Simple task execution based on type
        output = {
            "task_id": task.task_id,
            "task_type": task.task_type,
            "agent_type": agent_type.value if hasattr(agent_type, 'value') else str(agent_type),
            "status": "completed",
            "framework": "crewai_fallback",
            "timestamp": datetime.now().isoformat()
        }
        
        execution_time = (time.time() - start_time) * 1000
        
        return AgentResult(
            task_id=task.task_id,
            agent_id=agent_id,
            success=True,
            output=output,
            execution_time_ms=execution_time,
            metadata={"framework": "crewai_fallback"}
        )
    
    def orchestrate_workflow(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """Orchestrate workflow using CrewAI crew"""
        if not CREWAI_AVAILABLE or not self.crewai_agents:
            # Fallback orchestration
            return self._fallback_orchestrate(tasks, workflow_config)
        
        results = []
        workflow_config = workflow_config or {}
        
        try:
            # Create tasks for crew
            crewai_tasks = []
            agent_list = list(self.crewai_agents.values())
            
            for task in sorted(tasks, key=lambda t: t.priority):
                # Find appropriate agent
                agent = self._select_agent_for_task(task)
                
                crewai_task = Task(
                    description=f"{task.description}\nInput: {task.input_data}",
                    expected_output="Structured analysis and recommendations",
                    agent=agent
                )
                crewai_tasks.append((task, crewai_task, agent))
            
            # Execute each task individually to capture results
            for task, crewai_task, agent in crewai_tasks:
                start_time = time.time()
                
                crew = Crew(
                    agents=[agent],
                    tasks=[crewai_task],
                    process=Process.sequential
                )
                
                try:
                    crew_result = crew.kickoff()
                    execution_time = (time.time() - start_time) * 1000
                    
                    results.append(AgentResult(
                        task_id=task.task_id,
                        agent_id=agent.role,
                        success=True,
                        output={"result": str(crew_result)},
                        execution_time_ms=execution_time,
                        metadata={"framework": "crewai"}
                    ))
                except Exception as e:
                    results.append(AgentResult(
                        task_id=task.task_id,
                        agent_id=agent.role if agent else "unknown",
                        success=False,
                        output={},
                        error=str(e)
                    ))
            
            return results
            
        except Exception as e:
            logger.error(f"CrewAI orchestration error: {e}")
            return self._fallback_orchestrate(tasks, workflow_config)
    
    def _fallback_orchestrate(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """Fallback orchestration"""
        results = []
        
        for task in sorted(tasks, key=lambda t: t.priority):
            agent_id = list(self.agents.keys())[0] if self.agents else "default"
            result = self._fallback_execute(agent_id, task, time.time())
            results.append(result)
        
        return results
    
    def _select_agent_for_task(self, task: AgentTask):
        """Select appropriate CrewAI agent for task"""
        task_role_mapping = {
            "analyze": "Data Analysis",
            "diagnose": "Diagnostics",
            "engage": "Customer",
            "schedule": "Scheduling",
            "feedback": "Feedback",
            "rca_capa": "Quality"
        }
        
        target_keyword = task_role_mapping.get(task.task_type, "")
        
        for agent in self.crewai_agents.values():
            if target_keyword.lower() in agent.role.lower():
                return agent
        
        # Return first agent as default
        return list(self.crewai_agents.values())[0] if self.crewai_agents else None
    
    def create_crew(
        self,
        crew_id: str,
        agent_ids: List[str],
        process: str = "sequential"
    ):
        """Create a crew from multiple agents"""
        if not CREWAI_AVAILABLE:
            logger.error("CrewAI not available")
            return None
        
        agents = [self.crewai_agents[aid] for aid in agent_ids if aid in self.crewai_agents]
        
        if not agents:
            logger.error("No valid agents for crew")
            return None
        
        crew_process = Process.sequential if process == "sequential" else Process.hierarchical
        
        crew = Crew(
            agents=agents,
            tasks=[],  # Tasks added during execution
            process=crew_process
        )
        
        self.crews[crew_id] = crew
        logger.info(f"Created crew: {crew_id} with {len(agents)} agents")
        
        return crew
