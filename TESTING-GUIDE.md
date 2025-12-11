# 🧪 GUIA DE TESTES DE PERFORMANCE

## 📊 Dashboard de Métricas em Tempo Real

### Acessar Dashboard

```
https://admin-dashboard-hjxcvchgb-marcosdanielsfs-projects.vercel.app/performance
```

**Funcionalidades**:
- ⏱️ **TTFR** (Time to First Response) - Meta: <2min
- 🎯 **TTR** (Time to Resolution) - Meta: <2h
- ⚡ **Taxa de Automação** - Meta: >95%
- 🤖 **Precisão da IA** - Meta: >90%
- 📈 **Gráfico de 12 horas** - Issues criados/resolvidos por hora
- 🔄 **Auto-refresh** a cada 30 segundos

### Interpretação das Cores

- 🟢 **Verde**: Meta atingida!
- 🟡 **Amarelo**: Próximo da meta
- 🔴 **Vermelho**: Acima da meta (requer atenção)

---

## 🚀 Script de Teste Automatizado

### Opção 1: TypeScript (Completo)

**Teste Padrão** (5 issues):
```bash
npm run test:performance
```

**Teste Customizado**:
```bash
npx tsx scripts/test-performance.ts 10
```

**O que faz**:
1. ✅ Cria N issues de teste
2. ⏱️ Monitora processamento em tempo real
3. 📊 Calcula TTFR real de cada issue
4. 📈 Gera relatório detalhado com média, min, max
5. 🎯 Avalia performance (nota A+ até F)
6. 💡 Fornece recomendações

**Exemplo de Output**:
```
============================================================
🧪 INICIANDO TESTE DE PERFORMANCE
============================================================

📊 Configuração do teste:
   - Número de issues: 5
   - API Base: https://...
   - Timeout: 5 minutos por issue

📝 FASE 1: Criando issues...
✅ Issue 1/5 criado: a1b2c3d4...
✅ Issue 2/5 criado: e5f6g7h8...
...

👀 FASE 2: Monitorando processamento...
[Issue 1] ✅ Primeira resposta em 65s (1.1min)
[Issue 2] ✅ Primeira resposta em 72s (1.2min)
...

============================================================
📊 RELATÓRIO DE PERFORMANCE
============================================================

⏱️  TIME TO FIRST RESPONSE (TTFR):
   - Média: 1.15 min (69s)
   - Mínimo: 1.08 min (65s)
   - Máximo: 1.20 min (72s)
   - Taxa de resposta: 100% (5/5)
   🎯 META ATINGIDA! TTFR < 2min

============================================================
🏆 AVALIAÇÃO FINAL:
   NOTA: A 🎯
============================================================
```

### Opção 2: Bash (Rápido)

**Teste Rápido** (3 issues):
```bash
npm run test:performance:quick
```

**Teste Completo** (10 issues):
```bash
npm run test:performance:full
```

**Teste Customizado**:
```bash
./scripts/test-performance.sh 15
```

**O que faz**:
1. ✅ Cria N issues
2. ⏳ Aguarda 3 minutos
3. ✅ Verifica quantos foram respondidos
4. 📊 Mostra taxa de sucesso

---

## 📋 Workflow de Teste Recomendado

### 1. **Antes de Importar Workflows Otimizados**

```bash
# 1. Criar baseline
npm run test:performance:quick

# 2. Anotar TTFR médio atual
# Exemplo: TTFR médio = 5.2min
```

### 2. **Importar Workflows Otimizados no n8n**

1. Acesse n8n
2. Importe `MIS - Auto Response OPTIMIZED 1min.json`
3. Importe `MIS - Auto Resolve OPTIMIZED 5min.json`
4. **ATIVE** ambos workflows
5. **DESATIVE** workflows antigos (opcional)

### 3. **Validar Otimização**

```bash
# Aguardar 2 minutos para workflows iniciarem
sleep 120

# Executar teste
npm run test:performance:quick

# Comparar resultado com baseline
# Esperado: TTFR médio < 2min (redução de 60-80%)
```

### 4. **Teste de Stress**

```bash
# Criar 10 issues simultâneos
npm run test:performance:full

# Validar que TODOS foram processados
# Esperado: 100% taxa de resposta
```

### 5. **Monitorar no Dashboard**

```
https://admin-dashboard-hjxcvchgb-marcosdanielsfs-projects.vercel.app/performance
```

Verificar:
- ✅ TTFR < 2min (verde)
- ✅ Taxa automação > 70%
- ✅ Críticos pendentes = 0

---

## 🎯 Metas de Performance

| Métrica | Meta Atual | Meta Musk | Como Atingir |
|---------|-----------|-----------|--------------|
| **TTFR** | <5min | <30s | Webhooks (Fase 2) |
| **TTR** | <4h | <2h | Auto-resolução otimizada |
| **Automação** | 70% | 95% | Mais workflows + IA |
| **Precisão IA** | >70% | >90% | Fine-tuning prompts |

---

## ⚠️ Troubleshooting

### Problema: TTFR > 5min

**Possíveis Causas**:
1. ❌ Workflows n8n **não estão ativos**
2. ❌ Intervalo ainda é 5min (não foi atualizado)
3. ❌ Gemini está com rate limit

**Solução**:
```bash
# 1. Verificar workflows n8n estão ATIVOS
# 2. Confirmar intervalo = 1min
# 3. Verificar logs do n8n para erros
```

### Problema: Taxa de resposta < 100%

**Possíveis Causas**:
1. ❌ Gemini API falhou
2. ❌ Issues não atendem critérios (ex: não são critical)
3. ❌ Rate limiting

**Solução**:
```bash
# Verificar logs no n8n
# Adicionar retry logic (Fase 2)
```

### Problema: Issues não aparecem no dashboard

**Possíveis Causas**:
1. ❌ Cache do browser
2. ❌ Issues criados há mais de 24h

**Solução**:
```bash
# Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
# Verificar filtros no dashboard
```

---

## 📊 Interpretação de Resultados

### ✅ **SUCESSO** (Nota A ou A+)

```
TTFR médio: 1.2min
Taxa de resposta: 100%
```

**Ação**:
- ✅ Deploy para produção
- ✅ Desativar workflows antigos
- ✅ Monitorar por 24h
- ➡️ Planejar Fase 2 (webhooks)

### ⚠️ **BOM MAS PODE MELHORAR** (Nota B ou C)

```
TTFR médio: 2.5min
Taxa de resposta: 80%
```

**Ação**:
- 🔍 Investigar por que 20% não respondeu
- 🔍 Verificar logs Gemini
- 🔍 Adicionar retry logic
- ⏳ Testar novamente

### ❌ **PROBLEMAS** (Nota D ou F)

```
TTFR médio: 6.0min
Taxa de resposta: 20%
```

**Ação**:
- 🚨 NÃO fazer deploy
- 🔍 Verificar workflows estão ATIVOS
- 🔍 Verificar credenciais Gemini
- 🔍 Verificar logs de erro
- 📞 Reportar issue

---

## 🔄 Ciclo de Melhoria Contínua

```
1. TESTAR
   ↓
2. MEDIR (TTFR, TTR, Automação)
   ↓
3. ANALISAR (Dashboard + Reports)
   ↓
4. OTIMIZAR (Ajustar prompts, intervals, etc.)
   ↓
5. REPETIR
```

---

## 📈 Próximos Passos (Fase 2)

Quando atingir metas da Fase 1:
- ✅ TTFR < 2min
- ✅ Taxa automação > 70%

**Implementar**:
1. 🔔 **Webhooks** (GHL → n8n)
   - Meta: TTFR < 10s
2. 🔁 **Retry Logic**
   - Meta: 99.9% taxa de resposta
3. 📊 **Rate Limiting Inteligente**
   - Priorizar critical > high > medium > low
4. 💾 **Caching de Respostas IA**
   - Reduzir 50% custos Gemini

---

## 💡 Dicas de Ouro

1. **Sempre teste em horários diferentes**
   - Manhã, tarde, noite
   - Carga pode variar

2. **Compare com dados históricos**
   - Use dashboard para ver tendências
   - TTFR aumentando? Investigar!

3. **Monitore custos Gemini**
   - Mais verificações ≠ mais custo
   - Só paga se gerar resposta

4. **Crie alertas**
   - Se TTFR > 5min → Slack/Email
   - Se taxa < 90% → Investigar

5. **Documente mudanças**
   - Antes/depois de cada otimização
   - Facilita rollback se necessário

---

**Status**: 🟢 Pronto para uso!
**Última atualização**: 2025-11-28