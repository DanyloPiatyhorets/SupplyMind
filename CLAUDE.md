# CLAUDE.md — SupplyMind Agent Build Instructions

You are building **SupplyMind**, an agentic procurement intelligence system.
This is an internship assessment submission for BytePlus (ByteDance). The goal
is to impress technical judges, not to build production SaaS. **Ship fast, with
visible architecture quality and real BytePlus integrations.**

---

## ⚡ Prime Directive

**Speed + visibility > perfection.**  
Every module must have a working mock fallback so the demo always runs.  
Real integrations are layered on top of mocks — never block on an integration.

---

## 📚 Read These Docs First (in order)

Before writing any code, read:

1. `docs/purpose.md` — what we're building and why it matters to BytePlus
2. `docs/architecture.md` — module map, data flow, agent topology
3. `docs/tech-stack.md` — stack decisions and rationale
4. `docs/requirements.md` — requirements, risks, and fallback strategy per feature
5. `docs/byteplus-integrations.md` — exact API setup for ModelArk and VikingDB
6. `docs/prompts.md` — the agent system prompts to implement verbatim
7. `docs/build-plan.md` — ordered build sequence with time estimates

---

## 🗂 Project Structure to Create

```
procureiq/
├── CLAUDE.md                  ← this file
├── README.md                  ← written last, for judges
├── docs/                      ← all spec files
├── backend/
│   ├── app.py                 ← Flask entry point
│   ├── agents/
│   │   ├── orchestrator.py    ← top-level agent, decomposes goals
│   │   ├── web_search.py      ← live market research agent
│   │   ├── rag_agent.py       ← document intelligence agent
│   │   ├── contract_agent.py  ← optimizer + data correction agent
│   │   └── synthesis.py       ← report builder agent
│   ├── skills/
│   │   ├── search_skill.py    ← OpenClaw or DuckDuckGo wrapper
│   │   └── rag_skill.py       ← VikingDB or ChromaDB wrapper
│   ├── db/
│   │   ├── schema.sql          ← PostgreSQL schema
│   │   └── seed.sql            ← demo data
│   ├── models/                ← Pydantic data models
│   └── config.py              ← env var loading
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.tsx
│   │   │   ├── AgentRunPage.tsx   ← main demo page
│   │   │   ├── HITLPage.tsx       ← human review + approval
│   │   │   └── ReportPage.tsx     ← rendered output
│   │   ├── components/
│   │   │   ├── AgentTrace.tsx     ← live step-by-step trace panel
│   │   │   ├── FlavourCards.tsx   ← side-by-side variants
│   │   │   ├── DataCorrections.tsx
│   │   │   └── PDFUpload.tsx
│   │   └── api/client.ts
├── docker-compose.yml         ← local dev with postgres
└── .env.example
```

---

## 🔑 Environment Variables Required

```bash
# BytePlus
MODELARK_API_KEY=
MODELARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
MODELARK_MODEL_ID=          # e.g. deepseek-v3-250324 or doubao-pro-32k

VIKINGDB_HOST=
VIKINGDB_REGION=
VIKINGDB_AK=
VIKINGDB_SK=

# Fallback (always set these so mocks work without BytePlus)
USE_MOCK_SEARCH=false        # set true if OpenClaw unavailable
USE_MOCK_VIKINGDB=false      # set true if VikingDB unavailable

# DB
DATABASE_URL=postgresql://localhost:5432/procureiq

# Optional
SERPER_API_KEY=              # for web search fallback
```

---

## 🏗 Build Rules

### General
- Always check `docs/requirements.md` for the fallback strategy before implementing any BytePlus integration
- Never let a missing API key crash the app — use `USE_MOCK_*` flags
- Every agent must emit structured trace events consumed by the frontend
- Use `asyncio.gather()` for parallel agent execution — this must be genuinely parallel, not sequential
- Type-hint every function. Use Pydantic models for all agent inputs/outputs

### Backend
- Python 3.11+
- Flask with async support (`flask[async]`) 
- All agent results returned as Server-Sent Events (SSE) for real-time trace streaming
- Use `python-dotenv` for config

### Frontend
- React 18 + Vite + TypeScript
- Tailwind CSS for styling — keep it clean and dark-themed
- Use `EventSource` API to consume SSE from backend (agent trace streaming)
- No component libraries except shadcn/ui if needed

### Git hygiene
- Commit after each module is working (even with mocks)
- Commit message format: `feat(module): description` or `mock(module): description`

---

## ⚠️ Non-Negotiables for the Demo

These must work on demo day, no exceptions:

1. **Agent trace panel** — judges must see the agent thinking step by step in real time
2. **Three flavour variants** — cheapest / lowest-risk / fastest, side by side
3. **Data correction output** — at least one flagged inconsistency shown
4. **PDF upload → RAG answer** — upload a doc, see it cited in the report
5. **BytePlus ModelArk** — at least one API call must go through ModelArk, not OpenAI/Anthropic
6. **Public URL** — deployed and accessible before submission

---

## 🎯 BytePlus Checklist (verify before submitting)

- [ ] OpenClaw used as orchestration layer (or explicitly documented why not)
- [ ] Claude Code used as dev tool (screenshot evidence in README)
- [ ] Multi-agent with parallel execution (timestamps prove it)
- [ ] BytePlus ModelArk as inference backend
- [ ] BytePlus VikingDB as vector store (or VikingDB Knowledge Engine)
- [ ] RAG over uploaded documents works
- [ ] AI search / live web retrieval works
- [ ] HITL review flow works end to end
- [ ] Deployed on public network
- [ ] README explains prompt structure and workflow
