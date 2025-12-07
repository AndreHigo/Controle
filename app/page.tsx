import { Button } from "@/components/ui/button"
import { ArrowRight, BarChart3, Shield, TrendingUp } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-12 text-center md:py-24">
        <div className="space-y-4">
          <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">
            Controle seus gastos de forma simples
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl">
            Gerencie suas finanças pessoais, acompanhe receitas e despesas, e tome decisões financeiras mais
            inteligentes
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/auth/sign-up">
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Fazer login</Link>
          </Button>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-8 sm:grid-cols-3 max-w-4xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Relatórios visuais</h3>
            <p className="text-sm text-muted-foreground">
              Visualize suas finanças com gráficos e relatórios intuitivos
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Acompanhamento em tempo real</h3>
            <p className="text-sm text-muted-foreground">
              Registre e acompanhe todas as suas transações instantaneamente
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Dados seguros</h3>
            <p className="text-sm text-muted-foreground">Seus dados financeiros protegidos com criptografia de ponta</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Sistema de Controle de Gastos - 2024</p>
      </footer>
    </div>
  )
}
