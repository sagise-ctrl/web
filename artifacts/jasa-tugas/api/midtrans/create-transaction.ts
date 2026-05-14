import type { VercelRequest, VercelResponse } from "@vercel/node";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
const BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com/v2/charge"
  : "https://api.sandbox.midtrans.com/v2/charge";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { order_id, tipe } = req.body ?? {};

  if (!order_id || !tipe) {
    return res
      .status(400)
      .json({ success: false, message: "order_id dan tipe diperlukan" });
  }
  if (!["dp", "final"].includes(tipe)) {
    return res
      .status(400)
      .json({ success: false, message: "tipe harus dp atau final" });
  }

  const GAS_URL = process.env.GAS_URL!;
  let order: any;
  try {
    const gasRes = await fetch(
      `${GAS_URL}?action=getOrder&order_id=${encodeURIComponent(order_id)}`,
      { redirect: "follow" },
    );
    const gasData = await gasRes.json();
    if (!gasData.success) {
      return res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan" });
    }
    order = gasData.data;
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Gagal ambil data order" });
  }

  if (tipe === "dp" && order.status !== "menunggu pembayaran dp") {
    return res
      .status(400)
      .json({
        success: false,
        message: "Order tidak dalam status menunggu pembayaran dp",
      });
  }
  if (tipe === "final" && order.status !== "menunggu pelunasan") {
    return res
      .status(400)
      .json({
        success: false,
        message: "Order tidak dalam status menunggu pelunasan",
      });
  }

  const amount = tipe === "dp" ? Number(order.dp) : Number(order.sisa_bayar);
  const midtransOrderId = `${order_id}-${tipe === "dp" ? "DP" : "FINAL"}`;

  const authHeader =
    "Basic " + Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64");

  try {
    const chargeRes = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: amount,
        },
        customer_details: {
          first_name: order.nama,
          phone: String(order.wa),
        },
        qris: {
          acquirer: "gopay",
        },
      }),
    });

    const chargeData = await chargeRes.json();
    console.log("MIDTRANS CHARGE RESPONSE:", JSON.stringify(chargeData));

    if (chargeData.status_code !== "201") {
      return res.status(500).json({
        success: false,
        message: "Gagal membuat QRIS",
        detail: chargeData,
      });
    }

    const qrAction = chargeData.actions?.find(
      (a: any) => a.name === "generate-qr-code",
    );
    const qrUrl = qrAction?.url;

    return res.status(200).json({
      success: true,
      qr_url: qrUrl,
      order_id: midtransOrderId,
      amount,
      expiry: chargeData.expiry_time,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghubungi Midtrans: " + err.message,
    });
  }
}
