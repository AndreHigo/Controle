import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { TransactionList } from "@/components/transactions/transaction-list"
import { TransactionFilters } from "@/components/transactions/transaction-filters"

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { type?: string; category?: string; year?: string; month?: string; day?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Build query
  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  // Aplicar filtros de data
  if (searchParams.year) {
    const year = searchParams.year
    if (searchParams.month) {
      const month = searchParams.month
      if (searchParams.day) {
        // Filtrar por dia específico
        const date = `${year}-${month}-${searchParams.day}`
        query = query.eq("date", date)
      } else {
        // Filtrar por mês específico
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(Number(year), Number(month), 0).getDate()
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`
        query = query.gte("date", startDate).lte("date", endDate)
      }
    } else {
      // Filtrar por ano específico
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte("date", startDate).lte("date", endDate)
    }
  } else if (searchParams.month) {
    // Se apenas o mês foi selecionado, usar ano atual
    const currentYear = new Date().getFullYear()
    const month = searchParams.month
    const startDate = `${currentYear}-${month}-01`
    const lastDay = new Date(currentYear, Number(month), 0).getDate()
    const endDate = `${currentYear}-${month}-${lastDay.toString().padStart(2, "0")}`
    query = query.gte("date", startDate).lte("date", endDate)
  }

  if (searchParams.type) {
    query = query.eq("type", searchParams.type)
  }

  if (searchParams.category) {
    query = query.eq("category_id", searchParams.category)
  }

  const { data: transactions } = await query

  // Get categories for filter
  const { data: categories } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name")

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
            <p className="text-muted-foreground">Gerencie todas as suas receitas e despesas</p>
          </div>
          <Button asChild>
            <Link href="/transactions/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Transação
            </Link>
          </Button>
        </div>

        <TransactionFilters
          categories={categories || []}
          currentType={searchParams.type}
          currentCategory={searchParams.category}
          currentYear={searchParams.year}
          currentMonth={searchParams.month}
          currentDay={searchParams.day}
        />

        <TransactionList transactions={transactions || []} />
      </main>
    </div>
  )
}
