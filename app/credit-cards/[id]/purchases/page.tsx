import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { PurchasesList } from "@/components/credit-cards/purchases-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function CreditCardPurchasesPage({
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

  // Buscar cartão
  const { data: card } = await supabase.from("credit_cards").select("*").eq("id", id).eq("user_id", user.id).single()

  if (!card) {
    redirect("/credit-cards")
  }

  // Buscar fatura aberta atual
  const { data: openInvoice } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("credit_card_id", id)
    .eq("status", "open")
    .order("closing_date", { ascending: false })
    .limit(1)
    .single()

  // Buscar compras da fatura aberta
  const { data: purchases } = await supabase
    .from("credit_card_purchases")
    .select("*, categories(name, color)")
    .eq("credit_card_id", id)
    .eq("invoice_id", openInvoice?.id || "")
    .order("purchase_date", { ascending: false })

  // Calcular total da fatura
  const totalAmount = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/credit-cards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{card.name}</h1>
            <p className="text-sm text-muted-foreground">{card.last_digits && `•••• ${card.last_digits}`}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/credit-cards/${id}/purchases/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Compra
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fatura Atual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total da Fatura</span>
              <span className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalAmount)}
              </span>
            </div>
            {openInvoice && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha em</span>
                  <span className="font-medium">{new Date(openInvoice.closing_date).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vence em</span>
                  <span className="font-medium">{new Date(openInvoice.due_date).toLocaleDateString("pt-BR")}</span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <PurchasesList purchases={purchases || []} cardId={id} />
    </div>
  )
}
