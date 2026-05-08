import React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateOrder } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Copy, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const orderSchema = z.object({
  nama: z.string().min(2, { message: "Nama minimal 2 karakter." }),
  wa: z
    .string()
    .regex(/^08\d{8,11}$/, {
      message: "Format WhatsApp tidak valid. Gunakan format: 08xxx",
    }),
  jenis: z.enum(["Makalah", "PPT", "Artikel"], {
    required_error: "Pilih jenis tugas.",
  }),
  halaman: z.coerce
    .number()
    .min(10, { message: "Minimal 10 halaman." })
    .max(80, { message: "Maksimal 80 halaman." }),
  deadline: z.string().min(1, { message: "Deadline wajib diisi." }),
  note: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrderPage() {
  const { toast } = useToast();
  const createOrder = useCreateOrder();
  const [successOrderId, setSuccessOrderId] = React.useState<string | null>(
    null,
  );

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      nama: "",
      wa: "",
      jenis: undefined,
      halaman: 1,
      deadline: "",
      note: "",
    },
  });

  async function onSubmit(data: OrderFormValues) {
    try {
      const res = await createOrder.mutateAsync(data as any);
      setSuccessOrderId(res.order_id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast({
        title: "Order Berhasil!",
        description: "Tugas Anda telah masuk dalam antrean kami.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Order",
        description: error.message || "Terjadi kesalahan yang tidak terduga.",
      });
    }
  }

  const copyToClipboard = () => {
    if (successOrderId) {
      navigator.clipboard.writeText(successOrderId);
      toast({
        title: "Tersalin!",
        description: "Order ID berhasil disalin ke clipboard.",
      });
    }
  };

  if (successOrderId) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12">
          <Card className="border-green-200 bg-green-50 shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Order Berhasil Dibuat!
              </CardTitle>
              <CardDescription className="text-green-700 text-base">
                Terima kasih telah mempercayakan tugas Anda kepada kami.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-6 pt-6">
              <div className="bg-white px-8 py-6 rounded-xl border border-green-100 text-center w-full max-w-sm">
                <p className="text-sm text-slate-500 mb-2 font-medium">
                  ORDER ID ANDA
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-bold tracking-wider text-slate-900">
                    {successOrderId}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-8 w-8 text-slate-500 hover:text-slate-900"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertTitle>Penting!</AlertTitle>
                <AlertDescription>
                  Harap catat dan simpan Order ID ini. Anda akan membutuhkannya
                  untuk mengecek status pesanan Anda.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4 w-full justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccessOrderId(null);
                    form.reset();
                  }}
                >
                  Order Baru Lagi
                </Button>
                <Button
                  onClick={() =>
                    (window.location.href = `/track?id=${successOrderId}`)
                  }
                >
                  Lacak Order Ini
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Form Order Jasa Tugas</CardTitle>
            <CardDescription>
              Isi detail tugas Anda dengan lengkap agar kami dapat memberikan
              estimasi dan hasil terbaik.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="wa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>No. WhatsApp</FormLabel>
                        <FormControl>
                          <Input placeholder="081234567890" {...field} />
                        </FormControl>
                        <FormDescription>
                          Untuk komunikasi & ID.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="jenis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Tugas</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis tugas" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Makalah">Makalah</SelectItem>
                            <SelectItem value="PPT">
                              Presentasi (PPT)
                            </SelectItem>
                            <SelectItem value="Artikel">
                              Artikel Ilmiah
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="halaman"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jumlah Halaman / Slide</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deadline (Tenggat Waktu)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catatan Tambahan (Opsional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Jelaskan topik, aturan format, atau instruksi khusus lainnya..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-lg"
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    "Kirim Order"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
