"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createCreditCard, updateCreditCard } from "@/app/credit-cards/actions"
import type { CreditCard as CreditCardType } from "@/lib/types"
import { useFormStatus } from "react-dom"

interface CreditCardFormProps {
  creditCard?: CreditCardType
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Salvando..." : "Salvar Cartão"}
    </Button>
  )
}

export function CreditCardForm({ creditCard }: CreditCardFormProps) {
  const action = creditCard ? updateCreditCard.bind(null, creditCard.id) : createCreditCard

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Cartão</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cartão *</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex: Nubank, Inter, C6..."
              defaultValue={creditCard?.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastDigits">Últimos 4 dígitos</Label>
            <Input
              id="lastDigits"
              name="lastDigits"
              placeholder="1234"
              maxLength={4}
              defaultValue={creditCard?.last_digits || ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="creditLimit">Limite de Crédito (R$) *</Label>
            <Input
              id="creditLimit"
              name="creditLimit"
              type="number"
              step="0.01"
              min="0"
              placeholder="5000.00"
              defaultValue={creditCard?.credit_limit}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closingDay">Dia de Fechamento *</Label>
              <Input
                id="closingDay"
                name="closingDay"
                type="number"
                min="1"
                max="31"
                placeholder="10"
                defaultValue={creditCard?.closing_day}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDay">Dia de Vencimento *</Label>
              <Input
                id="dueDay"
                name="dueDay"
                type="number"
                min="1"
                max="31"
                placeholder="17"
                defaultValue={creditCard?.due_day}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor do Cartão</Label>
            <Input id="color" name="color" type="color" defaultValue={creditCard?.color || "#3b82f6"} />
          </div>

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
