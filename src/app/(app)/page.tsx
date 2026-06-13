import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 text-center p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50">
          AZ-Composites CRM
        </h1>
        <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
          Vítejte v interním systému pro správu kompozitních materiálů.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/produkty"
            className="flex h-12 items-center justify-center rounded-full bg-black text-white px-8 font-medium transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Přejít na produkty
          </Link>
        </div>
      </main>
    </div>
  );
}
