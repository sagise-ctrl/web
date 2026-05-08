import { useQuery, useMutation } from "@tanstack/react-query";

export type OrderStatus =
  | "verifikasi tugas"
  | "proses pengerjaan"
  | "menunggu pelunasan"
  | "verifikasi pembayaran"
  | "revisi"
  | "selesai"
  | "pending"
  | "proses";

export type JenisTugas = "Makalah" | "PPT" | "Artikel" | "Tugas Harian";
export type TipeOrder = "standar" | "ekspres" | "super ekspres";

export interface Order {
  order_id: string;
  nama: string;
  wa: string;
  jenis: JenisTugas;
  halaman: number;
  deadline: string;
  note: string;
  status: OrderStatus;
  tipe_order?: TipeOrder;
  harga?: number;
  dp?: number;
  sisa_bayar?: number;
  file_tugas_url?: string;
  bukti_dp_url?: string;
  bukti_pelunasan_url?: string;
  hasil_url?: string;
  created_at?: string;
}

export interface WaCheckResult {
  exists: boolean;
  nama_sebelumnya?: string;
}

const GAS_URL = import.meta.env.VITE_GAS_URL;

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (data: Omit<Order, "order_id" | "status">) => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "createOrder", data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal membuat order");
      return json as { success: true; order_id: string };
    },
  });
}

export function useCheckWa() {
  return useMutation({
    mutationFn: async (wa: string): Promise<WaCheckResult> => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(`${GAS_URL}?action=checkWa&wa=${encodeURIComponent(wa)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal cek nomor WA");
      return json.data as WaCheckResult;
    },
  });
}

export function useGetOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(`${GAS_URL}?action=getOrder&order_id=${orderId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Order tidak ditemukan");
      return json.data as Order;
    },
    enabled: !!orderId,
  });
}

export function useGetAllOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(`${GAS_URL}?action=getAllOrders`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal mengambil daftar order");
      return json.data as Order[];
    },
  });
}

export function useUpdateOrder() {
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "updateStatus", order_id: orderId, status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal update status");
      return json;
    },
  });
}

export function useUploadBukti() {
  return useMutation({
    mutationFn: async ({
      orderId,
      tipe,
      fileBase64,
      fileName,
    }: {
      orderId: string;
      tipe: "bukti_dp" | "bukti_pelunasan" | "file_tugas" | "hasil";
      fileBase64: string;
      fileName: string;
    }) => {
      if (!GAS_URL) throw new Error("VITE_GAS_URL is not defined");
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "uploadFile", order_id: orderId, tipe, fileBase64, fileName }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal upload file");
      return json as { success: true; url: string };
    },
  });
}

// ─── Pricing logic ────────────────────────────────────────────

export function hitungHarga(jenis: JenisTugas, halaman: number): number {
  if (jenis === "Makalah" || jenis === "Artikel") {
    // 1–10 = 30rb, naik 5rb tiap tier 5 halaman
    const tier = Math.max(0, Math.ceil((halaman - 10) / 5));
    return 30000 + tier * 5000;
  }
  if (jenis === "PPT") {
    // 5 slide = 20rb, +3rb per slide tambahan
    return 20000 + Math.max(0, halaman - 5) * 3000;
  }
  if (jenis === "Tugas Harian") {
    // 2 lembar = 20rb, +4rb per lembar tambahan
    return 20000 + Math.max(0, halaman - 2) * 4000;
  }
  return 0;
}

export function hitungDeadline(tipeOrder: TipeOrder, deadlineUser: string): string {
  const date = new Date(deadlineUser);
  if (tipeOrder === "super ekspres") date.setDate(date.getDate() - 2);
  if (tipeOrder === "ekspres") date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

export function biayaTambahan(tipeOrder: TipeOrder): number {
  if (tipeOrder === "super ekspres") return 15000;
  if (tipeOrder === "ekspres") return 7000;
  return 0;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}
