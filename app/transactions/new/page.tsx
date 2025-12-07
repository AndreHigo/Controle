import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { TransactionForm } from "@/components/transactions/transaction-form"

export default async function NewTransactionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
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
          <h1 className="text-3xl font-bold tracking-tight">Nova Transação</h1>
          <p className="text-muted-foreground">Adicione uma nova receita ou despesa</p>
        </div>

        <TransactionForm categories={categories || []} creditCards={creditCards || []} />
      </main>
    </div>
  )
}
