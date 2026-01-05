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
  searchParams: Promise<{ 
    type?: string
    category?: string
    year?: string
    month?: string
    day?: string
    search?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const page = Number.parseInt(params.page || "1")
  const pageSize = 50
  const offset = (page - 1) * pageSize

  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`)
  }

  if (params.year) {
    const year = params.year
    if (params.month) {
      const month = params.month
      if (params.day) {
        const date = `${year}-${month}-${params.day}`
        query = query.eq("date", date)
      } else {
        const startDate = `${year}-${month}-01`
        const lastDay = new Date(Number(year), Number(month), 0).getDate()
        const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`
        query = query.gte("date", startDate).lte("date", endDate)
      }
    } else {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`
      query = query.gte("date", startDate).lte("date", endDate)
    }
  } else if (params.month) {
    const currentYear = new Date().getFullYear()
    const month = params.month
    const startDate = `${currentYear}-${month}-01`
    const lastDay = new Date(currentYear, Number(month), 0).getDate()
    const endDate = `${currentYear}-${month}-${lastDay.toString().padStart(2, "0")}`
    query = query.gte("date", startDate).lte("date", endDate)
  }

  if (params.type) {
    query = query.eq("type", params.type)
  }

  if (params.category) {
    query = query.eq("category_id", params.category)
  }

  const { data: transactions, count } = await query

  const { data: categories } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name")

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
            <p className="text-muted-foreground">
              {count !== null ? `${count} transações encontradas` : "Gerencie todas as suas receitas e despesas"}
            </p>
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
          currentType={params.type}
          currentCategory={params.category}
          currentYear={params.year}
          currentMonth={params.month}
          currentDay={params.day}
          currentSearch={params.search}
        />

        <TransactionList 
          transactions={transactions || []} 
          currentPage={page}
          totalPages={totalPages}
        />
      </main>
    </div>
  )
}
