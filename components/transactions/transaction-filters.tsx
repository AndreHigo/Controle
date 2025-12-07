"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Category } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"

interface TransactionFiltersProps {
  categories: Category[]
  currentType?: string
  currentCategory?: string
  currentYear?: string
  currentMonth?: string
  currentDay?: string
}

export function TransactionFilters({
  categories,
  currentType,
  currentCategory,
  currentYear,
  currentMonth,
  currentDay,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/transactions?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push("/transactions")
  }

  const currentYearNum = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYearNum - i)

  const hasFilters = currentType || currentCategory || currentYear || currentMonth || currentDay

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Ano:</label>
          <Select
            value={currentYear || "all"}
            onValueChange={(value) => updateFilter("year", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Mês:</label>
          <Select
            value={currentMonth || "all"}
            onValueChange={(value) => updateFilter("month", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="01">Janeiro</SelectItem>
              <SelectItem value="02">Fevereiro</SelectItem>
              <SelectItem value="03">Março</SelectItem>
              <SelectItem value="04">Abril</SelectItem>
              <SelectItem value="05">Maio</SelectItem>
              <SelectItem value="06">Junho</SelectItem>
              <SelectItem value="07">Julho</SelectItem>
              <SelectItem value="08">Agosto</SelectItem>
              <SelectItem value="09">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Dia:</label>
          <Select
            value={currentDay || "all"}
            onValueChange={(value) => updateFilter("day", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Array.from({ length: 31 }, (_, i) => {
                const day = (i + 1).toString().padStart(2, "0")
                return (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Tipo:</label>
          <Select
            value={currentType || "all"}
            onValueChange={(value) => updateFilter("type", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Categoria:</label>
          <Select
            value={currentCategory || "all"}
            onValueChange={(value) => updateFilter("category", value === "all" ? "" : value)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
