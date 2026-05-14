import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PaymentFinish() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");

    if (orderId) {
      const realOrderId = orderId.replace(/-DP$|-FINAL$/, "");
      navigate(`/track?id=${realOrderId}`);
    } else {
      navigate("/");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Mengalihkan...</p>
    </div>
  );
}
