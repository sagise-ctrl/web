import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const MAYAR_API_KEY = process.env.MAYAR_API_KEY;
  if (!MAYAR_API_KEY)
    return res.status(500).json({ error: "Server tidak terkonfigurasi" });

  try {
    const { order_id, nama, wa, harga, jenis } = req.body;

    if (!order_id || !harga)
      return res.status(400).json({ error: "Data tidak lengkap" });

    const email = `order@tugasly.my.id`;
    const mobile = `08000000000`;

    // Expired 24 jam dari sekarang
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      name: nama,
      email,
      amount: Number(harga),
      mobile,
      redirectUrl: `https://tugasly.my.id/track?id=${order_id}`,
      description: `Order ${order_id} [${tipe}]`,

      expiredAt,
    };

    const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAYAR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const mayarData = await mayarRes.json();

    if (!mayarRes.ok || mayarData.statusCode !== 200) {
      console.error("MAYAR_ERROR:", mayarData);
      return res.status(500).json({
        error: "Gagal membuat payment link",
        detail: mayarData,
      });
    }

    return res.status(200).json({
      success: true,
      payment_link: mayarData.data.link,
      transaction_id: mayarData.data.transactionId,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: "Gagal menghubungi Mayar: " + err.message,
    });
  }
}
