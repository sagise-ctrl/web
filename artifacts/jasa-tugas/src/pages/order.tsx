import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  useCreateOrder, useCheckWa,
  hitungHarga, biayaTambahan, formatRupiah,
  type JenisTugas, type TipeOrder,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle, CheckCircle, Copy, Loader2, User, FileText,
  ClipboardList, CreditCard, ChevronRight, ChevronLeft,
} from "lucide-react";

// ─── Schemas ──────────────────────────────────────────────────
const step1Schema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter."),
  wa: z.string().regex(/^08\d{8,11}$/, "Format WA tidak valid. Gunakan: 08xxx"),
});

const step2Schema = z.object({
  jenis: z.enum(["Makalah", "PPT", "Artikel", "Tugas Harian"], { required_error: "Pilih jenis tugas." }),
  halaman: z.coerce.number().min(1, "Minimal 1."),
  tipe_order: z.enum(["standar", "ekspres", "super ekspres"]).default("standar"),
  note: z.string().max(500, "Maksimal 500 karakter.").optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

function halamanOptions(jenis: JenisTugas) {
  if (jenis === "Makalah" || jenis === "Artikel") {
    const opts = []; for (let i = 10; i <= 80; i += 5) opts.push(i); return opts;
  }
  if (jenis === "PPT") {
    const opts = []; for (let i = 5; i <= 20; i++) opts.push(i); return opts;
  }
  if (jenis === "Tugas Harian") {
    const opts = []; for (let i = 2; i <= 15; i++) opts.push(i); return opts;
  }
  return [];
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: "Data Diri", icon: User },
    { label: "Detail Tugas", icon: FileText },
    { label: "Ringkasan", icon: ClipboardList },
    { label: "Selesai", icon: CheckCircle },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i + 1 === current;
        const done = i + 1 < current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${done ? "bg-primary border-primary text-white" : active ? "bg-primary border-primary text-white scale-110" : "bg-white border-slate-200 text-slate-400"}`}>
                {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs mt-1 font-medium ${active ? "text-primary" : done ? "text-slate-600" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 mb-4 mx-1 transition-all ${done ? "bg-primary" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export default function OrderPage() {
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const checkWa = useCheckWa();

  const [step, setStep] = useState(1);
  const [waWarning, setWaWarning] = useState<string | null>(null);
  const [pendingStep1Data, setPendingStep1Data] = useState<Step1Values | null>(null);
  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<Step2Values | null>(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { nama: "", wa: "" },
  });

  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { jenis: undefined, halaman: 10, tipe_order: "standar", note: "" },
  });

  const watchedJenis = form2.watch("jenis") as JenisTugas | undefined;
  const watchedHalaman = form2.watch("halaman");
  const watchedTipe = form2.watch("tipe_order") as TipeOrder;
  const watchedNote = form2.watch("note") || "";

  const dp = 10000;

  // ─── Step 1: cek WA ────────────────────────────────────────
  async function onStep1Submit(data: Step1Values) {
    setWaWarning(null);
    try {
      const result = await checkWa.mutateAsync(data.wa);
      if (result.exists && result.nama_sebelumnya) {
        const namaLama = result.nama_sebelumnya;
        if (namaLama.toLowerCase() !== data.nama.toLowerCase()) {
          setPendingStep1Data(data);
          setWaWarning(`Nomor WhatsApp ini sudah terdaftar dengan nama "${namaLama}". Ingin lanjutkan dengan nama berbeda?`);
          return;
        }
      }
    } catch { /* lanjutkan jika cek gagal */ }
    setStep1Data(data);
    setStep(2);
  }

  function onWaConfirm() {
    if (!pendingStep1Data) return;
    setStep1Data(pendingStep1Data);
    setWaWarning(null);
    setStep(2);
  }

  // ─── Step 2 ────────────────────────────────────────────────
  function onStep2Submit(data: Step2Values) {
    setStep2Data(data);
    setStep(3);
  }

  // ─── Step 3: konfirmasi & kirim order ──────────────────────
  async function onConfirmOrder() {
    if (!step1Data || !step2Data) return;
    const hargaFinal = hitungHarga(step2Data.jenis, step2Data.halaman) + biayaTambahan(step2Data.tipe_order as TipeOrder);
    try {
      const res = await createOrder.mutateAsync({
        nama: step1Data.nama,
        wa: step1Data.wa,
        jenis: step2Data.jenis,
        halaman: step2Data.halaman,
        note: step2Data.note || "",
        tipe_order: step2Data.tipe_order as TipeOrder,
        harga: hargaFinal,
        dp,
        sisa_bayar: Math.max(0, hargaFinal - dp),
      } as any);
      setSuccessOrderId(res.order_id);
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal Membuat Order", description: error.message });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin!", description: "Order ID berhasil disalin." });
  }

  function resetAll() {
    setStep(1); setSuccessOrderId(null); setStep1Data(null); setStep2Data(null);
    setWaWarning(null); setPendingStep1Data(null);
    form1.reset(); form2.reset();
  }

  // ─── Step 4: Sukses — tunggu verifikasi admin ──────────────
  if (step === 4 && successOrderId) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          <StepIndicator current={4} />
          <Card className="border-green-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Order Berhasil Dikirim!</CardTitle>
              <CardDescription className="text-green-700">
                Pesanan Anda sudah masuk dan sedang menunggu verifikasi admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Order ID */}
              <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Order ID Anda</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl font-bold tracking-wider text-slate-900">{successOrderId}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(successOrderId)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alur selanjutnya */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">Langkah Selanjutnya:</p>
                <ol className="space-y-2">
                  {[
                    "Admin memverifikasi detail pesanan Anda",
                    "Anda akan diminta membayar DP melalui halaman tracking",
                    "Admin memverifikasi DP dan mulai mengerjakan tugas",
                    "Setelah selesai, bayar pelunasan untuk mengunduh hasil",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-blue-700">
                      <span className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">Simpan Order ID Anda!</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Gunakan Order ID <strong>{successOrderId}</strong> untuk memantau status pesanan di halaman tracking.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button className="flex-1" onClick={() => window.location.href = `/track?id=${successOrderId}`}>
                  Pantau Status Order
                </Button>
                <Button variant="outline" className="flex-1" onClick={resetAll}>
                  Order Baru
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── Step 3: Ringkasan ─────────────────────────────────────
  if (step === 3 && step1Data && step2Data) {
    const jenis = step2Data.jenis;
    const halaman = step2Data.halaman;
    const tipe = step2Data.tipe_order as TipeOrder;
    const hDasar = hitungHarga(jenis, halaman);
    const hTambahan = biayaTambahan(tipe);
    const hTotal = hDasar + hTambahan;

    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          <StepIndicator current={3} />
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Order</CardTitle>
              <CardDescription>Periksa detail pesanan sebelum konfirmasi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                <Row label="Nama" value={step1Data.nama} />
                <Row label="WhatsApp" value={step1Data.wa} />
                <Row label="Jenis Tugas" value={jenis} />
                <Row label="Jumlah" value={`${halaman} ${jenis === "PPT" ? "slide" : jenis === "Tugas Harian" ? "lembar" : "halaman"}`} />
                <Row label="Tipe Layanan" value={
                  <Badge variant={tipe === "standar" ? "secondary" : tipe === "ekspres" ? "outline" : "destructive"} className="capitalize">{tipe}</Badge>
                } />
                {step2Data.note && <Row label="Catatan" value={step2Data.note} />}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 mb-3">Rincian Harga</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Harga dasar</span>
                  <span>{formatRupiah(hDasar)}</span>
                </div>
                {hTambahan > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Biaya {tipe}</span>
                    <span>{formatRupiah(hTambahan)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span className="text-primary">{formatRupiah(hTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 pt-1">
                  <span>DP (dibayar setelah verifikasi admin)</span>
                  <span>{formatRupiah(dp)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Sisa bayar setelah tugas selesai</span>
                  <span>{formatRupiah(Math.max(0, hTotal - dp))}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                </Button>
                <Button className="flex-1" onClick={onConfirmOrder} disabled={createOrder.isPending}>
                  {createOrder.isPending
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memproses...</>
                    : <>Kirim Order <ChevronRight className="w-4 h-4 ml-1" /></>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── Step 2: Detail Tugas ──────────────────────────────────
  if (step === 2) {
    const opts = watchedJenis ? halamanOptions(watchedJenis) : [];
    const hPreview = watchedJenis
      ? hitungHarga(watchedJenis, watchedHalaman || opts[0] || 1) + biayaTambahan(watchedTipe)
      : 0;

    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8">
          <StepIndicator current={2} />
          <Card>
            <CardHeader>
              <CardTitle>Detail Tugas</CardTitle>
              <CardDescription>Isi detail tugas yang ingin Anda pesan.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form2}>
                <form onSubmit={form2.handleSubmit(onStep2Submit)} className="space-y-5">

                  <FormField control={form2.control} name="jenis" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Tugas</FormLabel>
                      <Select value={field.value} onValueChange={(val) => {
                        field.onChange(val);
                        const o = halamanOptions(val as JenisTugas);
                        form2.setValue("halaman", o[0] || 1);
                      }}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih jenis tugas" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="Makalah">Makalah</SelectItem>
                          <SelectItem value="PPT">Presentasi (PPT)</SelectItem>
                          <SelectItem value="Artikel">Artikel Ilmiah</SelectItem>
                          <SelectItem value="Tugas Harian">Tugas Harian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {watchedJenis && (
                    <FormField control={form2.control} name="halaman" render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchedJenis === "PPT" ? "Jumlah Slide" : watchedJenis === "Tugas Harian" ? "Jumlah Lembar" : "Jumlah Halaman"}
                        </FormLabel>
                        <Select value={String(field.value)} onValueChange={(val) => field.onChange(Number(val))}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {opts.map(n => (
                              <SelectItem key={n} value={String(n)}>
                                {n} {watchedJenis === "PPT" ? "slide" : watchedJenis === "Tugas Harian" ? "lembar" : "halaman"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <FormField control={form2.control} name="tipe_order" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe Layanan</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="standar">Standar (tanpa biaya tambahan)</SelectItem>
                          <SelectItem value="ekspres">Ekspres (1 hari lebih cepat, +{formatRupiah(7000)})</SelectItem>
                          <SelectItem value="super ekspres">Super Ekspres (2 hari lebih cepat, +{formatRupiah(15000)})</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form2.control} name="note" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Jelaskan topik, format, atau instruksi khusus..."
                          className="min-h-[120px] resize-none"
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-right">{watchedNote.length}/500 karakter</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {watchedJenis && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Estimasi Harga</span>
                      <span className="text-lg font-bold text-primary">{formatRupiah(hPreview)}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                    </Button>
                    <Button type="submit" className="flex-1">
                      Lihat Ringkasan <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── Step 1: Data Diri ────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <StepIndicator current={1} />
        <Card>
          <CardHeader>
            <CardTitle>Data Diri</CardTitle>
            <CardDescription>Masukkan nama dan nomor WhatsApp Anda untuk memulai.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form1}>
              <form onSubmit={form1.handleSubmit(onStep1Submit)} className="space-y-5">

                {waWarning && (
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-800">Nomor WA Sudah Terdaftar</AlertTitle>
                    <AlertDescription className="text-yellow-700 space-y-3">
                      <p>{waWarning}</p>
                      <div className="flex gap-2 pt-1">
                        <Button type="button" size="sm" variant="outline"
                          className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                          onClick={() => { setWaWarning(null); setPendingStep1Data(null); }}>
                          Ganti Nama/WA
                        </Button>
                        <Button type="button" size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={onWaConfirm}>
                          Lanjutkan Tetap
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <FormField control={form1.control} name="nama" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Lengkap</FormLabel>
                    <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form1.control} name="wa" render={({ field }) => (
                  <FormItem>
                    <FormLabel>No. WhatsApp</FormLabel>
                    <FormControl><Input placeholder="081234567890" {...field} /></FormControl>
                    <FormDescription>Nomor aktif untuk komunikasi dan pengiriman hasil.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />

                {!waWarning && (
                  <Button type="submit" className="w-full" disabled={checkWa.isPending}>
                    {checkWa.isPending
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memeriksa...</>
                      : <>Selanjutnya <ChevronRight className="w-4 h-4 ml-1" /></>}
                  </Button>
                )}
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}
