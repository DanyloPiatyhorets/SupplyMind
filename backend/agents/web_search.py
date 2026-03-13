import asyncio
import json
import logging
import re
from datetime import datetime, timezone

import config
from skills.search_skill import search_web

logger = logging.getLogger(__name__)

WEB_SEARCH_SYSTEM_PROMPT = """You are a market research analyst with expertise in procurement and supply chains.
You have been given a specific search query and web search results.

Your task is to extract structured market intelligence from the search results.

Return a JSON object with this structure:
{
  "query": "the original search query",
  "market_data": [
    {
      "supplier_name": "...",
      "product": "...",
      "unit_price": null or number,
      "currency": "USD|EUR|GBP|...",
      "price_unit": "per kg|per unit|...",
      "delivery_days": null or number,
      "source_url": "...",
      "retrieved_at": "ISO timestamp",
      "confidence": 0.0-1.0,
      "notes": "any caveats or context"
    }
  ],
  "market_summary": "2-3 sentence summary of market conditions",
  "price_range": {"min": null or number, "max": null or number, "currency": "..."},
  "trend": "rising|stable|falling|unknown"
}

If prices cannot be extracted from results, set unit_price to null and
explain in the notes field. Never fabricate prices."""


async def run_web_search(plan: dict, emit: callable) -> dict:
    """Web search agent — searches live market data, extracts structured MarketData."""
    product = plan.get("context", {}).get("product_focus", "Industrial Steel")
    queries = [q for q in plan.get("research_questions", []) if q.get("agent") == "web_search"]

    if not queries:
        queries = [
            {"agent": "web_search", "query": f"EU {product.lower()} spot price 2025"},
            {"agent": "web_search", "query": f"top EU {product.lower()} suppliers delivery times"},
        ]

    emit("SEARCHING", "web_search", f"Starting market research for {product}...")

    all_results = []
    all_sources = []

    for i, q in enumerate(queries):
        query_text = q.get("query", f"EU {product.lower()} price")
        emit("SEARCHING", "web_search", f"[{i+1}/{len(queries)}] Searching: {query_text}")

        # Run search in thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, search_web, query_text, 5)

        all_results.extend(results)
        all_sources.extend([r.get("url", "") for r in results if r.get("url")])

        source_type = results[0].get("source", "unknown") if results else "none"
        emit("SEARCHING", "web_search", f"[{i+1}/{len(queries)}] Found {len(results)} results (source: {source_type})")

    # Extract structured market data using LLM or fallback
    emit("SEARCHING", "web_search", "Extracting market intelligence from search results...")
    market_intel = await _extract_market_data(product, queries, all_results)
    market_intel["sources"] = list(set(all_sources))

    emit("SEARCHING", "web_search",
         f"Market research complete for {product}. "
         f"Trend: {market_intel.get('trend', 'unknown')}. "
         f"Price range: {market_intel.get('price_range', {}).get('min', '?')}-{market_intel.get('price_range', {}).get('max', '?')} "
         f"{market_intel.get('price_range', {}).get('currency', 'EUR')}/mt.")

    return market_intel


async def _extract_market_data(product: str, queries: list, search_results: list) -> dict:
    """Extract structured market data from search results via LLM or deterministic fallback."""

    # Try LLM extraction if available
    if not config.USE_MOCK_LLM and config.modelark_client:
        try:
            search_text = "\n\n".join([
                f"Title: {r.get('title', '')}\nSnippet: {r.get('body', '')}\nURL: {r.get('url', '')}"
                for r in search_results[:10]
            ])

            response = await config.modelark_client.chat.completions.create(
                model=config.MODELARK_MODEL_ID,
                messages=[
                    {"role": "system", "content": WEB_SEARCH_SYSTEM_PROMPT},
                    {"role": "user", "content": f"Query: {queries[0].get('query', '')}\n\nSearch Results:\n{search_text}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            return json.loads(content)
        except Exception as e:
            logger.warning(f"LLM extraction failed: {e}. Using deterministic extraction.")

    # Deterministic extraction from search result text
    return _deterministic_extract(product, search_results)


def _deterministic_extract(product: str, search_results: list) -> dict:
    """Extract market data from search results without LLM."""
    now = datetime.now(timezone.utc).isoformat()
    market_data = []
    all_prices = []
    all_text = " ".join([r.get("body", "") + " " + r.get("title", "") for r in search_results])

    # Extract prices with regex (look for EUR/€ amounts)
    price_patterns = [
        r'€\s*([\d,]+(?:\.\d+)?)',
        r'EUR\s*([\d,]+(?:\.\d+)?)',
        r'([\d,]+(?:\.\d+)?)\s*(?:EUR|€)',
        r'([\d,]+(?:\.\d+)?)\s*(?:per\s+(?:metric\s+)?ton|/mt|/t)',
    ]

    for pattern in price_patterns:
        matches = re.findall(pattern, all_text, re.IGNORECASE)
        for m in matches:
            try:
                price = float(m.replace(",", ""))
                if 100 < price < 50000:  # Reasonable commodity price range
                    all_prices.append(price)
            except ValueError:
                continue

    # Build market_data entries from search results
    for r in search_results[:5]:
        body = r.get("body", "")
        local_prices = []
        for pattern in price_patterns:
            for m in re.findall(pattern, body, re.IGNORECASE):
                try:
                    p = float(m.replace(",", ""))
                    if 100 < p < 50000:
                        local_prices.append(p)
                except ValueError:
                    continue

        market_data.append({
            "supplier_name": None,
            "product": product,
            "unit_price": local_prices[0] if local_prices else None,
            "currency": "EUR",
            "price_unit": "per metric ton",
            "delivery_days": None,
            "source_url": r.get("url", ""),
            "retrieved_at": now,
            "confidence": 0.7 if local_prices else 0.3,
            "notes": r.get("body", "")[:150],
        })

    price_min = min(all_prices) if all_prices else None
    price_max = max(all_prices) if all_prices else None

    # Build summary from search snippets
    snippets = [r.get("body", "")[:200] for r in search_results[:3] if r.get("body")]
    summary = " ".join(snippets)[:300] if snippets else f"Market data retrieved for {product}. See individual sources for details."

    return {
        "query": f"EU {product.lower()} market data",
        "market_data": market_data,
        "market_summary": summary,
        "price_range": {"min": price_min, "max": price_max, "currency": "EUR"},
        "trend": "stable",
        "sources": [r.get("url", "") for r in search_results if r.get("url")],
    }
