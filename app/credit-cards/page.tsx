import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { CreditCard } from "@/lib/types"
import { CreditCardList } from "@/components/credit-cards/credit-card-list"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { DashboardNav } from "@/components/layout/dashboard-nav"

export default async function CreditCardsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: creditCards } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("user_id", user.id)
    .order("name")

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
            <p className="text-muted-foreground">Gerencie seus cartões e faturas</p>
          </div>
          <Button asChild>
            <Link href="/credit-cards/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cartão
            </Link>
          </Button>
        </div>

        <CreditCardList creditCards={(creditCards as CreditCard[]) || []} />
      </main>
    </div>
  )
}
