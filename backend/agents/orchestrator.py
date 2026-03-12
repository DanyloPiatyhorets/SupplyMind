import json
import logging
from datetime import datetime, timezone

import config

logger = logging.getLogger(__name__)

ORCHESTRATOR_SYSTEM_PROMPT = """You are a procurement intelligence orchestrator for an enterprise ERP system.
Your role is to analyze a procurement goal and decompose it into a structured
research plan that will guide parallel sub-agents.

You have access to three specialist agents:
1. web_search — searches live market data for prices, suppliers, and trends
2. document_rag — retrieves insights from uploaded industry reports and catalogues
3. contract_analysis — analyzes existing contracts and identifies optimization opportunities

Given a procurement goal, produce a JSON research plan with this exact structure:
{
  "goal_summary": "one sentence restatement of the goal",
  "research_questions": [
    {"agent": "web_search", "query": "specific search query"},
    {"agent": "web_search", "query": "specific search query"},
    {"agent": "document_rag", "query": "specific question for uploaded documents"},
    {"agent": "contract_analysis", "task": "specific analysis task"}
  ],
  "optimization_strategies": ["cheapest", "lowest_risk", "fastest"],
  "key_risks": ["list of procurement risks to watch for"],
  "context": {
    "product_focus": "...",
    "timeline_sensitivity": "high|medium|low",
    "budget_sensitivity": "high|medium|low"
  }
}

Rules:
- Always include at least 2 web_search queries
- Always include at least 1 document_rag query
- Always include the contract_analysis task
- Be specific in queries — avoid vague questions
- Return only valid JSON, no preamble"""


async def decompose_goal(goal: str) -> dict:
    """Use LLM to decompose a procurement goal into a research plan."""

    if config.USE_MOCK_LLM or config.modelark_client is None:
        logger.info("Using mock goal decomposition")
        return _mock_plan(goal)

    try:
        response = await config.modelark_client.chat.completions.create(
            model=config.MODELARK_MODEL_ID,
            messages=[
                {"role": "system", "content": ORCHESTRATOR_SYSTEM_PROMPT},
                {"role": "user", "content": goal},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        plan = json.loads(content)
        logger.info(f"Goal decomposed via ModelArk: {plan.get('goal_summary', '')}")
        return plan

    except Exception as e:
        logger.warning(f"ModelArk decomposition failed: {e}. Using mock plan.")
        return _mock_plan(goal)


def _mock_plan(goal: str) -> dict:
    """Keyword-based fallback plan when LLM is unavailable."""
    goal_lower = goal.lower()

    # Detect product focus
    if "aluminium" in goal_lower or "aluminum" in goal_lower:
        product = "Aluminium Alloy"
    elif "steel" in goal_lower:
        product = "Industrial Steel"
    else:
        product = "Industrial Steel"

    # Detect sensitivities
    timeline = "high" if any(w in goal_lower for w in ["urgent", "fast", "emergency", "asap"]) else "medium"
    budget = "high" if any(w in goal_lower for w in ["cheap", "cost", "budget", "save"]) else "medium"

    return {
        "goal_summary": goal,
        "research_questions": [
            {"agent": "web_search", "query": f"EU {product.lower()} spot price 2025"},
            {"agent": "web_search", "query": f"top EU {product.lower()} suppliers delivery times"},
            {"agent": "document_rag", "query": f"What do uploaded documents say about {product.lower()} procurement risks and supplier terms?"},
            {"agent": "contract_analysis", "task": f"Analyze all contracts for {product}, compare owned vs market prices, generate 3 optimization flavours"},
        ],
        "optimization_strategies": ["cheapest", "lowest_risk", "fastest"],
        "key_risks": [
            "Price volatility in commodity markets",
            "Supplier delivery delays",
            "Currency exchange fluctuations",
            "Contract termination penalties",
        ],
        "context": {
            "product_focus": product,
            "timeline_sensitivity": timeline,
            "budget_sensitivity": budget,
        },
    }
