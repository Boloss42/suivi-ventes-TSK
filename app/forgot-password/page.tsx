import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Logo from "@/components/Logo";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-ink-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <Logo className="mx-auto mb-2 h-12 w-12" />
          <h1 className="text-xl font-semibold text-brand-500">Mot de passe oublié</h1>
          <p className="mt-1 text-sm text-ink-500">
            Saisissez votre email pour recevoir un lien de réinitialisation.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
