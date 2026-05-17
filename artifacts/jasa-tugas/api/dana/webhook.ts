import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DANA_NOTIFY_PATH,
  parsePartnerReferenceNo,
  verifyDanaSignature,
} from "./_utils";

const GAS_URL = process.env.GAS_URL!;

function headerValue(req: VercelRequest, name: string) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const timestamp = headerValue(req, "x-timestamp");
  const signature = headerValue(req, "x-signature");

  if (!timestamp || !signature) {
    return res
      .status(400)
      .json({ responseCode: "4005600", responseMessage: "Missing signature" });
  }

  try {
    const isValid = verifyDanaSignature(
      "POST",
      DANA_NOTIFY_PATH,
      req.body,
      timestamp,
      signature,
    );

    if (!isValid) {
      return res.status(403).json({
        responseCode: "4015600",
        responseMessage: "Invalid signature",
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      responseCode: "5005601",
      responseMessage: err.message,
    });
  }

  console.log("DANA WEBHOOK BODY:", JSON.stringify(req.body));

  const { originalPartnerReferenceNo, latestTransactionStatus, originalReferenceNo } =
    req.body ?? {};

  if (latestTransactionStatus !== "00") {
    return res.status(200).json({
      responseCode: "2005600",
      responseMessage: "Successful",
    });
  }

  const parsed = parsePartnerReferenceNo(String(originalPartnerReferenceNo || ""));
  if (!parsed) {
    return res.status(400).json({
      responseCode: "4005600",
      responseMessage: "Format originalPartnerReferenceNo tidak dikenal",
    });
  }

  try {
    const gasRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      redirect: "follow",
      body: JSON.stringify({
        action: "updatePayment",
        order_id: parsed.orderId,
        tipe: parsed.tipe,
        transaction_id: originalReferenceNo || originalPartnerReferenceNo,
      }),
    });

    const gasData: any = await gasRes.json();
    console.log("GAS RESPONSE:", JSON.stringify(gasData));

    if (!gasData.success) {
      return res.status(500).json({
        responseCode: "5005601",
        responseMessage: "Gagal update status: " + gasData.message,
      });
    }

    return res.status(200).json({
      responseCode: "2005600",
      responseMessage: "Successful",
    });
  } catch (err: any) {
    return res.status(500).json({
      responseCode: "5005601",
      responseMessage: "Gagal menghubungi GAS: " + err.message,
    });
  }
}
