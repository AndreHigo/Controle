-- ============================================
-- SETUP INICIAL COMPLETO - EXECUTE UMA ÚNICA VEZ
-- ============================================
-- Este script configura TUDO que você precisa
-- Depois de executar, nunca mais precisa rodar

-- ============================================
-- 1. GARANTIR COLUNA AVAILABLE_BALANCE
-- ============================================

DO $$
BEGIN
  -- Adicionar coluna se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_cards' AND column_name = 'available_balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN available_balance DECIMAL(12, 2) DEFAULT 0;
    RAISE NOTICE '✅ Coluna available_balance criada';
  END IF;
  
  -- Garantir valores não nulos
  UPDATE credit_cards SET available_balance = 0 WHERE available_balance IS NULL;
END $$;

-- ============================================
-- 2. GARANTIR COLUNA USER_ID EM INVOICES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_card_invoices' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE credit_card_invoices ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Preencher user_id existentes
    UPDATE credit_card_invoices
    SET user_id = (
      SELECT user_id FROM credit_cards
      WHERE credit_cards.id = credit_card_invoices.credit_card_id
    )
    WHERE user_id IS NULL;
    
    ALTER TABLE credit_card_invoices ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE '✅ Coluna user_id em invoices criada e preenchida';
  END IF;
END $$;

-- ============================================
-- 3. GARANTIR COLUNA USER_ID EM PURCHASES
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_card_purchases' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE credit_card_purchases ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Preencher user_id existentes
    UPDATE credit_card_purchases
    SET user_id = (
      SELECT user_id FROM credit_cards
      WHERE credit_cards.id = credit_card_purchases.credit_card_id
    )
    WHERE user_id IS NULL;
    
    ALTER TABLE credit_card_purchases ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE '✅ Coluna user_id em purchases criada e preenchida';
  END IF;
END $$;

-- ============================================
-- 4. GARANTIR PAYMENT_METHOD EM PURCHASES
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
    
    UPDATE credit_card_purchases 
    SET payment_method = 'credit' 
    WHERE payment_method IS NULL;
    
    ALTER TABLE credit_card_purchases ALTER COLUMN payment_method SET NOT NULL;
    RAISE NOTICE '✅ Coluna payment_method criada';
  END IF;
END $$;

-- ============================================
-- 5. RLS POLICIES (SEGURANÇA)
-- ============================================

-- Habilitar RLS
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

-- Criar policies
CREATE POLICY "Users can view their own credit cards"
  ON credit_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards"
  ON credit_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards"
  ON credit_cards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards"
  ON credit_cards FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit card purchases"
  ON credit_card_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card purchases"
  ON credit_card_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card purchases"
  ON credit_card_purchases FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card purchases"
  ON credit_card_purchases FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit card invoices"
  ON credit_card_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit card invoices"
  ON credit_card_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card invoices"
  ON credit_card_invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card invoices"
  ON credit_card_invoices FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 6. ÍNDICES PARA PERFORMANCE
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_purchases_user 
ON credit_card_purchases(user_id);

CREATE INDEX IF NOT EXISTS idx_invoices_user 
ON credit_card_invoices(user_id);

-- ============================================
-- 7. FUNÇÕES RPC PARA TRANSAÇÕES
-- ============================================

-- Função para criar transação COM saldo (se ainda não existir)
CREATE OR REPLACE FUNCTION create_transaction_with_balance(
  p_user_id UUID,
  p_title TEXT,
  p_amount DECIMAL(12, 2),
  p_type TEXT,
  p_category_id UUID,
  p_credit_card_id UUID,
  p_date DATE,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
BEGIN
  IF p_credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_current_balance
    FROM credit_cards
    WHERE id = p_credit_card_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Cartão não encontrado');
    END IF;

    IF p_type = 'income' THEN
      v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
    ELSE
      v_new_balance := COALESCE(v_current_balance, 0) - p_amount;
    END IF;

    UPDATE credit_cards
    SET available_balance = v_new_balance, updated_at = NOW()
    WHERE id = p_credit_card_id AND user_id = p_user_id;
  END IF;

  INSERT INTO transactions (user_id, title, amount, type, category_id, credit_card_id, date, description)
  VALUES (p_user_id, p_title, p_amount, p_type, p_category_id, p_credit_card_id, p_date, p_description)
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object('success', true, 'transaction_id', v_transaction_id, 'new_balance', v_new_balance);
END;
$$;

-- Função para atualizar transação
CREATE OR REPLACE FUNCTION update_transaction_with_balance(
  p_transaction_id UUID,
  p_user_id UUID,
  p_title TEXT,
  p_amount DECIMAL(12, 2),
  p_type TEXT,
  p_category_id UUID,
  p_credit_card_id UUID,
  p_date DATE,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_transaction RECORD;
  v_old_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
BEGIN
  SELECT * INTO v_old_transaction FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transação não encontrada');
  END IF;

  IF v_old_transaction.credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_old_balance FROM credit_cards
    WHERE id = v_old_transaction.credit_card_id AND user_id = p_user_id FOR UPDATE;

    IF FOUND THEN
      IF v_old_transaction.type = 'income' THEN
        v_new_balance := COALESCE(v_old_balance, 0) - v_old_transaction.amount;
      ELSE
        v_new_balance := COALESCE(v_old_balance, 0) + v_old_transaction.amount;
      END IF;
      UPDATE credit_cards SET available_balance = v_new_balance WHERE id = v_old_transaction.credit_card_id;
    END IF;
  END IF;

  IF p_credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_old_balance FROM credit_cards
    WHERE id = p_credit_card_id AND user_id = p_user_id FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Cartão não encontrado');
    END IF;

    IF p_type = 'income' THEN
      v_new_balance := COALESCE(v_old_balance, 0) + p_amount;
    ELSE
      v_new_balance := COALESCE(v_old_balance, 0) - p_amount;
    END IF;
    UPDATE credit_cards SET available_balance = v_new_balance WHERE id = p_credit_card_id;
  END IF;

  UPDATE transactions
  SET title = p_title, amount = p_amount, type = p_type, category_id = p_category_id,
      credit_card_id = p_credit_card_id, date = p_date, description = p_description
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN json_build_object('success', true, 'transaction_id', p_transaction_id, 'new_balance', v_new_balance);
END;
$$;

-- Função para deletar transação
CREATE OR REPLACE FUNCTION delete_transaction_with_balance(
  p_transaction_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
BEGIN
  SELECT * INTO v_transaction FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transação não encontrada');
  END IF;

  IF v_transaction.credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_current_balance FROM credit_cards
    WHERE id = v_transaction.credit_card_id AND user_id = p_user_id FOR UPDATE;

    IF FOUND THEN
      IF v_transaction.type = 'income' THEN
        v_new_balance := COALESCE(v_current_balance, 0) - v_transaction.amount;
      ELSE
        v_new_balance := COALESCE(v_current_balance, 0) + v_transaction.amount;
      END IF;
      UPDATE credit_cards SET available_balance = v_new_balance WHERE id = v_transaction.credit_card_id;
    END IF;
  END IF;

  DELETE FROM transactions WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN json_build_object('success', true, 'transaction_id', p_transaction_id, 'new_balance', v_new_balance);
END;
$$;

-- ============================================
-- FIM DO SETUP
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ SETUP COMPLETO!';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Colunas criadas e corrigidas';
  RAISE NOTICE '✅ RLS policies configuradas';
  RAISE NOTICE '✅ Índices criados';
  RAISE NOTICE '✅ Funções RPC instaladas';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Você pode usar o sistema normalmente agora!';
  RAISE NOTICE '📝 Não precisa executar este script novamente.';
  RAISE NOTICE '==============================================';
END $$;
