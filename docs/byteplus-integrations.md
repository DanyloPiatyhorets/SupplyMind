# BytePlus Integrations

Step-by-step setup for both required BytePlus services.

---

## ModelArk Setup

### 1. Get Your API Key
1. Log in to https://console.byteplus.com
2. Navigate to **ModelArk** → **API Key Management**
3. Create a new API key — copy it to `.env` as `MODELARK_API_KEY`

### 2. Create a Model Endpoint
1. Go to **ModelArk** → **Online Inference** → **Create Endpoint**
2. Select a model. Recommended options (all support free token tier):
   - `doubao-pro-32k` — ByteDance's own model, good reasoning, fast
   - `deepseek-v3-250324` — strong at structured output tasks
   - `doubao-1-5-pro-32k` — latest Doubao variant
3. Copy the **Endpoint ID** (format: `ep-xxxxxxxx-xxxxx`)
4. Set `MODELARK_MODEL_ID=ep-xxxxxxxx-xxxxx` in `.env`


## REST API call exmaple

curl https://ark.ap-southeast.bytepluses.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer be69fc90-8ec3-4c21-a299-a6dc32d56593" \
  -d '{
    "model": "deepseek-v3-1-250821",
    "messages": [
      {"role": "system","content": "You are an artificial intelligence assistant."},
      {"role": "user","content": "What are the common cruciferous plants?"}
    ]
  }'

### 3. Set Base URL
```
MODELARK_BASE_URL=https://ark.ap-southeast.bytepluses.com/api/v3
```
Note: The region in the URL matters. `ap-southeast` is for the Singapore
region which is typical for non-China BytePlus accounts.

### 4. Enable Free Tokens Only Mode
1. ModelArk console → **Account Settings** → **Free Tokens Only** → Enable
2. This ensures you're never charged during the demo build

### 5. Python Usage
```python
# backend/config.py
from openai import AsyncOpenAI
import os

modelark_client = AsyncOpenAI(
    api_key=os.environ["MODELARK_API_KEY"],
    base_url=os.environ["MODELARK_BASE_URL"]
)

# Usage in any agent:
response = await modelark_client.chat.completions.create(
    model=os.environ["MODELARK_MODEL_ID"],
    messages=[...],
    temperature=0.1,  # low temp for structured output tasks
    response_format={"type": "json_object"}  # for structured outputs
)
```

### 6. Embeddings (for RAG)
ModelArk also provides an embeddings endpoint:
```python
embedding = await modelark_client.embeddings.create(
    model="ep-your-embedding-endpoint-id",  # create a separate embedding endpoint
    input="text to embed"
)
vector = embedding.data[0].embedding
```
Alternatively, use `sentence-transformers` locally for embeddings to save
ModelArk token quota for inference.

---

## VikingDB Setup

### 1. Check Free Tier Availability
1. Log in to https://console.byteplus.com
2. Navigate to **VikingDB** → check if free tier is available in your region
3. If not available: use ChromaDB fallback (see tech-stack.md) and document this

### 2. Create a Collection
1. VikingDB console → **Create Collection**
2. Settings:
   - Index Type: `HNSW` (fast approximate search)
   - Distance Metric: `IP` (inner product, works with normalized embeddings)
   - Dimension: `1536` (for ModelArk ada-compatible embeddings) or `768` (sentence-transformers)
3. Note your Collection Name and Index Name

### 3. Get Credentials
From VikingDB console:
```
VIKINGDB_HOST=your-host.byteplus.com
VIKINGDB_REGION=ap-southeast-1
VIKINGDB_AK=your-access-key
VIKINGDB_SK=your-secret-key
```

### 4. Python SDK
```bash
pip install volcengine-python-sdk[vikingdb]
```

```python
# backend/skills/rag_skill.py
from volcengine.viking_db import VikingDBService, Data, Field, FieldType, IndexType

class VikingDBClient:
    def __init__(self):
        self.service = VikingDBService(
            host=os.environ["VIKINGDB_HOST"],
            region=os.environ["VIKINGDB_REGION"],
            ak=os.environ["VIKINGDB_AK"],
            sk=os.environ["VIKINGDB_SK"],
            scheme="https"
        )
        self.collection_name = "procureiq_docs"

    def upsert(self, doc_id: str, chunks: list[str], embeddings: list[list[float]]):
        collection = self.service.get_collection(self.collection_name)
        data = [
            Data(fields={
                "id": f"{doc_id}_{i}",
                "text": chunk,
                "doc_id": doc_id,
            }, vectors={"embedding": emb})
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings))
        ]
        collection.upsert_data(data)

    def search(self, query_embedding: list[float], top_k=5) -> list[dict]:
        index = self.service.get_index(self.collection_name, "embedding_index")
        results = index.search_by_vector(
            vectors={"embedding": query_embedding},
            limit=top_k,
            output_fields=["text", "doc_id"]
        )
        return [{"text": r.fields["text"], "doc_id": r.fields["doc_id"]} for r in results]
```

### 5. ChromaDB Fallback (when USE_MOCK_VIKINGDB=true)
```python
import chromadb

class ChromaDBClient:
    """Drop-in replacement for VikingDBClient interface"""
    def __init__(self):
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection("procureiq_docs")

    def upsert(self, doc_id: str, chunks: list[str], embeddings: list[list[float]]):
        self.collection.upsert(
            ids=[f"{doc_id}_{i}" for i in range(len(chunks))],
            documents=chunks,
            embeddings=embeddings,
            metadatas=[{"doc_id": doc_id} for _ in chunks]
        )

    def search(self, query_embedding: list[float], top_k=5) -> list[dict]:
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        return [
            {"text": doc, "doc_id": meta["doc_id"]}
            for doc, meta in zip(results["documents"][0], results["metadatas"][0])
        ]

# Factory function — used everywhere in the codebase
def get_vector_client():
    if os.environ.get("USE_MOCK_VIKINGDB") == "true":
        return ChromaDBClient()
    return VikingDBClient()
```

---

## OpenClaw Research Notes

As of March 2025, OpenClaw does not appear to have a public pip package.
It may be an internal ByteDance tool referenced in the assessment to see
if candidates do their research.

**Recommended approach:**
1. Search `pip install openclaw` and `pypi.org/project/openclaw` — if found, use it
2. Search BytePlus/ByteDance GitHub for any openclaw repository
3. Check the BytePlus Discord (linked from their docs site) and ask directly
4. If nothing found after 30 minutes of research: implement the `OpenClawAgent`
   wrapper pattern (see tech-stack.md Tier 2) and document your research in README

**What to write in README:**
> "OpenClaw: We researched the OpenClaw framework and implemented its core
> multi-agent orchestration pattern — goal decomposition, parallel skill
> execution, and result synthesis — as `openclaw_adapter.py`. If BytePlus
> makes the OpenClaw SDK publicly available, the adapter can be swapped
> with minimal code changes."

This shows research, honesty, and architectural awareness. Do not pretend
you used a package that doesn't exist.


