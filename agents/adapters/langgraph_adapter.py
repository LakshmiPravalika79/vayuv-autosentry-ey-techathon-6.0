"""
AutoSentry AI - LangGraph Agent Framework Adapter
Adapter for LangChain's LangGraph state machine framework
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

# Optional LangGraph imports
LANGGRAPH_AVAILABLE = False
try:
    from langgraph.graph import StateGraph, END
    from langchain_core.messages import HumanMessage, AIMessage
    LANGGRAPH_AVAILABLE = True
except ImportError:
    logger.warning("LangGraph not installed. Install with: pip install langgraph langchain-core")


class LangGraphAdapter(BaseAgentAdapter):
    """
    LangGraph agent framework adapter.
    
    Uses LangChain's LangGraph for state machine-based agent workflows.
    Enable by setting AGENT_FRAMEWORK=langgraph in environment.
    
    Requirements:
        pip install langgraph langchain-core langchain-openai
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        self.graphs: Dict[str, Any] = {}
        self.llm = None
    
    def initialize(self) -> bool:
        """Initialize LangGraph framework"""
        if not LANGGRAPH_AVAILABLE:
            logger.error("LangGraph is not installed")
            return False
        
        try:
            # Initialize LLM if API key provided
            llm_api_key = self.config.get("llm_api_key")
            if llm_api_key:
                try:
                    from langchain_openai import ChatOpenAI
                    self.llm = ChatOpenAI(
                        api_key=llm_api_key,
                        model=self.config.get("llm_model", "gpt-4-turbo-preview"),
                        temperature=0.1
                    )
                    logger.info("LangGraph initialized with OpenAI LLM")
                except Exception as e:
                    logger.warning(f"Could not initialize LLM: {e}")
            
            self.is_initialized = True
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize LangGraph: {e}")
            return False
    
    def create_agent(
        self,
        agent_type: AgentType,
        agent_id: str,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ) -> Any:
        """Create a LangGraph agent as a state graph"""
        if not LANGGRAPH_AVAILABLE:
            logger.error("LangGraph not available")
            return None
        
        # Create state graph based on agent type
        graph = self._create_agent_graph(agent_type, tools, config)
        
        self.agents[agent_id] = {
            "graph": graph,
            "type": agent_type,
            "config": config
        }
        self.graphs[agent_id] = graph
        
        logger.info(f"Created LangGraph agent: {agent_id} ({agent_type.value})")
        return graph
    
    def _create_agent_graph(
        self,
        agent_type: AgentType,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ):
        """Create a state graph for the agent type"""
        from typing import TypedDict, Annotated
        from operator import add
        
        # Define state schema
        class AgentState(TypedDict):
            messages: Annotated[List, add]
            input_data: Dict
            output_data: Dict
            status: str
            error: Optional[str]
        
        # Create graph
        graph = StateGraph(AgentState)
        
        # Define nodes based on agent type
        if agent_type == AgentType.DATA_ANALYSIS:
            graph.add_node("analyze", self._analyze_node)
            graph.set_entry_point("analyze")
            graph.add_edge("analyze", END)
            
        elif agent_type == AgentType.DIAGNOSIS:
            graph.add_node("diagnose", self._diagnose_node)
            graph.set_entry_point("diagnose")
            graph.add_edge("diagnose", END)
            
        elif agent_type == AgentType.CUSTOMER_ENGAGEMENT:
            graph.add_node("engage", self._engage_node)
            graph.set_entry_point("engage")
            graph.add_edge("engage", END)
            
        elif agent_type == AgentType.SCHEDULING:
            graph.add_node("schedule", self._schedule_node)
            graph.set_entry_point("schedule")
            graph.add_edge("schedule", END)
            
        else:
            graph.add_node("process", self._generic_node)
            graph.set_entry_point("process")
            graph.add_edge("process", END)
        
        return graph.compile()
    
    def _analyze_node(self, state: Dict) -> Dict:
        """Data analysis node"""
        input_data = state.get("input_data", {})
        telemetry = input_data.get("telemetry", {})
        
        analysis = {
            "vehicle_id": telemetry.get("vehicle_id", "unknown"),
            "health_indicators": {
                "engine": "good" if telemetry.get("engine_temp", 90) < 100 else "warning",
                "oil": "good" if telemetry.get("oil_pressure", 40) > 30 else "warning",
                "battery": "good" if telemetry.get("battery_voltage", 12) > 11.5 else "warning"
            },
            "analyzed_by": "langgraph"
        }
        
        return {
            **state,
            "output_data": analysis,
            "status": "completed"
        }
    
    def _diagnose_node(self, state: Dict) -> Dict:
        """Diagnosis node"""
        input_data = state.get("input_data", {})
        
        diagnosis = {
            "diagnosis_id": f"DX-{uuid.uuid4().hex[:8].upper()}",
            "findings": ["Analysis complete"],
            "diagnosed_by": "langgraph"
        }
        
        return {
            **state,
            "output_data": diagnosis,
            "status": "completed"
        }
    
    def _engage_node(self, state: Dict) -> Dict:
        """Customer engagement node"""
        input_data = state.get("input_data", {})
        
        engagement = {
            "engagement_id": f"ENG-{uuid.uuid4().hex[:8].upper()}",
            "message": "Your vehicle requires attention.",
            "engaged_by": "langgraph"
        }
        
        return {
            **state,
            "output_data": engagement,
            "status": "completed"
        }
    
    def _schedule_node(self, state: Dict) -> Dict:
        """Scheduling node"""
        input_data = state.get("input_data", {})
        
        appointment = {
            "appointment_id": f"APT-{uuid.uuid4().hex[:8].upper()}",
            "status": "scheduled",
            "scheduled_by": "langgraph"
        }
        
        return {
            **state,
            "output_data": appointment,
            "status": "completed"
        }
    
    def _generic_node(self, state: Dict) -> Dict:
        """Generic processing node"""
        return {
            **state,
            "output_data": {"processed": True},
            "status": "completed"
        }
    
    def execute_task(
        self,
        agent_id: str,
        task: AgentTask
    ) -> AgentResult:
        """Execute a task using LangGraph"""
        start_time = time.time()
        
        agent = self.agents.get(agent_id)
        if not agent:
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=False,
                output={},
                error=f"Agent {agent_id} not found"
            )
        
        try:
            graph = agent["graph"]
            
            # Prepare initial state
            initial_state = {
                "messages": [],
                "input_data": task.input_data,
                "output_data": {},
                "status": "running",
                "error": None
            }
            
            # Run graph
            result_state = graph.invoke(initial_state)
            
            execution_time = (time.time() - start_time) * 1000
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=result_state.get("status") == "completed",
                output=result_state.get("output_data", {}),
                error=result_state.get("error"),
                execution_time_ms=execution_time,
                metadata={"framework": "langgraph"}
            )
            
        except Exception as e:
            execution_time = (time.time() - start_time) * 1000
            logger.error(f"LangGraph execution error: {e}")
            
            return AgentResult(
                task_id=task.task_id,
                agent_id=agent_id,
                success=False,
                output={},
                error=str(e),
                execution_time_ms=execution_time
            )
    
    def orchestrate_workflow(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """Orchestrate workflow using LangGraph"""
        results = []
        
        for task in sorted(tasks, key=lambda t: t.priority):
            agent_id = self._find_agent_for_task(task)
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
    
    def _find_agent_for_task(self, task: AgentTask) -> Optional[str]:
        """Find appropriate agent for task"""
        task_type_mapping = {
            "analyze": AgentType.DATA_ANALYSIS,
            "diagnose": AgentType.DIAGNOSIS,
            "engage": AgentType.CUSTOMER_ENGAGEMENT,
            "schedule": AgentType.SCHEDULING
        }
        
        target_type = task_type_mapping.get(task.task_type)
        
        for agent_id, agent in self.agents.items():
            if agent["type"] == target_type:
                return agent_id
        
        return list(self.agents.keys())[0] if self.agents else None
