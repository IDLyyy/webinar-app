import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import {
  CheckCircle2,
  Eye,
  Loader2,
  LogOut,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Registration, RegistrationStatus } from "@/types/webinar";
import { getProofUrl, reviewRegistration } from "@/server/registrations.functions";

export const Route = createFileRoute("/admin/")(({
  head: () => ({ meta: [{ title: "Admin · Daftar Peserta" }] }),
  component: AdminDashboard,
}));

const STATUSES: { value: RegistrationStatus | "all"; label: string }[] = [
  { value: "pending", label: "Menunggu" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
  { value: "all", label: "Semua" },
];

function AdminDashboard() {
  const { user, isAdmin, loading, signOut, session } = useAuth();
  const navigate = useNavigate();
  const reviewFn = useServerFn(reviewRegistration);
  const proofFn = useServerFn(getProofUrl);

  const [filter, setFilter] = useState<RegistrationStatus | "all">("pending");
  const [rows, setRows] = useState<Registration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [viewing, setViewing] = useState<Registration | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectFor, setRejectFor] = useState<Registration | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Separate counts state — always reflects ALL registrations, not the current filter
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      void navigate({ to: "/admin/login" });
    }
  }, [user, isAdmin, loading, navigate]);

  async function loadCounts() {
    const { data } = await supabase
      .from("registrations")
      .select("status");
    if (data) {
      const c = { pending: 0, approved: 0, rejected: 0 };
      data.forEach((r) => {
        const s = r.status as RegistrationStatus;
        if (s in c) c[s] += 1;
      });
      setCounts(c);
    }
  }

  async function load() {
    setFetching(true);
    let q = supabase
      .from("registrations")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    setFetching(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data ?? []) as Registration[]);
    // Also refresh counts so the summary is always up-to-date
    void loadCounts();
  }

  useEffect(() => {
    if (user && isAdmin) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, filter]);

  async function viewProof(r: Registration) {
    if (!session) return;
    setViewing(r);
    setProofUrl(null);
    try {
      const res = await proofFn({
        data: { accessToken: session.access_token, path: r.payment_proof_path },
      });
      setProofUrl(res.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal load bukti");
    }
  }

  async function approve(r: Registration) {
    if (!session) return;
    if (!confirm(`Setujui pendaftaran ${r.full_name} dan kirim WA ke ${r.phone}?`)) return;
    setBusy(r.id);
    try {
      await reviewFn({
        data: { registrationId: r.id, accessToken: session.access_token, action: "approve" },
      });
      toast.success(`${r.full_name} disetujui & WA terkirim`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal approve");
    } finally {
      setBusy(null);
    }
  }

  async function doReject() {
    if (!session || !rejectFor) return;
    setBusy(rejectFor.id);
    try {
      await reviewFn({
        data: {
          registrationId: rejectFor.id,
          accessToken: session.access_token,
          action: "reject",
          rejectionReason: rejectReason || undefined,
        },
      });
      toast.success("Pendaftaran ditolak");
      setRejectFor(null);
      setRejectReason("");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reject");
    } finally {
      setBusy(null);
    }
  }

  if (loading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button
            onClick={() => void signOut().then(() => navigate({ to: "/admin/login" }))}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  filter === s.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-primary/50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm hover:bg-accent"
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Peserta</th>
                  <th className="px-4 py-3">Kontak</th>
                  <th className="px-4 py-3">Profesi</th>
                  <th className="px-4 py-3">Bayar</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tgl</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 && !fetching && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      Tidak ada pendaftaran.
                    </td>
                  </tr>
                )}
                {fetching && rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.full_name}</div>
                      <button
                        onClick={() => setViewing(r)}
                        className="text-xs text-primary hover:underline"
                      >
                        Lihat detail
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.email}</div>
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    </td>
                    <td className="px-4 py-3">{r.profession}</td>
                    <td className="px-4 py-3 capitalize">
                      {r.payment_method === "bank_transfer" ? "Transfer" : "QRIS"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd MMM yy HH:mm")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => void viewProof(r)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-accent"
                        >
                          <Eye className="h-3 w-3" /> Bukti
                        </button>
                        {r.status === "pending" && (
                          <>
                            <button
                              disabled={busy === r.id}
                              onClick={() => void approve(r)}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-2 text-xs font-medium text-success-foreground hover:opacity-90 disabled:opacity-60"
                            >
                              {busy === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectFor(r)}
                              className="inline-flex h-8 items-center gap-1 rounded-md bg-destructive px-2 text-xs font-medium text-destructive-foreground hover:opacity-90"
                            >
                              <XCircle className="h-3 w-3" /> Tolak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Counts now reflect ALL registrations, not just the current filter */}
        <p className="mt-4 text-xs text-muted-foreground">
          Pending: {counts.pending} · Approved: {counts.approved} · Rejected: {counts.rejected}
        </p>
      </main>

      {/* Detail / proof modal */}
      {viewing && (
        <Modal onClose={() => { setViewing(null); setProofUrl(null); }}>
          <h2 className="mb-2 text-lg font-semibold">{viewing.full_name}</h2>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Email:</span> {viewing.email}</p>
            <p><span className="text-muted-foreground">WA:</span> {viewing.phone}</p>
            <p><span className="text-muted-foreground">Profesi:</span> {viewing.profession}</p>
            <p><span className="text-muted-foreground">Metode:</span> {viewing.payment_method}</p>
            <div>
              <span className="text-muted-foreground">Latar belakang:</span>
              <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-sm">
                {viewing.background}
              </p>
            </div>
            {viewing.rejection_reason && (
              <p className="text-destructive">
                <span className="font-medium">Alasan tolak:</span> {viewing.rejection_reason}
              </p>
            )}
            <div className="pt-3">
              <p className="mb-2 text-sm font-medium">Bukti pembayaran:</p>
              {!proofUrl ? (
                <button
                  onClick={() => void viewProof(viewing)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-accent"
                >
                  <Eye className="h-4 w-4" /> Muat bukti
                </button>
              ) : proofUrl.toLowerCase().includes(".pdf") ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline"
                >
                  Buka PDF di tab baru
                </a>
              ) : (
                <img
                  src={proofUrl}
                  alt="Bukti"
                  className="max-h-96 rounded-md border border-border"
                />
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <Modal onClose={() => { setRejectFor(null); setRejectReason(""); }}>
          <h2 className="mb-2 text-lg font-semibold">Tolak Pendaftaran</h2>
          <p className="text-sm text-muted-foreground">
            Tolak pendaftaran <strong>{rejectFor.full_name}</strong>?
          </p>
          <textarea
            placeholder="Alasan (opsional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => { setRejectFor(null); setRejectReason(""); }}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-accent"
            >
              Batal
            </button>
            <button
              disabled={busy === rejectFor.id}
              onClick={() => void doReject()}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-destructive px-3 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy === rejectFor.id && <Loader2 className="h-4 w-4 animate-spin" />}
              Tolak
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: RegistrationStatus }) {
  const map = {
    pending: "bg-warning/15 text-warning-foreground border-warning/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
  } as const;
  const label = { pending: "Menunggu", approved: "Disetujui", rejected: "Ditolak" }[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[status]}`}
    >
      {label}
    </span>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-[var(--shadow-elegant)]"
      >
        {children}
      </div>
    </div>
  );
}
