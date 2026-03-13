"""RAG skill — vector store abstraction over ChromaDB (VikingDB-swappable)."""

import logging
from typing import Optional

import chromadb
from chromadb.config import Settings

import config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Singleton ChromaDB client
# ---------------------------------------------------------------------------

_chroma_client: Optional[chromadb.ClientAPI] = None
_collection: Optional[chromadb.Collection] = None

COLLECTION_NAME = "supplymind_docs"


def _get_collection() -> chromadb.Collection:
    """Lazy-init ChromaDB collection with default embedding (all-MiniLM-L6-v2 via onnxruntime)."""
    global _chroma_client, _collection
    if _collection is not None:
        return _collection

    # ChromaDB's default embedding uses all-MiniLM-L6-v2 via onnxruntime
    # (no torch/sentence-transformers dependency needed)
    _chroma_client = chromadb.Client(Settings(anonymized_telemetry=False))
    _collection = _chroma_client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )
    logger.info(f"ChromaDB collection '{COLLECTION_NAME}' ready (count={_collection.count()})")
    return _collection


def upsert_chunks(doc_id: str, chunks: list[str], metadatas: list[dict] | None = None) -> int:
    """Store document chunks in vector DB. Returns number stored."""
    collection = _get_collection()
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metas = metadatas or [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(
        ids=ids,
        documents=chunks,
        metadatas=metas,
    )
    logger.info(f"Upserted {len(chunks)} chunks for doc {doc_id}")
    return len(chunks)


def query_chunks(query: str, n_results: int = 5, doc_ids: list[str] | None = None) -> list[dict]:
    """Query vector DB for relevant chunks. Returns list of {chunk_id, doc_id, text, distance}."""
    collection = _get_collection()

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


def delete_doc(doc_id: str) -> None:
    """Remove all chunks for a document."""
    collection = _get_collection()
    # Get all IDs for this doc
    results = collection.get(where={"doc_id": doc_id})
    if results["ids"]:
        collection.delete(ids=results["ids"])
        logger.info(f"Deleted {len(results['ids'])} chunks for doc {doc_id}")
