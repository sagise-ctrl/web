import { useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CheckCircle, Loader2, Users } from "lucide-react";
import { useRegisterAffiliate } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";

export default function RegisterAffiliatePage() {
  const { toast } = useToast();
  const registerAffiliate = useRegisterAffiliate();
  const [form, setForm] = useState({ nama: "", wa: "" });
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nama.trim() || !form.wa.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Nama dan WA wajib diisi",
      });
      return;
    }

    if (!/^08\d{8,11}$/.test(form.wa)) {
      toast({
        variant: "destructive",
        title: "Format WA salah",
        description: "Gunakan format 08xxx",
      });
      return;
    }

    try {
      await registerAffiliate.mutateAsync({
        nama: form.nama.trim(),
        wa: form.wa.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal Registrasi",
        description: err.message,
      });
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-10">
          <Card className="border-green-200">
            <CardContent className="p-8 text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
              <h2 className="text-xl font-bold text-green-800">
                Pendaftaran Affiliate Berhasil!
              </h2>
              <p className="text-sm text-green-700">
                Permintaan Anda sudah diterima. Admin akan mengirimkan{" "}
                <strong>Affiliate ID</strong> dan <strong>Kode Referral</strong>{" "}
                ke WhatsApp <strong>{form.wa}</strong> setelah diverifikasi.
              </p>
              <p className="text-xs text-slate-500">
                Proses verifikasi membutuhkan waktu. Simpan Affiliate ID yang
                dikirim admin untuk login ke dashboard affiliate.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/login-affiliate")}
              >
                Sudah punya Affiliate ID? Login di sini
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Daftar Affiliate
          </h1>
          <p className="text-slate-500 text-sm">
            Dapatkan komisi dari setiap order yang menggunakan kode referral
            Anda.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> Data Diri
            </CardTitle>
            <CardDescription>
              Setelah diverifikasi admin, Anda akan mendapat Affiliate ID dan
              Kode Referral via WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Nama Lengkap
                </label>
                <Input
                  placeholder="Nama lengkap Anda"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Nomor WhatsApp
                </label>
                <Input
                  placeholder="08xxxxxxxxxx"
                  value={form.wa}
                  onChange={(e) => setForm({ ...form, wa: e.target.value })}
                />
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-700">Skema Komisi:</p>
                <p>
                  • Order ke-1 dari referral Anda: <strong>30%</strong>
                </p>
                <p>• Turun 3% setiap order berikutnya</p>
                <p>• Berlaku sampai order ke-10 per user</p>
                <p>
                  • Minimal pencairan: <strong>Rp 50.000</strong>
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registerAffiliate.isPending}
              >
                {registerAffiliate.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Mendaftar...
                  </>
                ) : (
                  "Daftar sebagai Affiliate"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Sudah punya Affiliate ID?{" "}
                <a
                  href="/login-affiliate"
                  className="text-primary hover:underline"
                >
                  Login di sini
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
