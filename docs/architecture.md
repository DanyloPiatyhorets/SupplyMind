# Architecture

## Agent Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        React / Vite Frontend                     │
│                                                                  │
│  [Goal Input + PDF Upload]   [Live Agent Trace]   [HITL Review] │
│                     │                │                  │        │
│              POST /api/run    SSE /api/trace    POST /api/approve│
└─────────────────────┼────────────────┼─────────────────-┼───────┘
                       │                │                  │
┌──────────────────────▼────────────────▼──────────────────▼──────┐
│                         Flask API Layer                          │
│                                                                  │
│  /api/run          →  spawns orchestrator, returns job_id        │
│  /api/trace/<id>   →  SSE stream of agent trace events           │
│  /api/upload-doc   →  chunks PDF, stores in VikingDB             │
│  /api/approve      →  commits selected flavour, triggers actions │
│  /api/report/<id>  →  returns final structured report            │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    ORCHESTRATOR AGENT                             │
│                    (orchestrator.py)                              │
│                                                                   │
│  Model: BytePlus ModelArk (Doubao-pro or DeepSeek-V3)             │
│  Framework: OpenClaw (wrapper if SDK thin)                        │
│                                                                   │
│  1. Receives: {goal, company_context, uploaded_doc_ids}           │
│  2. Calls model to decompose goal into research_questions[]       │
│  3. Emits: PLAN event to SSE trace                                │
│  4. Spawns 3 sub-agents IN PARALLEL via asyncio.gather()          │
│  5. Waits for all results                                         │
│  6. Calls synthesis agent                                         │
│  7. Emits: COMPLETE event                                         │
└────────────┬────────────────┬──────────────────┬─────────────────┘
             │                │                  │
    (parallel, asyncio.gather)
             │                │                  │
┌────────────▼───┐  ┌─────────▼──────┐  ┌────────▼───────────────┐
│  WEB SEARCH    │  │   RAG AGENT    │  │  CONTRACT ANALYSIS     │
│  AGENT         │  │                │  │  AGENT                 │
│                │  │  rag_agent.py  │  │                        │
│web_search.py   │  │                │  │  contract_agent.py     │
│                │  │  - Query       │  │                        │
│  - Searches    │  │    VikingDB    │  │  - Load contracts      │
│    live market │  │    Knowledge   │  │    from PostgreSQL     │
│    data via    │  │    Engine      │  │  - Run deterministic   │
│    OpenClaw    │  │  - Returns     │  │    optimizer           │
│    browse or   │  │    relevant    │  │  - Compare vs market   │
│    Serper API  │  │    chunks +    │  │    data → corrections  │
│  - Returns     │  │    citations   │  │  - Emit 3 flavours     │
│    structured  │  │                │  │                        │
│    MarketData  │  │                │  │                        │
└────────────┬───┘  └─────────┬──────┘  └────────┬───────────────┘
             │                │                  │
             └────────────────┼──────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                    SYNTHESIS AGENT                                │
│                    (synthesis.py)                                 │
│                                                                   │
│  Inputs: MarketData + RAGChunks + FlavourResult + Corrections     │
│  Model: BytePlus ModelArk                                         │
│                                                                   │
│  Outputs structured AnalysisReport:                               │
│   - executive_summary: str                                        │
│   - market_intelligence: MarketSection                            │
│   - document_insights: list[Citation]                             │
│   - flavours: list[Flavour]          (cheapest/safe/fast)         │
│   - data_corrections: list[Correction]                            │
│   - recommended_action: str                                       │
│   - prompt_trace: list[PromptStep]   (for README/judges)          │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Run Flow
```
User submits goal
  → POST /api/run {goal, doc_ids, company_id}
  → Flask creates job_id, stores in memory/Redis
  → Spawns orchestrator as background asyncio task
  → Returns {job_id} immediately (non-blocking)

Frontend polls SSE stream /api/trace/{job_id}
  → Receives events: PLAN | SEARCHING | RAG_QUERY | ANALYZING | CORRECTING | SYNTHESIZING | COMPLETE
  → Renders each event in AgentTrace panel in real time

On COMPLETE event:
  → Frontend fetches /api/report/{job_id}
  → Renders FlavourCards + DataCorrections + Report
```

### SSE Event Schema
```python
# Every agent emits events in this shape
{
  "event": "SEARCHING",          # event type
  "agent": "web_search",         # which agent
  "timestamp": "2025-03-11T...", # for parallelism proof
  "message": "Querying EU aluminium spot prices...",
  "data": { ... }                # optional structured payload
}
```

### Approval Flow
```
User selects flavour in HITL UI
  → POST /api/approve {job_id, flavour_id, edits}
  → Flask stores approval, marks job as approved
  → Returns confirmation + export options
```

---

## Key Architectural Decisions

### Why SSE, Not WebSocket?
SSE is unidirectional (server → client), which is all we need for trace
streaming. Simpler to implement, works through Railway's proxy, and React
handles it natively with `EventSource`.

### Why asyncio.gather() For Parallelism?
The BytePlus brief specifically requires "multi-agent working simultaneously."
`asyncio.gather()` runs the three sub-agents concurrently in the same process.
The SSE trace will show overlapping timestamps — this is visible proof for judges.

### Why Separate Synthesis Agent?
The synthesis agent is architecturally distinct from the sub-agents because it
has different inputs, a different prompt structure, and runs after all parallel
work is complete. This maps cleanly to the "multi-agent" pattern BytePlus wants
to see explained.

### Why Keep PostgreSQL + Flask?
These come from the hackathon project and are solid. Rewriting to FastAPI or
SQLAlchemy ORM buys nothing and costs time. The judges care about agent
architecture, not ORM choice.

---

## Database Schema (simplified)

```sql
-- Companies
CREATE TABLE companies (id SERIAL PRIMARY KEY, name TEXT, country TEXT);

-- Products
CREATE TABLE products (id SERIAL PRIMARY KEY, name TEXT, unit TEXT, company_id INT);

-- Contracts (both owned obligations and market offers)
CREATE TABLE contracts (
  id SERIAL PRIMARY KEY,
  product_id INT,
  company_id INT,
  direction VARCHAR(3),   -- 'IN' (supply) or 'OUT' (demand)
  source VARCHAR(10),     -- 'OWNED' or 'MARKET'
  unit_price NUMERIC,
  volume INT,
  currency VARCHAR(3),
  delivery_days INT,
  credibility_score NUMERIC,  -- 0-1
  deadline DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent jobs (in-memory is fine for demo)
CREATE TABLE agent_jobs (
  id UUID PRIMARY KEY,
  goal TEXT,
  status VARCHAR(20),   -- RUNNING | COMPLETE | FAILED
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```
