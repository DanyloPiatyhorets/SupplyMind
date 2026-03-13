from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class Company(BaseModel):
    id: int
    name: str
    country: str


class Product(BaseModel):
    id: int
    name: str
    unit: str


class Contract(BaseModel):
    id: int
    product_id: int
    company_id: int
    direction: str
    source: str
    unit_price: float
    volume: int
    currency: str
    delivery_days: int
    credibility_score: float
    deadline: Optional[date] = None


class Correction(BaseModel):
    contract_id: int
    field: str
    current_value: float
    market_value: float
    delta_pct: float
    severity: str
    recommendation: str


class Flavour(BaseModel):
    label: str
    description: str
    selected_contracts: list[int]
    total_cost: float
    delivery_days: int
    risk_score: float
    savings_vs_current: float


class TraceEvent(BaseModel):
    event: str
    agent: str
    timestamp: str
    message: str
    data: Optional[dict] = None


class AnalysisReport(BaseModel):
    executive_summary: str
    market_intelligence: dict
    document_insights: dict
    optimization_variants: dict
    data_corrections: list[dict]
    recommended_variant: str
    recommendation_rationale: str
    risks_and_mitigations: list[dict]
    next_steps: list[str]
    report_metadata: dict
