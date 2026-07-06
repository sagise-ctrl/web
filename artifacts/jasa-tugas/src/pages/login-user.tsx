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
import { LogIn, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginUserPage() {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User ID wajib diisi",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/proxy?action=getUserAccount&user_id=${userId.trim()}`,
      );
      const json = await res.json();

      if (!json.success) {
        const isInactive = json.message?.includes("non-aktif");
        toast({
          variant: "destructive",
          title: isInactive ? "Akun Non-Aktif" : "Login Gagal",
          description: json.message || "User ID tidak ditemukan",
        });
        return;
      }

      // Simpan ke localStorage
      localStorage.setItem("tugasly_user_id", userId.trim());
      localStorage.setItem("tugasly_user_nama", json.data.nama);

      window.location.href = "/akun";
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Login Akun</h1>
          <p className="text-slate-500 text-sm">
            Masukkan User ID yang dikirim admin ke WhatsApp Anda.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" /> Masuk ke Akun
            </CardTitle>
            <CardDescription>
              User ID dikirim admin via WhatsApp saat registrasi disetujui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  User ID
                </label>
                <Input
                  placeholder="USR-xxxxxxxxxx-xxx"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>

              <p className="text-center text-xs text-slate-500">
                Belum punya akun?{" "}
                <a
                  href="/register-user"
                  className="text-primary hover:underline"
                >
                  Daftar di sini
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
