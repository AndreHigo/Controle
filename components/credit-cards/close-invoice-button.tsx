"use client"

import { Button } from "@/components/ui/button"
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
import { closeInvoice } from "@/app/credit-cards/[id]/invoices/actions"
import { CheckCircle2 } from "lucide-react"

interface CloseInvoiceButtonProps {
  invoiceId: string
  cardId: string
  total: number
  availableBalance: number
}

export function CloseInvoiceButton({ invoiceId, cardId, total, availableBalance }: CloseInvoiceButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleClose = async () => {
    setIsClosing(true)
    await closeInvoice(invoiceId, cardId)
    setIsClosing(false)
    setShowDialog(false)
  }

  const amountToPay = Math.max(0, total - availableBalance)
  const amountFromBalance = Math.min(total, availableBalance)

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="flex-1">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Fechar Fatura
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Fatura</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Você está prestes a fechar esta fatura:</p>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total da Fatura:</span>
                    <span className="font-bold">{formatCurrency(total)}</span>
                  </div>
                  {availableBalance > 0 && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Abatimento do Saldo:</span>
                        <span className="font-bold">- {formatCurrency(amountFromBalance)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span>Valor a Pagar:</span>
                        <span className="font-bold text-lg">{formatCurrency(amountToPay)}</span>
                      </div>
                    </>
                  )}
                </div>
                {amountToPay > 0 ? (
                  <p className="text-sm">
                    Uma despesa de {formatCurrency(amountToPay)} será criada automaticamente nas suas transações.
                  </p>
                ) : (
                  <p className="text-sm text-green-600">A fatura será paga completamente com seu saldo disponível!</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} disabled={isClosing}>
              {isClosing ? "Fechando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
