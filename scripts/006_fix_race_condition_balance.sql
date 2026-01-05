-- ============================================
-- FUNÇÕES ATÔMICAS PARA ATUALIZAÇÃO DE SALDO
-- ============================================
-- Este script resolve race conditions ao atualizar saldos de cartões de crédito
-- usando SELECT FOR UPDATE para garantir atomicidade

-- Função para atualizar saldo do cartão de forma atômica
CREATE OR REPLACE FUNCTION update_credit_card_balance(
  p_card_id UUID,
  p_user_id UUID,
  p_amount DECIMAL(12, 2),
  p_operation TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance DECIMAL(12, 2);
  v_new_balance DECIMAL(12, 2);
  v_card_exists BOOLEAN;
BEGIN
  -- Verificar se o cartão existe e pertence ao usuário (com lock para evitar race condition)
  SELECT balance, true INTO v_current_balance, v_card_exists
  FROM credit_cards
  WHERE id = p_card_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cartão de crédito não encontrado'
    );
  END IF;

  -- Calcular novo saldo baseado na operação
  IF p_operation = 'add' THEN
    v_new_balance := COALESCE(v_current_balance, 0) + p_amount;
  ELSIF p_operation = 'subtract' THEN
    v_new_balance := COALESCE(v_current_balance, 0) - p_amount;
  ELSIF p_operation = 'set' THEN
    v_new_balance := p_amount;
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Operação inválida. Use: add, subtract ou set'
    );
  END IF;

  -- Atualizar o saldo
  UPDATE credit_cards
  SET 
    balance = v_new_balance,
    updated_at = NOW()
  WHERE id = p_card_id AND user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'old_balance', v_current_balance,
    'new_balance', v_new_balance
  );
END;
$$;

-- Função para criar transação e atualizar saldo atomicamente
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
  -- Se houver cartão de crédito, atualizar saldo atomicamente
  IF p_credit_card_id IS NOT NULL THEN
    -- Lock na linha do cartão para evitar race condition
    SELECT balance INTO v_current_balance
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
      balance = v_new_balance,
      updated_at = NOW()
    WHERE id = p_credit_card_id AND user_id = p_user_id;
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

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'new_balance', v_new_balance
  );
END;
$$;

-- Função para atualizar transação e ajustar saldo atomicamente
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
    SELECT balance INTO v_old_balance
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
      SET balance = v_new_balance, updated_at = NOW()
      WHERE id = v_old_transaction.credit_card_id AND user_id = p_user_id;
    END IF;
  END IF;

  -- Aplicar novo saldo (se houver novo cartão)
  IF p_credit_card_id IS NOT NULL THEN
    SELECT balance INTO v_old_balance
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
    SET balance = v_new_balance, updated_at = NOW()
    WHERE id = p_credit_card_id AND user_id = p_user_id;
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

-- Função para deletar transação e ajustar saldo atomicamente
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
    SELECT balance INTO v_current_balance
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
      SET balance = v_new_balance, updated_at = NOW()
      WHERE id = v_transaction.credit_card_id AND user_id = p_user_id;
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

-- Adicionar coluna balance na tabela credit_cards se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_cards' AND column_name = 'balance'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN balance DECIMAL(12, 2) DEFAULT 0;
  END IF;
END $$;

-- Criar índice para melhorar performance das queries com lock
CREATE INDEX IF NOT EXISTS idx_transactions_card_user ON transactions(credit_card_id, user_id);
