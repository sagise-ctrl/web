import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const MAYAR_WEBHOOK_TOKEN = process.env.MAYAR_WEBHOOK_TOKEN;
  const GAS_URL = process.env.GAS_URL;

  if (!MAYAR_WEBHOOK_TOKEN || !GAS_URL)
    return res.status(500).json({ error: "Server tidak terkonfigurasi" });

  try {
    // Verifikasi token dari header Mayar
    const incomingToken =
      req.headers["authorization"]?.toString().replace("Bearer ", "") ||
      req.headers["x-mayar-token"]?.toString() ||
      "";

    if (incomingToken !== MAYAR_WEBHOOK_TOKEN) {
      console.warn("WEBHOOK: token tidak valid", incomingToken);
      return res.status(401).json({ error: "Unauthorized" });
    }

    const event = req.body;

    // Hanya proses event payment.received
    if (
      event?.event?.received !== "payment.received" &&
      event?.event !== "payment.received"
    ) {
      return res.status(200).json({ message: "Event diabaikan" });
    }

    const transactionId = event?.data?.id;
    const customerEmail: string = event?.data?.customerEmail || "";

    // Ambil order_id dari email dummy: order_XXXX@tugasly.my.id
    const match = customerEmail.match(/^order_(.+)@tugasly\.my\.id$/);
    if (!match) {
      console.warn(
        "WEBHOOK: tidak bisa parse order_id dari email",
        customerEmail,
      );
      return res.status(200).json({ message: "order_id tidak ditemukan" });
    }

    const order_id = match[1];

    // Update payment status di GAS
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
    // Tetap return 200 agar Mayar tidak retry terus
    return res.status(200).json({ error: err.message });
  }
}
