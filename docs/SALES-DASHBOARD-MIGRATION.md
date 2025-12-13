# 📊 SALES DASHBOARD - MIGRAÇÃO POWER BI → WEB

## 🎯 OBJETIVO

Migrar o dashboard "Mottivme Sales" do Power BI Desktop para uma aplicação web moderna, permitindo:
- ✅ Acesso de qualquer lugar (não precisa Power BI instalado)
- ✅ Multi-tenant (cada cliente vê apenas seus dados)
- ✅ Atualização em tempo real
- ✅ Custos reduzidos (sem licença Power BI Pro)
- ✅ Customização total da UX
- ✅ Integração com automações (n8n, webhooks)

---

## 📋 ANÁLISE DO POWER BI ATUAL

### 📊 Estrutura do Dashboard

**7 Páginas Principais:**

| # | Página | Visualizações | Descrição |
|---|--------|---------------|-----------|
| 1 | **HOME** | 56 | Dashboard principal com KPIs e visão geral |
| 2 | **CLIENTES - DADOS ANTIGOS** | 9 | Análise histórica de clientes |
| 3 | **EVOLUÇÃO - DADOS ANTIGOS** | 13 | Evolução temporal histórica |
| 4 | **RANKING COLABORADORES** | 15 | Performance individual dos vendedores |
| 5 | **RANKING CLIENTES** | 15 | Performance por cliente |
| 6 | **USUÁRIOS** | 53 | Análise detalhada de usuários |
| 7 | **EVOLUÇÃO** | 57 | Evolução temporal atual |

**Total: 218 visualizações**

### 🗄️ Modelo de Dados (13 Tabelas)

#### **Tabelas Fato (Transacionais)**
1. **fLeadsEUA** - Leads dos Estados Unidos (dados atuais)
2. **InvTraBPO** - Investimento/Tracking BPO

#### **Tabelas Dimensão**
3. **Calendario** - Dimensão de tempo (datas, meses, anos)
4. **Etapas** - Etapas do funil de vendas
5. **FontedoLead** - Origem/Fonte dos leads
6. **Funil** - Configuração do funil
7. **User** - Usuários/Vendedores
8. **Quemagendou** - Quem agendou (atribuição)
9. **FluxoVS** - Fluxo de vendas

#### **Tabelas de Métricas**
10. **Medidas** - Measures DAX (métricas calculadas)
11. **Metricas** - Métricas adicionais
12. **ResumoMetricas** - Resumo de métricas agregadas

---

## 🏗️ ARQUITETURA DA SOLUÇÃO WEB

### Stack Tecnológica

```
Frontend:  Next.js 14 + TypeScript + Tailwind CSS
Charts:    Recharts / Chart.js / Tremor
Backend:   Supabase (PostgreSQL)
Deploy:    Vercel
Auth:      Supabase Auth
ETL:       n8n (automação de importação)
```

### Estrutura de Pastas Proposta

```
sales-dashboard/
├── app/
│   ├── dashboard/              # Dashboard principal (HOME)
│   ├── clientes/               # Ranking e análise de clientes
│   ├── colaboradores/          # Ranking de colaboradores
│   ├── usuarios/               # Análise de usuários
│   ├── evolucao/               # Gráficos de evolução
│   ├── funil/                  # Visualização do funil
│   └── api/
│       ├── leads/              # CRUD de leads
│       ├── metricas/           # Cálculo de métricas
│       └── kpis/               # KPIs em tempo real
├── components/
│   ├── charts/
│   │   ├── FunnelChart.tsx     # Funil de vendas
│   │   ├── RankingTable.tsx    # Tabelas de ranking
│   │   ├── EvolutionChart.tsx  # Gráficos de evolução
│   │   └── KPICard.tsx         # Cards de KPIs
│   └── filters/
│       ├── DateRangePicker.tsx
│       ├── ClientFilter.tsx
│       └── UserFilter.tsx
└── lib/
    ├── supabase.ts             # Cliente Supabase
    └── queries/
        ├── leads.ts            # Queries de leads
        ├── metrics.ts          # Queries de métricas
        └── rankings.ts         # Queries de rankings
```

---

## 🗃️ SCHEMA DO BANCO DE DADOS (SUPABASE)

### Schema: `sales_intelligence`

```sql
-- 1. Tabela de Leads (principal)
CREATE TABLE sales_intelligence.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificação
  external_id VARCHAR(255) UNIQUE,
  lead_name VARCHAR(255) NOT NULL,
  lead_email VARCHAR(255),
  lead_phone VARCHAR(50),

  -- Origem
  source_id UUID REFERENCES sales_intelligence.lead_sources(id),
  source_name VARCHAR(100), -- Facebook, Google, Indicação, etc

  -- Cliente/Empresa
  client_id UUID REFERENCES sales_intelligence.clients(id),
  client_name VARCHAR(255) NOT NULL,

  -- Funil
  stage_id UUID REFERENCES sales_intelligence.funnel_stages(id),
  stage_name VARCHAR(100), -- Lead, Contato, Qualificado, Proposta, Ganho, Perdido

  -- Atribuição
  assigned_user_id UUID REFERENCES sales_intelligence.users(id),
  assigned_user_name VARCHAR(255),
  scheduled_by_user_id UUID REFERENCES sales_intelligence.users(id),

  -- Datas
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contacted_at TIMESTAMPTZ,
  qualified_at TIMESTAMPTZ,
  proposal_at TIMESTAMPTZ,
  won_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,

  -- Valores
  estimated_value DECIMAL(10,2),
  won_value DECIMAL(10,2),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, won, lost, archived

  -- Métricas calculadas
  days_in_funnel INTEGER,
  conversion_probability DECIMAL(5,2),

  -- Metadata
  country VARCHAR(3) DEFAULT 'USA', -- USA, BRA, etc
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Clientes
CREATE TABLE sales_intelligence.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name VARCHAR(255) UNIQUE NOT NULL,
  industry VARCHAR(100),
  tier VARCHAR(50), -- VIP, Premium, Standard
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Usuários/Vendedores
CREATE TABLE sales_intelligence.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50), -- SDR, Closer, Manager
  team VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active',
  hired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Etapas do Funil
CREATE TABLE sales_intelligence.funnel_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_name VARCHAR(100) UNIQUE NOT NULL,
  stage_order INTEGER NOT NULL,
  color VARCHAR(20),
  description TEXT
);

-- 5. Tabela de Fontes de Leads
CREATE TABLE sales_intelligence.lead_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name VARCHAR(100) UNIQUE NOT NULL,
  source_type VARCHAR(50), -- Paid, Organic, Referral
  cost_per_lead DECIMAL(10,2),
  active BOOLEAN DEFAULT true
);

-- 6. Tabela de Investimentos (BPO)
CREATE TABLE sales_intelligence.investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES sales_intelligence.clients(id),
  investment_type VARCHAR(100), -- BPO, Marketing, etc
  amount DECIMAL(10,2),
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Calendário (Dimensão Tempo)
CREATE TABLE sales_intelligence.calendar (
  date DATE PRIMARY KEY,
  year INTEGER,
  quarter INTEGER,
  month INTEGER,
  month_name VARCHAR(20),
  week INTEGER,
  day_of_week INTEGER,
  day_name VARCHAR(20),
  is_weekend BOOLEAN,
  is_holiday BOOLEAN
);
```

### Views de Métricas (substituem DAX Measures)

```sql
-- VIEW: KPIs Principais
CREATE OR REPLACE VIEW sales_intelligence.kpi_metrics AS
SELECT
  -- Total de Leads
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as leads_today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as leads_7d,
  COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as leads_month,

  -- Conversão
  COUNT(*) FILTER (WHERE status = 'won') as total_won,
  COUNT(*) FILTER (WHERE status = 'lost') as total_lost,
  (COUNT(*) FILTER (WHERE status = 'won')::FLOAT / NULLIF(COUNT(*), 0)) * 100 as conversion_rate,

  -- Valores
  SUM(won_value) as total_revenue,
  SUM(won_value) FILTER (WHERE won_at >= DATE_TRUNC('month', CURRENT_DATE)) as revenue_month,
  AVG(won_value) as avg_ticket,

  -- Tempo médio no funil
  AVG(days_in_funnel) FILTER (WHERE status = 'won') as avg_days_to_win,

  -- Por etapa
  COUNT(*) FILTER (WHERE stage_name = 'Lead') as stage_lead,
  COUNT(*) FILTER (WHERE stage_name = 'Contato') as stage_contact,
  COUNT(*) FILTER (WHERE stage_name = 'Qualificado') as stage_qualified,
  COUNT(*) FILTER (WHERE stage_name = 'Proposta') as stage_proposal,
  COUNT(*) FILTER (WHERE stage_name = 'Ganho') as stage_won
FROM sales_intelligence.leads;

-- VIEW: Ranking de Colaboradores
CREATE OR REPLACE VIEW sales_intelligence.ranking_users AS
SELECT
  u.user_name,
  u.role,
  u.team,
  COUNT(l.id) as total_leads,
  COUNT(l.id) FILTER (WHERE l.status = 'won') as total_won,
  SUM(l.won_value) as total_revenue,
  AVG(l.days_in_funnel) FILTER (WHERE l.status = 'won') as avg_days_to_win,
  (COUNT(l.id) FILTER (WHERE l.status = 'won')::FLOAT / NULLIF(COUNT(l.id), 0)) * 100 as conversion_rate
FROM sales_intelligence.users u
LEFT JOIN sales_intelligence.leads l ON l.assigned_user_id = u.id
GROUP BY u.id, u.user_name, u.role, u.team
ORDER BY total_revenue DESC;

-- VIEW: Ranking de Clientes
CREATE OR REPLACE VIEW sales_intelligence.ranking_clients AS
SELECT
  c.client_name,
  c.industry,
  c.tier,
  COUNT(l.id) as total_leads,
  COUNT(l.id) FILTER (WHERE l.status = 'won') as total_won,
  SUM(l.won_value) as total_revenue,
  AVG(l.won_value) FILTER (WHERE l.status = 'won') as avg_ticket,
  (COUNT(l.id) FILTER (WHERE l.status = 'won')::FLOAT / NULLIF(COUNT(l.id), 0)) * 100 as conversion_rate
FROM sales_intelligence.clients c
LEFT JOIN sales_intelligence.leads l ON l.client_id = c.id
GROUP BY c.id, c.client_name, c.industry, c.tier
ORDER BY total_revenue DESC;

-- VIEW: Funil de Vendas
CREATE OR REPLACE VIEW sales_intelligence.funnel_metrics AS
SELECT
  fs.stage_name,
  fs.stage_order,
  fs.color,
  COUNT(l.id) as count,
  SUM(l.estimated_value) as total_value,
  (COUNT(l.id)::FLOAT / (SELECT COUNT(*) FROM sales_intelligence.leads)) * 100 as percentage
FROM sales_intelligence.funnel_stages fs
LEFT JOIN sales_intelligence.leads l ON l.stage_id = fs.id
GROUP BY fs.id, fs.stage_name, fs.stage_order, fs.color
ORDER BY fs.stage_order;

-- VIEW: Evolução Temporal (Diária)
CREATE OR REPLACE VIEW sales_intelligence.evolution_daily AS
SELECT
  DATE(created_at) as date,
  COUNT(*) as leads_created,
  COUNT(*) FILTER (WHERE status = 'won') as leads_won,
  SUM(won_value) as revenue,
  COUNT(*) FILTER (WHERE contacted_at IS NOT NULL) as leads_contacted
FROM sales_intelligence.leads
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 📊 COMPONENTES DE VISUALIZAÇÃO

### 1. HOME Dashboard

**KPI Cards:**
- Total de Leads (hoje/semana/mês)
- Taxa de Conversão (%)
- Receita Total (hoje/mês)
- Ticket Médio
- Tempo Médio no Funil

**Gráficos:**
- Funil de Vendas (vertical)
- Evolução de Leads (linha temporal)
- Top 5 Fontes de Leads (donut chart)
- Distribuição por Etapa (bar chart)

### 2. Ranking Colaboradores

**Tabela Interativa:**
```typescript
interface UserRanking {
  user_name: string;
  role: string;
  team: string;
  total_leads: number;
  total_won: number;
  total_revenue: number;
  conversion_rate: number;
  avg_days_to_win: number;
}
```

**Features:**
- Ordenação por coluna
- Filtro por time
- Filtro por período
- Export para CSV

### 3. Ranking Clientes

Similar ao Ranking Colaboradores, mas por cliente.

### 4. Evolução

**Gráficos:**
- Linha temporal de leads criados vs ganhos
- Bar chart comparativo mensal
- Combo chart (leads + receita)
- Heatmap por dia da semana

---

## 🔄 MIGRAÇÃO DE DADOS

### Estratégia de ETL

**Opção 1: Importação Manual (CSV)**
1. Exportar dados do Power BI para CSV
2. Criar script de importação
3. Popular Supabase via SQL

**Opção 2: Automação n8n (Recomendado)**
1. Conectar n8n à fonte de dados original
2. Workflow de sync diário/horário
3. Validação e transformação
4. Insert/Update no Supabase

### Script de Importação Base

```sql
-- Popular calendário (2020-2030)
INSERT INTO sales_intelligence.calendar (date, year, quarter, month, week, day_of_week)
SELECT
  d::date,
  EXTRACT(YEAR FROM d),
  EXTRACT(QUARTER FROM d),
  EXTRACT(MONTH FROM d),
  EXTRACT(WEEK FROM d),
  EXTRACT(DOW FROM d)
FROM generate_series('2020-01-01'::date, '2030-12-31'::date, '1 day') d;

-- Popular etapas do funil
INSERT INTO sales_intelligence.funnel_stages (stage_name, stage_order, color) VALUES
  ('Lead', 1, '#3B82F6'),
  ('Contato', 2, '#8B5CF6'),
  ('Qualificado', 3, '#EC4899'),
  ('Proposta', 4, '#F59E0B'),
  ('Ganho', 5, '#10B981'),
  ('Perdido', 6, '#EF4444');
```

---

## ✅ PLANO DE IMPLEMENTAÇÃO

### Fase 1: Setup Inicial (1 semana)
- [ ] Criar projeto Next.js
- [ ] Configurar Supabase
- [ ] Criar schema de banco de dados
- [ ] Setup de autenticação

### Fase 2: Migração de Dados (1 semana)
- [ ] Exportar dados do Power BI
- [ ] Criar scripts de importação
- [ ] Popular banco de dados
- [ ] Validar integridade dos dados

### Fase 3: Dashboard HOME (1 semana)
- [ ] KPI Cards
- [ ] Funil de vendas
- [ ] Gráficos de evolução
- [ ] Filtros de data

### Fase 4: Páginas de Ranking (1 semana)
- [ ] Ranking Colaboradores
- [ ] Ranking Clientes
- [ ] Export para CSV
- [ ] Filtros avançados

### Fase 5: Páginas de Análise (1 semana)
- [ ] Evolução temporal
- [ ] Análise de usuários
- [ ] Dashboard de fontes

### Fase 6: Automação e Deploy (1 semana)
- [ ] n8n workflows para sync
- [ ] Deploy Vercel
- [ ] Testes de performance
- [ ] Documentação

---

## 💰 VANTAGENS DA MIGRAÇÃO

| Aspecto | Power BI | Web Dashboard |
|---------|----------|---------------|
| **Acesso** | Apenas desktop | Qualquer lugar (mobile/desktop) |
| **Custo** | R$ 50-100/usuário/mês | Grátis (até limite Vercel) |
| **Customização** | Limitada | Total |
| **Integrações** | APIs limitadas | Qualquer API/Webhook |
| **Performance** | Depende do arquivo | Otimizado (CDN) |
| **Multi-tenant** | Difícil | Nativo |
| **Real-time** | Manual refresh | Auto-refresh |

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Analisar arquivo .pbix (CONCLUÍDO)
2. ⏭️ Criar projeto Sales Dashboard no Airtable
3. ⏭️ Criar schema SQL no Supabase
4. ⏭️ Exportar dados do Power BI para CSV
5. ⏭️ Criar projeto Next.js base
6. ⏭️ Implementar primeira página (HOME)

---

**Documento criado em:** 27/01/2025
**Versão:** 1.0
**Autor:** Claude + Marcos Daniels