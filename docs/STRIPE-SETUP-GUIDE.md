# Stripe Connect - Guia de Configuração Rápida

> **Setup completo da integração Stripe Connect em 10 minutos**

---

## Checklist Rápido

- [ ] Criar conta Stripe
- [ ] Configurar variáveis de ambiente
- [ ] Executar migrations no Supabase
- [ ] Configurar webhooks
- [ ] Testar onboarding
- [ ] Testar pagamento

---

## 1. Criar Conta Stripe (3 min)

### 1.1. Registro

1. Acesse: https://dashboard.stripe.com/register
2. Crie sua conta com email empresarial
3. Confirme email
4. Ative o modo de teste

### 1.2. Habilitar Stripe Connect

1. No Dashboard, vá em **Connect** → **Get Started**
2. Selecione **Platform or marketplace**
3. Confirme os termos de serviço

---

## 2. Configurar Variáveis de Ambiente (2 min)

### 2.1. Obter Chaves da API

1. No Dashboard: https://dashboard.stripe.com/test/apikeys
2. Copie:
   - **Publishable key** (começa com `pk_test_`)
   - **Secret key** (começa com `sk_test_`)

### 2.2. Criar arquivo .env.local

```bash
# No diretório do projeto
cp .env.stripe.example .env.local
```

### 2.3. Preencher .env.local

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_ONBOARDING_REFRESH_URL=http://localhost:3000/onboarding/refresh
NEXT_PUBLIC_STRIPE_ONBOARDING_RETURN_URL=http://localhost:3000/onboarding/complete
```

---

## 3. Executar Migrations no Supabase (2 min)

### Opção A: Via Supabase Dashboard

1. Acesse: https://app.supabase.com/project/YOUR_PROJECT/editor
2. Clique em **SQL Editor**
3. Crie nova query
4. Copie e cole todo o conteúdo de `docs/supabase-stripe-schema.sql`
5. Execute (Run)

### Opção B: Via CLI

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Executar migration
supabase db push --file docs/supabase-stripe-schema.sql
```

### Verificar Instalação

```sql
-- No SQL Editor do Supabase
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'partner_stripe_accounts',
  'stripe_transactions',
  'partner_payouts'
);
```

Deve retornar 3 tabelas.

---

## 4. Configurar Webhooks (2 min)

### 4.1. Criar Endpoint de Webhook

1. No Dashboard: https://dashboard.stripe.com/test/webhooks
2. Clique em **Add endpoint**
3. Preencha:
   - **Endpoint URL**: `http://localhost:3000/api/stripe/webhooks` (para dev)
   - **Description**: `BPOSS White Label Webhooks`
   - **Events to send**: Selecione:
     - `account.updated`
     - `account.external_account.created`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.succeeded`
     - `charge.refunded`
     - `transfer.created`
     - `payout.paid`
     - `payout.failed`

4. Clique em **Add endpoint**

### 4.2. Obter Webhook Secret

1. Clique no endpoint criado
2. Clique em **Reveal** no **Signing secret**
3. Copie o valor (começa com `whsec_`)
4. Adicione no `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

### 4.3. Testar Webhooks Localmente (Opcional)

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Escutar webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Em outro terminal, trigger evento de teste
stripe trigger payment_intent.succeeded
```

---

## 5. Testar Onboarding de Parceiro (3 min)

### 5.1. Iniciar Servidor

```bash
npm run dev
```

### 5.2. Criar Conta de Parceiro

```bash
curl -X POST http://localhost:3000/api/stripe/connect \
  -H "Content-Type: application/json" \
  -d '{
    "partner_id": "test_partner_001",
    "email": "parceiro@teste.com",
    "tier": "starter",
    "country": "BR",
    "business_type": "individual",
    "refresh_url": "http://localhost:3000/onboarding/refresh",
    "return_url": "http://localhost:3000/onboarding/complete"
  }'
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "account": {
      "id": "...",
      "stripe_account_id": "acct_...",
      "tier": "starter",
      "commission_rate": 0.15
    },
    "onboarding_url": "https://connect.stripe.com/setup/s/...",
    "expires_at": 1735689600
  }
}
```

### 5.3. Completar Onboarding

1. Copie a `onboarding_url` da resposta
2. Abra no navegador
3. Preencha dados de teste:
   - **Nome**: João Silva
   - **CPF**: 000.000.001-91 (CPF de teste do Stripe)
   - **Data Nasc**: 01/01/1990
   - **Endereço**: Qualquer endereço no Brasil
   - **Conta Bancária**: Use dados de teste do Stripe

4. Após conclusão, você será redirecionado para `return_url`

### 5.4. Verificar Status

```bash
curl http://localhost:3000/api/stripe/connect?partner_id=test_partner_001
```

**Resposta Esperada:**

```json
{
  "success": true,
  "data": {
    "account": {
      "stripe_account_status": "active",
      "onboarding_completed": true,
      "charges_enabled": true,
      "payouts_enabled": true
    }
  }
}
```

---

## 6. Testar Pagamento com Split (2 min)

### 6.1. Criar Payment Intent

Primeiro, crie uma função helper ou endpoint para criar pagamentos. Exemplo:

```typescript
// app/api/stripe/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPaymentIntentWithTransfer } from '@/lib/stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { amount, partner_id, customer_email } = await request.json();

  // Get partner account
  const { data: partnerAccount } = await supabase
    .from('partner_stripe_accounts')
    .select('*')
    .eq('partner_id', partner_id)
    .single();

  if (!partnerAccount) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
  }

  // Create payment intent with split
  const paymentIntent = await createPaymentIntentWithTransfer({
    amount,
    currency: 'brl',
    partner_id,
    customer_email,
    description: 'Teste de pagamento com split'
  }, partnerAccount);

  return NextResponse.json({
    client_secret: paymentIntent.client_secret,
    amount: paymentIntent.amount,
    commission: partnerAccount.commission_rate * amount
  });
}
```

### 6.2. Criar Pagamento de Teste

```bash
curl -X POST http://localhost:3000/api/stripe/payment \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "partner_id": "test_partner_001",
    "customer_email": "cliente@teste.com"
  }'
```

### 6.3. Simular Pagamento com Cartão de Teste

Use a interface do Stripe Elements ou via curl:

```bash
# Usar cartão de teste: 4242 4242 4242 4242
# Qualquer CVC e data futura
```

### 6.4. Verificar Split no Dashboard

1. Acesse: https://dashboard.stripe.com/test/payments
2. Encontre o pagamento criado
3. Verifique:
   - **Transfer**: R$ 150,00 (15% para parceiro Starter)
   - **Application Fee**: R$ 850,00 (85% para MOTTIVME)

### 6.5. Verificar Transação no Banco

```sql
-- No Supabase SQL Editor
SELECT
  id,
  partner_id,
  amount / 100.0 AS amount_brl,
  commission_amount / 100.0 AS commission_brl,
  commission_rate,
  status,
  created_at
FROM stripe_transactions
ORDER BY created_at DESC
LIMIT 5;
```

---

## 7. Produção (Deploy)

### 7.1. Atualizar Variáveis de Ambiente

```bash
# Usar chaves de produção
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY

# URL de produção
NEXT_PUBLIC_APP_URL=https://app.mottivme.com
```

### 7.2. Criar Webhook de Produção

1. No Dashboard: https://dashboard.stripe.com/webhooks
2. Adicionar endpoint: `https://app.mottivme.com/api/stripe/webhooks`
3. Copiar novo Webhook Secret

### 7.3. Ativar Conta Stripe

1. Completar **Account Verification** no Dashboard
2. Preencher informações bancárias da empresa
3. Aguardar aprovação (geralmente 1-2 dias)

---

## Troubleshooting

### Problema: "STRIPE_SECRET_KEY is not defined"

**Solução:**
```bash
# Verificar se .env.local existe
ls -la .env.local

# Reiniciar servidor
npm run dev
```

### Problema: Webhook não recebe eventos

**Solução:**
```bash
# Verificar endpoint no Dashboard
# Usar Stripe CLI localmente
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Em outro terminal
stripe trigger payment_intent.succeeded
```

### Problema: "Partner account not found"

**Solução:**
```sql
-- Verificar se migrations rodaram
SELECT * FROM partner_stripe_accounts LIMIT 1;

-- Se tabela não existe, rodar migration novamente
```

### Problema: Split não aparece no Stripe

**Solução:**
```typescript
// Verificar se partnerAccount está ativo
const { data } = await supabase
  .from('partner_stripe_accounts')
  .select('*')
  .eq('partner_id', 'test_partner_001')
  .single();

console.log('Status:', data.stripe_account_status);
console.log('Charges enabled:', data.charges_enabled);
```

---

## Próximos Passos

1. **Frontend**: Criar interface de onboarding para parceiros
2. **Dashboard**: Criar painel de analytics de comissões
3. **Automação**: Implementar upgrade automático de tier
4. **Notificações**: Adicionar emails de confirmação
5. **Relatórios**: Criar relatórios mensais de comissões

---

## Recursos Úteis

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## Suporte

- **Documentação Completa**: Ver `docs/stripe-connect-architecture.md`
- **Schema SQL**: Ver `docs/supabase-stripe-schema.sql`
- **Tipos TypeScript**: Ver `types/stripe.ts`
- **Helpers**: Ver `lib/stripe.ts`

---

**Desenvolvido por MOTTIVME**
