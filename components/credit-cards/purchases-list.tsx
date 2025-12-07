"use client"

import type { CreditCardPurchase } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { deletePurchase } from "@/app/credit-cards/[id]/purchases/actions"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PurchasesListProps {
  purchases: (CreditCardPurchase & { categories?: { name: string; color: string } })[]
  cardId: string
}

export function PurchasesList({ purchases, cardId }: PurchasesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    await deletePurchase(deleteId, cardId)
    setIsDeleting(false)
    setDeleteId(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Nenhuma compra registrada</p>
          <p className="text-sm text-muted-foreground mb-4">Adicione suas compras no cartão para controlar a fatura</p>
          <Button asChild>
            <Link href={`/credit-cards/${cardId}/purchases/new`}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Adicionar Compra
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {purchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: purchase.categories?.color || "#94a3b8" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{purchase.description}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(purchase.purchase_date).toLocaleDateString("pt-BR")}</span>
                        {purchase.categories && (
                          <>
                            <span>•</span>
                            <span>{purchase.categories.name}</span>
                          </>
                        )}
                        {purchase.installments > 1 && (
                          <>
                            <span>•</span>
                            <span>
                              {purchase.installment_number}/{purchase.installments}x
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <span className="font-semibold text-lg whitespace-nowrap">{formatCurrency(purchase.amount)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/credit-cards/${cardId}/purchases/${purchase.id}/edit`}>
                        <Pencil className="h-3 w-3" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteId(purchase.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A compra será removida da fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
