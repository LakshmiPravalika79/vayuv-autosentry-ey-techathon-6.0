"""
AutoSentry AI - Agent Adapters Package
"""

from .base_adapter import (
    BaseAgentAdapter,
    AgentType,
    ActionType,
    AgentTask,
    AgentResult,
    AgentToolRegistry,
    tool_registry
)

from .builtin_adapter import BuiltinAdapter, BuiltinAgent
from .langgraph_adapter import LangGraphAdapter
from .crewai_adapter import CrewAIAdapter
from .autogen_adapter import AutoGenAdapter

__all__ = [
    # Base classes
    "BaseAgentAdapter",
    "AgentType",
    "ActionType",
    "AgentTask",
    "AgentResult",
    "AgentToolRegistry",
    "tool_registry",
    # Adapters
    "BuiltinAdapter",
    "BuiltinAgent",
    "LangGraphAdapter",
    "CrewAIAdapter",
    "AutoGenAdapter"
]
