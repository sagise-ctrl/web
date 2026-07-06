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

export default function LoginAffiliatePage() {
  const { toast } = useToast();
  const [affiliateId, setAffiliateId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!affiliateId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Affiliate ID wajib diisi",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/proxy?action=getAffiliateAccount&affiliate_id=${affiliateId.trim()}`,
      );
      const json = await res.json();

      if (!json.success) {
        const isInactive = json.message?.includes("non-aktif");
        toast({
          variant: "destructive",
          title: isInactive ? "Akun Non-Aktif" : "Login Gagal",
          description: json.message || "Affiliate ID tidak ditemukan",
        });
        return;
      }

      localStorage.setItem("tugasly_affiliate_id", affiliateId.trim());
      localStorage.setItem("tugasly_affiliate_nama", json.data.nama);
      window.location.href = "/affiliate";
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
          <h1 className="text-2xl font-bold text-slate-900">Login Affiliate</h1>
          <p className="text-slate-500 text-sm">
            Masukkan Affiliate ID yang dikirim admin ke WhatsApp Anda.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5" /> Masuk ke Dashboard Affiliate
            </CardTitle>
            <CardDescription>
              Affiliate ID dikirim admin via WhatsApp saat pendaftaran
              disetujui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Affiliate ID
                </label>
                <Input
                  placeholder="AFF-xxxxxxxxxx-xxx"
                  value={affiliateId}
                  onChange={(e) => setAffiliateId(e.target.value)}
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
                Belum terdaftar?{" "}
                <a
                  href="/register-affiliate"
                  className="text-primary hover:underline"
                >
                  Daftar affiliate di sini
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
