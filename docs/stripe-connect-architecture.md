# Stripe Connect Architecture - BPOSS White Label

> **Sistema de Split de Pagamentos para Parceiros MOTTIVME**
>
> Versão: 1.0.0
> Última atualização: 2026-01-01

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Tiers de Parceiros](#tiers-de-parceiros)
4. [Fluxo de Onboarding](#fluxo-de-onboarding)
5. [Fluxo de Pagamento](#fluxo-de-pagamento)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [API Endpoints](#api-endpoints)
8. [Webhooks](#webhooks)
9. [Segurança](#segurança)
10. [Testes](#testes)
11. [Deploy](#deploy)
12. [Troubleshooting](#troubleshooting)

---

## Visão Geral

### Objetivo

Implementar um sistema de pagamentos com split automático entre MOTTIVME (plataforma) e parceiros que vendem serviços white label. O sistema utiliza **Stripe Connect Express** para gerenciar contas de parceiros e distribuir comissões automaticamente.

### Modelo de Negócio

- Parceiros vendem serviços MOTTIVME sob sua própria marca
- Cada pagamento é dividido automaticamente:
  - **Parceiro**: Recebe comissão baseada no tier
  - **MOTTIVME**: Recebe o valor restante (net)
- Sistema totalmente automatizado via Stripe Connect

### Tecnologias

- **Stripe Connect**: Contas Express para parceiros
- **Next.js 14**: API Routes
- **Supabase**: Banco de dados PostgreSQL
- **TypeScript**: Tipagem forte
- **Webhooks**: Sincronização em tempo real

---

## Arquitetura do Sistema

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTE FINAL                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ Realiza Pagamento
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STRIPE PAYMENT INTENT                        │
│  - Total: R$ 1000,00                                            │
│  - Transfer Data: R$ 200,00 → Parceiro (20%)                    │
│  - Application Fee: R$ 800,00 → MOTTIVME (80%)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
┌───────────────────────┐   ┌───────────────────────┐
│  CONTA STRIPE CONNECT │   │  CONTA MOTTIVME       │
│  (Parceiro)           │   │  (Plataforma)         │
│  - Saldo: +R$ 200     │   │  - Saldo: +R$ 800     │
└───────────────────────┘   └───────────────────────┘
                │                       │
                │                       │
                ▼                       ▼
        Payout Automático       Receita da Plataforma
        para Conta Bancária
```

### Fluxo de Dados

1. **Cliente** → Realiza pagamento no checkout
2. **Stripe** → Processa pagamento e divide automaticamente
3. **Webhook** → Notifica aplicação sobre eventos
4. **Supabase** → Registra transação e atualiza saldos
5. **Stripe Payout** → Transfere fundos para contas bancárias

---

## Tiers de Parceiros

### Tabela de Comissões

| Tier       | Comissão Parceiro | Receita MOTTIVME | Requisitos               |
|------------|-------------------|------------------|--------------------------|
| Starter    | 15%               | 85%              | Inicial (padrão)         |
| Growth     | 20%               | 80%              | 10+ vendas/mês           |
| Premium    | 25%               | 75%              | 50+ vendas/mês           |
| Enterprise | 30%               | 70%              | 100+ vendas/mês          |

### Exemplo de Cálculo

**Venda de R$ 1.000,00 - Parceiro Growth (20%)**

```
Total da venda:        R$ 1.000,00
Comissão parceiro:     R$   200,00 (20%)
Receita MOTTIVME:      R$   800,00 (80%)
Taxa Stripe (~3%):     R$    30,00
Net MOTTIVME:          R$   770,00
```

### Upgrade de Tier

Parceiros podem ser promovidos automaticamente ou manualmente:

```typescript
// Upgrade manual via API
PUT /api/stripe/connect
{
  "partner_id": "partner_123",
  "tier": "premium",
  "action": "update_tier"
}
```

---

## Fluxo de Onboarding

### 1. Registro do Parceiro

```typescript
// Frontend: Parceiro preenche formulário inicial
const partnerData = {
  name: "João Silva",
  email: "joao@empresa.com",
  phone: "+5511999999999",
  business_name: "Empresa XYZ Ltda",
  business_type: "company" // ou "individual"
};
```

### 2. Criação da Conta Stripe Connect

```typescript
// Backend: Cria conta no Stripe e database
POST /api/stripe/connect
{
  "partner_id": "user_123",
  "email": "joao@empresa.com",
  "tier": "starter",
  "country": "BR",
  "business_type": "company",
  "refresh_url": "https://app.mottivme.com/onboarding/refresh",
  "return_url": "https://app.mottivme.com/onboarding/complete"
}

// Resposta
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_xyz",
      "stripe_account_id": "acct_1ABC123",
      "tier": "starter",
      "commission_rate": 0.15,
      "onboarding_completed": false
    },
    "onboarding_url": "https://connect.stripe.com/setup/s/...",
    "expires_at": 1735689600
  }
}
```

### 3. Onboarding no Stripe

```typescript
// Frontend: Redireciona parceiro para Stripe
window.location.href = response.data.onboarding_url;

// Stripe coleta:
// - Dados pessoais/empresa
// - Documentos (CPF/CNPJ)
// - Conta bancária
// - Verificação de identidade
```

### 4. Conclusão e Ativação

```typescript
// Webhook: account.updated
{
  "type": "account.updated",
  "data": {
    "object": {
      "id": "acct_1ABC123",
      "charges_enabled": true,
      "payouts_enabled": true,
      "details_submitted": true
    }
  }
}

// Sistema atualiza status
UPDATE partner_stripe_accounts
SET
  onboarding_completed = true,
  charges_enabled = true,
  payouts_enabled = true,
  stripe_account_status = 'active'
WHERE stripe_account_id = 'acct_1ABC123';
```

### 5. Fluxograma

```
┌─────────────────┐
│ Parceiro se     │
│ Registra        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sistema cria    │
│ Stripe Connect  │
│ Account         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parceiro é      │
│ redirecionado   │
│ para Stripe     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preenche dados  │
│ bancários e     │
│ documentos      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe valida   │
│ informações     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Webhook atualiza│
│ status para     │
│ "active"        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Parceiro pode   │
│ receber         │
│ pagamentos      │
└─────────────────┘
```

---

## Fluxo de Pagamento

### 1. Cliente Inicia Compra

```typescript
// Frontend: Cliente no checkout do parceiro
const checkoutData = {
  amount: 100000, // R$ 1.000,00 em centavos
  currency: "brl",
  customer_email: "cliente@email.com",
  description: "Consultoria Empresarial - 3 meses"
};
```

### 2. Criação do Payment Intent

```typescript
// Backend: Cria Payment Intent com split
import { createPaymentIntentWithTransfer } from '@/lib/stripe';

const partnerAccount = await getPartnerAccount(partner_id);

const paymentIntent = await createPaymentIntentWithTransfer({
  amount: 100000,
  currency: 'brl',
  partner_id: partner_account.partner_id,
  customer_email: 'cliente@email.com',
  description: 'Consultoria Empresarial - 3 meses',
  metadata: {
    service_id: 'service_123',
    contract_id: 'contract_456'
  }
}, partnerAccount);

// Stripe automaticamente:
// - Transfer Data: R$ 200,00 → Parceiro (20%)
// - Application Fee: R$ 800,00 → MOTTIVME (80%)
```

### 3. Cliente Completa Pagamento

```typescript
// Frontend: Usando Stripe Elements
const { error } = await stripe.confirmPayment({
  elements,
  confirmParams: {
    return_url: 'https://parceiro.com/sucesso'
  }
});
```

### 4. Processamento do Pagamento

```typescript
// Webhook: payment_intent.succeeded
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_123",
      "amount": 100000,
      "transfer_data": {
        "destination": "acct_1ABC123",
        "amount": 20000
      },
      "application_fee_amount": 80000,
      "metadata": {
        "partner_id": "partner_123",
        "commission_rate": "0.20"
      }
    }
  }
}

// Sistema registra transação
INSERT INTO stripe_transactions (
  partner_id,
  amount,
  commission_amount,
  net_amount,
  status
) VALUES (
  'partner_123',
  100000,
  20000,
  80000,
  'succeeded'
);

// Atualiza saldos
UPDATE partner_stripe_accounts
SET
  total_earnings = total_earnings + 20000,
  pending_balance = pending_balance + 20000
WHERE partner_id = 'partner_123';
```

### 5. Payout Automático

```typescript
// Stripe realiza payout automático (padrão: diário)
// ou manual via API

import { createPayout } from '@/lib/stripe';

const payout = await createPayout(
  'acct_1ABC123',
  20000, // R$ 200,00
  'brl',
  'Comissão - Vendas Janeiro 2026'
);

// Webhook: payout.paid
{
  "type": "payout.paid",
  "data": {
    "object": {
      "id": "po_123",
      "amount": 20000,
      "arrival_date": 1735689600,
      "status": "paid"
    }
  }
}
```

### 6. Fluxograma de Pagamento

```
┌─────────────────┐
│ Cliente escolhe │
│ produto/serviço │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sistema cria    │
│ Payment Intent  │
│ com split       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cliente paga    │
│ via Stripe      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Stripe divide   │
│ pagamento       │
│ automaticamente │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Parceiro│ │MOTTIVME│
│+20%    │ │+80%    │
└────────┘ └────────┘
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Webhook │ │Webhook │
│atualiza│ │atualiza│
│saldo   │ │receita │
└────────┘ └────────┘
    │
    ▼
┌────────────────┐
│ Payout para    │
│ conta bancária │
│ (D+2)          │
└────────────────┘
```

---

## Estrutura de Dados

### Tabelas Supabase

#### 1. partner_stripe_accounts

Armazena informações das contas Stripe Connect dos parceiros.

```sql
CREATE TABLE partner_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES users(id),
  stripe_account_id TEXT NOT NULL UNIQUE,
  stripe_account_status TEXT NOT NULL DEFAULT 'pending',
  tier TEXT NOT NULL DEFAULT 'starter',
  commission_rate DECIMAL(4,3) NOT NULL DEFAULT 0.15,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  country TEXT NOT NULL DEFAULT 'BR',
  currency TEXT NOT NULL DEFAULT 'brl',
  business_type TEXT,
  business_name TEXT,
  email TEXT,
  phone TEXT,
  total_earnings BIGINT NOT NULL DEFAULT 0,
  pending_balance BIGINT NOT NULL DEFAULT 0,
  available_balance BIGINT NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT tier_check CHECK (tier IN ('starter', 'growth', 'premium', 'enterprise')),
  CONSTRAINT status_check CHECK (stripe_account_status IN ('pending', 'active', 'restricted', 'rejected', 'inactive'))
);

CREATE INDEX idx_partner_stripe_partner_id ON partner_stripe_accounts(partner_id);
CREATE INDEX idx_partner_stripe_account_id ON partner_stripe_accounts(stripe_account_id);
CREATE INDEX idx_partner_stripe_status ON partner_stripe_accounts(stripe_account_status);
```

#### 2. stripe_transactions

Registra todas as transações financeiras.

```sql
CREATE TABLE stripe_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES users(id),
  stripe_account_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  commission_amount BIGINT NOT NULL,
  commission_rate DECIMAL(4,3) NOT NULL,
  net_amount BIGINT NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  stripe_charge_id TEXT,
  stripe_refund_id TEXT,
  customer_id TEXT,
  customer_email TEXT,
  description TEXT,
  metadata JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT transaction_type_check CHECK (transaction_type IN ('payment', 'commission', 'payout', 'refund', 'adjustment')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded'))
);

CREATE INDEX idx_stripe_tx_partner_id ON stripe_transactions(partner_id);
CREATE INDEX idx_stripe_tx_payment_intent ON stripe_transactions(stripe_payment_intent_id);
CREATE INDEX idx_stripe_tx_status ON stripe_transactions(status);
CREATE INDEX idx_stripe_tx_created_at ON stripe_transactions(created_at DESC);
```

#### 3. partner_payouts

Registra payouts para contas bancárias dos parceiros.

```sql
CREATE TABLE partner_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES users(id),
  stripe_account_id TEXT NOT NULL,
  stripe_payout_id TEXT NOT NULL UNIQUE,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  arrival_date TIMESTAMP WITH TIME ZONE,
  method TEXT NOT NULL DEFAULT 'standard',
  description TEXT,
  failure_code TEXT,
  failure_message TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT status_check CHECK (status IN ('pending', 'paid', 'failed', 'canceled')),
  CONSTRAINT method_check CHECK (method IN ('standard', 'instant'))
);

CREATE INDEX idx_payouts_partner_id ON partner_payouts(partner_id);
CREATE INDEX idx_payouts_stripe_id ON partner_payouts(stripe_payout_id);
CREATE INDEX idx_payouts_status ON partner_payouts(status);
```

### Funções PostgreSQL

#### update_partner_balance

Atualiza saldos de parceiros atomicamente.

```sql
CREATE OR REPLACE FUNCTION update_partner_balance(
  p_partner_id UUID,
  p_commission_amount BIGINT
) RETURNS VOID AS $$
BEGIN
  UPDATE partner_stripe_accounts
  SET
    total_earnings = total_earnings + p_commission_amount,
    pending_balance = pending_balance + p_commission_amount,
    updated_at = NOW()
  WHERE partner_id = p_partner_id;
END;
$$ LANGUAGE plpgsql;
```

---

## API Endpoints

### POST /api/stripe/connect

Cria nova conta Stripe Connect para parceiro.

**Request:**
```typescript
{
  "partner_id": "user_123",
  "email": "parceiro@email.com",
  "tier": "starter",
  "country": "BR",
  "business_type": "individual",
  "refresh_url": "https://app.com/onboarding/refresh",
  "return_url": "https://app.com/onboarding/complete"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_123",
      "stripe_account_id": "acct_1ABC",
      "tier": "starter",
      "commission_rate": 0.15,
      "onboarding_completed": false
    },
    "onboarding_url": "https://connect.stripe.com/setup/s/...",
    "expires_at": 1735689600
  }
}
```

### GET /api/stripe/connect?partner_id=xxx

Obtém status da conta Stripe do parceiro.

**Response:**
```typescript
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_123",
      "partner_id": "user_123",
      "stripe_account_id": "acct_1ABC",
      "stripe_account_status": "active",
      "tier": "growth",
      "commission_rate": 0.20,
      "onboarding_completed": true,
      "charges_enabled": true,
      "payouts_enabled": true,
      "total_earnings": 150000,
      "pending_balance": 50000,
      "available_balance": 100000
    },
    "stripe_details": {
      "charges_enabled": true,
      "payouts_enabled": true,
      "details_submitted": true,
      "requirements": {
        "currently_due": [],
        "past_due": [],
        "eventually_due": []
      }
    }
  }
}
```

### PUT /api/stripe/connect

Atualiza tier ou gera novo link de onboarding.

**Request (Update Tier):**
```typescript
{
  "partner_id": "user_123",
  "tier": "premium",
  "action": "update_tier"
}
```

**Request (Refresh Onboarding):**
```typescript
{
  "partner_id": "user_123",
  "refresh_url": "https://app.com/onboarding/refresh",
  "return_url": "https://app.com/onboarding/complete",
  "action": "refresh_onboarding"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "onboarding_url": "https://connect.stripe.com/setup/s/...",
    "expires_at": 1735689600,
    "type": "account_update"
  }
}
```

### DELETE /api/stripe/connect?partner_id=xxx

Desativa conta Stripe Connect do parceiro.

**Response:**
```typescript
{
  "success": true,
  "message": "Partner Stripe account deleted successfully"
}
```

---

## Webhooks

### Configuração

1. No Stripe Dashboard, adicione endpoint:
   - URL: `https://app.mottivme.com/api/stripe/webhooks`
   - Eventos: Selecione todos os eventos de Connect

2. Copie o Webhook Secret e adicione ao `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Eventos Tratados

#### Account Events

- **account.updated**: Atualiza status do parceiro
- **account.external_account.created**: Conta bancária adicionada
- **account.external_account.deleted**: Conta bancária removida

#### Payment Events

- **payment_intent.succeeded**: Pagamento concluído, registra transação
- **payment_intent.payment_failed**: Pagamento falhou
- **payment_intent.canceled**: Pagamento cancelado

#### Charge Events

- **charge.succeeded**: Cobrança bem-sucedida
- **charge.failed**: Cobrança falhou
- **charge.refunded**: Estorno processado

#### Transfer Events

- **transfer.created**: Transferência criada para parceiro
- **transfer.updated**: Transferência atualizada
- **transfer.failed**: Transferência falhou

#### Payout Events

- **payout.paid**: Payout enviado para conta bancária
- **payout.failed**: Payout falhou

### Teste de Webhooks

```bash
# Usando Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Trigger evento de teste
stripe trigger payment_intent.succeeded
```

---

## Segurança

### Variáveis de Ambiente

```bash
# .env.local

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... # ou sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # ou pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Checklist de Segurança

- [ ] Usar HTTPS em produção
- [ ] Validar assinatura de webhooks
- [ ] Nunca expor `STRIPE_SECRET_KEY` no frontend
- [ ] Usar `SUPABASE_SERVICE_ROLE_KEY` apenas no backend
- [ ] Implementar rate limiting nos endpoints
- [ ] Validar todos os inputs
- [ ] Registrar tentativas de fraude
- [ ] Usar Row Level Security (RLS) no Supabase

### Row Level Security (RLS)

```sql
-- Parceiros só podem ver suas próprias contas
CREATE POLICY partner_accounts_policy ON partner_stripe_accounts
  FOR SELECT
  USING (partner_id = auth.uid());

-- Parceiros só podem ver suas próprias transações
CREATE POLICY partner_transactions_policy ON stripe_transactions
  FOR SELECT
  USING (partner_id = auth.uid());
```

---

## Testes

### Cartões de Teste

```typescript
// Stripe Test Cards
const testCards = {
  success: '4242424242424242',
  decline: '4000000000000002',
  requiresAuth: '4000002500003155',
  insufficientFunds: '4000000000009995'
};
```

### Teste de Onboarding

```bash
# 1. Criar conta de teste
curl -X POST http://localhost:3000/api/stripe/connect \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "test_partner_123",
    "email": "teste@parceiro.com",
    "tier": "starter",
    "refresh_url": "http://localhost:3000/onboarding/refresh",
    "return_url": "http://localhost:3000/onboarding/complete"
  }'

# 2. Acessar onboarding_url retornado
# 3. Preencher dados de teste no Stripe
# 4. Verificar webhook account.updated
```

### Teste de Pagamento

```typescript
// Create test payment
const response = await fetch('/api/stripe/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: 100000, // R$ 1.000,00
    currency: 'brl',
    partner_id: 'test_partner_123',
    customer_email: 'cliente@teste.com'
  })
});

const { client_secret } = await response.json();

// Complete payment with test card
const { error } = await stripe.confirmCardPayment(client_secret, {
  payment_method: {
    card: cardElement,
    billing_details: { email: 'cliente@teste.com' }
  }
});
```

---

## Deploy

### Checklist de Deploy

1. **Ambiente de Produção**
   - [ ] Migrar para chaves Stripe Live
   - [ ] Configurar webhook de produção
   - [ ] Ativar HTTPS
   - [ ] Configurar domínio customizado

2. **Banco de Dados**
   - [ ] Executar migrations no Supabase
   - [ ] Ativar Row Level Security
   - [ ] Criar backups automáticos

3. **Monitoramento**
   - [ ] Configurar Sentry/logging
   - [ ] Adicionar alertas de erro
   - [ ] Monitorar webhooks no Stripe Dashboard

4. **Compliance**
   - [ ] Revisar termos de serviço Stripe
   - [ ] Configurar políticas de privacidade
   - [ ] Documentar fluxo de pagamento

### Comandos de Deploy

```bash
# Build production
npm run build

# Deploy Vercel
vercel --prod

# Executar migrations Supabase
supabase db push
```

---

## Troubleshooting

### Problema: Onboarding não completa

**Sintomas:**
- Link de onboarding expira
- Parceiro não consegue adicionar conta bancária

**Solução:**
```typescript
// Gerar novo link
PUT /api/stripe/connect
{
  "partner_id": "partner_123",
  "action": "refresh_onboarding",
  "refresh_url": "...",
  "return_url": "..."
}
```

### Problema: Pagamento não divide corretamente

**Sintomas:**
- Comissão errada
- Transfer não aparece

**Verificar:**
```typescript
// 1. Conferir commission_rate na tabela
SELECT commission_rate, tier
FROM partner_stripe_accounts
WHERE partner_id = 'partner_123';

// 2. Verificar metadata do Payment Intent no Stripe Dashboard
// 3. Checar logs do webhook payment_intent.succeeded
```

### Problema: Webhook não recebe eventos

**Verificar:**
```bash
# 1. Endpoint configurado corretamente no Stripe Dashboard
# 2. STRIPE_WEBHOOK_SECRET correto no .env.local
# 3. Testar localmente com Stripe CLI

stripe listen --forward-to localhost:3000/api/stripe/webhooks
stripe trigger payment_intent.succeeded
```

### Problema: Payout falha

**Sintomas:**
- Payout com status "failed"
- Parceiro não recebe transferência

**Causas Comuns:**
- Conta bancária inválida
- Saldo insuficiente
- Conta Stripe bloqueada

**Solução:**
```typescript
// 1. Verificar status da conta
GET /api/stripe/connect?partner_id=partner_123

// 2. Checar requisitos pendentes
const account = await stripe.accounts.retrieve('acct_123');
console.log(account.requirements);

// 3. Solicitar nova conta bancária se necessário
```

---

## Referências

- [Stripe Connect Documentation](https://stripe.com/docs/connect)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)

---

## Changelog

### v1.0.0 - 2026-01-01
- Implementação inicial
- Suporte para 4 tiers de parceiros
- Sistema de split automático
- Webhooks completos
- Documentação técnica

---

**Desenvolvido por MOTTIVME**
**Contato:** suporte@mottivme.com
