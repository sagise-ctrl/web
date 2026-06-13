import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL)
    return res.status(500).json({ error: "Server tidak terkonfigurasi" });

  try {
    const event = req.body;

    // Log semua header untuk debug
    console.log("WEBHOOK_HEADERS:", JSON.stringify(req.headers));
    console.log("WEBHOOK_BODY:", JSON.stringify(event));

    // Hanya proses event payment.received
    if (event?.event !== "payment.received") {
      return res
        .status(200)
        .json({ message: "Event diabaikan", event: event?.event });
    }

    const transactionId = event?.data?.id;
    const customFields: any[] = event?.data?.custom_field || [];
    const orderField = customFields.find((f: any) => f.key === "order_id");
    const order_id = orderField?.value;

    if (!order_id) {
      console.warn("WEBHOOK: order_id tidak ditemukan di custom_fields");
      return res.status(200).json({ message: "order_id tidak ditemukan" });
    }

    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      redirect: "follow",
      body: JSON.stringify({
        action: "updatePaymentStatus",
        data: {
          order_id,
          payment_status: "lunas",
          mayar_transaction_id: transactionId || "",
        },
      }),
    });

    const gasData = await gasRes.json();
    console.log("WEBHOOK: update GAS result", gasData);

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error("WEBHOOK_ERROR:", err.message);
    return res.status(200).json({ error: err.message });
  }
}
