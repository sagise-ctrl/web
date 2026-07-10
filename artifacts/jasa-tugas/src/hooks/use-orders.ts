import { useQuery, useMutation } from "@tanstack/react-query";

export type OrderStatus =
  | "verifikasi tugas"
  | "menunggu pembayaran dp"
  | "proses pengerjaan"
  | "menunggu pelunasan"
  | "pelunasan diterima"
  | "cek file"
  | "revisi"
  | "selesai";

export type JenisTugas =
  | "Makalah"
  | "PPT"
  | "Artikel"
  | "Tugas Harian"
  | "Test";
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
  hasil_url?: string;
  created_at?: string;
  revisi_catatan?: string;
  revisi_file_urls?: string;
  revisi_count?: number;
  estimasi_selesai?: string;
  estimasi_revisi?: string;
  payment_dp_id?: string;
  payment_final_id?: string;
  penyesuaian_nominal?: number;
  penyesuaian_keterangan?: string;
  kategori_order?: string;
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
      harga,
      dp,
      sisa_bayar,
      penyesuaian_nominal,
      penyesuaian_keterangan,
    }: {
      orderId: string;
      status: OrderStatus;
      estimasi_selesai?: string;
      harga?: number;
      dp?: number;
      sisa_bayar?: number;
      penyesuaian_nominal?: number;
      penyesuaian_keterangan?: string;
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
          harga,
          dp,
          sisa_bayar,
          penyesuaian_nominal,
          penyesuaian_keterangan,
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
      tipe: "file_tugas" | "hasil";
      fileBase64: string;
      fileName: string;
    }) => {
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

export interface WithdrawalRequest {
  withdrawal_id: string;
  affiliate_id: string;
  nama: string;
  wa: string;
  nominal: number;
  rekening_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string;
}

export function useGetAllWithdrawals() {
  return useQuery({
    queryKey: ["allWithdrawals"],
    queryFn: async () => {
      const res = await fetch(`${ADMIN_API_URL}?action=getAllWithdrawals`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil data pencairan");
      return json.data as WithdrawalRequest[];
    },
    refetchInterval: 30000,
  });
}

// ─── Affiliate Mutations & Withdrawal Requests Hooks ──────────
export interface AffiliateMutation {
  type: "komisi" | "pencairan";
  label: string;
  detail: string;
  nominal: number;
  sign: "plus" | "minus";
  date: string;
  ref_id: string;
  saldo_setelah: number;
}

export interface AffiliateWithdrawalRequest {
  withdrawal_id: string;
  nominal: number;
  rekening_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  status: "pending" | "rejected";
  created_at: string;
  approved_at: string;
}

export function useGetAffiliateMutations(affiliate_id: string) {
  return useQuery({
    queryKey: ["affiliateMutations", affiliate_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getAffiliateMutations&affiliate_id=${affiliate_id}`,
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal ambil mutasi");
      return json.data as AffiliateMutation[];
    },
    enabled: !!affiliate_id,
    refetchInterval: 30000,
  });
}

export function useGetAffiliateWithdrawalRequests(affiliate_id: string) {
  return useQuery({
    queryKey: ["affiliateWithdrawalRequests", affiliate_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getAffiliateWithdrawalRequests&affiliate_id=${affiliate_id}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil request pencairan");
      return json.data as AffiliateWithdrawalRequest[];
    },
    enabled: !!affiliate_id,
    refetchInterval: 30000,
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
  if (jenis === "Test") {
    return 5000;
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

// ─── User Account Types ───────────────────────────────────────
export interface UserAccount {
  user_id: string;
  nama: string;
  wa: string;
  kode_referral?: string;
  saldo_poin: number;
  created_at: string;
  orders: UserOrder[];
  order_count: number;
  eligible_referral_discount: boolean;
}

export interface UserOrder {
  order_id: string;
  harga_order: number;
  poin_dipakai: number;
  diskon_poin: number;
  harga_dibayar: number;
  poin_didapat: number;
  created_at: string;
}

export interface AffiliateAccount {
  affiliate_id: string;
  kode_referral: string;
  nama: string;
  wa: string;
  saldo_komisi: number;
  rekening_bank?: string;
  nomor_rekening?: string;
  atas_nama?: string;
  rekening_status?: string;
  rekening_updated_at?: string;
  commissions: AffiliateCommission[];
}

export interface AffiliateCommission {
  user_id: string;
  order_id: string;
  order_ke: number;
  harga_order: number;
  persen_komisi: number;
  nominal_komisi: number;
  created_at: string;
}

// ─── User Hooks ───────────────────────────────────────────────
export function useRegisterUser() {
  return useMutation({
    mutationFn: async (data: {
      nama: string;
      wa: string;
      kode_referral?: string;
    }) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "registerUser", data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal registrasi");
      return json;
    },
  });
}

export function useGetUserAccount(user_id: string) {
  return useQuery({
    queryKey: ["userAccount", user_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getUserAccount&user_id=${user_id}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "User tidak ditemukan");
      return json.data as UserAccount;
    },
    enabled: !!user_id,
  });
}

export function useRegisterAffiliate() {
  return useMutation({
    mutationFn: async (data: { nama: string; wa: string }) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "registerAffiliate", data }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal registrasi affiliate");
      return json;
    },
  });
}

export function useGetAffiliateAccount(affiliate_id: string) {
  return useQuery({
    queryKey: ["affiliateAccount", affiliate_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getAffiliateAccount&affiliate_id=${affiliate_id}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Affiliate tidak ditemukan");
      return json.data as AffiliateAccount;
    },
    enabled: !!affiliate_id,
  });
}

export function useRequestWithdrawal() {
  return useMutation({
    mutationFn: async (data: {
      affiliate_id: string;
      nominal: number;
      rekening_bank: string;
      nomor_rekening: string;
      atas_nama: string;
    }) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "requestWithdrawal", data }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal request pencairan");
      return json;
    },
  });
}

// ─── Admin User & Affiliate Hooks ─────────────────────────────
export interface UserData {
  user_id: string;
  nama: string;
  wa: string;
  kode_referral: string;
  status: string;
  saldo_poin: number;
  created_at: string;
  approved_at: string;
  wa_sent: boolean;
}

export interface AffiliateData {
  affiliate_id: string;
  kode_referral: string;
  nama: string;
  wa: string;
  status: string;
  saldo_komisi: number;
  created_at: string;
  approved_at: string;
  wa_sent: boolean;
  rekening_bank?: string;
  nomor_rekening?: string;
  atas_nama?: string;
  rekening_status?: string;
  rekening_updated_at?: string;
}

export function useGetAllUsers() {
  return useQuery({
    queryKey: ["allUsers"],
    queryFn: async () => {
      const res = await fetch(`${ADMIN_API_URL}?action=getAllUsers`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil data users");
      return json.data as UserData[];
    },
    refetchInterval: 30000,
  });
}

export function useGetAllAffiliates() {
  return useQuery({
    queryKey: ["allAffiliates"],
    queryFn: async () => {
      const res = await fetch(`${ADMIN_API_URL}?action=getAllAffiliates`);
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil data affiliates");
      return json.data as AffiliateData[];
    },
    refetchInterval: 30000,
  });
}

export function useMarkWaSent() {
  return useMutation({
    mutationFn: async ({
      type,
      id,
    }: {
      type: "user" | "affiliate";
      id: string;
    }) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "markWaSent", type, id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal update status WA");
      return json;
    },
  });
}

export function useApproveUser() {
  return useMutation({
    mutationFn: async (user_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "approveUser", user_id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal approve user");
      return json;
    },
  });
}

export function useApproveAffiliate() {
  return useMutation({
    mutationFn: async (affiliate_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "approveAffiliate", affiliate_id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal approve affiliate");
      return json;
    },
  });
}

// ─── Activate/Deactivate Hooks ────────────────────────────────
export function useDeactivateUser() {
  return useMutation({
    mutationFn: async (user_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "deactivateUser", user_id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal nonaktifkan user");
      return json;
    },
  });
}

export function useActivateUser() {
  return useMutation({
    mutationFn: async (user_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "activateUser", user_id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Gagal aktifkan user");
      return json;
    },
  });
}

export function useDeactivateAffiliate() {
  return useMutation({
    mutationFn: async (affiliate_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "deactivateAffiliate", affiliate_id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal nonaktifkan affiliate");
      return json;
    },
  });
}

export function useActivateAffiliate() {
  return useMutation({
    mutationFn: async (affiliate_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "activateAffiliate", affiliate_id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal aktifkan affiliate");
      return json;
    },
  });
}

// ─── Rekening & Withdrawal Hooks ──────────────────────────────
export interface WithdrawalHistory {
  withdrawal_id: string;
  nominal: number;
  rekening_bank: string;
  nomor_rekening: string;
  atas_nama: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string;
}

export function useSaveRekening() {
  return useMutation({
    mutationFn: async (data: {
      affiliate_id: string;
      rekening_bank: string;
      nomor_rekening: string;
      atas_nama: string;
    }) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "saveRekening", data }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal simpan rekening");
      return json;
    },
  });
}

export function useApproveRekening() {
  return useMutation({
    mutationFn: async (affiliate_id: string) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({ action: "approveRekening", affiliate_id }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal approve rekening");
      return json;
    },
  });
}

export function useApproveWithdrawal() {
  return useMutation({
    mutationFn: async ({
      withdrawal_id,
      action_type,
    }: {
      withdrawal_id: string;
      action_type: "approve" | "reject";
    }) => {
      const res = await fetch(ADMIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        credentials: "include",
        body: JSON.stringify({
          action: "approveWithdrawal",
          withdrawal_id,
          action_type,
        }),
      });
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal update pencairan");
      return json;
    },
  });
}

export function useGetWithdrawalHistory(affiliate_id: string) {
  return useQuery({
    queryKey: ["withdrawalHistory", affiliate_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getWithdrawalHistory&affiliate_id=${affiliate_id}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil riwayat pencairan");
      return json.data as WithdrawalHistory[];
    },
    enabled: !!affiliate_id,
  });
}

// ─── User Orders Hook ─────────────────────────────────────────
export interface UserOrderItem {
  order_id: string;
  jenis: string;
  halaman: number;
  status: string;
  harga: number;
  tipe_order: string;
  created_at: string;
}

export function useGetUserOrders(user_id: string) {
  return useQuery({
    queryKey: ["userOrders", user_id],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}?action=getUserOrders&user_id=${user_id}`,
      );
      const json = await res.json();
      if (!json.success)
        throw new Error(json.message || "Gagal ambil riwayat order");
      return json.data as UserOrderItem[];
    },
    enabled: !!user_id,
    refetchInterval: 30000,
  });
}
