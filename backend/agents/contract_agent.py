import logging
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras

import config

logger = logging.getLogger(__name__)


def _load_contracts() -> list[dict]:
    """Load all contracts with company and product names from DB."""
    conn = psycopg2.connect(config.DATABASE_URL)
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
    return result


def detect_corrections(owned: list[dict], market: list[dict], market_data: dict | None = None) -> list[dict]:
    """Compare owned contract prices against market offers. Flag >5% deltas."""
    # Build market avg price per product_id from MARKET contracts
    market_prices: dict[int, list[float]] = {}
    for c in market:
        pid = c["product_id"]
        market_prices.setdefault(pid, []).append(c["unit_price"])

    # Also incorporate live market data if available
    # (market_data from web search would go here in future)

    corrections = []
    for c in owned:
        pid = c["product_id"]
        if pid not in market_prices:
            continue

        avg_market = sum(market_prices[pid]) / len(market_prices[pid])
        delta = (c["unit_price"] - avg_market) / avg_market

        if abs(delta) > 0.05:  # 5% threshold
            severity = "high" if abs(delta) > 0.12 else "medium" if abs(delta) > 0.08 else "low"
            recommendation = "replace" if delta > 0.15 else "renegotiate" if delta > 0.08 else "monitor"
            corrections.append({
                "contract_id": c["id"],
                "field": "unit_price",
                "current_value": c["unit_price"],
                "market_value": round(avg_market, 2),
                "delta_pct": round(delta * 100, 1),
                "severity": severity,
                "recommendation": recommendation,
            })

    return corrections


def _build_flavours(
    owned: list[dict],
    market: list[dict],
    product_focus: str | None = None,
) -> dict:
    """Build three optimization flavours: cheapest, lowest-risk, fastest."""

    # Filter by product focus if specified
    if product_focus:
        relevant_market = [c for c in market if c["product_name"].lower() == product_focus.lower()]
        if not relevant_market:
            relevant_market = market  # fall back to all
    else:
        relevant_market = market

    # Sort by different criteria
    by_price = sorted(relevant_market, key=lambda c: c["unit_price"])
    by_risk = sorted(relevant_market, key=lambda c: -c["credibility_score"])
    by_speed = sorted(relevant_market, key=lambda c: c["delivery_days"])

    # Current cost baseline (from owned contracts)
    relevant_owned = owned
    if product_focus:
        relevant_owned = [c for c in owned if c["product_name"].lower() == product_focus.lower()]
        if not relevant_owned:
            relevant_owned = owned

    current_total = sum(c["unit_price"] * c["volume"] for c in relevant_owned) if relevant_owned else 0

    def _make_flavour(label: str, desc: str, ranked: list[dict]) -> dict:
        # Pick top 2 contracts
        selected = ranked[:2] if len(ranked) >= 2 else ranked
        total_cost = sum(c["unit_price"] * c["volume"] for c in selected)
        max_delivery = max((c["delivery_days"] for c in selected), default=0)
        avg_risk = 1 - (sum(c["credibility_score"] for c in selected) / len(selected)) if selected else 0.5
        savings = current_total - total_cost if current_total > 0 else 0

        return {
            "label": label,
            "description": desc,
            "selected_contracts": [c["id"] for c in selected],
            "total_cost": round(total_cost, 2),
            "delivery_days": max_delivery,
            "risk_score": round(avg_risk, 2),
            "savings_vs_current": round(savings, 2),
        }

    return {
        "cheapest": _make_flavour("Cheapest", "Minimizes total cost by selecting lowest-price market offers", by_price),
        "lowest_risk": _make_flavour("Lowest Risk", "Prioritizes supplier credibility and reliability", by_risk),
        "fastest": _make_flavour("Fastest", "Minimizes delivery time for urgent procurement", by_speed),
    }


def _seeded_contracts() -> list[dict]:
    """Fallback contract data when DB is unavailable (matches seed.sql)."""
    return [
        # Owned contracts (2 intentionally overpriced)
        {"id": 1, "company_id": 1, "product_id": 1, "company_name": "GermSteel GmbH", "product_name": "Industrial Steel", "direction": "IN", "source": "OWNED", "unit_price": 980.0, "volume": 100, "delivery_days": 14, "credibility_score": 0.92, "deadline": "2025-09-30"},
        {"id": 2, "company_id": 1, "product_id": 2, "company_name": "GermSteel GmbH", "product_name": "Aluminium Alloy", "direction": "IN", "source": "OWNED", "unit_price": 2380.0, "volume": 50, "delivery_days": 21, "credibility_score": 0.92, "deadline": "2025-10-15"},
        {"id": 3, "company_id": 2, "product_id": 1, "company_name": "FranceMetal SA", "product_name": "Industrial Steel", "direction": "IN", "source": "OWNED", "unit_price": 850.0, "volume": 150, "delivery_days": 18, "credibility_score": 0.88, "deadline": "2025-09-15"},
        {"id": 4, "company_id": 2, "product_id": 2, "company_name": "FranceMetal SA", "product_name": "Aluminium Alloy", "direction": "IN", "source": "OWNED", "unit_price": 2700.0, "volume": 60, "delivery_days": 14, "credibility_score": 0.88, "deadline": "2025-08-30"},
        {"id": 5, "company_id": 3, "product_id": 1, "company_name": "PolyChem Ltd", "product_name": "Industrial Steel", "direction": "OUT", "source": "OWNED", "unit_price": 870.0, "volume": 80, "delivery_days": 25, "credibility_score": 0.78, "deadline": "2025-11-01"},
        {"id": 6, "company_id": 3, "product_id": 2, "company_name": "PolyChem Ltd", "product_name": "Aluminium Alloy", "direction": "OUT", "source": "OWNED", "unit_price": 2350.0, "volume": 40, "delivery_days": 28, "credibility_score": 0.78, "deadline": "2025-10-01"},
        # Market offers
        {"id": 7, "company_id": 1, "product_id": 1, "company_name": "GermSteel GmbH", "product_name": "Industrial Steel", "direction": "IN", "source": "MARKET", "unit_price": 865.0, "volume": 200, "delivery_days": 7, "credibility_score": 0.95, "deadline": "2025-12-31"},
        {"id": 8, "company_id": 1, "product_id": 2, "company_name": "GermSteel GmbH", "product_name": "Aluminium Alloy", "direction": "IN", "source": "MARKET", "unit_price": 2380.0, "volume": 100, "delivery_days": 10, "credibility_score": 0.95, "deadline": "2025-12-31"},
        {"id": 9, "company_id": 2, "product_id": 1, "company_name": "FranceMetal SA", "product_name": "Industrial Steel", "direction": "IN", "source": "MARKET", "unit_price": 845.0, "volume": 250, "delivery_days": 14, "credibility_score": 0.90, "deadline": "2025-12-31"},
        {"id": 10, "company_id": 2, "product_id": 2, "company_name": "FranceMetal SA", "product_name": "Aluminium Alloy", "direction": "IN", "source": "MARKET", "unit_price": 2310.0, "volume": 80, "delivery_days": 18, "credibility_score": 0.90, "deadline": "2025-12-31"},
        {"id": 11, "company_id": 3, "product_id": 1, "company_name": "PolyChem Ltd", "product_name": "Industrial Steel", "direction": "IN", "source": "MARKET", "unit_price": 830.0, "volume": 300, "delivery_days": 28, "credibility_score": 0.82, "deadline": "2025-12-31"},
        {"id": 12, "company_id": 3, "product_id": 2, "company_name": "PolyChem Ltd", "product_name": "Aluminium Alloy", "direction": "IN", "source": "MARKET", "unit_price": 2290.0, "volume": 120, "delivery_days": 25, "credibility_score": 0.82, "deadline": "2025-12-31"},
        {"id": 13, "company_id": 1, "product_id": 1, "company_name": "GermSteel GmbH", "product_name": "Industrial Steel", "direction": "IN", "source": "MARKET", "unit_price": 855.0, "volume": 150, "delivery_days": 10, "credibility_score": 0.93, "deadline": "2025-12-31"},
        {"id": 14, "company_id": 2, "product_id": 2, "company_name": "FranceMetal SA", "product_name": "Aluminium Alloy", "direction": "IN", "source": "MARKET", "unit_price": 2350.0, "volume": 60, "delivery_days": 12, "credibility_score": 0.88, "deadline": "2025-12-31"},
    ]


async def run_contract_analysis(plan: dict, emit: callable = None, market_data: dict | None = None) -> dict:
    """Full contract analysis: load DB, detect corrections, build flavours."""

    def _emit(event, agent, msg):
        if emit:
            emit(event, agent, msg)

    _emit("ANALYZING", "contract_analysis", "Loading contracts from database...")

    try:
        contracts = _load_contracts()
    except Exception as e:
        logger.warning(f"DB unavailable, using seeded fallback: {e}")
        _emit("ANALYZING", "contract_analysis", "Database unavailable — using seeded fallback data.")
        contracts = _seeded_contracts()

    owned = [c for c in contracts if c["source"] == "OWNED"]
    market = [c for c in contracts if c["source"] == "MARKET"]

    _emit("ANALYZING", "contract_analysis", f"Loaded {len(owned)} owned contracts and {len(market)} market offers.")

    product_focus = plan.get("context", {}).get("product_focus")

    corrections = detect_corrections(owned, market, market_data)
    _emit("CORRECTING", "contract_analysis", f"Found {len(corrections)} pricing discrepancies exceeding 5% threshold.")

    flavours = _build_flavours(owned, market, product_focus)
    _emit("ANALYZING", "contract_analysis", "Generated 3 optimization flavours: cheapest, lowest-risk, fastest.")

    logger.info(f"Contract analysis: {len(corrections)} corrections, 3 flavours built")

    return {
        "flavours": flavours,
        "data_corrections": corrections,
        "contracts_analyzed": len(contracts),
        "owned_count": len(owned),
        "market_count": len(market),
        "analyst_notes": f"Analyzed {len(owned)} owned contracts against {len(market)} market offers. Found {len(corrections)} pricing discrepancies exceeding 5% threshold.",
    }
