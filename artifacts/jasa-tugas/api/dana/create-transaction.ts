import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  DANA_QRIS_PATH,
  addMinutes,
  danaBaseUrl,
  jakartaTimestamp,
  makeExternalId,
  makePartnerReferenceNo,
  moneyValue,
  signDanaRequest,
} from "./_utils";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum diset`);
  return value;
}

function getClientIp(req: VercelRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "127.0.0.1";
}

function normalizeDanaOrigin(origin: unknown) {
  if (typeof origin !== "string") return "";
  const trimmed = origin.trim();
  if (!trimmed) return "";
  try {
    // DANA docs describe ORIGIN as a domain (e.g. www.hostname.com).
    // Browser Origin header includes scheme; strip it to host.
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).host;
    }
  } catch {
    // fall through
  }
  return trimmed;
}

function danaErrorMessage(data: any) {
  const message = data?.responseMessage || "Gagal membuat QRIS DANA";
  return data?.responseCode ? `${message} (${data.responseCode})` : message;
}

function envDebug() {
  return {
    GAS_URL: Boolean(process.env.GAS_URL),
    DANA_IS_PRODUCTION: process.env.DANA_IS_PRODUCTION || "false",
    DANA_MERCHANT_ID: Boolean(process.env.DANA_MERCHANT_ID),
    DANA_STORE_ID: Boolean(process.env.DANA_STORE_ID),
    DANA_TERMINAL_ID: Boolean(process.env.DANA_TERMINAL_ID),
    DANA_PARTNER_ID: Boolean(process.env.DANA_PARTNER_ID),
    DANA_PRIVATE_KEY: Boolean(process.env.DANA_PRIVATE_KEY),
    DANA_ORIGIN: process.env.DANA_ORIGIN || null,
    DANA_CHANNEL_ID: process.env.DANA_CHANNEL_ID || "95221",
    DANA_QRIS_EXPIRY_MINUTES: process.env.DANA_QRIS_EXPIRY_MINUTES || "15",
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { order_id, tipe } = req.body ?? {};
  const startedAt = Date.now();
  const debug: Record<string, any> = {
    request: {
      order_id,
      tipe,
      origin: req.headers.origin || null,
      host: req.headers.host || null,
    },
    env: envDebug(),
    stage: "received",
  };

  if (!order_id || !tipe) {
    return res
      .status(400)
      .json({ success: false, message: "order_id dan tipe diperlukan", debug });
  }
  if (!["dp", "final"].includes(tipe)) {
    return res
      .status(400)
      .json({ success: false, message: "tipe harus dp atau final", debug });
  }

  let order: any;
  try {
    debug.stage = "fetching_gas_order";
    const gasUrl = requireEnv("GAS_URL");
    const gasStartedAt = Date.now();
    const gasRes = await fetch(
      `${gasUrl}?action=getOrder&order_id=${encodeURIComponent(order_id)}`,
      { redirect: "follow" },
    );
    debug.gas = {
      status: gasRes.status,
      ok: gasRes.ok,
      duration_ms: Date.now() - gasStartedAt,
    };
    const gasData: any = await gasRes.json();
    debug.gas.success = Boolean(gasData.success);
    if (!gasData.success) {
      return res
        .status(404)
        .json({ success: false, message: "Order tidak ditemukan", debug });
    }
    order = gasData.data;
    debug.order = {
      status: order?.status,
      dp: order?.dp,
      sisa_bayar: order?.sisa_bayar,
      harga: order?.harga,
    };
  } catch (err: any) {
    debug.error = { name: err.name, message: err.message };
    debug.duration_ms = Date.now() - startedAt;
    return res.status(500).json({
      success: false,
      message: "Gagal ambil data order: " + err.message,
      debug,
    });
  }

  debug.stage = "validating_order_status";
  if (tipe === "dp" && order.status !== "menunggu pembayaran dp") {
    return res.status(400).json({
      success: false,
      message: "Order tidak dalam status menunggu pembayaran dp",
      debug,
    });
  }
  if (tipe === "final" && order.status !== "menunggu pelunasan") {
    return res.status(400).json({
      success: false,
      message: "Order tidak dalam status menunggu pelunasan",
      debug,
    });
  }

  debug.stage = "validating_amount";
  const amount = tipe === "dp" ? Number(order.dp) : Number(order.sisa_bayar);
  debug.amount = amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Nominal pembayaran tidak valid",
        debug,
      });
  }

  let partnerReferenceNo: string;
  try {
    debug.stage = "making_partner_reference_no";
    partnerReferenceNo = makePartnerReferenceNo(order_id, tipe);
    debug.partnerReferenceNo = partnerReferenceNo;
    debug.partnerReferenceNoLength = partnerReferenceNo.length;
  } catch (err: any) {
    debug.error = { name: err.name, message: err.message };
    debug.duration_ms = Date.now() - startedAt;
    return res
      .status(400)
      .json({ success: false, message: err.message, debug });
  }

  debug.stage = "building_dana_payload";
  const now = new Date();
  const timestamp = jakartaTimestamp(now);
  const expiry = jakartaTimestamp(
    addMinutes(now, Number(process.env.DANA_QRIS_EXPIRY_MINUTES || 15)),
  );
  debug.timestamp = timestamp;
  debug.expiry = expiry;

  try {
    const origin = normalizeDanaOrigin(
      req.headers.origin || process.env.DANA_ORIGIN || "",
    );
    if (!origin) {
      throw new Error(
        "DANA origin tidak tersedia. Set DANA_ORIGIN atau kirim header Origin dari browser.",
      );
    }

    const terminalId = process.env.DANA_TERMINAL_ID?.trim();
    const body: Record<string, any> = {
      merchantId: requireEnv("DANA_MERCHANT_ID"),
      storeId: requireEnv("DANA_STORE_ID"),
      partnerReferenceNo,
      amount: {
        value: moneyValue(amount),
        currency: "IDR",
      },
      validityPeriod: expiry,
      additionalInfo: {
        terminalSource: "MER",
        envInfo: {
          sessionId: `${partnerReferenceNo}-${Date.now()}`,
          websiteLanguage: "id_ID",
          clientIp: getClientIp(req),
          osType: "WEB",
          appVersion: "1.0",
          sdkVersion: "1.0",
          sourcePlatform: "IPG",
          terminalType: "SYSTEM",
          orderTerminalType: "WEB",
          merchantAppVersion: "1.0",
        },
      },
    };

    if (terminalId) {
      body.terminalId = terminalId;
    }
    if (process.env.DANA_SUB_MERCHANT_ID) {
      body.subMerchantId = process.env.DANA_SUB_MERCHANT_ID;
    }

    debug.stage = "signing_dana_request";
    const signature = signDanaRequest("POST", DANA_QRIS_PATH, body, timestamp);
    debug.stage = "calling_dana_qris";
    debug.danaRequest = {
      url: `${danaBaseUrl()}${DANA_QRIS_PATH}`,
      path: DANA_QRIS_PATH,
      merchantId: body.merchantId,
      storeId: body.storeId,
      terminalId: terminalId || null,
      partnerReferenceNo,
      amount: body.amount,
      validityPeriod: body.validityPeriod,
      origin,
      channelId: process.env.DANA_CHANNEL_ID || "95221",
    };
    debug.danaRequestBody = body;
    const danaStartedAt = Date.now();
    const danaRes = await fetch(`${danaBaseUrl()}${DANA_QRIS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signature,
        ORIGIN: origin,
        "X-PARTNER-ID": requireEnv("DANA_PARTNER_ID"),
        "X-EXTERNAL-ID": makeExternalId("QR"),
        "CHANNEL-ID": process.env.DANA_CHANNEL_ID || "95221",
      },
      body: JSON.stringify(body),
    });

    const responseText = await danaRes.text();
    debug.danaResponse = {
      status: danaRes.status,
      ok: danaRes.ok,
      duration_ms: Date.now() - danaStartedAt,
    };
    let danaData: any;
    try {
      danaData = JSON.parse(responseText);
    } catch {
      danaData = {
        responseMessage: responseText.slice(0, 500),
        rawResponse: responseText.slice(0, 500),
      };
    }
    debug.danaResponse.body = danaData;
    console.log(
      "DANA QRIS RESPONSE:",
      danaRes.status,
      JSON.stringify(danaData),
    );

    if (!danaRes.ok || danaData.responseCode !== "2004700") {
      return res.status(danaRes.ok ? 502 : danaRes.status).json({
        success: false,
        message: danaErrorMessage(danaData),
        detail: danaData,
        debug,
      });
    }

    const qrUrl = danaData.qrImage
      ? `data:image/png;base64,${danaData.qrImage}`
      : danaData.qrUrl || null;

    return res.status(200).json({
      success: true,
      qr_url: qrUrl,
      qr_content: danaData.qrContent || null,
      order_id: partnerReferenceNo,
      reference_no: danaData.referenceNo || null,
      amount,
      expiry,
      debug: {
        ...debug,
        stage: "success",
        duration_ms: Date.now() - startedAt,
      },
    });
  } catch (err: any) {
    debug.error = { name: err.name, message: err.message, stack: err.stack };
    debug.duration_ms = Date.now() - startedAt;
    console.error("DANA_CREATE_TRANSACTION_ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Gagal menghubungi DANA: " + err.message,
      debug,
    });
  }
}
