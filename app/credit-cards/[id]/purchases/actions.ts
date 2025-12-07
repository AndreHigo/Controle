"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Função para calcular a data de fechamento da fatura com base na data da compra
function calculateInvoiceDate(purchaseDate: Date, closingDay: number, dueDay: number) {
  const purchase = new Date(purchaseDate)
  const year = purchase.getFullYear()
  const month = purchase.getMonth()
  const day = purchase.getDate()

  // Se a compra foi feita antes do dia de fechamento, vai para a fatura deste mês
  // Se foi depois, vai para a fatura do mês seguinte
  let closingDate: Date
  let dueDate: Date

  if (day <= closingDay) {
    // Fatura fecha neste mês
    closingDate = new Date(year, month, closingDay)
    dueDate = new Date(year, month, dueDay)
  } else {
    // Fatura fecha no próximo mês
    closingDate = new Date(year, month + 1, closingDay)
    dueDate = new Date(year, month + 1, dueDay)
  }

  // Se o dia de vencimento for menor que o dia de fechamento, o vencimento é no mês seguinte
  if (dueDay < closingDay) {
    dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, dueDay)
  }

  return { closingDate, dueDate }
}

// Função para buscar ou criar a fatura
async function getOrCreateInvoice(supabase: any, cardId: string, closingDate: Date, dueDate: Date) {
  // Buscar fatura existente
  const { data: existingInvoice } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("credit_card_id", cardId)
    .eq("closing_date", closingDate.toISOString().split("T")[0])
    .eq("status", "open")
    .single()

  if (existingInvoice) {
    return existingInvoice.id
  }

  // Criar nova fatura
  const { data: newInvoice, error } = await supabase
    .from("credit_card_invoices")
    .insert({
      credit_card_id: cardId,
      closing_date: closingDate.toISOString().split("T")[0],
      due_date: dueDate.toISOString().split("T")[0],
      status: "open",
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return newInvoice.id
}

export async function createPurchase(cardId: string, formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Buscar informações do cartão
  const { data: card } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single()

  if (!card) {
    throw new Error("Cartão não encontrado")
  }

  const description = formData.get("description") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const purchaseDate = new Date(formData.get("purchase_date") as string)
  const categoryId = formData.get("category_id") as string | null
  const installments = Number.parseInt(formData.get("installments") as string)
  const notes = formData.get("notes") as string

  // Calcular a data de fechamento da fatura
  const { closingDate, dueDate } = calculateInvoiceDate(purchaseDate, card.closing_day, card.due_day)

  // Buscar ou criar a fatura
  const invoiceId = await getOrCreateInvoice(supabase, cardId, closingDate, dueDate)

  // Se for parcelado, criar múltiplas compras
  if (installments > 1) {
    const installmentAmount = amount / installments
    const purchases = []

    for (let i = 0; i < installments; i++) {
      const installmentDate = new Date(purchaseDate)
      installmentDate.setMonth(installmentDate.getMonth() + i)

      const { closingDate: instClosingDate, dueDate: instDueDate } = calculateInvoiceDate(
        installmentDate,
        card.closing_day,
        card.due_day,
      )

      const instInvoiceId = await getOrCreateInvoice(supabase, cardId, instClosingDate, instDueDate)

      purchases.push({
        credit_card_id: cardId,
        invoice_id: instInvoiceId,
        description: `${description} (${i + 1}/${installments})`,
        amount: installmentAmount,
        purchase_date: installmentDate.toISOString().split("T")[0],
        category_id: categoryId || null,
        installments,
        installment_number: i + 1,
        notes: notes || null,
      })
    }

    const { error } = await supabase.from("credit_card_purchases").insert(purchases)

    if (error) {
      throw new Error(error.message)
    }
  } else {
    // Compra única
    const { error } = await supabase.from("credit_card_purchases").insert({
      credit_card_id: cardId,
      invoice_id: invoiceId,
      description,
      amount,
      purchase_date: purchaseDate.toISOString().split("T")[0],
      category_id: categoryId || null,
      installments: 1,
      installment_number: 1,
      notes: notes || null,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath(`/credit-cards/${cardId}/purchases`)
  redirect(`/credit-cards/${cardId}/purchases`)
}

export async function updatePurchase(id: string, cardId: string, formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const description = formData.get("description") as string
  const amount = Number.parseFloat(formData.get("amount") as string)
  const purchaseDate = formData.get("purchase_date") as string
  const categoryId = formData.get("category_id") as string | null
  const notes = formData.get("notes") as string

  const { error } = await supabase
    .from("credit_card_purchases")
    .update({
      description,
      amount,
      purchase_date: purchaseDate,
      category_id: categoryId || null,
      notes: notes || null,
    })
    .eq("id", id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/credit-cards/${cardId}/purchases`)
  redirect(`/credit-cards/${cardId}/purchases`)
}

export async function deletePurchase(id: string, cardId: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase.from("credit_card_purchases").delete().eq("id", id)

  revalidatePath(`/credit-cards/${cardId}/purchases`)
}
