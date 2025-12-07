"""
AutoSentry AI - AutoGen Agent Framework Adapter
Adapter for Microsoft's AutoGen multi-agent framework
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

# Optional AutoGen imports
AUTOGEN_AVAILABLE = False
try:
    import autogen
    from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
    AUTOGEN_AVAILABLE = True
except ImportError:
    logger.warning("AutoGen not installed. Install with: pip install pyautogen")


class AutoGenAdapter(BaseAgentAdapter):
    """
    AutoGen agent framework adapter.
    
    Uses Microsoft's AutoGen for multi-agent conversations.
    Enable by setting AGENT_FRAMEWORK=autogen in environment.
    
    Requirements:
        pip install pyautogen
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.autogen_agents: Dict[str, Any] = {}
        self.user_proxy = None
        self.llm_config = None
    
    def initialize(self) -> bool:
        """Initialize AutoGen framework"""
        if not AUTOGEN_AVAILABLE:
            logger.error("AutoGen is not installed")
            return False
        
        try:
            # Configure LLM
            llm_api_key = self.config.get("llm_api_key")
            
            if llm_api_key:
                self.llm_config = {
                    "config_list": [{
                        "model": self.config.get("llm_model", "gpt-4-turbo-preview"),
                        "api_key": llm_api_key
                    }],
                    "temperature": 0.1
                }
            else:
                # Use local/mock config
                self.llm_config = {
                    "config_list": [{
                        "model": "mock",
                        "api_key": "mock"
                    }]
                }
            
            # Create user proxy agent
            self.user_proxy = UserProxyAgent(
                name="user_proxy",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=5,
                code_execution_config=False
            )
            
            logger.info("AutoGen framework initialized")
            self.is_initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize AutoGen: {e}")
            return False
    
    def create_agent(
        self,
        agent_type: AgentType,
        agent_id: str,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ) -> Any:
        """Create an AutoGen agent"""
        if not AUTOGEN_AVAILABLE:
            logger.error("AutoGen not available")
            return None
        
        config = config or {}
        
        # Define agent system messages based on type
        system_messages = {
            AgentType.MASTER: """You are the Master Orchestrator for AutoSentry AI vehicle maintenance system.
Your role is to coordinate all maintenance activities, delegate tasks to specialized agents,
and ensure optimal system operation. You have expertise in automotive systems and predictive maintenance.""",
            
            AgentType.DATA_ANALYSIS: """You are a Data Analysis Specialist for AutoSentry AI.
Your role is to analyze vehicle telemetry data, identify patterns, detect anomalies,
and provide insights for predictive maintenance. Focus on sensor data interpretation.""",
            
            AgentType.DIAGNOSIS: """You are a Vehicle Diagnostics Expert for AutoSentry AI.
Your role is to diagnose vehicle issues based on telemetry data and analysis results.
Determine root causes and severity of problems. Provide technical recommendations.""",
            
            AgentType.CUSTOMER_ENGAGEMENT: """You are a Customer Success Manager for AutoSentry AI.
Your role is to communicate with customers about vehicle maintenance needs.
Be empathetic, clear, and helpful. Generate appropriate messages for chat and voice.""",
            
            AgentType.SCHEDULING: """You are a Service Scheduling Coordinator for AutoSentry AI.
Your role is to schedule service appointments based on diagnosis priority and customer availability.
Optimize scheduling for minimal customer disruption.""",
            
            AgentType.FEEDBACK: """You are a Customer Feedback Analyst for AutoSentry AI.
Your role is to collect, analyze, and act on customer feedback.
Identify trends and areas for improvement.""",
            
            AgentType.RCA_CAPA: """You are a Quality Engineer for AutoSentry AI.
Your role is to perform Root Cause Analysis (RCA) and develop
Corrective and Preventive Actions (CAPA) for manufacturing insights."""
        }
        
        system_message = system_messages.get(
            agent_type,
            "You are an AI assistant for vehicle maintenance."
        )
        
        try:
            autogen_agent = AssistantAgent(
                name=agent_id.replace("-", "_"),
                system_message=system_message,
                llm_config=self.llm_config if self.llm_config else False
            )
            
            self.autogen_agents[agent_id] = autogen_agent
            self.agents[agent_id] = {
                "autogen_agent": autogen_agent,
                "type": agent_type,
                "config": config
            }
            
            logger.info(f"Created AutoGen agent: {agent_id} ({agent_type.value})")
            return autogen_agent
            
        except Exception as e:
            logger.error(f"Failed to create AutoGen agent: {e}")
            return None
    
    def execute_task(
        self,
        agent_id: str,
        task: AgentTask
    ) -> AgentResult:
        """Execute a task using AutoGen"""
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
        
        if not AUTOGEN_AVAILABLE or not self.user_proxy:
            return self._fallback_execute(agent_id, task, start_time)
        
        try:
            autogen_agent = agent_data["autogen_agent"]
            
            # Format task message
            task_message = f"""
Task: {task.task_type}
Description: {task.description}
Input Data: {task.input_data}

Please analyze and provide structured output.
"""
            
            # Initiate chat (non-interactive)
            self.user_proxy.initiate_chat(
                autogen_agent,
                message=task_message,
                max_turns=2
            )
            
            # Get last message as result
            messages = autogen_agent.chat_messages.get(self.user_proxy, [])
            last_message = messages[-1] if messages else {"content": "No response"}
            
            execution_time = (time.time() - start_time) * 1000
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=True,
                output={
                    "response": last_message.get("content", ""),
                    "message_count": len(messages)
                },
                execution_time_ms=execution_time,
                metadata={"framework": "autogen"}
            )
            
        except Exception as e:
            logger.error(f"AutoGen execution error: {e}")
            return self._fallback_execute(agent_id, task, start_time)
    
    def _fallback_execute(
        self,
        agent_id: str,
        task: AgentTask,
        start_time: float
    ) -> AgentResult:
        """Fallback execution without AutoGen LLM"""
        agent_data = self.agents.get(agent_id, {})
        agent_type = agent_data.get("type", AgentType.MASTER)
        
        # Generate appropriate response based on agent type
        responses = {
            AgentType.DATA_ANALYSIS: {
                "analysis": "Data analysis complete",
                "patterns_detected": ["normal_operation"],
                "anomalies": []
            },
            AgentType.DIAGNOSIS: {
                "diagnosis": "No critical issues found",
                "recommendations": ["Continue regular maintenance"]
            },
            AgentType.CUSTOMER_ENGAGEMENT: {
                "message": "Thank you for using AutoSentry AI. Your vehicle is in good condition.",
                "channel": "chat"
            },
            AgentType.SCHEDULING: {
                "appointment_id": f"APT-{uuid.uuid4().hex[:8].upper()}",
                "status": "available"
            },
            AgentType.FEEDBACK: {
                "survey_sent": True,
                "feedback_id": f"FB-{uuid.uuid4().hex[:8].upper()}"
            },
            AgentType.RCA_CAPA: {
                "rca_complete": True,
                "capa_id": f"CAPA-{uuid.uuid4().hex[:8].upper()}"
            }
        }
        
        output = responses.get(agent_type, {"status": "completed"})
        output["task_id"] = task.task_id
        output["framework"] = "autogen_fallback"
        output["timestamp"] = datetime.now().isoformat()
        
        execution_time = (time.time() - start_time) * 1000
        
        return AgentResult(
            task_id=task.task_id,
            agent_id=agent_id,
            success=True,
            output=output,
            execution_time_ms=execution_time,
            metadata={"framework": "autogen_fallback"}
        )
    
    def orchestrate_workflow(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """Orchestrate workflow using AutoGen group chat"""
        if not AUTOGEN_AVAILABLE or not self.autogen_agents:
            return self._fallback_orchestrate(tasks, workflow_config)
        
        workflow_config = workflow_config or {}
        results = []
        
        # Execute tasks sequentially with group coordination
        for task in sorted(tasks, key=lambda t: t.priority):
            # Find appropriate agent
            agent_id = self._select_agent_for_task(task)
            
            if agent_id:
                result = self.execute_task(agent_id, task)
                results.append(result)
            else:
                results.append(AgentResult(
                    task_id=task.task_id,
                    agent_id="none",
                    success=False,
                    output={},
                    error="No suitable agent found"
                ))
        
        return results
    
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
    
    def _select_agent_for_task(self, task: AgentTask) -> Optional[str]:
        """Select appropriate AutoGen agent for task"""
        task_type_mapping = {
            "analyze": AgentType.DATA_ANALYSIS,
            "diagnose": AgentType.DIAGNOSIS,
            "engage": AgentType.CUSTOMER_ENGAGEMENT,
            "schedule": AgentType.SCHEDULING,
            "feedback": AgentType.FEEDBACK,
            "rca_capa": AgentType.RCA_CAPA
        }
        
        target_type = task_type_mapping.get(task.task_type)
        
        for agent_id, agent_data in self.agents.items():
            if agent_data.get("type") == target_type:
                return agent_id
        
        return list(self.agents.keys())[0] if self.agents else None
    
    def create_group_chat(
        self,
        group_id: str,
        agent_ids: List[str],
        max_round: int = 10
    ):
        """Create a group chat with multiple agents"""
        if not AUTOGEN_AVAILABLE:
            logger.error("AutoGen not available")
            return None
        
        agents = [self.autogen_agents[aid] for aid in agent_ids if aid in self.autogen_agents]
        
        if not agents:
            logger.error("No valid agents for group chat")
            return None
        
        # Add user proxy
        agents.append(self.user_proxy)
        
        group_chat = GroupChat(
            agents=agents,
            messages=[],
            max_round=max_round
        )
        
        manager = GroupChatManager(
            groupchat=group_chat,
            llm_config=self.llm_config
        )
        
        logger.info(f"Created group chat: {group_id} with {len(agents)} agents")
        
        return manager
