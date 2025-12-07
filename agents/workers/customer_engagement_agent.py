"""
AutoSentry AI - Customer Engagement Agent
Handles proactive customer notifications and communications
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


class NotificationChannel(Enum):
    """Communication channels"""
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    CALL = "call"


class NotificationPriority(Enum):
    """Notification priority levels"""
    CRITICAL = "critical"  # Immediate attention required
    HIGH = "high"          # Same day attention
    MEDIUM = "medium"      # Within 48 hours
    LOW = "low"            # Informational


class NotificationType(Enum):
    """Types of notifications"""
    ALERT = "alert"
    REMINDER = "reminder"
    CONFIRMATION = "confirmation"
    PROMOTION = "promotion"
    UPDATE = "update"
    SURVEY = "survey"


@dataclass
class CustomerProfile:
    """Customer profile for personalization"""
    customer_id: str
    name: str
    email: str
    phone: str
    preferred_channel: NotificationChannel
    preferred_language: str = "en"
    notification_preferences: Dict[str, bool] = field(default_factory=dict)
    vehicle_ids: List[str] = field(default_factory=list)


@dataclass
class Notification:
    """Notification message"""
    notification_id: str
    customer_id: str
    vehicle_id: str
    channel: NotificationChannel
    type: NotificationType
    priority: NotificationPriority
    subject: str
    body: str
    timestamp: str
    scheduled_time: Optional[str] = None
    delivered: bool = False
    read: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


class CustomerEngagementAgent:
    """
    Customer Engagement Agent - Worker Agent #3
    
    Responsibilities:
    - Send proactive maintenance alerts to customers
    - Personalize communication based on customer preferences
    - Multi-channel communication (email, SMS, push, in-app)
    - Schedule follow-up reminders
    - Collect customer responses
    - Handle appointment confirmations
    """
    
    def __init__(self):
        self.agent_type = AgentType.CUSTOMER_ENGAGEMENT
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        
        # Notification templates
        self.templates = self._load_templates()
        
        # Rate limiting
        self.rate_limits = {
            NotificationChannel.EMAIL: 10,  # per hour
            NotificationChannel.SMS: 5,
            NotificationChannel.PUSH: 20,
            NotificationChannel.IN_APP: 50,
            NotificationChannel.CALL: 2
        }
        
        # Notification history for deduplication
        self._notification_history: Dict[str, List[Notification]] = {}
        
    def _load_templates(self) -> Dict[str, Dict]:
        """Load notification templates"""
        return {
            "critical_alert": {
                "subject": "🚨 URGENT: {vehicle_name} Requires Immediate Attention",
                "body": """Dear {customer_name},

Our AI system has detected a CRITICAL issue with your {vehicle_name} ({vehicle_id}):

⚠️ {primary_issue}

Severity: CRITICAL
Recommended Action: {recommended_action}

For your safety, we recommend:
• Do not drive the vehicle until inspected
• Contact our service center immediately

📞 Emergency Service Line: 1-800-AUTO-HELP
📍 Nearest Service Center: {nearest_center}

We have pre-scheduled an emergency appointment for you:
📅 Date: {suggested_date}
⏰ Time: {suggested_time}

Click here to confirm: {confirmation_link}

Your safety is our priority.

Best regards,
AutoSentry AI Team""",
                "sms": "🚨 URGENT: Your {vehicle_name} needs immediate service. Issue: {primary_issue}. Call 1-800-AUTO-HELP or confirm appointment: {short_link}"
            },
            
            "high_priority_alert": {
                "subject": "⚠️ Important: Maintenance Required for {vehicle_name}",
                "body": """Dear {customer_name},

Our predictive maintenance system has identified an issue that needs attention within 24 hours:

Vehicle: {vehicle_name} ({vehicle_id})
Issue: {primary_issue}
Severity: HIGH
Health Score: {health_score}%

Diagnosis Details:
{diagnosis_summary}

Recommended Actions:
{recommended_actions}

Estimated Repair:
• Time: {estimated_time}
• Cost: ${cost_min} - ${cost_max}

We recommend scheduling service soon to prevent further damage.

📅 Available Appointments:
{available_slots}

Click to book: {booking_link}

Thank you for trusting AutoSentry.

Best regards,
AutoSentry AI Team""",
                "sms": "⚠️ {vehicle_name} needs service within 24hrs. Issue: {primary_issue}. Book now: {short_link}"
            },
            
            "maintenance_reminder": {
                "subject": "🔧 Scheduled Maintenance Due for {vehicle_name}",
                "body": """Dear {customer_name},

This is a friendly reminder that your {vehicle_name} is due for scheduled maintenance:

Service Due: {service_type}
Current Mileage: {current_mileage} km
Recommended At: {recommended_mileage} km

Based on your driving patterns, we estimate this service should be completed within the next {days_remaining} days.

Preventive maintenance helps:
✅ Extend vehicle lifespan
✅ Maintain fuel efficiency
✅ Prevent costly repairs
✅ Ensure safety

Book your appointment:
{booking_link}

Need assistance? Reply to this email or call us at 1-800-AUTO-HELP.

Drive safe!
AutoSentry AI Team""",
                "sms": "🔧 Reminder: {vehicle_name} is due for {service_type}. Book your service: {short_link}"
            },
            
            "appointment_confirmation": {
                "subject": "✅ Appointment Confirmed - {vehicle_name} Service",
                "body": """Dear {customer_name},

Your service appointment has been confirmed!

📅 Appointment Details:
• Date: {appointment_date}
• Time: {appointment_time}
• Location: {service_center}
• Address: {center_address}

🚗 Vehicle: {vehicle_name} ({vehicle_id})

📋 Services Scheduled:
{services_list}

💰 Estimated Cost: ${estimated_cost}
⏱️ Estimated Duration: {estimated_duration}

Preparation Tips:
• Arrive 10 minutes early
• Bring your driver's license
• Remove personal items from the vehicle

📍 Get Directions: {directions_link}

Need to reschedule? Click here: {reschedule_link}
Cancel appointment: {cancel_link}

We look forward to serving you!

Best regards,
AutoSentry AI Team""",
                "sms": "✅ Confirmed: Service for {vehicle_name} on {appointment_date} at {appointment_time}. Location: {service_center}. Details: {short_link}"
            },
            
            "service_complete": {
                "subject": "🎉 Service Complete - {vehicle_name} is Ready!",
                "body": """Dear {customer_name},

Great news! The service for your {vehicle_name} has been completed.

📋 Services Performed:
{services_performed}

🔍 Inspection Results:
• Overall Health Score: {health_score}%
• Next Service Due: {next_service_date}
• Estimated Mileage: {next_service_mileage} km

💰 Final Invoice: ${final_cost}
🧾 View detailed invoice: {invoice_link}

Your vehicle is ready for pickup at:
📍 {service_center}
📞 Contact: {center_phone}

Pickup Hours: {pickup_hours}

📝 Please take a moment to rate your experience:
{survey_link}

Thank you for choosing AutoSentry!

Best regards,
AutoSentry AI Team""",
                "sms": "🎉 Your {vehicle_name} service is complete! Health Score: {health_score}%. Ready for pickup at {service_center}. Invoice: {short_link}"
            },
            
            "feedback_request": {
                "subject": "📝 How was your service experience?",
                "body": """Dear {customer_name},

Thank you for choosing AutoSentry for your recent service visit!

We'd love to hear about your experience. Your feedback helps us improve our services.

Service Details:
• Vehicle: {vehicle_name}
• Date: {service_date}
• Services: {services_summary}

Please rate your experience (1-5 stars):
{rating_link}

Or answer a few quick questions:
{survey_link}

Your feedback is valuable to us!

Best regards,
AutoSentry AI Team""",
                "sms": "📝 How was your {vehicle_name} service? Rate us: {short_link}"
            },
            
            "promotion": {
                "subject": "🎁 Special Offer for {vehicle_name} Owners!",
                "body": """Dear {customer_name},

We have an exclusive offer just for you!

{promotion_title}

{promotion_details}

Offer Valid: {offer_start} - {offer_end}

This offer is personalized based on your {vehicle_name}'s service history and maintenance needs.

Redeem this offer:
{offer_link}

Terms and conditions apply. See details at {terms_link}.

Best regards,
AutoSentry AI Team""",
                "sms": "🎁 Special offer for your {vehicle_name}! {promotion_title}. Claim: {short_link}"
            }
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute customer engagement task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.NOTIFY:
                result = await self._send_notification(payload)
            elif action == ActionType.ENGAGE:
                result = await self._engage_customer(payload)
            elif action == ActionType.MONITOR:
                result = await self._monitor_engagement(payload)
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
    
    async def _send_notification(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send notification to customer"""
        customer_id = payload.get("customer_id")
        vehicle_id = payload.get("vehicle_id")
        notification_type = payload.get("notification_type", "alert")
        priority = payload.get("priority", "medium")
        template_name = payload.get("template", "maintenance_reminder")
        template_data = payload.get("template_data", {})
        channels = payload.get("channels", ["email", "in_app"])
        
        # Get customer profile
        customer = await self._get_customer_profile(customer_id)
        if not customer:
            return {"error": f"Customer {customer_id} not found"}
        
        # Check customer preferences
        if not self._check_notification_preferences(customer, notification_type):
            return {
                "status": "skipped",
                "reason": "Customer has disabled this notification type"
            }
        
        # Check rate limiting
        if not self._check_rate_limit(customer_id, channels):
            return {
                "status": "rate_limited",
                "reason": "Rate limit exceeded, notification queued"
            }
        
        # Generate notification content
        notifications_sent = []
        
        for channel_str in channels:
            channel = NotificationChannel(channel_str)
            
            # Prepare template data with customer info
            full_template_data = {
                "customer_name": customer.name,
                "customer_id": customer_id,
                "vehicle_id": vehicle_id,
                **template_data
            }
            
            # Generate content from template
            content = self._generate_content(template_name, channel, full_template_data)
            
            # Create notification
            notification = Notification(
                notification_id=f"NOTIF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{channel.value}",
                customer_id=customer_id,
                vehicle_id=vehicle_id,
                channel=channel,
                type=NotificationType(notification_type),
                priority=NotificationPriority(priority),
                subject=content.get("subject", "AutoSentry Notification"),
                body=content.get("body", ""),
                timestamp=datetime.utcnow().isoformat(),
                metadata=template_data
            )
            
            # Send notification
            send_result = await self._deliver_notification(notification)
            
            # Track notification
            self._track_notification(customer_id, notification)
            
            notifications_sent.append({
                "notification_id": notification.notification_id,
                "channel": channel.value,
                "delivered": send_result.get("delivered", False),
                "message_id": send_result.get("message_id")
            })
        
        return {
            "status": "sent",
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "notifications": notifications_sent,
            "total_sent": len(notifications_sent)
        }
    
    async def _engage_customer(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Proactive customer engagement based on diagnosis"""
        customer_id = payload.get("customer_id")
        vehicle_id = payload.get("vehicle_id")
        diagnosis = payload.get("diagnosis", {})
        engagement_type = payload.get("engagement_type", "alert")
        
        # Get customer profile
        customer = await self._get_customer_profile(customer_id)
        if not customer:
            return {"error": f"Customer {customer_id} not found"}
        
        # Determine notification parameters based on severity
        severity = diagnosis.get("severity", "minor")
        
        # Map severity to notification settings
        notification_config = self._get_notification_config(severity, diagnosis)
        
        # Prepare template data
        template_data = {
            "vehicle_name": payload.get("vehicle_name", f"Vehicle {vehicle_id}"),
            "vehicle_id": vehicle_id,
            "primary_issue": diagnosis.get("primary_issue", "Maintenance required"),
            "health_score": diagnosis.get("health_score", 100),
            "diagnosis_summary": self._format_diagnosis_summary(diagnosis),
            "recommended_actions": self._format_recommended_actions(diagnosis.get("recommended_actions", [])),
            "estimated_time": diagnosis.get("estimated_repair_time", "TBD"),
            "cost_min": diagnosis.get("estimated_cost_range", {}).get("min", 0),
            "cost_max": diagnosis.get("estimated_cost_range", {}).get("max", 0),
            "recommended_action": diagnosis.get("recommended_actions", [{}])[0].get("action", "Schedule service"),
            "nearest_center": "AutoSentry Service Center - Downtown",
            "suggested_date": (datetime.utcnow() + timedelta(days=1)).strftime("%B %d, %Y"),
            "suggested_time": "10:00 AM",
            "confirmation_link": f"https://autosentry.ai/confirm/{vehicle_id}",
            "booking_link": f"https://autosentry.ai/book/{vehicle_id}",
            "short_link": f"https://asai.io/{vehicle_id[:6]}",
            "available_slots": self._format_available_slots()
        }
        
        # Send notification
        result = await self._send_notification({
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "notification_type": notification_config["type"],
            "priority": notification_config["priority"],
            "template": notification_config["template"],
            "template_data": template_data,
            "channels": notification_config["channels"]
        })
        
        # Schedule follow-up if needed
        follow_up = None
        if severity in ["critical", "major"]:
            follow_up = await self._schedule_follow_up(
                customer_id, vehicle_id, 
                hours=notification_config.get("follow_up_hours", 24)
            )
        
        return {
            "engagement_type": engagement_type,
            "notification_result": result,
            "follow_up_scheduled": follow_up is not None,
            "follow_up_details": follow_up,
            "customer_contacted": result.get("status") == "sent"
        }
    
    def _get_notification_config(self, severity: str, diagnosis: Dict) -> Dict:
        """Get notification configuration based on severity"""
        configs = {
            "critical": {
                "template": "critical_alert",
                "type": "alert",
                "priority": "critical",
                "channels": ["push", "sms", "email", "in_app"],
                "follow_up_hours": 4
            },
            "major": {
                "template": "high_priority_alert",
                "type": "alert",
                "priority": "high",
                "channels": ["push", "email", "in_app"],
                "follow_up_hours": 24
            },
            "moderate": {
                "template": "maintenance_reminder",
                "type": "reminder",
                "priority": "medium",
                "channels": ["email", "in_app"],
                "follow_up_hours": 72
            },
            "minor": {
                "template": "maintenance_reminder",
                "type": "reminder",
                "priority": "low",
                "channels": ["in_app"],
                "follow_up_hours": 168  # 1 week
            }
        }
        return configs.get(severity, configs["minor"])
    
    def _format_diagnosis_summary(self, diagnosis: Dict) -> str:
        """Format diagnosis for notification"""
        lines = []
        
        if diagnosis.get("root_causes"):
            lines.append("Probable Causes:")
            for cause in diagnosis["root_causes"][:3]:
                probability = int(cause.get("probability", 0) * 100)
                lines.append(f"  • {cause.get('cause')} ({probability}% likely)")
        
        if diagnosis.get("dtc_codes"):
            lines.append(f"\nDiagnostic Codes: {', '.join(diagnosis['dtc_codes'][:3])}")
        
        return "\n".join(lines) if lines else "No specific diagnosis available"
    
    def _format_recommended_actions(self, actions: List[Dict]) -> str:
        """Format recommended actions for notification"""
        if not actions:
            return "• Schedule vehicle inspection"
        
        lines = []
        for idx, action in enumerate(actions[:5], 1):
            priority_icon = "🔴" if action.get("priority", 3) <= 2 else "🟡" if action.get("priority", 3) <= 3 else "🟢"
            lines.append(f"{idx}. {priority_icon} {action.get('action', 'Service required')}")
            if action.get("estimated_cost"):
                lines.append(f"   Estimated cost: ${action['estimated_cost']}")
        
        return "\n".join(lines)
    
    def _format_available_slots(self) -> str:
        """Format available appointment slots"""
        now = datetime.utcnow()
        slots = []
        
        for i in range(3):
            date = now + timedelta(days=i+1)
            slots.append(f"• {date.strftime('%A, %B %d')}: 9:00 AM, 2:00 PM, 4:00 PM")
        
        return "\n".join(slots)
    
    async def _get_customer_profile(self, customer_id: str) -> Optional[CustomerProfile]:
        """Get customer profile from backend"""
        # In production, this would fetch from the backend
        # For demo, return mock profile
        return CustomerProfile(
            customer_id=customer_id,
            name="John Doe",
            email=f"{customer_id}@example.com",
            phone="+1-555-0123",
            preferred_channel=NotificationChannel.EMAIL,
            preferred_language="en",
            notification_preferences={
                "alerts": True,
                "reminders": True,
                "promotions": True,
                "surveys": True
            },
            vehicle_ids=[customer_id.replace("CUST", "VH")]
        )
    
    def _check_notification_preferences(self, customer: CustomerProfile, notification_type: str) -> bool:
        """Check if customer has enabled this notification type"""
        type_map = {
            "alert": "alerts",
            "reminder": "reminders",
            "promotion": "promotions",
            "survey": "surveys",
            "confirmation": "alerts",
            "update": "alerts"
        }
        pref_key = type_map.get(notification_type, "alerts")
        return customer.notification_preferences.get(pref_key, True)
    
    def _check_rate_limit(self, customer_id: str, channels: List[str]) -> bool:
        """Check if rate limit is exceeded"""
        history = self._notification_history.get(customer_id, [])
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        recent = [n for n in history if datetime.fromisoformat(n.timestamp) > one_hour_ago]
        
        for channel_str in channels:
            channel = NotificationChannel(channel_str)
            channel_count = sum(1 for n in recent if n.channel == channel)
            if channel_count >= self.rate_limits.get(channel, 10):
                return False
        
        return True
    
    def _generate_content(self, template_name: str, channel: NotificationChannel, data: Dict) -> Dict:
        """Generate notification content from template"""
        template = self.templates.get(template_name, self.templates["maintenance_reminder"])
        
        if channel == NotificationChannel.SMS:
            body = template.get("sms", template.get("body", ""))
        else:
            body = template.get("body", "")
        
        subject = template.get("subject", "AutoSentry Notification")
        
        # Replace placeholders
        for key, value in data.items():
            placeholder = "{" + key + "}"
            subject = subject.replace(placeholder, str(value))
            body = body.replace(placeholder, str(value))
        
        return {"subject": subject, "body": body}
    
    async def _deliver_notification(self, notification: Notification) -> Dict:
        """Deliver notification through appropriate channel"""
        # In production, this would call actual notification services
        # (SendGrid for email, Twilio for SMS, Firebase for push, etc.)
        
        # Simulate delivery
        await asyncio.sleep(0.1)
        
        notification.delivered = True
        
        return {
            "delivered": True,
            "message_id": f"MSG-{notification.notification_id}",
            "channel": notification.channel.value,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _track_notification(self, customer_id: str, notification: Notification) -> None:
        """Track notification for history and analytics"""
        if customer_id not in self._notification_history:
            self._notification_history[customer_id] = []
        
        self._notification_history[customer_id].append(notification)
        
        # Keep last 100 notifications per customer
        if len(self._notification_history[customer_id]) > 100:
            self._notification_history[customer_id] = self._notification_history[customer_id][-100:]
    
    async def _schedule_follow_up(self, customer_id: str, vehicle_id: str, hours: int) -> Dict:
        """Schedule a follow-up notification"""
        follow_up_time = datetime.utcnow() + timedelta(hours=hours)
        
        return {
            "scheduled_for": follow_up_time.isoformat(),
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "type": "follow_up_reminder",
            "message": f"Follow-up scheduled for {follow_up_time.strftime('%B %d at %I:%M %p')}"
        }
    
    async def _monitor_engagement(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor customer engagement metrics"""
        customer_id = payload.get("customer_id")
        
        history = self._notification_history.get(customer_id, [])
        
        if not history:
            return {
                "customer_id": customer_id,
                "total_notifications": 0,
                "engagement_rate": 0
            }
        
        total = len(history)
        delivered = sum(1 for n in history if n.delivered)
        read = sum(1 for n in history if n.read)
        
        by_channel = {}
        for channel in NotificationChannel:
            channel_notifs = [n for n in history if n.channel == channel]
            if channel_notifs:
                by_channel[channel.value] = {
                    "total": len(channel_notifs),
                    "delivered": sum(1 for n in channel_notifs if n.delivered),
                    "read": sum(1 for n in channel_notifs if n.read)
                }
        
        return {
            "customer_id": customer_id,
            "total_notifications": total,
            "delivered": delivered,
            "delivery_rate": delivered / total if total > 0 else 0,
            "read": read,
            "engagement_rate": read / delivered if delivered > 0 else 0,
            "by_channel": by_channel,
            "last_notification": history[-1].timestamp if history else None
        }
    
    async def send_appointment_confirmation(
        self, customer_id: str, vehicle_id: str, appointment_details: Dict
    ) -> Dict[str, Any]:
        """Send appointment confirmation notification"""
        template_data = {
            "vehicle_name": appointment_details.get("vehicle_name", f"Vehicle {vehicle_id}"),
            "vehicle_id": vehicle_id,
            "appointment_date": appointment_details.get("date", "TBD"),
            "appointment_time": appointment_details.get("time", "TBD"),
            "service_center": appointment_details.get("center_name", "AutoSentry Service Center"),
            "center_address": appointment_details.get("center_address", "123 Main St"),
            "services_list": self._format_services_list(appointment_details.get("services", [])),
            "estimated_cost": appointment_details.get("estimated_cost", 0),
            "estimated_duration": appointment_details.get("estimated_duration", "2-3 hours"),
            "directions_link": f"https://maps.google.com/?q={appointment_details.get('center_address', '')}",
            "reschedule_link": f"https://autosentry.ai/reschedule/{appointment_details.get('appointment_id', '')}",
            "cancel_link": f"https://autosentry.ai/cancel/{appointment_details.get('appointment_id', '')}",
            "short_link": f"https://asai.io/a{appointment_details.get('appointment_id', '')[:6]}"
        }
        
        return await self._send_notification({
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "notification_type": "confirmation",
            "priority": "medium",
            "template": "appointment_confirmation",
            "template_data": template_data,
            "channels": ["email", "sms", "in_app"]
        })
    
    def _format_services_list(self, services: List[str]) -> str:
        """Format list of services for notification"""
        if not services:
            return "• General inspection and maintenance"
        return "\n".join([f"• {service}" for service in services])
    
    async def send_service_complete(
        self, customer_id: str, vehicle_id: str, service_details: Dict
    ) -> Dict[str, Any]:
        """Send service completion notification"""
        template_data = {
            "vehicle_name": service_details.get("vehicle_name", f"Vehicle {vehicle_id}"),
            "vehicle_id": vehicle_id,
            "services_performed": self._format_services_list(service_details.get("services", [])),
            "health_score": service_details.get("health_score", 100),
            "next_service_date": service_details.get("next_service_date", "TBD"),
            "next_service_mileage": service_details.get("next_service_mileage", 0),
            "final_cost": service_details.get("final_cost", 0),
            "invoice_link": f"https://autosentry.ai/invoice/{service_details.get('service_id', '')}",
            "service_center": service_details.get("center_name", "AutoSentry Service Center"),
            "center_phone": service_details.get("center_phone", "1-800-AUTO-HELP"),
            "pickup_hours": service_details.get("pickup_hours", "8:00 AM - 6:00 PM"),
            "survey_link": f"https://autosentry.ai/feedback/{service_details.get('service_id', '')}",
            "short_link": f"https://asai.io/s{service_details.get('service_id', '')[:6]}"
        }
        
        return await self._send_notification({
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "notification_type": "update",
            "priority": "medium",
            "template": "service_complete",
            "template_data": template_data,
            "channels": ["email", "push", "in_app"]
        })


# Standalone execution for testing
if __name__ == "__main__":
    async def test():
        agent = CustomerEngagementAgent()
        
        # Test engaging customer with diagnosis
        diagnosis = {
            "primary_issue": "Engine temperature elevated - cooling system inspection needed",
            "severity": "major",
            "health_score": 65,
            "root_causes": [
                {"cause": "Coolant leak", "probability": 0.35},
                {"cause": "Thermostat failure", "probability": 0.25}
            ],
            "dtc_codes": ["P0217", "P0115"],
            "recommended_actions": [
                {"action": "Inspect cooling system", "priority": 2, "estimated_cost": 150},
                {"action": "Replace thermostat if faulty", "priority": 3, "estimated_cost": 300}
            ],
            "estimated_repair_time": "2-3 hours",
            "estimated_cost_range": {"min": 200, "max": 500}
        }
        
        task = AgentTask(
            task_id="test-engage-001",
            agent_type=AgentType.CUSTOMER_ENGAGEMENT,
            action=ActionType.ENGAGE,
            payload={
                "customer_id": "CUST001",
                "vehicle_id": "VH001",
                "vehicle_name": "2023 Tesla Model 3",
                "diagnosis": diagnosis,
                "engagement_type": "alert"
            }
        )
        
        result = await agent.execute(task)
        print(json.dumps(result.result, indent=2))
    
    asyncio.run(test())
