import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";

export const Route = createFileRoute("/sukses")({
  head: () => ({
    meta: [
      { title: "Pendaftaran Terkirim" },
      { name: "description", content: "Pendaftaran kamu sedang diverifikasi admin." },
    ],
  }),
  component: SuksesPage,
});

function SuksesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Pendaftaran Terkirim!</h1>
          <p className="mt-3 text-muted-foreground">
            Terima kasih sudah mendaftar. Tim admin akan memverifikasi bukti pembayaran kamu
            maksimal <strong>1×24 jam</strong>. Setelah disetujui, kamu akan menerima pesan
            WhatsApp berisi link grup webinar.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] hover:opacity-90"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
