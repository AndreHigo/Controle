"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  const amount = Number.parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as string
  const creditCardId = (formData.get("credit_card_id") as string) || null

  const data = {
    user_id: user.id,
    title: formData.get("title") as string,
    amount,
    type,
    category_id: (formData.get("category_id") as string) || null,
    credit_card_id: creditCardId,
    date: formData.get("date") as string,
    description: (formData.get("description") as string) || null,
  }

  if (creditCardId) {
    // Buscar o cartão atual para pegar o saldo
    const { data: creditCard, error: fetchError } = await supabase
      .from("credit_cards")
      .select("balance")
      .eq("id", creditCardId)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      return { error: "Erro ao buscar cartão de crédito" }
    }

    // Calcular novo saldo (receita adiciona, despesa subtrai)
    const currentBalance = creditCard.balance || 0
    const newBalance = type === "income" ? currentBalance + amount : currentBalance - amount

    // Verificar se há saldo suficiente para despesas
    if (type === "expense" && newBalance < 0) {
      return { error: "Saldo insuficiente no cartão de crédito" }
    }

    // Atualizar saldo do cartão
    const { error: updateError } = await supabase
      .from("credit_cards")
      .update({ balance: newBalance })
      .eq("id", creditCardId)
      .eq("user_id", user.id)

    if (updateError) {
      return { error: "Erro ao atualizar saldo do cartão" }
    }
  }

  const { error } = await supabase.from("transactions").insert(data)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/credit-cards")
  redirect("/transactions")
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  const { data: oldTransaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError) {
    return { error: "Transação não encontrada" }
  }

  const amount = Number.parseFloat(formData.get("amount") as string)
  const type = formData.get("type") as string
  const creditCardId = (formData.get("credit_card_id") as string) || null

  if (oldTransaction.credit_card_id) {
    const { data: oldCard } = await supabase
      .from("credit_cards")
      .select("balance")
      .eq("id", oldTransaction.credit_card_id)
      .single()

    if (oldCard) {
      const revertedBalance =
        oldTransaction.type === "income"
          ? (oldCard.balance || 0) - oldTransaction.amount
          : (oldCard.balance || 0) + oldTransaction.amount

      await supabase.from("credit_cards").update({ balance: revertedBalance }).eq("id", oldTransaction.credit_card_id)
    }
  }

  if (creditCardId) {
    const { data: creditCard, error: fetchCardError } = await supabase
      .from("credit_cards")
      .select("balance")
      .eq("id", creditCardId)
      .eq("user_id", user.id)
      .single()

    if (fetchCardError) {
      return { error: "Erro ao buscar cartão de crédito" }
    }

    const currentBalance = creditCard.balance || 0
    const newBalance = type === "income" ? currentBalance + amount : currentBalance - amount

    if (type === "expense" && newBalance < 0) {
      return { error: "Saldo insuficiente no cartão de crédito" }
    }

    const { error: updateError } = await supabase
      .from("credit_cards")
      .update({ balance: newBalance })
      .eq("id", creditCardId)
      .eq("user_id", user.id)

    if (updateError) {
      return { error: "Erro ao atualizar saldo do cartão" }
    }
  }

  const data = {
    title: formData.get("title") as string,
    amount,
    type,
    category_id: (formData.get("category_id") as string) || null,
    credit_card_id: creditCardId,
    date: formData.get("date") as string,
    description: (formData.get("description") as string) || null,
  }

  const { error } = await supabase.from("transactions").update(data).eq("id", id).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/credit-cards")
  redirect("/transactions")
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (fetchError) {
    return { error: "Transação não encontrada" }
  }

  if (transaction.credit_card_id) {
    const { data: creditCard } = await supabase
      .from("credit_cards")
      .select("balance")
      .eq("id", transaction.credit_card_id)
      .single()

    if (creditCard) {
      const revertedBalance =
        transaction.type === "income"
          ? (creditCard.balance || 0) - transaction.amount
          : (creditCard.balance || 0) + transaction.amount

      await supabase.from("credit_cards").update({ balance: revertedBalance }).eq("id", transaction.credit_card_id)
    }
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/credit-cards")
  return { success: true }
}
