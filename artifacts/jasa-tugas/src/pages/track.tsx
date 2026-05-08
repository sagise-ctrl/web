import React, { useEffect, useState, useRef } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search, Loader2, FileText, Calendar, BookOpen, User,
  CreditCard, Upload, CheckCircle, AlertCircle, Download, ExternalLink,
} from "lucide-react";
import { useGetOrder, useUploadBukti, type Order, type OrderStatus, formatRupiah } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: OrderStatus }) {
  const map: Record<string, { label: string; cls: string }> = {
    "verifikasi tugas": { label: "Verifikasi Tugas", cls: "bg-orange-50 text-orange-700 border-orange-200" },
    "verifikasi pembayaran": { label: "Verifikasi Pembayaran", cls: "bg-purple-50 text-purple-700 border-purple-200" },
    "proses pengerjaan": { label: "Sedang Dikerjakan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
    "menunggu pelunasan": { label: "Menunggu Pelunasan", cls: "bg-cyan-50 text-cyan-700 border-cyan-200" },
    "revisi": { label: "Revisi", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    "selesai": { label: "Selesai", cls: "bg-green-50 text-green-700 border-green-200" },
    "pending": { label: "Menunggu Review", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    "proses": { label: "Sedang Dikerjakan", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const info = map[status] || { label: status, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  return (
    <Badge variant="outline" className={`text-sm px-3 py-1 ${info.cls}`}>{info.label}</Badge>
  );
}

function ProgressBar({ status }: { status: OrderStatus }) {
  const steps = [
    { key: "verifikasi tugas", label: "Verifikasi" },
    { key: "proses pengerjaan", label: "Dikerjakan" },
    { key: "menunggu pelunasan", label: "Pelunasan" },
    { key: "selesai", label: "Selesai" },
  ];
  const idx = steps.findIndex(s => s.key === status);
  const current = idx === -1 ? (status === "verifikasi pembayaran" ? 0 : status === "revisi" ? 1 : 0) : idx;

  return (
    <div className="flex items-center gap-0 py-4 px-2">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
              ${i < current ? "bg-primary border-primary text-white" :
                i === current ? "bg-primary border-primary text-white scale-110" :
                  "bg-white border-slate-200 text-slate-400"}`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 text-center leading-tight max-w-[60px] ${i === current ? "text-primary font-semibold" : i < current ? "text-slate-600" : "text-slate-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 mx-1 transition-all ${i < current ? "bg-primary" : "bg-slate-200"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function TrackPage() {
  const [searchId, setSearchId] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const { toast } = useToast();
  const uploadBukti = useUploadBukti();
  const [pelunasanFile, setPelunasanFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const pelunasanRef = useRef<HTMLInputElement>(null);

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

  async function onUploadPelunasan() {
    if (!pelunasanFile || !order) return;
    setUploading(true);
    try {
      const base64 = await fileToBase64(pelunasanFile);
      await uploadBukti.mutateAsync({
        orderId: order.order_id,
        tipe: "bukti_pelunasan",
        fileBase64: base64,
        fileName: pelunasanFile.name,
      });
      toast({ title: "Bukti pelunasan terkirim!", description: "Admin akan memverifikasi dan mengaktifkan link download." });
      setPelunasanFile(null);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Upload", description: err.message });
    } finally {
      setUploading(false);
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const harga = order?.harga ? Number(order.harga) : 0;
  const dp = order?.dp ? Number(order.dp) : 10000;
  const sisa = order?.sisa_bayar ? Number(order.sisa_bayar) : Math.max(0, harga - dp);

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
                <Input
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Contoh: ORD-1234567890-123"
                  className="pl-10 h-12 text-base"
                  data-testid="input-order-id"
                />
              </div>
              <Button type="submit" className="h-12 px-6" disabled={!searchId.trim() || isLoading} data-testid="button-search">
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
              <p className="text-red-600">{(error as Error).message || "Silakan periksa kembali Order ID Anda."}</p>
            </CardContent>
          </Card>
        )}

        {isSuccess && order && (
          <div className="space-y-4">
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
                    <span>{order.jenis}{order.tipe_order && order.tipe_order !== "standar" && <Badge variant="outline" className="ml-2 text-xs capitalize">{order.tipe_order}</Badge>}</span>
                  } />
                  <Row icon={<FileText className="w-4 h-4" />} label="Halaman / Slide" value={`${order.halaman}`} />
                  <Row icon={<Calendar className="w-4 h-4" />} label="Deadline" value={
                    order.deadline ? new Date(order.deadline).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "-"
                  } />
                  {order.harga && Number(order.harga) > 0 && (
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

            {order.status === "menunggu pelunasan" && (
              <Card className="border-cyan-200 bg-cyan-50">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-800 font-semibold">
                    <CreditCard className="w-5 h-5" />
                    <span>Lakukan Pelunasan</span>
                  </div>
                  <p className="text-sm text-cyan-700">
                    Tugas Anda sudah selesai! Bayar sisa <strong>{formatRupiah(sisa)}</strong> via QRIS untuk mengunduh hasilnya.
                  </p>
                  <div className="bg-white border-2 border-dashed border-cyan-300 rounded-xl p-6 text-center">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Scan QRIS untuk pelunasan {formatRupiah(sisa)}</p>
                    <p className="text-xs text-slate-400 mt-1">(Upload gambar QRIS Anda ke public/qris.png)</p>
                  </div>
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => pelunasanRef.current?.click()}
                  >
                    {pelunasanFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <CheckCircle className="w-5 h-5" /><span className="text-sm font-medium">{pelunasanFile.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-7 h-7 mx-auto text-slate-400 mb-1" />
                        <p className="text-sm text-slate-500">Klik untuk upload bukti transfer pelunasan</p>
                        <p className="text-xs text-slate-400">JPG atau PDF</p>
                      </>
                    )}
                  </div>
                  <input ref={pelunasanRef} type="file" accept=".jpg,.jpeg,.pdf" className="hidden"
                    onChange={e => setPelunasanFile(e.target.files?.[0] || null)} />
                  <Button className="w-full" disabled={!pelunasanFile || uploading} onClick={onUploadPelunasan}>
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengupload...</> : "Kirim Bukti Pelunasan"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {order.status === "selesai" && order.hasil_url && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-5 text-center space-y-3">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-600" />
                  <p className="font-semibold text-green-800">Tugas Anda Sudah Selesai!</p>
                  <p className="text-sm text-green-700">Klik tombol di bawah untuk mengunduh hasil tugas Anda.</p>
                  <a href={order.hasil_url} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
                      <Download className="w-4 h-4 mr-2" /> Unduh Hasil Tugas
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {order.status === "verifikasi pembayaran" && (
              <Alert className="bg-purple-50 border-purple-200">
                <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                <AlertTitle className="text-purple-800">Sedang Diverifikasi</AlertTitle>
                <AlertDescription className="text-purple-700">
                  Admin sedang memverifikasi bukti pembayaran Anda. Harap tunggu.
                </AlertDescription>
              </Alert>
            )}

            {order.status === "revisi" && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Tugas Sedang Direvisi</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Permintaan revisi Anda sedang diproses. Estimasi selesai dalam 1x24 jam.
                </AlertDescription>
              </Alert>
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
      <dt className="text-sm font-medium text-slate-500 flex items-center gap-2">
        {icon} {label}
      </dt>
      <dd className="text-sm text-slate-900 sm:col-span-2 font-medium">{value}</dd>
    </div>
  );
}
