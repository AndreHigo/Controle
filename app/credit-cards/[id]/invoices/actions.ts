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

  const { data, error } = await supabase.rpc("close_invoice_with_balance", {
    p_invoice_id: invoiceId,
    p_card_id: cardId,
    p_user_id: user.id,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (data && !data.success) {
    throw new Error(data.error || "Erro ao fechar fatura")
  }

  revalidatePath(`/credit-cards/${cardId}/invoices`)
  revalidatePath(`/credit-cards/${cardId}/status`)
  revalidatePath("/transactions")
  revalidatePath("/dashboard")
}
