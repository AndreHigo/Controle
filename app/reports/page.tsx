import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { ExpenseChart } from "@/components/dashboard/expense-chart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns"
import { ptBR } from "date-fns/locale"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const now = new Date()

  // Get data for last 12 months
  const monthsData = []
  for (let i = 11; i >= 0; i--) {
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

  // Get year statistics
  const yearStart = format(startOfYear(now), "yyyy-MM-dd")
  const yearEnd = format(endOfYear(now), "yyyy-MM-dd")

  const { data: yearTransactions } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .gte("date", yearStart)
    .lte("date", yearEnd)

  const yearIncome =
    yearTransactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const yearExpense =
    yearTransactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0
  const yearBalance = yearIncome - yearExpense

  // Top categories by expense
  const categoryTotals = new Map<string, { name: string; total: number; color: string }>()

  yearTransactions
    ?.filter((t) => t.type === "expense" && t.category)
    .forEach((t) => {
      const existing = categoryTotals.get(t.category_id!) || {
        name: t.category!.name,
        total: 0,
        color: t.category!.color || "#888888",
      }
      existing.total += Number(t.amount)
      categoryTotals.set(t.category_id!, existing)
    })

  const topCategories = Array.from(categoryTotals.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada das suas finanças</p>
        </div>

        {/* Year Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Receitas ({now.getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(yearIncome)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Despesas ({now.getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(yearExpense)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saldo do Ano ({now.getFullYear()})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${yearBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(yearBalance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 12 Month Chart */}
        <ExpenseChart data={monthsData} />

        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Categorias de Despesas ({now.getFullYear()})</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-center text-muted-foreground">Nenhuma despesa com categoria neste ano</p>
            ) : (
              <div className="space-y-4">
                {topCategories.map((category, index) => {
                  const percentage = (category.total / yearExpense) * 100
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: category.color }} />
                          <span className="font-medium">{category.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: category.color,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(category.total)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Average */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Média Mensal de Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(yearIncome / 12)}</div>
              <p className="text-sm text-muted-foreground mt-2">Baseado nos últimos 12 meses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Média Mensal de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(yearExpense / 12)}</div>
              <p className="text-sm text-muted-foreground mt-2">Baseado nos últimos 12 meses</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
