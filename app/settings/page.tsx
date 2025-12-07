import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/layout/dashboard-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userEmail={user.email} />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie suas preferências e informações da conta</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
              <CardDescription>Seus dados pessoais e informações de login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={profile?.full_name || "Não informado"} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email || ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Membro desde</Label>
                <Input value={new Date(user.created_at).toLocaleDateString("pt-BR")} disabled />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobre o Sistema</CardTitle>
              <CardDescription>Informações sobre o sistema de controle de gastos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Este sistema foi desenvolvido para ajudá-lo a gerenciar suas finanças pessoais de forma simples e
                  eficiente.
                </p>
                <p>Todos os seus dados são protegidos e armazenados de forma segura.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
