#!/bin/bash

# SCRIPT DE TESTE DE PERFORMANCE - VERSÃO BASH SIMPLES
# Uso: ./scripts/test-performance.sh [numero_de_issues]

API_BASE="https://admin-dashboard-hjxcvchgb-marcosdanielsfs-projects.vercel.app"
BYPASS_TOKEN="k0YEgeZz2JylRDNETMuJKnk4SpUWTaeH"
NUM_ISSUES=${1:-5}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}"
echo "============================================================"
echo "🧪 TESTE DE PERFORMANCE - MIS SENTINEL"
echo "============================================================"
echo -e "${NC}"

echo -e "${CYAN}📊 Configuração:${NC}"
echo "   - Número de issues: $NUM_ISSUES"
echo "   - API: $API_BASE"
echo ""

# Create issues
echo -e "${BOLD}📝 FASE 1: Criando issues de teste...${NC}"
echo ""

ISSUE_IDS=()
for i in $(seq 1 $NUM_ISSUES); do
  PHONE=$(printf "+5511999%06d" $i)

  RESPONSE=$(curl -s -X POST "$API_BASE/api/issues/create" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"issue_type\": \"payment_failed\",
      \"customer_name\": \"Test Performance $i\",
      \"customer_phone\": \"$PHONE\",
      \"priority\": \"critical\",
      \"metadata\": {
        \"test\": true,
        \"test_run_id\": \"perf-test-$(date +%s)\",
        \"test_index\": $i
      }
    }")

  ISSUE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -n "$ISSUE_ID" ]; then
    ISSUE_IDS+=("$ISSUE_ID")
    echo -e "${GREEN}✅ Issue $i/$NUM_ISSUES criado: ${ISSUE_ID:0:8}...${NC}"
  else
    echo -e "${RED}❌ Erro ao criar issue $i${NC}"
    echo "   Response: $RESPONSE"
  fi

  sleep 0.5
done

echo ""
echo -e "${GREEN}✅ ${#ISSUE_IDS[@]} issues criados com sucesso!${NC}"
echo ""

# Monitor
echo -e "${BOLD}👀 FASE 2: Monitorando processamento...${NC}"
echo -e "${YELLOW}⏱️  Aguardando workflows n8n (max 3 minutos)...${NC}"
echo ""

START_TIME=$(date +%s)

for ISSUE_ID in "${ISSUE_IDS[@]}"; do
  echo -e "${CYAN}Monitorando: ${ISSUE_ID:0:8}...${NC}"
done

echo ""
echo "Aguardando 3 minutos para processamento..."
sleep 180

# Check results
echo ""
echo -e "${BOLD}${BLUE}============================================================${NC}"
echo -e "${BOLD}${BLUE}📊 RESULTADOS DO TESTE${NC}"
echo -e "${BOLD}${BLUE}============================================================${NC}"
echo ""

TOTAL_RESPONDED=0
TOTAL_TTFR=0

for i in "${!ISSUE_IDS[@]}"; do
  ISSUE_ID="${ISSUE_IDS[$i]}"
  INDEX=$((i + 1))

  # Fetch issue status
  ISSUES=$(curl -s "$API_BASE/api/issues/open?priority=all&limit=100" \
    -H "x-vercel-protection-bypass: $BYPASS_TOKEN")

  # Extract issue data (simple grep/cut - not perfect but works)
  ISSUE_DATA=$(echo "$ISSUES" | grep -o "\"id\":\"$ISSUE_ID\"[^}]*" | head -1)

  if echo "$ISSUE_DATA" | grep -q "first_response_at"; then
    echo -e "${GREEN}✅ Issue $INDEX: Respondido${NC}"
    TOTAL_RESPONDED=$((TOTAL_RESPONDED + 1))
  else
    echo -e "${RED}❌ Issue $INDEX: Sem resposta${NC}"
  fi
done

echo ""
echo -e "${CYAN}📊 RESUMO:${NC}"
echo "   - Issues criados: ${#ISSUE_IDS[@]}"
echo "   - Issues respondidos: $TOTAL_RESPONDED"

RESPONSE_RATE=$((TOTAL_RESPONDED * 100 / ${#ISSUE_IDS[@]}))
echo "   - Taxa de resposta: ${RESPONSE_RATE}%"

echo ""

if [ $TOTAL_RESPONDED -eq ${#ISSUE_IDS[@]} ]; then
  echo -e "${GREEN}${BOLD}🎯 SUCESSO! Todos os issues foram processados!${NC}"
elif [ $TOTAL_RESPONDED -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Alguns issues foram processados. Verifique os workflows.${NC}"
else
  echo -e "${RED}❌ NENHUM ISSUE FOI PROCESSADO!${NC}"
  echo -e "${YELLOW}   Verifique se os workflows n8n estão ATIVOS.${NC}"
fi

echo ""
echo -e "${BOLD}${BLUE}============================================================${NC}"
echo ""

# Cleanup suggestion
echo -e "${CYAN}💡 Para ver detalhes completos, acesse:${NC}"
echo "   $API_BASE/performance"
echo ""