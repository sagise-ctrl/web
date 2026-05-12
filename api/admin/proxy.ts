import jwt from "jsonwebtoken";
import { parse } from "cookie";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cookies = parse(req.headers.cookie ?? "");
  const token = cookies.admin_token;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return res
      .status(401)
      .json({ error: "Session expired, silakan login ulang" });
  }

  const GAS_URL = process.env.GAS_URL!;

  try {
    const url =
      req.method === "GET" && req.url?.includes("?")
        ? `${GAS_URL}${req.url.substring(req.url.indexOf("?"))}`
        : GAS_URL;

    const gasRes = await fetch(url, {
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
