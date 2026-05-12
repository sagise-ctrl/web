import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "Password diperlukan" });

  const isValid = await bcrypt.compare(
    password,
    process.env.ADMIN_PASSWORD_HASH!,
  );

  if (!isValid) return res.status(401).json({ error: "Password salah" });

  const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET!, {
    expiresIn: "8h",
  });

  res.setHeader(
    "Set-Cookie",
    `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
  );
  return res.status(200).json({ ok: true });
}
