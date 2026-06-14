import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  useCreateOrder,
  useCheckWa,
  useUploadBukti,
  hitungHarga,
  biayaTambahan,
  formatRupiah,
  type JenisTugas,
  type TipeOrder,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  User,
  FileText,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Upload,
  Paperclip,
  X,
} from "lucide-react";

// ─── Schemas ──────────────────────────────────────────────────
const step1Schema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter."),
  wa: z.string().regex(/^08\d{8,11}$/, "Format WA tidak valid. Gunakan: 08xxx"),
});

const step2Schema = z.object({
  jenis: z.enum(["Makalah", "PPT", "Artikel", "Tugas Harian", "Test"], {
    required_error: "Pilih jenis tugas.",
  }),
  halaman: z.coerce.number().min(1, "Minimal 1."),
  note: z.string().max(1000, "Maksimal 1000 karakter.").optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;

const WA_KEY = (wa: string) => `jt_wa_${wa}`;

function halamanOptions(jenis: JenisTugas) {
  if (jenis === "Makalah" || jenis === "Artikel") {
    const opts: number[] = [];
    for (let i = 10; i <= 80; i += 5) opts.push(i);
    return opts;
  }
  if (jenis === "PPT") {
    const opts: number[] = [];
    for (let i = 5; i <= 20; i++) opts.push(i);
    return opts;
  }
  if (jenis === "Tugas Harian") {
    const opts: number[] = [];
    for (let i = 2; i <= 15; i++) opts.push(i);
    return opts;
  }
  if (jenis === "Test") return [1];
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
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                ${
                  done
                    ? "bg-primary border-primary text-white"
                    : active
                      ? "bg-primary border-primary text-white scale-110"
                      : "bg-white border-slate-200 text-slate-400"
                }`}
              >
                {done ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${active ? "text-primary" : done ? "text-slate-600" : "text-slate-400"}`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 mb-4 mx-1 transition-all ${done ? "bg-primary" : "bg-slate-200"}`}
              />
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
  const uploadBukti = useUploadBukti();

  const [step, setStep] = useState(1);

  // WA warning state
  const [waWarning, setWaWarning] = useState<string | null>(null);
  const [namaLama, setNamaLama] = useState<string | null>(null);
  const [waLama, setWaLama] = useState<string | null>(null);

  const [step1Data, setStep1Data] = useState<Step1Values | null>(null);
  const [step2Data, setStep2Data] = useState<
    (Step2Values & { tipe_order: TipeOrder }) | null
  >(null);
  const [successOrderId, setSuccessOrderId] = useState<string | null>(null);

  // tipe_order, jenis, halaman lives in state (not form) — bypass FormControl/Slot interference
  const [selectedTipe, setSelectedTipe] = useState<TipeOrder>("standar");
  const [selectedJenis, setSelectedJenis] = useState<JenisTugas | "">("");
  const [selectedHalaman, setSelectedHalaman] = useState<number>(10);

  // ─── File pendukung state ────────────────────────────────────
  const [fileTugasFile, setFileTugasFile] = useState<File | null>(null);

  const form1 = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { nama: "", wa: "" },
  });

  const form2 = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
    defaultValues: { jenis: undefined, halaman: 10, note: "" },
  });

  const watchedNote = form2.watch("note") || "";
  const dp = 10000;

  const hargaPreview = selectedJenis
    ? hitungHarga(selectedJenis, selectedHalaman) + biayaTambahan(selectedTipe)
    : 0;

  // ─── Step 1: cek WA ─────────────────────────────────────────
  function normalizeWa(wa: string): string {
    wa = wa.replace(/\D/g, "");
    if (wa.startsWith("62")) wa = wa.slice(2);
    else if (wa.startsWith("0")) wa = wa.slice(1);
    return wa;
  }
  async function onStep1Submit(data: Step1Values) {
    setWaWarning(null);
    setNamaLama(null);
    setWaLama(null);

    const waNormal = normalizeWa(data.wa);
    let foundNamaLama: string | null = localStorage.getItem(WA_KEY(waNormal));

    if (!foundNamaLama && import.meta.env.VITE_GAS_URL) {
      console.log("Memanggil GAS...");
      try {
        const result = await checkWa.mutateAsync(waNormal);
        console.log("GAS exists:", result.exists);
        console.log("GAS ada nama_sebelumnya:", !!result.nama_sebelumnya);
        if (result.exists && result.nama_sebelumnya) {
          foundNamaLama = result.nama_sebelumnya;
          localStorage.setItem(WA_KEY(waNormal), foundNamaLama);
          console.log("Nama lama ditemukan di GAS");
        } else {
          console.log("WA tidak ditemukan di GAS");
        }
      } catch (err) {
        console.error("GAS error:", err);
      }
    } else if (!import.meta.env.VITE_GAS_URL) {
      console.warn("VITE_GAS_URL tidak di-set, skip GAS");
    }

    console.log("foundNamaLama final:", foundNamaLama);
    console.log(
      "Nama cocok?",
      foundNamaLama?.toLowerCase() === data.nama.toLowerCase(),
    );

    if (
      foundNamaLama &&
      foundNamaLama.toLowerCase() !== data.nama.toLowerCase()
    ) {
      console.log("=> BLOKIR");
      setNamaLama(foundNamaLama);
      setWaLama(data.wa);
      setWaWarning(
        `Nomor WhatsApp ${data.wa} sudah terdaftar atas nama "${foundNamaLama}".`,
      );
      return;
    }

    console.log("=> LOLOS ke step 2");
    setStep1Data(data);
    setStep(2);
  }

  function onGantiWa() {
    setWaWarning(null);
    setNamaLama(null);
    setWaLama(null);
    form1.setValue("wa", "");
    form1.setFocus("wa");
  }

  function onPakaiDataLama() {
    if (!namaLama || !waLama) return;
    setStep1Data({ nama: namaLama, wa: waLama });
    setWaWarning(null);
    setNamaLama(null);
    setWaLama(null);
    setStep(2);
  }
  // ─── Step 2 ──────────────────────────────────────────────────
  function onStep2Submit(data: Step2Values) {
    setStep2Data({ ...data, tipe_order: selectedTipe });
    setStep(3);
  }

  // ─── Step 3: kirim order + upload file pendukung (jika ada) ──
  async function onConfirmOrder() {
    if (!step1Data || !step2Data) return;
    const hargaFinal =
      hitungHarga(step2Data.jenis, step2Data.halaman) +
      biayaTambahan(step2Data.tipe_order);
    try {
      // 1. Buat order dulu
      const payload = {
        nama: step1Data.nama,
        wa: step1Data.wa,
        jenis: step2Data.jenis,
        halaman: step2Data.halaman,
        note: step2Data.note || "",
        tipe_order: step2Data.tipe_order,
        harga: hargaFinal,
        dp,
        sisa_bayar: Math.max(0, hargaFinal - dp),
      } as any;

      // GANTI bagian setelah mutateAsync berhasil:
      const result = await createOrder.mutateAsync({ ...payload });

      if (!result.success || !result.order_id) {
        throw new Error("Gagal membuat order");
      }

      const order_id = result.order_id;

      if (fileTugasFile) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const base64 = await fileToBase64(fileTugasFile);
          await uploadBukti.mutateAsync({
            orderId: order_id,
            tipe: "file_tugas",
            fileBase64: base64,
            fileName: fileTugasFile.name,
          });
        } catch {
          toast({
            variant: "destructive",
            title: "File Pendukung Gagal Diupload",
            description:
              "Order berhasil dibuat, tapi file pendukung gagal terkirim. Hubungi admin via WhatsApp.",
          });
        }
      }

      localStorage.setItem(WA_KEY(step1Data.wa), step1Data.nama);
      setSuccessOrderId(order_id);
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Order",
        description: error.message,
      });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast({ title: "Tersalin!", description: "Order ID berhasil disalin." });
  }

  function resetAll() {
    setStep(1);
    setSuccessOrderId(null);
    setStep1Data(null);
    setStep2Data(null);
    setWaWarning(null);
    setNamaLama(null);
    setWaLama(null);
    setSelectedTipe("standar");
    setSelectedJenis("");
    setSelectedHalaman(10);
    setFileTugasFile(null);
    form1.reset();
    form2.reset();
  }

  // ─── Step 4: Sukses ──────────────────────────────────────────
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
              <CardTitle className="text-2xl text-green-800">
                Order Berhasil Dikirim!
              </CardTitle>
              <CardDescription className="text-green-700">
                Pesanan Anda sudah masuk dan sedang menunggu verifikasi admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-200">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                  Order ID Anda
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl font-bold tracking-wider text-slate-900">
                    {successOrderId}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(successOrderId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-800">
                  Langkah Selanjutnya:
                </p>
                <ol className="space-y-2">
                  {[
                    "Admin memverifikasi detail pesanan Anda",
                    "Anda akan diminta membayar DP melalui halaman tracking",
                    "Admin memverifikasi DP dan mulai mengerjakan tugas",
                    "Setelah selesai, bayar pelunasan untuk mengunduh hasil",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-blue-700"
                    >
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
                <AlertTitle className="text-yellow-800">
                  Simpan Order ID Anda!
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Gunakan Order ID <strong>{successOrderId}</strong> untuk
                  memantau status di halaman tracking.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={() =>
                    (window.location.href = `/track?id=${successOrderId}`)
                  }
                >
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

  // ─── Step 3: Ringkasan ────────────────────────────────────────
  if (step === 3 && step1Data && step2Data) {
    const { jenis, halaman, tipe_order: tipe, note } = step2Data;
    const hDasar = hitungHarga(jenis, halaman);
    const hTambahan = biayaTambahan(tipe);
    const hTotal = hDasar + hTambahan;
    const isUploading = uploadBukti.isPending;

    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8 space-y-6">
          <StepIndicator current={3} />
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan Order</CardTitle>
              <CardDescription>
                Periksa detail pesanan sebelum konfirmasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                <SRow label="Nama" value={step1Data.nama} />
                <SRow label="WhatsApp" value={step1Data.wa} />
                <SRow label="Jenis Tugas" value={jenis} />
                <SRow
                  label="Jumlah"
                  value={`${halaman} ${jenis === "PPT" ? "slide" : jenis === "Tugas Harian" ? "lembar" : "halaman"}`}
                />
                <SRow
                  label="Tipe Layanan"
                  value={
                    <Badge
                      variant={
                        tipe === "standar"
                          ? "secondary"
                          : tipe === "ekspres"
                            ? "outline"
                            : "destructive"
                      }
                      className="capitalize"
                    >
                      {tipe}
                    </Badge>
                  }
                />
                {note && <SRow label="Catatan" value={note} />}
                {fileTugasFile && (
                  <SRow
                    label="File Pendukung"
                    value={
                      <span className="flex items-center gap-1.5 text-slate-700">
                        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                        {fileTugasFile.name}
                      </span>
                    }
                  />
                )}
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-700 mb-3">
                  Rincian Harga
                </p>
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                  disabled={createOrder.isPending || isUploading}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
                </Button>
                <Button
                  className="flex-1"
                  onClick={onConfirmOrder}
                  disabled={createOrder.isPending || isUploading}
                >
                  {createOrder.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Membuat Order...
                    </>
                  ) : isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengupload File...
                    </>
                  ) : (
                    <>
                      Kirim Order <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // ─── Step 2: Detail Tugas ─────────────────────────────────────
  if (step === 2) {
    const opts = selectedJenis ? halamanOptions(selectedJenis) : [];

    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8">
          <StepIndicator current={2} />
          <Card>
            <CardHeader>
              <CardTitle>Detail Tugas</CardTitle>
              <CardDescription>
                Isi detail tugas yang ingin Anda pesan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form2}>
                <form
                  onSubmit={form2.handleSubmit(onStep2Submit)}
                  className="space-y-5"
                >
                  {/* Jenis Tugas */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Jenis Tugas
                    </label>
                    <select
                      value={selectedJenis}
                      onChange={(e) => {
                        const val = e.target.value as JenisTugas;
                        setSelectedJenis(val);
                        const firstHalaman = halamanOptions(val)[0] || 1;
                        setSelectedHalaman(firstHalaman);
                        form2.setValue("jenis", val, { shouldValidate: true });
                        form2.setValue("halaman", firstHalaman);
                      }}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="" disabled>
                        Pilih jenis tugas
                      </option>
                      <option value="Makalah">Makalah</option>
                      <option value="PPT">Presentasi (PPT)</option>
                      <option value="Artikel">Artikel Ilmiah</option>
                      <option value="Tugas Harian">Tugas Harian</option>
                      <option value="Test">Test</option>
                    </select>
                    {form2.formState.errors.jenis && (
                      <p className="text-[0.8rem] font-medium text-destructive">
                        {form2.formState.errors.jenis.message}
                      </p>
                    )}
                  </div>

                  {/* Jumlah Halaman/Slide */}
                  {selectedJenis && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">
                        {selectedJenis === "PPT"
                          ? "Jumlah Slide"
                          : selectedJenis === "Tugas Harian"
                            ? "Jumlah Lembar"
                            : "Jumlah Halaman"}
                      </label>
                      <select
                        value={String(selectedHalaman)}
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          setSelectedHalaman(num);
                          form2.setValue("halaman", num);
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                      >
                        {halamanOptions(selectedJenis).map((n) => (
                          <option key={n} value={String(n)}>
                            {n}{" "}
                            {selectedJenis === "PPT"
                              ? "slide"
                              : selectedJenis === "Tugas Harian"
                                ? "lembar"
                                : "halaman"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tipe layanan */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Tipe Layanan
                    </label>
                    <select
                      value={selectedTipe}
                      onChange={(e) =>
                        setSelectedTipe(e.target.value as TipeOrder)
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="standar">
                        Standar (tanpa biaya tambahan)
                      </option>
                      <option value="ekspres">
                        Ekspres (1 hari lebih cepat, +{formatRupiah(7000)})
                      </option>
                      <option value="super ekspres">
                        Super Ekspres (2 hari lebih cepat, +
                        {formatRupiah(15000)})
                      </option>
                    </select>
                  </div>

                  {/* Catatan */}
                  <FormField
                    control={form2.control}
                    name="note"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jelaskan topik, format, atau instruksi khusus..."
                            className="min-h-[120px] resize-none"
                            maxLength={1000}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-right">
                          {watchedNote.length}/1000 karakter
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ── File Pendukung Tugas (Opsional) ── */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <label className="text-sm font-medium leading-none">
                        File Pendukung
                      </label>
                      <span className="text-xs text-slate-400 font-normal">
                        (opsional)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Upload soal, instruksi, atau referensi untuk membantu
                      admin mengerjakan tugas Anda.
                    </p>

                    {fileTugasFile ? (
                      // File sudah dipilih — tampilkan nama + tombol hapus
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span className="text-sm text-green-800 font-medium truncate">
                            {fileTugasFile.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-2 flex-shrink-0 text-slate-400 hover:text-red-500"
                          onClick={() => setFileTugasFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      // Belum ada file — tampilkan area upload
                      <label className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-primary transition-colors flex flex-col items-center gap-2">
                        <Paperclip className="w-6 h-6 text-slate-400" />
                        <p className="text-sm text-slate-500">
                          Klik untuk pilih file
                        </p>
                        <p className="text-xs text-slate-400">
                          JPG, PDF, DOC, atau DOCX
                        </p>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) =>
                            setFileTugasFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                    )}
                  </div>

                  {/* Estimasi harga */}
                  {selectedJenis && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">
                        Estimasi Harga
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {formatRupiah(hargaPreview)}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep(1)}
                    >
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

  // ─── Step 1: Data Diri ────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <StepIndicator current={1} />
        <Card>
          <CardHeader>
            <CardTitle>Data Diri</CardTitle>
            <CardDescription>
              Masukkan nama dan nomor WhatsApp Anda untuk memulai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form1}>
              <form
                onSubmit={form1.handleSubmit(onStep1Submit)}
                className="space-y-5"
              >
                <FormField
                  control={form1.control}
                  name="nama"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="Bahlil Dosantos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form1.control}
                  name="wa"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="081234567890" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nomor aktif untuk komunikasi dan konfirmasi.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {waWarning && (
                  <Alert className="bg-yellow-50 border-yellow-400">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertTitle className="text-yellow-900 font-semibold">
                      Nomor WA Sudah Terdaftar
                    </AlertTitle>
                    <AlertDescription className="text-yellow-800 space-y-4 mt-1">
                      <p>{waWarning}</p>
                      <p className="text-sm">Silakan pilih salah satu:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 border-yellow-500 text-yellow-900 hover:bg-yellow-100"
                          onClick={onGantiWa}
                        >
                          Ganti Nomor WA
                        </Button>
                        <Button
                          type="button"
                          className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white"
                          onClick={onPakaiDataLama}
                        >
                          Pakai Data Lama
                          {namaLama && (
                            <span className="ml-1 opacity-80 text-xs">
                              ({namaLama})
                            </span>
                          )}
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!waWarning && (
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={checkWa.isPending}
                  >
                    {checkWa.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Memeriksa...
                      </>
                    ) : (
                      <>
                        Selanjutnya <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
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

// ─── Helpers ──────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-4">
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">
        {value}
      </span>
    </div>
  );
}
