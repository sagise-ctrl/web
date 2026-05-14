import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY!;
const GAS_URL = process.env.GAS_URL!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const {
    order_id,
    transaction_status,
    fraud_status,
    gross_amount,
    signature_key,
    status_code,
    transaction_id,
  } = req.body ?? {};

  // ─── 1. Verifikasi signature dari Midtrans ─────────────────
  const expectedSignature = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`)
    .digest("hex");

  if (signature_key !== expectedSignature) {
    return res
      .status(403)
      .json({ success: false, message: "Signature tidak valid" });
  }

  // ─── 2. Cek apakah pembayaran benar-benar sukses ───────────
  const isSuccess =
    transaction_status === "settlement" ||
    (transaction_status === "capture" && fraud_status === "accept");

  if (!isSuccess) {
    // Bukan sukses (pending, deny, expire, cancel) — abaikan saja
    return res
      .status(200)
      .json({ success: true, message: "Diabaikan: bukan transaksi sukses" });
  }

  // ─── 3. Parse order_id asli dan tipe pembayaran ────────────
  // order_id dari Midtrans: "ORD-xxx-DP" atau "ORD-xxx-FINAL"
  let realOrderId: string;
  let tipe: "dp" | "final";

  if (order_id.endsWith("-DP")) {
    realOrderId = order_id.slice(0, -3); // hapus "-DP"
    tipe = "dp";
  } else if (order_id.endsWith("-FINAL")) {
    realOrderId = order_id.slice(0, -6); // hapus "-FINAL"
    tipe = "final";
  } else {
    return res
      .status(400)
      .json({ success: false, message: "Format order_id tidak dikenal" });
  }

  // ─── 4. Update status order di GAS ────────────────────────
  try {
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      redirect: "follow",
      body: JSON.stringify({
        action: "updatePayment",
        order_id: realOrderId,
        tipe,
        transaction_id,
      }),
    });

    const gasData = await gasRes.json();

    if (!gasData.success) {
      return res.status(500).json({
        success: false,
        message: "Gagal update status: " + gasData.message,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghubungi GAS: " + err.message,
    });
  }
}
