CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_ccy TEXT NOT NULL,
  quote_ccy TEXT NOT NULL,
  notional NUMERIC(18,6) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_events (
  id BIGSERIAL PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1 linha por provider POR DIA (contrato estável)
CREATE TABLE IF NOT EXISTS provider_usage (
  provider TEXT NOT NULL,
  day DATE NOT NULL,
  requests_today INTEGER NOT NULL DEFAULT 0,
  budget_daily INTEGER NOT NULL DEFAULT 0,
  token_bucket_left INTEGER NOT NULL DEFAULT 0,
  degraded BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, day)
);

CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_provider_usage_provider ON provider_usage(provider);
