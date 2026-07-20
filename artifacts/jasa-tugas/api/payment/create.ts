import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const MAYAR_API_KEY = process.env.MAYAR_API_KEY;
  const GAS_URL = process.env.GAS_URL;

  if (!MAYAR_API_KEY || !GAS_URL)
    return res.status(500).json({ error: "Server tidak terkonfigurasi" });

  try {
    const { order_id, tipe } = req.body;

    console.log("STEP0: raw body =", JSON.stringify(req.body));

    if (!order_id || !tipe)
      return res.status(400).json({ error: "order_id dan tipe wajib diisi" });

    // Ambil data order dari GSheet via GAS — tidak percaya nominal dari frontend
    console.log("STEP1: fetching GAS for order_id =", order_id);
    const gasRes = await fetch(
      `${GAS_URL}?action=getOrder&order_id=${order_id}`,
    );
    const gasData = await gasRes.json();
    console.log("STEP2: GAS response =", JSON.stringify(gasData));

    if (!gasData.success || !gasData.data) {
      return res.status(404).json({ error: "Order tidak ditemukan" });
    }

    const order = gasData.data;

    // Tentukan nominal berdasarkan tipe dan kategori order
    let amount = 0;
    if (tipe === "dp") {
      amount =
        order.kategori_order === "B" ? Number(order.harga) : Number(order.dp);
    } else if (tipe === "final") {
      if (order.kategori_order === "B") {
        return res
          .status(400)
          .json({ error: "Order kategori B tidak memiliki pelunasan" });
      }
      amount = Number(order.sisa_bayar);
    }
    console.log(
      "STEP3: amount =",
      amount,
      "| tipe =",
      tipe,
      "| kategori =",
      order.kategori_order,
      "| harga =",
      order.harga,
      "| dp =",
      order.dp,
      "| sisa_bayar =",
      order.sisa_bayar,
    );

    if (!amount || amount < 2000) {
      return res
        .status(400)
        .json({
          error:
            "Nominal pembayaran tidak valid atau di bawah minimum Rp 2.000",
        });
    }

    const nama = order.nama;
    const wa = String(order.wa).replace(/^'/, "");
    const email = `${wa.replace(/^0/, "")}@tugasly.my.id`;
    const mobile = wa;
    console.log(
      "STEP4: nama =",
      nama,
      "| wa =",
      wa,
      "| email =",
      email,
      "| mobile =",
      mobile,
    );

    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      name: nama,
      email,
      amount,
      mobile,
      redirectUrl: `https://tugasly.my.id/track?id=${order_id}`,
      description: `Order ${order_id} [${tipe}]`,
      expiredAt,
    };
    console.log("STEP5: payload to Mayar =", JSON.stringify(payload));

    const mayarRes = await fetch("https://api.mayar.id/hl/v1/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAYAR_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const mayarData = await mayarRes.json();
    console.log(
      "STEP6: Mayar status =",
      mayarRes.status,
      "| body =",
      JSON.stringify(mayarData),
    );

    if (!mayarRes.ok || mayarData.statusCode !== 200) {
      console.error("MAYAR_ERROR:", JSON.stringify(mayarData));
      return res.status(500).json({
        success: false,
        message:
          mayarData.messages ||
          mayarData.message ||
          "Gagal membuat payment link",
        detail: mayarData,
      });
    }

    return res.status(200).json({
      success: true,
      payment_link: mayarData.data.link,
      transaction_id: mayarData.data.transactionId,
    });
  } catch (err: any) {
    console.error("PAYMENT_CREATE_CATCH:", err.message, err.stack);
    return res.status(500).json({
      error: "Gagal menghubungi Mayar: " + err.message,
    });
  }
}
