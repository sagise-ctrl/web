import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  DollarSign,
  LogOut,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle,
} from "lucide-react";
import {
  useGetAffiliateAccount,
  useRequestWithdrawal,
  useSaveRekening,
  useGetWithdrawalHistory,
  useGetAffiliateMutations,
  useGetAffiliateWithdrawalRequests,
  type WithdrawalHistory,
  type AffiliateMutation,
  type AffiliateWithdrawalRequest,
  formatRupiah,
} from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";

export default function AffiliatePage() {
  const { toast } = useToast();
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    nominal: "",
    rekening_bank: "",
    nomor_rekening: "",
    atas_nama: "",
  });
  const [copied, setCopied] = useState(false);
  const [showRekeningForm, setShowRekeningForm] = useState(false);
  const [showCairkanModal, setShowCairkanModal] = useState(false);
  const [rekeningForm, setRekeningForm] = useState({
    rekening_bank: "",
    nomor_rekening: "",
    atas_nama: "",
  });
  const [nominalCairan, setNominalCairan] = useState("");

  const saveRekening = useSaveRekening();
  const { data: withdrawalHistory = [], refetch: refetchHistory } =
    useGetWithdrawalHistory(affiliateId || "");
  const { data: mutations = [] } = useGetAffiliateMutations(affiliateId || "");
  const { data: withdrawalRequests = [] } = useGetAffiliateWithdrawalRequests(
    affiliateId || "",
  );
  const requestWithdrawal = useRequestWithdrawal();

  useEffect(() => {
    const stored = localStorage.getItem("tugasly_affiliate_id");
    if (!stored) {
      window.location.href = "/login-affiliate";
      return;
    }
    setAffiliateId(stored);
  }, []);

  const {
    data: akun,
    isLoading,
    isError,
    error,
    refetch: refetchAkun,
  } = useGetAffiliateAccount(affiliateId || "");

  function handleLogout() {
    localStorage.removeItem("tugasly_affiliate_id");
    localStorage.removeItem("tugasly_affiliate_nama");
    window.location.href = "/login-affiliate";
  }

  function copyReferralCode() {
    if (akun?.kode_referral) {
      navigator.clipboard.writeText(akun.kode_referral);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    if (!affiliateId) return;

    const nominal = Number(withdrawalForm.nominal);
    if (nominal < 50000) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Minimal pencairan Rp 50.000",
      });
      return;
    }

    try {
      await requestWithdrawal.mutateAsync({
        affiliate_id: affiliateId,
        nominal,
        rekening_bank: withdrawalForm.rekening_bank,
        nomor_rekening: withdrawalForm.nomor_rekening,
        atas_nama: withdrawalForm.atas_nama,
      });
      toast({
        title: "Berhasil",
        description: "Request pencairan berhasil dikirim ke admin",
      });
      setShowWithdrawal(false);
      setWithdrawalForm({
        nominal: "",
        rekening_bank: "",
        nomor_rekening: "",
        atas_nama: "",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: err.message,
      });
    }
  }

  if (!affiliateId || isLoading) {
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            Dashboard Affiliate
          </h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Keluar
          </Button>
        </div>

        {/* Identitas & Kode Referral */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" /> Informasi Affiliate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Affiliate ID</span>
              <span className="font-mono font-medium text-slate-800">
                {akun?.affiliate_id}
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
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Kode Referral</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-primary border-primary"
                >
                  {akun?.kode_referral}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={copyReferralCode}
                >
                  {copied ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Link Referral</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono truncate max-w-[160px]">
                  tugasly.my.id/register-user?ref={akun?.kode_referral}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://tugasly.my.id/register-user?ref=${akun?.kode_referral}`,
                    );
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Saldo Komisi */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Saldo Komisi</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatRupiah(akun?.saldo_komisi ?? 0)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Minimal pencairan Rp 50.000
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setShowCairkanModal(true)}
              >
                Cairkan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal Cairkan */}
        {showCairkanModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
              {(() => {
                const rekeningStatus = akun?.rekening_status;
                const rekeningAda = rekeningStatus === "active";
                const rekeningPending = rekeningStatus === "pending";
                const adaPencairanPending = withdrawalHistory.some(
                  (w) => w.status === "pending",
                );

                if (!rekeningAda || rekeningPending) {
                  return (
                    <>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        Rekening Belum Tersedia
                      </h3>
                      <p className="text-sm text-slate-500">
                        {rekeningPending
                          ? "Rekening Anda sedang dalam proses verifikasi admin. Silakan tunggu."
                          : "Anda belum memiliki rekening yang terverifikasi. Daftarkan rekening terlebih dahulu."}
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowCairkanModal(false)}
                        >
                          Tutup
                        </Button>
                        {!rekeningPending && (
                          <Button
                            className="flex-1"
                            onClick={() => {
                              setShowCairkanModal(false);
                              setShowRekeningForm(true);
                            }}
                          >
                            Atur Rekening
                          </Button>
                        )}
                      </div>
                    </>
                  );
                }

                if (adaPencairanPending) {
                  return (
                    <>
                      <h3 className="font-semibold text-slate-800 text-lg">
                        Ada Pencairan Pending
                      </h3>
                      <p className="text-sm text-slate-500">
                        Anda masih memiliki request pencairan yang sedang
                        diproses admin. Tunggu hingga selesai sebelum mengajukan
                        yang baru.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowCairkanModal(false)}
                      >
                        Tutup
                      </Button>
                    </>
                  );
                }

                return (
                  <>
                    <h3 className="font-semibold text-slate-800 text-lg">
                      Cairkan Komisi
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Rekening</span>
                        <span className="font-medium">
                          {akun?.rekening_bank} - {akun?.nomor_rekening}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Atas Nama</span>
                        <span className="font-medium">{akun?.atas_nama}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Saldo</span>
                        <span className="font-bold text-green-700">
                          {formatRupiah(akun?.saldo_komisi ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">
                        Nominal Pencairan
                      </label>
                      <input
                        type="number"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="Minimal Rp 50.000"
                        value={nominalCairan}
                        onChange={(e) => setNominalCairan(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowCairkanModal(false);
                          setNominalCairan("");
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={requestWithdrawal.isPending}
                        onClick={async () => {
                          const nominal = Number(nominalCairan);
                          if (nominal < 50000) {
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Minimal pencairan Rp 50.000",
                            });
                            return;
                          }
                          if (nominal > (akun?.saldo_komisi ?? 0)) {
                            toast({
                              variant: "destructive",
                              title: "Error",
                              description: "Saldo tidak cukup",
                            });
                            return;
                          }
                          try {
                            await requestWithdrawal.mutateAsync({
                              affiliate_id: affiliateId!,
                              nominal,
                              rekening_bank: akun?.rekening_bank || "",
                              nomor_rekening: akun?.nomor_rekening || "",
                              atas_nama: akun?.atas_nama || "",
                            });
                            toast({
                              title: "Berhasil",
                              description:
                                "Request pencairan sedang diproses admin",
                            });
                            setShowCairkanModal(false);
                            setNominalCairan("");
                            refetchHistory();
                          } catch (err: any) {
                            toast({
                              variant: "destructive",
                              title: "Gagal",
                              description: err.message,
                            });
                          }
                        }}
                      >
                        {requestWithdrawal.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Atur Rekening */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Rekening Pencairan</CardTitle>
              {akun?.rekening_status !== "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Cek 7 hari jika sudah ada rekening aktif
                    if (akun?.rekening_bank && akun?.rekening_updated_at) {
                      const lastEdit = new Date(akun.rekening_updated_at);
                      const now = new Date();
                      const diffDays =
                        (now.getTime() - lastEdit.getTime()) /
                        (1000 * 60 * 60 * 24);
                      if (diffDays < 7) {
                        const nextEdit = new Date(
                          lastEdit.getTime() + 7 * 24 * 60 * 60 * 1000,
                        );
                        toast({
                          variant: "destructive",
                          title: "Belum bisa diedit",
                          description: `Rekening bisa diedit lagi pada ${nextEdit.toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}`,
                        });
                        return;
                      }
                    }
                    setShowRekeningForm(!showRekeningForm);
                  }}
                >
                  {akun?.rekening_bank ? "Edit Rekening" : "Tambah Rekening"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {akun?.rekening_status === "pending" ? (
              // Tampilan status pengajuan pending
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Menunggu Verifikasi Admin
                    </Badge>
                  </div>
                  <p className="text-xs text-amber-600">
                    Rekening Anda sedang dalam proses verifikasi. Tombol edit
                    akan tersedia setelah diverifikasi.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Bank</span>
                    <span className="font-medium">{akun.rekening_bank}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Nomor</span>
                    <span className="font-medium">{akun.nomor_rekening}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Atas Nama</span>
                    <span className="font-medium">{akun.atas_nama}</span>
                  </div>
                </div>
              </div>
            ) : akun?.rekening_bank ? (
              // Tampilan rekening aktif
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Bank</span>
                  <span className="font-medium">{akun.rekening_bank}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Nomor</span>
                  <span className="font-medium">{akun.nomor_rekening}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Atas Nama</span>
                  <span className="font-medium">{akun.atas_nama}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200"
                  >
                    Terverifikasi
                  </Badge>
                </div>
              </div>
            ) : (
              // Belum ada rekening
              <p className="text-sm text-slate-400">
                Belum ada rekening terdaftar.
              </p>
            )}

            {showRekeningForm && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700">
                  {akun?.rekening_bank ? "Edit Rekening" : "Tambah Rekening"}
                </p>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nama Bank (misal: BCA, BRI, GoPay)"
                  value={rekeningForm.rekening_bank}
                  onChange={(e) =>
                    setRekeningForm({
                      ...rekeningForm,
                      rekening_bank: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nomor Rekening / No. HP"
                  value={rekeningForm.nomor_rekening}
                  onChange={(e) =>
                    setRekeningForm({
                      ...rekeningForm,
                      nomor_rekening: e.target.value,
                    })
                  }
                />
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Atas Nama"
                  value={rekeningForm.atas_nama}
                  onChange={(e) =>
                    setRekeningForm({
                      ...rekeningForm,
                      atas_nama: e.target.value,
                    })
                  }
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowRekeningForm(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={saveRekening.isPending}
                    onClick={async () => {
                      if (
                        !rekeningForm.rekening_bank ||
                        !rekeningForm.nomor_rekening ||
                        !rekeningForm.atas_nama
                      ) {
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Semua field wajib diisi",
                        });
                        return;
                      }
                      try {
                        await saveRekening.mutateAsync({
                          affiliate_id: affiliateId!,
                          ...rekeningForm,
                        });
                        toast({
                          title: "Berhasil",
                          description:
                            "Rekening diajukan, menunggu verifikasi admin",
                        });
                        setShowRekeningForm(false);
                        setRekeningForm({
                          rekening_bank: "",
                          nomor_rekening: "",
                          atas_nama: "",
                        });
                        refetchAkun();
                      } catch (err: any) {
                        toast({
                          variant: "destructive",
                          title: "Gagal",
                          description: err.message,
                        });
                      }
                    }}
                  >
                    {saveRekening.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Simpan"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mutasi Saldo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mutasi Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            {mutations.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Belum ada mutasi.
              </p>
            ) : (
              <div className="space-y-3">
                {mutations.map((mut, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          mut.sign === "plus" ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold ${mut.sign === "plus" ? "text-green-600" : "text-red-600"}`}
                        >
                          {mut.sign === "plus" ? "+" : "-"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {mut.label}
                        </p>
                        <p className="text-xs text-slate-500">{mut.detail}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(mut.date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-slate-400">
                          ID: {mut.ref_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-bold ${mut.sign === "plus" ? "text-green-600" : "text-red-600"}`}
                      >
                        {mut.sign === "plus" ? "+" : "-"}
                        {formatRupiah(mut.nominal)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Saldo:</p>
                      <p className="text-xs font-medium text-slate-700">
                        {formatRupiah(mut.saldo_setelah)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Pencairan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request Pencairan</CardTitle>
          </CardHeader>
          <CardContent>
            {withdrawalRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Tidak ada request pencairan.
              </p>
            ) : (
              <div className="space-y-3">
                {withdrawalRequests.map((req) => (
                  <div
                    key={req.withdrawal_id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-slate-500">
                        {req.withdrawal_id}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          req.status === "rejected"
                            ? "bg-red-50 text-red-700 border-red-200 text-xs"
                            : "bg-amber-50 text-amber-700 border-amber-200 text-xs"
                        }
                      >
                        {req.status === "rejected"
                          ? "Ditolak"
                          : "Menunggu Verifikasi"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-bold text-slate-800">
                          {formatRupiah(req.nominal)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {req.rekening_bank} - {req.nomor_rekening}
                        </p>
                        <p className="text-xs text-slate-400">
                          {req.atas_nama}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                        {req.status === "rejected" && req.approved_at && (
                          <p className="text-xs text-red-400 mt-0.5">
                            Ditolak:{" "}
                            {new Date(req.approved_at).toLocaleDateString(
                              "id-ID",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                        )}
                      </div>
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
