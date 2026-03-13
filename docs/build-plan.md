# Build Plan

Ordered execution plan for two sessions: Tonight + Friday.
Mac + Railway/Vercel + Claude Code (Pro).

**Golden rule:** After each block, the demo must be in a runnable state.
Commit with `git commit -m "checkpoint: [block name] working"` after each block.

---

### Block 1: Project Bootstrap (30 min)

```bash
# Create project structure
mkdirSupplyMind && cdSupplyMind
git init

# Backend
mkdir backend && cd backend
python3 -m venv venv && source venv/bin/activate
pip install flask[async] flask-cors openai python-dotenv \
            psycopg2-binary pypdf pydantic \
            duckduckgo-search chromadb sentence-transformers

# Frontend
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Docker for local postgres
# Create docker-compose.yml (see below)
docker-compose up -d
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB:SupplyMind
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - ./backend/db:/docker-entrypoint-initdb.d
```

**Checkpoint:** `python -c "import flask, openai, chromadb; print('OK')"` passes.

---

### Block 2: Database + Seed Data (30 min)

Create `backend/db/schema.sql` and `backend/db/seed.sql`.

Seed data requirements:
- 3 companies (EU suppliers: GermSteel GmbH, FranceMetal SA, PolyChem Ltd)
- 2 products (Industrial Steel, Aluminium Alloy)
- 6 owned contracts (2 per company, mix of IN/OUT directions)
- 8 market offers (MARKET source, various unit prices)
- **Intentionally seed 2 owned contracts at 12-18% above market price** — these become the data correction demo hits

**Checkpoint:** `psql -U postgresSupplyMind -c "SELECT COUNT(*) FROM contracts"` returns 14.

---

### Block 3: Flask API Skeleton (45 min)

Create `backend/app.py` with these routes stubbed:

```python
POST /api/run          → returns {job_id: uuid, status: "queued"}
GET  /api/trace/<id>   → SSE stream, sends mock events every 500ms
GET  /api/report/<id>  → returns hardcoded mock AnalysisReport JSON
POST /api/upload-doc   → returns {doc_id: uuid, chunks: 5}
POST /api/approve      → returns {approved: true, flavour_id: ...}
GET  /api/contracts    → returns contracts from DB
GET  /api/products     → returns products from DB
```

**All routes return mock data at this stage.** Real logic is added in Block 5+.

**Checkpoint:** `curl http://localhost:5001/api/products` returns JSON with products.

---

### Block 4: Frontend Shell (45 min)

Create the React app with routing and layout.

Pages to create:
1. **HomePage** — Goal input text area + PDF upload + "Run Agent" button
2. **AgentRunPage** — SSE trace panel consuming `/api/trace/{job_id}`
3. **HITLPage** — Three FlavourCards + DataCorrections + Approve button
4. **ReportPage** — Rendered AnalysisReport with export button

Wire pages together with React Router. Style with Tailwind, dark theme.
All pages work with mock API responses from Block 3.

**AgentTrace component:** Renders SSE events as they arrive. Each event is a
card with: agent name (coloured badge), timestamp, message, expandable data.

**FlavourCards component:** Three cards side by side, each showing total cost,
delivery days, risk score, selected contracts list. One card is selectable.

**Checkpoint:** Open browser, run the mock flow end-to-end: input → trace → HITL → approved.

---

### Block 5: BytePlus ModelArk Integration (30 min)

Replace mock LLM calls with real ModelArk calls.

1. Set up `backend/config.py` with ModelArk client
2. Implement `backend/agents/synthesis.py` — single ModelArk call, structured output
3. Test synthesis with hardcoded inputs → verify ModelArk responds correctly
4. Check token usage in ModelArk console

**Checkpoint:** Synthesis agent returns real prose from ModelArk. Tokens consumed visible in console.

---

### Block 6: Core Agent Logic (60 min)

Implement the actual agent modules (real logic, not mocks):

1. `backend/agents/orchestrator.py` — ModelArk call for goal decomposition
2. `backend/agents/contract_agent.py` — deterministic optimizer + corrections logic
3. Wire orchestrator → contract_agent → synthesis into the `/api/run` endpoint

At end of this block: `/api/run` with a goal returns a real AnalysisReport
(no web search, no RAG yet — those are Friday).

**Checkpoint:** POST to `/api/run` with a procurement goal returns real flavours and corrections.

---

### Block 7: Async Parallelism Scaffold (30 min)

Refactor orchestrator to use `asyncio.gather()` structure even though only
one real agent exists yet. This establishes the parallel pattern before
adding web search and RAG on Friday.

```python
async def run_agents(plan):
    results = await asyncio.gather(
        web_search_agent.run(plan),   # still mock
        rag_agent.run(plan),          # still mock
        contract_agent.run(plan),     # REAL
        return_exceptions=True
    )
    return results
```

**Checkpoint:** Trace events show overlapping timestamps (mock agents emit immediately, contract agent takes real time).

**End of tonight:** Full mock-to-real pipeline working. Commit: `checkpoint: core pipeline working with ModelArk`.

---


### Block 8: Web Search Agent (45 min)

Implement `backend/agents/web_search.py`:

1. Install and test Serper API (or DuckDuckGo fallback)
2. Implement search → ModelArk extraction → MarketData structured output
3. Replace mock web search in orchestrator with real agent
4. Verify data correction logic now uses real market prices

**Checkpoint:** Search for "EU aluminium spot price 2025" returns structured MarketData.

---

### Block 9: RAG Pipeline (60 min)

1. Implement PDF upload endpoint: `POST /api/upload-doc`
   - Extract text with pypdf
   - Chunk with fixed-size sliding window (500 chars, 100 overlap)
   - Embed with sentence-transformers (local, no API needed)
   - Store in ChromaDB (VikingDB if working)

2. Implement `backend/agents/rag_agent.py`
   - Query ChromaDB/VikingDB with embedded question
   - Send retrieved chunks to ModelArk for answer extraction
   - Return structured RAGResult with citations

3. Replace mock RAG in orchestrator with real agent

**Pre-load demo PDF:** Download a real public procurement report PDF and
upload it via the UI to verify the full flow works before demo day.

**Checkpoint:** Upload a PDF, then ask a question about its contents, get cited answer.

---

### Block 10: VikingDB Integration (30 min)

If VikingDB free tier is accessible:
1. Set up collection via console
2. Replace ChromaDB client with VikingDB in `rag_skill.py`
3. Test upsert and search
4. Set `USE_MOCK_VIKINGDB=false`

If VikingDB is NOT accessible (account issue, region issue, etc.):
- Keep ChromaDB
- Document attempt and outcome in README
- Move on — don't lose more than 30 minutes on this

---

### Block 11: End-to-End Test + Polish (45 min)

Run the full flow 3 times with different goals:
1. "Find cheapest EU steel supplier for Q3 delivery"
2. "Minimize supply chain risk for aluminium imports next quarter"  
3. "Find fastest delivery option for emergency steel order"

Fix any breaking issues. Polish the UI:
- Loading states during agent run
- Error handling when agents fail
- Empty states for no documents uploaded

**Checkpoint:** Full demo flow works 3/3 times without errors.


### Block 12: Deployment (60 min)

**Railway (Backend):**
```bash
# In backend/
# Create Dockerfile
railway login
railway newSupplyMind-backend
railway add postgres  # adds managed PostgreSQL
railway variables set MODELARK_API_KEY=... MODELARK_MODEL_ID=... [etc]
railway up
```

Run schema.sql and seed.sql against Railway PostgreSQL:
```bash
railway run psql $DATABASE_URL -f db/schema.sql
railway run psql $DATABASE_URL -f db/seed.sql
```

**Vercel (Frontend):**
```bash
cd frontend
# Set VITE_API_URL to Railway backend URL
vercel --prod
```

**Checkpoint:** Public URL loads, runs agent, displays results.

---

### Block 13: README (60 min)

The README is a deliverable, not an afterthought. Structure:

```markdown
#SupplyMind
 — Agentic Procurement Intelligence

## Live Demo
[URL] — try it: input "Find cheapest EU steel supplier" and upload [example.pdf]

## What It Does (30 seconds)
...

## Architecture
[Mermaid diagram of agent topology]

## BytePlus Integration
- ModelArk: [endpoint used, why this model]
- VikingDB: [collection setup, or fallback explanation]
- OpenClaw: [what was found, what was implemented]

## Prompt Structure
[Copy relevant sections from docs/prompts.md]

## Workflow Walkthrough
[Step-by-step of one agent run with real trace output]

## Claude Code Process
[2-3 screenshots of Claude Code being used]
[Key prompts used to generate complex modules]

## Trade-offs Made
[Honest assessment of what's mock vs real, and why]

## What I'd Build Next
[Shows product thinking]
```

---

### Block 14: Demo Prep (30 min)

Prepare for the demo run:
1. Clear all previous job data
2. Have the demo PDF ready to upload
3. Prepare 3 example goals to type
4. Test the deployed URL from a different network (mobile hotspot)
5. Screenshot the BytePlus ModelArk console showing token usage — attach to README

---

### Buffer (30 min)

Reserved for deployment issues, last-minute bugs, or integration problems.
If not needed, use it to add the report PDF export feature.

---

## What To Do If You Run Out of Time

**If only 2 hours remain and nothing is deployed:**

Priority order:
1. Deploy whatever exists (even mock-only) — a deployed mock beats a
   local real version every time
2. Make HITL UI look good with mock data
3. Write README explaining what was built and what was planned

**If ModelArk doesn't work:**
- Fall back to any OpenAI-compatible API temporarily
- Document the ModelArk setup attempt in README
- Email BytePlus support in parallel (they want to see you tried)

**If VikingDB doesn't work:**
- ChromaDB — already implemented as fallback
- Note in README: "VikingDB integration implemented and attempted; fell back
  to ChromaDB due to [specific issue]. Integration code is in rag_skill.py."

**If web search returns nothing useful:**
- Seeded market data from seed.sql is always available
- Data corrections still work (seeded to have intentional mismatches)
- The architecture is correct even if the live search data is mocked
