import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleAuth } from "google-auth-library";

async function getFCMAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
  );
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token || "";
}

async function getAllTokens(gasUrl: string): Promise<string[]> {
  try {
    const res = await fetch(`${gasUrl}?action=getAllTokens`);
    const data = await res.json();
    return data?.tokens || [];
  } catch {
    return [];
  }
}

async function deleteToken(gasUrl: string, token: string): Promise<void> {
  try {
    await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      redirect: "follow",
      body: JSON.stringify({ action: "deleteToken", token }),
    });
  } catch {}
}

async function sendToToken(
  accessToken: string,
  projectId: string,
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<{ success: boolean; expired: boolean }> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const res = await fetch(fcmUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data: data || {},
      },
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    const errorCode = result?.error?.details?.[0]?.errorCode || "";
    const expired =
      errorCode === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT";
    return { success: false, expired };
  }

  return { success: true, expired: false };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { title, body, data } = req.body;
  if (!title || !body)
    return res.status(400).json({ error: "title dan body wajib diisi" });

  const GAS_URL = process.env.GAS_URL;
  if (!GAS_URL)
    return res.status(500).json({ error: "GAS_URL tidak dikonfigurasi" });

  const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!FIREBASE_SERVICE_ACCOUNT)
    return res
      .status(500)
      .json({ error: "FIREBASE_SERVICE_ACCOUNT tidak dikonfigurasi" });

  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const projectId = serviceAccount.project_id;

    const [accessToken, tokens] = await Promise.all([
      getFCMAccessToken(),
      getAllTokens(GAS_URL),
    ]);

    if (tokens.length === 0) {
      console.warn("NOTIFY: tidak ada token terdaftar");
      return res
        .status(200)
        .json({ success: true, message: "tidak ada token" });
    }

    const results = await Promise.all(
      tokens.map((token) =>
        sendToToken(accessToken, projectId, token, title, body, data || {}),
      ),
    );

    // Auto-cleanup token expired
    for (let i = 0; i < results.length; i++) {
      if (results[i].expired) {
        console.log("NOTIFY: hapus token expired", tokens[i].slice(0, 20));
        await deleteToken(GAS_URL, tokens[i]);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`NOTIFY: ${successCount}/${tokens.length} terkirim`);

    return res
      .status(200)
      .json({ success: true, sent: successCount, total: tokens.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
