import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentFinish() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    if (orderId) {
      // Midtrans kirim order_id dengan format ORD-xxx-DP atau ORD-xxx-FINAL
      // Kita ambil bagian aslinya
      const realOrderId = orderId
        .replace(/-DP$|-FINAL$/, "")
        .replace(/-DP-\d+$|-FINAL-\d+$/, "");
      navigate(`/track?id=${realOrderId}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Mengalihkan...</p>
    </div>
  );
}
