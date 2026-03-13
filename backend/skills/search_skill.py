import os
import json
import logging
from datetime import datetime, timezone

import requests

logger = logging.getLogger(__name__)

SERPER_API_KEY = os.environ.get("SERPER_API_KEY", "")


def search_web(query: str, num_results: int = 5) -> list[dict]:
    """Search the web using the best available provider.

    Tier 1: Serper API (if key set)
    Tier 2: DuckDuckGo (no key needed)
    Tier 3: Seeded mock data (always works)
    """
    if SERPER_API_KEY:
        results = _serper_search(query, num_results)
        if results:
            return results

    results = _ddg_search(query, num_results)
    if results:
        return results

    logger.info("All search providers failed, using seeded market data")
    return _mock_search(query)


def _serper_search(query: str, num_results: int) -> list[dict]:
    """Search via Serper API (Google results)."""
    try:
        resp = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": query, "num": num_results},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()

        results = []
        for item in data.get("organic", [])[:num_results]:
            results.append({
                "title": item.get("title", ""),
                "body": item.get("snippet", ""),
                "url": item.get("link", ""),
                "source": "serper",
            })
        logger.info(f"Serper returned {len(results)} results for: {query}")
        return results
    except Exception as e:
        logger.warning(f"Serper search failed: {e}")
        return []


def _ddg_search(query: str, num_results: int) -> list[dict]:
    """Search via DuckDuckGo (no API key needed)."""
    try:
        import warnings
        warnings.filterwarnings("ignore")
        from duckduckgo_search import DDGS

        ddgs = DDGS()
        raw = list(ddgs.text(query, region="wt-wt", max_results=num_results))

        results = []
        for item in raw:
            results.append({
                "title": item.get("title", ""),
                "body": item.get("body", ""),
                "url": item.get("href", ""),
                "source": "duckduckgo",
            })
        logger.info(f"DuckDuckGo returned {len(results)} results for: {query}")
        return results
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
        return []


def _mock_search(query: str) -> list[dict]:
    """Seeded market data fallback — always available."""
    query_lower = query.lower()
    now = datetime.now(timezone.utc).isoformat()

    if "aluminium" in query_lower or "aluminum" in query_lower:
        return [
            {"title": "EU Aluminium Alloy Spot Price Q3 2025", "body": "Aluminium alloy prices in the EU range from €2,310 to €2,380 per metric ton. Energy costs continue to push prices upward with a 2% quarterly increase trend.", "url": "https://market-data.example/aluminium-eu-2025", "source": "seeded", "retrieved_at": now},
            {"title": "Top EU Aluminium Suppliers 2025", "body": "Major suppliers include GermSteel GmbH (Germany), FranceMetal SA (France), delivering within 10-25 days. GermSteel offers premium pricing at €2,380/mt with fastest delivery.", "url": "https://market-data.example/suppliers-aluminium", "source": "seeded", "retrieved_at": now},
        ]
    else:
        return [
            {"title": "EU Industrial Steel Spot Price Q3 2025", "body": "Industrial steel prices in the EU remain stable at €830-865 per metric ton. PolyChem Ltd offers the lowest price at €830/mt but with 28-day delivery. GermSteel GmbH premium at €865/mt with 7-day express.", "url": "https://market-data.example/steel-eu-2025", "source": "seeded", "retrieved_at": now},
            {"title": "EU Steel Supply Chain Analysis 2025", "body": "EU steel imports face 3-5% tariff increases in Q4 2025. Eastern European supply routes showing increased risk. Western EU suppliers (Germany, France) maintain reliable delivery corridors.", "url": "https://market-data.example/steel-supply-chain", "source": "seeded", "retrieved_at": now},
            {"title": "Steel Supplier Delivery Performance 2025", "body": "Average delivery times: GermSteel 7-14 days, FranceMetal 14-18 days, PolyChem 25-30 days. Credibility scores range 0.78-0.95 based on on-time delivery rates.", "url": "https://market-data.example/delivery-performance", "source": "seeded", "retrieved_at": now},
        ]
