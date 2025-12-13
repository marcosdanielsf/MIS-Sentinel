-- ============================================================================
-- FIX: Valores R$ 0,00 na tabela fin_movimentacoes
-- PROBLEMA: A query retorna 200 registros mas todos com valor R$ 0,00
-- CAUSA: A coluna valor_previsto pode estar NULL ou 0, ou os valores estao em outra coluna
-- ============================================================================

-- ============================================================================
-- DIAGNOSTICO - Execute estas queries para identificar o problema
-- ============================================================================

-- 1. Verificar se ha dados na tabela
SELECT COUNT(*) as total_registros FROM fin_movimentacoes;

-- 2. Verificar valores da coluna valor_previsto
SELECT
  COUNT(*) as total,
  COUNT(valor_previsto) as com_valor_previsto,
  COUNT(NULLIF(valor_previsto, 0)) as valor_previsto_maior_zero,
  SUM(valor_previsto) as soma_valor_previsto
FROM fin_movimentacoes;

-- 3. Verificar outras colunas que podem ter os valores
SELECT
  COUNT(valor_realizado) as com_valor_realizado,
  COUNT(NULLIF(valor_realizado, 0)) as valor_realizado_maior_zero,
  SUM(valor_realizado) as soma_valor_realizado,
  COUNT(valor_moeda_estrangeira) as com_valor_moeda_estrangeira,
  SUM(valor_moeda_estrangeira) as soma_valor_moeda_estrangeira
FROM fin_movimentacoes;

-- 4. Amostra dos dados - ver estrutura real
SELECT
  id,
  tipo,
  descricao,
  valor_previsto,
  valor_realizado,
  valor_moeda_estrangeira,
  moeda_estrangeira,
  data_vencimento
FROM fin_movimentacoes
ORDER BY data_vencimento DESC
LIMIT 10;

-- 5. Ver distribuicao de tipos
SELECT tipo, COUNT(*), SUM(valor_previsto), SUM(valor_realizado)
FROM fin_movimentacoes
GROUP BY tipo;

-- ============================================================================
-- POSSIVEIS CORRECOES
-- ============================================================================

-- OPCAO 1: Se valor_realizado tem os valores corretos, copiar para valor_previsto
-- UPDATE fin_movimentacoes
-- SET valor_previsto = valor_realizado
-- WHERE valor_previsto IS NULL OR valor_previsto = 0;

-- OPCAO 2: Se valor_moeda_estrangeira tem os valores (USD), converter para BRL
-- UPDATE fin_movimentacoes
-- SET valor_previsto = valor_moeda_estrangeira * COALESCE(cotacao, 5.5)
-- WHERE moeda_estrangeira = 'USD'
--   AND (valor_previsto IS NULL OR valor_previsto = 0)
--   AND valor_moeda_estrangeira > 0;

-- ============================================================================
-- QUERY CORRIGIDA PARA N8N - Usando COALESCE para pegar o valor disponivel
-- ============================================================================

SELECT
  m.id,
  m.tipo,
  m.descricao,
  -- Tenta valor_previsto, depois valor_realizado, depois valor_moeda_estrangeira convertido
  COALESCE(
    NULLIF(m.valor_previsto, 0),
    NULLIF(m.valor_realizado, 0),
    CASE
      WHEN m.moeda_estrangeira = 'USD' THEN m.valor_moeda_estrangeira * COALESCE(m.cotacao, 5.5)
      ELSE m.valor_moeda_estrangeira
    END
  ) as valor_previsto,
  m.valor_realizado,
  m.data_vencimento,
  m.data_realizado,
  m.quitado,
  m.tipo_entidade,
  c.nome as cliente_fornecedor,
  cat.nome as categoria
FROM fin_movimentacoes m
LEFT JOIN fin_clientes_fornecedores c ON m.cliente_fornecedor_id = c.id
LEFT JOIN fin_categorias cat ON m.categoria_id = cat.id
WHERE m.data_vencimento >= NOW() - INTERVAL '30 days'
ORDER BY m.data_vencimento DESC
LIMIT 200;

-- ============================================================================
-- VIEW para facilitar queries do N8N
-- ============================================================================

DROP VIEW IF EXISTS public.vw_movimentacoes_financeiras;
CREATE VIEW public.vw_movimentacoes_financeiras AS
SELECT
  m.id,
  m.tipo,
  m.descricao,
  -- Valor calculado com fallback
  COALESCE(
    NULLIF(m.valor_previsto, 0),
    NULLIF(m.valor_realizado, 0),
    CASE
      WHEN m.moeda_estrangeira = 'USD' THEN m.valor_moeda_estrangeira * COALESCE(m.cotacao, 5.5)
      ELSE m.valor_moeda_estrangeira
    END,
    0
  ) as valor,
  m.valor_previsto as valor_original_previsto,
  m.valor_realizado,
  m.valor_moeda_estrangeira,
  m.moeda_estrangeira,
  m.cotacao,
  m.data_vencimento,
  m.data_realizado,
  m.quitado,
  m.tipo_entidade,
  m.cliente_fornecedor_id,
  c.nome as cliente_fornecedor,
  m.categoria_id,
  cat.nome as categoria,
  m.conta_bancaria_id,
  m.centro_custo_id,
  m.created_at
FROM fin_movimentacoes m
LEFT JOIN fin_clientes_fornecedores c ON m.cliente_fornecedor_id = c.id
LEFT JOIN fin_categorias cat ON m.categoria_id = cat.id;

GRANT SELECT ON public.vw_movimentacoes_financeiras TO anon, authenticated, service_role;

-- ============================================================================
-- VERIFICACAO
-- ============================================================================

SELECT 'View criada com sucesso!' as status;

-- Testar a view
SELECT tipo, COUNT(*), SUM(valor) as total_valor
FROM public.vw_movimentacoes_financeiras
GROUP BY tipo;
