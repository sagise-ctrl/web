import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LockKeyhole, RefreshCw, Loader2, ExternalLink, Upload, CheckCircle, X } from "lucide-react";
import {
  useGetAllOrders, useUpdateOrder, useUploadBukti,
  type OrderStatus, formatRupiah,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function statusCls(status: string) {
  const map: Record<string, string> = {
    "verifikasi tugas":           "bg-orange-50 text-orange-700 border-orange-200",
    "pembayaran awal":            "bg-amber-50 text-amber-700 border-amber-200",
    "verifikasi pembayaran awal": "bg-purple-50 text-purple-700 border-purple-200",
    "proses pengerjaan":          "bg-blue-50 text-blue-700 border-blue-200",
    "menunggu pelunasan":         "bg-cyan-50 text-cyan-700 border-cyan-200",
    "menunggu verifikasi":        "bg-violet-50 text-violet-700 border-violet-200",
    "cek file":                   "bg-indigo-50 text-indigo-700 border-indigo-200",
    "revisi":                     "bg-yellow-50 text-yellow-700 border-yellow-200",
    "selesai":                    "bg-green-50 text-green-700 border-green-200",
  };
  return map[status] || "bg-slate-50 text-slate-700 border-slate-200";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Dialog upload hasil (sebelum set "menunggu pelunasan") ────
function UploadHasilDialog({
  orderId, title, nextStatus, description, onSuccess, onCancel,
}: {
  orderId: string;
  title: string;
  nextStatus: OrderStatus;
  description: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const uploadBukti = useUploadBukti();
  const updateOrder = useUpdateOrder();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      await uploadBukti.mutateAsync({ orderId, tipe: "hasil", fileBase64: base64, fileName: file.name });
      // Jika nextStatus bukan "menunggu pelunasan" (sudah diatur oleh GAS untuk upload hasil),
      // update manual jika perlu ke status lain
      if (nextStatus !== "menunggu pelunasan") {
        await updateOrder.mutateAsync({ orderId, status: nextStatus });
      }
      toast({ title: "File berhasil diupload", description: `Status → ${nextStatus}` });
      onSuccess();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Upload", description: err.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
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
              <p className="text-xs text-slate-400">PDF, DOC, DOCX, PPT, PPTX, JPG</p>
            </>
          )}
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
          <Button className="flex-1" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : "Upload & Set Status"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Login ─────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") setIsAuthenticated(true);
    else alert("Password salah");
  };

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
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="password" placeholder="Masukkan password..." value={password}
                  onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
                <Button type="submit" className="w-full">Masuk</Button>
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
  const { data: orders = [], isLoading, refetch, isFetching } = useGetAllOrders();
  const updateOrder = useUpdateOrder();

  // Dialog state: { orderId, type }
  const [uploadDialog, setUploadDialog] = useState<{ orderId: string; type: "hasil" | "hasil_revisi" } | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Jika set ke "menunggu pelunasan", wajib upload file hasil dulu
    if (newStatus === "menunggu pelunasan") {
      setUploadDialog({ orderId, type: "hasil" });
      return;
    }
    // Jika set ke "cek file" dari status revisi, wajib upload hasil revisi dulu
    if (newStatus === "cek file") {
      const order = orders.find(o => o.order_id === orderId);
      if (order?.status === "revisi") {
        setUploadDialog({ orderId, type: "hasil_revisi" });
        return;
      }
    }
    try {
      await updateOrder.mutateAsync({ orderId, status: newStatus as OrderStatus });
      toast({ title: "Status diperbarui", description: `${orderId} → ${newStatus}` });
      refetch();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal update", description: error.message });
    }
  };

  const count = (s: string) => orders.filter(o => o.status === s).length;
  const needsAction = orders.filter(o =>
    o.status === "verifikasi tugas" || o.status === "verifikasi pembayaran awal" || o.status === "menunggu verifikasi"
  ).length;

  return (
    <Layout>
      {/* Upload dialog */}
      {uploadDialog?.type === "hasil" && (
        <UploadHasilDialog
          orderId={uploadDialog.orderId}
          title="Upload File Hasil Tugas"
          nextStatus="menunggu pelunasan"
          description="Upload file hasil tugas sebelum mengubah status. Status akan berubah ke Menunggu Pelunasan setelah upload berhasil."
          onSuccess={() => { setUploadDialog(null); refetch(); }}
          onCancel={() => setUploadDialog(null)}
        />
      )}
      {uploadDialog?.type === "hasil_revisi" && (
        <UploadHasilDialog
          orderId={uploadDialog.orderId}
          title="Upload Hasil Revisi"
          nextStatus="cek file"
          description="Upload file hasil revisi. Status akan berubah ke Cek File agar customer bisa mengunduh."
          onSuccess={() => { setUploadDialog(null); refetch(); }}
          onCancel={() => setUploadDialog(null)}
        />
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <Button onClick={() => refetch()} variant="outline" disabled={isFetching} className="w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 mb-1">Total Order</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-orange-700 mb-1">Perlu Tindakan</p>
              <p className="text-2xl font-bold text-orange-800">{needsAction}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-blue-700 mb-1">Dikerjakan</p>
              <p className="text-2xl font-bold text-blue-800">{count("proses pengerjaan")}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Selesai</p>
              <p className="text-2xl font-bold text-green-800">{count("selesai")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Daftar Pesanan</CardTitle></CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 flex justify-center items-center text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin mr-2" /> Memuat data...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-slate-500">Belum ada pesanan masuk.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Nama & WA</TableHead>
                      <TableHead>Tugas</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>File</TableHead>
                      <TableHead>Status & Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{order.order_id}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{order.nama}</div>
                          <div className="text-xs text-slate-500">{order.wa}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="mb-1 text-xs">{order.jenis}</Badge>
                          <div className="text-xs text-slate-500">{order.halaman} hal/slide</div>
                          {order.tipe_order && order.tipe_order !== "standar" && (
                            <Badge variant="outline" className="text-xs mt-1 capitalize">{order.tipe_order}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">{order.harga ? formatRupiah(Number(order.harga)) : "-"}</div>
                          <div className="text-xs text-slate-500">DP: {order.dp ? formatRupiah(Number(order.dp)) : "-"}</div>
                          <div className="text-xs text-slate-500">Sisa: {order.sisa_bayar ? formatRupiah(Number(order.sisa_bayar)) : "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[110px]">
                            {order.bukti_dp_url && (
                              <a href={order.bukti_dp_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Bukti DP
                              </a>
                            )}
                            {order.bukti_pelunasan_url && (
                              <a href={order.bukti_pelunasan_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Bukti Lunas
                              </a>
                            )}
                            {order.hasil_url && (
                              <a href={order.hasil_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-green-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> Hasil
                              </a>
                            )}
                            {order.revisi_catatan && (
                              <div className="text-xs text-yellow-700 p-1 bg-yellow-50 rounded mt-1">
                                <span className="font-medium">Revisi:</span> {String(order.revisi_catatan).slice(0, 50)}{String(order.revisi_catatan).length > 50 ? "…" : ""}
                              </div>
                            )}
                            {order.revisi_file_urls && String(order.revisi_file_urls).trim() &&
                              String(order.revisi_file_urls).split(",").filter(Boolean).map((url, i) => (
                                <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-yellow-600 hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> File Revisi {i + 1}
                                </a>
                              ))
                            }
                            {!order.bukti_dp_url && !order.hasil_url && !order.revisi_catatan && (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2 min-w-[175px]">
                            <Badge variant="outline" className={`text-xs block text-center ${statusCls(order.status)}`}>
                              {order.status}
                            </Badge>
                            <Select value={order.status} onValueChange={val => handleStatusChange(order.order_id, val)}>
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verifikasi tugas">Verifikasi Tugas</SelectItem>
                                <SelectItem value="pembayaran awal">Pembayaran Awal</SelectItem>
                                <SelectItem value="verifikasi pembayaran awal">Verifikasi Pembayaran Awal</SelectItem>
                                <SelectItem value="proses pengerjaan">Proses Pengerjaan</SelectItem>
                                <SelectItem value="menunggu pelunasan">⚠️ Menunggu Pelunasan</SelectItem>
                                <SelectItem value="menunggu verifikasi">Menunggu Verifikasi</SelectItem>
                                <SelectItem value="cek file">⚠️ Cek File</SelectItem>
                                <SelectItem value="revisi">Revisi</SelectItem>
                                <SelectItem value="selesai">Selesai</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-400">⚠️ = wajib upload file</p>
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
