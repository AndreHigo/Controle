import { updateSession } from "@/lib/supabase/proxy";
import { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

// 1. Defina os idiomas suportados e o padrão
const locales = ["en", "pt"] as const;
const defaultLocale = "en";

// 2. Crie o middleware de i18n
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always", // Prefixar sempre (ex: /en/home, /pt/home)
});

// 3. Função principal que combina as lógicas
export async function middleware(request: NextRequest) {
  // Primeiro, execute o middleware de autenticação Supabase
  const response = await updateSession(request);

  // Se a resposta do Supabase já existir (ex: redirecionamento), use-a.
  if (response) {
    return response;
  }

  // Se não, execute o middleware de i18n
  return intlMiddleware(request);
}

// 4. Configuração do Matcher
export const config = {
  // O matcher deve incluir todas as rotas que precisam de I18n e Auth
  // e excluir as pastas internas do Next.js e arquivos estáticos.
  matcher: [
    // Match todas as páginas, mas exclua arquivos estáticos, assets, etc.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",

    // Incluir o matcher de rotas do next-intl (necessário após Next 14.3)
    // Isso garante que ele veja as rotas não prefixadas na primeira visita.
    '/',
    '/(en|pt)/:path*', // Permite que rotas com e sem prefixo sejam interceptadas
  ],
};