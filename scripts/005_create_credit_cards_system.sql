-- Sistema completo de cartões de crédito
-- Este script cria todas as tabelas, RLS policies e índices necessários

-- ============================================
-- TABELAS
-- ============================================

-- Tabela de cartões de crédito
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  last_digits VARCHAR(4),
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL CHECK (closing_day >= 1 AND closing_day <= 31),
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  color VARCHAR(7) DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de faturas (criar antes de purchases para evitar referência circular)
CREATE TABLE IF NOT EXISTS credit_card_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  reference_month INTEGER NOT NULL CHECK (reference_month >= 1 AND reference_month <= 12),
  reference_year INTEGER NOT NULL CHECK (reference_year >= 2000),
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
  closing_date DATE,
  due_date DATE NOT NULL,
  payment_date DATE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(credit_card_id, reference_month, reference_year)
);

-- Tabela de compras no cartão
CREATE TABLE IF NOT EXISTS credit_card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  purchase_date DATE NOT NULL,
  installments INTEGER DEFAULT 1 CHECK (installments >= 1),
  current_installment INTEGER DEFAULT 1 CHECK (current_installment >= 1),
  description TEXT,
  invoice_id UUID REFERENCES credit_card_invoices(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_purchases_user_id ON credit_card_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_purchases_card_id ON credit_card_purchases(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_purchases_invoice_id ON credit_card_purchases(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_user_id ON credit_card_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_card_id ON credit_card_invoices(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_invoices_status ON credit_card_invoices(status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Corrigido para usar handle_updated_at() que é a função existente no banco
CREATE TRIGGER update_credit_cards_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_credit_card_purchases_updated_at
  BEFORE UPDATE ON credit_card_purchases
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_credit_card_invoices_updated_at
  BEFORE UPDATE ON credit_card_invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS nas tabelas
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_card_invoices ENABLE ROW LEVEL SECURITY;

-- Policies para credit_cards
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

-- Policies para credit_card_purchases
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

-- Policies para credit_card_invoices
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
