import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { TransactionForm } from "@/components/transactions/transaction-form"

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get transaction
  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!transaction) {
    notFound()
  }

  // Get categories
  const { data: categories } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name")

  const { data: creditCards } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name")

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="flex-1 space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Transação</h1>
          <p className="text-muted-foreground">Atualize os dados da transação</p>
        </div>

        <TransactionForm categories={categories || []} creditCards={creditCards || []} transaction={transaction} />
      </main>
    </div>
  )
}
