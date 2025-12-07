"""
AutoSentry AI - Scheduling Agent
Handles appointment booking, rescheduling, and availability management
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import httpx

# Import shared types
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from adapters import AgentType, ActionType, AgentTask, AgentResult


class AppointmentStatus(Enum):
    """Appointment statuses"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"


class ServiceType(Enum):
    """Types of services"""
    EMERGENCY = "emergency"
    DIAGNOSTIC = "diagnostic"
    PREVENTIVE = "preventive"
    REPAIR = "repair"
    RECALL = "recall"
    WARRANTY = "warranty"
    INSPECTION = "inspection"


class TimeSlotStatus(Enum):
    """Time slot availability"""
    AVAILABLE = "available"
    BOOKED = "booked"
    BLOCKED = "blocked"
    TENTATIVE = "tentative"


@dataclass
class ServiceCenter:
    """Service center information"""
    center_id: str
    name: str
    address: str
    city: str
    phone: str
    email: str
    operating_hours: Dict[str, Dict[str, str]]  # day -> {open, close}
    services_offered: List[str]
    bay_count: int
    average_rating: float = 4.5


@dataclass
class TimeSlot:
    """Available time slot"""
    slot_id: str
    center_id: str
    date: str
    start_time: str
    end_time: str
    status: TimeSlotStatus
    bay_number: int
    technician_id: Optional[str] = None


@dataclass
class Appointment:
    """Scheduled appointment"""
    appointment_id: str
    customer_id: str
    vehicle_id: str
    center_id: str
    date: str
    time: str
    duration_minutes: int
    services: List[str]
    service_type: ServiceType
    status: AppointmentStatus
    priority: int  # 1 = highest
    estimated_cost: float
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""
    reminder_sent: bool = False


class SchedulingAgent:
    """
    Scheduling Agent - Worker Agent #4
    
    Responsibilities:
    - Find available appointment slots
    - Book service appointments
    - Reschedule existing appointments
    - Cancel appointments
    - Optimize scheduling based on priority
    - Manage service center availability
    - Handle emergency appointments
    """
    
    def __init__(self):
        self.agent_type = AgentType.SCHEDULING
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        
        # Initialize service centers (in production, from database)
        self.service_centers = self._load_service_centers()
        
        # Scheduling configuration
        self.config = {
            "slot_duration_minutes": 60,
            "max_advance_days": 30,
            "min_notice_hours": 2,
            "buffer_between_appointments": 15,  # minutes
            "emergency_slots_per_day": 2,
            "operating_hours": {"start": "08:00", "end": "18:00"}
        }
        
        # In-memory appointment store (in production, use database)
        self._appointments: Dict[str, Appointment] = {}
        self._time_slots: Dict[str, Dict[str, TimeSlot]] = {}  # center_id -> date -> slots
        
        # Initialize availability
        self._initialize_availability()
    
    def _load_service_centers(self) -> Dict[str, ServiceCenter]:
        """Load service center information"""
        return {
            "SC001": ServiceCenter(
                center_id="SC001",
                name="AutoSentry Downtown",
                address="123 Main Street",
                city="San Francisco",
                phone="415-555-0100",
                email="downtown@autosentry.ai",
                operating_hours={
                    "monday": {"open": "08:00", "close": "18:00"},
                    "tuesday": {"open": "08:00", "close": "18:00"},
                    "wednesday": {"open": "08:00", "close": "18:00"},
                    "thursday": {"open": "08:00", "close": "18:00"},
                    "friday": {"open": "08:00", "close": "18:00"},
                    "saturday": {"open": "09:00", "close": "14:00"},
                    "sunday": {"open": "closed", "close": "closed"}
                },
                services_offered=["diagnostic", "preventive", "repair", "inspection"],
                bay_count=6,
                average_rating=4.7
            ),
            "SC002": ServiceCenter(
                center_id="SC002",
                name="AutoSentry Valley",
                address="456 Tech Drive",
                city="Palo Alto",
                phone="650-555-0200",
                email="valley@autosentry.ai",
                operating_hours={
                    "monday": {"open": "07:00", "close": "19:00"},
                    "tuesday": {"open": "07:00", "close": "19:00"},
                    "wednesday": {"open": "07:00", "close": "19:00"},
                    "thursday": {"open": "07:00", "close": "19:00"},
                    "friday": {"open": "07:00", "close": "19:00"},
                    "saturday": {"open": "08:00", "close": "16:00"},
                    "sunday": {"open": "10:00", "close": "14:00"}
                },
                services_offered=["emergency", "diagnostic", "preventive", "repair", "recall", "warranty", "inspection"],
                bay_count=10,
                average_rating=4.8
            ),
            "SC003": ServiceCenter(
                center_id="SC003",
                name="AutoSentry East Bay",
                address="789 Industrial Blvd",
                city="Oakland",
                phone="510-555-0300",
                email="eastbay@autosentry.ai",
                operating_hours={
                    "monday": {"open": "08:00", "close": "17:00"},
                    "tuesday": {"open": "08:00", "close": "17:00"},
                    "wednesday": {"open": "08:00", "close": "17:00"},
                    "thursday": {"open": "08:00", "close": "17:00"},
                    "friday": {"open": "08:00", "close": "17:00"},
                    "saturday": {"open": "09:00", "close": "13:00"},
                    "sunday": {"open": "closed", "close": "closed"}
                },
                services_offered=["diagnostic", "preventive", "repair", "inspection"],
                bay_count=4,
                average_rating=4.5
            )
        }
    
    def _initialize_availability(self) -> None:
        """Initialize availability for next 30 days"""
        for center_id, center in self.service_centers.items():
            self._time_slots[center_id] = {}
            
            for day_offset in range(self.config["max_advance_days"]):
                date = datetime.utcnow() + timedelta(days=day_offset)
                date_str = date.strftime("%Y-%m-%d")
                day_name = date.strftime("%A").lower()
                
                hours = center.operating_hours.get(day_name, {})
                if hours.get("open") == "closed":
                    continue
                
                self._generate_daily_slots(center_id, date_str, hours, center.bay_count)
    
    def _generate_daily_slots(
        self, center_id: str, date: str, hours: Dict[str, str], bay_count: int
    ) -> None:
        """Generate time slots for a day"""
        if center_id not in self._time_slots:
            self._time_slots[center_id] = {}
        
        if date not in self._time_slots[center_id]:
            self._time_slots[center_id][date] = {}
        
        open_time = datetime.strptime(hours.get("open", "08:00"), "%H:%M")
        close_time = datetime.strptime(hours.get("close", "18:00"), "%H:%M")
        
        current_time = open_time
        slot_duration = timedelta(minutes=self.config["slot_duration_minutes"])
        
        slot_index = 0
        while current_time + slot_duration <= close_time:
            for bay in range(1, bay_count + 1):
                slot_id = f"{center_id}-{date}-{slot_index:03d}-B{bay}"
                
                slot = TimeSlot(
                    slot_id=slot_id,
                    center_id=center_id,
                    date=date,
                    start_time=current_time.strftime("%H:%M"),
                    end_time=(current_time + slot_duration).strftime("%H:%M"),
                    status=TimeSlotStatus.AVAILABLE,
                    bay_number=bay
                )
                
                self._time_slots[center_id][date][slot_id] = slot
            
            current_time += slot_duration
            slot_index += 1
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute scheduling task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.SCHEDULE:
                result = await self._schedule_appointment(payload)
            elif action == ActionType.ANALYZE:
                result = await self._analyze_availability(payload)
            elif action == ActionType.MONITOR:
                result = await self._monitor_appointments(payload)
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
    
    async def _schedule_appointment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a new appointment"""
        customer_id = payload.get("customer_id")
        vehicle_id = payload.get("vehicle_id")
        services = payload.get("services", ["general_inspection"])
        urgency = payload.get("urgency", "normal")  # immediate, within_24_hours, within_week, next_available
        preferred_center = payload.get("preferred_center")
        preferred_date = payload.get("preferred_date")
        preferred_time = payload.get("preferred_time")
        diagnosis = payload.get("diagnosis", {})
        
        if not customer_id or not vehicle_id:
            return {"error": "Missing customer_id or vehicle_id"}
        
        # Determine service type and priority
        service_type = self._determine_service_type(services, diagnosis)
        priority = self._calculate_priority(urgency, diagnosis)
        
        # Estimate duration based on services
        duration = self._estimate_duration(services)
        estimated_cost = self._estimate_cost(services)
        
        # Find available slots
        available_slots = await self._find_available_slots(
            urgency=urgency,
            duration=duration,
            preferred_center=preferred_center,
            preferred_date=preferred_date,
            preferred_time=preferred_time,
            service_type=service_type.value
        )
        
        if not available_slots:
            return {
                "status": "no_availability",
                "message": "No available slots found matching criteria",
                "suggested_action": "Try a different date or location"
            }
        
        # Select best slot based on preferences
        selected_slot = self._select_optimal_slot(available_slots, preferred_date, preferred_time)
        
        # Create appointment
        appointment_id = f"APT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{vehicle_id[:6]}"
        
        appointment = Appointment(
            appointment_id=appointment_id,
            customer_id=customer_id,
            vehicle_id=vehicle_id,
            center_id=selected_slot["center_id"],
            date=selected_slot["date"],
            time=selected_slot["time"],
            duration_minutes=duration,
            services=services,
            service_type=service_type,
            status=AppointmentStatus.CONFIRMED,
            priority=priority,
            estimated_cost=estimated_cost,
            notes=payload.get("notes", ""),
            created_at=datetime.utcnow().isoformat(),
            updated_at=datetime.utcnow().isoformat()
        )
        
        # Book the slot
        self._book_slot(selected_slot["slot_id"], appointment_id)
        
        # Store appointment
        self._appointments[appointment_id] = appointment
        
        # Get center info
        center = self.service_centers.get(appointment.center_id)
        
        return {
            "status": "confirmed",
            "appointment_id": appointment_id,
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "date": appointment.date,
            "time": appointment.time,
            "duration_minutes": duration,
            "services": services,
            "service_type": service_type.value,
            "priority": priority,
            "estimated_cost": estimated_cost,
            "center": {
                "id": center.center_id if center else None,
                "name": center.name if center else "Service Center",
                "address": center.address if center else "",
                "city": center.city if center else "",
                "phone": center.phone if center else ""
            },
            "alternative_slots": available_slots[1:4] if len(available_slots) > 1 else [],
            "confirmation_required": urgency == "immediate",
            "requires_customer_notification": True
        }
    
    def _determine_service_type(self, services: List[str], diagnosis: Dict) -> ServiceType:
        """Determine service type based on services and diagnosis"""
        severity = diagnosis.get("severity", "minor")
        
        if severity == "critical" or "emergency" in [s.lower() for s in services]:
            return ServiceType.EMERGENCY
        elif "diagnostic" in [s.lower() for s in services]:
            return ServiceType.DIAGNOSTIC
        elif "recall" in [s.lower() for s in services]:
            return ServiceType.RECALL
        elif "warranty" in [s.lower() for s in services]:
            return ServiceType.WARRANTY
        elif any(s.lower() in ["repair", "fix", "replace"] for s in services):
            return ServiceType.REPAIR
        elif any(s.lower() in ["inspection", "check"] for s in services):
            return ServiceType.INSPECTION
        else:
            return ServiceType.PREVENTIVE
    
    def _calculate_priority(self, urgency: str, diagnosis: Dict) -> int:
        """Calculate appointment priority (1 = highest)"""
        urgency_priority = {
            "immediate": 1,
            "within_24_hours": 2,
            "within_week": 3,
            "next_available": 4
        }
        
        severity_boost = {
            "critical": -1,
            "major": 0,
            "moderate": 1,
            "minor": 2
        }
        
        base = urgency_priority.get(urgency, 3)
        boost = severity_boost.get(diagnosis.get("severity", "minor"), 1)
        
        return max(1, min(5, base + boost))
    
    def _estimate_duration(self, services: List[str]) -> int:
        """Estimate appointment duration in minutes"""
        duration_map = {
            "inspection": 30,
            "diagnostic": 60,
            "oil_change": 30,
            "brake_inspection": 45,
            "brake_replacement": 120,
            "tire_rotation": 30,
            "tire_replacement": 60,
            "battery_test": 15,
            "battery_replacement": 30,
            "engine_diagnostic": 90,
            "coolant_flush": 45,
            "transmission_service": 120,
            "air_filter": 15,
            "general_inspection": 60,
            "emergency": 120,
            "repair": 90,
            "recall": 60,
            "warranty": 60
        }
        
        total = 0
        for service in services:
            service_lower = service.lower().replace(" ", "_")
            total += duration_map.get(service_lower, 60)
        
        # Add buffer time
        total += self.config["buffer_between_appointments"]
        
        return min(total, 480)  # Max 8 hours
    
    def _estimate_cost(self, services: List[str]) -> float:
        """Estimate service cost"""
        cost_map = {
            "inspection": 75,
            "diagnostic": 125,
            "oil_change": 50,
            "brake_inspection": 60,
            "brake_replacement": 350,
            "tire_rotation": 40,
            "tire_replacement": 200,
            "battery_test": 25,
            "battery_replacement": 200,
            "engine_diagnostic": 150,
            "coolant_flush": 100,
            "transmission_service": 250,
            "air_filter": 30,
            "general_inspection": 100,
            "emergency": 200,
            "repair": 150,
            "recall": 0,
            "warranty": 0
        }
        
        total = 0.0
        for service in services:
            service_lower = service.lower().replace(" ", "_")
            total += cost_map.get(service_lower, 100)
        
        return total
    
    async def _find_available_slots(
        self,
        urgency: str,
        duration: int,
        preferred_center: Optional[str] = None,
        preferred_date: Optional[str] = None,
        preferred_time: Optional[str] = None,
        service_type: str = "preventive"
    ) -> List[Dict]:
        """Find available time slots"""
        available = []
        
        # Determine date range based on urgency
        now = datetime.utcnow()
        
        if urgency == "immediate":
            start_date = now.date()
            end_date = now.date()
        elif urgency == "within_24_hours":
            start_date = now.date()
            end_date = (now + timedelta(days=1)).date()
        elif urgency == "within_week":
            start_date = now.date()
            end_date = (now + timedelta(days=7)).date()
        else:
            start_date = (now + timedelta(days=1)).date() if now.hour >= 16 else now.date()
            end_date = (now + timedelta(days=self.config["max_advance_days"])).date()
        
        # Prefer specific center or search all
        centers_to_check = [preferred_center] if preferred_center else list(self.service_centers.keys())
        
        # Filter centers by service type
        centers_to_check = [
            c for c in centers_to_check 
            if c in self.service_centers and 
            service_type in self.service_centers[c].services_offered
        ]
        
        for center_id in centers_to_check:
            if center_id not in self._time_slots:
                continue
            
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime("%Y-%m-%d")
                
                if date_str in self._time_slots[center_id]:
                    for slot_id, slot in self._time_slots[center_id][date_str].items():
                        if slot.status == TimeSlotStatus.AVAILABLE:
                            # Check if matches preferred time
                            matches_time = True
                            if preferred_time:
                                slot_start = datetime.strptime(slot.start_time, "%H:%M")
                                pref = datetime.strptime(preferred_time, "%H:%M")
                                if abs((slot_start - pref).total_seconds()) > 3600:  # Within 1 hour
                                    matches_time = False
                            
                            center = self.service_centers[center_id]
                            available.append({
                                "slot_id": slot_id,
                                "center_id": center_id,
                                "center_name": center.name,
                                "center_address": center.address,
                                "date": date_str,
                                "time": slot.start_time,
                                "end_time": slot.end_time,
                                "bay": slot.bay_number,
                                "matches_preferred_time": matches_time,
                                "matches_preferred_date": date_str == preferred_date,
                                "matches_preferred_center": center_id == preferred_center
                            })
                
                current_date += timedelta(days=1)
                
                # Limit results
                if len(available) >= 20:
                    break
            
            if len(available) >= 20:
                break
        
        # Sort by preference matching and date/time
        available.sort(key=lambda x: (
            not x["matches_preferred_center"],
            not x["matches_preferred_date"],
            not x["matches_preferred_time"],
            x["date"],
            x["time"]
        ))
        
        return available[:10]
    
    def _select_optimal_slot(
        self, slots: List[Dict], preferred_date: Optional[str], preferred_time: Optional[str]
    ) -> Dict:
        """Select the optimal slot from available options"""
        if not slots:
            return None
        
        # First choice: matches all preferences
        for slot in slots:
            if (slot.get("matches_preferred_date") and 
                slot.get("matches_preferred_time") and 
                slot.get("matches_preferred_center")):
                return slot
        
        # Second choice: matches date and center
        for slot in slots:
            if slot.get("matches_preferred_date") and slot.get("matches_preferred_center"):
                return slot
        
        # Default: first available
        return slots[0]
    
    def _book_slot(self, slot_id: str, appointment_id: str) -> None:
        """Mark a slot as booked"""
        for center_id, dates in self._time_slots.items():
            for date, slots in dates.items():
                if slot_id in slots:
                    slots[slot_id].status = TimeSlotStatus.BOOKED
                    return
    
    async def _analyze_availability(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze availability for planning purposes"""
        center_id = payload.get("center_id")
        date_range = payload.get("date_range", 7)  # days
        
        centers = [center_id] if center_id else list(self.service_centers.keys())
        
        analysis = {}
        
        for cid in centers:
            if cid not in self._time_slots:
                continue
            
            center = self.service_centers.get(cid)
            center_analysis = {
                "center_name": center.name if center else cid,
                "total_slots": 0,
                "available_slots": 0,
                "booked_slots": 0,
                "utilization_rate": 0,
                "daily_breakdown": [],
                "peak_hours": [],
                "recommended_times": []
            }
            
            now = datetime.utcnow()
            for day_offset in range(date_range):
                date = (now + timedelta(days=day_offset)).strftime("%Y-%m-%d")
                
                if date in self._time_slots[cid]:
                    daily_slots = self._time_slots[cid][date]
                    total = len(daily_slots)
                    available = sum(1 for s in daily_slots.values() if s.status == TimeSlotStatus.AVAILABLE)
                    booked = total - available
                    
                    center_analysis["total_slots"] += total
                    center_analysis["available_slots"] += available
                    center_analysis["booked_slots"] += booked
                    
                    center_analysis["daily_breakdown"].append({
                        "date": date,
                        "total": total,
                        "available": available,
                        "booked": booked,
                        "utilization": (booked / total * 100) if total > 0 else 0
                    })
            
            # Calculate overall utilization
            if center_analysis["total_slots"] > 0:
                center_analysis["utilization_rate"] = (
                    center_analysis["booked_slots"] / center_analysis["total_slots"] * 100
                )
            
            # Identify recommended times (lowest utilization)
            if center_analysis["daily_breakdown"]:
                sorted_days = sorted(
                    center_analysis["daily_breakdown"],
                    key=lambda x: x["utilization"]
                )
                center_analysis["recommended_times"] = [
                    {"date": d["date"], "utilization": d["utilization"]}
                    for d in sorted_days[:3]
                ]
            
            analysis[cid] = center_analysis
        
        return {
            "analysis_period_days": date_range,
            "centers_analyzed": len(centers),
            "analysis": analysis,
            "overall_availability": {
                "total_slots": sum(a["total_slots"] for a in analysis.values()),
                "available_slots": sum(a["available_slots"] for a in analysis.values()),
                "average_utilization": (
                    sum(a["utilization_rate"] for a in analysis.values()) / len(analysis)
                    if analysis else 0
                )
            }
        }
    
    async def _monitor_appointments(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor appointment status and send reminders"""
        customer_id = payload.get("customer_id")
        vehicle_id = payload.get("vehicle_id")
        
        # Filter appointments
        appointments = list(self._appointments.values())
        
        if customer_id:
            appointments = [a for a in appointments if a.customer_id == customer_id]
        if vehicle_id:
            appointments = [a for a in appointments if a.vehicle_id == vehicle_id]
        
        # Categorize appointments
        now = datetime.utcnow()
        today = now.strftime("%Y-%m-%d")
        
        upcoming = []
        today_appointments = []
        past = []
        needs_reminder = []
        
        for apt in appointments:
            apt_date = apt.date
            
            if apt.status == AppointmentStatus.CANCELLED:
                continue
            
            if apt_date > today:
                upcoming.append(self._appointment_to_dict(apt))
                
                # Check if reminder needed (24 hours before)
                apt_datetime = datetime.strptime(f"{apt.date} {apt.time}", "%Y-%m-%d %H:%M")
                if (apt_datetime - now).total_seconds() < 86400 and not apt.reminder_sent:
                    needs_reminder.append(self._appointment_to_dict(apt))
            elif apt_date == today:
                today_appointments.append(self._appointment_to_dict(apt))
            else:
                past.append(self._appointment_to_dict(apt))
        
        return {
            "total_appointments": len(appointments),
            "today": today_appointments,
            "upcoming": upcoming,
            "past": past[:10],  # Last 10
            "needs_reminder": needs_reminder,
            "summary": {
                "today_count": len(today_appointments),
                "upcoming_count": len(upcoming),
                "past_count": len(past),
                "reminders_to_send": len(needs_reminder)
            }
        }
    
    def _appointment_to_dict(self, apt: Appointment) -> Dict:
        """Convert appointment to dictionary"""
        center = self.service_centers.get(apt.center_id)
        return {
            "appointment_id": apt.appointment_id,
            "customer_id": apt.customer_id,
            "vehicle_id": apt.vehicle_id,
            "date": apt.date,
            "time": apt.time,
            "duration_minutes": apt.duration_minutes,
            "services": apt.services,
            "service_type": apt.service_type.value,
            "status": apt.status.value,
            "priority": apt.priority,
            "estimated_cost": apt.estimated_cost,
            "center_name": center.name if center else "Unknown",
            "center_address": center.address if center else "",
            "notes": apt.notes
        }
    
    async def reschedule_appointment(
        self, appointment_id: str, new_date: str, new_time: str, 
        new_center_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Reschedule an existing appointment"""
        if appointment_id not in self._appointments:
            return {"error": f"Appointment {appointment_id} not found"}
        
        apt = self._appointments[appointment_id]
        
        # Find new slot
        center = new_center_id or apt.center_id
        available = await self._find_available_slots(
            urgency="next_available",
            duration=apt.duration_minutes,
            preferred_center=center,
            preferred_date=new_date,
            preferred_time=new_time
        )
        
        if not available:
            return {
                "status": "failed",
                "message": "No available slots for requested time"
            }
        
        # Release old slot
        old_slot_pattern = f"{apt.center_id}-{apt.date}"
        # In production, properly release the old slot
        
        # Book new slot
        new_slot = available[0]
        self._book_slot(new_slot["slot_id"], appointment_id)
        
        # Update appointment
        apt.date = new_slot["date"]
        apt.time = new_slot["time"]
        apt.center_id = new_slot["center_id"]
        apt.status = AppointmentStatus.RESCHEDULED
        apt.updated_at = datetime.utcnow().isoformat()
        apt.reminder_sent = False  # Reset reminder
        
        return {
            "status": "rescheduled",
            "appointment_id": appointment_id,
            "old_date": apt.date,
            "new_date": new_slot["date"],
            "new_time": new_slot["time"],
            "center": new_slot["center_name"],
            "requires_customer_notification": True
        }
    
    async def cancel_appointment(self, appointment_id: str, reason: str = "") -> Dict[str, Any]:
        """Cancel an appointment"""
        if appointment_id not in self._appointments:
            return {"error": f"Appointment {appointment_id} not found"}
        
        apt = self._appointments[appointment_id]
        
        # Release the slot
        # In production, properly release the slot
        
        apt.status = AppointmentStatus.CANCELLED
        apt.notes = f"{apt.notes}\nCancellation reason: {reason}"
        apt.updated_at = datetime.utcnow().isoformat()
        
        return {
            "status": "cancelled",
            "appointment_id": appointment_id,
            "original_date": apt.date,
            "original_time": apt.time,
            "cancellation_reason": reason,
            "requires_customer_notification": True
        }


# Standalone execution for testing  
if __name__ == "__main__":
    async def test():
        agent = SchedulingAgent()
        
        # Test scheduling appointment
        task = AgentTask(
            task_id="test-schedule-001",
            agent_type=AgentType.SCHEDULING,
            action=ActionType.SCHEDULE,
            payload={
                "customer_id": "CUST001",
                "vehicle_id": "VH001",
                "services": ["brake_inspection", "oil_change"],
                "urgency": "within_week",
                "preferred_date": (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d"),
                "preferred_time": "10:00",
                "diagnosis": {
                    "severity": "moderate",
                    "primary_issue": "Brake pads wearing"
                }
            }
        )
        
        result = await agent.execute(task)
        print(json.dumps(result.result, indent=2))
        
        # Test availability analysis
        analysis_task = AgentTask(
            task_id="test-analysis-001",
            agent_type=AgentType.SCHEDULING,
            action=ActionType.ANALYZE,
            payload={"date_range": 7}
        )
        
        analysis_result = await agent.execute(analysis_task)
        print("\n--- Availability Analysis ---")
        print(json.dumps(analysis_result.result, indent=2))
    
    asyncio.run(test())
