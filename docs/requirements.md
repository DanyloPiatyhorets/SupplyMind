# Requirements, Risks & Fallback Strategy

Each requirement lists: what it is, the acceptance criteria, the risk level,
and exactly what to do if you run out of time or hit an integration blocker.

---

## REQ-01: Orchestrator Agent with Goal Decomposition

**What:** The top-level agent receives a user goal and uses the LLM to
decompose it into a structured research plan before spawning sub-agents.

**Acceptance Criteria:**
- User inputs goal as free text
- Orchestrator calls ModelArk and returns a structured plan: `{research_questions: [], strategies: [], context: {}}`
- Plan is emitted as SSE event visible in UI before sub-agents start
- Sub-agents receive individual task assignments from this plan

**Risk: LOW** — This is a straightforward LLM call with structured output.

**Fallback:** If structured output fails, use a hardcoded plan template with
3 fixed research questions derived from keyword extraction of the goal.

---

## REQ-02: Parallel Multi-Agent Execution

**What:** Web search, RAG, and contract analysis agents run simultaneously,
not sequentially. Timestamps in the trace must prove this.

**Acceptance Criteria:**
- `asyncio.gather()` used in orchestrator
- SSE trace shows overlapping timestamps from different agents
- Total runtime is < sum of individual agent runtimes

**Risk: LOW-MEDIUM** — asyncio is straightforward. Risk is Flask blocking if
not configured correctly for async.

**Setup:** Use `flask[async]` and ensure route handlers are `async def`.
For SSE streaming, use a background thread/task queue pattern so the
generator yields events as they arrive.

**Fallback:** If async SSE proves complex, run agents in sequence but
pre-load all trace events at the end and stream them with artificial
50ms delays. The UI looks identical. Document the simplification in README.

---

## REQ-03: Web Search Agent (Live Market Intelligence)

**What:** Agent queries live web sources to find current market prices and
supplier information relevant to the procurement goal.

**Acceptance Criteria:**
- Returns structured `MarketData`: `{supplier, price, currency, source_url, retrieved_at}`
- Sources are cited in the final report
- Works on demo day with real data

**Risk: MEDIUM** — Depends on OpenClaw browse availability.

**Fallback Tier 1 — Serper API:**
```python
import requests
response = requests.get(
    "https://google.serper.dev/search",
    headers={"X-API-KEY": SERPER_API_KEY},
    json={"q": query, "num": 5}
)
```
Free plan: 2,500 queries/month. Sign up at serper.dev.

**Fallback Tier 2 — DuckDuckGo (zero API key):**
```python
from duckduckgo_search import DDGS
results = DDGS().text(query, max_results=5)
```
`pip install duckduckgo-search` — no key required. Slower, less reliable,
but always available.

**Fallback Tier 3 — Seeded mock:**
Pre-load realistic market price data in `db/market_seed.json`. The agent
returns mock prices for known commodities (aluminium, steel, copper, etc.)
with a note in the UI: "Using cached market data — live search unavailable."

---

## REQ-04: RAG Agent (Document Intelligence)

**What:** User uploads a PDF (industry report, supplier catalogue). The RAG
agent chunks it, embeds it, stores in VikingDB, and retrieves relevant
passages to answer research questions.

**Acceptance Criteria:**
- PDF upload works in UI
- At least 2 chunks retrieved per research question
- Retrieved chunks cited by source in the final report
- Works with at least one real uploaded document on demo day

**Risk: MEDIUM** — VikingDB free tier access needs verification. Embeddings
endpoint needs testing.

**Fallback Tier 1 — ChromaDB local:**
Identical Python interface. Set `USE_MOCK_VIKINGDB=true`.
All RAG functionality works identically, just not on BytePlus infrastructure.
Note in README: "VikingDB integration implemented; ChromaDB used as fallback
for demo due to [specific issue encountered]."

**Fallback Tier 2 — In-memory numpy cosine similarity:**
If even ChromaDB is slow to set up, implement a minimal in-memory vector
search using sentence-transformers locally. Absolute last resort.

**PDF pre-loaded for demo:**
Always have a demo PDF ready to upload — a real procurement industry report
from a public source (e.g. a Gartner excerpt, a commodity market PDF). This
ensures the RAG demo works even if the user doesn't upload anything.

---

## REQ-05: Contract Analysis Agent with Data Correction

**What:** The agent loads owned contracts from PostgreSQL, runs the
deterministic flavour optimizer (from hackathon), then compares contract
prices against live market data to flag stale or overpriced contracts.

**Acceptance Criteria:**
- Produces 3 flavours: cheapest, lowest-risk, fastest
- Data correction output: `{contract_id, field, current_value, market_value, delta_pct, confidence}`
- At least one data correction shown in demo (seed data ensures this)
- Corrections panel visible in HITL UI

**Risk: LOW** — Core optimizer logic from hackathon is reusable. Market
data comparison is straightforward math.

**Implementation note:**
```python
def detect_corrections(contracts, market_data):
    corrections = []
    for contract in contracts:
        if contract.source == "OWNED":
            market_price = market_data.get_price(contract.product)
            if market_price:
                delta = (contract.unit_price - market_price) / market_price
                if abs(delta) > 0.05:  # 5% threshold
                    corrections.append(Correction(
                        contract_id=contract.id,
                        field="unit_price",
                        current_value=contract.unit_price,
                        market_value=market_price,
                        delta_pct=round(delta * 100, 1),
                        confidence=0.85
                    ))
    return corrections
```

**Fallback:** If live market data is unavailable, seed the database with
intentionally stale prices (e.g. 15% above the seeded market offers) so
corrections always appear during demo. The logic is real; the data is controlled.

---

## REQ-06: Synthesis Agent + Report Generation

**What:** After all three sub-agents complete, the synthesis agent combines
their outputs into a structured `AnalysisReport` via a single ModelArk call.

**Acceptance Criteria:**
- Report has all required sections (see prompts.md for schema)
- Report is viewable in UI and exportable as markdown
- Prompt structure is documented (judges will check this)

**Risk: LOW** — Single LLM call with well-defined input/output schema.

**Fallback:** If ModelArk call fails, template the report by concatenating
sub-agent outputs with section headers. Less polished prose but same structure.

---

## REQ-07: HITL Review UI

**What:** Human reviews the three flavours, sees agent trace, sees data
corrections, selects a flavour (optionally edits it), and approves.

**Acceptance Criteria:**
- Three FlavourCards shown side by side
- DataCorrections table shown below
- Agent trace shown in collapsible panel
- Approve button commits the selection
- Approved result shown with export option

**Risk: LOW** — This is a HITL pattern from the hackathon. Pure UI work.

**Priority:** Build this first after basic agent scaffolding. A working UI
with mock data looks better than a working backend with no UI.

---

## REQ-08: Agent Trace Streaming (SSE)

**What:** The frontend shows each agent step as it happens, in real time,
during the agent run.

**Acceptance Criteria:**
- Events appear within 1-2 seconds of being emitted
- Different agents have different visual treatment (icon/colour)
- Timestamps are shown and prove parallel execution

**Risk: MEDIUM** — SSE + async Flask needs care.

**Simplified implementation:**
```python
# In Flask
@app.route('/api/trace/<job_id>')
def trace_stream(job_id):
    def generate():
        queue = get_job_queue(job_id)
        while True:
            event = queue.get(timeout=30)
            if event is None:  # sentinel
                break
            yield f"data: {json.dumps(event)}\n\n"
    return Response(generate(), mimetype='text/event-stream')
```

**Fallback:** If SSE is too complex, use polling. Frontend calls
`GET /api/trace/{job_id}` every 1 second and receives accumulated events.
The UX is slightly less smooth but functionally identical.

---

## REQ-09: BytePlus ModelArk Integration

**What:** All LLM inference must go through ModelArk, not OpenAI or Anthropic.

**Acceptance Criteria:**
- API key is from BytePlus console
- Model ID is a ModelArk endpoint ID
- At minimum, orchestrator and synthesis agents use ModelArk

**Risk: LOW** — ModelArk is OpenAI-API-compatible. Drop-in with base_url change.
500k free tokens is sufficient for ~200 agent runs.

**Verification:** Print response headers or model name in the trace to prove
ModelArk is being called. Judges may inspect network traffic.

---

## REQ-10: Public Deployment

**What:** The full system (frontend + backend) must be accessible at a public URL.

**Acceptance Criteria:**
- Frontend URL works from any browser
- Backend API reachable from frontend
- PostgreSQL connected (Railway plugin)
- All env vars set in dashboards

**Risk: LOW** — Railway and Vercel are reliable and fast to set up.

**Do this early (Friday morning) — do not leave deployment to last.**
Deployment always takes longer than expected. Having a working deployment
early means you can iterate on the live URL.

**Railway free tier note:** As of 2025, Railway offers $5 credit on new
accounts which is sufficient for this demo. Alternatively, Render.com
has a free tier for web services.

---

## Feature Priority Matrix

| Requirement | Must Have | Nice to Have | Skip If Needed |
|---|---|---|---|
| REQ-01 Orchestrator | ✅ | | |
| REQ-02 Parallel agents | ✅ | | |
| REQ-03 Web search | ✅ (with fallback) | | |
| REQ-04 RAG / VikingDB | ✅ (with fallback) | | |
| REQ-05 Data corrections | ✅ | | |
| REQ-06 Synthesis report | ✅ | | |
| REQ-07 HITL UI | ✅ | | |
| REQ-08 SSE streaming | | ✅ | polling is fine |
| REQ-09 ModelArk | ✅ | | |
| REQ-10 Deployment | ✅ | | |
| Report PDF export | | ✅ | |
| Stripe invoice | | | ✅ skip |
| Auth / login | | | ✅ skip |
