"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Transaction } from "@/lib/types"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowDownIcon, ArrowUpIcon, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { deleteTransaction } from "@/app/transactions/actions"

interface TransactionListProps {
  transactions: Transaction[]
  currentPage?: number
  totalPages?: number
}

export function TransactionList({ transactions, currentPage = 1, totalPages = 1 }: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const searchParams = useSearchParams()

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleDelete = async () => {
    if (!deleteId) return

    startTransition(async () => {
      await deleteTransaction(deleteId)
      setDeleteId(null)
    })
  }

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    router.push(`/transactions?${params.toString()}`)
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-lg font-medium text-muted-foreground">Nenhuma transação encontrada</p>
          <p className="text-sm text-muted-foreground">Ajuste os filtros ou adicione uma nova transação</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    transaction.type === "income"
                      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {transaction.type === "income" ? (
                    <ArrowUpIcon className="h-6 w-6" />
                  ) : (
                    <ArrowDownIcon className="h-6 w-6" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{transaction.title}</p>
                    {transaction.category && (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: transaction.category.color ? `${transaction.category.color}20` : undefined,
                          color: transaction.category.color || undefined,
                        }}
                      >
                        {transaction.category.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {format(new Date(transaction.date), "dd 'de' MMMM, yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                    {transaction.description && (
                      <>
                        <span>•</span>
                        <span>{transaction.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className={`text-xl font-bold ${
                    transaction.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatCurrency(Math.abs(transaction.amount))}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/transactions/${transaction.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(transaction.id)} disabled={isPending}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700">
              {isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
