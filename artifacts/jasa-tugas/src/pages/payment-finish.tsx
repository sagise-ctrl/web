import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function PaymentFinish() {
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("Memverifikasi pembayaran...");

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const paymentOrderId =
      params.get("order_id") ||
      params.get("partnerReferenceNo") ||
      params.get("originalPartnerReferenceNo");

    if (!paymentOrderId) {
      navigate("/");
      return;
    }

    const realOrderId = paymentOrderId.replace(/-DP$|-FINAL$|-F$/, "");
    const expectedStatus = paymentOrderId.endsWith("-DP")
      ? "proses pengerjaan"
      : paymentOrderId.endsWith("-FINAL") || paymentOrderId.endsWith("-F")
        ? "cek file"
        : null;

    async function waitForUpdatedStatus() {
      for (let attempt = 0; attempt < 12; attempt++) {
        try {
          const res = await fetch(
            `/api/proxy?action=getOrder&order_id=${encodeURIComponent(realOrderId)}`,
          );
          const data = await res.json();
          const status = data?.data?.status;

          if (!expectedStatus || status === expectedStatus) {
            navigate(`/track?id=${encodeURIComponent(realOrderId)}`);
            return;
          }

          setMessage("Pembayaran diterima, menunggu update status...");
        } catch {
          setMessage("Menunggu konfirmasi pembayaran...");
        }

        await new Promise((resolve) => setTimeout(resolve, 2500));
        if (cancelled) return;
      }

      navigate(`/track?id=${encodeURIComponent(realOrderId)}`);
    }

    waitForUpdatedStatus();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">{message}</p>
    </div>
  );
}
