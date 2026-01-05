export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  credit_card_id: string | null
  title: string
  amount: number
  type: "income" | "expense"
  date: string
  description: string | null
  created_at: string
  updated_at: string
  category?: Category
  credit_card?: CreditCard
}

export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  type: "income" | "expense"
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface DashboardStats {
  totalIncome: number
  totalExpenses: number
  balance: number
  transactionCount: number
}

export interface BankAccount {
  id: string
  user_id: string
  name: string
  current_balance: number // Novo campo para rastrear saldo
  is_active: boolean
  // ... outros campos de conta se necessário
}

export interface CreditCard {
  id: string
  user_id: string
  name: string
  last_digits: string | null
  credit_limit: number
  available_balance: number
  closing_day: number
  due_day: number
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  current_debt?: number
  available_credit?: number
}

export interface CreditCardPurchase {
  id: string
  user_id: string
  credit_card_id: string
  category_id: string | null
  title: string
  amount: number
  purchase_date: string
  installments: number
  current_installment: number
  description: string | null
  invoice_id: string | null
  payment_method: "credit" | "debit"
  created_at: string
  updated_at: string
  category?: Category
  credit_card?: CreditCard
}

export interface CreditCardInvoice {
  id: string
  user_id: string
  credit_card_id: string
  reference_month: number
  reference_year: number
  total_amount: number
  status: "open" | "closed" | "paid"
  closing_date: string | null
  due_date: string
  payment_date: string | null
  transaction_id: string | null
  paid_from_balance?: number
  paid_from_external?: number
  created_at: string
  updated_at: string
  credit_card?: CreditCard
  purchases?: CreditCardPurchase[]
}

export interface CreditCardBalanceHistory {
  id: string
  credit_card_id: string
  user_id: string
  previous_balance: number
  new_balance: number
  amount_changed: number
  operation: "transaction_income" | "transaction_expense" | "invoice_payment" | "manual_adjustment" | "initial_balance"
  reference_type: "transaction" | "invoice" | "manual" | null
  reference_id: string | null
  description: string | null
  created_at: string
}
