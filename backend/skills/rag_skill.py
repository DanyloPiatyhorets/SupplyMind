"""RAG skill — vector store abstraction. Supports ChromaDB (default) and BytePlus VikingDB."""

import logging
from typing import Optional

import config

logger = logging.getLogger(__name__)

COLLECTION_NAME = "supplymind_docs"

# ---------------------------------------------------------------------------
# Backend selection: VikingDB (real) vs ChromaDB (fallback)
# ---------------------------------------------------------------------------


def _use_vikingdb() -> bool:
    """Check if VikingDB should be used (credentials present + flag off)."""
    return (
        not config.USE_MOCK_VIKINGDB
        and bool(getattr(config, "VIKINGDB_HOST", ""))
        and bool(getattr(config, "VIKINGDB_AK", ""))
    )


# ---------------------------------------------------------------------------
# VikingDB backend
# ---------------------------------------------------------------------------

_viking_service = None
_viking_collection = None
_viking_index = None


def _get_viking():
    """Lazy-init VikingDB service, collection, and index."""
    global _viking_service, _viking_collection, _viking_index
    if _viking_service is not None:
        return _viking_service, _viking_collection, _viking_index

    from volcengine.viking_db import VikingDBService

    _viking_service = VikingDBService(
        host=config.VIKINGDB_HOST,
        region=config.VIKINGDB_REGION,
        ak=config.VIKINGDB_AK,
        sk=config.VIKINGDB_SK,
        scheme="https",
    )
    _viking_collection = _viking_service.get_collection(COLLECTION_NAME)
    _viking_index = _viking_service.get_index(COLLECTION_NAME, "embedding_index")
    logger.info(f"VikingDB connected: collection={COLLECTION_NAME}")
    return _viking_service, _viking_collection, _viking_index


def _viking_upsert(doc_id: str, chunks: list[str], metadatas: list[dict] | None = None) -> int:
    """Upsert chunks into VikingDB (embeddings generated server-side or by ChromaDB's model)."""
    from volcengine.viking_db import Data

    _, collection, _ = _get_viking()
    data = []
    for i, chunk in enumerate(chunks):
        fields = {
            "id": f"{doc_id}_chunk_{i}",
            "text": chunk,
            "doc_id": doc_id,
            "chunk_index": i,
        }
        if metadatas and i < len(metadatas):
            fields.update({k: v for k, v in metadatas[i].items() if k not in fields})
        data.append(Data(fields=fields))

    collection.upsert_data(data)
    logger.info(f"VikingDB: upserted {len(chunks)} chunks for doc {doc_id}")
    return len(chunks)


def _viking_query(query: str, n_results: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
    """Query VikingDB for relevant chunks."""
    _, _, index = _get_viking()

    filter_expr = None
    if doc_ids:
        if len(doc_ids) == 1:
            filter_expr = {"field": "doc_id", "op": "=", "conds": doc_ids[0]}
        else:
            filter_expr = {"field": "doc_id", "op": "in", "conds": doc_ids}

    results = index.search_by_text(
        text=query,
        limit=n_results,
        output_fields=["text", "doc_id", "chunk_index"],
        filter=filter_expr,
    )

    chunks = []
    for r in results:
        chunks.append({
            "chunk_id": r.fields.get("id", ""),
            "doc_id": r.fields.get("doc_id", ""),
            "text": r.fields.get("text", ""),
            "distance": getattr(r, "score", None),
        })
    return chunks


def _viking_delete(doc_id: str) -> None:
    """Delete all chunks for a doc from VikingDB."""
    _, collection, _ = _get_viking()
    # VikingDB requires knowing IDs; we reconstruct them
    # In production you'd query first, but for demo we use convention
    collection.delete_data(filter={"field": "doc_id", "op": "=", "conds": doc_id})
    logger.info(f"VikingDB: deleted chunks for doc {doc_id}")


# ---------------------------------------------------------------------------
# ChromaDB backend (fallback)
# ---------------------------------------------------------------------------

_chroma_client = None
_chroma_collection = None


def _get_chroma_collection():
    """Lazy-init ChromaDB collection with default embedding (all-MiniLM-L6-v2 via onnxruntime)."""
    global _chroma_client, _chroma_collection
    if _chroma_collection is not None:
        return _chroma_collection

    import chromadb
    from chromadb.config import Settings

    _chroma_client = chromadb.Client(Settings(anonymized_telemetry=False))
    _chroma_collection = _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"ChromaDB collection '{COLLECTION_NAME}' ready (count={_chroma_collection.count()})")
    return _chroma_collection


def _chroma_upsert(doc_id: str, chunks: list[str], metadatas: list[dict] | None = None) -> int:
    collection = _get_chroma_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metas = metadatas or [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]
    collection.upsert(ids=ids, documents=chunks, metadatas=metas)
    logger.info(f"ChromaDB: upserted {len(chunks)} chunks for doc {doc_id}")
    return len(chunks)


def _chroma_query(query: str, n_results: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
    collection = _get_chroma_collection()

    where_filter = None
    if doc_ids:
        if len(doc_ids) == 1:
            where_filter = {"doc_id": doc_ids[0]}
        else:
            where_filter = {"doc_id": {"$in": doc_ids}}

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, max(collection.count(), 1)),
        where=where_filter,
    )

    chunks = []
    if results and results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            chunks.append({
                "chunk_id": chunk_id,
                "doc_id": results["metadatas"][0][i].get("doc_id", ""),
                "text": results["documents"][0][i],
                "distance": results["distances"][0][i] if results.get("distances") else None,
            })
    return chunks


def _chroma_delete(doc_id: str) -> None:
    collection = _get_chroma_collection()
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        logger.info(f"ChromaDB: deleted {len(results['ids'])} chunks for doc {doc_id}")


# ---------------------------------------------------------------------------
# Public API — routes to VikingDB or ChromaDB based on config
# ---------------------------------------------------------------------------


def upsert_chunks(doc_id: str, chunks: list[str], metadatas: list[dict] | None = None) -> int:
    """Store document chunks in vector DB. Returns number stored."""
    if _use_vikingdb():
        return _viking_upsert(doc_id, chunks, metadatas)
    return _chroma_upsert(doc_id, chunks, metadatas)


def query_chunks(query: str, n_results: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
    """Query vector DB for relevant chunks. Returns list of {chunk_id, doc_id, text, distance}."""
    if _use_vikingdb():
        return _viking_query(query, n_results, doc_ids)
    return _chroma_query(query, n_results, doc_ids)


def delete_doc(doc_id: str) -> None:
    """Remove all chunks for a document."""
    if _use_vikingdb():
        return _viking_delete(doc_id)
    return _chroma_delete(doc_id)
