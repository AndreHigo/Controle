"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category, Transaction, CreditCard } from "@/lib/types"
import { useState, useTransition } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { createTransaction, updateTransaction } from "@/app/transactions/actions"
import { useRouter } from "next/navigation"

interface TransactionFormProps {
  categories: Category[]
  creditCards?: CreditCard[]
  transaction?: Transaction
}

export function TransactionForm({ categories, creditCards = [], transaction }: TransactionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: transaction?.title || "",
    amount: transaction?.amount.toString() || "",
    type: transaction?.type || "expense",
    category_id: transaction?.category_id || "",
    credit_card_id: transaction?.credit_card_id || "none",
    date: transaction?.date || format(new Date(), "yyyy-MM-dd"),
    description: transaction?.description || "",
  })

  const filteredCategories = categories.filter((cat) => cat.type === formData.type)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const formDataObj = new FormData(form)

    startTransition(async () => {
      try {
        const result = transaction
          ? await updateTransaction(transaction.id, formDataObj)
          : await createTransaction(formDataObj)

        if (result && "error" in result) {
          setError(result.error)
        }
      } catch (err) {
        console.error("[v0] Error saving transaction:", err)
        setError("Erro ao salvar transação. Tente novamente.")
      }
    })
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <input type="hidden" name="type" value={formData.type} />
          <input type="hidden" name="category_id" value={formData.category_id} />
          <input type="hidden" name="credit_card_id" value={formData.credit_card_id} />

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value, category_id: "" })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Ex: Salário, Compra de supermercado"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              disabled={isPending}
            />
          </div>

          {creditCards.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="credit_card">Cartão de Crédito</Label>
              <Select
                value={formData.credit_card_id}
                onValueChange={(value) => setFormData({ ...formData, credit_card_id: value })}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (dinheiro)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (dinheiro)</SelectItem>
                  {creditCards
                    .filter((card) => card.is_active)
                    .map((card) => (
                      <SelectItem key={card.id} value={card.id}>
                        {card.name} {card.last_digits ? `(****${card.last_digits})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {formData.type === "income"
                  ? "Ao selecionar um cartão, o valor será adicionado ao saldo disponível"
                  : "Ao selecionar um cartão, o valor será descontado do saldo disponível"}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">Nenhuma categoria encontrada</div>
                ) : (
                  filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              name="date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Adicione uma descrição opcional"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isPending}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : transaction ? (
                "Atualizar Transação"
              ) : (
                "Criar Transação"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
