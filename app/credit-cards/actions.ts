"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCreditCard(formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const name = formData.get("name") as string
  const lastDigits = formData.get("lastDigits") as string
  const creditLimit = Number.parseFloat(formData.get("creditLimit") as string)
  const closingDay = Number.parseInt(formData.get("closingDay") as string)
  const dueDay = Number.parseInt(formData.get("dueDay") as string)
  const color = formData.get("color") as string

  const { error } = await supabase.from("credit_cards").insert({
    user_id: user.id,
    name,
    last_digits: lastDigits || null,
    credit_limit: creditLimit,
    closing_day: closingDay,
    due_day: dueDay,
    color,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/credit-cards")
  redirect("/credit-cards")
}

export async function updateCreditCard(id: string, formData: FormData) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const name = formData.get("name") as string
  const lastDigits = formData.get("lastDigits") as string
  const creditLimit = Number.parseFloat(formData.get("creditLimit") as string)
  const closingDay = Number.parseInt(formData.get("closingDay") as string)
  const dueDay = Number.parseInt(formData.get("dueDay") as string)
  const color = formData.get("color") as string

  const { error } = await supabase
    .from("credit_cards")
    .update({
      name,
      last_digits: lastDigits || null,
      credit_limit: creditLimit,
      closing_day: closingDay,
      due_day: dueDay,
      color,
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/credit-cards")
  redirect("/credit-cards")
}

export async function deleteCreditCard(id: string) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  await supabase.from("credit_cards").delete().eq("id", id).eq("user_id", user.id)

  revalidatePath("/credit-cards")
}
