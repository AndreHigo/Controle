import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { PurchaseForm } from "@/components/credit-cards/purchase-form"

export default async function EditPurchasePage({
  params,
}: {
  params: Promise<{ id: string; purchaseId: string }>
}) {
  const { id, purchaseId } = await params
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

  // Buscar compra
  const { data: purchase } = await supabase
    .from("credit_card_purchases")
    .select("*")
    .eq("id", purchaseId)
    .eq("credit_card_id", id)
    .single()

  if (!purchase) {
    redirect(`/credit-cards/${id}/purchases`)
  }

  // Buscar categorias
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .eq("type", "expense")
    .order("name")

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/credit-cards/${id}/purchases`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Compra</h1>
          <p className="text-sm text-muted-foreground">{card.name}</p>
        </div>
      </div>

      <PurchaseForm cardId={id} categories={categories || []} purchase={purchase} />
    </div>
  )
}
