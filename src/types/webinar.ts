export type RegistrationStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "bank_transfer" | "qris";
export type AppRole = "admin" | "user";

export interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profession: string;
  background: string;
  payment_method: PaymentMethod;
  payment_proof_path: string;
  status: RegistrationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export interface WebinarSettings {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  date_text: string;
  price: number;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  qris_image_url: string | null;
  whatsapp_group_link: string;
  whatsapp_message_template: string;
}
