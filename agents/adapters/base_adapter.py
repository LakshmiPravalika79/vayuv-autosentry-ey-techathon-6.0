"""
AutoSentry AI - Agent Framework Adapter Base Class
Abstract base class for agent framework adapters
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AgentType(Enum):
    """Types of agents in the system"""
    MASTER = "master"
    DATA_ANALYSIS = "data_analysis"
    DIAGNOSIS = "diagnosis"
    CUSTOMER_ENGAGEMENT = "customer_engagement"
    SCHEDULING = "scheduling"
    FEEDBACK = "feedback"
    RCA_CAPA = "rca_capa"


class ActionType(Enum):
    """Types of agent actions"""
    QUERY = "query"
    PREDICT = "predict"
    SCHEDULE = "schedule"
    NOTIFY = "notify"
    GENERATE = "generate"
    UPDATE = "update"
    ANALYZE = "analyze"
    DIAGNOSE = "diagnose"
    ENGAGE = "engage"


@dataclass
class AgentTask:
    """Represents a task for an agent to execute"""
    task_id: str
    task_type: str
    description: str
    input_data: Dict[str, Any]
    priority: int = 1  # 1 = highest priority
    timeout_seconds: int = 30
    retry_count: int = 0
    max_retries: int = 3


@dataclass
class AgentResult:
    """Result from an agent task execution"""
    task_id: str
    agent_id: str
    success: bool
    output: Dict[str, Any]
    error: Optional[str] = None
    execution_time_ms: float = 0
    metadata: Optional[Dict[str, Any]] = None


class BaseAgentAdapter(ABC):
    """
    Abstract base class for agent framework adapters.
    
    Implement this class to integrate different agent frameworks
    (LangGraph, CrewAI, AutoGen) with the AutoSentry system.
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.agents: Dict[str, Any] = {}
        self.is_initialized = False
        logger.info(f"Initializing {self.__class__.__name__}")
    
    @abstractmethod
    def initialize(self) -> bool:
        """
        Initialize the agent framework.
        
        Returns:
            bool: True if initialization successful
        """
        pass
    
    @abstractmethod
    def create_agent(
        self,
        agent_type: AgentType,
        agent_id: str,
        tools: List[Callable] = None,
        config: Dict[str, Any] = None
    ) -> Any:
        """
        Create an agent of the specified type.
        
        Args:
            agent_type: Type of agent to create
            agent_id: Unique identifier for the agent
            tools: List of tool functions the agent can use
            config: Additional configuration for the agent
            
        Returns:
            The created agent instance
        """
        pass
    
    @abstractmethod
    def execute_task(
        self,
        agent_id: str,
        task: AgentTask
    ) -> AgentResult:
        """
        Execute a task with the specified agent.
        
        Args:
            agent_id: ID of the agent to execute the task
            task: Task to execute
            
        Returns:
            AgentResult with the execution results
        """
        pass
    
    @abstractmethod
    def orchestrate_workflow(
        self,
        tasks: List[AgentTask],
        workflow_config: Dict[str, Any] = None
    ) -> List[AgentResult]:
        """
        Orchestrate a workflow of multiple tasks.
        
        Args:
            tasks: List of tasks to execute
            workflow_config: Configuration for the workflow
            
        Returns:
            List of AgentResults from all tasks
        """
        pass
    
    def get_agent(self, agent_id: str) -> Optional[Any]:
        """Get an agent by ID"""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[str]:
        """List all registered agent IDs"""
        return list(self.agents.keys())
    
    def shutdown(self):
        """Cleanup and shutdown the framework"""
        logger.info(f"Shutting down {self.__class__.__name__}")
        self.agents.clear()
        self.is_initialized = False


class AgentToolRegistry:
    """Registry for agent tools/functions"""
    
    def __init__(self):
        self.tools: Dict[str, Callable] = {}
    
    def register(self, name: str, func: Callable, description: str = ""):
        """Register a tool function"""
        self.tools[name] = {
            "function": func,
            "description": description,
            "name": name
        }
        logger.debug(f"Registered tool: {name}")
    
    def get(self, name: str) -> Optional[Dict]:
        """Get a tool by name"""
        return self.tools.get(name)
    
    def list_tools(self) -> List[str]:
        """List all registered tool names"""
        return list(self.tools.keys())
    
    def get_all(self) -> Dict[str, Callable]:
        """Get all registered tools"""
        return {name: info["function"] for name, info in self.tools.items()}


# Global tool registry
tool_registry = AgentToolRegistry()
