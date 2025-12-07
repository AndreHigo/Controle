"use client"

import type { CreditCard as CreditCardType } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard, FileText, Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { deleteCreditCard } from "@/app/credit-cards/actions"
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

interface CreditCardListProps {
  creditCards: CreditCardType[]
}

export function CreditCardList({ creditCards }: CreditCardListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    await deleteCreditCard(deleteId)
    setIsDeleting(false)
    setDeleteId(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (creditCards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Nenhum cartão cadastrado</p>
          <p className="text-sm text-muted-foreground mb-4">Comece adicionando seu primeiro cartão de crédito</p>
          <Button asChild>
            <Link href="/credit-cards/new">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Cartão
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creditCards.map((card) => (
          <Card key={card.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: card.color || "#3b82f6" }} />
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{card.name}</span>
                {card.last_digits && (
                  <span className="text-sm font-normal text-muted-foreground">•••• {card.last_digits}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Limite</p>
                  <p className="text-lg font-semibold">{formatCurrency(card.credit_limit)}</p>
                </div>
                {card.available_balance > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(card.available_balance)}</p>
                  </div>
                )}
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Fechamento</p>
                    <p className="font-medium">Dia {card.closing_day}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vencimento</p>
                    <p className="font-medium">Dia {card.due_day}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/credit-cards/${card.id}/status`}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Status
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/credit-cards/${card.id}/purchases`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Compras
                    </Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 bg-transparent">
                    <Link href={`/credit-cards/${card.id}/invoices`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Faturas
                    </Link>
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="ghost" size="sm" className="flex-1">
                    <Link href={`/credit-cards/${card.id}/edit`}>
                      <Pencil className="mr-2 h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteId(card.id)}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as compras e faturas deste cartão também serão excluídas.
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
