# Tech Stack

## Stack Decisions

| Layer | Technology | Why |
|---|---|---|
| **Agent LLM** | BytePlus ModelArk (Doubao-pro-32k or DeepSeek-V3.1) | Required by assessment. 500k free tokens on trial. |
| **Agent Orchestration** | OpenClaw (+ custom wrapper) | Required by assessment. See integration notes below. |
| **Vector DB** | BytePlus VikingDB Knowledge Engine | Required (BytePlus services). Free tier expected. |
| **Web Search** | OpenClaw browse skill → fallback: Serper API | OpenClaw-first. Serper is $0 for 2.5k queries/month. |
| **Backend framework** | Flask (async) | Familiar from hackathon. No rewrite cost. |
| **Database** | PostgreSQL | Familiar. Runs in Docker locally, Railway in prod. |
| **Frontend** | React 18 + Vite + TypeScript | Familiar from hackathon. |
| **Styling** | Tailwind CSS | Fast, no config. Dark theme for enterprise feel. |
| **SSE streaming** | Flask SSE + `EventSource` | Simple, sufficient, Railway-compatible. |
| **Dev tool** | Claude Code (Pro plan) | Required by assessment. |
| **Frontend deploy** | Vercel | Free, one-click, automatic on push. |
| **Backend deploy** | Railway | Free trial, Docker support, env var management. |
| **Local dev** | Docker Compose | Postgres + backend together. |
| **PDF processing** | pypdf + LangChain text splitter | Fast, well-understood chunking. |
| **Embeddings** | BytePlus ModelArk embedding endpoint | Keeps everything in BytePlus stack. |

---

## ModelArk Setup

BytePlus ModelArk is OpenAI-API-compatible. This is important — you can use
the `openai` Python SDK pointed at the ModelArk base URL.

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=os.environ["MODELARK_API_KEY"],
    base_url="https://ark.ap-southeast.bytepluses.com/api/v3"
)

response = await client.chat.completions.create(
    model=os.environ["MODELARK_MODEL_ID"],  # e.g. "ep-xxxxxxxx-xxxxx"
    messages=[{"role": "user", "content": "..."}]
)
```

**Recommended model:** `doubao-pro-32k` or `deepseek-v3-250324`  
Both are available in the free token tier and have strong reasoning capability.  
Check your ModelArk console for your endpoint ID after creating a deployment.

---

## OpenClaw — Integration Strategy

OpenClaw is BytePlus/ByteDance's agent framework. As of writing, the public
SDK surface is not fully documented for external use. Here is the strategy:

### Tier 1 — Full OpenClaw Integration (if SDK works)
```python
# If openclaw pip package is available and documented
pip install openclaw

from openclaw import Agent, BrowseSkill, ToolSkill

orchestrator = Agent(
    model_client=modelark_client,
    skills=[BrowseSkill(), rag_skill, contract_skill]
)
result = await orchestrator.run(goal)
```

### Tier 2 — OpenClaw as Architecture Label (fallback)
If the OpenClaw SDK is not pip-installable or lacks documentation, implement
the same pattern manually and **label it OpenClaw-inspired in the README**.
The judges care that you understand the concept, not that you used a specific import.

```python
# openclaw_adapter.py — our lightweight wrapper
class OpenClawAgent:
    """
    Custom implementation of OpenClaw-style multi-agent orchestration.
    Architecture pattern: goal decomposition → parallel skill execution → synthesis
    """
    def __init__(self, model_client, skills: list[Skill]):
        self.model = model_client
        self.skills = {s.name: s for s in skills}

    async def run(self, goal: str, context: dict) -> AgentResult:
        plan = await self._plan(goal, context)
        results = await asyncio.gather(*[
            self.skills[task.skill].run(task.query)
            for task in plan.tasks
        ])
        return AgentResult(plan=plan, results=results)
```

This is the honest fallback. Document it transparently — judges respect honesty
about what was possible in the time window.

---

## VikingDB — Integration Strategy

### Tier 1 — VikingDB Knowledge Engine (if accessible from free tier)
```python
from volcengine.viking_db import VikingDBService

service = VikingDBService(
    host=os.environ["VIKINGDB_HOST"],
    region=os.environ["VIKINGDB_REGION"],
    ak=os.environ["VIKINGDB_AK"],
    sk=os.environ["VIKINGDB_SK"]
)
```

SDK: `pip install volcengine-python-sdk`  
Docs: https://docs.byteplus.com/en/docs/VikingDB

### Tier 2 — ChromaDB local fallback
```python
import chromadb
client = chromadb.Client()
```

ChromaDB is in-process, zero config, identical query API shape.
When `USE_MOCK_VIKINGDB=true`, swap the VikingDB client for ChromaDB
transparently behind the `rag_skill.py` interface.

---

## Deployment Config

### Railway (Backend)
- `Dockerfile` in `backend/`
- Set all env vars in Railway dashboard
- PostgreSQL plugin added to Railway project
- `railway up` or connect GitHub repo for auto-deploy

### Vercel (Frontend)
- `vercel.json` in `frontend/`
- Set `VITE_API_URL` to Railway backend URL
- `vercel --prod` or GitHub integration

### Environment separation
```
Local:   .env (gitignored)
Railway: env vars in dashboard
Vercel:  env vars in dashboard
```

Never commit `.env` or API keys. The `.env.example` file shows all required vars.
