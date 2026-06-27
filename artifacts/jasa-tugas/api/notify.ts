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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, body, data } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "title dan body wajib diisi" });
  }

  const DEVICE_TOKEN = process.env.FCM_DEVICE_TOKEN;

  if (!DEVICE_TOKEN) {
    return res
      .status(500)
      .json({ error: "FCM_DEVICE_TOKEN belum dikonfigurasi" });
  }

  try {
    const accessToken = await getFCMAccessToken();

    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || "{}",
    );

    const projectId = serviceAccount.project_id;

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // ===== DEBUG LOG =====
    console.log("========== FCM DEBUG ==========");
    console.log("PROJECT_ID:", projectId);
    console.log("DEVICE_TOKEN_LENGTH:", DEVICE_TOKEN.length);
    console.log("DEVICE_TOKEN_START:", DEVICE_TOKEN.substring(0, 30));
    console.log(
      "DEVICE_TOKEN_END:",
      DEVICE_TOKEN.substring(DEVICE_TOKEN.length - 30),
    );
    console.log("FCM_URL:", fcmUrl);
    console.log("===============================");
    // =======================

    const payload = {
      message: {
        token: DEVICE_TOKEN,
        notification: {
          title,
          body,
        },
        data: data || {},
      },
    };

    console.log("FCM_PAYLOAD:", JSON.stringify(payload, null, 2));

    const fcmRes = await fetch(fcmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const fcmData = await fcmRes.json();

    console.log("FCM_STATUS:", fcmRes.status);
    console.log("FCM_RESPONSE:", JSON.stringify(fcmData, null, 2));

    if (!fcmRes.ok) {
      console.error("FCM_ERROR:", fcmData);

      return res.status(500).json({
        success: false,
        error: fcmData,
      });
    }

    return res.status(200).json({
      success: true,
      response: fcmData,
    });
  } catch (err: any) {
    console.error("SERVER_ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}
