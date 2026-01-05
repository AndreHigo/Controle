-- ============================================
-- DIAGNÓSTICO E CORREÇÃO: SALDO ZERANDO
-- ============================================

-- 1. VERIFICAR SE A COLUNA AVAILABLE_BALANCE EXISTE
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'credit_cards' 
  AND column_name = 'available_balance';

-- Se retornar vazio, a coluna não existe!
-- Execute: ALTER TABLE credit_cards ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0;

-- ============================================
-- 2. VERIFICAR SALDOS ATUAIS
-- ============================================

SELECT 
  id,
  name,
  last_digits,
  available_balance,
  credit_limit,
  created_at,
  updated_at
FROM credit_cards
ORDER BY updated_at DESC;

-- ============================================
-- 3. VERIFICAR HISTÓRICO DE MUDANÇAS DE SALDO
-- ============================================

-- Verificar se a tabela de histórico existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'credit_card_balance_history'
) AS history_table_exists;

-- Se existir, ver últimas mudanças:
SELECT 
  h.*,
  cc.name as card_name
FROM credit_card_balance_history h
JOIN credit_cards cc ON cc.id = h.credit_card_id
ORDER BY h.created_at DESC
LIMIT 20;

-- ============================================
-- 4. VERIFICAR TRANSAÇÕES QUE AFETARAM O SALDO
-- ============================================

SELECT 
  t.id,
  t.title,
  t.amount,
  t.type,
  t.date,
  t.credit_card_id,
  cc.name as card_name,
  t.created_at
FROM transactions t
JOIN credit_cards cc ON cc.id = t.credit_card_id
WHERE t.credit_card_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 20;

-- ============================================
-- 5. GARANTIR QUE AVAILABLE_BALANCE EXISTE
-- ============================================

DO $$
BEGIN
  -- Adicionar coluna se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_cards' AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Coluna available_balance adicionada';
  ELSE
    RAISE NOTICE '✅ Coluna available_balance já existe';
  END IF;
  
  -- Garantir valores não nulos
  UPDATE credit_cards SET available_balance = 0 WHERE available_balance IS NULL;
  RAISE NOTICE '✅ Valores nulos corrigidos';
END $$;

-- ============================================
-- 6. RESTAURAR SALDO MANUALMENTE (SE NECESSÁRIO)
-- ============================================

-- EXEMPLO: Restaurar R$ 100 no cartão da Débora
-- SUBSTITUIR 'nome-do-cartao' e o valor conforme necessário

/*
UPDATE credit_cards
SET available_balance = 100.00  -- ← AJUSTE O VALOR AQUI
WHERE name ILIKE '%debora%'  -- ← AJUSTE O NOME AQUI
  AND user_id = auth.uid();
*/

-- ============================================
-- 7. VERIFICAR SE FUNÇÕES RPC EXISTEM
-- ============================================

SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_transaction_with_balance',
    'update_transaction_with_balance',
    'delete_transaction_with_balance',
    'close_invoice_with_balance',
    'validate_credit_limit'
  )
ORDER BY routine_name;

-- Se alguma função não aparecer, você precisa executar o script SQL que as cria!

-- ============================================
-- 8. LOGS PARA DEBUG
-- ============================================

-- Ver todas as atualizações recentes em credit_cards
SELECT 
  id,
  name,
  available_balance,
  updated_at,
  updated_at - created_at as age
FROM credit_cards
ORDER BY updated_at DESC;

-- ============================================
-- AÇÕES RECOMENDADAS
-- ============================================

/*
1. Execute esta query completa para diagnosticar
2. Se available_balance não existir, será criada
3. Se o saldo estiver zerado, use o UPDATE manual acima
4. Verifique se as funções RPC existem
5. Se não existirem, execute scripts/008_critical_fixes.sql
*/
