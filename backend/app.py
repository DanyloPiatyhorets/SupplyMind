import json
import uuid
import time
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

import config

app = Flask(__name__)
CORS(app, origins=[config.FRONTEND_URL, "http://localhost:5173"])


# ---------------------------------------------------------------------------
# DB helper
# ---------------------------------------------------------------------------

def get_db():
    conn = psycopg2.connect(config.DATABASE_URL)
    conn.autocommit = True
    return conn


# ---------------------------------------------------------------------------
# In-memory job store (sufficient for demo)
# ---------------------------------------------------------------------------

jobs: dict[str, dict] = {}


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
    # Convert Decimal/date to JSON-safe types
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
# POST /api/run — start agent job (mock)
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
        "status": "QUEUED",
        "trace": [],
        "result": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return jsonify({"job_id": job_id, "status": "QUEUED"})


# ---------------------------------------------------------------------------
# GET /api/trace/<job_id> — SSE stream (mock events)
# ---------------------------------------------------------------------------

MOCK_TRACE_EVENTS = [
    {"event": "PLAN", "agent": "orchestrator", "message": "Decomposing procurement goal into research plan..."},
    {"event": "SEARCHING", "agent": "web_search", "message": "Querying EU steel and aluminium spot prices..."},
    {"event": "RAG_QUERY", "agent": "document_rag", "message": "Searching uploaded documents for supplier terms..."},
    {"event": "ANALYZING", "agent": "contract_analysis", "message": "Loading owned contracts and market offers..."},
    {"event": "CORRECTING", "agent": "contract_analysis", "message": "Comparing contract prices against market rates..."},
    {"event": "SEARCHING", "agent": "web_search", "message": "Found 4 market data points for Industrial Steel."},
    {"event": "RAG_QUERY", "agent": "document_rag", "message": "Retrieved 3 relevant document chunks with citations."},
    {"event": "ANALYZING", "agent": "contract_analysis", "message": "Generated 3 optimization flavours: cheapest, lowest-risk, fastest."},
    {"event": "SYNTHESIZING", "agent": "synthesis", "message": "Building executive procurement report..."},
    {"event": "COMPLETE", "agent": "orchestrator", "message": "Analysis complete. Report ready for review."},
]


@app.route("/api/trace/<job_id>")
def trace_stream(job_id):
    def generate():
        for evt in MOCK_TRACE_EVENTS:
            event = {
                **evt,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            yield f"data: {json.dumps(event)}\n\n"
            time.sleep(0.5)

    return Response(generate(), mimetype="text/event-stream")


# ---------------------------------------------------------------------------
# GET /api/report/<job_id> — mock AnalysisReport
# ---------------------------------------------------------------------------

MOCK_REPORT = {
    "executive_summary": "Analysis of EU steel and aluminium procurement options reveals significant cost optimization opportunities. GermSteel GmbH's Industrial Steel contract is 15.3% above current market rates, and FranceMetal SA's Aluminium Alloy contract is 14.9% above market. Renegotiation or replacement could save approximately €47,500 across both contracts.",
    "market_intelligence": {
        "overview": "EU steel prices remain stable at €830-865/metric ton. Aluminium alloy prices range €2,310-2,380/metric ton with slight upward pressure due to energy costs.",
        "key_findings": [
            "Industrial Steel spot price averaging €847/mt across EU suppliers",
            "Aluminium Alloy showing 2% quarterly increase trend",
            "Fastest delivery available at 7 days from GermSteel (premium pricing)",
            "PolyChem Ltd offers lowest steel price at €830/mt but 28-day delivery",
        ],
        "sources": ["market-data-eu-metals-2025.pdf"],
    },
    "document_insights": {
        "overview": "Uploaded procurement reports indicate growing supply chain risk in Eastern European steel markets.",
        "key_quotes": [
            {"text": "EU steel imports face 3-5% tariff increases in Q4 2025", "doc_id": "demo-report"},
        ],
    },
    "optimization_variants": {
        "cheapest": {
            "label": "Cheapest",
            "description": "Minimizes total cost by selecting lowest-price market offers",
            "selected_contracts": [9, 12],
            "total_cost": 118400.0,
            "delivery_days": 28,
            "risk_score": 0.35,
            "savings_vs_current": 47500.0,
        },
        "lowest_risk": {
            "label": "Lowest Risk",
            "description": "Prioritizes supplier credibility and reliability",
            "selected_contracts": [10, 13],
            "total_cost": 135200.0,
            "delivery_days": 14,
            "risk_score": 0.08,
            "savings_vs_current": 30700.0,
        },
        "fastest": {
            "label": "Fastest",
            "description": "Minimizes delivery time for urgent procurement",
            "selected_contracts": [10, 13],
            "total_cost": 138900.0,
            "delivery_days": 10,
            "risk_score": 0.12,
            "savings_vs_current": 27300.0,
        },
    },
    "data_corrections": [
        {
            "contract_id": 1,
            "field": "unit_price",
            "current_value": 980.0,
            "market_value": 847.5,
            "delta_pct": 15.3,
            "severity": "high",
            "recommendation": "renegotiate",
        },
        {
            "contract_id": 4,
            "field": "unit_price",
            "current_value": 2700.0,
            "market_value": 2350.0,
            "delta_pct": 14.9,
            "severity": "high",
            "recommendation": "replace",
        },
    ],
    "recommended_variant": "cheapest",
    "recommendation_rationale": "Given the goal of cost optimization, the Cheapest variant delivers €47,500 in savings with acceptable delivery timeline. Risk score of 0.35 is within normal range for market offers.",
    "risks_and_mitigations": [
        {"risk": "Supplier delivery delays", "likelihood": "medium", "mitigation": "Include penalty clauses in new contracts"},
        {"risk": "Price volatility in aluminium", "likelihood": "high", "mitigation": "Lock in Q3 pricing with forward contracts"},
    ],
    "next_steps": [
        "Initiate renegotiation with GermSteel GmbH on Industrial Steel contract",
        "Request formal quotes from PolyChem Ltd for steel supply",
        "Review FranceMetal SA aluminium contract for early termination options",
    ],
    "report_metadata": {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "mock",
        "agent_trace_id": "mock-job-id",
    },
}


@app.route("/api/report/<job_id>")
def get_report(job_id):
    report = {**MOCK_REPORT}
    report["report_metadata"]["agent_trace_id"] = job_id
    report["report_metadata"]["generated_at"] = datetime.now(timezone.utc).isoformat()
    return jsonify(report)


# ---------------------------------------------------------------------------
# POST /api/upload-doc — mock PDF upload
# ---------------------------------------------------------------------------

@app.route("/api/upload-doc", methods=["POST"])
def upload_doc():
    doc_id = str(uuid.uuid4())
    return jsonify({"doc_id": doc_id, "chunks": 5})


# ---------------------------------------------------------------------------
# POST /api/approve — mock approval
# ---------------------------------------------------------------------------

@app.route("/api/approve", methods=["POST"])
def approve():
    data = request.get_json(force=True)
    flavour_id = data.get("flavour_id", "cheapest")
    job_id = data.get("job_id", "")
    return jsonify({"approved": True, "flavour_id": flavour_id, "job_id": job_id})


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.FLASK_PORT, debug=True)
