import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { CreditCardForm } from "@/components/credit-cards/credit-card-form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function NewCreditCardPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
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
          <h1 className="text-3xl font-bold tracking-tight">Novo Cartão de Crédito</h1>
          <p className="text-muted-foreground">Adicione um novo cartão de crédito</p>
        </div>

        <CreditCardForm />
      </main>
    </div>
  )
}
