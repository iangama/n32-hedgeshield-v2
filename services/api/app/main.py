import os
import time
from datetime import date
from typing import Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="HedgeShield API", version="2.0")

# -----------------------
# segurança mínima (rate limit + headers)
# -----------------------
WINDOW_SEC = 60
MAX_REQ = 120
_rl = {}

@app.middleware("http")
async def security_mw(request: Request, call_next):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    bucket = _rl.get(ip, [])
    bucket = [t for t in bucket if now - t < WINDOW_SEC]
    if len(bucket) >= MAX_REQ:
        return JSONResponse(status_code=429, content={"error": "rate_limit"})
    bucket.append(now)
    _rl[ip] = bucket

    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    return resp

def get_conn():
    return psycopg2.connect(DATABASE_URL)

def get_company(req: Request) -> str:
    c = req.headers.get("X-Company", "default").strip()
    if not c:
        return "default"
    if len(c) > 40 or any(ch not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_." for ch in c):
        raise HTTPException(status_code=400, detail="invalid_company")
    return c

# -----------------------
# models
# -----------------------
class ContractCreate(BaseModel):
    base: str = Field(min_length=3, max_length=10)
    quote: str = Field(min_length=3, max_length=10)
    notional: float = Field(gt=0)
    due_date: str

class OrderCreate(BaseModel):
    contract_id: str
    side: str  # BUY/SELL
    executed_price: float
    scenario_pct: float

# -----------------------
# hedge engine (determinístico)
# -----------------------
def hedge_engine(notional: float, scenario_pct: float, days_left: int) -> str:
    # regra simples mas "produto": risco cresce com prazo curto
    exposure = notional * (scenario_pct / 100.0)
    urgency = 1.0
    if days_left <= 7:
        urgency = 1.8
    elif days_left <= 30:
        urgency = 1.3

    score = exposure * urgency

    if score >= 50:
        return "SELL"
    if score <= -50:
        return "BUY"
    return "HOLD"

@app.get("/health")
def health():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        return {"ok": True, "db": True}
    except Exception as e:
        return {"ok": False, "db": False, "error": str(e)}

@app.get("/contracts")
def list_contracts(request: Request):
    company = get_company(request)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    id::text,
                    base_ccy || '/' || quote_ccy AS pair,
                    base_ccy,
                    quote_ccy,
                    notional::float8 AS notional,
                    due_date::text AS due_date,
                    status,
                    created_at::text AS created_at,
                    (due_date - CURRENT_DATE) AS days_left
                FROM contracts
                WHERE company = %s
                ORDER BY created_at DESC
            """, (company,))
            rows = cur.fetchall()

    items = []
    for r in rows:
        sug = hedge_engine(float(r["notional"]), 0.0, int(r["days_left"]))
        r["suggestion"] = sug
        items.append(r)

    return {"items": items}

@app.post("/contracts")
def create_contract(request: Request, payload: ContractCreate):
    company = get_company(request)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO contracts (base_ccy, quote_ccy, notional, due_date, status, company)
                VALUES (%s,%s,%s,%s,'active',%s)
            """, (payload.base.upper(), payload.quote.upper(), payload.notional, payload.due_date, company))
        conn.commit()
    return {"ok": True}

@app.get("/portfolio")
def portfolio(request: Request):
    company = get_company(request)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    base_ccy || '/' || quote_ccy AS pair,
                    COUNT(*)::int AS count,
                    SUM(notional)::float8 AS total_notional
                FROM contracts
                WHERE company = %s
                GROUP BY base_ccy, quote_ccy
                ORDER BY total_notional DESC
            """, (company,))
            rows = cur.fetchall()
    return {"items": rows}

@app.post("/orders")
def create_order(request: Request, payload: OrderCreate):
    company = get_company(request)
    side = payload.side.upper()
    if side not in ("BUY","SELL"):
        raise HTTPException(status_code=400, detail="invalid_side")

    with get_conn() as conn:
        with conn.cursor() as cur:
            # garante que o contrato pertence à empresa
            cur.execute("SELECT 1 FROM contracts WHERE id=%s AND company=%s", (payload.contract_id, company))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="contract_not_found")

            cur.execute("""
                INSERT INTO orders (contract_id, side, executed_price, scenario_pct, company)
                VALUES (%s,%s,%s,%s,%s)
            """, (payload.contract_id, side, payload.executed_price, payload.scenario_pct, company))
        conn.commit()
    return {"ok": True}

@app.get("/orders")
def list_orders(request: Request):
    company = get_company(request)
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    o.id::text,
                    (c.base_ccy || '/' || c.quote_ccy) AS pair,
                    o.side,
                    o.executed_price::float8 AS executed_price,
                    o.scenario_pct::float8 AS scenario_pct,
                    o.created_at::text AS created_at
                FROM orders o
                JOIN contracts c ON c.id=o.contract_id
                WHERE o.company = %s
                ORDER BY o.created_at DESC
                LIMIT 200
            """, (company,))
            rows = cur.fetchall()
    return {"items": rows}
