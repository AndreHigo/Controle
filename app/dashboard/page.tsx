import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { ExpenseChart } from "@/components/dashboard/expense-chart"
import { CategoryChart } from "@/components/dashboard/category-chart"
import type { DashboardStats, Transaction } from "@/lib/types"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { ptBR } from "date-fns/locale"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get current month date range
  const now = new Date()
  const startDate = format(startOfMonth(now), "yyyy-MM-dd")
  const endDate = format(endOfMonth(now), "yyyy-MM-dd")

  // Fetch all transactions for current month
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false })

  // Calculate stats
  const stats: DashboardStats = {
    totalIncome: transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    totalExpenses: transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0,
    balance: 0,
    transactionCount: transactions?.length || 0,
  }
  stats.balance = stats.totalIncome - stats.totalExpenses

  // Get recent transactions (last 5)
  const recentTransactions: Transaction[] = (transactions || []).slice(0, 5)

  // Prepare chart data for last 6 months
  const monthsData = []
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(now, i)
    const monthStart = format(startOfMonth(date), "yyyy-MM-dd")
    const monthEnd = format(endOfMonth(date), "yyyy-MM-dd")

    const { data: monthTransactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", monthStart)
      .lte("date", monthEnd)

    const income =
      monthTransactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
    const expense =
      monthTransactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0

    monthsData.push({
      month: format(date, "MMM", { locale: ptBR }),
      income,
      expense,
    })
  }

  // Prepare category chart data
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "expense")

  const categoryData =
    categories
      ?.map((cat) => {
        const total =
          transactions
            ?.filter((t) => t.category_id === cat.id && t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0
        return {
          name: cat.name,
          value: total,
          color: cat.color || "#888888",
        }
      })
      .filter((c) => c.value > 0) || []

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="flex-1 space-y-6 p-6 md:p-8 mx-auto w-full max-w-7xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo de volta! Aqui está o resumo das suas finanças.</p>
          </div>
        </div>

        <StatsCards stats={stats} />

        <div className="grid gap-6 md:grid-cols-7">
          <ExpenseChart data={monthsData} />
          <CategoryChart data={categoryData} />
        </div>

        <RecentTransactions transactions={recentTransactions} />
      </main>
    </div>
  )
}
