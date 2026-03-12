import json
import uuid
import time
import asyncio
import threading
import logging
from queue import Queue, Empty
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

import config
from agents.orchestrator import decompose_goal
from agents.contract_agent import run_contract_analysis
from agents.synthesis import run_synthesis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=[config.FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"])


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

def get_db():
    conn = psycopg2.connect(config.DATABASE_URL)
    conn.autocommit = True
    return conn


# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------

jobs: dict[str, dict] = {}


def emit_event(job_id: str, event: str, agent: str, message: str, data: dict | None = None) -> None:
    """Push a trace event to the job's event queue."""
    if job_id not in jobs:
        return
    evt = {
        "event": event,
        "agent": agent,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "message": message,
    }
    if data:
        evt["data"] = data
    jobs[job_id]["queue"].put(evt)
    jobs[job_id]["trace"].append(evt)


# ---------------------------------------------------------------------------
# Agent pipeline (runs in background thread)
# ---------------------------------------------------------------------------

def _run_pipeline(job_id: str, goal: str, doc_ids: list[str]) -> None:
    """Run the full agent pipeline in a background thread with its own event loop."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_async_pipeline(job_id, goal, doc_ids))
    except Exception as e:
        logger.exception(f"Pipeline failed for job {job_id}")
        emit_event(job_id, "ERROR", "orchestrator", f"Pipeline failed: {e}")
    finally:
        # Signal end of stream
        jobs[job_id]["queue"].put(None)
        loop.close()


async def _async_pipeline(job_id: str, goal: str, doc_ids: list[str]) -> None:
    """The actual async agent pipeline."""

    # Step 1: Orchestrator decomposes goal
    emit_event(job_id, "PLAN", "orchestrator", "Decomposing procurement goal into research plan...")
    plan = await decompose_goal(goal)
    emit_event(job_id, "PLAN", "orchestrator", f"Plan ready: {plan.get('goal_summary', goal)}", {
        "research_questions": len(plan.get("research_questions", [])),
        "product_focus": plan.get("context", {}).get("product_focus", "general"),
    })

    # Step 2: Run sub-agents (web_search and rag are still mock, contract is real)
    emit_event(job_id, "SEARCHING", "web_search", "Querying live market data for current prices...")
    emit_event(job_id, "RAG_QUERY", "document_rag", "Searching uploaded documents for relevant insights...")
    emit_event(job_id, "ANALYZING", "contract_analysis", "Loading contracts from database...")

    # Mock web search results (real implementation in Block 8)
    async def mock_web_search(plan: dict) -> dict:
        await asyncio.sleep(0.3)  # Simulate latency
        product = plan.get("context", {}).get("product_focus", "Industrial Steel")
        return {
            "market_summary": f"EU {product.lower()} prices remain stable. Average spot price for Industrial Steel: €847/mt, Aluminium Alloy: €2,350/mt.",
            "market_data": [],
            "sources": ["mock-market-data"],
            "trend": "stable",
        }

    # Mock RAG results (real implementation in Block 9)
    async def mock_rag(plan: dict) -> dict:
        await asyncio.sleep(0.2)  # Simulate latency
        return {
            "answer": "No documents uploaded for this analysis." if not doc_ids else "Document analysis pending RAG implementation.",
            "citations": [],
            "confidence": 0.0,
            "gaps": "No uploaded documents available for RAG analysis.",
        }

    # Run all three in parallel
    web_result, rag_result, contract_result = await asyncio.gather(
        mock_web_search(plan),
        mock_rag(plan),
        run_contract_analysis(plan),
        return_exceptions=True,
    )

    # Handle exceptions from gather
    if isinstance(web_result, Exception):
        logger.error(f"Web search failed: {web_result}")
        web_result = {"market_summary": "Web search unavailable", "sources": []}
    if isinstance(rag_result, Exception):
        logger.error(f"RAG failed: {rag_result}")
        rag_result = {"answer": "RAG unavailable", "citations": []}
    if isinstance(contract_result, Exception):
        logger.error(f"Contract analysis failed: {contract_result}")
        emit_event(job_id, "ERROR", "contract_analysis", f"Analysis failed: {contract_result}")
        contract_result = {"flavours": {}, "data_corrections": []}

    emit_event(job_id, "SEARCHING", "web_search", f"Market research complete. Trend: {web_result.get('trend', 'unknown')}.")
    emit_event(job_id, "RAG_QUERY", "document_rag", f"Document analysis complete. Confidence: {rag_result.get('confidence', 0):.0%}.")
    emit_event(job_id, "ANALYZING", "contract_analysis",
        f"Contract analysis complete: {contract_result.get('contracts_analyzed', 0)} contracts analyzed, "
        f"{len(contract_result.get('data_corrections', []))} corrections found.")

    # Step 3: Synthesis
    emit_event(job_id, "SYNTHESIZING", "synthesis", "Building executive procurement report...")

    report = await run_synthesis(
        goal=goal,
        market_data=web_result,
        rag_results=rag_result,
        contract_results=contract_result,
        job_id=job_id,
    )

    # Store result
    jobs[job_id]["result"] = report
    jobs[job_id]["status"] = "COMPLETE"

    emit_event(job_id, "COMPLETE", "orchestrator", "Analysis complete. Report ready for review.")


# ---------------------------------------------------------------------------
# GET /api/contracts — real DB data
# ---------------------------------------------------------------------------

@app.route("/api/contracts")
def get_contracts():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT c.*, co.name as company_name, p.name as product_name
        FROM contracts c
        JOIN companies co ON c.company_id = co.id
        JOIN products p ON c.product_id = p.id
        ORDER BY c.id
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        r = dict(row)
        r["unit_price"] = float(r["unit_price"])
        r["credibility_score"] = float(r["credibility_score"])
        if r.get("deadline"):
            r["deadline"] = r["deadline"].isoformat()
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
        result.append(r)
    return jsonify(result)


# ---------------------------------------------------------------------------
# GET /api/products — real DB data
# ---------------------------------------------------------------------------

@app.route("/api/products")
def get_products():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM products ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        r = dict(row)
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
        result.append(r)
    return jsonify(result)


# ---------------------------------------------------------------------------
# GET /api/companies — real DB data
# ---------------------------------------------------------------------------

@app.route("/api/companies")
def get_companies():
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM companies ORDER BY id")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    result = []
    for row in rows:
        r = dict(row)
        if r.get("created_at"):
            r["created_at"] = r["created_at"].isoformat()
        result.append(r)
    return jsonify(result)


# ---------------------------------------------------------------------------
# POST /api/run — start real agent pipeline
# ---------------------------------------------------------------------------

@app.route("/api/run", methods=["POST"])
def run_agent():
    data = request.get_json(force=True)
    goal = data.get("goal", "")
    doc_ids = data.get("doc_ids", [])

    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "id": job_id,
        "goal": goal,
        "doc_ids": doc_ids,
        "status": "RUNNING",
        "trace": [],
        "result": None,
        "queue": Queue(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Run pipeline in background thread
    thread = threading.Thread(target=_run_pipeline, args=(job_id, goal, doc_ids), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "status": "RUNNING"})


# ---------------------------------------------------------------------------
# GET /api/trace/<job_id> — real SSE stream from agent pipeline
# ---------------------------------------------------------------------------

@app.route("/api/trace/<job_id>")
def trace_stream(job_id):
    def generate():
        if job_id not in jobs:
            yield f"data: {json.dumps({'event': 'ERROR', 'agent': 'system', 'message': 'Job not found', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
            return

        queue = jobs[job_id]["queue"]
        while True:
            try:
                event = queue.get(timeout=30)
                if event is None:  # Sentinel — pipeline done
                    break
                yield f"data: {json.dumps(event)}\n\n"
            except Empty:
                # Send keepalive
                yield f": keepalive\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ---------------------------------------------------------------------------
# GET /api/report/<job_id> — real report from pipeline
# ---------------------------------------------------------------------------

@app.route("/api/report/<job_id>")
def get_report(job_id):
    if job_id not in jobs:
        return jsonify({"error": "Job not found"}), 404

    job = jobs[job_id]
    if job["result"] is None:
        return jsonify({"error": "Report not ready yet", "status": job["status"]}), 202

    return jsonify(job["result"])


# ---------------------------------------------------------------------------
# POST /api/upload-doc — mock PDF upload (real in Block 9)
# ---------------------------------------------------------------------------

@app.route("/api/upload-doc", methods=["POST"])
def upload_doc():
    doc_id = str(uuid.uuid4())
    return jsonify({"doc_id": doc_id, "chunks": 5})


# ---------------------------------------------------------------------------
# POST /api/approve
# ---------------------------------------------------------------------------

@app.route("/api/approve", methods=["POST"])
def approve():
    data = request.get_json(force=True)
    flavour_id = data.get("flavour_id", "cheapest")
    job_id = data.get("job_id", "")

    if job_id in jobs:
        jobs[job_id]["status"] = "APPROVED"
        jobs[job_id]["approved_flavour"] = flavour_id

    return jsonify({"approved": True, "flavour_id": flavour_id, "job_id": job_id})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.FLASK_PORT, debug=True, use_reloader=False)
