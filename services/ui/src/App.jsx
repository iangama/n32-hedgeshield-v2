import { useEffect, useMemo, useState } from "react";
import ExposureChart from "./ExposureChart.jsx";

const MAJOR = ["USD","EUR","GBP","JPY","CHF","CAD","AUD","BRL"];
const SCENARIOS = [-5,-2,0,2,5];

export default function App() {
  const [tab, setTab] = useState("desk"); // desk | orders | portfolio
  const [contracts, setContracts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [variation, setVariation] = useState(0);

  const [company, setCompany] = useState("default"); // multi-empresa
  const [base, setBase] = useState("USD");
  const [quote, setQuote] = useState("BRL");
  const [notional, setNotional] = useState(1000);
  const [dueDate, setDueDate] = useState("2026-03-07");

  const apiFetch = async (path, opts={}) => {
    const headers = { ...(opts.headers||{}), "X-Company": company };
    const r = await fetch(path, { ...opts, headers });
    const text = await r.text();
    let j = null;
    try { j = text ? JSON.parse(text) : null; } catch { j = { error: text || "invalid_json" }; }
    if (!r.ok) throw new Error(j?.detail || j?.error || `HTTP ${r.status}`);
    return j;
  };

  const loadContracts = async () => {
    const j = await apiFetch("/api/contracts");
    setContracts(j.items || []);
  };

  const loadOrders = async () => {
    const j = await apiFetch("/api/orders");
    setOrders(j.items || []);
  };

  const loadPortfolio = async () => {
    const j = await apiFetch("/api/portfolio");
    setPortfolio(j.items || []);
  };

  useEffect(() => {
    loadContracts().catch(()=>{});
    loadOrders().catch(()=>{});
    loadPortfolio().catch(()=>{});
  }, [company]);

  const totals = useMemo(() => {
    const exp = contracts.reduce((a,c)=>a+Number(c.notional||0),0);
    const pnl = exp * (variation/100);
    return { exp, pnl };
  }, [contracts, variation]);

  const createContract = async () => {
    await apiFetch("/api/contracts", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ base, quote, notional, due_date: dueDate })
    });
    await loadContracts();
    await loadPortfolio();
  };

  const placeOrder = async (contractId, side) => {
    // preço fictício (só pra registrar) — o worker pode calcular depois
    const executed_price = 1 + variation/100;
    await apiFetch("/api/orders", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ contract_id: contractId, side, executed_price, scenario_pct: variation })
    });
    await loadOrders();
  };

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="brand">HedgeShield</div>
          <div className="sub">FX Risk Desk — multi-empresa, engine, ordens, portfolio</div>
        </div>

        <div className="tabs">
          <button className={tab==="desk"?"on":""} onClick={()=>setTab("desk")}>Desk</button>
          <button className={tab==="orders"?"on":""} onClick={()=>setTab("orders")}>Orders</button>
          <button className={tab==="portfolio"?"on":""} onClick={()=>setTab("portfolio")}>Portfolio</button>
        </div>
      </header>

      <div className="bar">
        <div className="company">
          <span>Empresa:</span>
          <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="default" />
        </div>

        <div className="scenario">
          <span>Cenário:</span>
          {SCENARIOS.map(v=>(
            <button key={v} className={variation===v?"on":""} onClick={()=>setVariation(v)}>
              {v>0?`+${v}%`:`${v}%`}
            </button>
          ))}
        </div>
      </div>

      {tab==="desk" && (
        <>
          <section className="grid2">
            <div className="card">
              <div className="h">Exposição Total</div>
              <div className="big">{totals.exp.toFixed(2)}</div>
            </div>
            <div className="card">
              <div className="h">PnL Projetado</div>
              <div className={"big " + (totals.pnl>=0 ? "pos":"neg")}>{totals.pnl.toFixed(2)}</div>
            </div>
          </section>

          <section className="card">
            <div className="h">Exposição por contrato</div>
            <div style={{height:280}}>
              <ExposureChart contracts={contracts} variation={variation}/>
            </div>
          </section>

          <section className="card">
            <div className="h">Abrir novo contrato</div>
            <div className="form">
              <select value={base} onChange={e=>setBase(e.target.value)}>{MAJOR.map(c=><option key={c}>{c}</option>)}</select>
              <span className="slash">/</span>
              <select value={quote} onChange={e=>setQuote(e.target.value)}>{MAJOR.map(c=><option key={c}>{c}</option>)}</select>
              <input type="number" value={notional} onChange={e=>setNotional(Number(e.target.value))}/>
              <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/>
              <button className="primary" onClick={createContract}>Criar</button>
              <button className="ghost" onClick={loadContracts}>Atualizar</button>
            </div>
          </section>

          <section className="card">
            <div className="h">Contratos</div>
            <div className="list">
              {contracts.map(c=>(
                <div className="row" key={c.id}>
                  <div className="left">
                    <div className="pair">{c.pair}</div>
                    <div className="meta">Notional: {Number(c.notional).toFixed(2)} • Due: {c.due_date} ({c.days_left}d) • Status: {c.status}</div>
                  </div>
                  <div className="right">
                    <div className="suggest">Sugestão: <b>{c.suggestion || "HOLD"}</b></div>
                    <div className="btns">
                      <button className="buy" onClick={()=>placeOrder(c.id,"BUY")}>BUY</button>
                      <button className="sell" onClick={()=>placeOrder(c.id,"SELL")}>SELL</button>
                    </div>
                  </div>
                </div>
              ))}
              {!contracts.length && <div className="empty">Sem contratos ainda.</div>}
            </div>
          </section>
        </>
      )}

      {tab==="orders" && (
        <section className="card">
          <div className="h">Histórico de ordens</div>
          <div className="table">
            <div className="tr head">
              <div>ID</div><div>Pair</div><div>Side</div><div>Price</div><div>Scenario</div><div>At</div>
            </div>
            {orders.map(o=>(
              <div className="tr" key={o.id}>
                <div className="mono">{o.id.slice(0,8)}…</div>
                <div>{o.pair}</div>
                <div className={o.side==="BUY"?"pos":"neg"}>{o.side}</div>
                <div className="mono">{Number(o.executed_price).toFixed(4)}</div>
                <div className="mono">{Number(o.scenario_pct||0).toFixed(1)}%</div>
                <div className="mono">{String(o.created_at).replace("T"," ").slice(0,19)}</div>
              </div>
            ))}
            {!orders.length && <div className="empty">Nenhuma ordem ainda.</div>}
          </div>
        </section>
      )}

      {tab==="portfolio" && (
        <section className="card">
          <div className="h">Portfolio consolidado</div>
          <div className="table">
            <div className="tr head">
              <div>Par</div><div>Total Notional</div><div>Count</div>
            </div>
            {portfolio.map(p=>(
              <div className="tr" key={p.pair}>
                <div>{p.pair}</div>
                <div className="mono">{Number(p.total_notional).toFixed(2)}</div>
                <div className="mono">{p.count}</div>
              </div>
            ))}
            {!portfolio.length && <div className="empty">Sem dados ainda.</div>}
          </div>
        </section>
      )}
    </div>
  );
}
