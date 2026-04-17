import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, CheckCircle2, Sparkles, Users, Zap } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useWebinarSettings, formatRupiah } from "@/hooks/useWebinarSettings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pendaftaran Webinar Eksklusif" },
      {
        name: "description",
        content: "Daftar webinar interaktif dengan para ahli. Tempat terbatas — amankan sekarang.",
      },
      { property: "og:title", content: "Pendaftaran Webinar Eksklusif" },
      {
        property: "og:description",
        content: "Daftar webinar interaktif dengan para ahli. Tempat terbatas — amankan sekarang.",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const { settings } = useWebinarSettings();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[image:var(--gradient-hero)] opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_50%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 text-primary-foreground sm:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3 w-3" />
                Tempat terbatas
              </span>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                {settings?.title ?? "Webinar Eksklusif"}
              </h1>
              <p className="mt-4 text-lg text-white/90 sm:text-xl">
                {settings?.subtitle ?? "Belajar langsung dari para ahli"}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/80">
                <Calendar className="h-4 w-4" />
                <span>{settings?.date_text ?? "Tanggal akan diumumkan"}</span>
              </div>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/daftar"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-white px-8 text-base font-semibold text-primary shadow-[var(--shadow-glow)] transition hover:scale-[1.02]"
                >
                  Daftar Sekarang
                </Link>
                <span className="text-sm text-white/80">
                  Hanya{" "}
                  <span className="font-semibold text-white">
                    {settings ? formatRupiah(settings.price) : "—"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Description + benefits */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Apa yang kamu dapat?</h2>
            <p className="mt-3 text-muted-foreground">
              {settings?.description ??
                "Sesi interaktif penuh insight dan studi kasus nyata."}
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Materi Praktis",
                desc: "Langsung bisa diterapkan di pekerjaan atau bisnis kamu.",
              },
              {
                icon: Users,
                title: "Networking",
                desc: "Terhubung dengan peserta dan pembicara di grup eksklusif.",
              },
              {
                icon: CheckCircle2,
                title: "Sertifikat",
                desc: "Sertifikat digital untuk semua peserta yang hadir.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-[image:var(--gradient-card)] p-6 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-elegant)]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA bottom */}
        <section className="mx-auto max-w-4xl px-4 pb-20">
          <div className="overflow-hidden rounded-2xl bg-[image:var(--gradient-primary)] p-8 text-center text-primary-foreground shadow-[var(--shadow-elegant)] sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Siap bergabung?</h2>
            <p className="mt-2 text-white/90">
              Isi formulir dan unggah bukti pembayaran. Admin akan verifikasi maksimal 1×24 jam.
            </p>
            <Link
              to="/daftar"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-white px-8 text-sm font-semibold text-primary transition hover:scale-[1.02]"
            >
              Daftar Sekarang
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
