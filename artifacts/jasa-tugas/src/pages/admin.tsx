import React, { useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LockKeyhole, RefreshCw, Loader2, ExternalLink, Upload, CheckCircle, X } from "lucide-react";
import {
  useGetAllOrders, useUpdateOrder, useUploadBukti,
  type OrderStatus, formatRupiah,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function statusBadgeClass(status: string) {
  switch (status) {
    case "verifikasi tugas": return "bg-orange-50 text-orange-700 border-orange-200";
    case "menunggu verifikasi": return "bg-purple-50 text-purple-700 border-purple-200";
    case "proses pengerjaan": return "bg-blue-50 text-blue-700 border-blue-200";
    case "menunggu pelunasan": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "cek file": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "revisi": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "selesai": return "bg-green-50 text-green-700 border-green-200";
    default: return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

// Dialog upload hasil sebelum set "menunggu pelunasan"
function UploadHasilDialog({
  orderId,
  onSuccess,
  onCancel,
}: {
  orderId: string;
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
      toast({ title: "File hasil berhasil diupload", description: "Status diubah ke Menunggu Pelunasan." });
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
          <h3 className="font-bold text-lg text-slate-900">Upload File Hasil Tugas</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm text-slate-600">
          Upload file hasil tugas terlebih dahulu. Status akan berubah ke <strong>Menunggu Pelunasan</strong> secara otomatis setelah upload berhasil.
        </p>
        <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
          {file ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-500">Klik untuk pilih file hasil tugas</p>
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

// Dialog upload hasil revisi (untuk update file setelah revisi selesai dikerjakan)
function UploadHasilRevisiDialog({
  orderId,
  onSuccess,
  onCancel,
}: {
  orderId: string;
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
      await uploadBukti.mutateAsync({
        orderId,
        tipe: "hasil",
        fileBase64: base64,
        fileName: file.name,
      });
      // Setelah upload hasil revisi, set status ke "cek file"
      await updateOrder.mutateAsync({ orderId, status: "cek file" });
      toast({ title: "Hasil revisi diupload", description: "Status diubah ke Cek File." });
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
          <h3 className="font-bold text-lg text-slate-900">Upload Hasil Revisi</h3>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </div>
        <p className="text-sm text-slate-600">
          Upload file hasil revisi. Status akan berubah ke <strong>Cek File</strong> agar customer bisa mengunduh.
        </p>
        <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
          {file ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{file.name}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-slate-400" />
              <p className="text-sm text-slate-500">Klik untuk pilih file hasil revisi</p>
            </>
          )}
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" className="hidden"
            onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Batal</Button>
          <Button className="flex-1" disabled={!file || uploading} onClick={handleUpload}>
            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : "Upload & Set Cek File"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Login ────────────────────────────────────────────────────
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
                  onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
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

// ─── Dashboard ────────────────────────────────────────────────
function AdminDashboard() {
  const { toast } = useToast();
  const { data: orders = [], isLoading, refetch, isFetching } = useGetAllOrders();
  const updateOrder = useUpdateOrder();

  // Dialog state
  const [uploadHasilFor, setUploadHasilFor] = useState<string | null>(null);
  const [uploadRevisiFor, setUploadRevisiFor] = useState<string | null>(null);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Intercept: jika menuju "menunggu pelunasan", wajib upload hasil dulu
    if (newStatus === "menunggu pelunasan") {
      setUploadHasilFor(orderId);
      return;
    }
    // Intercept: jika menuju "cek file" dari revisi, wajib upload hasil revisi dulu
    if (newStatus === "cek file") {
      const order = orders.find(o => o.order_id === orderId);
      if (order?.status === "revisi") {
        setUploadRevisiFor(orderId);
        return;
      }
    }
    try {
      await updateOrder.mutateAsync({ orderId, status: newStatus as OrderStatus });
      toast({ title: "Status diperbarui", description: `Order ${orderId} → ${newStatus}` });
      refetch();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal update", description: error.message });
    }
  };

  const countByStatus = (s: string) => orders.filter(o => o.status === s).length;
  const needsAction = orders.filter(o =>
    o.status === "verifikasi tugas" || o.status === "menunggu verifikasi"
  ).length;

  return (
    <Layout>
      {uploadHasilFor && (
        <UploadHasilDialog
          orderId={uploadHasilFor}
          onSuccess={() => { setUploadHasilFor(null); refetch(); }}
          onCancel={() => setUploadHasilFor(null)}
        />
      )}
      {uploadRevisiFor && (
        <UploadHasilRevisiDialog
          orderId={uploadRevisiFor}
          onSuccess={() => { setUploadRevisiFor(null); refetch(); }}
          onCancel={() => setUploadRevisiFor(null)}
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
              <p className="text-2xl font-bold text-blue-800">{countByStatus("proses pengerjaan")}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-green-700 mb-1">Selesai</p>
              <p className="text-2xl font-bold text-green-800">{countByStatus("selesai")}</p>
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
                      <TableHead>File & Revisi</TableHead>
                      <TableHead>Status</TableHead>
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
                          <div className="flex flex-col gap-1 min-w-[120px]">
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
                              <div className="text-xs text-yellow-700 mt-1 p-1 bg-yellow-50 rounded">
                                <span className="font-medium">Catatan revisi:</span> {String(order.revisi_catatan).slice(0, 60)}{String(order.revisi_catatan).length > 60 ? "..." : ""}
                              </div>
                            )}
                            {order.revisi_file_urls && String(order.revisi_file_urls).trim() && (
                              String(order.revisi_file_urls).split(",").filter(Boolean).map((url, i) => (
                                <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-yellow-600 hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> File Revisi {i + 1}
                                </a>
                              ))
                            )}
                            {!order.bukti_dp_url && !order.hasil_url && !order.revisi_catatan && (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={`text-xs whitespace-nowrap ${statusBadgeClass(order.status)}`}>
                              {order.status}
                            </Badge>
                            <Select value={order.status} onValueChange={(val) => handleStatusChange(order.order_id, val)}>
                              <SelectTrigger className="w-[170px] h-7 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="verifikasi tugas">Verifikasi Tugas</SelectItem>
                                <SelectItem value="proses pengerjaan">Proses Pengerjaan</SelectItem>
                                <SelectItem value="menunggu pelunasan">Menunggu Pelunasan ⚠️</SelectItem>
                                <SelectItem value="menunggu verifikasi">Menunggu Verifikasi</SelectItem>
                                <SelectItem value="cek file">Cek File</SelectItem>
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
