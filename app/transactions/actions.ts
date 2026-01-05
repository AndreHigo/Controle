"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { transactionSchema } from "@/lib/validations"

export async function createTransaction(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const validated = transactionSchema.parse({
      title: formData.get("title"),
      amount: Number.parseFloat(formData.get("amount") as string),
      type: formData.get("type"),
      category_id: (formData.get("category_id") as string) || null,
      credit_card_id: (formData.get("credit_card_id") as string) || null,
      date: formData.get("date"),
      description: (formData.get("description") as string) || null,
    })

    const { data, error } = await supabase.rpc("create_transaction_with_balance", {
      p_user_id: user.id,
      p_title: validated.title,
      p_amount: validated.amount,
      p_type: validated.type,
      p_category_id: validated.category_id,
      p_credit_card_id: validated.credit_card_id,
      p_date: validated.date,
      p_description: validated.description,
    })

    if (error) {
      return { error: error.message }
    }

    if (data && !data.success) {
      return { error: data.error }
    }

    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    revalidatePath("/credit-cards")
    redirect("/transactions")
  } catch (err: any) {
    console.error("Erro ao criar transação:", err)
    if (err.errors) {
      return { error: err.errors[0]?.message || "Dados inválidos" }
    }
    return { error: err.message || "Erro ao criar transação" }
  }
}

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  try {
    const validated = transactionSchema.parse({
      title: formData.get("title"),
      amount: Number.parseFloat(formData.get("amount") as string),
      type: formData.get("type"),
      category_id: (formData.get("category_id") as string) || null,
      credit_card_id: (formData.get("credit_card_id") as string) || null,
      date: formData.get("date"),
      description: (formData.get("description") as string) || null,
    })

    const { data, error } = await supabase.rpc("update_transaction_with_balance", {
      p_transaction_id: id,
      p_user_id: user.id,
      p_title: validated.title,
      p_amount: validated.amount,
      p_type: validated.type,
      p_category_id: validated.category_id,
      p_credit_card_id: validated.credit_card_id,
      p_date: validated.date,
      p_description: validated.description,
    })

    if (error) {
      return { error: error.message }
    }

    if (data && !data.success) {
      return { error: data.error }
    }

    revalidatePath("/transactions")
    revalidatePath("/dashboard")
    revalidatePath("/credit-cards")
    redirect("/transactions")
  } catch (err: any) {
    if (err.errors) {
      return { error: err.errors[0]?.message || "Dados inválidos" }
    }
    return { error: "Erro ao atualizar transação" }
  }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Usuário não autenticado" }
  }

  const { data, error } = await supabase.rpc("delete_transaction_with_balance", {
    p_transaction_id: id,
    p_user_id: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  if (data && !data.success) {
    return { error: data.error }
  }

  revalidatePath("/transactions")
  revalidatePath("/dashboard")
  revalidatePath("/credit-cards")
  return { success: true }
}

