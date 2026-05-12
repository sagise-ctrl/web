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

    const bodyStr =
      req.method === "POST" && req.body
        ? typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body)
        : undefined;

    const gasRes = await fetch(url.toString(), {
      method: req.method,
      headers: { "Content-Type": "text/plain" },
      redirect: "follow", // ← fix utama
      ...(bodyStr && { body: bodyStr }),
    });

    const data = await gasRes.json();
    return res.status(200).json(data);
  } catch (err: any) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Gagal menghubungi server: " + err.message,
      });
  }
}
