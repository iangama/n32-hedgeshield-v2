from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, Any, Dict, List

class ContractCreate(BaseModel):
    base_ccy: str = Field(min_length=3, max_length=10)
    quote_ccy: str = Field(min_length=3, max_length=10)
    notional: float = Field(gt=0)
    due_date: date

class ContractOut(BaseModel):
    id: str
    base_ccy: str
    quote_ccy: str
    notional: float
    due_date: date
    status: str
    created_at: str
    risk_estimate: Optional[float] = None
    last_rate: Optional[float] = None
    last_calc_at: Optional[str] = None

class EventOut(BaseModel):
    id: int
    contract_id: str
    event_type: str
    payload: Dict[str, Any]
    created_at: str

class ProviderUsageOut(BaseModel):
    provider: str
    requests_today: int
    budget_daily: int
    budget_left: int
    token_bucket_left: int
    degraded: bool
