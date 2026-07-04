import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Star,
  ShoppingBag,
  LogOut,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useGetUserAccount, formatRupiah } from "@/hooks/use-orders";

export default function AkunPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tugasly_user_id");
    if (!stored) {
      window.location.href = "/login-user";
      return;
    }
    setUserId(stored);
  }, []);

  const {
    data: akun,
    isLoading,
    isError,
    error,
  } = useGetUserAccount(userId || "");

  function handleLogout() {
    localStorage.removeItem("tugasly_user_id");
    localStorage.removeItem("tugasly_user_nama");
    window.location.href = "/login-user";
  }

  if (!userId || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <div className="max-w-md mx-auto py-10">
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {(error as Error).message}
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={handleLogout}
          >
            Kembali ke Login
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Akun</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>

        {/* Identitas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" /> Informasi Akun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">User ID</span>
              <span className="font-mono font-medium text-slate-800">
                {akun?.user_id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Nama</span>
              <span className="font-medium text-slate-800">{akun?.nama}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">WhatsApp</span>
              <span className="font-medium text-slate-800">{akun?.wa}</span>
            </div>
            {akun?.kode_referral && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kode Referral Dipakai</span>
                <Badge variant="outline">{akun.kode_referral}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saldo Poin */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saldo Poin</p>
                  <p className="text-2xl font-bold text-primary">
                    {akun?.saldo_poin ?? 0} poin
                  </p>
                  <p className="text-xs text-slate-400">
                    Senilai {formatRupiah((akun?.saldo_poin ?? 0) * 1000)}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => (window.location.href = "/order")}
              >
                Order Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Riwayat Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingBag className="w-4 h-4" /> Riwayat Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!akun?.orders || akun.orders.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Belum ada order.
              </p>
            ) : (
              <div className="space-y-3">
                {akun.orders.map((order) => (
                  <div
                    key={order.order_id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {order.order_id}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(order.created_at).toLocaleDateString(
                          "id-ID",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                      {order.poin_didapat > 0 && (
                        <p className="text-xs text-primary mt-0.5">
                          +{order.poin_didapat} poin didapat
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">
                        {formatRupiah(order.harga_dibayar)}
                      </p>
                      {order.diskon_poin > 0 && (
                        <p className="text-xs text-green-600">
                          -{formatRupiah(order.diskon_poin)} poin
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
