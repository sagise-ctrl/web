import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Loader2, User } from "lucide-react";
import { useRegisterUser } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";

export default function RegisterUserPage() {
  const { toast } = useToast();
  const registerUser = useRegisterUser();

  const [form, setForm] = useState({ nama: "", wa: "", kode_referral: "" });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      setForm((prev) => ({ ...prev, kode_referral: ref.toUpperCase() }));
    }
  }, []);
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
      await registerUser.mutateAsync({
        nama: form.nama.trim(),
        wa: form.wa.trim(),
        kode_referral: form.kode_referral.trim() || undefined,
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
                Registrasi Berhasil!
              </h2>
              <p className="text-sm text-green-700">
                Permintaan akun Anda sudah diterima. Admin akan mengirimkan{" "}
                <strong>User ID</strong> ke WhatsApp <strong>{form.wa}</strong>{" "}
                dalam waktu dekat.
              </p>
              <p className="text-xs text-slate-500">
                Simpan User ID yang dikirim admin untuk login ke dashboard akun
                Anda.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = "/login-user")}
              >
                Sudah punya User ID? Login di sini
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
          <h1 className="text-2xl font-bold text-slate-900">Daftar Akun</h1>
          <p className="text-slate-500 text-sm">
            Daftarkan akun untuk kumpulkan poin dan gunakan kode referral.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Data Diri
            </CardTitle>
            <CardDescription>
              Setelah registrasi, admin akan mengirim User ID ke WhatsApp Anda.
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Kode Referral{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <Input
                  placeholder="REF-xxxxxx"
                  value={form.kode_referral}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kode_referral: e.target.value.toUpperCase(),
                    })
                  }
                />
                <p className="text-xs text-slate-400">
                  Isi jika Anda punya kode referral dari teman. Dapatkan diskon
                  Rp 10.000 di order pertama.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={registerUser.isPending}
              >
                {registerUser.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Mendaftar...
                  </>
                ) : (
                  "Daftar Sekarang"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Sudah punya akun?{" "}
                <a href="/login-user" className="text-primary hover:underline">
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
