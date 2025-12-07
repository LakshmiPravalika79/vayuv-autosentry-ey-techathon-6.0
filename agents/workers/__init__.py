"""
AutoSentry AI - Worker Agents
6 specialized worker agents for predictive vehicle maintenance

Worker Agents:
1. DataAnalysisAgent - Analyzes vehicle telemetry data and identifies patterns
2. DiagnosisAgent - Performs AI-powered diagnosis based on telemetry analysis
3. CustomerEngagementAgent - Handles proactive customer notifications
4. SchedulingAgent - Manages appointment booking and availability
5. FeedbackAgent - Collects and analyzes customer feedback
6. RCACAPAAgent - Root Cause Analysis and Corrective/Preventive Actions
"""

from .data_analysis_agent import DataAnalysisAgent
from .diagnosis_agent import DiagnosisAgent
from .customer_engagement_agent import CustomerEngagementAgent
from .scheduling_agent import SchedulingAgent
from .feedback_agent import FeedbackAgent
from .rca_capa_agent import RCACAPAAgent

__all__ = [
    "DataAnalysisAgent",
    "DiagnosisAgent", 
    "CustomerEngagementAgent",
    "SchedulingAgent",
    "FeedbackAgent",
    "RCACAPAAgent",
]
