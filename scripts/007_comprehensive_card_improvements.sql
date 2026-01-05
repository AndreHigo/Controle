-- ============================================
-- MELHORIAS ABRANGENTES NO SISTEMA DE CARTÕES
-- ============================================
-- Este script implementa:
-- 1. Unificação de campos de saldo
-- 2. Validação de limite de crédito
-- 3. Fechamento atômico de faturas
-- 4. Histórico de saldo
-- 5. Distinção débito/crédito em compras

-- ============================================
-- 1. UNIFICAR CAMPOS DE SALDO
-- ============================================

-- Migrar dados de 'balance' para 'available_balance' (se necessário)
UPDATE credit_cards 
SET available_balance = COALESCE(available_balance, 0) + COALESCE(balance, 0)
WHERE balance IS NOT NULL AND balance != 0;

-- Remover coluna 'balance' duplicada
ALTER TABLE credit_cards DROP COLUMN IF EXISTS balance;

-- Garantir que available_balance não seja NULL
UPDATE credit_cards SET available_balance = 0 WHERE available_balance IS NULL;
ALTER TABLE credit_cards ALTER COLUMN available_balance SET DEFAULT 0;
ALTER TABLE credit_cards ALTER COLUMN available_balance SET NOT NULL;

-- ============================================
-- 2. HISTÓRICO DE SALDO
-- ============================================

-- Criar tabela de histórico de saldo
CREATE TABLE IF NOT EXISTS credit_card_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  previous_balance DECIMAL(12, 2) NOT NULL,
  new_balance DECIMAL(12, 2) NOT NULL,
  amount_changed DECIMAL(12, 2) NOT NULL,
  operation VARCHAR(30) NOT NULL CHECK (operation IN (
    'transaction_income',
    'transaction_expense', 
    'invoice_payment',
    'manual_adjustment',
    'initial_balance'
  )),
  reference_type VARCHAR(20) CHECK (reference_type IN ('transaction', 'invoice', 'manual')),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_balance_history_card ON credit_card_balance_history(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_user ON credit_card_balance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_history_date ON credit_card_balance_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_history_reference ON credit_card_balance_history(reference_type, reference_id);

-- RLS para histórico
ALTER TABLE credit_card_balance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own balance history"
  ON credit_card_balance_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert balance history"
  ON credit_card_balance_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para registrar mudança de saldo
CREATE OR REPLACE FUNCTION log_balance_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Só registra se o saldo mudou
  IF OLD.available_balance IS DISTINCT FROM NEW.available_balance THEN
    INSERT INTO credit_card_balance_history (
      credit_card_id,
      user_id,
      previous_balance,
      new_balance,
      amount_changed,
      operation,
      description
    ) VALUES (
      NEW.id,
      NEW.user_id,
      COALESCE(OLD.available_balance, 0),
      NEW.available_balance,
      NEW.available_balance - COALESCE(OLD.available_balance, 0),
      'manual_adjustment',
      'Saldo atualizado'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para registrar mudanças automáticas
CREATE TRIGGER track_balance_changes
AFTER UPDATE ON credit_cards
FOR EACH ROW
EXECUTE FUNCTION log_balance_change();

-- ============================================
-- 3. ADICIONAR PAYMENT_METHOD EM PURCHASES
-- ============================================

-- Adicionar coluna para distinguir débito/crédito
ALTER TABLE credit_card_purchases 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) 
CHECK (payment_method IN ('credit', 'debit'))
DEFAULT 'credit';

-- Atualizar compras existentes (todas serão crédito por padrão)
UPDATE credit_card_purchases 
SET payment_method = 'credit' 
WHERE payment_method IS NULL;

-- Tornar obrigatório
ALTER TABLE credit_card_purchases 
ALTER COLUMN payment_method SET NOT NULL;

-- ============================================
-- 4. ADICIONAR CAMPOS DE CONTROLE EM INVOICES
-- ============================================

-- Adicionar campo para valor pago com saldo
ALTER TABLE credit_card_invoices 
ADD COLUMN IF NOT EXISTS paid_from_balance DECIMAL(12, 2) DEFAULT 0;

-- Adicionar campo para valor pago externamente
ALTER TABLE credit_card_invoices 
ADD COLUMN IF NOT EXISTS paid_from_external DECIMAL(12, 2) DEFAULT 0;

-- ============================================
-- 5. ATUALIZAR FUNÇÃO DE CRIAR TRANSAÇÃO
-- ============================================

-- Atualizar função para registrar no histórico
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
  v_card_user_id UUID;
BEGIN
  -- Se houver cartão de crédito, atualizar saldo atomicamente
  IF p_credit_card_id IS NOT NULL THEN
    -- Lock na linha do cartão e verificar ownership
    SELECT available_balance, user_id INTO v_current_balance, v_card_user_id
    FROM credit_cards
    WHERE id = p_credit_card_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Cartão de crédito não encontrado'
      );
    END IF;

    -- Calcular novo saldo
    IF p_type = 'income' THEN
      v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
    ELSE
      v_new_balance := COALESCE(v_current_balance, 0) - p_amount;
    END IF;

    -- Atualizar saldo
    UPDATE credit_cards
    SET 
      available_balance = v_new_balance,
      updated_at = NOW()
    WHERE id = p_credit_card_id AND user_id = p_user_id;
    
    -- Registrar no histórico
    INSERT INTO credit_card_balance_history (
      credit_card_id,
      user_id,
      previous_balance,
      new_balance,
      amount_changed,
      operation,
      description
    ) VALUES (
      p_credit_card_id,
      p_user_id,
      v_current_balance,
      v_new_balance,
      CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END,
      CASE WHEN p_type = 'income' THEN 'transaction_income' ELSE 'transaction_expense' END,
      p_title
    );
  END IF;

  -- Criar a transação
  INSERT INTO transactions (
    user_id,
    title,
    amount,
    type,
    category_id,
    credit_card_id,
    date,
    description
  ) VALUES (
    p_user_id,
    p_title,
    p_amount,
    p_type,
    p_category_id,
    p_credit_card_id,
    p_date,
    p_description
  )
  RETURNING id INTO v_transaction_id;
  
  -- Atualizar referência no histórico
  UPDATE credit_card_balance_history
  SET reference_type = 'transaction', reference_id = v_transaction_id
  WHERE credit_card_id = p_credit_card_id 
    AND reference_id IS NULL
    AND created_at = (
      SELECT MAX(created_at) FROM credit_card_balance_history 
      WHERE credit_card_id = p_credit_card_id
    );

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- ============================================
-- 6. ATUALIZAR FUNÇÃO DE UPDATE TRANSAÇÃO
-- ============================================

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
  -- Buscar transação antiga
  SELECT * INTO v_old_transaction
  FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transação não encontrada'
    );
  END IF;

  -- Reverter saldo do cartão antigo (se houver)
  IF v_old_transaction.credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_old_balance
    FROM credit_cards
    WHERE id = v_old_transaction.credit_card_id AND user_id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_old_transaction.type = 'income' THEN
        v_new_balance := COALESCE(v_old_balance, 0) - v_old_transaction.amount;
      ELSE
        v_new_balance := COALESCE(v_old_balance, 0) + v_old_transaction.amount;
      END IF;

      UPDATE credit_cards
      SET available_balance = v_new_balance, updated_at = NOW()
      WHERE id = v_old_transaction.credit_card_id AND user_id = p_user_id;
      
      -- Registrar reversão no histórico
      INSERT INTO credit_card_balance_history (
        credit_card_id,
        user_id,
        previous_balance,
        new_balance,
        amount_changed,
        operation,
        reference_type,
        reference_id,
        description
      ) VALUES (
        v_old_transaction.credit_card_id,
        p_user_id,
        v_old_balance,
        v_new_balance,
        CASE WHEN v_old_transaction.type = 'income' THEN -v_old_transaction.amount ELSE v_old_transaction.amount END,
        'manual_adjustment',
        'transaction',
        p_transaction_id,
        'Reversão para atualização: ' || v_old_transaction.title
      );
    END IF;
  END IF;

  -- Aplicar novo saldo (se houver novo cartão)
  IF p_credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_old_balance
    FROM credit_cards
    WHERE id = p_credit_card_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Cartão de crédito não encontrado'
      );
    END IF;

    IF p_type = 'income' THEN
      v_new_balance := COALESCE(v_old_balance, 0) + p_amount;
    ELSE
      v_new_balance := COALESCE(v_old_balance, 0) - p_amount;
    END IF;

    UPDATE credit_cards
    SET available_balance = v_new_balance, updated_at = NOW()
    WHERE id = p_credit_card_id AND user_id = p_user_id;
    
    -- Registrar no histórico
    INSERT INTO credit_card_balance_history (
      credit_card_id,
      user_id,
      previous_balance,
      new_balance,
      amount_changed,
      operation,
      reference_type,
      reference_id,
      description
    ) VALUES (
      p_credit_card_id,
      p_user_id,
      v_old_balance,
      v_new_balance,
      CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END,
      CASE WHEN p_type = 'income' THEN 'transaction_income' ELSE 'transaction_expense' END,
      'transaction',
      p_transaction_id,
      p_title
    );
  END IF;

  -- Atualizar a transação
  UPDATE transactions
  SET
    title = p_title,
    amount = p_amount,
    type = p_type,
    category_id = p_category_id,
    credit_card_id = p_credit_card_id,
    date = p_date,
    description = p_description,
    updated_at = NOW()
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- ============================================
-- 7. ATUALIZAR FUNÇÃO DE DELETE TRANSAÇÃO
-- ============================================

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
  -- Buscar transação
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transação não encontrada'
    );
  END IF;

  -- Reverter saldo do cartão (se houver)
  IF v_transaction.credit_card_id IS NOT NULL THEN
    SELECT available_balance INTO v_current_balance
    FROM credit_cards
    WHERE id = v_transaction.credit_card_id AND user_id = p_user_id
    FOR UPDATE;

    IF FOUND THEN
      IF v_transaction.type = 'income' THEN
        v_new_balance := COALESCE(v_current_balance, 0) - v_transaction.amount;
      ELSE
        v_new_balance := COALESCE(v_current_balance, 0) + v_transaction.amount;
      END IF;

      UPDATE credit_cards
      SET available_balance = v_new_balance, updated_at = NOW()
      WHERE id = v_transaction.credit_card_id AND user_id = p_user_id;
      
      -- Registrar no histórico
      INSERT INTO credit_card_balance_history (
        credit_card_id,
        user_id,
        previous_balance,
        new_balance,
        amount_changed,
        operation,
        reference_type,
        reference_id,
        description
      ) VALUES (
        v_transaction.credit_card_id,
        p_user_id,
        v_current_balance,
        v_new_balance,
        CASE WHEN v_transaction.type = 'income' THEN -v_transaction.amount ELSE v_transaction.amount END,
        'manual_adjustment',
        'transaction',
        p_transaction_id,
        'Exclusão de transação: ' || v_transaction.title
      );
    END IF;
  END IF;

  -- Deletar a transação
  DELETE FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- ============================================
-- 8. FUNÇÃO PARA VALIDAR LIMITE DE CRÉDITO
-- ============================================

CREATE OR REPLACE FUNCTION validate_credit_limit(
  p_card_id UUID,
  p_new_purchase_amount DECIMAL(12, 2)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card RECORD;
  v_current_debt DECIMAL(12, 2);
  v_available_credit DECIMAL(12, 2);
BEGIN
  -- Buscar cartão
  SELECT * INTO v_card
  FROM credit_cards
  WHERE id = p_card_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Cartão não encontrado'
    );
  END IF;
  
  -- Calcular dívida atual (soma de faturas abertas)
  SELECT COALESCE(SUM(p.amount), 0) INTO v_current_debt
  FROM credit_card_purchases p
  INNER JOIN credit_card_invoices i ON p.invoice_id = i.id
  WHERE p.credit_card_id = p_card_id 
    AND i.status = 'open'
    AND p.payment_method = 'credit';
  
  -- Calcular crédito disponível
  v_available_credit := v_card.credit_limit - v_current_debt;
  
  -- Validar se nova compra cabe no limite
  IF p_new_purchase_amount > v_available_credit THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Limite de crédito insuficiente',
      'available_credit', v_available_credit,
      'requested_amount', p_new_purchase_amount,
      'credit_limit', v_card.credit_limit,
      'current_debt', v_current_debt
    );
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'available_credit', v_available_credit,
    'credit_limit', v_card.credit_limit,
    'current_debt', v_current_debt
  );
END;
$$;

-- ============================================
-- 9. FUNÇÃO ATÔMICA PARA FECHAR FATURA
-- ============================================

CREATE OR REPLACE FUNCTION close_invoice_with_balance(
  p_invoice_id UUID,
  p_card_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invoice RECORD;
  v_card RECORD;
  v_total_invoice DECIMAL(12, 2);
  v_available_balance DECIMAL(12, 2);
  v_amount_from_balance DECIMAL(12, 2);
  v_amount_to_pay DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
  v_category_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Lock na fatura
  SELECT * INTO v_invoice
  FROM credit_card_invoices
  WHERE id = p_invoice_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fatura não encontrada'
    );
  END IF;
  
  IF v_invoice.status != 'open' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Fatura já foi fechada'
    );
  END IF;
  
  -- Lock no cartão
  SELECT * INTO v_card
  FROM credit_cards
  WHERE id = p_card_id AND user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cartão não encontrado'
    );
  END IF;
  
  -- Calcular total da fatura
  SELECT COALESCE(SUM(amount), 0) INTO v_total_invoice
  FROM credit_card_purchases
  WHERE invoice_id = p_invoice_id AND payment_method = 'credit';
  
  -- Calcular quanto pode ser pago com saldo
  v_available_balance := COALESCE(v_card.available_balance, 0);
  v_amount_from_balance := LEAST(v_total_invoice, v_available_balance);
  v_amount_to_pay := v_total_invoice - v_amount_from_balance;
  v_new_balance := v_available_balance - v_amount_from_balance;
  
  -- Atualizar saldo do cartão
  IF v_amount_from_balance > 0 THEN
    UPDATE credit_cards
    SET available_balance = v_new_balance, updated_at = NOW()
    WHERE id = p_card_id AND user_id = p_user_id;
    
    -- Registrar no histórico
    INSERT INTO credit_card_balance_history (
      credit_card_id,
      user_id,
      previous_balance,
      new_balance,
      amount_changed,
      operation,
      reference_type,
      reference_id,
      description
    ) VALUES (
      p_card_id,
      p_user_id,
      v_available_balance,
      v_new_balance,
      -v_amount_from_balance,
      'invoice_payment',
      'invoice',
      p_invoice_id,
      'Pagamento de fatura ' || v_card.name
    );
  END IF;
  
  -- Se houver valor restante, criar transação de despesa
  IF v_amount_to_pay > 0 THEN
    -- Buscar ou criar categoria "Cartão de Crédito"
    SELECT id INTO v_category_id
    FROM categories
    WHERE user_id = p_user_id AND name = 'Cartão de Crédito'
    LIMIT 1;
    
    IF v_category_id IS NULL THEN
      INSERT INTO categories (user_id, name, type, color)
      VALUES (p_user_id, 'Cartão de Crédito', 'expense', '#ef4444')
      RETURNING id INTO v_category_id;
    END IF;
    
    -- Criar transação de despesa
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      title,
      description,
      date,
      category_id,
      credit_card_id
    ) VALUES (
      p_user_id,
      'expense',
      v_amount_to_pay,
      'Fatura ' || v_card.name,
      'Fatura de ' || TO_CHAR(v_invoice.closing_date::DATE, 'TMMonth/YYYY'),
      v_invoice.due_date,
      v_category_id,
      p_card_id
    )
    RETURNING id INTO v_transaction_id;
  END IF;
  
  -- Atualizar fatura
  UPDATE credit_card_invoices
  SET
    status = CASE WHEN v_amount_to_pay > 0 THEN 'closed' ELSE 'paid' END,
    total_amount = v_total_invoice,
    paid_from_balance = v_amount_from_balance,
    paid_from_external = v_amount_to_pay,
    transaction_id = v_transaction_id,
    updated_at = NOW()
  WHERE id = p_invoice_id;
  
  RETURN json_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'total_invoice', v_total_invoice,
    'paid_from_balance', v_amount_from_balance,
    'paid_from_external', v_amount_to_pay,
    'new_card_balance', v_new_balance,
    'transaction_id', v_transaction_id,
    'status', CASE WHEN v_amount_to_pay > 0 THEN 'closed' ELSE 'paid' END
  );
END;
$$;

-- ============================================
-- 10. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_purchases_invoice_payment ON credit_card_purchases(invoice_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_card_status ON credit_card_invoices(credit_card_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_card ON transactions(credit_card_id) WHERE credit_card_id IS NOT NULL;

-- ============================================
-- 11. VIEW PARA FACILITAR CONSULTAS
-- ============================================

-- View para ver resumo de cartões com saldo e dívida atual
CREATE OR REPLACE VIEW credit_cards_summary AS
SELECT 
  cc.id,
  cc.user_id,
  cc.name,
  cc.last_digits,
  cc.credit_limit,
  cc.available_balance,
  cc.closing_day,
  cc.due_day,
  cc.color,
  cc.is_active,
  COALESCE(SUM(CASE WHEN i.status = 'open' AND p.payment_method = 'credit' THEN p.amount ELSE 0 END), 0) AS current_debt,
  cc.credit_limit - COALESCE(SUM(CASE WHEN i.status = 'open' AND p.payment_method = 'credit' THEN p.amount ELSE 0 END), 0) AS available_credit,
  cc.created_at,
  cc.updated_at
FROM credit_cards cc
LEFT JOIN credit_card_invoices i ON i.credit_card_id = cc.id
LEFT JOIN credit_card_purchases p ON p.invoice_id = i.id
GROUP BY cc.id;

-- Grant acesso à view
ALTER VIEW credit_cards_summary OWNER TO postgres;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Melhorias aplicadas com sucesso!';
  RAISE NOTICE '1. ✅ Campos de saldo unificados';
  RAISE NOTICE '2. ✅ Histórico de saldo criado';
  RAISE NOTICE '3. ✅ Payment method adicionado';
  RAISE NOTICE '4. ✅ Validação de limite implementada';
  RAISE NOTICE '5. ✅ Fechamento atômico de fatura';
  RAISE NOTICE '6. ✅ Funções de transação atualizadas';
  RAISE NOTICE '7. ✅ Índices e view criados';
END $$;
