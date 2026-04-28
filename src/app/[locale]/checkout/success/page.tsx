import Link from "next/link";

export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const safeLocale = locale === "pt" || locale === "en" ? locale : "pt";

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-neutral-200 p-6 text-center">
        <h1 className="text-2xl font-semibold text-black">
          Reserva Registada com Sucesso!
        </h1>
        <p className="text-sm text-neutral-600">
          O seu transfer esta pre-reservado. Verifique o seu email nos proximos minutos para receber o link de
          pagamento oficial e garantir a sua viagem.
        </p>
        <Link
          href={`/${safeLocale}/`}
          className="inline-flex rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white"
        >
          Back to booking
        </Link>
      </div>
    </main>
  );
}
