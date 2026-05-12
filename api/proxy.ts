import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL)
    return res.status(500).json({ error: "Server tidak terkonfigurasi" });

  try {
    const url = new URL(GAS_URL);
    if (req.method === "GET" && req.url?.includes("?")) {
      const incoming = new URL(req.url, "http://localhost");
      incoming.searchParams.forEach((val, key) => {
        url.searchParams.set(key, val);
      });
    }
    const finalUrl = url.toString();

    const gasRes = await fetch(finalUrl, {
      method: req.method,
      headers: { "Content-Type": "text/plain" },
      ...(req.method === "POST" && { body: JSON.stringify(req.body) }),
    });

    const data = await gasRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gagal menghubungi server" });
  }
}
