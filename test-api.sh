#!/bin/bash

# ============================================
# 🧪 TESTE DAS APIs DO MIS SENTINEL
# ============================================

DOMAIN="https://admin-dashboard-marcosdanielsfs-projects.vercel.app"
TOKEN="k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH"

echo "🚀 Testando APIs do MIS SENTINEL..."
echo "Domínio: $DOMAIN"
echo ""

# ============================================
# Teste 1: Buscar Issues Abertos
# ============================================
echo "📋 Teste 1: Buscar issues abertos (critical)"
echo "=========================================="

curl -s -X GET "$DOMAIN/api/issues/open?priority=critical&limit=10" \
  -H "x-vercel-protection-bypass: $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo ""

# ============================================
# Teste 2: Criar Issue de Teste
# ============================================
echo "➕ Teste 2: Criar issue de teste"
echo "=========================================="

ISSUE_RESPONSE=$(curl -s -X POST "$DOMAIN/api/issues/create" \
  -H "x-vercel-protection-bypass: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "issue_type": "test_automation",
    "customer_name": "Cliente Teste Automação",
    "customer_phone": "+5511999999999",
    "priority": "critical",
    "metadata": {
      "source": "test_script",
      "timestamp": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"
    }
  }')

echo "$ISSUE_RESPONSE" | jq '.'

# Extrair ID do issue criado
ISSUE_ID=$(echo "$ISSUE_RESPONSE" | jq -r '.issue.id // empty')

echo ""
echo ""

# ============================================
# Teste 3: Adicionar Ação ao Issue
# ============================================
if [ ! -z "$ISSUE_ID" ]; then
  echo "📝 Teste 3: Adicionar ação ao issue $ISSUE_ID"
  echo "=========================================="

  curl -s -X POST "$DOMAIN/api/issues/action" \
    -H "x-vercel-protection-bypass: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "issue_id": "'"$ISSUE_ID"'",
      "action_type": "automated_test",
      "action_description": "Teste de automação - verificando se sistema está funcionando",
      "taken_by": "SYSTEM_AUTO",
      "success": true
    }' | jq '.'

  echo ""
  echo ""
fi

# ============================================
# Teste 4: Buscar Issues Novamente
# ============================================
echo "🔍 Teste 4: Verificar se issue aparece na lista"
echo "=========================================="

curl -s -X GET "$DOMAIN/api/issues/open?priority=critical&limit=10" \
  -H "x-vercel-protection-bypass: $TOKEN" \
  -H "Content-Type: application/json" | jq '.issues[] | {id, issue_type, customer_name, priority, status, detected_at}'

echo ""
echo ""

# ============================================
# Teste 5: Resolver Issue
# ============================================
if [ ! -z "$ISSUE_ID" ]; then
  echo "✅ Teste 5: Resolver issue $ISSUE_ID"
  echo "=========================================="

  curl -s -X POST "$DOMAIN/api/issues/resolve" \
    -H "x-vercel-protection-bypass: $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "issue_id": "'"$ISSUE_ID"'",
      "resolution_notes": "Issue de teste resolvido automaticamente pelo script de validação",
      "customer_satisfaction": 5,
      "resolved_by": "SYSTEM_AUTO"
    }' | jq '.'

  echo ""
  echo ""
fi

# ============================================
# Resumo
# ============================================
echo "=========================================="
echo "✅ TESTES CONCLUÍDOS!"
echo "=========================================="
echo ""
echo "Próximos passos:"
echo "1. Verificar se todos os testes passaram ✅"
echo "2. Acessar dashboard: $DOMAIN/crt"
echo "3. Verificar se issue aparece na página /issues"
echo "4. Configurar workflow no n8n com as mesmas credenciais"
echo ""
echo "Token do bypass: $TOKEN"
echo ""