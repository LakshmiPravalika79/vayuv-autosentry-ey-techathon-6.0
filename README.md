# AutoSentry AI — Autonomous Predictive Vehicle Maintenance System

**Team:** EverLearners  
**Project:** EY Techathon 6.0 - Problem Statement #3 (Automotive)

## 🚗 Overview

AutoSentry AI is a production-grade, autonomous predictive vehicle maintenance system that leverages agentic AI to monitor vehicle health, predict failures, schedule maintenance, and generate manufacturing quality insights.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Vehicle Fleet  │───▶│  Telematics API │───▶│    Backend      │
│  (10 Vehicles)  │    │  (Mock Service) │    │  (Express.js)   │
└─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                       │
                       ┌───────────────────────────────┼───────────────────────────────┐
                       │                               ▼                               │
                       │  ┌─────────────────┐    ┌─────────────────┐                   │
                       │  │   Redis Queue   │◀──▶│  Master Agent   │                   │
                       │  └─────────────────┘    └────────┬────────┘                   │
                       │                                  │                            │
                       │         ┌────────────────────────┼────────────────────────┐   │
                       │         ▼                        ▼                        ▼   │
                       │  ┌─────────────┐   ┌─────────────────────┐   ┌───────────┐   │
                       │  │ Data Agent  │   │ Customer Engagement │   │ Diagnosis │   │
                       │  └─────────────┘   │       Agent         │   │   Agent   │   │
                       │                    └─────────────────────┘   └───────────┘   │
                       │         ┌────────────────────────┼────────────────────────┐   │
                       │         ▼                        ▼                        ▼   │
                       │  ┌─────────────┐   ┌─────────────────────┐   ┌───────────┐   │
                       │  │  Scheduler  │   │   Feedback Agent    │   │   RCA/    │   │
                       │  │   Agent     │   │                     │   │   CAPA    │   │
                       │  └─────────────┘   └─────────────────────┘   └───────────┘   │
                       │                                                              │
                       │  AGENTIC AI LAYER (LangGraph/CrewAI/AutoGen/Builtin)        │
                       └──────────────────────────────┬───────────────────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       │                              ▼                              │
                       │  ┌─────────────┐    ┌─────────────────┐    ┌─────────────┐  │
                       │  │  ML Service │    │   UEBA Service  │    │   MinIO     │  │
                       │  │  (FastAPI)  │    │ (Anomaly Det.)  │    │  Storage    │  │
                       │  └─────────────┘    └─────────────────┘    └─────────────┘  │
                       │                                                             │
                       │  SERVICES LAYER                                             │
                       └─────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                       ┌─────────────────────────────────────────────────────────────┐
                       │                      React Frontend                         │
                       │  Dashboard | Telemetry | Alerts | Digital Twin | Booking   │
                       └─────────────────────────────────────────────────────────────┘
```

## 📁 Repository Structure

```
autosentry-ai/
├── frontend/          # React + Vite + TypeScript + TailwindCSS
├── backend/           # Express.js REST API (TypeScript)
├── ml_service/        # FastAPI ML prediction service
├── agents/            # Agentic AI system with adapters
├── ueba/              # UEBA anomaly detection service
├── data/              # Sample datasets and synthetic data
├── docs/              # Architecture diagrams, wireframes, documentation
├── demo/              # Demo scripts and narration
├── infra/             # Docker configurations
├── .env.example       # Environment template
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for local development)
- Git

### Option 1: Docker (Recommended)

```bash
# Clone the repository
cd autosentry-ai

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
# ML Service: http://localhost:5000
# UEBA Service: http://localhost:5001
```

### Option 2: Local Development

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### ML Service
```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --reload --port 5000
```

#### Agents
```bash
cd agents
pip install -r requirements.txt
python master_agent.py
```

#### UEBA Service
```bash
cd ueba
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

## 🔐 Environment Configuration

### ⚠️ IMPORTANT: Credential Setup

**Never commit your `.env` file to version control!**

1. Copy `.env.example` to `.env`
2. Configure the following:

#### Database Mode
```env
DATABASE_MODE=postgres  # Options: postgres | firebase
```

#### PostgreSQL (Default)
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/autosentry
```

#### Firebase (Optional)
To use Firebase:
1. Create a Firebase project at https://console.firebase.google.com
2. Go to Project Settings > Service Accounts
3. Generate a new private key (JSON file)
4. Save the JSON file to `./credentials/firebase-service-account.json`
5. Update `.env`:
```env
DATABASE_MODE=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CREDENTIALS_PATH=./credentials/firebase-service-account.json
```

#### LLM API Keys (Optional - for enhanced agent responses)
```env
LLM_ENABLED=true
LLM_API_KEY=your-openai-or-anthropic-key
```

**Where to get LLM keys:**
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/

#### Agent Framework Selection
```env
AGENT_FRAMEWORK=builtin  # Options: builtin | langgraph | crewai | autogen
```

## 🤖 Agentic AI System

### Master Agent (Orchestrator)
- Monitors real-time vehicle telemetry streams
- Coordinates all worker agents
- Routes all actions through UEBA for security
- Manages customer interaction workflows

### Worker Agents
1. **Data Analysis Agent** - Processes telemetry data, identifies patterns
2. **Diagnosis Agent** - Determines failure modes and root causes
3. **Customer Engagement Agent** - Handles chat and voice interactions
4. **Scheduling Agent** - Books service appointments
5. **Feedback Agent** - Collects and analyzes customer feedback
6. **RCA/CAPA Module** - Generates manufacturing quality insights

### Framework Adapters
The system supports multiple agentic AI frameworks:
- **Builtin** (default) - Custom lightweight orchestrator
- **LangGraph** - LangChain's graph-based agent framework
- **CrewAI** - Multi-agent collaboration framework
- **AutoGen** - Microsoft's multi-agent framework

See `docs/agent_frameworks.md` for detailed configuration.

## 🔒 UEBA Security Layer

User and Entity Behavior Analytics monitors all agent actions:
- IsolationForest-based anomaly detection
- Real-time scoring of agent behaviors
- Alert generation for suspicious activities

See `docs/ueba.md` for technical details.

## 📊 Data Sources

### Synthetic Data
- 10 simulated vehicles with realistic telemetry
- Generated using statistical models based on real-world patterns

### External Datasets
See `docs/datasets.md` for:
- Kaggle datasets used
- UCI ML Repository datasets
- HuggingFace datasets
- License information
- Data processing methodology

## 🔧 Training the ML Model

```bash
cd ml_service

# Using the training notebook
jupyter notebook notebooks/train_model.ipynb

# Or via API
curl -X POST http://localhost:5000/train
```

## 🎬 Running the Demo

```bash
cd demo
./run_demo.sh
```

Or manually:
```bash
# 1. Start services
docker compose up -d

# 2. Simulate telemetry
curl -X POST http://localhost:4000/api/telemetry/simulate

# 3. Trigger prediction
curl http://localhost:4000/api/predictions/vehicle/VH001

# 4. View UEBA alerts
curl http://localhost:5001/alerts

# 5. Check scheduled appointments
curl http://localhost:4000/api/scheduling/appointments
```

See `demo/demo_script.md` for a 3-4 minute narration guide.

## 📖 Documentation

- `docs/architecture.md` - System architecture (with diagram)
- `docs/flowchart.md` - End-to-end workflow
- `docs/wireframes/` - UI wireframes
- `docs/agent_frameworks.md` - Agent framework configuration
- `docs/ueba.md` - UEBA technical documentation
- `docs/datasets.md` - Data provenance and licensing
- `docs/submission_checklist.md` - EY Techathon submission checklist

## 🛠️ API Documentation

Swagger documentation available at:
- Backend: http://localhost:4000/api-docs
- ML Service: http://localhost:5000/docs
- UEBA Service: http://localhost:5001/docs

## 📝 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

- EY Techathon 6.0 organizers
- Open source dataset providers (see docs/datasets.md)
- LangGraph, CrewAI, and AutoGen communities

---

**Team EverLearners** - EY Techathon 6.0
