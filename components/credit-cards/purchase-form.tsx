"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createPurchase, updatePurchase } from "@/app/credit-cards/[id]/purchases/actions"
import type { Category, CreditCardPurchase } from "@/lib/types"
import { useState } from "react"

interface PurchaseFormProps {
  cardId: string
  categories: Category[]
  purchase?: CreditCardPurchase
}

export function PurchaseForm({ cardId, categories, purchase }: PurchaseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      if (purchase) {
        await updatePurchase(purchase.id, cardId, formData)
      } else {
        await createPurchase(cardId, formData)
      }
    } catch (error) {
      console.error("Erro ao salvar compra:", error)
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              name="description"
              placeholder="Ex: Supermercado, Restaurante, Netflix..."
              defaultValue={purchase?.description}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                defaultValue={purchase?.amount}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase_date">Data da Compra</Label>
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
                defaultValue={
                  purchase?.purchase_date
                    ? new Date(purchase.purchase_date).toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0]
                }
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category_id">Categoria</Label>
              <Select name="category_id" defaultValue={purchase?.category_id || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Input
                id="installments"
                name="installments"
                type="number"
                min="1"
                max="48"
                defaultValue={purchase?.installments || 1}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Adicione observações sobre esta compra..."
              defaultValue={purchase?.notes || ""}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Salvando..." : purchase ? "Atualizar Compra" : "Adicionar Compra"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
