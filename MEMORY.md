# MEMORY.md — Persistent Context for Claude Code

Read this file at the start of each new Claude Code session to restore context.
Update it as significant decisions are made.

---

## Project Identity

- **Name:**SupplyMind
- **Purpose:** Agentic procurement intelligence — BytePlus internship assessment submission
- **Candidate:** Danylo Piatyhorets
- **Assessment option:** #4 — Enterprise GTM Research Agent
- **Deadline:** Friday evening

---

## Current Status

Update this section as blocks complete:

```
[ ] Block 1: Bootstrap
[ ] Block 2: Database + seed data
[ ] Block 3: Flask API skeleton (mocks)
[ ] Block 4: Frontend shell
[ ] Block 5: ModelArk integration
[ ] Block 6: Core agent logic
[ ] Block 7: Async parallelism scaffold
[ ] Block 8: Web search agent
[ ] Block 9: RAG pipeline
[ ] Block 10: VikingDB integration
[ ] Block 11: E2E test + polish
[ ] Block 12: Deployment
[ ] Block 13: README
[ ] Block 14: Demo prep
```

---

## Environment

- **OS:** macOS
- **Python:** 3.11+ (in venv at `backend/venv`)
- **Node:** latest LTS
- **Deployment:** Railway (backend) + Vercel (frontend)
- **Local DB:** PostgreSQL via Docker (`docker-compose up -d`)

---

## API Keys & Services

```
ModelArk: configured in .env as MODELARK_API_KEY
ModelArk endpoint ID: [fill in after creating endpoint]
ModelArk model: doubao-pro-32k or deepseek-v3-250324
ModelArk base URL: https://ark.ap-southeast.bytepluses.com/api/v3

VikingDB: [fill in AK/SK after console setup]
VikingDB status: [pending / configured / falling back to ChromaDB]

Web search: [Serper API key / using DuckDuckGo fallback]

OpenClaw: [pip installable: yes/no] [approach: full SDK / custom adapter]
```

---

## Key Design Decisions (update as made)

### Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | Use SSE polling fallback if async SSE too complex | Speed over elegance |
| 2 | ChromaDB as VikingDB fallback | Identical interface, zero setup |
| 3 | Seeded stale prices for data correction demo | Ensures corrections always appear |
| 4 | Mock-first, real-second on all agents | Demo always runs |

---

## Current Blockers

List anything blocking progress here. Update when resolved.

```
None yet
```

---

## File Locations

```
backend/
  app.py              ← Flask entry point (routes)
  config.py           ← env var loading, client instantiation
  agents/
    orchestrator.py   ← top-level agent
    web_search.py     ← market research agent
    rag_agent.py      ← document retrieval agent
    contract_agent.py ← optimizer + corrections
    synthesis.py      ← report builder
  skills/
    search_skill.py   ← search abstraction (OpenClaw/Serper/DDG)
    rag_skill.py      ← vector DB abstraction (VikingDB/Chroma)
  db/
    schema.sql
    seed.sql
  models/
    schemas.py        ← all Pydantic models

frontend/
  src/
    pages/
      HomePage.tsx
      AgentRunPage.tsx
      HITLPage.tsx
      ReportPage.tsx
    components/
      AgentTrace.tsx
      FlavourCards.tsx
      DataCorrections.tsx
      PDFUpload.tsx
    api/client.ts
```

---

## Pydantic Models (source of truth)

```python
# All agents must conform to these schemas

class ResearchPlan(BaseModel):
    goal_summary: str
    research_questions: list[ResearchTask]
    optimization_strategies: list[str]
    key_risks: list[str]
    context: dict

class MarketData(BaseModel):
    supplier_name: str
    product: str
    unit_price: Optional[float]
    currency: str
    price_unit: str
    delivery_days: Optional[int]
    source_url: str
    retrieved_at: str
    confidence: float
    notes: str

class RAGResult(BaseModel):
    question: str
    answer: str
    citations: list[Citation]
    confidence: float
    gaps: str

class Correction(BaseModel):
    contract_id: int
    field: str
    current_value: float
    market_value: float
    delta_pct: float
    severity: Literal["low", "medium", "high"]
    recommendation: Literal["renegotiate", "replace", "monitor"]

class Flavour(BaseModel):
    label: str
    description: str
    selected_contracts: list[int]
    total_cost: float
    delivery_days: int
    risk_score: float
    savings_vs_current: float

class AnalysisReport(BaseModel):
    job_id: str
    executive_summary: str
    market_intelligence: dict
    document_insights: dict
    flavours: dict[str, Flavour]
    data_corrections: list[Correction]
    recommended_variant: str
    recommendation_rationale: str
    risks_and_mitigations: list[dict]
    next_steps: list[str]
    report_metadata: dict
```

---

## SSE Event Types

```python
# All agents emit these event types to the trace stream
PLAN         = "PLAN"           # orchestrator decomposed the goal
SEARCHING    = "SEARCHING"      # web search agent started
RAG_QUERY    = "RAG_QUERY"      # RAG agent querying VikingDB
ANALYZING    = "ANALYZING"      # contract agent running
CORRECTING   = "CORRECTING"     # data correction pass running
SYNTHESIZING = "SYNTHESIZING"   # synthesis agent started
COMPLETE     = "COMPLETE"       # all agents done, report ready
ERROR        = "ERROR"          # something failed (non-fatal)
```

---

## Demo Script

The exact flow to demonstrate to judges:

1. Open `[deployed URL]`
2. Type goal: *"Find the best EU steel supplier for Q3 2025. We need 500 tonnes at the lowest risk."*
3. Upload `demo-procurement-report.pdf` (pre-downloaded, in repo root)
4. Click "Run Agent"
5. Watch trace panel: show PLAN → SEARCHING + RAG_QUERY + ANALYZING (parallel) → SYNTHESIZING → COMPLETE
6. Scroll to FlavourCards — point out the three variants
7. Click on DataCorrections — show the 2 stale contract flags
8. Select "Lowest Risk" flavour
9. Click "Approve"
10. Show the final report — point out citations from the PDF

**Talking points:**
- "Notice the timestamps — web search and RAG ran simultaneously"
- "This correction identified a contract that's 14% above market rate"
- "Everything is auditable — the agent trace is persisted"
- "The model is BytePlus Doubao-pro-32k, running on ModelArk"
