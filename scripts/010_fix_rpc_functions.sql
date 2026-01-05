-- VERIFICAR SE FUNÇÕES RPC EXISTEM

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_transaction_with_balance',
    'update_transaction_with_balance',
    'delete_transaction_with_balance'
  )
ORDER BY routine_name;

-- SE NÃO RETORNAR NADA, execute o script abaixo:

-- ============================================
-- CRIAR FUNÇÕES RPC (SE NÃO EXISTIREM)
-- ============================================

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
  -- Se houver cartão, atualizar saldo
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

  -- Criar transação
  INSERT INTO transactions (user_id, title, amount, type, category_id, credit_card_id, date, description)
  VALUES (p_user_id, p_title, p_amount, p_type, p_category_id, p_credit_card_id, p_date, p_description)
  RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true, 
    'transaction_id', v_transaction_id, 
    'new_balance', v_new_balance
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

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
  SELECT * INTO v_old_transaction FROM transactions
  WHERE id = p_transaction_id AND user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Transação não encontrada');
  END IF;

  -- Reverter saldo do cartão antigo
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

  -- Aplicar novo saldo
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

  -- Atualizar transação
  UPDATE transactions
  SET title = p_title, amount = p_amount, type = p_type, category_id = p_category_id,
      credit_card_id = p_credit_card_id, date = p_date, description = p_description
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN json_build_object('success', true, 'transaction_id', p_transaction_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

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

  RETURN json_build_object('success', true, 'transaction_id', p_transaction_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Verificar novamente se foram criadas:
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%transaction_with_balance%';
