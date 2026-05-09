import React, { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, Loader2, FileText, BookOpen, User,
  CreditCard, Upload, CheckCircle, AlertCircle, Download, X,
} from "lucide-react";
import {
  useGetOrder, useUploadBukti, useSubmitRevisi, useMarkSelesai,
  type OrderStatus, formatRupiah, formatEstimasi,
} from "@/hooks/use-orders";
import { CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Status badge ──────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  "verifikasi tugas":          { label: "Menunggu Verifikasi", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  "pembayaran awal":           { label: "Menunggu Pembayaran DP", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  "verifikasi pembayaran awal":{ label: "Verifikasi DP", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  "proses pengerjaan":         { label: "Sedang Dikerjakan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  "menunggu pelunasan":        { label: "Menunggu Pelunasan", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  "menunggu verifikasi":       { label: "Verifikasi Pelunasan", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  "cek file":                  { label: "Cek File", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  "revisi":                    { label: "Sedang Direvisi", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  "selesai":                   { label: "Selesai", cls: "bg-green-50 text-green-700 border-green-200" },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const info = STATUS_MAP[status] || { label: status, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return <Badge variant="outline" className={`text-sm px-3 py-1 ${info.cls}`}>{info.label}</Badge>;
}

// ─── Progress bar ──────────────────────────────────────────────
const PROGRESS_STEPS = [
  { keys: ["verifikasi tugas"],                           label: "Verifikasi" },
  { keys: ["pembayaran awal", "verifikasi pembayaran awal"], label: "DP" },
  { keys: ["proses pengerjaan"],                          label: "Dikerjakan" },
  { keys: ["menunggu pelunasan", "menunggu verifikasi"],  label: "Pelunasan" },
  { keys: ["cek file", "revisi"],                         label: "Cek File" },
  { keys: ["selesai"],                                    label: "Selesai" },
];

function ProgressBar({ status }: { status: OrderStatus }) {
  const idx = PROGRESS_STEPS.findIndex(s => s.keys.includes(status));
  const current = idx === -1 ? 0 : idx;

  return (
    <div className="flex items-center gap-0 py-4 px-1">
      {PROGRESS_STEPS.map((s, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i < current ? "bg-primary border-primary text-white" :
                i === current ? "bg-primary border-primary text-white scale-110" :
                  "bg-white border-slate-200 text-slate-400"}`}>
              {i < current ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 text-center leading-tight max-w-[46px]
              ${i === current ? "text-primary font-semibold" : i < current ? "text-slate-600" : "text-slate-400"}`}>
              {s.label}
            </span>
          </div>
          {i < PROGRESS_STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 mx-0.5 transition-all ${i < current ? "bg-primary" : "bg-slate-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Upload area ──────────────────────────────────────────────
function UploadArea({
  file, onFileChange, accept = ".jpg,.jpeg,.pdf", hint = "JPG atau PDF",
}: {
  file: File | null;
  onFileChange: (f: File | null) => void;
  accept?: string;
  hint?: string;
}) {
  return (
    <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
      {file ? (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{file.name}</span>
        </div>
      ) : (
        <>
          <Upload className="w-7 h-7 text-slate-400" />
          <p className="text-sm text-slate-500">Klik untuk pilih file</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </>
      )}
      <input type="file" accept={accept} className="hidden"
        onChange={e => onFileChange(e.target.files?.[0] || null)} />
    </label>
  );
}

// ─── Main Page ─────────────────────────────────────────────────
export default function TrackPage() {
  const [searchId, setSearchId] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const { toast } = useToast();
  const uploadBukti = useUploadBukti();
  const submitRevisi = useSubmitRevisi();
  const markSelesai = useMarkSelesai();

  const [dpFile, setDpFile] = useState<File | null>(null);
  const [uploadingDp, setUploadingDp] = useState(false);

  const [pelunasanFile, setPelunasanFile] = useState<File | null>(null);
  const [uploadingPelunasan, setUploadingPelunasan] = useState(false);

  const [showRevisiForm, setShowRevisiForm] = useState(false);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  const [revisiFiles, setRevisiFiles] = useState<File[]>([]);
  const [submittingRevisi, setSubmittingRevisi] = useState(false);
  const [markingSelesai, setMarkingSelesai] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) { setSearchId(id); setSubmittedId(id); }
  }, []);

  const { data: order, isLoading, isError, error, isSuccess, refetch } = useGetOrder(submittedId);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setSubmittedId(searchId.trim());
      const url = new URL(window.location.href);
      url.searchParams.set("id", searchId.trim());
      window.history.pushState({}, "", url.toString());
    }
  };

  // Upload bukti DP
  async function onUploadDp() {
    if (!dpFile || !order) return;
    setUploadingDp(true);
    try {
      const base64 = await fileToBase64(dpFile);
      await uploadBukti.mutateAsync({ orderId: order.order_id, tipe: "bukti_dp", fileBase64: base64, fileName: dpFile.name });
      toast({ title: "Bukti DP terkirim!", description: "Admin akan memverifikasi pembayaran DP Anda." });
      setDpFile(null);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Upload", description: err.message });
    } finally {
      setUploadingDp(false); }
  }

  // Upload bukti pelunasan
  async function onUploadPelunasan() {
    if (!pelunasanFile || !order) return;
    setUploadingPelunasan(true);
    try {
      const base64 = await fileToBase64(pelunasanFile);
      await uploadBukti.mutateAsync({ orderId: order.order_id, tipe: "bukti_pelunasan", fileBase64: base64, fileName: pelunasanFile.name });
      toast({ title: "Bukti pelunasan terkirim!", description: "Admin akan memverifikasi dan mengaktifkan file unduhan." });
      setPelunasanFile(null);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Upload", description: err.message });
    } finally {
      setUploadingPelunasan(false);
    }
  }

  // Submit revisi
  async function onSubmitRevisi() {
    if (!order) return;
    if (Number(order.revisi_count) >= 1) {
      toast({ variant: "destructive", title: "Revisi Habis", description: "Revisi gratis hanya 1 kali." });
      return;
    }
    setSubmittingRevisi(true);
    try {
      const filesData = await Promise.all(revisiFiles.map(async f => ({ base64: await fileToBase64(f), name: f.name })));
      await submitRevisi.mutateAsync({ orderId: order.order_id, catatan: revisiCatatan, files: filesData });
      toast({ title: "Revisi diajukan!", description: "Admin akan segera mengerjakan revisi Anda." });
      setShowRevisiForm(false); setRevisiCatatan(""); setRevisiFiles([]);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Submit Revisi", description: err.message });
    } finally {
      setSubmittingRevisi(false);
    }
  }

  // Mark selesai
  async function onMarkSelesai() {
    if (!order) return;
    setMarkingSelesai(true);
    try {
      await markSelesai.mutateAsync(order.order_id);
      toast({ title: "Order selesai!", description: "Terima kasih telah menggunakan layanan kami." });
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    } finally {
      setMarkingSelesai(false);
    }
  }

  const harga = order?.harga ? Number(order.harga) : 0;
  const dp = order?.dp ? Number(order.dp) : 10000;
  const sisa = order?.sisa_bayar ? Number(order.sisa_bayar) : Math.max(0, harga - dp);
  const sudahRevisi = Number(order?.revisi_count) >= 1;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Lacak Status Pesanan</h1>
          <p className="text-slate-500">Masukkan Order ID Anda untuk melihat perkembangan tugas.</p>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input value={searchId} onChange={e => setSearchId(e.target.value)}
                  placeholder="Contoh: ORD-1234567890-123" className="pl-10 h-12 text-base" />
              </div>
              <Button type="submit" className="h-12 px-6" disabled={!searchId.trim() || isLoading}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Cari"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isError && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-8 text-center text-red-800">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
              <h3 className="font-semibold text-lg mb-1">Order Tidak Ditemukan</h3>
              <p className="text-red-600">{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {isSuccess && order && (
          <div className="space-y-4">
            {/* Detail card */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Order ID</p>
                  <p className="text-lg font-bold tracking-tight text-slate-900">{order.order_id}</p>
                </div>
                <div className="flex flex-col sm:items-end gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <CardContent className="p-4">
                <ProgressBar status={order.status} />
              </CardContent>
              <CardContent className="p-0 border-t border-slate-100">
                <dl className="divide-y divide-slate-100">
                  <Row icon={<User className="w-4 h-4" />} label="Pemesan" value={order.nama} />
                  <Row icon={<BookOpen className="w-4 h-4" />} label="Jenis Tugas" value={
                    <span>
                      {order.jenis}
                      {order.tipe_order && order.tipe_order !== "standar" && (
                        <Badge variant="outline" className="ml-2 text-xs capitalize">{order.tipe_order}</Badge>
                      )}
                    </span>
                  } />
                  <Row icon={<FileText className="w-4 h-4" />} label="Halaman / Slide / Lembar" value={`${order.halaman}`} />
                  {harga > 0 && (
                    <Row icon={<CreditCard className="w-4 h-4" />} label="Rincian Harga" value={
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatRupiah(harga)}</div>
                        <div className="text-xs text-slate-500">DP: {formatRupiah(dp)} | Sisa: {formatRupiah(sisa)}</div>
                      </div>
                    } />
                  )}
                  {order.note && <Row icon={<FileText className="w-4 h-4" />} label="Catatan" value={order.note} />}
                </dl>
              </CardContent>
            </Card>

            {/* ── Menunggu Verifikasi Admin ── */}
            {order.status === "verifikasi tugas" && (
              <Alert className="bg-orange-50 border-orange-200">
                <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
                <AlertTitle className="text-orange-800">Pesanan Sedang Diverifikasi</AlertTitle>
                <AlertDescription className="text-orange-700">
                  Admin sedang memeriksa detail pesanan Anda. Setelah diverifikasi, Anda akan diminta melakukan pembayaran DP.
                </AlertDescription>
              </Alert>
            )}

            {/* ── Pembayaran Awal (DP) ── */}
            {order.status === "pembayaran awal" && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <CreditCard className="w-5 h-5" />
                    <span>Lakukan Pembayaran DP</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Pesanan Anda telah diverifikasi! Bayar DP <strong>{formatRupiah(dp)}</strong> via QRIS untuk memulai pengerjaan.
                  </p>
                  {/* QRIS placeholder */}
                  <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-6 text-center">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Scan QRIS untuk DP {formatRupiah(dp)}</p>
                    <p className="text-xs text-slate-400 mt-1">(Upload gambar QRIS ke public/qris.png)</p>
                  </div>
                  <UploadArea file={dpFile} onFileChange={setDpFile} hint="JPG atau PDF" />
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={!dpFile || uploadingDp} onClick={onUploadDp}>
                    {uploadingDp ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : "Kirim Bukti Transfer DP"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Verifikasi Pembayaran Awal ── */}
            {order.status === "verifikasi pembayaran awal" && (
              <Alert className="bg-purple-50 border-purple-200">
                <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                <AlertTitle className="text-purple-800">DP Sedang Diverifikasi</AlertTitle>
                <AlertDescription className="text-purple-700">
                  Admin sedang memverifikasi bukti DP Anda. Pengerjaan akan dimulai setelah DP terverifikasi.
                </AlertDescription>
              </Alert>
            )}

            {/* ── Proses Pengerjaan ── */}
            {order.status === "proses pengerjaan" && (
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertTitle className="text-blue-800">Tugas Sedang Dikerjakan</AlertTitle>
                  <AlertDescription className="text-blue-700">
                    DP Anda sudah terverifikasi. Tugas sedang dalam proses pengerjaan, kami akan menghubungi Anda jika ada pertanyaan.
                  </AlertDescription>
                </Alert>
                {order.estimasi_selesai && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <CalendarClock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Estimasi Maksimal Selesai</p>
                      <p className="text-sm text-blue-700 mt-0.5">{formatEstimasi(order.estimasi_selesai)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Menunggu Pelunasan ── */}
            {order.status === "menunggu pelunasan" && (
              <Card className="border-cyan-200 bg-cyan-50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-800 font-semibold">
                    <CreditCard className="w-5 h-5" />
                    <span>Lakukan Pembayaran Pelunasan</span>
                  </div>
                  <p className="text-sm text-cyan-700">
                    Tugas Anda sudah selesai! Bayar sisa <strong>{formatRupiah(sisa)}</strong> via QRIS untuk mengaktifkan file unduhan.
                  </p>
                  <div className="bg-white border-2 border-dashed border-cyan-300 rounded-xl p-6 text-center">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Scan QRIS untuk pelunasan {formatRupiah(sisa)}</p>
                    <p className="text-xs text-slate-400 mt-1">(Upload gambar QRIS ke public/qris.png)</p>
                  </div>
                  <UploadArea file={pelunasanFile} onFileChange={setPelunasanFile} hint="JPG atau PDF" />
                  <Button className="w-full" disabled={!pelunasanFile || uploadingPelunasan} onClick={onUploadPelunasan}>
                    {uploadingPelunasan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : "Kirim Bukti Pelunasan"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* ── Menunggu Verifikasi Pelunasan ── */}
            {order.status === "menunggu verifikasi" && (
              <Alert className="bg-purple-50 border-purple-200">
                <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                <AlertTitle className="text-purple-800">Pelunasan Sedang Diverifikasi</AlertTitle>
                <AlertDescription className="text-purple-700">
                  Bukti pelunasan Anda sedang diverifikasi admin. File akan tersedia setelah disetujui.
                </AlertDescription>
              </Alert>
            )}

            {/* ── Cek File ── */}
            {order.status === "cek file" && order.hasil_url && (
              <Card className="border-indigo-200 bg-indigo-50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-indigo-800 font-semibold">
                    <Download className="w-5 h-5" />
                    <span>File Hasil Tugas Siap Diunduh</span>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Revisi Gratis 1 Kali</AlertTitle>
                    <AlertDescription className="text-amber-700">
                      Periksa file dengan teliti.{" "}
                      {sudahRevisi
                        ? "Revisi gratis sudah digunakan."
                        : "Jika ada yang perlu diubah, gunakan tombol Revisi di bawah (1 kali gratis)."}
                    </AlertDescription>
                  </Alert>

                  <a href={order.hasil_url} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                      <Download className="w-4 h-4 mr-2" /> Unduh File Hasil Tugas
                    </Button>
                  </a>

                  {!showRevisiForm ? (
                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                        disabled={markingSelesai} onClick={onMarkSelesai}>
                        {markingSelesai
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <><CheckCircle className="w-4 h-4 mr-2" />Selesai, Terima Hasil</>}
                      </Button>
                      {!sudahRevisi && (
                        <Button variant="outline" className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                          onClick={() => setShowRevisiForm(true)}>
                          Ajukan Revisi (Gratis 1x)
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-yellow-200 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-yellow-800">Form Revisi</h4>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowRevisiForm(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Catatan Revisi (maks 1000 karakter)</label>
                        <Textarea
                          placeholder="Jelaskan bagian yang perlu direvisi..."
                          className="min-h-[100px] resize-none"
                          maxLength={1000}
                          value={revisiCatatan}
                          onChange={e => setRevisiCatatan(e.target.value)}
                        />
                        <p className="text-xs text-right text-slate-400">{revisiCatatan.length}/1000</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Upload File Referensi Revisi (JPG, maks 5 file)
                        </label>
                        {revisiFiles.length < 5 && (
                          <label className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-yellow-400 transition-colors flex flex-col items-center gap-1">
                            <Upload className="w-6 h-6 text-slate-400" />
                            <p className="text-sm text-slate-500">Klik untuk tambah file JPG</p>
                            <input type="file" accept=".jpg,.jpeg" className="hidden" multiple
                              onChange={e => {
                                const files = Array.from(e.target.files || []);
                                setRevisiFiles(prev => [...prev, ...files].slice(0, 5));
                              }} />
                          </label>
                        )}
                        {revisiFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                            <span className="text-xs text-slate-600 truncate flex-1">{f.name}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2"
                              onClick={() => setRevisiFiles(prev => prev.filter((_, j) => j !== i))}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                        disabled={!revisiCatatan.trim() || submittingRevisi} onClick={onSubmitRevisi}>
                        {submittingRevisi
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengajukan...</>
                          : "Ajukan Revisi"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Revisi sedang dikerjakan ── */}
            {order.status === "revisi" && (
              <div className="space-y-3">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertTitle className="text-yellow-800">Revisi Sedang Dikerjakan</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    Permintaan revisi Anda sedang diproses. File yang diperbarui akan muncul di halaman ini setelah selesai.
                  </AlertDescription>
                </Alert>
                {order.estimasi_revisi && (
                  <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <CalendarClock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Estimasi Revisi Selesai</p>
                      <p className="text-sm text-yellow-700 mt-0.5">{formatEstimasi(order.estimasi_revisi)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Selesai ── */}
            {order.status === "selesai" && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-5 text-center space-y-3">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-600" />
                  <p className="font-semibold text-green-800 text-lg">Order Selesai!</p>
                  <p className="text-sm text-green-700">Terima kasih telah menggunakan layanan kami.</p>
                  {order.hasil_url && (
                    <a href={order.hasil_url} target="_blank" rel="noopener noreferrer">
                      <Button className="bg-green-600 hover:bg-green-700 text-white w-full mt-2">
                        <Download className="w-4 h-4 mr-2" /> Unduh Hasil Tugas
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">{icon} {label}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2 font-medium">{value}</dd>
    </div>
  );
}
