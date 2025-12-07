import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { CreditCardForm } from "@/components/credit-cards/credit-card-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { CreditCard } from "@/lib/types"

export default async function EditCreditCardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: creditCard } = await supabase
    .from("credit_cards")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!creditCard) {
    redirect("/credit-cards")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav userEmail={user.email} />
      <main className="container max-w-2xl py-8">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/credit-cards">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Editar Cartão</h1>
          <p className="text-muted-foreground">Atualize as informações do cartão</p>
        </div>

        <CreditCardForm creditCard={creditCard as CreditCard} />
      </main>
    </div>
  )
}
