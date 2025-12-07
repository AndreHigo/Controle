import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, DollarSign } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function CreditCardStatusPage({
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
    .select("*")
    .eq("credit_card_id", id)
    .eq("invoice_id", openInvoice?.id || "")

  // Calcular total da fatura
  const totalInvoice = purchases?.reduce((sum, p) => sum + p.amount, 0) || 0

  // Calcular saldo disponível (débito) e limite disponível
  const availableBalance = card.available_balance || 0
  const availableCredit = card.credit_limit - totalInvoice

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
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
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Saldo Débito */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Saldo Disponível (Débito)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(availableBalance)}</p>
              <p className="text-sm text-muted-foreground mt-2">Valor disponível para uso em débito</p>
            </CardContent>
          </Card>

          {/* Limite Crédito */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                Limite de Crédito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(card.credit_limit)}</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Disponível</span>
                  <span className="font-medium text-green-600">{formatCurrency(availableCredit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilizado</span>
                  <span className="font-medium text-red-600">{formatCurrency(totalInvoice)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fatura Atual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Fatura Atual</span>
              {openInvoice && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Aberta
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openInvoice ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total da Fatura</span>
                  <span className="text-2xl font-bold text-red-600">{formatCurrency(totalInvoice)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block">Data de Fechamento</span>
                    <span className="font-medium">
                      {new Date(openInvoice.closing_date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Data de Vencimento</span>
                    <span className="font-medium">{new Date(openInvoice.due_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">
                    {availableBalance >= totalInvoice
                      ? "✓ Você tem saldo suficiente para pagar a fatura completa"
                      : availableBalance > 0
                        ? `Você pode abater ${formatCurrency(availableBalance)} da fatura com seu saldo`
                        : "Sem saldo disponível para abatimento"}
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/credit-cards/${id}/invoices`}>Ver Detalhes da Fatura</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhuma fatura aberta no momento</p>
            )}
          </CardContent>
        </Card>

        {/* Informações do Cartão */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Cartão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block">Dia de Fechamento</span>
                <span className="font-medium">Dia {card.closing_day}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Dia de Vencimento</span>
                <span className="font-medium">Dia {card.due_day}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status</span>
                <Badge variant={card.is_active ? "default" : "secondary"}>{card.is_active ? "Ativo" : "Inativo"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
