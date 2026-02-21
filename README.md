cd ~/n32-hedgeshield-v2 || exit 1

cat > README.md <<'EOF'
# HedgeShield V2 — FX Risk Desk

HedgeShield é um sistema de gerenciamento de risco cambial (FX) voltado para contratos com exposição internacional.

O produto permite:

- Simular cenários de mercado (-5% a +5%)
- Visualizar exposição total consolidada
- Projetar PnL sob diferentes variações cambiais
- Executar ordens de BUY / SELL
- Operar em modo multi-empresa (multi-tenant simples via header)
- Consolidar portfolio
- Visualizar gráfico real de exposição (Chart.js)
- Registrar histórico de ordens
- Aplicar controle básico de segurança (rate-limit + headers)

---

## 🧠 Conceito do Produto

O problema central que o HedgeShield resolve é:

“Quanto eu posso ganhar ou perder se o câmbio variar até o vencimento do contrato?”

O sistema trabalha com:

- Exposição nominal
- Cenário percentual aplicado
- PnL projetado
- Sugestão automática (BUY / SELL / HOLD)

A decisão é determinística baseada no delta projetado.

---

## 🏗 Arquitetura

Stack:

- Frontend: React + Vite
- Backend: FastAPI
- Banco: PostgreSQL
- Infra: Docker Compose
- Proxy: Traefik (SAFE ports 8880 / 8443)
- Observabilidade: Prometheus / Grafana (opcional)
- Gráfico: Chart.js

Estrutura:

services/
  api/
  ui/
  worker/
docker-compose.yml

---

## 🔐 Segurança Implementada

- Rate limit simples por IP (janela de 60s)
- Headers de segurança básicos
- Separação por empresa via header `X-Company`
- Secrets isolados em pasta `secrets/` (não versionados)
- Banco isolado na network interna Docker

---

## 🚀 Como Rodar Localmente

Pré-requisito: Docker + Docker Compose

docker compose up -d --build

Acessos:

UI:
http://localhost:8880

API health:
http://localhost:8880/api/health

---

## 📊 Funcionalidades

### 1. FX Desk
- Criar contratos
- Simular cenários
- Ver exposição consolidada
- Executar ordens

### 2. Histórico de Ordens
Registro persistido no banco.

### 3. Portfolio Consolidado
Agregação multi-contrato.

### 4. Multi-Empresa
Header:
X-Company: nome_da_empresa

Permite isolamento lógico de dados.

---

## 📈 Engine de Cálculo

PnL projetado:

notional * (1 + scenario_pct / 100)

Sugestão automática:

- delta > 0 → SELL
- delta < 0 → BUY
- delta = 0 → HOLD

Motor determinístico.
Interface apenas exibe decisão.

---

## 📦 Deploy

Projeto containerizado.

docker compose up -d --build

Para produção recomenda-se:

- TLS real
- Reverse proxy externo
- Variáveis seguras
- Banco gerenciado

---

---

## 👤 Autor

Ian Gama  
https://github.com/iangama
<img width="1917" height="902" alt="image" src="https://github.com/user-attachments/assets/6626b831-1378-4395-9d10-899497025fff" />
<img width="1918" height="917" alt="image" src="https://github.com/user-attachments/assets/71a36000-343c-4228-a560-ebfc67717b86" />
<img width="1919" height="914" alt="image" src="https://github.com/user-attachments/assets/6ebd154f-f2f8-491b-8574-2c5484b05563" />
<img width="1771" height="917" alt="image" src="https://github.com/user-attachments/assets/7b1ea4e8-9051-4c65-a32b-c0a6524d4ee4" />

---
