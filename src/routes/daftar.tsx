import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Copy, Loader2, Upload } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useWebinarSettings, formatRupiah } from "@/hooks/useWebinarSettings";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/daftar")({
  head: () => ({
    meta: [
      { title: "Daftar Webinar — Formulir Pendaftaran" },
      { name: "description", content: "Isi data diri dan unggah bukti pembayaran." },
    ],
  }),
  component: DaftarPage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.string().trim().email("Email tidak valid").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?\d{8,15})$/, "Nomor WA harus 8-15 digit, boleh diawali +"),
  profession: z.string().trim().min(2, "Wajib diisi").max(100),
  background: z.string().trim().min(10, "Minimal 10 karakter").max(1000),
  payment_method: z.enum(["bank_transfer", "qris"]),
});

type FormValues = z.infer<typeof schema>;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function DaftarPage() {
  const navigate = useNavigate();
  const { settings } = useWebinarSettings();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: "bank_transfer" },
  });

  const method = watch("payment_method");

  function copyText(text: string, label: string) {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} disalin`);
  }

  async function onSubmit(values: FormValues) {
    if (!file) {
      toast.error("Mohon unggah bukti pembayaran");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format file harus JPG, PNG, WEBP, atau PDF");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }

    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("registrations").insert({
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        profession: values.profession,
        background: values.background,
        payment_method: values.payment_method,
        payment_proof_path: path,
        status: "pending",
      });
      if (insErr) throw insErr;

      toast.success("Pendaftaran berhasil dikirim!");
      void navigate({ to: "/sukses" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      // eslint-disable-next-line no-console
      console.error("submit error", err);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Formulir Pendaftaran
            </h1>
            <p className="mt-2 text-muted-foreground">
              Isi data berikut untuk mendaftar{" "}
              <span className="font-medium text-foreground">{settings?.title ?? "webinar"}</span>
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 rounded-2xl border border-border bg-[image:var(--gradient-card)] p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            {/* Data diri */}
            <fieldset className="space-y-4">
              <legend className="text-base font-semibold">Data Diri</legend>

              <Field label="Nama lengkap" error={errors.full_name?.message}>
                <input {...register("full_name")} className={inputCls} placeholder="Budi Santoso" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email" error={errors.email?.message}>
                  <input
                    type="email"
                    {...register("email")}
                    className={inputCls}
                    placeholder="kamu@email.com"
                  />
                </Field>
                <Field label="No. WhatsApp" error={errors.phone?.message}>
                  <input
                    {...register("phone")}
                    className={inputCls}
                    placeholder="628123456789"
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Gunakan format internasional (contoh: 628123456789). Nomor ini akan dikirimi link
                grup WA setelah pembayaran diverifikasi.
              </p>
            </fieldset>

            {/* Profesi & latar belakang */}
            <fieldset className="space-y-4">
              <legend className="text-base font-semibold">Profesi & Latar Belakang</legend>
              <Field label="Profesi saat ini" error={errors.profession?.message}>
                <input
                  {...register("profession")}
                  className={inputCls}
                  placeholder="Mahasiswa, Karyawan, Wirausaha, dll."
                />
              </Field>
              <Field
                label="Latar belakang & motivasi"
                error={errors.background?.message}
                hint="Ceritakan singkat latar belakang kamu dan apa yang ingin didapat dari webinar ini."
              >
                <textarea
                  {...register("background")}
                  rows={4}
                  className={inputCls}
                  placeholder="Saya seorang ... ingin belajar tentang ..."
                />
              </Field>
            </fieldset>

            {/* Pembayaran */}
            <fieldset className="space-y-4">
              <legend className="text-base font-semibold">
                Metode Pembayaran ·{" "}
                <span className="text-primary">
                  {settings ? formatRupiah(settings.price) : "—"}
                </span>
              </legend>

              <div className="grid grid-cols-2 gap-3">
                <PaymentOption
                  active={method === "bank_transfer"}
                  label="Transfer Bank"
                  {...register("payment_method")}
                  value="bank_transfer"
                />
                <PaymentOption
                  active={method === "qris"}
                  label="QRIS"
                  {...register("payment_method")}
                  value="qris"
                />
              </div>

              {method === "bank_transfer" && settings && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
                  <p className="text-muted-foreground">Transfer ke rekening berikut:</p>
                  <div className="mt-2 space-y-1.5">
                    <Row label="Bank" value={settings.bank_name} />
                    <Row
                      label="No. Rekening"
                      value={settings.bank_account_number}
                      onCopy={() =>
                        copyText(settings.bank_account_number, "Nomor rekening")
                      }
                    />
                    <Row label="Atas nama" value={settings.bank_account_name} />
                    <Row
                      label="Jumlah"
                      value={formatRupiah(settings.price)}
                      onCopy={() => copyText(String(settings.price), "Jumlah")}
                    />
                  </div>
                </div>
              )}

              {method === "qris" && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 text-center text-sm">
                  {settings?.qris_image_url ? (
                    <img
                      src={settings.qris_image_url}
                      alt="QRIS pembayaran"
                      className="mx-auto h-56 w-56 rounded-lg border border-border object-contain"
                    />
                  ) : (
                    <p className="py-6 text-muted-foreground">
                      QRIS belum diatur oleh admin. Silakan pilih transfer bank atau hubungi
                      penyelenggara.
                    </p>
                  )}
                  {settings && (
                    <p className="mt-3 text-muted-foreground">
                      Nominal:{" "}
                      <span className="font-medium text-foreground">
                        {formatRupiah(settings.price)}
                      </span>
                    </p>
                  )}
                </div>
              )}

              <Field label="Unggah bukti pembayaran (JPG/PNG/PDF, maks 5MB)">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground transition hover:border-primary hover:bg-accent/40">
                  <Upload className="h-6 w-6" />
                  {file ? (
                    <span className="font-medium text-foreground">{file.name}</span>
                  ) : (
                    <span>Klik untuk pilih file</span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>
            </fieldset>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium hover:bg-accent"
              >
                Batal
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elegant)] transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim Pendaftaran
              </button>
            </div>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function Row({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2 font-medium text-foreground">
        {value}
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="text-muted-foreground hover:text-primary"
            aria-label={`Salin ${label}`}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    </div>
  );
}

const PaymentOption = ({
  active,
  label,
  ...rest
}: { active: boolean; label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label
    className={`flex cursor-pointer items-center justify-center rounded-lg border-2 p-3 text-sm font-medium transition ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border bg-background text-foreground hover:border-primary/50"
    }`}
  >
    <input type="radio" className="sr-only" {...rest} />
    {label}
  </label>
);
