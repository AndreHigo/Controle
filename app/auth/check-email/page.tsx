import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail } from "lucide-react"
import Link from "next/link"

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para seu email. Clique no link para ativar sua conta e começar a usar o
              sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Não recebeu o email? Verifique sua pasta de spam ou lixo eletrônico.
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/login">Voltar para login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
