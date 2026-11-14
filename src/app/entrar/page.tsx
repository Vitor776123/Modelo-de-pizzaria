import Link from "next/link";
import type { Metadata } from "next";
import { FormLogin } from "@/app/entrar/form";

export const metadata: Metadata = { title: "Acesso da equipe", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="text-5xl" aria-hidden>🍕</p>
        <h1 className="mt-4 text-4xl">Acesso da equipe</h1>
        <p className="mt-2 text-suave">Entre com o e-mail e a senha que o administrador criou para você.</p>
        <FormLogin />
        <Link href="/" className="btn btn-contorno mt-6 w-full">Voltar ao cardápio</Link>
      </div>
    </main>
  );
}
