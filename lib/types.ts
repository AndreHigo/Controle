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

export interface CreditCard {
  id: string
  user_id: string
  name: string
  last_digits: string | null
  credit_limit: number
  closing_day: number
  due_day: number
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
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
  created_at: string
  updated_at: string
  credit_card?: CreditCard
  purchases?: CreditCardPurchase[]
}
