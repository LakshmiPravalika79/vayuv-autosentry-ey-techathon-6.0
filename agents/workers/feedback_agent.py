"""
AutoSentry AI - Feedback Agent
Collects and analyzes customer feedback after service
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


class FeedbackType(Enum):
    """Types of feedback"""
    SERVICE_RATING = "service_rating"
    NPS = "nps"  # Net Promoter Score
    SURVEY = "survey"
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"
    COMPLIMENT = "compliment"


class SentimentCategory(Enum):
    """Sentiment categories"""
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"


@dataclass
class FeedbackEntry:
    """Customer feedback entry"""
    feedback_id: str
    customer_id: str
    vehicle_id: str
    service_id: Optional[str]
    feedback_type: FeedbackType
    rating: Optional[int]  # 1-5 for ratings, 0-10 for NPS
    sentiment: SentimentCategory
    comment: str
    categories: List[str]
    keywords: List[str]
    timestamp: str
    source: str  # email, app, sms, call
    processed: bool = False
    follow_up_required: bool = False
    follow_up_completed: bool = False


@dataclass
class FeedbackAnalysis:
    """Aggregated feedback analysis"""
    period_start: str
    period_end: str
    total_responses: int
    average_rating: float
    nps_score: float
    sentiment_distribution: Dict[str, int]
    top_positive_themes: List[Dict[str, Any]]
    top_negative_themes: List[Dict[str, Any]]
    improvement_suggestions: List[str]


class FeedbackAgent:
    """
    Feedback Agent - Worker Agent #5
    
    Responsibilities:
    - Collect customer feedback after service
    - Analyze sentiment from feedback text
    - Calculate NPS and satisfaction scores
    - Identify trends and patterns
    - Flag issues requiring follow-up
    - Generate improvement recommendations
    - Close the feedback loop with customers
    """
    
    def __init__(self):
        self.agent_type = AgentType.FEEDBACK
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:3000")
        
        # Feedback storage
        self._feedback_store: Dict[str, FeedbackEntry] = {}
        
        # Keywords for sentiment analysis
        self.positive_keywords = [
            "excellent", "great", "amazing", "wonderful", "fantastic",
            "professional", "friendly", "quick", "efficient", "thorough",
            "helpful", "knowledgeable", "satisfied", "recommend", "best",
            "clean", "organized", "timely", "honest", "fair"
        ]
        
        self.negative_keywords = [
            "terrible", "awful", "horrible", "worst", "poor",
            "rude", "slow", "expensive", "overcharged", "incompetent",
            "unprofessional", "dirty", "late", "dishonest", "disappointed",
            "frustrated", "angry", "unacceptable", "never", "avoid"
        ]
        
        # Category keywords
        self.category_keywords = {
            "service_quality": ["service", "work", "repair", "job", "quality", "fixed"],
            "staff": ["staff", "technician", "mechanic", "employee", "person", "team"],
            "pricing": ["price", "cost", "expensive", "cheap", "fair", "overcharge", "value"],
            "timeliness": ["time", "wait", "quick", "slow", "late", "early", "on time"],
            "communication": ["communication", "explain", "informed", "update", "call", "text"],
            "facility": ["clean", "comfortable", "waiting", "area", "facility", "location"],
            "booking": ["appointment", "booking", "schedule", "available", "convenient"]
        }
        
        # Survey questions
        self.survey_questions = [
            {
                "id": "q1",
                "question": "How satisfied are you with the service you received?",
                "type": "rating",
                "scale": 5
            },
            {
                "id": "q2",
                "question": "How likely are you to recommend AutoSentry to a friend or colleague?",
                "type": "nps",
                "scale": 10
            },
            {
                "id": "q3",
                "question": "Was the service completed in a timely manner?",
                "type": "rating",
                "scale": 5
            },
            {
                "id": "q4",
                "question": "How would you rate the communication from our team?",
                "type": "rating",
                "scale": 5
            },
            {
                "id": "q5",
                "question": "Was the final cost in line with the estimate provided?",
                "type": "yes_no"
            },
            {
                "id": "q6",
                "question": "What could we do to improve your experience?",
                "type": "open_text"
            },
            {
                "id": "q7",
                "question": "Would you use AutoSentry AI again?",
                "type": "yes_no"
            }
        ]
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """Execute feedback task"""
        start_time = datetime.utcnow()
        
        try:
            action = task.action
            payload = task.payload
            
            if action == ActionType.COLLECT:
                result = await self._collect_feedback(payload)
            elif action == ActionType.ANALYZE:
                result = await self._analyze_feedback(payload)
            elif action == ActionType.MONITOR:
                result = await self._monitor_feedback(payload)
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
    
    async def _collect_feedback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Collect and process customer feedback"""
        customer_id = payload.get("customer_id")
        vehicle_id = payload.get("vehicle_id")
        service_id = payload.get("service_id")
        feedback_type = payload.get("feedback_type", "service_rating")
        rating = payload.get("rating")
        nps_score = payload.get("nps_score")
        comment = payload.get("comment", "")
        survey_responses = payload.get("survey_responses", {})
        source = payload.get("source", "app")
        
        if not customer_id:
            return {"error": "Missing customer_id"}
        
        # Generate feedback ID
        feedback_id = f"FB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{customer_id[:6]}"
        
        # Analyze sentiment
        sentiment = self._analyze_sentiment(comment, rating, nps_score)
        
        # Extract categories and keywords
        categories = self._extract_categories(comment)
        keywords = self._extract_keywords(comment)
        
        # Determine if follow-up is required
        follow_up_required = self._check_follow_up_required(sentiment, rating, comment)
        
        # Create feedback entry
        entry = FeedbackEntry(
            feedback_id=feedback_id,
            customer_id=customer_id,
            vehicle_id=vehicle_id,
            service_id=service_id,
            feedback_type=FeedbackType(feedback_type),
            rating=rating,
            sentiment=sentiment,
            comment=comment,
            categories=categories,
            keywords=keywords,
            timestamp=datetime.utcnow().isoformat(),
            source=source,
            processed=True,
            follow_up_required=follow_up_required
        )
        
        # Store feedback
        self._feedback_store[feedback_id] = entry
        
        # Process survey responses if provided
        survey_analysis = None
        if survey_responses:
            survey_analysis = self._analyze_survey_responses(survey_responses)
        
        # Generate response actions
        actions = self._generate_response_actions(entry)
        
        return {
            "feedback_id": feedback_id,
            "customer_id": customer_id,
            "vehicle_id": vehicle_id,
            "service_id": service_id,
            "feedback_received": True,
            "sentiment": sentiment.value,
            "rating": rating,
            "categories": categories,
            "keywords": keywords,
            "follow_up_required": follow_up_required,
            "survey_analysis": survey_analysis,
            "response_actions": actions,
            "thank_you_sent": True,
            "triggers_rca": sentiment in [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]
        }
    
    def _analyze_sentiment(
        self, comment: str, rating: Optional[int], nps_score: Optional[int]
    ) -> SentimentCategory:
        """Analyze sentiment from feedback"""
        comment_lower = comment.lower()
        
        # Count positive and negative keywords
        positive_count = sum(1 for kw in self.positive_keywords if kw in comment_lower)
        negative_count = sum(1 for kw in self.negative_keywords if kw in comment_lower)
        
        # Calculate text sentiment score (-1 to 1)
        total_keywords = positive_count + negative_count
        if total_keywords > 0:
            text_score = (positive_count - negative_count) / total_keywords
        else:
            text_score = 0
        
        # Factor in rating (convert to -1 to 1 scale)
        rating_score = 0
        if rating is not None:
            rating_score = (rating - 3) / 2  # 1=-1, 3=0, 5=1
        
        # Factor in NPS (convert to -1 to 1 scale)
        nps_contribution = 0
        if nps_score is not None:
            nps_contribution = (nps_score - 5) / 5  # 0=-1, 5=0, 10=1
        
        # Weighted average
        weights = []
        scores = []
        
        if comment:
            weights.append(0.4)
            scores.append(text_score)
        if rating is not None:
            weights.append(0.4)
            scores.append(rating_score)
        if nps_score is not None:
            weights.append(0.2)
            scores.append(nps_contribution)
        
        if not weights:
            return SentimentCategory.NEUTRAL
        
        total_weight = sum(weights)
        final_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
        
        # Map to category
        if final_score > 0.6:
            return SentimentCategory.VERY_POSITIVE
        elif final_score > 0.2:
            return SentimentCategory.POSITIVE
        elif final_score > -0.2:
            return SentimentCategory.NEUTRAL
        elif final_score > -0.6:
            return SentimentCategory.NEGATIVE
        else:
            return SentimentCategory.VERY_NEGATIVE
    
    def _extract_categories(self, comment: str) -> List[str]:
        """Extract feedback categories from comment"""
        comment_lower = comment.lower()
        categories = []
        
        for category, keywords in self.category_keywords.items():
            if any(kw in comment_lower for kw in keywords):
                categories.append(category)
        
        return categories if categories else ["general"]
    
    def _extract_keywords(self, comment: str) -> List[str]:
        """Extract significant keywords from comment"""
        comment_lower = comment.lower()
        found_keywords = []
        
        # Check positive keywords
        for kw in self.positive_keywords:
            if kw in comment_lower:
                found_keywords.append(kw)
        
        # Check negative keywords
        for kw in self.negative_keywords:
            if kw in comment_lower:
                found_keywords.append(kw)
        
        return found_keywords[:10]  # Limit to top 10
    
    def _check_follow_up_required(
        self, sentiment: SentimentCategory, rating: Optional[int], comment: str
    ) -> bool:
        """Determine if follow-up is required"""
        # Follow up on negative feedback
        if sentiment in [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]:
            return True
        
        # Follow up on low ratings
        if rating is not None and rating <= 2:
            return True
        
        # Follow up on complaints
        complaint_indicators = ["complaint", "issue", "problem", "disappointed", "unacceptable"]
        if any(ind in comment.lower() for ind in complaint_indicators):
            return True
        
        return False
    
    def _analyze_survey_responses(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze survey responses"""
        analysis = {
            "questions_answered": len(responses),
            "satisfaction_scores": {},
            "nps_response": None,
            "open_feedback": [],
            "yes_no_responses": {}
        }
        
        for q_id, response in responses.items():
            question = next((q for q in self.survey_questions if q["id"] == q_id), None)
            if not question:
                continue
            
            if question["type"] == "rating":
                analysis["satisfaction_scores"][q_id] = {
                    "question": question["question"],
                    "score": response,
                    "max_score": question["scale"]
                }
            elif question["type"] == "nps":
                analysis["nps_response"] = {
                    "score": response,
                    "category": self._categorize_nps(response)
                }
            elif question["type"] == "yes_no":
                analysis["yes_no_responses"][q_id] = {
                    "question": question["question"],
                    "response": response
                }
            elif question["type"] == "open_text":
                analysis["open_feedback"].append({
                    "question": question["question"],
                    "response": response
                })
        
        return analysis
    
    def _categorize_nps(self, score: int) -> str:
        """Categorize NPS score"""
        if score >= 9:
            return "promoter"
        elif score >= 7:
            return "passive"
        else:
            return "detractor"
    
    def _generate_response_actions(self, feedback: FeedbackEntry) -> List[Dict[str, Any]]:
        """Generate appropriate response actions"""
        actions = []
        
        # Always send thank you
        actions.append({
            "action": "send_thank_you",
            "priority": 1,
            "template": "feedback_thank_you",
            "completed": True
        })
        
        if feedback.sentiment == SentimentCategory.VERY_POSITIVE:
            actions.append({
                "action": "request_review",
                "priority": 2,
                "template": "request_google_review",
                "completed": False
            })
            actions.append({
                "action": "consider_referral_program",
                "priority": 3,
                "template": "referral_offer",
                "completed": False
            })
        
        elif feedback.sentiment in [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]:
            actions.append({
                "action": "escalate_to_manager",
                "priority": 1,
                "assignee": "service_manager",
                "completed": False
            })
            actions.append({
                "action": "schedule_follow_up_call",
                "priority": 1,
                "deadline_hours": 24,
                "completed": False
            })
            actions.append({
                "action": "create_rca_ticket",
                "priority": 2,
                "completed": False
            })
        
        elif feedback.follow_up_required:
            actions.append({
                "action": "schedule_follow_up",
                "priority": 2,
                "deadline_hours": 48,
                "completed": False
            })
        
        return actions
    
    async def _analyze_feedback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze aggregated feedback"""
        period_days = payload.get("period_days", 30)
        center_id = payload.get("center_id")
        vehicle_id = payload.get("vehicle_id")
        customer_id = payload.get("customer_id")
        
        # Filter feedback
        now = datetime.utcnow()
        period_start = now - timedelta(days=period_days)
        
        feedback_list = []
        for fb in self._feedback_store.values():
            fb_time = datetime.fromisoformat(fb.timestamp)
            if fb_time < period_start:
                continue
            if vehicle_id and fb.vehicle_id != vehicle_id:
                continue
            if customer_id and fb.customer_id != customer_id:
                continue
            feedback_list.append(fb)
        
        if not feedback_list:
            return {
                "period_days": period_days,
                "total_responses": 0,
                "message": "No feedback found for the specified period"
            }
        
        # Calculate metrics
        ratings = [fb.rating for fb in feedback_list if fb.rating is not None]
        avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        # Calculate NPS
        nps_scores = [fb.rating for fb in feedback_list 
                      if fb.feedback_type == FeedbackType.NPS and fb.rating is not None]
        nps = self._calculate_nps(nps_scores)
        
        # Sentiment distribution
        sentiment_dist = {}
        for sentiment in SentimentCategory:
            count = sum(1 for fb in feedback_list if fb.sentiment == sentiment)
            sentiment_dist[sentiment.value] = count
        
        # Category analysis
        category_counts = {}
        for fb in feedback_list:
            for cat in fb.categories:
                category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Keyword frequency
        keyword_counts = {}
        for fb in feedback_list:
            for kw in fb.keywords:
                keyword_counts[kw] = keyword_counts.get(kw, 0) + 1
        
        # Identify themes
        positive_themes = self._identify_themes(feedback_list, positive=True)
        negative_themes = self._identify_themes(feedback_list, positive=False)
        
        # Generate improvement suggestions
        suggestions = self._generate_improvement_suggestions(
            feedback_list, category_counts, negative_themes
        )
        
        # Trend analysis
        trends = self._analyze_trends(feedback_list, period_days)
        
        return {
            "period": {
                "start": period_start.isoformat(),
                "end": now.isoformat(),
                "days": period_days
            },
            "total_responses": len(feedback_list),
            "metrics": {
                "average_rating": round(avg_rating, 2),
                "nps_score": nps,
                "response_rate": self._estimate_response_rate(len(feedback_list), period_days)
            },
            "sentiment_distribution": sentiment_dist,
            "category_breakdown": dict(sorted(category_counts.items(), key=lambda x: x[1], reverse=True)),
            "top_keywords": dict(sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
            "positive_themes": positive_themes,
            "negative_themes": negative_themes,
            "improvement_suggestions": suggestions,
            "trends": trends,
            "follow_ups_pending": sum(1 for fb in feedback_list if fb.follow_up_required and not fb.follow_up_completed)
        }
    
    def _calculate_nps(self, scores: List[int]) -> float:
        """Calculate Net Promoter Score"""
        if not scores:
            return 0
        
        promoters = sum(1 for s in scores if s >= 9)
        detractors = sum(1 for s in scores if s <= 6)
        total = len(scores)
        
        return round(((promoters - detractors) / total) * 100, 1)
    
    def _identify_themes(self, feedback_list: List[FeedbackEntry], positive: bool) -> List[Dict[str, Any]]:
        """Identify common themes in feedback"""
        target_sentiments = (
            [SentimentCategory.POSITIVE, SentimentCategory.VERY_POSITIVE]
            if positive
            else [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]
        )
        
        filtered = [fb for fb in feedback_list if fb.sentiment in target_sentiments]
        
        # Aggregate categories and keywords
        theme_data = {}
        for fb in filtered:
            for cat in fb.categories:
                if cat not in theme_data:
                    theme_data[cat] = {"count": 0, "keywords": {}, "examples": []}
                theme_data[cat]["count"] += 1
                
                for kw in fb.keywords:
                    theme_data[cat]["keywords"][kw] = theme_data[cat]["keywords"].get(kw, 0) + 1
                
                if len(theme_data[cat]["examples"]) < 3 and fb.comment:
                    theme_data[cat]["examples"].append(fb.comment[:100])
        
        # Format themes
        themes = []
        for cat, data in sorted(theme_data.items(), key=lambda x: x[1]["count"], reverse=True)[:5]:
            top_keywords = sorted(data["keywords"].items(), key=lambda x: x[1], reverse=True)[:5]
            themes.append({
                "category": cat,
                "count": data["count"],
                "percentage": round(data["count"] / len(filtered) * 100, 1) if filtered else 0,
                "top_keywords": [kw for kw, _ in top_keywords],
                "example_comments": data["examples"]
            })
        
        return themes
    
    def _generate_improvement_suggestions(
        self, feedback_list: List[FeedbackEntry],
        category_counts: Dict[str, int],
        negative_themes: List[Dict]
    ) -> List[str]:
        """Generate improvement suggestions based on feedback"""
        suggestions = []
        
        # Based on negative themes
        for theme in negative_themes:
            cat = theme["category"]
            if cat == "timeliness":
                suggestions.append("Consider optimizing appointment scheduling to reduce wait times")
            elif cat == "pricing":
                suggestions.append("Review pricing transparency and provide more detailed estimates upfront")
            elif cat == "communication":
                suggestions.append("Implement proactive status updates during service")
            elif cat == "staff":
                suggestions.append("Provide additional customer service training for staff")
            elif cat == "facility":
                suggestions.append("Evaluate facility cleanliness and waiting area comfort")
            elif cat == "booking":
                suggestions.append("Improve appointment availability and booking process")
        
        # Based on overall satisfaction
        low_ratings = [fb for fb in feedback_list if fb.rating and fb.rating <= 2]
        if len(low_ratings) > len(feedback_list) * 0.1:  # More than 10% low ratings
            suggestions.append("Investigate root causes of low satisfaction scores")
        
        # Limit suggestions
        return list(set(suggestions))[:5]
    
    def _analyze_trends(self, feedback_list: List[FeedbackEntry], period_days: int) -> Dict[str, Any]:
        """Analyze feedback trends over time"""
        if period_days <= 7:
            bucket_days = 1
        elif period_days <= 30:
            bucket_days = 7
        else:
            bucket_days = 30
        
        # Group by time buckets
        buckets = {}
        for fb in feedback_list:
            fb_date = datetime.fromisoformat(fb.timestamp).date()
            bucket_start = fb_date - timedelta(days=fb_date.day % bucket_days)
            bucket_key = bucket_start.isoformat()
            
            if bucket_key not in buckets:
                buckets[bucket_key] = {"ratings": [], "sentiments": []}
            
            if fb.rating:
                buckets[bucket_key]["ratings"].append(fb.rating)
            buckets[bucket_key]["sentiments"].append(fb.sentiment.value)
        
        # Calculate trends
        trend_data = []
        for bucket_key in sorted(buckets.keys()):
            data = buckets[bucket_key]
            avg_rating = sum(data["ratings"]) / len(data["ratings"]) if data["ratings"] else 0
            positive_pct = sum(1 for s in data["sentiments"] if s in ["positive", "very_positive"]) / len(data["sentiments"]) * 100
            
            trend_data.append({
                "period": bucket_key,
                "average_rating": round(avg_rating, 2),
                "positive_sentiment_percentage": round(positive_pct, 1),
                "response_count": len(data["ratings"])
            })
        
        # Determine overall trend
        if len(trend_data) >= 2:
            first_rating = trend_data[0]["average_rating"]
            last_rating = trend_data[-1]["average_rating"]
            if last_rating > first_rating + 0.2:
                direction = "improving"
            elif last_rating < first_rating - 0.2:
                direction = "declining"
            else:
                direction = "stable"
        else:
            direction = "insufficient_data"
        
        return {
            "bucket_days": bucket_days,
            "data_points": trend_data,
            "direction": direction
        }
    
    def _estimate_response_rate(self, responses: int, days: int) -> float:
        """Estimate response rate (placeholder - would need total service count)"""
        # Assume roughly 10 services per day for demo
        estimated_services = days * 10
        return round(min(responses / estimated_services * 100, 100), 1)
    
    async def _monitor_feedback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Monitor feedback status and pending actions"""
        hours = payload.get("hours", 24)
        
        now = datetime.utcnow()
        cutoff = now - timedelta(hours=hours)
        
        recent_feedback = [
            fb for fb in self._feedback_store.values()
            if datetime.fromisoformat(fb.timestamp) > cutoff
        ]
        
        # Categorize
        pending_follow_ups = [
            self._feedback_to_dict(fb) for fb in recent_feedback
            if fb.follow_up_required and not fb.follow_up_completed
        ]
        
        negative_feedback = [
            self._feedback_to_dict(fb) for fb in recent_feedback
            if fb.sentiment in [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]
        ]
        
        positive_feedback = [
            self._feedback_to_dict(fb) for fb in recent_feedback
            if fb.sentiment in [SentimentCategory.POSITIVE, SentimentCategory.VERY_POSITIVE]
        ]
        
        return {
            "monitoring_period_hours": hours,
            "total_feedback": len(recent_feedback),
            "summary": {
                "positive": len(positive_feedback),
                "negative": len(negative_feedback),
                "pending_follow_ups": len(pending_follow_ups)
            },
            "pending_follow_ups": pending_follow_ups[:10],
            "recent_negative": negative_feedback[:5],
            "recent_positive": positive_feedback[:5],
            "alerts": self._generate_alerts(recent_feedback)
        }
    
    def _feedback_to_dict(self, fb: FeedbackEntry) -> Dict[str, Any]:
        """Convert feedback entry to dictionary"""
        return {
            "feedback_id": fb.feedback_id,
            "customer_id": fb.customer_id,
            "vehicle_id": fb.vehicle_id,
            "rating": fb.rating,
            "sentiment": fb.sentiment.value,
            "comment": fb.comment[:200] if fb.comment else "",
            "categories": fb.categories,
            "timestamp": fb.timestamp,
            "follow_up_required": fb.follow_up_required,
            "follow_up_completed": fb.follow_up_completed
        }
    
    def _generate_alerts(self, feedback_list: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Generate alerts for feedback monitoring"""
        alerts = []
        
        # Alert for high volume of negative feedback
        negative_count = sum(
            1 for fb in feedback_list 
            if fb.sentiment in [SentimentCategory.NEGATIVE, SentimentCategory.VERY_NEGATIVE]
        )
        if negative_count >= 3:
            alerts.append({
                "type": "high_negative_volume",
                "severity": "high",
                "message": f"{negative_count} negative feedback entries in monitoring period",
                "action_required": "Review and address customer concerns"
            })
        
        # Alert for overdue follow-ups
        overdue = sum(
            1 for fb in feedback_list
            if fb.follow_up_required and not fb.follow_up_completed
            and (datetime.utcnow() - datetime.fromisoformat(fb.timestamp)).total_seconds() > 86400
        )
        if overdue > 0:
            alerts.append({
                "type": "overdue_follow_ups",
                "severity": "medium",
                "message": f"{overdue} follow-ups are overdue (>24 hours)",
                "action_required": "Complete pending follow-ups"
            })
        
        return alerts
    
    def get_survey_questions(self) -> List[Dict[str, Any]]:
        """Get survey questions for customer feedback form"""
        return self.survey_questions


# Standalone execution for testing
if __name__ == "__main__":
    async def test():
        agent = FeedbackAgent()
        
        # Test collecting feedback
        task = AgentTask(
            task_id="test-feedback-001",
            agent_type=AgentType.FEEDBACK,
            action=ActionType.COLLECT,
            payload={
                "customer_id": "CUST001",
                "vehicle_id": "VH001",
                "service_id": "SVC001",
                "feedback_type": "service_rating",
                "rating": 4,
                "comment": "The service was quick and professional. The technician was knowledgeable and explained everything clearly. Only issue was the wait time was a bit longer than expected.",
                "source": "app"
            }
        )
        
        result = await agent.execute(task)
        print("=== Feedback Collection ===")
        print(json.dumps(result.result, indent=2))
        
        # Add more feedback for analysis
        for i in range(5):
            await agent._collect_feedback({
                "customer_id": f"CUST00{i+2}",
                "vehicle_id": f"VH00{i+2}",
                "feedback_type": "service_rating",
                "rating": 5 if i % 2 == 0 else 3,
                "comment": "Great service!" if i % 2 == 0 else "Service was okay but expensive",
                "source": "email"
            })
        
        # Test analysis
        analysis_task = AgentTask(
            task_id="test-analysis-001",
            agent_type=AgentType.FEEDBACK,
            action=ActionType.ANALYZE,
            payload={"period_days": 30}
        )
        
        analysis_result = await agent.execute(analysis_task)
        print("\n=== Feedback Analysis ===")
        print(json.dumps(analysis_result.result, indent=2))
    
    asyncio.run(test())
