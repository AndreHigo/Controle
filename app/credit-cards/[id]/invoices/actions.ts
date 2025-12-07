"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function closeInvoice(invoiceId: string, cardId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Buscar fatura
  const { data: invoice } = await supabase.from("credit_card_invoices").select("*").eq("id", invoiceId).single()

  if (!invoice) {
    throw new Error("Fatura não encontrada")
  }

  // Buscar cartão
  const { data: card } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single()

  if (!card) {
    throw new Error("Cartão não encontrado")
  }

  // Buscar compras da fatura para calcular total
  const { data: purchases } = await supabase.from("credit_card_purchases").select("amount").eq("invoice_id", invoiceId)

  const totalInvoice = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0

  // Calcular quanto será pago com o saldo e quanto sobrará como despesa
  const availableBalance = card.available_balance || 0
  const amountFromBalance = Math.min(totalInvoice, availableBalance)
  const amountToPay = totalInvoice - amountFromBalance

  // Atualizar saldo do cartão
  const newBalance = availableBalance - amountFromBalance
  await supabase.from("credit_cards").update({ available_balance: newBalance }).eq("id", cardId)

  // Atualizar fatura
  await supabase
    .from("credit_card_invoices")
    .update({
      status: amountToPay > 0 ? "closed" : "paid",
      paid_amount: amountFromBalance,
    })
    .eq("id", invoiceId)

  // Se ainda houver valor a pagar, criar despesa
  if (amountToPay > 0) {
    // Buscar categoria "Cartão de Crédito"
    let { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Cartão de Crédito")
      .single()

    // Se não existir, criar categoria
    if (!category) {
      const { data: newCategory } = await supabase
        .from("categories")
        .insert({
          user_id: user.id,
          name: "Cartão de Crédito",
          type: "expense",
          color: "#ef4444",
        })
        .select()
        .single()

      category = newCategory
    }

    // Criar transação de despesa
    await supabase.from("transactions").insert({
      user_id: user.id,
      type: "expense",
      amount: amountToPay,
      description: `Fatura ${card.name} - ${new Date(invoice.closing_date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
      date: invoice.due_date,
      category_id: category?.id || null,
      credit_card_id: cardId,
    })
  }

  revalidatePath(`/credit-cards/${cardId}/invoices`)
  revalidatePath(`/credit-cards/${cardId}/status`)
  revalidatePath("/transactions")
}
