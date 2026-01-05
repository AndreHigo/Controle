import { z } from "zod"

export const transactionSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(255, "Título muito longo"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "Tipo deve ser receita ou despesa" }),
  }),
  category_id: z.string().uuid("Categoria inválida").nullable(),
  credit_card_id: z.string().uuid("Cartão inválido").nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato: YYYY-MM-DD)"),
  description: z.string().max(1000, "Descrição muito longa").nullable(),
})

export const creditCardSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  lastDigits: z
    .string()
    .regex(/^\d{4}$/, "Últimos dígitos devem ter 4 números")
    .nullable()
    .or(z.literal("")),
  creditLimit: z.number().positive("Limite deve ser maior que zero"),
  closingDay: z.number().int().min(1, "Dia deve ser entre 1 e 31").max(31, "Dia deve ser entre 1 e 31"),
  dueDay: z.number().int().min(1, "Dia deve ser entre 1 e 31").max(31, "Dia deve ser entre 1 e 31"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (formato: #RRGGBB)"),
})

export const purchaseSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(255, "Descrição muito longa"),
  amount: z.number().positive("Valor deve ser maior que zero"),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (formato: YYYY-MM-DD)"),
  category_id: z.string().uuid("Categoria inválida").nullable(),
  installments: z.number().int().min(1, "Parcelas deve ser no mínimo 1").max(48, "Máximo 48 parcelas"),
  notes: z.string().max(1000, "Notas muito longas").nullable(),
  payment_method: z.enum(["credit", "debit"], {
    errorMap: () => ({ message: "Método de pagamento deve ser crédito ou débito" }),
  }),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  type: z.enum(["income", "expense"], {
    errorMap: () => ({ message: "Tipo deve ser receita ou despesa" }),
  }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida (formato: #RRGGBB)").nullable(),
  icon: z.string().max(50, "Ícone muito longo").nullable(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type CreditCardInput = z.infer<typeof creditCardSchema>
export type PurchaseInput = z.infer<typeof purchaseSchema>
export type CategoryInput = z.infer<typeof categorySchema>
