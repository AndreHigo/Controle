import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CloseInvoiceButton } from "@/components/credit-cards/close-invoice-button"

export default async function CreditCardInvoicesPage({
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

  // Buscar todas as faturas
  const { data: invoices } = await supabase
    .from("credit_card_invoices")
    .select("*")
    .eq("credit_card_id", id)
    .order("closing_date", { ascending: false })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Buscar compras de cada fatura para calcular totais
  const invoicesWithTotals = await Promise.all(
    (invoices || []).map(async (invoice) => {
      const { data: purchases } = await supabase
        .from("credit_card_purchases")
        .select("amount")
        .eq("invoice_id", invoice.id)

      const total = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0
      return { ...invoice, total }
    }),
  )

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/credit-cards">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Faturas - {card.name}</h1>
            <p className="text-sm text-muted-foreground">{card.last_digits && `•••• ${card.last_digits}`}</p>
          </div>
        </div>

        {invoicesWithTotals.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-2">Nenhuma fatura encontrada</p>
              <p className="text-sm text-muted-foreground">
                As faturas aparecerão aqui quando você adicionar compras no cartão
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoicesWithTotals.map((invoice) => (
              <Card key={invoice.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Fatura de{" "}
                      {new Date(invoice.closing_date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </span>
                    <Badge
                      variant={
                        invoice.status === "open" ? "default" : invoice.status === "closed" ? "secondary" : "outline"
                      }
                    >
                      {invoice.status === "open" ? "Aberta" : invoice.status === "closed" ? "Fechada" : "Paga"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-lg font-bold">{formatCurrency(invoice.total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Fechamento</p>
                        <p className="font-medium">{new Date(invoice.closing_date).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vencimento</p>
                        <p className="font-medium">{new Date(invoice.due_date).toLocaleDateString("pt-BR")}</p>
                      </div>
                      {invoice.paid_amount > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Pago</p>
                          <p className="font-medium text-green-600">{formatCurrency(invoice.paid_amount)}</p>
                        </div>
                      )}
                    </div>

                    {invoice.status === "open" && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button asChild variant="outline" className="flex-1 bg-transparent">
                          <Link href={`/credit-cards/${id}/purchases`}>Ver Compras</Link>
                        </Button>
                        <CloseInvoiceButton
                          invoiceId={invoice.id}
                          cardId={id}
                          total={invoice.total}
                          availableBalance={card.available_balance}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
