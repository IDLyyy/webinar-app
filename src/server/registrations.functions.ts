import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin, getSupabaseAsUser } from "@/integrations/supabase/client.server";

const inputSchema = z.object({
  registrationId: z.string().uuid(),
  accessToken: z.string().min(10),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

interface FonnteResponse {
  status?: boolean;
  reason?: string;
  detail?: string;
}

async function sendWhatsApp(phone: string, message: string): Promise<FonnteResponse> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) throw new Error("FONNTE_TOKEN not configured on server");

  const body = new URLSearchParams();
  body.set("target", phone);
  body.set("message", message);
  body.set("countryCode", "62");

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const text = await res.text();
  let json: FonnteResponse = {};
  try {
    json = JSON.parse(text) as FonnteResponse;
  } catch {
    throw new Error(`Fonnte invalid response: ${text.slice(0, 200)}`);
  }
  if (!res.ok || json.status === false) {
    throw new Error(`Fonnte error: ${json.reason ?? json.detail ?? text.slice(0, 200)}`);
  }
  return json;
}

export const reviewRegistration = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    // 1. Verify caller is admin via their access token
    const userClient = getSupabaseAsUser(data.accessToken);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      throw new Error("Unauthorized: invalid session");
    }
    const userId = userData.user.id;

    const admin = getSupabaseAdmin();
    const { data: roleRow, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(`Role check failed: ${roleErr.message}`);
    if (!roleRow) throw new Error("Forbidden: not an admin");

    // 2. Load registration
    const { data: reg, error: regErr } = await admin
      .from("registrations")
      .select("*")
      .eq("id", data.registrationId)
      .single();
    if (regErr || !reg) throw new Error("Registration not found");

    if (data.action === "reject") {
      const { error: updErr } = await admin
        .from("registrations")
        .update({
          status: "rejected",
          rejection_reason: data.rejectionReason ?? null,
          approved_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.registrationId);
      if (updErr) throw new Error(updErr.message);
      return { ok: true, action: "rejected" as const };
    }

    // approve
    const { data: settings, error: setErr } = await admin
      .from("webinar_settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (setErr || !settings) throw new Error("Webinar settings not found");

    const template =
      (settings.whatsapp_message_template as string | null) ||
      "Halo {name}, pembayaran webinar *{title}* sudah kami terima. Berikut link grup WA: {link}";
    const message = template
      .replace(/\{name\}/g, reg.full_name as string)
      .replace(/\{title\}/g, settings.title as string)
      .replace(/\{link\}/g, settings.whatsapp_group_link as string)
      .replace(/\{date\}/g, settings.date_text as string);

    await sendWhatsApp(reg.phone as string, message);

    const { error: updErr } = await admin
      .from("registrations")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userId,
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.registrationId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, action: "approved" as const };
  });

export const getProofUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ accessToken: z.string().min(10), path: z.string().min(1) }).parse(input)
  )
  .handler(async ({ data }) => {
    const userClient = getSupabaseAsUser(data.accessToken);
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const admin = getSupabaseAdmin();
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { data: signed, error } = await admin.storage
      .from("payment-proofs")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw new Error(error?.message ?? "Failed to sign");
    return { url: signed.signedUrl };
  });
