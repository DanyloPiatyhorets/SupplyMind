import asyncio
import json
import logging

import config
from skills.rag_skill import query_chunks

logger = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are a procurement document analyst. You have been given chunks from uploaded documents and a question about procurement/supply chain.

Your task: answer the question using ONLY the provided document chunks. Cite which chunks you used.

Return a JSON object:
{
  "answer": "your answer based on the documents",
  "citations": [
    {"chunk_id": "...", "doc_id": "...", "excerpt": "relevant quote from chunk", "relevance": 0.0-1.0}
  ],
  "confidence": 0.0-1.0,
  "gaps": "what the documents don't cover that would be useful"
}

If the chunks don't contain relevant information, say so honestly and set confidence low.
Never fabricate information not found in the chunks."""


async def run_rag(plan: dict, doc_ids: list[str], emit: callable) -> dict:
    """RAG agent — retrieves relevant chunks from vector DB and extracts answers."""
    queries = [q for q in plan.get("research_questions", []) if q.get("agent") == "document_rag"]

    emit("RAG_QUERY", "document_rag", "Starting document analysis...")

    if not doc_ids:
        await asyncio.sleep(0.3)
        emit("RAG_QUERY", "document_rag", "No documents uploaded. Skipping RAG retrieval.")
        return {
            "answer": "No documents uploaded for this analysis.",
            "citations": [],
            "confidence": 0.0,
            "gaps": "No uploaded documents available. Upload industry reports or supplier catalogues for document-based insights.",
        }

    # Build queries — use plan questions or generate defaults
    product = plan.get("context", {}).get("product_focus", "procurement")
    if not queries:
        queries = [
            {"agent": "document_rag", "query": f"{product} pricing and supplier information"},
            {"agent": "document_rag", "query": f"{product} supply chain risks and delivery"},
        ]

    all_chunks = []
    for i, q in enumerate(queries):
        query_text = q.get("query", f"{product} market data")
        emit("RAG_QUERY", "document_rag", f"[{i+1}/{len(queries)}] Querying: {query_text}")

        # Run ChromaDB query in thread pool (it's synchronous)
        loop = asyncio.get_event_loop()
        chunks = await loop.run_in_executor(None, query_chunks, query_text, 5, doc_ids)
        all_chunks.extend(chunks)

        emit("RAG_QUERY", "document_rag", f"[{i+1}/{len(queries)}] Retrieved {len(chunks)} chunks")

    # Deduplicate chunks by chunk_id
    seen = set()
    unique_chunks = []
    for c in all_chunks:
        if c["chunk_id"] not in seen:
            seen.add(c["chunk_id"])
            unique_chunks.append(c)

    emit("RAG_QUERY", "document_rag", f"Extracting insights from {len(unique_chunks)} unique chunks...")

    # Extract answer via LLM or fallback
    result = await _extract_answer(queries, unique_chunks, doc_ids)

    emit("RAG_QUERY", "document_rag",
         f"Document analysis complete. Confidence: {result.get('confidence', 0):.0%}. "
         f"Citations: {len(result.get('citations', []))}.")

    return result


async def _extract_answer(queries: list, chunks: list[dict], doc_ids: list[str]) -> dict:
    """Extract structured answer from retrieved chunks via LLM or fallback."""

    if not chunks:
        return {
            "answer": "No relevant content found in uploaded documents.",
            "citations": [],
            "confidence": 0.1,
            "gaps": "Uploaded documents may not contain information relevant to this query.",
        }

    # Try LLM extraction
    if not config.USE_MOCK_LLM and config.modelark_client:
        try:
            chunk_text = "\n\n".join([
                f"[Chunk {c['chunk_id']}] (doc: {c['doc_id']})\n{c['text']}"
                for c in chunks[:10]
            ])
            query_text = "; ".join([q.get("query", "") for q in queries])

            response = await config.modelark_client.chat.completions.create(
                model=config.MODELARK_MODEL_ID,
                messages=[
                    {"role": "system", "content": RAG_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Questions: {query_text}\n\nDocument Chunks:\n{chunk_text}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.warning(f"LLM RAG extraction failed: {e}. Using deterministic fallback.")

    # Deterministic fallback — build answer from chunk text
    return _deterministic_answer(chunks, doc_ids)


def _deterministic_answer(chunks: list[dict], doc_ids: list[str]) -> dict:
    """Build a structured answer from chunks without LLM."""
    # Combine top chunks into answer
    top_chunks = sorted(chunks, key=lambda c: c.get("distance", 1.0))[:5]

    excerpts = []
    citations = []
    for c in top_chunks:
        text = c["text"][:200].strip()
        excerpts.append(text)
        distance = c.get("distance", 0.5)
        relevance = max(0.0, min(1.0, 1.0 - distance))
        citations.append({
            "chunk_id": c["chunk_id"],
            "doc_id": c["doc_id"],
            "excerpt": text,
            "relevance": round(relevance, 2),
        })

    answer = "Based on uploaded documents: " + " | ".join(excerpts[:3])
    if len(answer) > 500:
        answer = answer[:497] + "..."

    avg_relevance = sum(c["relevance"] for c in citations) / len(citations) if citations else 0.0

    return {
        "answer": answer,
        "citations": citations,
        "confidence": round(avg_relevance, 2),
        "gaps": "LLM-based analysis unavailable; showing raw document excerpts. Enable ModelArk for deeper insights.",
    }
