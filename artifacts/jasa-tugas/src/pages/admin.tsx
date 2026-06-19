import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LockKeyhole,
  RefreshCw,
  Loader2,
  ExternalLink,
  Upload,
  CheckCircle,
  X,
  ChevronRight,
  Clock,
  FileText,
  CalendarClock,
} from "lucide-react";
import {
  useGetAllOrders,
  useUpdateOrder,
  useUploadBukti,
  type Order,
  type OrderStatus,
  formatRupiah,
  hitungEstimasiSelesai,
  formatEstimasi,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Status badge colour ───────────────────────────────────────
function statusCls(status: string) {
  const map: Record<string, string> = {
    "verifikasi tugas": "bg-orange-50 text-orange-700 border-orange-200",
    "menunggu pembayaran dp": "bg-amber-50 text-amber-700 border-amber-200",
    "proses pengerjaan": "bg-blue-50 text-blue-700 border-blue-200",
    "menunggu pelunasan": "bg-cyan-50 text-cyan-700 border-cyan-200",
    "pelunasan diterima": "bg-teal-50 text-teal-700 border-teal-200",
    "cek file": "bg-indigo-50 text-indigo-700 border-indigo-200",
    revisi: "bg-yellow-50 text-yellow-700 border-yellow-200",
    selesai: "bg-green-50 text-green-700 border-green-200",
  };
  return map[status] || "bg-slate-50 text-slate-700 border-slate-200";
}

// ─── Status label ──────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  "verifikasi tugas": "Verifikasi Tugas",
  "menunggu pembayaran dp": "Menunggu Pembayaran DP",
  "proses pengerjaan": "Proses Pengerjaan",
  "menunggu pelunasan": "Menunggu Pelunasan",
  "pelunasan diterima": "Pelunasan Diterima",
  "cek file": "Cek File",
  revisi: "Revisi",
  selesai: "Selesai",
};

// ─── Helpers ───────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadTxt(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Upload Dialog ─────────────────────────────────────────────
function UploadDialog({
  orderId,
  title,
  description,
  onSuccess,
  onCancel,
}: {
  orderId: string;
  title: string;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const uploadBukti = useUploadBukti();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await uploadBukti.mutateAsync({
        orderId,
        tipe: "hasil",
        fileBase64: base64,
        fileName: file.name,
      });
      toast({ title: "File berhasil diupload!" });
      onSuccess();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Upload",
        description: err.message,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-sm text-slate-600">{description}</p>
        <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
          {file ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-500">Klik untuk pilih file</p>
              <p className="text-xs text-slate-400">
                PDF, DOC, DOCX, PPT, PPTX, JPG
              </p>
            </>
          )}
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Batal
          </Button>
          <Button
            className="flex-1"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Action Column ───────────────────────────────────────
function AdminActionCell({
  order,
  onOpenVerifikasi,
  onOpenUpload,
  loading,
}: {
  order: Order;
  onOpenVerifikasi: (order: Order) => void;
  onOpenUpload: (
    orderId: string,
    type: "hasil_pertama" | "hasil_revisi",
  ) => void;
  loading: boolean;
}) {
  const { status, order_id } = order;

  if (status === "verifikasi tugas") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-slate-500">
          Periksa detail pesanan, lalu verifikasi.
        </p>
        <Button
          size="sm"
          className="w-full"
          disabled={loading}
          onClick={() => onOpenVerifikasi(order)}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1" /> Verifikasi & Minta DP
            </>
          )}
        </Button>
      </div>
    );
  }

  if (status === "menunggu pembayaran dp") {
    return (
      <div className="flex items-center gap-2 text-amber-600">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">Menunggu customer bayar DP via Midtrans</span>
      </div>
    );
  }

  if (status === "proses pengerjaan") {
    return (
      <div className="space-y-2">
        {order.estimasi_selesai && (
          <div className="flex items-start gap-1.5 bg-blue-50 border border-blue-200 rounded p-2">
            <CalendarClock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide">
                Estimasi Selesai
              </p>
              <p className="text-xs text-blue-800">
                {formatEstimasi(order.estimasi_selesai)}
              </p>
            </div>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Setelah tugas selesai, upload file hasil.
        </p>
        <Button
          size="sm"
          className="w-full"
          disabled={loading}
          onClick={() => onOpenUpload(order_id, "hasil_pertama")}
        >
          <Upload className="w-4 h-4 mr-1" /> Upload Hasil & Minta Pelunasan
        </Button>
      </div>
    );
  }

  if (status === "menunggu pelunasan") {
    return (
      <div className="flex items-center gap-2 text-cyan-600">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">
          Menunggu customer bayar pelunasan via Midtrans
        </span>
      </div>
    );
  }

  if (status === "pelunasan diterima") {
    return (
      <div className="flex items-center gap-2 text-teal-600">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">
          Pelunasan diterima, file aktif untuk customer
        </span>
      </div>
    );
  }

  if (status === "cek file") {
    return (
      <div className="flex items-center gap-2 text-indigo-600">
        <Clock className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs">Menunggu customer cek file & konfirmasi</span>
      </div>
    );
  }

  if (status === "revisi") {
    return (
      <div className="space-y-2">
        {order.estimasi_revisi && (
          <div className="flex items-start gap-1.5 bg-yellow-50 border border-yellow-200 rounded p-2">
            <CalendarClock className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-yellow-700 uppercase tracking-wide">
                Estimasi Revisi Selesai
              </p>
              <p className="text-xs text-yellow-800">
                {formatEstimasi(order.estimasi_revisi)}
              </p>
            </div>
          </div>
        )}
        {order.revisi_file_urls &&
          String(order.revisi_file_urls).trim() &&
          String(order.revisi_file_urls)
            .split(",")
            .filter(Boolean)
            .map((url, i) => (
              <a
                key={i}
                href={url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-yellow-600 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> File Referensi {i + 1}
              </a>
            ))}
        {order.revisi_catatan && String(order.revisi_catatan).trim() && (
          <button
            onClick={() =>
              downloadTxt(
                `catatan-revisi-${order_id}.txt`,
                String(order.revisi_catatan),
              )
            }
            className="flex items-center gap-1 text-xs text-yellow-700 hover:text-yellow-900 transition-colors text-left"
          >
            <FileText className="w-3.5 h-3.5 flex-shrink-0 text-yellow-500" />
            <span className="underline underline-offset-2">
              Catatan Revisi.txt
            </span>
          </button>
        )}
        <p className="text-xs text-slate-500">
          Upload hasil revisi → status ke cek file.
        </p>
        <Button
          size="sm"
          className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
          disabled={loading}
          onClick={() => onOpenUpload(order_id, "hasil_revisi")}
        >
          <Upload className="w-4 h-4 mr-1" /> Upload Hasil Revisi
        </Button>
      </div>
    );
  }

  if (status === "selesai") {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span className="text-xs font-medium">Order selesai</span>
      </div>
    );
  }

  return <span className="text-xs text-slate-400">{status}</span>;
}

// ─── Login ─────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                <LockKeyhole className="w-6 h-6 text-slate-600" />
              </div>
              <CardTitle>Admin Login</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  setLoginError("");
                  try {
                    const res = await fetch("/api/auth/login", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ password }),
                    });
                    if (res.ok) {
                      setIsAuthenticated(true);
                    } else {
                      setLoginError("Password salah");
                    }
                  } catch {
                    setLoginError("Gagal terhubung ke server");
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <Input
                  type="password"
                  placeholder="Masukkan password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                {loginError && (
                  <p className="text-sm text-red-600 text-center">
                    {loginError}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Memverifikasi..." : "Masuk"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return <AdminDashboard />;
}

// ─── Dashboard ─────────────────────────────────────────────────
function AdminDashboard() {
  const { toast } = useToast();
  const {
    data: orders = [],
    isLoading,
    refetch,
    isFetching,
  } = useGetAllOrders();
  const updateOrder = useUpdateOrder();
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [uploadDialog, setUploadDialog] = useState<{
    orderId: string;
    type: "hasil_pertama" | "hasil_revisi";
  } | null>(null);
  const [verifikasiDialog, setVerifikasiDialog] = useState<{
    order: Order;
    step: 1 | 2;
    penyesuaianNominal: string;
    penyesuaianKeterangan: string;
  } | null>(null);

  async function handleAction(
    orderId: string,
    status: OrderStatus,
    estimasiSelesai?: string,
    harga?: number,
    dp?: number,
    sisa_bayar?: number,
    penyesuaian_nominal?: number,
    penyesuaian_keterangan?: string,
  ) {
    setLoadingOrderId(orderId);
    try {
      await updateOrder.mutateAsync({
        orderId,
        status,
        estimasi_selesai: estimasiSelesai,
        harga,
        dp,
        sisa_bayar,
        penyesuaian_nominal,
        penyesuaian_keterangan,
      });
      toast({
        title: "Status diperbarui",
        description: "→ " + (STATUS_LABEL[status] || status),
      });
      refetch();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: err.message,
      });
    } finally {
      setLoadingOrderId(null);
    }
  }

  const count = (s: string) => orders.filter((o) => o.status === s).length;
  const needsAction = orders.filter((o) =>
    ["verifikasi tugas", "proses pengerjaan", "revisi"].includes(o.status),
  ).length;

  return (
    <Layout>
      {verifikasiDialog &&
        (() => {
          const ord = verifikasiDialog.order;
          const hargaAsal = Number(ord.harga) || 0;
          const nominal = Number(verifikasiDialog.penyesuaianNominal) || 0;
          const hargaFinal = hargaAsal + nominal;
          const dpFinal = Math.ceil(hargaFinal * 0.33);
          const sisaFinal = Math.max(0, hargaFinal - dpFinal);

          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
                {verifikasiDialog.step === 1 ? (
                  <>
                    <h3 className="font-semibold text-slate-800 text-lg">
                      Verifikasi Order
                    </h3>
                    <p className="text-sm text-slate-500">
                      Sesuaikan harga jika diperlukan, atau langsung lanjut
                      tanpa perubahan.
                    </p>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Nominal Penyesuaian (+ tambah / - diskon)
                        </label>
                        <input
                          type="number"
                          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="0 (kosongkan jika tidak ada penyesuaian)"
                          value={verifikasiDialog.penyesuaianNominal}
                          onChange={(e) =>
                            setVerifikasiDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    penyesuaianNominal: e.target.value,
                                  }
                                : null,
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-600">
                          Keterangan Penyesuaian (opsional)
                        </label>
                        <input
                          type="text"
                          className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Contoh: biaya tambahan referensi jurnal"
                          value={verifikasiDialog.penyesuaianKeterangan}
                          onChange={(e) =>
                            setVerifikasiDialog((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    penyesuaianKeterangan: e.target.value,
                                  }
                                : null,
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Harga asal</span>
                        <span>{formatRupiah(hargaAsal)}</span>
                      </div>
                      {nominal !== 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Penyesuaian</span>
                          <span
                            className={
                              nominal > 0 ? "text-red-600" : "text-green-600"
                            }
                          >
                            {nominal > 0 ? "+" : ""}
                            {formatRupiah(nominal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5">
                        <span>Harga Final</span>
                        <span className="text-primary">
                          {formatRupiah(hargaFinal)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>DP (33%)</span>
                        <span>{formatRupiah(dpFinal)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Sisa bayar</span>
                        <span>{formatRupiah(sisaFinal)}</span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setVerifikasiDialog(null)}
                      >
                        Batal
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() =>
                          setVerifikasiDialog((prev) =>
                            prev ? { ...prev, step: 2 } : null,
                          )
                        }
                      >
                        Lanjut
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-slate-800 text-lg">
                      Konfirmasi Verifikasi
                    </h3>
                    <p className="text-sm text-slate-500">
                      Data berikut akan disimpan dan tidak bisa diubah kembali.
                    </p>

                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Harga sebelum</span>
                        <span>{formatRupiah(hargaAsal)}</span>
                      </div>
                      {nominal !== 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Penyesuaian</span>
                          <span
                            className={
                              nominal > 0 ? "text-red-600" : "text-green-600"
                            }
                          >
                            {nominal > 0 ? "+" : ""}
                            {formatRupiah(nominal)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-slate-800 border-t border-slate-200 pt-1.5">
                        <span>Harga Final</span>
                        <span className="text-primary">
                          {formatRupiah(hargaFinal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          setVerifikasiDialog((prev) =>
                            prev ? { ...prev, step: 1 } : null,
                          )
                        }
                      >
                        Kembali
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={loadingOrderId === ord.order_id}
                        onClick={() => {
                          handleAction(
                            ord.order_id,
                            "menunggu pembayaran dp",
                            undefined,
                            hargaFinal,
                            dpFinal,
                            sisaFinal,
                            nominal !== 0 ? nominal : undefined,
                            verifikasiDialog.penyesuaianKeterangan || undefined,
                          );
                          setVerifikasiDialog(null);
                        }}
                      >
                        {loadingOrderId === ord.order_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Konfirmasi & Verifikasi"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      {uploadDialog?.type === "hasil_pertama" && (
        <UploadDialog
          orderId={uploadDialog.orderId}
          title="Upload File Hasil Tugas"
          description="Upload file hasil tugas. Status otomatis berubah ke Menunggu Pelunasan setelah upload berhasil."
          onSuccess={() => {
            setUploadDialog(null);
            refetch();
          }}
          onCancel={() => setUploadDialog(null)}
        />
      )}
      {uploadDialog?.type === "hasil_revisi" && (
        <UploadDialog
          orderId={uploadDialog.orderId}
          title="Upload Hasil Revisi"
          description="Upload file hasil revisi. Status berubah ke Cek File — customer download dan konfirmasi."
          onSuccess={() => {
            setUploadDialog(null);
            refetch();
          }}
          onCancel={() => setUploadDialog(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Ikuti alur tombol di setiap baris — tidak bisa loncat langkah.
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isFetching}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={"w-4 h-4 mr-2 " + (isFetching ? "animate-spin" : "")}
            />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">
                Total Order
              </p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-orange-700 mb-1">
                Perlu Tindakan
              </p>
              <p className="text-2xl font-bold text-orange-800">
                {needsAction}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">
                Dikerjakan
              </p>
              <p className="text-2xl font-bold text-blue-800">
                {count("proses pengerjaan")}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Selesai</p>
              <p className="text-2xl font-bold text-green-800">
                {count("selesai")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alur referensi */}
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Alur Status
            </p>
            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
              {[
                "Verifikasi Tugas",
                "Menunggu Pembayaran DP",
                "Proses Pengerjaan",
                "Menunggu Pelunasan",
                "Pelunasan Diterima",
                "Cek File",
                "Revisi",
                "Selesai",
              ].map((s, i, arr) => (
                <React.Fragment key={s}>
                  <span className="bg-white border border-slate-200 rounded px-2 py-0.5">
                    {s}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabel */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mr-2" /> Memuat data...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                Belum ada pesanan masuk.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Order ID</TableHead>
                      <TableHead>Nama & WA</TableHead>
                      <TableHead>Tugas</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Catatan & File</TableHead>
                      <TableHead className="w-[240px]">
                        Status & Aksi Admin
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow
                        key={order.order_id}
                        className={
                          [
                            "verifikasi tugas",
                            "proses pengerjaan",
                            "revisi",
                          ].includes(order.status)
                            ? "bg-orange-50/30"
                            : ""
                        }
                      >
                        <TableCell>
                          <div className="font-mono text-xs text-slate-700 break-all">
                            {order.order_id}
                          </div>
                          {order.created_at && (
                            <div className="text-xs text-slate-400 mt-0.5">
                              {new Date(order.created_at).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "2-digit",
                                },
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">
                            {order.nama}
                          </div>
                          <div className="text-xs text-slate-500">
                            {order.wa}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="mb-1 text-xs">
                            {order.jenis}
                          </Badge>
                          <div className="text-xs text-slate-500">
                            {order.halaman} hal/slide
                          </div>
                          {order.tipe_order &&
                            order.tipe_order !== "standar" && (
                              <Badge
                                variant="outline"
                                className="text-xs mt-1 capitalize"
                              >
                                {order.tipe_order}
                              </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">
                            {order.harga
                              ? formatRupiah(Number(order.harga))
                              : "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            DP:{" "}
                            {order.dp ? formatRupiah(Number(order.dp)) : "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Sisa:{" "}
                            {order.sisa_bayar
                              ? formatRupiah(Number(order.sisa_bayar))
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1.5 min-w-[110px]">
                            {order.note && String(order.note).trim() && (
                              <button
                                onClick={() =>
                                  downloadTxt(
                                    "catatan-order-" + order.order_id + ".txt",
                                    String(order.note),
                                  )
                                }
                                className="flex items-center gap-1 text-xs text-slate-600 hover:text-primary transition-colors text-left"
                              >
                                <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                                <span className="underline underline-offset-2">
                                  Catatan Order.txt
                                </span>
                              </button>
                            )}
                            {order.file_tugas_url &&
                              String(order.file_tugas_url).trim() && (
                                <a
                                  href={String(order.file_tugas_url).trim()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" /> File
                                  Pendukung
                                </a>
                              )}
                            {order.hasil_url && (
                              <a
                                href={order.hasil_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" /> Hasil
                              </a>
                            )}
                            {!order.note &&
                              !order.file_tugas_url &&
                              !order.hasil_url && (
                                <span className="text-xs text-slate-400">
                                  -
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Badge
                              variant="outline"
                              className={
                                "text-xs w-full text-center justify-center " +
                                statusCls(order.status)
                              }
                            >
                              {STATUS_LABEL[order.status] || order.status}
                            </Badge>
                            <AdminActionCell
                              order={order}
                              onOpenUpload={(orderId, type) =>
                                setUploadDialog({ orderId, type })
                              }
                              onOpenVerifikasi={(order) =>
                                setVerifikasiDialog({
                                  order,
                                  step: 1,
                                  penyesuaianNominal: "",
                                  penyesuaianKeterangan: "",
                                })
                              }
                              loading={loadingOrderId === order.order_id}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
