-- ============================================
-- CORREÇÕES CRÍTICAS E MELHORIAS ESSENCIAIS
-- ============================================
-- Este script implementa apenas correções seguras e essenciais

-- ============================================
-- 1. RLS POLICIES PARA TABELAS DE CARTÕES
-- ============================================

-- Habilitar RLS (se ainda não estiver)
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;

-- Dropar policies antigas se existirem
DROP POLICY IF EXISTS "Users can view their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can insert their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can update their own credit cards" ON credit_cards;
DROP POLICY IF EXISTS "Users can delete their own credit cards" ON credit_cards;

DROP POLICY IF EXISTS "Users can view their own credit card purchases" ON credit_card_purchases;
DROP POLICY IF EXISTS "Users can insert their own credit card purchases" ON credit_card_purchases;
DROP POLICY IF EXISTS "Users can update their own credit card purchases" ON credit_card_purchases;
DROP POLICY IF EXISTS "Users can delete their own credit card purchases" ON credit_card_purchases;

DROP POLICY IF EXISTS "Users can view their own credit card invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can insert their own credit card invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can update their own credit card invoices" ON credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete their own credit card invoices" ON credit_card_invoices;

-- Criar policies para credit_cards
CREATE POLICY "Users can view their own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

-- Criar policies para credit_card_purchases
CREATE POLICY "Users can view their own credit card purchases"
  ON credit_card_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card purchases"
  ON credit_card_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card purchases"
  ON credit_card_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card purchases"
  ON credit_card_purchases FOR DELETE
  USING (auth.uid() = user_id);

-- Criar policies para credit_card_invoices
CREATE POLICY "Users can view their own credit card invoices"
  ON credit_card_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card invoices"
  ON credit_card_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card invoices"
  ON credit_card_invoices FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card invoices"
  ON credit_card_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. GARANTIR CAMPO AVAILABLE_BALANCE EXISTE
-- ============================================

-- Adicionar coluna se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_cards' AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Garantir valores não nulos
UPDATE credit_cards SET available_balance = 0 WHERE available_balance IS NULL;

-- ============================================
-- 3. ADICIONAR PAYMENT_METHOD SE NÃO EXISTIR
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_card_purchases' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE credit_card_purchases 
    ADD COLUMN payment_method VARCHAR(10) 
    CHECK (payment_method IN ('credit', 'debit'))
    DEFAULT 'credit';
  END IF;
END $$;

-- Garantir valores existentes
UPDATE credit_card_purchases 
SET payment_method = 'credit' 
WHERE payment_method IS NULL;

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date 
ON transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date 
ON transactions(user_id, type, date DESC);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user 
ON credit_cards(user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_purchases_card_invoice 
ON credit_card_purchases(credit_card_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_card_status 
ON credit_card_invoices(credit_card_id, status);

-- ============================================
-- FIM DO SCRIPT
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Correções aplicadas com sucesso!';
  RAISE NOTICE '1. ✅ RLS policies adicionadas';
  RAISE NOTICE '2. ✅ Campo available_balance verificado';
  RAISE NOTICE '3. ✅ Campo payment_method verificado';
  RAISE NOTICE '4. ✅ Índices de performance criados';
END $$;
