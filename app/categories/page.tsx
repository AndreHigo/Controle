import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CategoryList } from "@/components/categories/category-list"
import { CategoryDialog } from "@/components/categories/category-dialog"

export default async function CategoriesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("type")
    .order("name")

  const incomeCategories = categories?.filter((c) => c.type === "income") || []
  const expenseCategories = categories?.filter((c) => c.type === "expense") || []

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground">Organize suas transações com categorias personalizadas</p>
          </div>
          <CategoryDialog userId={user.id}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </CategoryDialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Receitas</h2>
            <CategoryList categories={incomeCategories} userId={user.id} />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Despesas</h2>
            <CategoryList categories={expenseCategories} userId={user.id} />
          </div>
        </div>
      </main>
    </div>
  )
}
