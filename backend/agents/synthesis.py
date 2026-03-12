import json
import logging
from datetime import datetime, timezone

import config

logger = logging.getLogger(__name__)

SYNTHESIS_SYSTEM_PROMPT = """You are a senior procurement consultant writing an executive intelligence report.
You have received analysis from three specialist agents:
1. Market intelligence from web research
2. Document insights from uploaded industry reports
3. Contract analysis with optimization variants and data corrections

Your task is to synthesize these into a structured executive report.

Return a JSON object with this structure:
{
  "executive_summary": "3-4 sentence summary of findings and recommendation",
  "market_intelligence": {
    "overview": "paragraph on current market conditions",
    "key_findings": ["list of 3-5 bullet points"],
    "sources": ["cited URLs"]
  },
  "document_insights": {
    "overview": "what the uploaded documents revealed",
    "key_quotes": [{"text": "...", "doc_id": "..."}]
  },
  "optimization_variants": {
    "cheapest": { ... },
    "lowest_risk": { ... },
    "fastest": { ... }
  },
  "data_corrections": [ ... ],
  "recommended_variant": "cheapest|lowest_risk|fastest",
  "recommendation_rationale": "why this variant is recommended given the goal",
  "risks_and_mitigations": [
    {"risk": "...", "likelihood": "high|medium|low", "mitigation": "..."}
  ],
  "next_steps": ["ordered list of recommended actions post-approval"],
  "report_metadata": {
    "generated_at": "ISO timestamp",
    "model": "model name used",
    "agent_trace_id": "job_id"
  }
}

Write in the tone of a senior consultant briefing a CPO.
Be direct and specific. Avoid hedging language.
The report will be presented directly to a C-level executive."""


async def run_synthesis(
    goal: str,
    market_data: dict,
    rag_results: dict,
    contract_results: dict,
    job_id: str,
) -> dict:
    """Synthesize all agent results into a final AnalysisReport."""

    if config.USE_MOCK_LLM or config.modelark_client is None:
        logger.info("Using mock synthesis (ModelArk unavailable)")
        return _mock_synthesis(goal, market_data, rag_results, contract_results, job_id)

    user_message = f"""Goal: {goal}

Market Intelligence Data:
{json.dumps(market_data, indent=2)}

Document RAG Results:
{json.dumps(rag_results, indent=2)}

Contract Analysis Results:
{json.dumps(contract_results, indent=2)}

Job ID: {job_id}
Current timestamp: {datetime.now(timezone.utc).isoformat()}

Synthesize these into the executive report JSON structure specified."""

    try:
        response = await config.modelark_client.chat.completions.create(
            model=config.MODELARK_MODEL_ID,
            messages=[
                {"role": "system", "content": SYNTHESIS_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        report = json.loads(content)

        # Ensure metadata is set correctly
        report["report_metadata"] = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": response.model or config.MODELARK_MODEL_ID,
            "agent_trace_id": job_id,
        }

        logger.info(f"Synthesis complete via ModelArk (model={response.model})")
        return report

    except Exception as e:
        logger.warning(f"ModelArk synthesis failed: {e}. Falling back to mock.")
        return _mock_synthesis(goal, market_data, rag_results, contract_results, job_id)


def _mock_synthesis(
    goal: str,
    market_data: dict,
    rag_results: dict,
    contract_results: dict,
    job_id: str,
) -> dict:
    """Template-based fallback when ModelArk is unavailable."""

    # Use real contract results if available, otherwise defaults
    flavours = contract_results.get("flavours", {
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
    })

    corrections = contract_results.get("data_corrections", [
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
    ])

    market_overview = market_data.get(
        "market_summary",
        "EU steel prices remain stable at €830-865/metric ton. Aluminium alloy prices range €2,310-2,380/metric ton with slight upward pressure due to energy costs.",
    )

    return {
        "executive_summary": f"Analysis of procurement goal '{goal}' reveals significant cost optimization opportunities. Two owned contracts are priced 12-18% above current market rates. Renegotiation or replacement could yield substantial savings while maintaining supply reliability.",
        "market_intelligence": {
            "overview": market_overview,
            "key_findings": [
                "Industrial Steel spot price averaging €847/mt across EU suppliers",
                "Aluminium Alloy showing 2% quarterly increase trend",
                "Fastest delivery available at 7 days (premium pricing)",
                "Lowest price at €830/mt but with 28-day delivery window",
            ],
            "sources": market_data.get("sources", ["seeded market data"]),
        },
        "document_insights": {
            "overview": rag_results.get("answer", "No documents uploaded for this analysis."),
            "key_quotes": rag_results.get("citations", []),
        },
        "optimization_variants": flavours,
        "data_corrections": corrections,
        "recommended_variant": "cheapest",
        "recommendation_rationale": "The Cheapest variant delivers maximum cost savings with an acceptable delivery timeline and risk profile for non-urgent procurement.",
        "risks_and_mitigations": [
            {"risk": "Supplier delivery delays", "likelihood": "medium", "mitigation": "Include penalty clauses in new contracts"},
            {"risk": "Price volatility in aluminium", "likelihood": "high", "mitigation": "Lock in Q3 pricing with forward contracts"},
            {"risk": "New supplier reliability unknown", "likelihood": "medium", "mitigation": "Start with small trial order before full volume commitment"},
        ],
        "next_steps": [
            "Renegotiate overpriced owned contracts flagged in data corrections",
            "Request formal quotes from top-ranked market suppliers",
            "Review contract termination options for replaced agreements",
            "Set up quarterly price monitoring for key commodities",
        ],
        "report_metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model": "mock-fallback",
            "agent_trace_id": job_id,
        },
    }
