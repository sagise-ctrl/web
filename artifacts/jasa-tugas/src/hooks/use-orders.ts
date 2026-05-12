import { useQuery, useMutation } from "@tanstack/react-query";

export type OrderStatus =
  | "verifikasi tugas"
  | "pembayaran awal"
  | "verifikasi pembayaran awal"
  | "proses pengerjaan"
  | "menunggu pelunasan"
  | "menunggu verifikasi"
  | "cek file"
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
  deadline?: string;
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
  revisi_catatan?: string;
  revisi_file_urls?: string;
  revisi_count?: number;
  estimasi_selesai?: string;
  estimasi_revisi?: string;
}

export interface WaCheckResult {
  exists: boolean;
  nama_sebelumnya?: string;
}

const API_URL = "/api/proxy";
const ADMIN_API_URL = "/api/admin/proxy";

// ─── Estimasi helpers ─────────────────────────────────────────

export function hitungEstimasiSelesai(
  tipeOrder: TipeOrder | string | undefined,
  fromDate: Date = new Date(),
): Date {
  const days =
    tipeOrder === "super ekspres" ? 1 : tipeOrder === "ekspres" ? 2 : 4;
  const estimasi = new Date(fromDate);
  estimasi.setDate(estimasi.getDate() + days);
  estimasi.setHours(23, 59, 0, 0);
  return estimasi;
}

export function hitungEstimasiRevisi(fromDate: Date = new Date()): Date {
  return new Date(fromDate.getTime() + 12 * 60 * 60 * 1000);
}

export function formatEstimasi(isoString: string): string {
  const d = new Date(isoString);
  const tgl = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const jam = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${tgl}, pukul ${jam}`;
}

// ─── API hooks ────────────────────────────────────────────────

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (data: Omit<Order, "order_id" | "status">) => {
      const res = await fetch(API_URL, {
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
      const res = await fetch(
        `${API_URL}?action=checkWa&wa=${encodeURIComponent(wa)}`,
      );
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
      const res = await fetch(`${API_URL}?action=getOrder&order_id=${orderId}`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Order tidak ditemukan");
      return json.data as Order;
    },
    enabled: !!orderId,
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}

export function useGetAllOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch(`${ADMIN_API_URL}?action=getAllOrders`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal mengambil daftar order");
      return json.data as Order[];
    },
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });
}

export function useUpdateOrder() {
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      estimasi_selesai,
    }: {
      orderId: string;
      status: OrderStatus;
      estimasi_selesai?: string;
    }) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({
          action: "updateStatus",
          order_id: orderId,
          status,
          estimasi_selesai,
        }),
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
      // "hasil" hanya diupload admin — wajib JWT
      // semua tipe lain (bukti_dp, bukti_pelunasan, file_tugas) diupload user — publik
      const isAdminOnly = tipe === "hasil";
      const endpoint = isAdminOnly ? ADMIN_API_URL : API_URL;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        ...(isAdminOnly ? { credentials: "include" as const } : {}),
        body: JSON.stringify({
          action: "uploadFile",
          order_id: orderId,
          tipe,
          fileBase64,
          fileName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal upload file");
      return json as { success: true; url: string };
    },
  });
}

export function useSubmitRevisi() {
  return useMutation({
    mutationFn: async ({
      orderId,
      catatan,
      files,
    }: {
      orderId: string;
      catatan: string;
      files: { base64: string; name: string }[];
    }) => {
      const estimasi_revisi = hitungEstimasiRevisi(new Date()).toISOString();
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "submitRevisi",
          order_id: orderId,
          catatan,
          files,
          estimasi_revisi,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal submit revisi");
      return json;
    },
  });
}

export function useMarkSelesai() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "markSelesai", order_id: orderId }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal tandai selesai");
      return json;
    },
  });
}

// ─── Pricing logic ────────────────────────────────────────────

export function hitungHarga(jenis: JenisTugas, halaman: number): number {
  if (jenis === "Makalah" || jenis === "Artikel") {
    const tier = Math.max(0, Math.ceil((halaman - 10) / 5));
    return 30000 + tier * 5000;
  }
  if (jenis === "PPT") {
    return 20000 + Math.max(0, halaman - 5) * 3000;
  }
  if (jenis === "Tugas Harian") {
    return 20000 + Math.max(0, halaman - 2) * 4000;
  }
  return 0;
}

export function biayaTambahan(tipeOrder: TipeOrder): number {
  if (tipeOrder === "super ekspres") return 15000;
  if (tipeOrder === "ekspres") return 7000;
  return 0;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
