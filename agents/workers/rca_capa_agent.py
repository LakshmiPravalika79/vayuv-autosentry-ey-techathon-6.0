"""
AutoSentry AI - RCA/CAPA Agent
Root Cause Analysis and Corrective/Preventive Action management
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import httpx

# Import shared types
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adapters import AgentType, ActionType, AgentTask, AgentResult


class RCAStatus(Enum):
    """RCA ticket status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ROOT_CAUSE_IDENTIFIED = "root_cause_identified"
    CAPA_DEFINED = "capa_defined"
    IMPLEMENTING = "implementing"
    VERIFICATION = "verification"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class CAPAType(Enum):
    """Corrective vs Preventive Action"""
    CORRECTIVE = "corrective"
    PREVENTIVE = "preventive"
    BOTH = "both"


class PriorityLevel(Enum):
    """Priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueCategory(Enum):
    """Issue categories for RCA"""
    MECHANICAL = "mechanical"
    ELECTRICAL = "electrical"
    SOFTWARE = "software"
    PROCESS = "process"
    HUMAN_ERROR = "human_error"
    SUPPLIER = "supplier"
    DESIGN = "design"
    ENVIRONMENTAL = "environmental"


@dataclass
class RootCause:
    """Identified root cause"""
    cause_id: str
    description: str
    category: IssueCategory
    evidence: List[str]
    contributing_factors: List[str]
    confidence: float  # 0-1
    five_whys: List[str]
    fishbone_factors: Dict[str, List[str]]


@dataclass
class CorrectiveAction:
    """Corrective or preventive action"""
    action_id: str
    capa_type: CAPAType
    description: str
    owner: str
    due_date: str
    status: str
    effectiveness_criteria: List[str]
    verification_method: str
    completed_date: Optional[str] = None
    effectiveness_verified: bool = False


@dataclass
class RCATicket:
    """RCA investigation ticket"""
    ticket_id: str
    title: str
    description: str
    vehicle_id: str
    customer_id: str
    priority: PriorityLevel
    status: RCAStatus
    category: IssueCategory
    created_at: str
    updated_at: str
    root_causes: List[RootCause] = field(default_factory=list)
    corrective_actions: List[CorrectiveAction] = field(default_factory=list)
    affected_vehicles: List[str] = field(default_factory=list)
    related_tickets: List[str] = field(default_factory=list)
    assignee: str = ""
    timeline: List[Dict[str, str]] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)


class RCACAPAAgent:
    """
    RCA/CAPA Agent - Worker Agent #6
    
    Responsibilities:
    - Create and manage RCA tickets
    - Perform structured root cause analysis (5 Whys, Fishbone)
    - Define corrective and preventive actions
    - Track CAPA implementation
    - Verify effectiveness
    - Identify patterns across incidents
    - Generate insights for continuous improvement
    """
    
    def __init__(self):
        self.agent_type = AgentType.RCA_CAPA
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        
        # RCA ticket storage
        self._tickets: Dict[str, RCATicket] = {}
        
        # Pattern database for ML-assisted analysis
        self._pattern_database: List[Dict[str, Any]] = []
        
        # Standard fishbone categories (Ishikawa diagram)
        self.fishbone_categories = [
            "Man/People",
            "Machine/Equipment",
            "Method/Process",
            "Material",
            "Measurement",
            "Environment"
        ]
        
        # Common root cause patterns
        self.common_patterns = self._load_common_patterns()
    
    def _load_common_patterns(self) -> Dict[str, List[Dict]]:
        """Load common root cause patterns by category"""
        return {
            "mechanical": [
                {"pattern": "Worn component", "typical_causes": ["Age", "Lack of maintenance", "Overuse"]},
                {"pattern": "Improper installation", "typical_causes": ["Training gap", "Procedure not followed", "Wrong part"]},
                {"pattern": "Material fatigue", "typical_causes": ["Stress cycling", "Design flaw", "Material defect"]},
            ],
            "electrical": [
                {"pattern": "Corrosion", "typical_causes": ["Environmental exposure", "Improper sealing", "Age"]},
                {"pattern": "Loose connection", "typical_causes": ["Vibration", "Improper torque", "Thermal cycling"]},
                {"pattern": "Component failure", "typical_causes": ["Voltage spike", "Overheating", "Manufacturing defect"]},
            ],
            "software": [
                {"pattern": "Sensor data error", "typical_causes": ["Calibration drift", "Communication fault", "Interference"]},
                {"pattern": "Algorithm issue", "typical_causes": ["Edge case not handled", "Training data gap", "Version mismatch"]},
            ],
            "process": [
                {"pattern": "Procedure not followed", "typical_causes": ["Training gap", "Time pressure", "Unclear instructions"]},
                {"pattern": "Inspection missed", "typical_causes": ["Checklist incomplete", "Workload", "Equipment issue"]},
            ]
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute RCA/CAPA task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.ANALYZE:
                result = await self._perform_rca(payload)
            elif action == ActionType.COLLECT:
                result = await self._create_rca_ticket(payload)
            elif action == ActionType.MONITOR:
                result = await self._monitor_capa(payload)
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
    
    async def _create_rca_ticket(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Create new RCA ticket"""
        vehicle_id = payload.get("vehicle_id")
        customer_id = payload.get("customer_id")
        title = payload.get("title", "Issue Investigation")
        description = payload.get("description", "")
        diagnosis = payload.get("diagnosis", {})
        feedback = payload.get("feedback", {})
        priority = payload.get("priority", "medium")
        category = payload.get("category", "mechanical")
        
        if not vehicle_id:
            return {"error": "Missing vehicle_id"}
        
        # Generate ticket ID
        ticket_id = f"RCA-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{vehicle_id[:6]}"
        
        # Determine priority from diagnosis if available
        if diagnosis.get("severity") == "critical":
            priority = "critical"
        elif diagnosis.get("severity") == "major":
            priority = "high"
        
        # Auto-categorize based on diagnosis
        if diagnosis.get("affected_components"):
            components = diagnosis["affected_components"]
            if any("electrical" in c.lower() for c in components):
                category = "electrical"
            elif any("engine" in c.lower() or "transmission" in c.lower() for c in components):
                category = "mechanical"
        
        # Build description from available data
        if diagnosis:
            description = self._build_description_from_diagnosis(diagnosis, feedback)
        
        # Create ticket
        ticket = RCATicket(
            ticket_id=ticket_id,
            title=title,
            description=description,
            vehicle_id=vehicle_id,
            customer_id=customer_id,
            priority=PriorityLevel(priority),
            status=RCAStatus.OPEN,
            category=IssueCategory(category),
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat(),
            affected_vehicles=[vehicle_id],
            timeline=[{
                "timestamp": datetime.utcnow().isoformat(),
                "action": "Ticket created",
                "user": "system"
            }],
            metrics={
                "time_to_root_cause": None,
                "time_to_resolution": None,
                "capa_effectiveness": None
            }
        )
        
        # Find related tickets (similar issues)
        related = self._find_related_tickets(ticket)
        ticket.related_tickets = related
        
        # Check if this is part of a pattern
        pattern_match = self._check_for_patterns(ticket)
        
        # Store ticket
        self._tickets[ticket_id] = ticket
        
        return {
            "ticket_id": ticket_id,
            "status": "created",
            "priority": priority,
            "category": category,
            "related_tickets": related,
            "pattern_detected": pattern_match is not None,
            "pattern_info": pattern_match,
            "next_steps": self._get_initial_next_steps(ticket),
            "suggested_assignee": self._suggest_assignee(category, priority),
            "estimated_resolution_days": self._estimate_resolution_time(priority)
        }
    
    def _build_description_from_diagnosis(self, diagnosis: Dict, feedback: Dict) -> str:
        """Build RCA description from diagnosis and feedback"""
        lines = []
        
        lines.append("## Issue Summary")
        if diagnosis.get("primary_issue"):
            lines.append(f"Primary Issue: {diagnosis['primary_issue']}")
        if diagnosis.get("severity"):
            lines.append(f"Severity: {diagnosis['severity']}")
        
        lines.append("\n## Diagnostic Information")
        if diagnosis.get("root_causes"):
            lines.append("Suspected Causes:")
            for cause in diagnosis["root_causes"][:3]:
                prob = int(cause.get("probability", 0) * 100)
                lines.append(f"  - {cause.get('cause')} ({prob}% probability)")
        
        if diagnosis.get("dtc_codes"):
            lines.append(f"\nDTC Codes: {', '.join(diagnosis['dtc_codes'])}")
        
        if diagnosis.get("affected_components"):
            lines.append(f"\nAffected Components: {', '.join(diagnosis['affected_components'])}")
        
        if feedback and feedback.get("comment"):
            lines.append(f"\n## Customer Feedback\n{feedback['comment'][:500]}")
        
        return "\n".join(lines)
    
    def _find_related_tickets(self, ticket: RCATicket) -> List[str]:
        """Find related RCA tickets"""
        related = []
        
        for existing_id, existing in self._tickets.items():
            if existing_id == ticket.ticket_id:
                continue
            
            # Same vehicle
            if existing.vehicle_id == ticket.vehicle_id:
                related.append(existing_id)
                continue
            
            # Same category with similar description
            if existing.category == ticket.category:
                # Simple keyword matching (in production, use embeddings)
                existing_words = set(existing.description.lower().split())
                new_words = set(ticket.description.lower().split())
                overlap = len(existing_words & new_words)
                if overlap > 5:
                    related.append(existing_id)
        
        return related[:5]  # Limit to 5 related tickets
    
    def _check_for_patterns(self, ticket: RCATicket) -> Optional[Dict]:
        """Check if ticket matches a known pattern"""
        category = ticket.category.value
        
        if category in self.common_patterns:
            for pattern in self.common_patterns[category]:
                pattern_keywords = pattern["pattern"].lower().split()
                if any(kw in ticket.description.lower() for kw in pattern_keywords):
                    return {
                        "pattern_name": pattern["pattern"],
                        "typical_causes": pattern["typical_causes"],
                        "recommendation": "Consider these common causes during investigation"
                    }
        
        return None
    
    def _get_initial_next_steps(self, ticket: RCATicket) -> List[str]:
        """Get initial next steps for new ticket"""
        steps = [
            "Assign investigator to ticket",
            "Gather initial evidence and data",
            "Review related tickets and patterns",
            "Interview relevant personnel if applicable",
            "Begin root cause analysis using 5 Whys methodology"
        ]
        
        if ticket.priority == PriorityLevel.CRITICAL:
            steps.insert(0, "IMMEDIATE: Implement containment actions")
        
        return steps
    
    def _suggest_assignee(self, category: str, priority: str) -> str:
        """Suggest assignee based on category and priority"""
        assignee_map = {
            "mechanical": "mechanical_engineering_lead",
            "electrical": "electrical_systems_lead",
            "software": "software_engineering_lead",
            "process": "quality_manager",
            "human_error": "training_coordinator",
            "supplier": "supplier_quality_engineer",
            "design": "design_engineering_lead",
            "environmental": "environmental_specialist"
        }
        return assignee_map.get(category, "quality_manager")
    
    def _estimate_resolution_time(self, priority: str) -> int:
        """Estimate resolution time in days"""
        estimates = {
            "critical": 3,
            "high": 7,
            "medium": 14,
            "low": 30
        }
        return estimates.get(priority, 14)
    
    async def _perform_rca(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Perform root cause analysis on a ticket"""
        ticket_id = payload.get("ticket_id")
        analysis_method = payload.get("method", "combined")  # 5_whys, fishbone, combined
        evidence = payload.get("evidence", [])
        initial_cause = payload.get("initial_cause", "")
        
        if not ticket_id or ticket_id not in self._tickets:
            return {"error": f"Ticket {ticket_id} not found"}
        
        ticket = self._tickets[ticket_id]
        
        # Update status
        ticket.status = RCAStatus.IN_PROGRESS
        ticket.updated_at = datetime.utcnow().isoformat()
        
        # Perform 5 Whys analysis
        five_whys_result = None
        if analysis_method in ["5_whys", "combined"]:
            five_whys_result = self._perform_five_whys(
                initial_cause or ticket.description[:200],
                evidence
            )
        
        # Perform Fishbone analysis
        fishbone_result = None
        if analysis_method in ["fishbone", "combined"]:
            fishbone_result = self._perform_fishbone_analysis(
                ticket.description,
                ticket.category.value,
                evidence
            )
        
        # Identify root cause
        root_cause = self._synthesize_root_cause(
            ticket, five_whys_result, fishbone_result, evidence
        )
        
        # Add root cause to ticket
        ticket.root_causes.append(root_cause)
        ticket.status = RCAStatus.ROOT_CAUSE_IDENTIFIED
        
        # Add to timeline
        ticket.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": f"Root cause identified: {root_cause.description}",
            "user": "rca_agent"
        })
        
        # Calculate time to root cause
        created = datetime.fromisoformat(ticket.created_at)
        ticket.metrics["time_to_root_cause"] = (datetime.utcnow() - created).total_seconds() / 3600  # hours
        
        # Generate CAPA recommendations
        capa_recommendations = self._generate_capa_recommendations(root_cause, ticket)
        
        # Check for fleet-wide impact
        fleet_impact = self._assess_fleet_impact(ticket, root_cause)
        
        return {
            "ticket_id": ticket_id,
            "status": "root_cause_identified",
            "root_cause": {
                "id": root_cause.cause_id,
                "description": root_cause.description,
                "category": root_cause.category.value,
                "confidence": root_cause.confidence,
                "five_whys": root_cause.five_whys,
                "fishbone_factors": root_cause.fishbone_factors,
                "contributing_factors": root_cause.contributing_factors,
                "evidence": root_cause.evidence
            },
            "analysis_details": {
                "five_whys": five_whys_result,
                "fishbone": fishbone_result
            },
            "capa_recommendations": capa_recommendations,
            "fleet_impact": fleet_impact,
            "next_steps": [
                "Review and validate root cause",
                "Define corrective actions",
                "Define preventive actions",
                "Assign owners and due dates"
            ],
            "time_to_root_cause_hours": ticket.metrics["time_to_root_cause"]
        }
    
    def _perform_five_whys(self, initial_problem: str, evidence: List[str]) -> Dict[str, Any]:
        """Perform 5 Whys analysis"""
        # In production, this would use LLM for intelligent questioning
        # For demo, use rule-based approach
        
        whys = [initial_problem]
        
        # Generate progressive "whys" based on keywords
        current = initial_problem.lower()
        
        for i in range(4):
            next_why = self._generate_next_why(current, i)
            whys.append(next_why)
            current = next_why.lower()
        
        return {
            "problem_statement": initial_problem,
            "whys": [
                {"level": i+1, "question": f"Why #{i+1}", "answer": why}
                for i, why in enumerate(whys)
            ],
            "root_cause_statement": whys[-1],
            "evidence_supporting": evidence[:3]
        }
    
    def _generate_next_why(self, current: str, level: int) -> str:
        """Generate next why based on current answer"""
        # Simplified logic - in production, use LLM
        patterns = {
            0: [
                ("wear", "Components not replaced according to maintenance schedule"),
                ("fail", "Component exceeded its operational lifespan"),
                ("overheat", "Cooling system not functioning optimally"),
                ("pressure", "System pressure exceeded normal parameters"),
                ("sensor", "Sensor calibration drifted from specification")
            ],
            1: [
                ("maintenance", "Maintenance intervals not adhered to"),
                ("lifespan", "Usage conditions more severe than designed for"),
                ("cooling", "Coolant levels not monitored regularly"),
                ("parameter", "Operating conditions exceeded design limits"),
                ("calibration", "Calibration checks not in standard procedure")
            ],
            2: [
                ("interval", "Service reminders not effectively reaching customers"),
                ("severe", "Driving conditions assessment not performed"),
                ("monitor", "Real-time monitoring system not implemented"),
                ("design", "Design specifications not updated for actual use cases"),
                ("procedure", "Procedure documentation incomplete")
            ],
            3: [
                ("reminder", "Customer communication system needs improvement"),
                ("assessment", "Onboarding process lacks driving pattern evaluation"),
                ("implement", "Technology investment decision pending"),
                ("specification", "Design review process needs enhancement"),
                ("documentation", "Process documentation workflow gaps exist")
            ]
        }
        
        level_patterns = patterns.get(level, patterns[3])
        
        for keyword, response in level_patterns:
            if keyword in current:
                return response
        
        return f"Root contributing factor at level {level + 2}"
    
    def _perform_fishbone_analysis(
        self, description: str, category: str, evidence: List[str]
    ) -> Dict[str, Any]:
        """Perform Fishbone (Ishikawa) diagram analysis"""
        fishbone = {}
        
        for fish_category in self.fishbone_categories:
            factors = self._identify_fishbone_factors(description, fish_category, category)
            if factors:
                fishbone[fish_category] = factors
        
        return {
            "problem_statement": description[:200],
            "categories": fishbone,
            "primary_category": self._identify_primary_fishbone_category(fishbone),
            "evidence_mapping": self._map_evidence_to_categories(evidence, fishbone)
        }
    
    def _identify_fishbone_factors(
        self, description: str, fish_category: str, issue_category: str
    ) -> List[str]:
        """Identify factors for a fishbone category"""
        factor_map = {
            "Man/People": {
                "mechanical": ["Training on maintenance procedures", "Technician experience level"],
                "electrical": ["Diagnostic skill level", "Safety procedure knowledge"],
                "process": ["Procedure compliance", "Communication gaps"],
            },
            "Machine/Equipment": {
                "mechanical": ["Equipment age", "Calibration status", "Maintenance history"],
                "electrical": ["Diagnostic tool accuracy", "Test equipment condition"],
            },
            "Method/Process": {
                "mechanical": ["Standard operating procedures", "Quality checks"],
                "electrical": ["Diagnostic procedures", "Testing protocols"],
                "process": ["Workflow design", "Approval processes"],
            },
            "Material": {
                "mechanical": ["Part quality", "Material specifications", "Supplier standards"],
                "electrical": ["Component quality", "Wiring standards"],
            },
            "Measurement": {
                "mechanical": ["Inspection accuracy", "Tolerance specifications"],
                "electrical": ["Sensor calibration", "Reading accuracy"],
            },
            "Environment": {
                "mechanical": ["Operating conditions", "Storage conditions"],
                "electrical": ["Temperature exposure", "Humidity levels"],
            }
        }
        
        category_factors = factor_map.get(fish_category, {})
        return category_factors.get(issue_category, [])
    
    def _identify_primary_fishbone_category(self, fishbone: Dict[str, List[str]]) -> str:
        """Identify primary category from fishbone analysis"""
        if not fishbone:
            return "Method/Process"
        return max(fishbone.keys(), key=lambda k: len(fishbone.get(k, [])))
    
    def _map_evidence_to_categories(
        self, evidence: List[str], fishbone: Dict[str, List[str]]
    ) -> Dict[str, List[str]]:
        """Map evidence to fishbone categories"""
        mapping = {}
        for cat, factors in fishbone.items():
            cat_evidence = []
            for ev in evidence:
                ev_lower = ev.lower()
                for factor in factors:
                    if any(word in ev_lower for word in factor.lower().split()):
                        cat_evidence.append(ev)
                        break
            if cat_evidence:
                mapping[cat] = cat_evidence
        return mapping
    
    def _synthesize_root_cause(
        self, ticket: RCATicket,
        five_whys: Optional[Dict],
        fishbone: Optional[Dict],
        evidence: List[str]
    ) -> RootCause:
        """Synthesize root cause from analysis results"""
        cause_id = f"RC-{ticket.ticket_id}-001"
        
        # Determine description
        if five_whys and five_whys.get("root_cause_statement"):
            description = five_whys["root_cause_statement"]
        else:
            description = "Root cause requires further investigation"
        
        # Get five whys list
        whys = []
        if five_whys and five_whys.get("whys"):
            whys = [w["answer"] for w in five_whys["whys"]]
        
        # Get fishbone factors
        fishbone_factors = {}
        if fishbone and fishbone.get("categories"):
            fishbone_factors = fishbone["categories"]
        
        # Identify contributing factors
        contributing = []
        if fishbone and fishbone.get("primary_category"):
            contributing.append(f"Primary factor category: {fishbone['primary_category']}")
        contributing.extend([f"Evidence: {ev}" for ev in evidence[:3]])
        
        # Calculate confidence based on evidence and analysis completeness
        confidence = 0.5
        if evidence:
            confidence += min(len(evidence) * 0.1, 0.3)
        if five_whys:
            confidence += 0.1
        if fishbone:
            confidence += 0.1
        
        return RootCause(
            cause_id=cause_id,
            description=description,
            category=ticket.category,
            evidence=evidence,
            contributing_factors=contributing,
            confidence=min(confidence, 0.95),
            five_whys=whys,
            fishbone_factors=fishbone_factors
        )
    
    def _generate_capa_recommendations(
        self, root_cause: RootCause, ticket: RCATicket
    ) -> List[Dict[str, Any]]:
        """Generate CAPA recommendations based on root cause"""
        recommendations = []
        
        # Corrective actions (address the immediate issue)
        recommendations.append({
            "type": "corrective",
            "description": f"Address immediate issue: {root_cause.description}",
            "priority": "high",
            "suggested_owner": self._suggest_assignee(ticket.category.value, "high"),
            "suggested_deadline_days": 7,
            "effectiveness_criteria": [
                "Issue does not recur in affected vehicle",
                "Customer confirmation of resolution"
            ]
        })
        
        # Process improvement
        if "procedure" in root_cause.description.lower() or "process" in root_cause.description.lower():
            recommendations.append({
                "type": "preventive",
                "description": "Review and update relevant procedures",
                "priority": "medium",
                "suggested_owner": "quality_manager",
                "suggested_deadline_days": 30,
                "effectiveness_criteria": [
                    "Updated procedure documented",
                    "Staff trained on changes"
                ]
            })
        
        # Training action
        if "training" in root_cause.description.lower() or "skill" in root_cause.description.lower():
            recommendations.append({
                "type": "preventive",
                "description": "Develop and deliver targeted training",
                "priority": "medium",
                "suggested_owner": "training_coordinator",
                "suggested_deadline_days": 45,
                "effectiveness_criteria": [
                    "Training completed by all relevant personnel",
                    "Competency assessment passed"
                ]
            })
        
        # Fleet-wide check
        if len(ticket.affected_vehicles) > 1:
            recommendations.append({
                "type": "corrective",
                "description": "Perform fleet-wide inspection for similar issues",
                "priority": "high",
                "suggested_owner": "fleet_manager",
                "suggested_deadline_days": 14,
                "effectiveness_criteria": [
                    "All affected vehicles inspected",
                    "Issues identified and addressed"
                ]
            })
        
        return recommendations
    
    def _assess_fleet_impact(self, ticket: RCATicket, root_cause: RootCause) -> Dict[str, Any]:
        """Assess potential fleet-wide impact"""
        # Check for similar issues in other vehicles
        similar_tickets = [
            t for t_id, t in self._tickets.items()
            if t_id != ticket.ticket_id
            and t.category == ticket.category
            and t.status != RCAStatus.CLOSED
        ]
        
        impact = {
            "potentially_affected_vehicles": len(similar_tickets) + 1,
            "similar_open_tickets": len(similar_tickets),
            "fleet_wide_action_recommended": len(similar_tickets) >= 2,
            "risk_level": "high" if len(similar_tickets) >= 3 else "medium" if len(similar_tickets) >= 1 else "low",
            "recommendation": None
        }
        
        if impact["fleet_wide_action_recommended"]:
            impact["recommendation"] = (
                f"Pattern detected: {len(similar_tickets) + 1} vehicles affected by similar issues. "
                "Recommend fleet-wide inspection and preventive action."
            )
        
        return impact
    
    async def _monitor_capa(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor CAPA status and effectiveness"""
        ticket_id = payload.get("ticket_id")
        period_days = payload.get("period_days", 30)
        
        if ticket_id:
            # Monitor specific ticket
            if ticket_id not in self._tickets:
                return {"error": f"Ticket {ticket_id} not found"}
            
            ticket = self._tickets[ticket_id]
            return self._get_ticket_capa_status(ticket)
        
        # Monitor all tickets
        now = datetime.utcnow()
        cutoff = now - timedelta(days=period_days)
        
        active_tickets = []
        overdue_capas = []
        closed_tickets = []
        
        for t_id, ticket in self._tickets.items():
            ticket_date = datetime.fromisoformat(ticket.created_at)
            if ticket_date < cutoff:
                continue
            
            if ticket.status == RCAStatus.CLOSED:
                closed_tickets.append(self._ticket_summary(ticket))
            else:
                active_tickets.append(self._ticket_summary(ticket))
                
                # Check for overdue CAPAs
                for capa in ticket.corrective_actions:
                    if capa.status != "completed" and capa.due_date:
                        due = datetime.fromisoformat(capa.due_date)
                        if due < now:
                            overdue_capas.append({
                                "ticket_id": t_id,
                                "action_id": capa.action_id,
                                "description": capa.description,
                                "due_date": capa.due_date,
                                "days_overdue": (now - due).days
                            })
        
        # Calculate metrics
        total = len(active_tickets) + len(closed_tickets)
        closure_rate = len(closed_tickets) / total * 100 if total > 0 else 0
        
        avg_resolution_time = None
        resolution_times = [
            t.get("resolution_time_days")
            for t in closed_tickets
            if t.get("resolution_time_days")
        ]
        if resolution_times:
            avg_resolution_time = sum(resolution_times) / len(resolution_times)
        
        return {
            "monitoring_period_days": period_days,
            "summary": {
                "total_tickets": total,
                "active": len(active_tickets),
                "closed": len(closed_tickets),
                "closure_rate_percent": round(closure_rate, 1),
                "overdue_capas": len(overdue_capas),
                "avg_resolution_days": round(avg_resolution_time, 1) if avg_resolution_time else None
            },
            "active_tickets": active_tickets[:10],
            "overdue_capas": overdue_capas,
            "recently_closed": closed_tickets[:5],
            "alerts": self._generate_capa_alerts(active_tickets, overdue_capas)
        }
    
    def _get_ticket_capa_status(self, ticket: RCATicket) -> Dict[str, Any]:
        """Get CAPA status for a specific ticket"""
        total_capas = len(ticket.corrective_actions)
        completed = sum(1 for c in ticket.corrective_actions if c.status == "completed")
        verified = sum(1 for c in ticket.corrective_actions if c.effectiveness_verified)
        
        return {
            "ticket_id": ticket.ticket_id,
            "status": ticket.status.value,
            "priority": ticket.priority.value,
            "category": ticket.category.value,
            "created_at": ticket.created_at,
            "updated_at": ticket.updated_at,
            "root_causes_identified": len(ticket.root_causes),
            "capa_summary": {
                "total": total_capas,
                "completed": completed,
                "verified": verified,
                "pending": total_capas - completed,
                "completion_rate": (completed / total_capas * 100) if total_capas > 0 else 0
            },
            "corrective_actions": [
                {
                    "id": c.action_id,
                    "type": c.capa_type.value,
                    "description": c.description,
                    "owner": c.owner,
                    "due_date": c.due_date,
                    "status": c.status,
                    "verified": c.effectiveness_verified
                }
                for c in ticket.corrective_actions
            ],
            "timeline": ticket.timeline,
            "metrics": ticket.metrics
        }
    
    def _ticket_summary(self, ticket: RCATicket) -> Dict[str, Any]:
        """Generate ticket summary"""
        resolution_time = None
        if ticket.status == RCAStatus.CLOSED and ticket.metrics.get("time_to_resolution"):
            resolution_time = ticket.metrics["time_to_resolution"] / 24  # Convert hours to days
        
        return {
            "ticket_id": ticket.ticket_id,
            "title": ticket.title,
            "status": ticket.status.value,
            "priority": ticket.priority.value,
            "category": ticket.category.value,
            "created_at": ticket.created_at,
            "vehicle_id": ticket.vehicle_id,
            "root_causes_count": len(ticket.root_causes),
            "capas_count": len(ticket.corrective_actions),
            "resolution_time_days": resolution_time
        }
    
    def _generate_capa_alerts(
        self, active_tickets: List[Dict], overdue_capas: List[Dict]
    ) -> List[Dict[str, Any]]:
        """Generate CAPA monitoring alerts"""
        alerts = []
        
        if overdue_capas:
            alerts.append({
                "type": "overdue_capa",
                "severity": "high",
                "message": f"{len(overdue_capas)} CAPA action(s) are overdue",
                "action_required": "Review and update overdue actions"
            })
        
        critical_tickets = [t for t in active_tickets if t.get("priority") == "critical"]
        if critical_tickets:
            alerts.append({
                "type": "critical_tickets",
                "severity": "critical",
                "message": f"{len(critical_tickets)} critical ticket(s) require attention",
                "action_required": "Prioritize critical ticket resolution"
            })
        
        old_tickets = [
            t for t in active_tickets
            if (datetime.utcnow() - datetime.fromisoformat(t.get("created_at", datetime.utcnow().isoformat()))).days > 30
        ]
        if old_tickets:
            alerts.append({
                "type": "stale_tickets",
                "severity": "medium",
                "message": f"{len(old_tickets)} ticket(s) open for more than 30 days",
                "action_required": "Review and expedite resolution"
            })
        
        return alerts
    
    async def add_corrective_action(
        self, ticket_id: str, action_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Add corrective/preventive action to ticket"""
        if ticket_id not in self._tickets:
            return {"error": f"Ticket {ticket_id} not found"}
        
        ticket = self._tickets[ticket_id]
        
        action_id = f"CAPA-{ticket_id}-{len(ticket.corrective_actions) + 1:03d}"
        
        action = CorrectiveAction(
            action_id=action_id,
            capa_type=CAPAType(action_details.get("type", "corrective")),
            description=action_details.get("description", ""),
            owner=action_details.get("owner", "unassigned"),
            due_date=action_details.get("due_date", (datetime.utcnow() + timedelta(days=14)).isoformat()[:10]),
            status="open",
            effectiveness_criteria=action_details.get("effectiveness_criteria", []),
            verification_method=action_details.get("verification_method", "Visual inspection and testing")
        )
        
        ticket.corrective_actions.append(action)
        ticket.status = RCAStatus.CAPA_DEFINED
        ticket.updated_at = datetime.utcnow().isoformat()
        
        ticket.timeline.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": f"CAPA defined: {action.description}",
            "user": action.owner
        })
        
        return {
            "status": "success",
            "action_id": action_id,
            "ticket_id": ticket_id,
            "ticket_status": ticket.status.value
        }


# Standalone execution for testing
if __name__ == "__main__":
    async def test():
        agent = RCACAPAAgent()
        
        # Test creating RCA ticket
        create_task = AgentTask(
            task_id="test-rca-create-001",
            agent_type=AgentType.RCA_CAPA,
            action=ActionType.COLLECT,
            payload={
                "vehicle_id": "VH001",
                "customer_id": "CUST001",
                "title": "Recurring Engine Overheating",
                "description": "Vehicle experienced engine overheating on multiple occasions",
                "diagnosis": {
                    "primary_issue": "Engine temperature consistently exceeding normal range",
                    "severity": "major",
                    "affected_components": ["cooling_system", "engine"],
                    "dtc_codes": ["P0217", "P0115"],
                    "root_causes": [
                        {"cause": "Coolant leak", "probability": 0.4},
                        {"cause": "Thermostat failure", "probability": 0.3}
                    ]
                },
                "priority": "high"
            }
        )
        
        create_result = await agent.execute(create_task)
        print("=== RCA Ticket Created ===")
        print(json.dumps(create_result.result, indent=2))
        
        ticket_id = create_result.result.get("ticket_id")
        
        # Test performing RCA
        if ticket_id:
            rca_task = AgentTask(
                task_id="test-rca-analyze-001",
                agent_type=AgentType.RCA_CAPA,
                action=ActionType.ANALYZE,
                payload={
                    "ticket_id": ticket_id,
                    "method": "combined",
                    "evidence": [
                        "Coolant reservoir found low on inspection",
                        "Visible coolant stains under vehicle",
                        "Thermostat housing shows corrosion"
                    ],
                    "initial_cause": "Engine overheating due to cooling system malfunction"
                }
            )
            
            rca_result = await agent.execute(rca_task)
            print("\n=== RCA Analysis ===")
            print(json.dumps(rca_result.result, indent=2))
        
        # Test monitoring
        monitor_task = AgentTask(
            task_id="test-rca-monitor-001",
            agent_type=AgentType.RCA_CAPA,
            action=ActionType.MONITOR,
            payload={"period_days": 30}
        )
        
        monitor_result = await agent.execute(monitor_task)
        print("\n=== CAPA Monitoring ===")
        print(json.dumps(monitor_result.result, indent=2))
    
    asyncio.run(test())
