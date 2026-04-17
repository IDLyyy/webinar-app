import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { WebinarSettings } from "@/types/webinar";

const FALLBACK: WebinarSettings = {
  id: 1,
  title: "Webinar Eksklusif 2025",
  subtitle: "Belajar langsung dari para ahli",
  description:
    "Bergabunglah dalam sesi interaktif penuh insight, studi kasus nyata, dan jaringan profesional.",
  date_text: "Sabtu, 1 Februari 2025 · 19:00 WIB",
  price: 99000,
  bank_name: "BCA",
  bank_account_number: "1234567890",
  bank_account_name: "Nama Penyelenggara",
  qris_image_url: null,
  whatsapp_group_link: "https://chat.whatsapp.com/XXXXXX",
  whatsapp_message_template: "",
};

export function useWebinarSettings() {
  const [settings, setSettings] = useState<WebinarSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase
        .from("webinar_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        setSettings(FALLBACK);
      } else {
        setSettings(data as WebinarSettings);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}

export function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}
